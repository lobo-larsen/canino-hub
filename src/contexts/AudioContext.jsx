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

  const setGlobalNowPlaying = (name, controls) => {
    setNowPlaying({ name, controls })
  }

  const setGlobalPlayState = (playing) => {
    setIsGlobalPlaying(playing)
  }

  const stopGlobalPlayback = () => {
    if (nowPlaying?.controls) {
      nowPlaying.controls.pause()
    }
    setNowPlaying(null)
    setIsGlobalPlaying(false)
  }

  const toggleGlobalPlayback = () => {
    if (nowPlaying?.controls) {
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
