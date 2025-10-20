import { useState, useEffect } from 'react'
import { useAudioRecorder, formatTime } from '../hooks/useAudioRecorder'
import { saveRecording } from '../utils/indexedDB'
import { getQualityPreset } from '../utils/audioQuality'
import { addSongName } from '../utils/songNames'
import { getNextTakeNumberFromDrive, getSongNamesFromDrive, uploadRecordingToDrive } from '../utils/googleDrive'
import { getRecordingQuality } from '../utils/qualitySettings'
import { useAuth } from '../contexts/AuthContext'
import './RecordingControls.css'

function RecordingControls({ onRecordingSaved }) {
  const { accessToken } = useAuth()
  const [selectedQuality] = useState(getRecordingQuality())
  const [songNames, setSongNames] = useState([])
  const [selectedSong, setSelectedSong] = useState('')
  const [customSongInput, setCustomSongInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [isGeneratingName, setIsGeneratingName] = useState(false)
  const [generatedName, setGeneratedName] = useState('')
  const [showSongSelector, setShowSongSelector] = useState(true)
  const [recordingType, setRecordingType] = useState('full-band') // 'full-band' or 'solo'
  const [isLoadingSongs, setIsLoadingSongs] = useState(false)
  
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioURL,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    resetRecording,
    getAudioBlob
  } = useAudioRecorder(selectedQuality)

  const [isSaving, setIsSaving] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  useEffect(() => {
    // Load song names from Google Drive
    const loadSongNames = async () => {
      if (!accessToken) {
        console.log('No access token, cannot load song names from Drive')
        return
      }
      
      setIsLoadingSongs(true)
      try {
        const names = await getSongNamesFromDrive(accessToken)
        setSongNames(names)
        console.log('✓ Loaded song names from Drive:', names.length, 'songs')
      } catch (error) {
        console.error('Error loading song names from Drive:', error)
      } finally {
        setIsLoadingSongs(false)
      }
    }
    
    loadSongNames()
  }, [accessToken])

  const handleStartRecording = async () => {
    // Validate song name is selected before recording
    const songName = selectedSong || customSongInput.trim()
    if (!songName) {
      alert('Please select or enter a song name before recording')
      return
    }

    // Hide song selector and start recording
    setShowSongSelector(false)
    await startRecording()
  }

  const handleStopRecording = () => {
    stopRecording()
    setShowSaveDialog(true)
  }

  const generateFullName = async (songName, recType = recordingType) => {
    setIsGeneratingName(true)
    try {
      const takeNumber = await getNextTakeNumberFromDrive(accessToken, songName)
      const date = new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
      // Only add "Solo" label when it's solo practice (Full Band is default, no label needed)
      const typeLabel = recType === 'solo' ? 'Solo' : ''
      const fullName = typeLabel 
        ? `${songName} - Take ${takeNumber} - ${typeLabel} - ${date}`
        : `${songName} - Take ${takeNumber} - ${date}`
      setGeneratedName(fullName)
      return fullName
    } catch (error) {
      console.error('Error generating name:', error)
      const date = new Date().toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
      const typeLabel = recType === 'solo' ? 'Solo' : ''
      const fallbackName = typeLabel
        ? `${songName} - ${typeLabel} - ${date}`
        : `${songName} - ${date}`
      setGeneratedName(fallbackName)
      return fallbackName
    } finally {
      setIsGeneratingName(false)
    }
  }

  const handleSongSelect = async (songName) => {
    setSelectedSong(songName)
    setCustomSongInput('')
    setShowCustomInput(false)
    await generateFullName(songName)
  }

  const handleCustomInputChange = (value) => {
    setCustomSongInput(value)
    setSelectedSong('')
    setGeneratedName('')
    
    // Update suggestions based on Drive song names
    if (value.trim()) {
      const lower = value.toLowerCase()
      const filtered = songNames.filter(song => 
        song.toLowerCase().includes(lower)
      )
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
  }

  const handleCustomSongConfirm = async () => {
    const songName = customSongInput.trim()
    if (songName) {
      setSelectedSong(songName)
      await generateFullName(songName)
    }
  }

  const handleSaveRecording = async () => {
    const songName = selectedSong || customSongInput.trim()
    
    if (!songName) {
      alert('Please select or enter a song name')
      return
    }

    setIsSaving(true)
    try {
      const audioBlob = getAudioBlob()
      if (audioBlob) {
        const quality = getQualityPreset(selectedQuality)
        
        // Generate or use existing full name
        const finalName = generatedName || await generateFullName(songName)
        
        // Save song name for future use
        addSongName(songName)
        
        const recordingData = {
          name: finalName,
          blob: audioBlob,
          duration: recordingTime,
          size: audioBlob.size,
          mimeType: audioBlob.type || 'audio/webm',
          timestamp: Date.now(),
          songName: songName,
          recordingType: recordingType,
          quality: {
            preset: selectedQuality,
            bitrate: quality.audioBitsPerSecond,
            sampleRate: quality.sampleRate,
            channels: quality.channelCount
          }
        }

        let uploaded = false
        if (accessToken) {
          try {
            await uploadRecordingToDrive(accessToken, {
              name: recordingData.name,
              blob: recordingData.blob,
              mimeType: recordingData.mimeType,
              timestamp: recordingData.timestamp,
              duration: recordingData.duration,
              quality: { preset: selectedQuality, type: recordingType }
            })
            uploaded = true
          } catch (e) {
            console.error('Drive upload failed, will save locally:', e)
          }
        }

        if (!uploaded) {
          await saveRecording(recordingData)
        }

        setShowSaveDialog(false)
        resetRecording()
        setSelectedSong('')
        setCustomSongInput('')
        setShowCustomInput(false)
        setGeneratedName('')

        if (onRecordingSaved) {
          onRecordingSaved()
        }
      }
    } catch (err) {
      console.error('Error saving recording:', err)
      alert('Failed to save recording. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelSave = () => {
    setShowSaveDialog(false)
    resetRecording()
    setSelectedSong('')
    setCustomSongInput('')
    setGeneratedName('')
    setShowSongSelector(true)
    setShowCustomInput(false)
    setRecordingType('full-band')
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this recording?')) {
      cancelRecording()
    }
  }

  return (
    <div className="recording-controls">
      {error && (
        <div className="error-message">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

          {/* Song Selection - Show before recording */}
          {showSongSelector && !isRecording && !showSaveDialog && (
            <div className="song-selection-view">
              <h3>What song?</h3>

              <div className="song-selector">
            {isLoadingSongs && (
              <div className="loading-songs">
                <span>⏳</span> Loading songs from Drive...
              </div>
            )}
            
            {!isLoadingSongs && songNames.length > 0 && (
              <>
                <label className="selector-label">Songs from Drive:</label>
                <div className="song-buttons">
                  {songNames.slice(0, 6).map((song) => (
                    <button
                      key={song}
                      onClick={() => handleSongSelect(song)}
                      className={`song-btn ${selectedSong === song ? 'selected' : ''}`}
                      disabled={isGeneratingName}
                    >
                      🎵 {song}
                    </button>
                  ))}
                </div>
              </>
            )}
            
            {!isLoadingSongs && songNames.length === 0 && !showCustomInput && (
              <p className="no-songs-hint">
                💡 No songs in Drive yet. Add a new song below!
              </p>
            )}

            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="custom-song-btn"
            >
              {showCustomInput ? '− Hide' : '+ New Song Name'}
            </button>

            {showCustomInput && (
              <div className="custom-input-wrapper">
                <input
                  type="text"
                  className="custom-song-input"
                  placeholder="Type song name..."
                  value={customSongInput}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customSongInput.trim()) {
                      handleCustomSongConfirm()
                    }
                  }}
                  autoFocus
                />
                {suggestions.length > 0 && customSongInput && (
                  <div className="suggestions">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setCustomSongInput(suggestion)
                          handleSongSelect(suggestion)
                        }}
                        className="suggestion-btn"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                {customSongInput.trim() && !selectedSong && (
                  <button
                    onClick={handleCustomSongConfirm}
                    className="confirm-song-btn"
                    disabled={isGeneratingName}
                  >
                    ✓ Confirm
                  </button>
                )}
              </div>
            )}
          </div>

              {/* Compact Recording Type Selector */}
              {(selectedSong || customSongInput.trim()) && (
                <div className="type-selector-compact">
                  <button
                    onClick={() => {
                      setRecordingType('full-band')
                      if (selectedSong || customSongInput.trim()) {
                        generateFullName(selectedSong || customSongInput.trim(), 'full-band')
                      }
                    }}
                    className={`type-btn-compact ${recordingType === 'full-band' ? 'active' : ''}`}
                  >
                    👥 Full Band
                  </button>
                  <button
                    onClick={() => {
                      setRecordingType('solo')
                      if (selectedSong || customSongInput.trim()) {
                        generateFullName(selectedSong || customSongInput.trim(), 'solo')
                      }
                    }}
                    className={`type-btn-compact ${recordingType === 'solo' ? 'active' : ''}`}
                  >
                    👤 Solo
                  </button>
                </div>
              )}

              {isGeneratingName && (
                <div className="generating-name">
                  <div className="spinner">⏳</div>
                  <p>Checking Google Drive for existing takes...</p>
                </div>
              )}
              
              {generatedName && (
                <div className="name-preview-box">
                  <label>Recording will be saved as:</label>
                  <div className="preview-name">{generatedName}</div>
                </div>
              )}

          {(selectedSong || customSongInput.trim()) && (
            <button
              onClick={handleStartRecording}
              className="start-recording-btn"
              disabled={isGeneratingName}
            >
              <span className="btn-icon">🎙️</span>
              <span>Start Recording</span>
            </button>
          )}
        </div>
      )}

      {showSaveDialog ? (
        <div className="save-dialog">
          <h3>Save Recording</h3>
          <p className="recording-duration">Duration: {formatTime(recordingTime)}</p>
          
          {audioURL && (
            <div className="audio-preview">
              <audio src={audioURL} controls />
            </div>
          )}

          <div className="song-selector">
            <label className="selector-label">Select Song Name:</label>
            
            {songNames.length > 0 && (
              <div className="song-buttons">
                {songNames.slice(0, 6).map((song) => (
                  <button
                    key={song}
                    onClick={() => handleSongSelect(song)}
                    className={`song-btn ${selectedSong === song ? 'selected' : ''}`}
                    disabled={isGeneratingName}
                  >
                    🎵 {song}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="custom-song-btn"
            >
              {showCustomInput ? '− Hide Custom Input' : '+ New Song Name'}
            </button>

            {showCustomInput && (
              <div className="custom-input-wrapper">
                <input
                  type="text"
                  className="custom-song-input"
                  placeholder="Type song name..."
                  value={customSongInput}
                  onChange={(e) => handleCustomInputChange(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customSongInput.trim()) {
                      handleCustomSongConfirm()
                    }
                  }}
                  autoFocus
                />
                {suggestions.length > 0 && customSongInput && (
                  <div className="suggestions">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setCustomSongInput(suggestion)
                          handleSongSelect(suggestion)
                        }}
                        className="suggestion-btn"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
                {customSongInput.trim() && !selectedSong && (
                  <button
                    onClick={handleCustomSongConfirm}
                    className="confirm-song-btn"
                    disabled={isGeneratingName}
                  >
                    ✓ Confirm Song
                  </button>
                )}
              </div>
            )}
          </div>
          
          {isGeneratingName && (
            <div className="generating-name">
              <div className="spinner">⏳</div>
              <p>Checking Google Drive for existing takes...</p>
            </div>
          )}
          
          {generatedName && (
            <div className="final-name-preview">
              <label>📝 Generated Recording Name:</label>
              <div className="generated-name-display">
                {generatedName}
              </div>
              <p className="name-hint">
                Auto-generated based on Drive recordings + current date
              </p>
            </div>
          )}

          <div className="dialog-actions">
            <button
              onClick={handleCancelSave}
              className="btn-secondary"
              disabled={isSaving}
            >
              Discard
            </button>
            <button
              onClick={handleSaveRecording}
              className="btn-primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Recording'}
            </button>
          </div>
        </div>
      ) : !showSongSelector && (
        <div className="recording-interface">
          {isRecording && (
            <div className="recording-active">
              <div className="recording-indicator">
                <span className="pulse-dot"></span>
                <span className="recording-label">Recording</span>
              </div>

              <div className="timer-display">
                {formatTime(recordingTime)}
              </div>

              <div className="recording-actions">
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="btn-control pause-btn"
                >
                  {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                <button
                  onClick={handleStopRecording}
                  className="btn-control stop-btn"
                >
                  ⏹️ Stop
                </button>
                <button
                  onClick={handleCancel}
                  className="btn-control cancel-btn"
                >
                  ❌ Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RecordingControls

