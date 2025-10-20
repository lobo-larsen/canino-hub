// Shared Google Drive Folder Configuration

const STORAGE_KEY = 'sharedDriveFolderId'

// Default shared folder for the band
const DEFAULT_SHARED_FOLDER_ID = '1wMcoVYj5RnnDpsZAgy56cPFRwhrckJdV'

/**
 * Get the configured shared folder ID
 * Falls back to default band folder if not configured
 */
export const getSharedFolderId = () => {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_SHARED_FOLDER_ID
}

/**
 * Set the shared folder ID
 */
export const setSharedFolderId = (folderId) => {
  if (folderId) {
    localStorage.setItem(STORAGE_KEY, folderId)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * Extract folder ID from Google Drive URL
 * Supports formats:
 * - https://drive.google.com/drive/folders/FOLDER_ID
 * - https://drive.google.com/drive/u/0/folders/FOLDER_ID
 */
export const extractFolderIdFromUrl = (url) => {
  if (!url) return null
  
  // If it's already just an ID (no URL), return it
  if (url.length < 50 && !url.includes('/') && !url.includes('http')) {
    return url
  }
  
  // Extract from URL
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

/**
 * Check if a shared folder is configured (including default)
 */
export const hasSharedFolder = () => {
  return !!getSharedFolderId()
}

/**
 * Check if using the default band folder
 */
export const isUsingDefaultFolder = () => {
  const customFolder = localStorage.getItem(STORAGE_KEY)
  return !customFolder // Using default if no custom folder set
}

/**
 * Get the default folder ID
 */
export const getDefaultFolderId = () => {
  return DEFAULT_SHARED_FOLDER_ID
}

