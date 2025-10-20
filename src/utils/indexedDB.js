const DB_NAME = 'PracticeRecorderDB'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        objectStore.createIndex('name', 'name', { unique: false })
      }
    }
  })
}

export const saveRecording = async (recordingData) => {
  const db = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add(recordingData)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const getAllRecordings = async () => {
  const db = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      // Sort by timestamp, newest first
      const recordings = request.result.sort((a, b) => b.timestamp - a.timestamp)
      resolve(recordings)
    }
    request.onerror = () => reject(request.error)
  })
}

export const getRecording = async (id) => {
  const db = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(id)

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const deleteRecording = async (id) => {
  const db = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export const updateRecording = async (id, updatedData) => {
  const db = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const getRequest = store.get(id)

    getRequest.onsuccess = () => {
      const recording = getRequest.result
      if (recording) {
        const updated = { ...recording, ...updatedData, id }
        const putRequest = store.put(updated)
        putRequest.onsuccess = () => resolve(updated)
        putRequest.onerror = () => reject(putRequest.error)
      } else {
        reject(new Error('Recording not found'))
      }
    }
    getRequest.onerror = () => reject(getRequest.error)
  })
}

export const markAsUploadedToDrive = async (id, driveData) => {
  return updateRecording(id, {
    driveFileId: driveData.fileId,
    driveWebViewLink: driveData.webViewLink,
    driveUploadedAt: Date.now()
  })
}

export const getTotalStats = async () => {
  const recordings = await getAllRecordings()
  
  const totalCount = recordings.length
  const totalDuration = recordings.reduce((sum, rec) => sum + (rec.duration || 0), 0)
  const totalSize = recordings.reduce((sum, rec) => sum + (rec.size || 0), 0)

  return {
    count: totalCount,
    duration: totalDuration, // in seconds
    size: totalSize // in bytes
  }
}

/**
 * Clear all local recordings from IndexedDB
 */
export const clearAllRecordings = async () => {
  const db = await initDB()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

