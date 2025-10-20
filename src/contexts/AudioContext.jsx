import { createContext, useContext, useState } from 'react'

const AudioContext = createContext()

export const useAudio = () => {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}

export const AudioProvider = ({ children }) => {
  const [nowPlaying, setNowPlaying] = useState(null)
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false)
  const [currentAudioInstance, setCurrentAudioInstance] = useState(null)

  const setGlobalNowPlaying = (name, controls) => {
    console.log('🎵 Setting global now playing:', name)
    
    // Stop any currently playing audio before starting new one
    if (currentAudioInstance && currentAudioInstance.controls && currentAudioInstance.name !== name) {
      console.log('🛑 Stopping previous audio:', currentAudioInstance.name)
      currentAudioInstance.controls.pause()
    }
    
    // Set new audio as current
    setNowPlaying({ name, controls })
    setCurrentAudioInstance({ name, controls })
  }

  const setGlobalPlayState = (playing) => {
    console.log('🎵 Global play state changed:', playing)
    setIsGlobalPlaying(playing)
  }

  const stopGlobalPlayback = () => {
    console.log('🛑 Stopping global playback')
    if (nowPlaying?.controls) {
      nowPlaying.controls.pause()
    }
    setNowPlaying(null)
    setIsGlobalPlaying(false)
    setCurrentAudioInstance(null)
  }

  const toggleGlobalPlayback = () => {
    if (nowPlaying?.controls) {
      console.log('🎮 Toggling global playback, current state:', isGlobalPlaying)
      nowPlaying.controls.playPause()
    }
  }

  return (
    <AudioContext.Provider value={{
      nowPlaying,
      isGlobalPlaying,
      setGlobalNowPlaying,
      setGlobalPlayState,
      stopGlobalPlayback,
      toggleGlobalPlayback
    }}>
      {children}
    </AudioContext.Provider>
  )
}
