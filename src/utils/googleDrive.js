// Google Drive API utilities
import { getSharedFolderId } from './sharedFolderConfig'

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3'

// Folder name for recordings (when not using shared folder)
const RECORDINGS_FOLDER_NAME = 'Practice Recordings'

/**
 * Get or create the Practice Recordings folder in Google Drive
 */
export const getOrCreateRecordingsFolder = async (accessToken) => {
  try {
    // Check if a shared folder is configured
    const sharedFolderId = getSharedFolderId()
    console.log('Checking for shared folder:', sharedFolderId)
    
    if (sharedFolderId) {
      // Verify the shared folder exists and user has access
      try {
        console.log('Verifying access to shared folder...')
        const verifyResponse = await fetch(
          `${DRIVE_API_BASE}/files/${sharedFolderId}?fields=id,name,capabilities`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        )
        
        console.log('Verify response status:', verifyResponse.status)
        
        if (verifyResponse.ok) {
          const folderData = await verifyResponse.json()
          console.log('Folder data:', folderData)
          console.log('Capabilities:', folderData.capabilities)
          
          // For shared folders, we just need to verify we can access it
          // The actual upload will tell us if we can't write
          console.log('✓ Folder accessible, proceeding with upload')
          return sharedFolderId
        } else {
          const errorData = await verifyResponse.json().catch(() => ({}))
          console.error('Cannot access folder. Status:', verifyResponse.status, 'Error:', errorData)
          throw new Error(`Cannot access shared folder (${verifyResponse.status}). Make sure it's shared with your account.`)
        }
      } catch (error) {
        console.error('Shared folder verification failed:', error)
        console.error('Folder ID:', sharedFolderId)
        throw new Error(`Cannot access shared folder. The folder might not be shared with your account (${error.message})`)
      }
    }

    // If no shared folder, use personal folder
    // First, check if folder already exists
    const searchResponse = await fetch(
      `${DRIVE_API_BASE}/files?q=name='${RECORDINGS_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    const searchData = await searchResponse.json()

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }

    // If folder doesn't exist, create it
    const createResponse = await fetch(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: RECORDINGS_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    })

    const createData = await createResponse.json()
    return createData.id
  } catch (error) {
    console.error('Error getting/creating folder:', error)
    throw error
  }
}

/**
 * Upload a recording to Google Drive
 */
export const uploadRecordingToDrive = async (accessToken, recording, onProgress) => {
  try {
    // Get the recordings folder ID
    const folderId = await getOrCreateRecordingsFolder(accessToken)

    // Prepare metadata
    const metadata = {
      name: `${recording.name}.${getFileExtension(recording.mimeType)}`,
      parents: [folderId],
      description: `Recorded on ${new Date(recording.timestamp).toLocaleString()}. Quality: ${recording.quality?.preset || 'standard'}, Duration: ${formatDuration(recording.duration)}`
    }

    // Create multipart upload
    const boundary = '-------314159265358979323846'
    const delimiter = "\r\n--" + boundary + "\r\n"
    const close_delim = "\r\n--" + boundary + "--"

    const metadataPart = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata)

    const dataPart = delimiter +
      `Content-Type: ${recording.mimeType}\r\n\r\n`

    // Convert blob to array buffer for upload
    const blobData = await recording.blob.arrayBuffer()

    const multipartRequestBody = new Uint8Array(
      new TextEncoder().encode(metadataPart + dataPart).length +
      blobData.byteLength +
      new TextEncoder().encode(close_delim).length
    )

    let offset = 0
    const metadataBytes = new TextEncoder().encode(metadataPart + dataPart)
    multipartRequestBody.set(metadataBytes, offset)
    offset += metadataBytes.length
    multipartRequestBody.set(new Uint8Array(blobData), offset)
    offset += blobData.byteLength
    const closeBytes = new TextEncoder().encode(close_delim)
    multipartRequestBody.set(closeBytes, offset)

    const response = await fetch(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': multipartRequestBody.length
        },
        body: multipartRequestBody
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Drive upload error:', errorData)
      console.error('Error details:', JSON.stringify(errorData, null, 2))
      
      if (response.status === 403) {
        throw new Error('Permission denied. Make sure the folder is shared with "Editor" access.')
      } else if (response.status === 404) {
        throw new Error('Folder not found. The folder might have been deleted or you lost access.')
      } else {
        throw new Error(errorData.error?.message || `Upload failed (${response.status})`)
      }
    }

    const result = await response.json()
    console.log('Upload result:', result)
    
    return {
      fileId: result.id,
      fileName: result.name,
      webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
      webContentLink: result.webContentLink
    }
  } catch (error) {
    console.error('Error uploading to Drive:', error)
    throw error
  }
}

/**
 * Delete a file from Google Drive
 */
export const deleteFromDrive = async (accessToken, fileId) => {
  try {
    const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok && response.status !== 204) {
      throw new Error('Failed to delete from Drive')
    }

    return true
  } catch (error) {
    console.error('Error deleting from Drive:', error)
    throw error
  }
}

/**
 * Check if user has granted Drive permissions
 */
export const hasDrivePermissions = (tokenResponse) => {
  // Check if the scope includes drive.file
  const scope = tokenResponse?.scope || ''
  return scope.includes('drive.file') || scope.includes('drive')
}

/**
 * List files in the shared recordings folder
 */
export const listRecordingsFromDrive = async (accessToken) => {
  try {
    console.log('🔍 Starting to list Drive files...')
    console.log('Access token available:', !!accessToken)
    
    const folderId = await getOrCreateRecordingsFolder(accessToken)
    console.log('✓ Folder ID obtained:', folderId)

    const query = `'${folderId}'+in+parents+and+trashed=false`
    const fields = 'files(id,name,mimeType,size,createdTime,modifiedTime,description,webViewLink,webContentLink,thumbnailLink)'
    const url = `${DRIVE_API_BASE}/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc`
    
    console.log('📡 Fetching files from Drive...')
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Drive API error:', response.status, errorText)
      throw new Error(`Failed to list files from Drive (${response.status})`)
    }

    const data = await response.json()
    console.log('✓ Drive files loaded:', data.files?.length || 0, 'files')
    
    return data.files || []
  } catch (error) {
    console.error('❌ Error listing Drive files:', error)
    throw error
  }
}

/**
 * Download a file from Google Drive
 */
export const downloadFileFromDrive = async (accessToken, fileId) => {
  try {
    const response = await fetch(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to download file')
    }

    return await response.blob()
  } catch (error) {
    console.error('Error downloading file:', error)
    throw error
  }
}

/**
 * Get a streaming URL for a Drive file
 */
export const getDriveStreamUrl = (accessToken, fileId) => {
  return `${DRIVE_API_BASE}/files/${fileId}?alt=media&access_token=${accessToken}`
}

// Helper functions
const getFileExtension = (mimeType) => {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('mpeg')) return 'mp3'
  return 'audio'
}

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

/**
 * Get next take number for a song by checking Drive
 */
/**
 * Get unique song names from Google Drive recordings
 */
export const getSongNamesFromDrive = async (accessToken) => {
  try {
    const files = await listRecordingsFromDrive(accessToken)
    const songNames = new Set()
    
    files.forEach(file => {
      const songName = extractSongNameFromFileName(file.name)
      if (songName) {
        songNames.add(songName)
      }
    })
    
    // Return as array, sorted alphabetically
    return Array.from(songNames).sort((a, b) => a.localeCompare(b))
  } catch (error) {
    console.error('Error getting song names from Drive:', error)
    return []
  }
}

/**
 * Extract song name from file name
 * Format: "Song Name - Take 1 - 12/20/2024.webm"
 */
const extractSongNameFromFileName = (fileName) => {
  if (!fileName) return null
  
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.(webm|mp3|mp4|m4a|wav|ogg|aac)$/i, '')
  
  // Try to extract before " - Take" or " - Recording" or " - Solo"
  const match = nameWithoutExt.match(/^(.+?)\s*-\s*(Take|Recording|Solo|#)/i)
  if (match) {
    return match[1].trim()
  }
  
  return null
}

export const getNextTakeNumberFromDrive = async (accessToken, songName) => {
  try {
    if (!accessToken) {
      console.log('No access token, cannot check Drive for takes')
      return 1
    }

    const files = await listRecordingsFromDrive(accessToken)
    
    // Filter files that match this song name
    const songFiles = files.filter(file => {
      const fileName = file.name.toLowerCase()
      return fileName.includes(songName.toLowerCase())
    })

    if (songFiles.length === 0) {
      return 1
    }

    // Extract take numbers from file names
    const takeNumbers = songFiles.map(file => {
      // Match patterns like "Take 3", "Take 03", "take3", etc.
      const match = file.name.match(/take\s*(\d+)/i)
      return match ? parseInt(match[1], 10) : 0
    }).filter(num => num > 0)

    if (takeNumbers.length === 0) {
      // No take numbers found, start with the count + 1
      return songFiles.length + 1
    }

    // Return the highest take number + 1
    return Math.max(...takeNumbers) + 1
  } catch (error) {
    console.error('Error getting take number from Drive:', error)
    return 1
  }
}

