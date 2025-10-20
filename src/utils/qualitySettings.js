// Global quality settings for recordings

const QUALITY_SETTING_KEY = 'recordingQuality'

export const getRecordingQuality = () => {
  try {
    const stored = localStorage.getItem(QUALITY_SETTING_KEY)
    return stored || 'lossless'
  } catch (error) {
    console.error('Error reading quality setting:', error)
    return 'lossless'
  }
}

export const setRecordingQuality = (quality) => {
  try {
    localStorage.setItem(QUALITY_SETTING_KEY, quality)
  } catch (error) {
    console.error('Error saving quality setting:', error)
  }
}

