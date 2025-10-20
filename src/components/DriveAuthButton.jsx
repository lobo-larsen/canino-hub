import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import './DriveAuthButton.css'

function DriveAuthButton({ onSuccess, children }) {
  const { updateAccessToken } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  // Compute an explicit redirect URI that works locally and on GitHub Pages
  const redirectUri = `${window.location.origin}${(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}`

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      updateAccessToken(tokenResponse.access_token)
      if (onSuccess) {
        onSuccess(tokenResponse.access_token)
      }
      setIsLoading(false)
    },
    onError: (error) => {
      console.error('Drive authorization failed:', error)
      alert('Failed to authorize Google Drive access. Please try again.')
      setIsLoading(false)
    },
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/calendar',
    flow: 'implicit',
    redirect_uri: redirectUri
  })

  const handleClick = () => {
    setIsLoading(true)
    login()
  }

  return (
    <button 
      onClick={handleClick} 
      disabled={isLoading}
      className="drive-auth-button"
    >
      {isLoading ? 'Authorizing...' : children || '🔗 Connect Google Drive'}
    </button>
  )
}

export default DriveAuthButton

