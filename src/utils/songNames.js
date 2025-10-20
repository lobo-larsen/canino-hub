// Song names management

const STORAGE_KEY = 'songNames'

/**
 * Get all saved song names
 */
export const getSongNames = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading song names:', error)
    return []
  }
}

/**
 * Add a new song name
 */
export const addSongName = (songName) => {
  const songs = getSongNames()
  const trimmed = songName.trim()
  
  if (!trimmed) return songs
  
  // Don't add duplicates (case insensitive)
  const exists = songs.some(s => s.toLowerCase() === trimmed.toLowerCase())
  if (exists) {
    // Move to front (most recently used)
    const filtered = songs.filter(s => s.toLowerCase() !== trimmed.toLowerCase())
    const updated = [trimmed, ...filtered]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated
  }
  
  // Add to front
  const updated = [trimmed, ...songs]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Remove a song name
 */
export const removeSongName = (songName) => {
  const songs = getSongNames()
  const updated = songs.filter(s => s.toLowerCase() !== songName.toLowerCase())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Get suggestions based on input
 */
export const getSongSuggestions = (input) => {
  if (!input || !input.trim()) return getSongNames()
  
  const songs = getSongNames()
  const lower = input.toLowerCase()
  
  return songs.filter(song => 
    song.toLowerCase().includes(lower)
  )
}

/**
 * Extract song name from recording name
 * Format: "Song Name - Take 1 - 12/20/2024"
 */
export const extractSongName = (recordingName) => {
  if (!recordingName) return null
  
  // Try to extract before " - Take" or " - Recording"
  const match = recordingName.match(/^(.+?)\s*-\s*(Take|Recording|#)/i)
  if (match) {
    return match[1].trim()
  }
  
  return null
}

/**
 * Generate recording name with song, take number, and date
 */
export const generateRecordingName = (songName, takeNumber = null) => {
  const date = new Date().toLocaleDateString('en-US', { 
    month: '2-digit', 
    day: '2-digit',
    year: 'numeric'
  })
  
  if (takeNumber) {
    return `${songName} - Take ${takeNumber} - ${date}`
  }
  
  return `${songName} - ${date}`
}

/**
 * Get next take number for a song
 */
export const getNextTakeNumber = (recordings, songName) => {
  if (!recordings || recordings.length === 0) return 1
  
  const songRecordings = recordings.filter(r => {
    const extracted = extractSongName(r.name)
    return extracted && extracted.toLowerCase() === songName.toLowerCase()
  })
  
  if (songRecordings.length === 0) return 1
  
  // Find highest take number
  let maxTake = 0
  songRecordings.forEach(r => {
    const match = r.name.match(/Take\s+(\d+)/i)
    if (match) {
      const takeNum = parseInt(match[1])
      if (takeNum > maxTake) maxTake = takeNum
    }
  })
  
  return maxTake + 1
}

/**
 * Extract recording type from recording name
 * Format: "Song Name - Take 1 - Solo - Date" (Solo is explicit)
 * If no type is specified, it's Full Band (default)
 */
export const extractRecordingType = (recordingName) => {
  if (!recordingName) return 'full-band' // Default
  
  if (recordingName.toLowerCase().includes('solo')) {
    return 'solo'
  }
  
  // If no explicit type, it's full band (default)
  return 'full-band'
}

/**
 * Get recording type badge info
 * Only returns badge for "Solo" recordings (Full Band is default, no badge needed)
 */
export const getRecordingTypeBadge = (recordingName) => {
  const type = extractRecordingType(recordingName)
  
  // Only show badge for solo recordings
  if (type === 'solo') {
    return { icon: '👤', label: 'Solo', className: 'type-solo' }
  }
  
  // Full band is default, no badge needed
  return null
}

