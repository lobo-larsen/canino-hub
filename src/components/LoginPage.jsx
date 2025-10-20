import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import './LoginPage.css'

function LoginPage() {
  const { login } = useAuth()

  const handleSuccess = (credentialResponse) => {
    try {
      // Decode the JWT token to get user information
      const token = credentialResponse.credential
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      
      const userData = JSON.parse(jsonPayload)
      
      // Get access token if available
      const accessToken = credentialResponse.access_token || null
      
      // Store user information
      login({
        name: userData.name,
        email: userData.email,
        picture: userData.picture,
        sub: userData.sub,
        token: token
      }, accessToken)
    } catch (error) {
      console.error('Login error:', error)
      alert('Failed to login. Please try again.')
    }
  }

  const handleError = () => {
    console.error('Login Failed')
    alert('Failed to login with Google. Please try again.')
  }

  return (
    <div className="login-page">
      <div className="login-container fade-in">
        <div className="login-header">
          <div className="login-logo">🎸</div>
          <h1 className="login-title">Canino Hub</h1>
          <p className="login-subtitle">Your band's recording hub</p>
        </div>

        <div className="login-content">
          <div className="features">
            <div className="feature">
              <div className="feature-icon">📱</div>
              <div className="feature-text">
                <h3>Mobile First</h3>
                <p>Optimized for your phone</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">☁️</div>
              <div className="feature-text">
                <h3>Cloud Storage</h3>
                <p>Sync with Google</p>
              </div>
            </div>
            <div className="feature">
              <div className="feature-icon">🔒</div>
              <div className="feature-text">
                <h3>Secure</h3>
                <p>Your data is protected</p>
              </div>
            </div>
          </div>

          <div className="login-actions">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              theme="outline"
              size="large"
              text="continue_with"
              shape="rectangular"
              logo_alignment="left"
            />
            <p className="login-disclaimer">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

