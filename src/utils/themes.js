// Theme management system

export const THEMES = {
  neon: {
    id: 'neon',
    name: 'Neon Theme',
    description: 'Electric Cyberpunk - Cyan & Magenta',
    colors: {
      '--background': '#121212',
      '--surface': '#1E1E1E',
      '--border-color': '#4A90E2',
      '--primary-color': '#00F0FF',
      '--primary-dark': '#00B8CC',
      '--secondary-color': '#FF00B3',
      '--accent-magenta': '#FF00B3',
      '--text-primary': '#E5E5E5',
      '--text-secondary': '#8A8A8A',
      '--label-gradient-start': '#00F0FF',
      '--label-gradient-end': '#00B8CC',
      '--label-text': '#000000',
      '--waveform-unplayed': '#4A90E2',
      '--waveform-played': '#FF00B3',
    }
  },
  classic: {
    id: 'classic',
    name: 'Classic Dark',
    description: 'Deep Black & Gold accents',
    colors: {
      '--background': '#0A0A0A',
      '--surface': '#1A1A1A',
      '--border-color': '#333333',
      '--primary-color': '#FFD700',
      '--primary-dark': '#FFA500',
      '--secondary-color': '#FF6B00',
      '--accent-magenta': '#FF4500',
      '--text-primary': '#FFFFFF',
      '--text-secondary': '#999999',
      '--label-gradient-start': '#FFD700',
      '--label-gradient-end': '#FFA500',
      '--label-text': '#000000',
      '--waveform-unplayed': '#666666',
      '--waveform-played': '#FFD700',
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Deep Sea - Blues & Aqua',
    colors: {
      '--background': '#0C1821',
      '--surface': '#1B2838',
      '--border-color': '#2E5266',
      '--primary-color': '#6FFFE9',
      '--primary-dark': '#3DCCC7',
      '--secondary-color': '#5BC0EB',
      '--accent-magenta': '#9D4EDD',
      '--text-primary': '#E8F1F2',
      '--text-secondary': '#8B9EA7',
      '--label-gradient-start': '#6FFFE9',
      '--label-gradient-end': '#3DCCC7',
      '--label-text': '#0C1821',
      '--waveform-unplayed': '#2E5266',
      '--waveform-played': '#6FFFE9',
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Glow',
    description: 'Warm Orange & Purple',
    colors: {
      '--background': '#1A0E1A',
      '--surface': '#2A1A2A',
      '--border-color': '#4A3A4A',
      '--primary-color': '#FF6B35',
      '--primary-dark': '#F7931E',
      '--secondary-color': '#C44569',
      '--accent-magenta': '#9D4EDD',
      '--text-primary': '#FFF1E6',
      '--text-secondary': '#B8A39A',
      '--label-gradient-start': '#FF6B35',
      '--label-gradient-end': '#F7931E',
      '--label-text': '#1A0E1A',
      '--waveform-unplayed': '#4A3A4A',
      '--waveform-played': '#FF6B35',
    }
  }
}

const THEME_STORAGE_KEY = 'canino-hub-theme'

export const getCurrentTheme = () => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  return savedTheme || 'neon'
}

export const setCurrentTheme = (themeId) => {
  if (!THEMES[themeId]) {
    console.error(`Theme "${themeId}" not found`)
    return
  }
  
  localStorage.setItem(THEME_STORAGE_KEY, themeId)
  applyTheme(themeId)
}

export const applyTheme = (themeId) => {
  const theme = THEMES[themeId]
  if (!theme) return
  
  const root = document.documentElement
  Object.entries(theme.colors).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })
}

// Initialize theme on load
export const initializeTheme = () => {
  const currentTheme = getCurrentTheme()
  applyTheme(currentTheme)
}

