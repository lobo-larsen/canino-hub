import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import DriveAuthButton from './DriveAuthButton'
import './DriveSetupBanner.css'

function DriveSetupBanner() {
  const { accessToken } = useAuth()
  const [isDismissed, setIsDismissed] = useState(
    localStorage.getItem('driveSetupDismissed') === 'true'
  )

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('driveSetupDismissed', 'true')
  }

  const handleSuccess = (token) => {
    handleDismiss()
  }

  // Don't show if already connected or dismissed
  if (accessToken || isDismissed) {
    return null
  }

  return (
    <div className="drive-setup-banner">
      <div className="banner-content">
        <div className="banner-icon-large">☁️</div>
        <div className="banner-text">
          <h3>Connect Google Drive</h3>
          <p>To upload recordings to the shared band folder, connect your Google Drive</p>
        </div>
      </div>
      <div className="banner-actions">
        <DriveAuthButton onSuccess={handleSuccess}>
          🔗 Connect Google Drive
        </DriveAuthButton>
        <button onClick={handleDismiss} className="dismiss-btn">
          Later
        </button>
      </div>
    </div>
  )
}

export default DriveSetupBanner

