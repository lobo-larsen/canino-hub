import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import './DriveAuthButton.css'

function DriveAuthButton({ onSuccess, children }) {
  const { updateAccessToken } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

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
    flow: 'implicit'
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

