import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { useAudio } from '../contexts/AudioContext'
import './WaveformPlayer.css'

function WaveformPlayer({ audioUrl, fileName, onReady, onPlayStateChange, onTime }) {
  const { setGlobalNowPlaying, setGlobalPlayState, nowPlaying } = useAudio()
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  let isSmallScreen = false
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      isSmallScreen = window.matchMedia('(max-width: 640px)').matches
    }
  } catch (e) {
    isSmallScreen = false
  }

  useEffect(() => {
    if (!audioUrl || !waveformRef.current) return

    // Create WaveSurfer instance with heat trail effect
    const height = isSmallScreen ? 28 : 40
    const barWidth = isSmallScreen ? 1.5 : 2
    const barGap = isSmallScreen ? 0.5 : 1
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4A90E2', // Steel Blue for unplayed
      progressColor: '#FF00B3', // Magenta Shock - will be animated
      cursorColor: '#00F0FF', // Electric Cyan cursor
      cursorWidth: 2,
      barWidth,
      barGap,
      barRadius: 2,
      height,
      normalize: true,
      backend: 'WebAudio',
      responsive: true,
    })

    wavesurferRef.current = wavesurfer

    // Load audio
    setIsLoading(true)
    wavesurfer.load(audioUrl)

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsLoading(false)
      setDuration(wavesurfer.getDuration())
      if (typeof onReady === 'function') {
        onReady({
          fileName,
          play: () => wavesurfer.play(),
          pause: () => wavesurfer.pause(),
          playPause: () => wavesurfer.playPause(),
          isPlaying: () => wavesurfer.isPlaying(),
          getTimes: () => ({ current: wavesurfer.getCurrentTime(), total: wavesurfer.getDuration() }),
          seekTo: (fraction) => {
            if (typeof fraction === 'number') wavesurfer.seekTo(Math.min(1, Math.max(0, fraction)))
          }
        })
      }
    })

    wavesurfer.on('play', () => {
      setIsPlaying(true)
      // Notify global audio context that this player is now playing
      setGlobalNowPlaying(fileName, {
        play: () => wavesurfer.play(),
        pause: () => wavesurfer.pause(),
        playPause: () => wavesurfer.playPause(),
        isPlaying: () => wavesurfer.isPlaying(),
        getTimes: () => ({ current: wavesurfer.getCurrentTime(), total: wavesurfer.getDuration() }),
        seekTo: (fraction) => {
          if (typeof fraction === 'number') wavesurfer.seekTo(Math.min(1, Math.max(0, fraction)))
        }
      })
      setGlobalPlayState(true)
      if (typeof onPlayStateChange === 'function') onPlayStateChange(true)
    })
    wavesurfer.on('pause', () => {
      setIsPlaying(false)
      setGlobalPlayState(false)
      if (typeof onPlayStateChange === 'function') onPlayStateChange(false)
    })
    
    const handleTime = () => {
      const cur = wavesurfer.getCurrentTime()
      setCurrentTime(cur)
      if (typeof onTime === 'function') onTime(cur, wavesurfer.getDuration())
    }
    wavesurfer.on('audioprocess', handleTime)
    wavesurfer.on('seek', handleTime)

    wavesurfer.on('error', (error) => {
      console.error('WaveSurfer error:', error)
      setIsLoading(false)
    })

    // Cleanup
    return () => {
      if (wavesurfer) {
        wavesurfer.destroy()
      }
    }
  }, [audioUrl, isSmallScreen])

  // Stop this player if another audio starts playing
  useEffect(() => {
    if (nowPlaying && nowPlaying.name !== fileName && wavesurferRef.current && wavesurferRef.current.isPlaying()) {
      console.log('🛑 Stopping', fileName, 'because', nowPlaying.name, 'is now playing')
      wavesurferRef.current.pause()
    }
  }, [nowPlaying, fileName])

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="waveform-player">
      {isLoading && (
        <div className="waveform-loading">
          <div className="loading-spinner">⏳</div>
          <span>Loading waveform...</span>
        </div>
      )}
      
      <div 
        ref={waveformRef} 
        className={`waveform-container ${isLoading ? 'hidden' : ''}`}
      />
      
      {!isLoading && (
        <div className="waveform-controls">
          <button 
            onClick={handlePlayPause}
            className="play-pause-btn"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          
          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span className="total-time">{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default WaveformPlayer

