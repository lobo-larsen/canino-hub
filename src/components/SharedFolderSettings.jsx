import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getSharedFolderId, setSharedFolderId, extractFolderIdFromUrl, hasSharedFolder, isUsingDefaultFolder, getDefaultFolderId } from '../utils/sharedFolderConfig'
import { getRecordingQuality, setRecordingQuality } from '../utils/qualitySettings'
import { QUALITY_PRESETS } from '../utils/audioQuality'
import { clearAllRecordings } from '../utils/indexedDB'
import { THEMES, getCurrentTheme, setCurrentTheme } from '../utils/themes'
import './SharedFolderSettings.css'

function SharedFolderSettings({ onClose, onDataCleared }) {
  const { user, logout } = useAuth()
  const [folderInput, setFolderInput] = useState('')
  const [currentFolderId, setCurrentFolderId] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [recordingQuality, setRecordingQualityState] = useState(getRecordingQuality())
  const [currentThemeId, setCurrentThemeId] = useState(getCurrentTheme())

  useEffect(() => {
    const folderId = getSharedFolderId()
    const usingDefault = isUsingDefaultFolder()
    if (folderId) {
      setCurrentFolderId(folderId)
      setFolderInput(folderId)
      setIsDefault(usingDefault)
    }
  }, [])

  const handleSave = () => {
    const folderId = extractFolderIdFromUrl(folderInput.trim())
    if (folderId) {
      setSharedFolderId(folderId)
      setCurrentFolderId(folderId)
      alert('✓ Shared folder configured! All uploads will now go to this folder.')
      if (onClose) onClose()
    } else {
      alert('Invalid folder URL or ID. Please check and try again.')
    }
  }

  const handleRemove = () => {
    if (window.confirm('Remove shared folder? Uploads will go to personal folders instead.')) {
      setSharedFolderId(null)
      setCurrentFolderId('')
      setFolderInput('')
      alert('Shared folder removed. Uploads will now go to personal folders.')
    }
  }

  const handleQualityChange = (quality) => {
    setRecordingQualityState(quality)
    setRecordingQuality(quality)
  }

  const handleThemeChange = (themeId) => {
    setCurrentThemeId(themeId)
    setCurrentTheme(themeId)
  }

  const handleClearLocalData = async () => {
    const confirmMessage = 'Are you sure you want to delete ALL local recordings?\n\n⚠️ This will permanently delete all recordings stored on this device.\n\n💡 Tip: Upload to Google Drive first if you want to keep them!'
    
    if (window.confirm(confirmMessage)) {
      try {
        await clearAllRecordings()
        alert('✓ All local recordings have been deleted.')
        // Notify parent to update stats
        if (onDataCleared) {
          onDataCleared()
        }
        if (onClose) onClose()
      } catch (error) {
        console.error('Error clearing local data:', error)
        alert('❌ Failed to clear local data. Please try again.')
      }
    }
  }

  return (
    <div className="shared-folder-settings">
      <div className="settings-header">
        <h3>⚙️ Settings</h3>
        <button onClick={onClose} className="close-btn">✕</button>
      </div>

      <div className="settings-content">
        {/* Theme Setting */}
        <div className="settings-section">
          <h4>🎨 Theme</h4>
          <p className="section-description">
            Choose your visual theme (changes apply instantly)
          </p>
          
          <div className="theme-selector-container">
            <select 
              value={currentThemeId} 
              onChange={(e) => handleThemeChange(e.target.value)}
              className="theme-dropdown"
            >
              {Object.entries(THEMES).map(([key, theme]) => (
                <option key={key} value={key}>
                  {theme.name} - {theme.description}
                </option>
              ))}
            </select>
            <div className="theme-preview-inline">
              <span 
                className="color-dot-inline" 
                style={{ background: THEMES[currentThemeId].colors['--primary-color'] }}
              ></span>
              <span 
                className="color-dot-inline" 
                style={{ background: THEMES[currentThemeId].colors['--secondary-color'] }}
              ></span>
            </div>
          </div>
        </div>

        <div className="settings-divider"></div>

        {/* Recording Quality Setting */}
        <div className="settings-section">
          <h4>🎙️ Recording Quality</h4>
          <p className="section-description">
            Choose the audio quality for all recordings (applies to new recordings)
          </p>
          
          <div className="quality-options">
            {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
              <label key={key} className="quality-option">
                <input
                  type="radio"
                  name="quality"
                  value={key}
                  checked={recordingQuality === key}
                  onChange={() => handleQualityChange(key)}
                />
                <div className="quality-info">
                  <div className="quality-name">{preset.name}</div>
                  <div className="quality-details">
                    {preset.sampleRate / 1000}kHz • {preset.audioBitsPerSecond / 1000}kbps
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="settings-divider"></div>

        {/* Shared Folder Setting */}
        <div className="settings-section">
          <h4>🗂️ Shared Folder</h4>
        {currentFolderId ? (
          <div className="current-folder">
            <div className="status-badge success">
              ✓ {isDefault ? 'Band folder (default)' : 'Custom shared folder'}
            </div>
            <p className="folder-id">Folder ID: <code>{currentFolderId}</code></p>
            <p className="info-text">
              {isDefault 
                ? 'Using the default band folder. All bandmates upload here automatically!' 
                : 'All team members will upload to this custom folder.'}
            </p>
            <div className="folder-actions">
              <a
                href={`https://drive.google.com/drive/folders/${currentFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="view-folder-btn"
              >
                📂 View Folder in Drive
              </a>
              {!isDefault && (
                <button onClick={handleRemove} className="remove-btn">
                  Reset to Default
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="setup-folder">
            <p className="intro-text">
              Set up a shared Google Drive folder so all bandmates upload to the same location.
            </p>

            <div className="input-group">
              <label>Folder URL or ID</label>
              <input
                type="text"
                placeholder="Paste Google Drive folder URL or ID"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                className="folder-input"
              />
              <button onClick={handleSave} className="save-btn" disabled={!folderInput.trim()}>
                Save Folder
              </button>
            </div>

            <button 
              onClick={() => setShowInstructions(!showInstructions)}
              className="toggle-instructions"
            >
              {showInstructions ? '▼' : '▶'} How to set up a shared folder
            </button>

            {showInstructions && (
              <div className="instructions">
                <h4>📋 Setup Instructions:</h4>
                <ol>
                  <li>
                    <strong>Create a folder in Google Drive</strong>
                    <br />
                    Go to <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer">drive.google.com</a> and create a new folder (e.g., "Band Recordings")
                  </li>
                  <li>
                    <strong>Share the folder with your band</strong>
                    <br />
                    Right-click the folder → Share → Add your bandmates' emails as "Editor"
                  </li>
                  <li>
                    <strong>Copy the folder URL or ID</strong>
                    <br />
                    Open the folder and copy the URL from your browser, or just the ID from the URL
                    <br />
                    <small>URL format: drive.google.com/drive/folders/<strong>FOLDER_ID</strong></small>
                  </li>
                  <li>
                    <strong>Paste it above and click "Save Folder"</strong>
                  </li>
                </ol>
                <div className="tip">
                  💡 <strong>Tip:</strong> All bandmates should configure the same folder ID in their settings!
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        <div className="settings-divider"></div>

        {/* Clear Local Data Section */}
        <div className="settings-section danger-section">
          <h4>🗑️ Clear Local Data</h4>
          <p className="section-description">
            Delete all local recordings from this device. This cannot be undone!
          </p>
          <div className="danger-zone">
            <p className="warning-text">
              ⚠️ <strong>Warning:</strong> This will permanently delete all recordings stored locally on this device. Make sure you've uploaded important recordings to Google Drive first.
            </p>
            <button 
              onClick={handleClearLocalData}
              className="danger-btn"
            >
              🗑️ Clear All Local Recordings
            </button>
          </div>
        </div>

        <div className="settings-divider"></div>

        {/* Sign Out Section */}
        <div className="settings-section">
          <h4>👤 Account</h4>
          {user && (
            <div className="account-info">
              <div className="account-details">
                {user.picture && (
                  <img src={user.picture} alt={user.name} className="account-avatar" />
                )}
                <div className="account-text">
                  <p className="account-name">{user.name}</p>
                  <p className="account-email">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to sign out?')) {
                    logout()
                  }
                }}
                className="signout-btn"
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SharedFolderSettings

