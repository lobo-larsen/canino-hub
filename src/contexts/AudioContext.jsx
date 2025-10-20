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
  const [allAudioInstances, setAllAudioInstances] = useState(new Map())

  const setGlobalNowPlaying = (name, controls) => {
    console.log('🎵 Setting global now playing:', name)
    
    // Stop ALL other audio instances
    allAudioInstances.forEach((instance, instanceName) => {
      if (instanceName !== name && instance.controls) {
        console.log('🛑 Stopping audio:', instanceName)
        try {
          if (instance.controls.isPlaying && instance.controls.isPlaying()) {
            instance.controls.pause()
          }
        } catch (error) {
          console.warn('Error stopping audio:', instanceName, error)
        }
      }
    })
    
    // Set new audio as current
    setNowPlaying({ name, controls })
    setCurrentAudioInstance({ name, controls })
    
    // Update the instances map
    setAllAudioInstances(prev => {
      const newMap = new Map(prev)
      newMap.set(name, { name, controls })
      return newMap
    })
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

  const registerAudioInstance = (name, controls) => {
    setAllAudioInstances(prev => {
      const newMap = new Map(prev)
      newMap.set(name, { name, controls })
      return newMap
    })
  }

  const unregisterAudioInstance = (name) => {
    setAllAudioInstances(prev => {
      const newMap = new Map(prev)
      newMap.delete(name)
      return newMap
    })
  }

  return (
    <AudioContext.Provider value={{
      nowPlaying,
      isGlobalPlaying,
      setGlobalNowPlaying,
      setGlobalPlayState,
      stopGlobalPlayback,
      toggleGlobalPlayback,
      registerAudioInstance,
      unregisterAudioInstance
    }}>
      {children}
    </AudioContext.Provider>
  )
}
