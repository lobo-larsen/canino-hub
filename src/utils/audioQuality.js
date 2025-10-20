export const QUALITY_PRESETS = {
  voice: {
    id: 'voice',
    name: 'Voice',
    description: 'Optimized for speech',
    icon: '💬',
    audioBitsPerSecond: 64000,
    sampleRate: 24000,
    channelCount: 1,
    color: '#34a853'
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    description: 'Good for most uses',
    icon: '🎵',
    audioBitsPerSecond: 128000,
    sampleRate: 44100,
    channelCount: 2,
    color: '#4285f4'
  },
  high: {
    id: 'high',
    name: 'High Quality',
    description: 'Great for music practice',
    icon: '🎸',
    audioBitsPerSecond: 256000,
    sampleRate: 48000,
    channelCount: 2,
    color: '#ea4335'
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    description: 'Professional quality',
    icon: '🎙️',
    audioBitsPerSecond: 320000,
    sampleRate: 48000,
    channelCount: 2,
    color: '#fbbc04'
  },
  maximum: {
    id: 'maximum',
    name: 'Maximum',
    description: 'Highest possible quality',
    icon: '⭐',
    audioBitsPerSecond: 512000,
    sampleRate: 96000,
    channelCount: 2,
    color: '#00F0FF'
  },
  lossless: {
    id: 'lossless',
    name: 'Lossless',
    description: 'Professional studio quality',
    icon: '🎼',
    audioBitsPerSecond: 1411200,
    sampleRate: 44100,
    channelCount: 2,
    color: '#FF00B3'
  }
}

export const DEFAULT_QUALITY = 'lossless'

export const getQualityPreset = (qualityId) => {
  return QUALITY_PRESETS[qualityId] || QUALITY_PRESETS[DEFAULT_QUALITY]
}

export const formatBitrate = (bitsPerSecond) => {
  return `${bitsPerSecond / 1000}kbps`
}

export const formatSampleRate = (sampleRate) => {
  return `${sampleRate / 1000}kHz`
}

export const getEstimatedFileSize = (durationSeconds, bitsPerSecond) => {
  // Calculate estimated file size in bytes
  const bytes = (durationSeconds * bitsPerSecond) / 8
  
  if (bytes < 1024 * 1024) {
    return `~${(bytes / 1024).toFixed(0)} KB`
  }
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

