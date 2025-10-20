// Global metadata storage using Google Drive file description
// This allows all band members to see the same favorites and comments
// Using description field because it works reliably with shared folders

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'

// Parse metadata from description field
const parseMetadataFromDescription = (description) => {
  if (!description) return { favorites: [], comments: [], originalDescription: '' }
  
  try {
    // Check if description contains our metadata marker
    const metadataMarker = '___METADATA___'
    if (description.includes(metadataMarker)) {
      const parts = description.split(metadataMarker)
      const originalDescription = parts[0].trim()
      const metadataJson = parts[1].trim()
      const metadata = JSON.parse(metadataJson)
      return {
        favorites: metadata.favorites || [],
        comments: metadata.comments || [],
        originalDescription: originalDescription
      }
    }
  } catch (error) {
    console.error('Error parsing metadata from description:', error)
  }
  
  return { favorites: [], comments: [], originalDescription: description }
}

// Encode metadata into description field
const encodeMetadataToDescription = (originalDescription, favorites, comments) => {
  const metadata = { favorites, comments }
  const metadataJson = JSON.stringify(metadata)
  return `${originalDescription || ''}\n___METADATA___\n${metadataJson}`
}

// Get metadata for a specific file from Drive description
export const getDriveFileMetadata = async (accessToken, fileId) => {
  try {
    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?fields=description`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      console.error('Failed to get file metadata:', response.status)
      return { favorites: [], comments: [] }
    }

    const data = await response.json()
    const parsed = parseMetadataFromDescription(data.description)
    
    return {
      favorites: parsed.favorites,
      comments: parsed.comments
    }
  } catch (error) {
    console.error('Error reading Drive metadata:', error)
    return { favorites: [], comments: [] }
  }
}

// Update metadata for a specific file in Drive description
export const updateDriveFileMetadata = async (accessToken, fileId, updates) => {
  try {
    // First, get the current description to preserve original content
    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?fields=description`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to get current metadata: ${response.status}`)
    }

    const data = await response.json()
    const parsed = parseMetadataFromDescription(data.description)
    
    // Merge updates with existing metadata
    const newFavorites = updates.favorites !== undefined ? updates.favorites : parsed.favorites
    const newComments = updates.comments !== undefined ? updates.comments : parsed.comments
    
    // Encode back to description
    const newDescription = encodeMetadataToDescription(parsed.originalDescription, newFavorites, newComments)

    // Update the file
    const updateResponse = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ description: newDescription })
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Update failed:', updateResponse.status, errorText)
      throw new Error(`Failed to update metadata: ${updateResponse.status}`)
    }

    return await getDriveFileMetadata(accessToken, fileId)
  } catch (error) {
    console.error('Error updating Drive metadata:', error)
    throw error
  }
}

// Get favorites for a file
export const getDriveFavorites = async (accessToken, fileId) => {
  const metadata = await getDriveFileMetadata(accessToken, fileId)
  return metadata.favorites || []
}

// Toggle favorite for a file
export const toggleDriveFavorite = async (accessToken, fileId, user) => {
  const favorites = await getDriveFavorites(accessToken, fileId)
  const userEmail = user.email
  
  const existingIndex = favorites.findIndex(fav => fav.userEmail === userEmail)
  
  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1)
  } else {
    favorites.push({
      userEmail: userEmail,
      userName: user.name,
      timestamp: Date.now()
    })
  }
  
  await updateDriveFileMetadata(accessToken, fileId, { favorites })
  return favorites
}

// Get comments for a file
export const getDriveComments = async (accessToken, fileId) => {
  const metadata = await getDriveFileMetadata(accessToken, fileId)
  return metadata.comments || []
}

// Add comment to a file
export const addDriveComment = async (accessToken, fileId, user, commentText) => {
  const comments = await getDriveComments(accessToken, fileId)
  
  const newComment = {
    id: Date.now().toString(),
    text: commentText,
    userEmail: user.email,
    userName: user.name,
    timestamp: Date.now()
  }
  
  comments.push(newComment)
  await updateDriveFileMetadata(accessToken, fileId, { comments })
  return comments
}

// Delete comment from a file
export const deleteDriveComment = async (accessToken, fileId, commentId, userEmail) => {
  const comments = await getDriveComments(accessToken, fileId)
  const commentIndex = comments.findIndex(c => c.id === commentId)
  
  if (commentIndex >= 0) {
    const comment = comments[commentIndex]
    if (comment.userEmail === userEmail) {
      comments.splice(commentIndex, 1)
      await updateDriveFileMetadata(accessToken, fileId, { comments })
    }
  }
  
  return comments
}

