import { useState, useEffect } from 'react'
import { getAllRecordings, deleteRecording, updateRecording, markAsUploadedToDrive } from '../utils/indexedDB'
import { formatTime } from '../hooks/useAudioRecorder'
import { getQualityPreset } from '../utils/audioQuality'
import { uploadRecordingToDrive } from '../utils/googleDrive'
import { useAuth } from '../contexts/AuthContext'
import { getRecordingTypeBadge } from '../utils/songNames'
import DriveAuthButton from './DriveAuthButton'
import './RecordingsList.css'

function RecordingItem({ recording, onDelete, onUpdate }) {
  const { accessToken } = useAuth()
  const [isPlaying, setIsPlaying] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(recording.name)
  const [audioURL, setAudioURL] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showDriveAuth, setShowDriveAuth] = useState(false)

  useEffect(() => {
    if (recording.blob) {
      const url = URL.createObjectURL(recording.blob)
      setAudioURL(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [recording.blob])

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      await deleteRecording(recording.id)
      onDelete(recording.id)
    }
  }

  const handleSaveName = async () => {
    if (editName.trim() !== recording.name) {
      await updateRecording(recording.id, { name: editName.trim() })
      onUpdate()
    }
    setIsEditing(false)
  }

  const handleDownload = () => {
    if (audioURL) {
      const a = document.createElement('a')
      a.href = audioURL
      const extension = recording.mimeType?.includes('webm') ? 'webm' : 'mp4'
      a.download = `${recording.name}.${extension}`
      a.click()
    }
  }

  const handleUploadToDrive = async (token = null) => {
    const uploadToken = token || accessToken
    
    console.log('Upload attempt - has token:', !!uploadToken)
    
    if (!uploadToken) {
      console.log('No access token, showing auth prompt')
      setShowDriveAuth(true)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      console.log('Starting upload to Drive...')
      const driveData = await uploadRecordingToDrive(
        uploadToken,
        recording,
        (progress) => setUploadProgress(progress)
      )
      console.log('Upload successful:', driveData)

      await markAsUploadedToDrive(recording.id, driveData)
      setUploadProgress(100)
      
      // Auto-delete local copy after successful upload
      setTimeout(async () => {
        try {
          await deleteRecording(recording.id)
          console.log('Local recording deleted after successful upload')
        } catch (error) {
          console.error('Error deleting local recording:', error)
        }
        setIsUploading(false)
        setUploadProgress(0)
        onUpdate()
      }, 1500)
    } catch (error) {
      console.error('Upload failed:', error)
      let errorMessage = 'Failed to upload to Google Drive.\n\n'
      
      if (error.message.includes('permission')) {
        errorMessage += 'Permission issue: Make sure you have "Editor" access to the shared folder.'
      } else if (error.message.includes('Cannot access shared folder')) {
        errorMessage += 'Cannot access the shared folder. Please:\n1. Check that the folder exists\n2. Make sure it\'s shared with your Google account\n3. You have "Editor" permission'
      } else {
        errorMessage += 'Error: ' + error.message
      }
      
      alert(errorMessage)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDriveAuthSuccess = (token) => {
    setShowDriveAuth(false)
    handleUploadToDrive(token)
  }

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
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

  return (
    <div className="recording-item">
      <div className="recording-info">
        {isEditing ? (
          <input
            type="text"
            className="edit-name-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName()
              if (e.key === 'Escape') {
                setEditName(recording.name)
                setIsEditing(false)
              }
            }}
            autoFocus
          />
        ) : (
          <h4 
            className="recording-name"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
          >
            {recording.name}
          </h4>
        )}
        <div className="recording-meta">
          {recording.songName && (
            <span className="song-badge">
              🎵 {recording.songName}
            </span>
          )}
          {(() => {
            const typeBadge = getRecordingTypeBadge(recording.name)
            return typeBadge && (
              <span className={`type-badge ${typeBadge.className}`}>
                {typeBadge.icon} {typeBadge.label}
              </span>
            )
          })()}
          <span>{formatTime(recording.duration)}</span>
          <span>•</span>
          <span>{formatSize(recording.size)}</span>
          <span>•</span>
          <span>{formatDate(recording.timestamp)}</span>
          {recording.quality && (
            <>
              <span>•</span>
              <span className="quality-badge" title={`${recording.quality.bitrate / 1000}kbps, ${recording.quality.sampleRate / 1000}kHz`}>
                {getQualityPreset(recording.quality.preset).icon} {getQualityPreset(recording.quality.preset).name}
              </span>
            </>
          )}
        </div>
      </div>

      {audioURL && (
        <div className="audio-player">
          <audio 
            src={audioURL} 
            controls 
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}

      <div className="recording-actions">
        {recording.driveFileId ? (
          <a
            href={recording.driveWebViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="action-icon-btn drive-linked"
            title="View in Google Drive"
          >
            ☁️
          </a>
        ) : (
          <button
            onClick={() => handleUploadToDrive()}
            className="action-icon-btn"
            title="Upload to Google Drive"
            disabled={isUploading}
          >
            {isUploading ? '⏳' : '🔗'}
          </button>
        )}
        <button
          onClick={handleDownload}
          className="action-icon-btn"
          title="Download"
        >
          💾
        </button>
        <button
          onClick={handleDelete}
          className="action-icon-btn delete"
          title="Delete"
        >
          🗑️
        </button>
      </div>

      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="progress-text">
            {uploadProgress < 100 ? 'Uploading to Google Drive...' : 'Upload complete! Removing local copy... ✓'}
          </div>
        </div>
      )}

      {showDriveAuth && (
        <div className="drive-auth-prompt">
          <p>Connect Google Drive to upload this recording</p>
          <div className="auth-actions">
            <DriveAuthButton onSuccess={handleDriveAuthSuccess}>
              🔗 Connect Drive
            </DriveAuthButton>
            <button 
              onClick={() => setShowDriveAuth(false)}
              className="cancel-auth-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RecordingsList({ refreshTrigger, onUpdate }) {
  const { accessToken } = useAuth()
  const [recordings, setRecordings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [showBulkUploadPrompt, setShowBulkUploadPrompt] = useState(false)

  const loadRecordings = async () => {
    setIsLoading(true)
    try {
      const allRecordings = await getAllRecordings()
      setRecordings(allRecordings)
    } catch (err) {
      console.error('Error loading recordings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecordings()
  }, [refreshTrigger])

  const handleDelete = (id) => {
    setRecordings(recordings.filter(r => r.id !== id))
    // Notify parent to update stats
    if (onUpdate) {
      onUpdate()
    }
  }

  const handleBulkUpload = async () => {
    if (!accessToken) {
      setShowBulkUploadPrompt(true)
      return
    }

    const recordingsToUpload = recordings.filter(r => !r.driveFileId)
    
    if (recordingsToUpload.length === 0) {
      alert('All recordings are already uploaded to Drive!')
      return
    }

    if (!window.confirm(`Upload ${recordingsToUpload.length} recording${recordingsToUpload.length > 1 ? 's' : ''} to Google Drive?`)) {
      return
    }

    setIsBulkUploading(true)
    setUploadProgress({ current: 0, total: recordingsToUpload.length })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < recordingsToUpload.length; i++) {
      const recording = recordingsToUpload[i]
      setUploadProgress({ current: i + 1, total: recordingsToUpload.length })

      try {
        const driveData = await uploadRecordingToDrive(accessToken, recording)
        await markAsUploadedToDrive(recording.id, driveData)
        
        // Delete local copy after successful upload
        await deleteRecording(recording.id)
        successCount++
      } catch (error) {
        console.error(`Failed to upload ${recording.name}:`, error)
        failCount++
      }
    }

    setIsBulkUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    
    // Reload recordings to show updated status
    await loadRecordings()
    
    // Notify parent to update stats
    if (onUpdate) {
      onUpdate()
    }

    // Show summary
    let message = `✓ Upload complete!\n\n`
    message += `Successful: ${successCount}\n`
    if (failCount > 0) {
      message += `Failed: ${failCount}\n\n`
    }
    message += `\nLocal copies have been removed to save space.`
    alert(message)
  }

  const handleBulkUploadAuthSuccess = (token) => {
    setShowBulkUploadPrompt(false)
    // Re-trigger bulk upload with the new token
    setTimeout(() => handleBulkUpload(), 500)
  }

  // Count recordings not yet uploaded
  const notUploadedCount = recordings.filter(r => !r.driveFileId).length

  if (isLoading) {
    return (
      <div className="recordings-list">
        <div className="loading">Loading recordings...</div>
      </div>
    )
  }

  if (recordings.length === 0) {
    return (
      <div className="recordings-list">
        <div className="empty-state">
          <div className="empty-icon">🎵</div>
          <p className="empty-text">No recordings yet</p>
          <p className="empty-subtext">Start your first recording to see it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="recordings-list">
      {notUploadedCount > 0 && (
        <div className="bulk-upload-banner">
          <div className="bulk-info">
            <span className="bulk-icon">☁️</span>
            <div>
              <strong>{notUploadedCount} recording{notUploadedCount > 1 ? 's' : ''}</strong> not uploaded to Drive
            </div>
          </div>
          <button
            onClick={handleBulkUpload}
            disabled={isBulkUploading}
            className="bulk-upload-btn"
          >
            {isBulkUploading 
              ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...` 
              : `⬆️ Upload All to Drive`
            }
          </button>
        </div>
      )}

      {isBulkUploading && (
        <div className="bulk-upload-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
          <p className="progress-text">
            Uploading {uploadProgress.current} of {uploadProgress.total}...
          </p>
        </div>
      )}

      <div className="recordings-grid">
        {recordings.map((recording) => (
          <RecordingItem
            key={recording.id}
            recording={recording}
            onDelete={handleDelete}
            onUpdate={loadRecordings}
          />
        ))}
      </div>

      {showBulkUploadPrompt && (
        <div className="modal-overlay-inline">
          <div className="drive-auth-modal">
            <h3>Connect Google Drive</h3>
            <p>To upload recordings to Drive, please connect your Google account</p>
            <div className="modal-actions">
              <DriveAuthButton onSuccess={handleBulkUploadAuthSuccess}>
                🔗 Connect Drive
              </DriveAuthButton>
              <button 
                onClick={() => setShowBulkUploadPrompt(false)}
                className="cancel-modal-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RecordingsList

