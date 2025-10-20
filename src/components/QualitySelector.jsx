import { QUALITY_PRESETS, formatBitrate, formatSampleRate } from '../utils/audioQuality'
import './QualitySelector.css'

function QualitySelector({ selectedQuality, onQualityChange, disabled = false }) {
  return (
    <div className="quality-selector">
      <label className="quality-label">Recording Quality</label>
      <div className="quality-grid">
        {Object.values(QUALITY_PRESETS).map((preset) => (
          <button
            key={preset.id}
            className={`quality-option ${selectedQuality === preset.id ? 'selected' : ''}`}
            onClick={() => onQualityChange(preset.id)}
            disabled={disabled}
            style={{
              borderColor: selectedQuality === preset.id ? preset.color : 'transparent'
            }}
          >
            <div className="quality-icon" style={{ background: preset.color }}>
              {preset.icon}
            </div>
            <div className="quality-info">
              <div className="quality-name">{preset.name}</div>
              <div className="quality-description">{preset.description}</div>
              <div className="quality-specs">
                {formatBitrate(preset.audioBitsPerSecond)} • {formatSampleRate(preset.sampleRate)}
              </div>
            </div>
            {selectedQuality === preset.id && (
              <div className="quality-check">✓</div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default QualitySelector


