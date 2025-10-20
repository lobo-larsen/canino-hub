import { useState, useRef, useCallback } from 'react'
import { getQualityPreset, DEFAULT_QUALITY } from '../utils/audioQuality'

export const useAudioRecorder = (qualityId = DEFAULT_QUALITY) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioURL, setAudioURL] = useState(null)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const quality = getQualityPreset(qualityId)
      
      // Request audio with specific constraints for maximum quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: quality.sampleRate,
          channelCount: quality.channelCount,
          echoCancellation: false, // Disable for maximum quality
          noiseSuppression: false, // Disable for maximum quality
          autoGainControl: false,   // Disable for maximum quality
          latency: 0.01,           // Minimum latency
          volume: 1.0               // Maximum volume
        }
      })
      
      // Determine best mime type for maximum quality
      let mimeType = 'audio/webm;codecs=opus' // Best quality codec
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm;codecs=vp8' // Alternative high quality
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/webm' // Fallback
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/mp4;codecs=mp4a.40.2' // AAC codec
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'audio/mp4' // Final fallback
            }
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: quality.audioBitsPerSecond
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        })
        const url = URL.createObjectURL(audioBlob)
        setAudioURL(url)
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)
      startTimeRef.current = Date.now()
      pausedTimeRef.current = 0

      // Start timer
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current
        setRecordingTime(Math.floor(elapsed / 1000))
      }, 1000)

    } catch (err) {
      console.error('Error accessing microphone:', err)
      setError('Could not access microphone. Please grant permission and try again.')
    }
  }, [qualityId])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      clearInterval(timerRef.current)
      pausedTimeRef.current = Date.now() - startTimeRef.current - pausedTimeRef.current
    }
  }, [])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      startTimeRef.current = Date.now() - pausedTimeRef.current
      
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        setRecordingTime(Math.floor(elapsed / 1000))
      }, 1000)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      clearInterval(timerRef.current)
    }
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      setIsPaused(false)
      setRecordingTime(0)
      setAudioURL(null)
      clearInterval(timerRef.current)
      audioChunksRef.current = []
    }
  }, [])

  const resetRecording = useCallback(() => {
    setRecordingTime(0)
    setAudioURL(null)
    setError(null)
    audioChunksRef.current = []
  }, [])

  const getAudioBlob = useCallback(() => {
    if (audioChunksRef.current.length > 0 && mediaRecorderRef.current) {
      return new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current.mimeType 
      })
    }
    return null
  }, [])

  return {
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
  }
}

export const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

