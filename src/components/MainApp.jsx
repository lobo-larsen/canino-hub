import { useAuth } from '../contexts/AuthContext'
import { AudioProvider } from '../contexts/AudioContext'
import LoginPage from './LoginPage'
import Dashboard from './Dashboard'

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <AudioProvider>
      <Dashboard />
    </AudioProvider>
  )
}

export default MainApp

