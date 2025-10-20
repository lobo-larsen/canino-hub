import { useState, useEffect, useRef } from 'react'
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

    function DriveFileItem({ file, accessToken, onDelete, onUpdate, onPlayerReady, onPlayStateChange }) {
      const { user } = useAuth()
      const [isPlaying, setIsPlaying] = useState(false)
      const [audioUrl, setAudioUrl] = useState(null)
      const [isLoadingAudio, setIsLoadingAudio] = useState(false)
      const itemRef = useRef(null)
      const [isVisible, setIsVisible] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [comments, setComments] = useState([])
  const [showMenu, setShowMenu] = useState(false)

      useEffect(() => {
    console.log('🔍 File details:', {
      name: file?.name,
      mimeType: file?.mimeType,
      id: file?.id,
      hasAccessToken: !!accessToken
    })
    
    // Check if it's an audio file (more flexible check)
    const isAudioFile = file?.mimeType?.startsWith('audio/') || 
                       file?.name?.match(/\.(mp3|wav|webm|m4a|ogg|aac|flac)$/i)
    
        if (file && accessToken && isAudioFile && isVisible) {
      console.log('🎵 Detected audio file, loading...')
      loadAudioBlob()
        } else if (file && accessToken && !isVisible) {
          console.log('👀 Deferred audio load until visible')
        } else if (file && accessToken) {
      console.log('⚠️ Not an audio file or missing access token')
    }
    
    // Load metadata
    if (file && accessToken) {
      loadMetadata()
    }
      }, [file, accessToken, isVisible])

      // Observe visibility for lazy loading
      useEffect(() => {
        const el = itemRef.current
        if (!el) return
        if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
          // Fallback: mark as visible to avoid blocking loads
          setIsVisible(true)
          return
        }
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsVisible(true)
              observer.disconnect()
            }
          },
          { root: null, rootMargin: '200px', threshold: 0.01 }
        )
        observer.observe(el)
        return () => observer.disconnect()
      }, [])
  
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
    setIsLoadingAudio(true)
    try {
      console.log('🎵 Loading audio for file:', file.name, 'ID:', file.id)
      
      // Try multiple methods to get the audio
      let audioUrl = null
      
      // Method 1: Try direct media link
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
          audioUrl = URL.createObjectURL(blob)
          console.log('✅ Audio loaded via Drive API')
        } else {
          console.warn('Drive API failed:', response.status)
        }
      } catch (error) {
        console.warn('Drive API error:', error)
      }
      
      // Method 2: Try webContentLink if available
      if (!audioUrl && file.webContentLink) {
        try {
          const response = await fetch(file.webContentLink)
          if (response.ok) {
            const blob = await response.blob()
            audioUrl = URL.createObjectURL(blob)
            console.log('✅ Audio loaded via webContentLink')
          }
        } catch (error) {
          console.warn('webContentLink error:', error)
        }
      }
      
      // Method 3: Try webViewLink as fallback
      if (!audioUrl && file.webViewLink) {
        try {
          // For webViewLink, we need to extract the file ID and try again
          const fileIdMatch = file.webViewLink.match(/\/file\/d\/([a-zA-Z0-9-_]+)/)
          if (fileIdMatch) {
            const fileId = fileIdMatch[1]
            const response = await fetch(
              `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
              {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            )
            if (response.ok) {
              const blob = await response.blob()
              audioUrl = URL.createObjectURL(blob)
              console.log('✅ Audio loaded via webViewLink')
            }
          }
        } catch (error) {
          console.warn('webViewLink error:', error)
        }
      }
      
      if (audioUrl) {
        setAudioUrl(audioUrl)
        console.log('🎵 Audio URL created successfully')
      } else {
        console.error('❌ Failed to load audio from any method')
        setAudioUrl(null)
      }
    } catch (error) {
      console.error('❌ Error loading audio:', error)
      setAudioUrl(null)
    } finally {
      setIsLoadingAudio(false)
    }
  }

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

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
      if (onUpdate) onUpdate()
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
      <div className="file-info">
        <h4 className="file-name">{displayName}</h4>
        <div className="file-meta">
          {songName && (
            <>
              <span className="song-badge-drive">
                🎵 {songName}
              </span>
              <span>•</span>
            </>
          )}
          {typeBadge && (
            <>
              <span className={`type-badge ${typeBadge.className}`}>
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

          <div className="audio-player">
            {!isVisible ? (
              <div className="waveform-skeleton" aria-hidden="true" />
            ) : isLoadingAudio ? (
              <div className="audio-loading">⏳ Loading audio...</div>
            ) : audioUrl ? (
              <WaveformPlayer 
                audioUrl={audioUrl} 
                fileName={file.name}
                onReady={(controls) => onPlayerReady && onPlayerReady(file.name, controls)}
                onPlayStateChange={(playing) => onPlayStateChange && onPlayStateChange(file.name, playing)}
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
                <button onClick={loadAudioBlob} className="load-audio-btn">
                  ▶️ Load Audio
                </button>
              </div>
            )}
          </div>

      <div className="recording-actions-row">
        <div className="left-actions">
          {/* Compact Favorites */}
          <div className="compact-action-group">
            <button
              onClick={handleToggleFavorite}
              className={`compact-action-btn ${isFavorited ? 'favorited' : ''}`}
              title="Favorite"
              style={isFavorited ? { color: getUserColor(user?.email) } : {}}
            >
              {isFavorited ? '★' : '☆'}
            </button>
            {favorites.length > 0 && (
              <span className="action-count">{favorites.length}</span>
            )}
          </div>
          
          {/* Compact Comments */}
          <div className="compact-action-group">
            <button
              onClick={() => setShowComments(!showComments)}
              className="compact-action-btn"
              title="Comments"
            >
              💬
            </button>
            {comments.length > 0 && (
              <span className="action-count">{comments.length}</span>
            )}
          </div>
        </div>

            {/* Three-dot menu */}
            <div className="menu-container">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="menu-btn"
            title="More actions"
          >
            ⋮
          </button>
          
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
}

function DriveBrowser({ reloadKey }) {
  const { accessToken, user } = useAuth()
  const { setGlobalNowPlaying, setGlobalPlayState } = useAudio()
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSong, setSelectedSong] = useState('all')
  const [selectedDate, setSelectedDate] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showOnlyMyFavorites, setShowOnlyMyFavorites] = useState(false)
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

  const loadFiles = async (token = null) => {
    const useToken = token || accessToken
    if (!useToken) {
      console.log('⚠️ No access token available')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('📂 Loading Drive files...')
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
    // Only load from Drive if we have token and no cache
    if (accessToken && !hadCache) {
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
    loadFiles(token)
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

  // Filter files based on search, song, date, and type selection
  const filteredFiles = files.filter(file => {
    const matchesSearch = searchQuery.trim() === '' || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesSong = selectedSong === 'all' || 
      extractSongName(file.name) === selectedSong
    
    const fileDate = new Date(file.modifiedTime).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
    const matchesDate = selectedDate === 'all' || fileDate === selectedDate
    
    const fileType = extractRecordingType(file.name)
    const matchesType = selectedType === 'all' || fileType === selectedType
    
    // Check if user has favorited this file
    const matchesFavorites = !showOnlyMyFavorites || 
      (file.favorites && user && file.favorites.some(fav => fav.userEmail === user.email))
    
    return matchesSearch && matchesSong && matchesDate && matchesType && matchesFavorites
  })

  if (!accessToken) {
    return (
      <div className="drive-browser-empty">
        <div className="empty-icon">☁️</div>
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
              🔄 Try Again
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
          🔄 Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="drive-browser">
      <div className="drive-browser-header">
        <h3>☁️ Band Recordings ({filteredFiles.length}{files.length !== filteredFiles.length ? ` of ${files.length}` : ''})</h3>
        <div className="header-actions">
          <button onClick={() => setShowUpload(true)} className="upload-btn-emoji" title="Upload audio to Drive">
            ⬆️
          </button>
          <button onClick={() => loadFiles()} className="refresh-btn-emoji" title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="drive-controls">
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

        <div className="filters-row">
          {uniqueSongNames.length > 0 && (
            <div className="song-filter">
              <label className="filter-label">Song:</label>
              <div className="song-filter-buttons">
                <button
                  onClick={() => setSelectedSong('all')}
                  className={`song-filter-btn ${selectedSong === 'all' ? 'active' : ''}`}
                >
                  All
                </button>
                {uniqueSongNames.map((song) => (
                  <button
                    key={song}
                    onClick={() => setSelectedSong(song)}
                    className={`song-filter-btn ${selectedSong === song ? 'active' : ''}`}
                  >
                    🎵 {song}
                  </button>
                ))}
              </div>
            </div>
          )}

          {uniqueDates.length > 0 && (
            <div className="date-filter">
              <label className="filter-label">📅 Date:</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
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
                <label className="filter-label">Type:</label>
                <div className="type-filter-buttons">
                  <button
                    onClick={() => setSelectedType('all')}
                    className={`type-filter-btn ${selectedType === 'all' ? 'active' : ''}`}
                  >
                    All Types
                  </button>
                  <button
                    onClick={() => setSelectedType('full-band')}
                    className={`type-filter-btn ${selectedType === 'full-band' ? 'active' : ''}`}
                  >
                    👥 Full Band
                  </button>
                  <button
                    onClick={() => setSelectedType('solo')}
                    className={`type-filter-btn ${selectedType === 'solo' ? 'active' : ''}`}
                  >
                    👤 Solo
                  </button>
                  
                  {/* My Favorites Filter */}
                  <button
                    onClick={() => setShowOnlyMyFavorites(!showOnlyMyFavorites)}
                    className={`type-filter-btn favorites-filter ${showOnlyMyFavorites ? 'active' : ''}`}
                    title="Show only my favorites"
                  >
                    ⭐
                  </button>
                </div>
              </div>
        </div>
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
                // Set global now playing
                setGlobalNowPlaying(name, controls)
              }}
              onPlayStateChange={(name, playing) => {
                setGlobalPlayState(playing)
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

