import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAudio } from '../contexts/AudioContext'
import { listRecordingsFromDrive, getDriveStreamUrl, deleteFromDrive, uploadRecordingToDrive, getNextTakeNumberFromDrive } from '../utils/googleDrive'
import { getUserColor, getUserInitials } from '../utils/favorites'
import { formatCommentDate } from '../utils/comments'
import { extractSongName, getRecordingTypeBadge, extractRecordingType } from '../utils/songNames'
import { 
  getDriveFavorites, 
  toggleDriveFavorite, 
  getDriveComments, 
  addDriveComment, 
  deleteDriveComment 
} from '../utils/driveMetadata'
import DriveAuthButton from './DriveAuthButton'
import WaveformPlayer from './WaveformPlayer'
import './DriveBrowser.css'

// Global audio cache to persist loaded audio URLs across component remounts
const audioCache = new Map()
const audioStateCache = new Map() // Cache for audio loading states
const audioPlayStateCache = new Map() // Cache for play/pause states
const audioControlsCache = new Map() // Cache for audio controls (play/pause functions)
const audioPositionCache = new Map() // Cache for audio positions (current time)

// Global audio state management
let globalCurrentlyPlaying = null // Track which audio is currently playing globally

// Function to stop all other audio when one starts playing
const stopAllOtherAudio = (currentFileId) => {
  console.log('🛑 Stopping all other audio, current:', currentFileId, 'global:', globalCurrentlyPlaying)
  
  // Stop ALL audio controls, not just the currently playing one
  for (const [fileId, controls] of audioControlsCache.entries()) {
    if (fileId !== currentFileId && controls) {
      try {
        console.log('🛑 Stopping audio:', fileId)
        // Save current position before stopping
        if (controls.getCurrentTime) {
          const currentTime = controls.getCurrentTime()
          audioPositionCache.set(fileId, { position: currentTime })
        }
        // Force stop the audio
        if (controls.pause) {
          controls.pause()
        }
        // Update the play state cache
        audioPlayStateCache.set(fileId, { isPlaying: false })
      } catch (error) {
        console.warn('Error stopping audio:', fileId, error)
      }
    }
  }
  
  // Update global state
  globalCurrentlyPlaying = currentFileId
  console.log('✅ Global state updated to:', globalCurrentlyPlaying)
}

// Function to save audio position periodically
const saveAudioPosition = (fileId, controls) => {
  if (controls && controls.getCurrentTime) {
    try {
      const currentTime = controls.getCurrentTime()
      audioPositionCache.set(fileId, { position: currentTime })
    } catch (error) {
      console.warn('Error saving audio position:', error)
    }
  }
}

// Function to check if an audio is currently playing globally
const isAudioCurrentlyPlaying = (fileId) => {
  return globalCurrentlyPlaying === fileId
}

// Function to stop all audio globally
const stopAllAudioGlobally = () => {
  console.log('🛑 Stopping all audio globally')
  
  // Stop all cached audio controls
  for (const [fileId, controls] of audioControlsCache.entries()) {
    if (controls) {
      try {
        // Save current position before stopping
        if (controls.getCurrentTime) {
          const currentTime = controls.getCurrentTime()
          audioPositionCache.set(fileId, { position: currentTime })
        }
        if (controls.pause) {
          controls.pause()
        }
        // Update the play state cache
        audioPlayStateCache.set(fileId, { isPlaying: false })
      } catch (error) {
        console.warn('Error stopping audio globally:', fileId, error)
      }
    }
  }
  
  // Also stop all HTML audio elements on the page
  const audioElements = document.querySelectorAll('audio')
  audioElements.forEach(audio => {
    try {
      audio.pause()
      audio.currentTime = 0
    } catch (error) {
      console.warn('Error stopping HTML audio element:', error)
    }
  })
  
  globalCurrentlyPlaying = null
  console.log('✅ All audio stopped globally')
}

