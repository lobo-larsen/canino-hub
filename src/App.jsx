import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter as Router } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import MainApp from './components/MainApp'
import './App.css'

// You'll need to replace this with your actual Google OAuth Client ID
// Get it from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1062263350857-j9pgo1mh4n1f60qbso50igfac64u88m6.apps.googleusercontent.com'

function App() {
  if (typeof window !== 'undefined') {
    // Log once to verify the client ID present in the deployed bundle
    // Safe to log the presence; this is not a secret
    console.info('[OAuth] Using Google Client ID:', GOOGLE_CLIENT_ID)
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  )
}

export default App