// Cleanup function to clear cache when needed
const clearAudioCache = () => {
  // Revoke all cached URLs
  for (const url of audioCache.values()) {
    URL.revokeObjectURL(url)
  }
  audioCache.clear()
  audioStateCache.clear()
  audioPlayStateCache.clear()
  audioControlsCache.clear()
  audioPositionCache.clear()
}

    const DriveFileItem = React.memo(function DriveFileItem({ file, accessToken, onDelete, onUpdate, onPlayerReady, onPlayStateChange }) {
      const { user } = useAuth()
      const [isPlaying, setIsPlaying] = useState(() => isAudioCurrentlyPlaying(file.id))
      const [audioUrl, setAudioUrl] = useState(() => audioCache.get(file.id) || null)
      const [isLoadingAudio, setIsLoadingAudio] = useState(() => audioStateCache.get(file.id)?.isLoading || false)
      const itemRef = useRef(null)
      const [isVisible, setIsVisible] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [comments, setComments] = useState([])
  const [showMenu, setShowMenu] = useState(false)
  

      useEffect(() => {
    // Check if it's an audio file
    const isAudioFile = file?.mimeType?.startsWith('audio/') || 
                       file?.name?.match(/\.(mp3|wav|webm|m4a|ogg|aac|flac)$/i)
    
    // Load audio if it's an audio file and not in cache
    if (file && accessToken && isAudioFile && !audioCache.has(file.id) && !isLoadingAudio) {
      loadAudioBlob()
    }
    
    // Load metadata
    if (file && accessToken) {
      loadMetadata()
    }
      }, [file, accessToken])

      // Set as visible immediately since we're loading audio right away
      useEffect(() => {
        setIsVisible(true)
      }, [])

      // Restore audio URL from cache when component mounts
      useEffect(() => {
        if (audioCache.has(file.id) && !audioUrl) {
          setAudioUrl(audioCache.get(file.id))
        }
      }, [file.id, audioUrl])

      // Cache play state whenever it changes
      useEffect(() => {
        audioPlayStateCache.set(file.id, { isPlaying })
      }, [file.id, isPlaying])

      // Sync with global play state
      useEffect(() => {
        const isGloballyPlaying = isAudioCurrentlyPlaying(file.id)
        if (isGloballyPlaying !== isPlaying) {
          setIsPlaying(isGloballyPlaying)
        }
      }, [file.id, isPlaying])

      // Update global state when component state changes
      useEffect(() => {
        if (isPlaying) {
          globalCurrentlyPlaying = file.id
        } else if (globalCurrentlyPlaying === file.id) {
          globalCurrentlyPlaying = null
        }
      }, [isPlaying, file.id])

      // Save audio position periodically when playing
      useEffect(() => {
        let intervalId
        if (isPlaying && audioControlsCache.has(file.id)) {
          const controls = audioControlsCache.get(file.id)
          intervalId = setInterval(() => {
            saveAudioPosition(file.id, controls)
          }, 1000) // Save position every second
        }
        
        return () => {
          if (intervalId) {
            clearInterval(intervalId)
          }
        }
      }, [isPlaying, file.id])
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.menu-container')) {
        setShowMenu(false)
      }
    }
    
    if (showMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showMenu])

  const loadMetadata = async () => {
    try {
      const [favs, comms] = await Promise.all([
        getDriveFavorites(accessToken, file.id),
        getDriveComments(accessToken, file.id)
      ])
      setFavorites(favs)
      setComments(comms)
    } catch (error) {
      console.error('Error loading metadata:', error)
    }
  }

  const loadAudioBlob = async () => {
    if (isLoadingAudio || audioUrl || audioCache.has(file.id)) return // Prevent multiple loads
    
    setIsLoadingAudio(true)
    // Cache loading state
    audioStateCache.set(file.id, { isLoading: true })
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )
      
      if (response.ok) {
        const blob = await response.blob()
        
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob)
          // Cache the audio URL
          audioCache.set(file.id, url)
          setAudioUrl(url)
          // Update cache state
          audioStateCache.set(file.id, { isLoading: false, loaded: true })
        } else {
          console.error('Audio blob is empty for:', file.name)
          audioStateCache.set(file.id, { isLoading: false, loaded: false })
        }
      } else {
        console.error('Failed to fetch audio:', response.status)
        audioStateCache.set(file.id, { isLoading: false, loaded: false })
      }
    } catch (error) {
      console.error('Error loading audio:', error)
      audioStateCache.set(file.id, { isLoading: false, loaded: false })
    } finally {
      setIsLoadingAudio(false)
    }
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        // Don't revoke if it's cached (other components might be using it)
        if (!audioCache.has(file.id)) {
          URL.revokeObjectURL(audioUrl)
        }
      }
    }
  }, [audioUrl, file.id])

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  const handleDelete = async () => {
    if (window.confirm(`Delete "${file.name}" from Google Drive?`)) {
      try {
        await deleteFromDrive(accessToken, file.id)
        onDelete(file.id)
      } catch (error) {
        alert('Failed to delete file. Please try again.')
      }
    }
  }

  const handleDownload = () => {
    window.open(file.webContentLink || file.webViewLink, '_blank')
  }

  const handleToggleFavorite = async () => {
    if (!user || !accessToken) return
    
    try {
      const newFavorites = await toggleDriveFavorite(accessToken, file.id, user)
      setFavorites(newFavorites)
      
      // Update the parent component's file data
      if (onUpdate) onUpdate()
      
      console.log('✅ Favorite toggled successfully')
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Failed to update favorite. Please try again.')
    }
  }

  const handleAddComment = async () => {
    if (!user || !newComment.trim() || !accessToken) return
    
    setIsAddingComment(true)
    try {
      console.log('Adding comment to file:', file.id)
      const newComments = await addDriveComment(accessToken, file.id, user, newComment.trim())
      console.log('Comment added successfully, new comments:', newComments)
      setComments(newComments)
      setNewComment('')
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error adding comment:', error)
      console.error('Error details:', error.message, error.stack)
      alert(`Failed to add comment: ${error.message}`)
    } finally {
      setIsAddingComment(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!user || !accessToken) return
    
    if (window.confirm('Delete this comment?')) {
      try {
        const newComments = await deleteDriveComment(accessToken, file.id, commentId, user.email)
        setComments(newComments)
        if (onUpdate) onUpdate()
      } catch (error) {
        console.error('Error deleting comment:', error)
        alert('Failed to delete comment. Please try again.')
      }
    }
  }

  const isFavorited = user && favorites.some(fav => fav.userEmail === user.email)
  const songName = extractSongName(file.name)
  const typeBadge = getRecordingTypeBadge(file.name)
  
  // Remove file extension from display name
  const displayName = file.name.replace(/\.(webm|mp3|mp4|m4a|wav|ogg|aac)$/i, '')

      return (
        <div className="drive-file-item" ref={itemRef}>
          {/* SINGLE COMPACT LAYOUT - Title, Actions, and Player in one box */}
          <div className="compact-layout">
            {/* Top row: Title + Actions */}
            <div className="title-actions-row">
              <div className="title-section">
                <h4 className="file-name-compact">{displayName}</h4>
                <div className="file-meta-compact">
                  {songName && (
                    <>
                      <span className="song-badge-inline">🎵 {songName}</span>
                      <span>•</span>
                    </>
                  )}
                  {typeBadge && (
                    <>
                      <span className={`type-badge-inline ${typeBadge.className}`}>
                        {typeBadge.icon} {typeBadge.label}
                      </span>
                      <span>•</span>
                    </>
                  )}
                  <span>{formatSize(file.size)}</span>
                  <span>•</span>
                  <span>{formatDate(file.modifiedTime)}</span>
                </div>
              </div>
              
              {/* Actions on the same line */}
              <div className="inline-actions">
                <button
                  onClick={handleToggleFavorite}
                  className={`inline-action-btn ${isFavorited ? 'favorited' : ''}`}
                  title="Favorite"
                  style={isFavorited ? { color: getUserColor(user?.email) } : {}}
                >
                  {isFavorited ? '★' : '☆'}
                </button>
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="inline-action-btn"
                  title="Comments"
                >
                  💬
                  {comments.length > 0 && <span className="action-count-inline">{comments.length}</span>}
                </button>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="inline-action-btn"
                  title="More"
                >
                  ⋮
                </button>
              </div>
            </div>

            {/* Audio Player */}
            <div className="audio-player-compact">
              {isLoadingAudio ? (
                <div className="audio-loading">
                  <div className="loading-spinner">⏳</div>
                  <span>Loading {file.name}...</span>
                </div>
              ) : audioUrl ? (
                <WaveformPlayer 
                  audioUrl={audioUrl} 
                  fileName={file.name}
                  onReady={(controls) => onPlayerReady && onPlayerReady(file.name, controls)}
                  onPlayStateChange={(name, playing) => onPlayStateChange && onPlayStateChange(name, playing)}
                />
              ) : (
                <div className="audio-load-failed">
                  <div className="load-error-text">
                    🎵 Audio not loaded
                    <br />
                    <small>File: {file.name}</small>
                    <br />
                    <small>Type: {file.mimeType || 'unknown'}</small>
                  </div>
                  <button onClick={() => loadAudioBlob()} className="load-audio-btn">
                    ▶️ Load Audio
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hidden menu container for dropdown */}
          <div className="menu-container">
            {showMenu && (
              <>
                <div className="dropdown-menu">
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="menu-item"
                    onClick={() => setShowMenu(false)}
                  >
                    <span>📂</span> View in Drive
                  </a>
                  <button
                    onClick={() => { handleDownload(); setShowMenu(false); }}
                    className="menu-item"
                  >
                    <span>💾</span> Download
                  </button>
                  <button
                    onClick={() => { handleDelete(); setShowMenu(false); }}
                    className="menu-item delete"
                  >
                    <span>🗑️</span> Delete
                  </button>
                </div>
                <div className="menu-overlay" onClick={() => setShowMenu(false)} />
              </>
            )}
          </div>

          {showComments && (
        <div className="comments-section">
          {comments.length > 0 ? (
            <div className="comments-list-compact">
              {comments.map(comment => (
                <div key={comment.id} className="comment-item-compact">
                  <div className="comment-header-compact">
                    <div 
                      className="comment-avatar-small"
                      style={{ background: getUserColor(comment.userEmail) }}
                    >
                      {getUserInitials(comment.userName)}
                    </div>
                    <div className="comment-meta-compact">
                      <span className="comment-user">{comment.userName}</span>
                      <span className="comment-time-small">{formatCommentDate(comment.timestamp)}</span>
                    </div>
                    <div className="comment-actions-compact">
                      {user && comment.userEmail === user.email && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="delete-comment-btn-small"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                      <button onClick={() => setShowComments(false)} className="close-comments" title="Close">✕</button>
                    </div>
                  </div>
                  <p className="comment-text-compact">{comment.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-comments-compact">No comments yet. Be the first!</p>
          )}

          <div className="add-comment-compact">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="comment-input-compact"
              rows="2"
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || isAddingComment}
              className="add-comment-btn-compact"
            >
              {isAddingComment ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

function DriveBrowser({ reloadKey }) {
  const { accessToken, user } = useAuth()
  const { setGlobalNowPlaying, setGlobalPlayState } = useAudio()
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSongs, setSelectedSongs] = useState([]) // Array of selected songs
  const [selectedDates, setSelectedDates] = useState([]) // Array of selected dates
  const [selectedTypes, setSelectedTypes] = useState([]) // Array of selected types
  const [showOnlyMyFavorites, setShowOnlyMyFavorites] = useState(false)
  const [showSongDropdown, setShowSongDropdown] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [customName, setCustomName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [audioDuration, setAudioDuration] = useState(null)
  const [recordingType, setRecordingType] = useState('full-band') // 'full-band' | 'solo'
  const [generatedName, setGeneratedName] = useState('')
  const [isGeneratingName, setIsGeneratingName] = useState(false)
  const cacheLoadedRef = useRef(false)

  const DRIVE_CACHE_KEY = 'drive.files.cache.v1'
  const loadFromCache = () => {
    try {
      const raw = localStorage.getItem(DRIVE_CACHE_KEY)
      if (!raw) return false
      const { items } = JSON.parse(raw)
      if (Array.isArray(items) && items.length >= 0) {
        setFiles(items)
        cacheLoadedRef.current = true
        return true
      }
    } catch (e) {
      console.warn('Drive cache read failed:', e)
    }
    return false
  }
  const saveToCache = (items) => {
    try {
      localStorage.setItem(DRIVE_CACHE_KEY, JSON.stringify({ items }))
    } catch (e) {
      console.warn('Drive cache write failed:', e)
    }
  }

  const loadFiles = async (token = null, forceRefresh = false) => {
    const useToken = token || accessToken
    if (!useToken) {
      console.log('⚠️ No access token available')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('📂 Loading Drive files...', forceRefresh ? '(force refresh)' : '')
      const driveFiles = await listRecordingsFromDrive(useToken)
      
      // Load favorites metadata for each file
      const filesWithFavorites = await Promise.all(
        driveFiles.map(async (file) => {
          try {
            const favorites = await getDriveFavorites(useToken, file.id)
            return { ...file, favorites }
          } catch (error) {
            console.error(`Error loading favorites for ${file.name}:`, error)
            return { ...file, favorites: [] }
          }
        })
      )
      
      setFiles(filesWithFavorites)
      saveToCache(filesWithFavorites)
      
      console.log('✅ Files loaded successfully')
    } catch (err) {
      console.error('❌ Error loading Drive files:', err)
      
      let errorMessage = 'Failed to load files from Drive'
      
      if (err.message.includes('401') || err.message.includes('403')) {
        errorMessage = 'Drive access expired. Please reconnect Google Drive.'
      } else if (err.message.includes('404')) {
        errorMessage = 'Shared folder not found. Check your folder settings.'
      } else if (err.message.includes('Cannot access shared folder')) {
        errorMessage = err.message
      } else if (err.message.includes('network')) {
        errorMessage = 'Network error. Check your internet connection.'
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Try to populate from cache instantly
    const hadCache = loadFromCache()
    // Always load from Drive when we have a token (for fresh data)
    if (accessToken) {
      loadFiles()
    }
  }, [accessToken])

  // Force reload on explicit trigger from parent (e.g., after upload)
  useEffect(() => {
    if (accessToken && reloadKey > 0) {
      loadFiles()
    }
  }, [reloadKey])

  const handleDelete = (fileId) => {
    setFiles(files.filter(f => f.id !== fileId))
  }

  const handleUpdate = () => {
    // Trigger a re-render by updating state
    setFiles([...files])
  }

  const handleDriveAuthSuccess = (token) => {
    loadFiles(token, true) // Force refresh when auth succeeds
  }

  // Cleanup audio cache when component unmounts
  useEffect(() => {
    return () => {
      clearAudioCache()
    }
  }, [])

  const handleManualRefresh = () => {
    if (accessToken) {
      loadFiles(accessToken, true)
    }
  }

  const formatDateTag = (dateObj) => {
    const date = dateObj || new Date()
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  }

  const generateFinalName = async (songName, type = recordingType) => {
    if (!songName || !accessToken) {
      setGeneratedName('')
      return
    }
    setIsGeneratingName(true)
    try {
      const nextTake = await getNextTakeNumberFromDrive(accessToken, songName)
      const dateStr = formatDateTag(new Date())
      const typeLabel = type === 'solo' ? ' - Solo' : ''
      setGeneratedName(`${songName} - Take ${nextTake}${typeLabel} - ${dateStr}`)
    } catch (e) {
      // fallback if query fails
      const dateStr = formatDateTag(new Date())
      const typeLabel = type === 'solo' ? ' - Solo' : ''
      setGeneratedName(`${songName} - Take 1${typeLabel} - ${dateStr}`)
    } finally {
      setIsGeneratingName(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    setSelectedFile(file || null)
    setUploadError(null)
    setAudioDuration(null)
    if (file) {
      const baseName = file.name.replace(/\.(webm|mp3|mp4|m4a|wav|ogg|aac)$/i, '')
      setCustomName(baseName)
      // generate default final name
      generateFinalName(baseName, recordingType)
      // Load to get duration
      const audioEl = new Audio()
      audioEl.src = URL.createObjectURL(file)
      audioEl.addEventListener('loadedmetadata', () => {
        setAudioDuration(Math.floor(audioEl.duration || 0))
        URL.revokeObjectURL(audioEl.src)
      })
      audioEl.addEventListener('error', () => {
        setAudioDuration(null)
      })
    }
  }

  const handleUpload = async () => {
    if (!accessToken || !selectedFile || !customName.trim()) return
    setIsUploading(true)
    setUploadError(null)
    try {
      const finalName = generatedName || `${customName.trim()} - ${formatDateTag(new Date())}`
      const recording = {
        name: finalName,
        blob: selectedFile,
        mimeType: selectedFile.type || 'audio/webm',
        timestamp: Date.now(),
        duration: audioDuration || 0,
        quality: { preset: 'manual-upload', type: recordingType }
      }
      await uploadRecordingToDrive(accessToken, recording)
      setShowUpload(false)
      setSelectedFile(null)
      setCustomName('')
      setAudioDuration(null)
      setRecordingType('full-band')
      setGeneratedName('')
      loadFiles()
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError(err.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  // Extract unique song names from files
  const uniqueSongNames = [...new Set(
    files
      .map(f => extractSongName(f.name))
      .filter(Boolean)
  )].sort()

  // Extract unique dates from files (grouped by day)
  const uniqueDates = [...new Set(
    files.map(f => {
      const date = new Date(f.modifiedTime)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    })
  )].sort((a, b) => new Date(b) - new Date(a)) // Most recent first

  // Filter files based on search, song, date, and type selection (multiple selections)
  const filteredFiles = files.filter(file => {
    const matchesSearch = searchQuery.trim() === '' || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Multiple song selection: if no songs selected, show all; otherwise match any selected song
    const matchesSong = selectedSongs.length === 0 || 
      selectedSongs.includes(extractSongName(file.name))
    
    const fileDate = new Date(file.modifiedTime).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
    // Multiple date selection: if no dates selected, show all; otherwise match any selected date
    const matchesDate = selectedDates.length === 0 || 
      selectedDates.includes(fileDate)
    
    const fileType = extractRecordingType(file.name)
    // Multiple type selection: if no types selected, show all; otherwise match any selected type
    const matchesType = selectedTypes.length === 0 || 
      selectedTypes.includes(fileType)
    
    // Check if user has favorited this file
    const matchesFavorites = !showOnlyMyFavorites || 
      (file.favorites && user && file.favorites.some(fav => fav.userEmail === user.email))
    
    return matchesSearch && matchesSong && matchesDate && matchesType && matchesFavorites
  })

  if (!accessToken) {
    return (
      <div className="drive-browser-empty">
        <div className="empty-icon">🎵</div>
        <p className="empty-text">Connect Google Drive to see all recordings</p>
        <DriveAuthButton onSuccess={handleDriveAuthSuccess}>
          🔗 Connect Google Drive
        </DriveAuthButton>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="drive-browser-loading">
        <div className="loading-spinner">⏳</div>
        <p>Loading from Google Drive...</p>
      </div>
    )
  }

  if (error) {
    const needsReauth = error.includes('expired') || error.includes('403') || error.includes('401')
    
    return (
      <div className="drive-browser-error">
        <div className="error-icon">⚠️</div>
        <p className="error-text">{error}</p>
        <div className="error-actions">
          {needsReauth ? (
            <DriveAuthButton onSuccess={handleDriveAuthSuccess}>
              🔗 Reconnect Google Drive
            </DriveAuthButton>
          ) : (
            <button onClick={() => loadFiles()} className="retry-btn">
              ↻ Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="drive-browser-empty">
        <div className="empty-icon">📁</div>
        <p className="empty-text">No files in Drive yet</p>
        <p className="empty-subtext">Upload recordings to see them here</p>
        <button onClick={() => loadFiles()} className="refresh-btn">
          ↻ Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="drive-browser">
      <div className="drive-browser-header">
        <h3>Recordings ({filteredFiles.length}{files.length !== filteredFiles.length ? ` of ${files.length}` : ''})</h3>
        <div className="header-actions">
          <button onClick={() => setShowUpload(true)} className="upload-btn-emoji" title="Upload audio to Drive">
            ↥
          </button>
          <button onClick={handleManualRefresh} className="refresh-btn-emoji" title="Refresh" disabled={isLoading}>
            {isLoading ? '⏳' : '↻'}
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="drive-controls">
        {/* Search Bar with Filter Icon and Favorites */}
        <div className="search-filter-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Search recordings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="clear-search"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Icon Button */}
          <button
            type="button"
            className="filter-icon-btn"
            onClick={() => setShowFilterModal(true)}
            title="Filters"
          >
            <div className="filter-lines">
              <div className="filter-line filter-line-top"></div>
              <div className="filter-line filter-line-middle"></div>
              <div className="filter-line filter-line-bottom"></div>
            </div>
            {(selectedSongs.length > 0 || selectedDates.length > 0 || selectedTypes.length > 0) && (
              <span className="filter-badge">
                {selectedSongs.length + selectedDates.length + selectedTypes.length}
              </span>
            )}
          </button>

          {/* Favorites Button */}
          <button
            onClick={() => setShowOnlyMyFavorites(!showOnlyMyFavorites)}
            className={`favorites-filter-btn ${showOnlyMyFavorites ? 'active' : ''}`}
            title="Show only my favorites"
          >
            ⭐
          </button>
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <>
            <div className="filter-modal-overlay" onClick={() => setShowFilterModal(false)} />
            <div className="filter-modal">
              <div className="filter-modal-header">
                <h3>Filters</h3>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="close-modal-btn"
                >
                  ✕
                </button>
              </div>
              <div className="filter-modal-content">
                <div className="filters-row">
                  {uniqueSongNames.length > 0 && (
                    <div className="song-filter">
                      <div className="custom-select-wrapper">
                        <button
                          type="button"
                          className="song-select"
                          onClick={() => setShowSongDropdown(!showSongDropdown)}
                        >
                          {selectedSongs.length === 0 
                            ? `All Songs (${uniqueSongNames.length})` 
                            : `${selectedSongs.length} selected`}
                        </button>
                        {showSongDropdown && (
                          <>
                            <div 
                              className="dropdown-backdrop" 
                              onClick={() => setShowSongDropdown(false)}
                            />
                            <div className="custom-select-dropdown">
                              {uniqueSongNames.map((song) => (
                                <label key={song} className="checkbox-option">
                                  <input
                                    type="checkbox"
                                    checked={selectedSongs.includes(song)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedSongs([...selectedSongs, song])
                                      } else {
                                        setSelectedSongs(selectedSongs.filter(s => s !== song))
                                      }
                                    }}
                                  />
                                  <span className="checkbox-label">🎵 {song}</span>
                                </label>
                              ))}
                              {selectedSongs.length > 0 && (
                                <button
                                  type="button"
                                  className="clear-selection-btn"
                                  onClick={() => setSelectedSongs([])}
                                >
                                  Clear All
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {uniqueDates.length > 0 && (
                    <div className="date-filter">
                      <select
                        value={selectedDates.length === 0 ? 'all' : selectedDates[0] || 'all'}
                        onChange={(e) => {
                          if (e.target.value === 'all') {
                            setSelectedDates([])
                          } else {
                            setSelectedDates([e.target.value])
                          }
                        }}
                        className="date-select"
                      >
                        <option value="all">All Dates ({uniqueDates.length})</option>
                        {uniqueDates.map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Type Filter */}
                  <div className="type-filter">
                    <select
                      value={selectedTypes.length === 0 ? 'all' : selectedTypes[0] || 'all'}
                      onChange={(e) => {
                        if (e.target.value === 'all') {
                          setSelectedTypes([])
                        } else {
                          setSelectedTypes([e.target.value])
                        }
                      }}
                      className="type-select"
                    >
                      <option value="all">All Types</option>
                      <option value="full-band">👥 Full Band</option>
                      <option value="solo">👤 Solo</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {filteredFiles.length === 0 && files.length > 0 ? (
        <div className="no-results">
          <p>No recordings match your search</p>
          <button 
            onClick={() => {
              setSearchQuery('')
              setSelectedSong('all')
              setSelectedDate('all')
              setSelectedType('all')
              setShowOnlyMyFavorites(false)
            }}
            className="clear-filters-btn"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="drive-files-list">
          {filteredFiles.map((file) => (
            <DriveFileItem
              key={file.id}
              file={file}
              accessToken={accessToken}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onPlayerReady={(name, controls) => {
                // Cache the controls
                audioControlsCache.set(file.id, controls)
                // Set global now playing
                setGlobalNowPlaying(name, controls)
                
                // Restore audio position if available
                const cachedPosition = audioPositionCache.get(file.id)
                if (cachedPosition && controls && controls.seekTo) {
                  try {
                    controls.seekTo(cachedPosition.position)
                  } catch (error) {
                    console.warn('Error restoring audio position:', error)
                  }
                }
                
                // Restore play state if it was playing before
                const cachedState = audioPlayStateCache.get(file.id)
                if (cachedState && cachedState.isPlaying && controls && controls.play) {
                  // Small delay to ensure the player is ready
                  setTimeout(() => {
                    try {
                      controls.play()
                    } catch (error) {
                      console.warn('Error restoring play state:', error)
                    }
                  }, 200)
                }
              }}
              onPlayStateChange={(name, playing) => {
                console.log('🎵 Play state changed:', name, playing)
                setGlobalPlayState(playing)
                
                if (playing) {
                  // Stop all OTHER audio (not this one)
                  stopAllOtherAudio(file.id)
                  // Set this as the current playing audio
                  globalCurrentlyPlaying = file.id
                  console.log('🎵 Starting audio:', file.id)
                } else {
                  // If this audio is paused, update global state
                  if (globalCurrentlyPlaying === file.id) {
                    globalCurrentlyPlaying = null
                    console.log('✅ Audio paused, global state cleared')
                  }
                }
              }}
            />
          ))}
        </div>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="upload-header">
              <h3>⬆️ Upload Audio</h3>
              <button onClick={() => setShowUpload(false)} className="close-btn">✕</button>
            </div>
            
            <div className="upload-content">
              {/* File Selection */}
              <div className="upload-section">
                <label className="upload-label">📁 Select Audio File</label>
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileChange}
                    className="file-input"
                    id="audio-file"
                  />
                  <label htmlFor="audio-file" className="file-input-label">
                    {selectedFile ? `📄 ${selectedFile.name}` : '📁 Choose audio file...'}
                  </label>
                </div>
              </div>

              {/* Song Name */}
              <div className="upload-section">
                <label className="upload-label">🎵 Song Name</label>
                <input
                  type="text"
                  className="upload-input"
                  placeholder="Type song name..."
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value)
                    generateFinalName(e.target.value, recordingType)
                  }}
                />
              </div>

              {/* Recording Type */}
              <div className="upload-section">
                <label className="upload-label">🎤 Recording Type</label>
                <div className="type-selector">
                  <button
                    onClick={() => { setRecordingType('full-band'); generateFinalName(customName, 'full-band') }}
                    className={`type-option ${recordingType === 'full-band' ? 'selected' : ''}`}
                  >
                    👥 Full Band
                  </button>
                  <button
                    onClick={() => { setRecordingType('solo'); generateFinalName(customName, 'solo') }}
                    className={`type-option ${recordingType === 'solo' ? 'selected' : ''}`}
                  >
                    👤 Solo
                  </button>
                </div>
              </div>

              {/* Preview */}
              {generatedName && (
                <div className="upload-preview">
                  <div className="preview-label">📝 Will be uploaded as:</div>
                  <div className="preview-name">
                    {generatedName}
                    {isGeneratingName && <span className="loading">⏳</span>}
                  </div>
                </div>
              )}

              {/* File Info */}
              {selectedFile && (
                <div className="file-info">
                  <div className="info-item">📅 {formatDateTag()}</div>
                  {audioDuration != null && <div className="info-item">⏱️ {audioDuration}s</div>}
                  <div className="info-item">🎵 {selectedFile.type || 'audio'}</div>
                </div>
              )}

              {/* Error */}
              {uploadError && (
                <div className="upload-error">
                  ⚠️ {uploadError}
                </div>
              )}

              {/* Actions */}
              <div className="upload-actions">
                <button 
                  onClick={handleUpload} 
                  className="upload-btn"
                  disabled={!selectedFile || !customName.trim() || isUploading}
                >
                  {isUploading ? '⏳ Uploading...' : '⬆️ Upload to Drive'}
                </button>
                <button 
                  onClick={() => setShowUpload(false)} 
                  className="cancel-btn" 
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriveBrowser

