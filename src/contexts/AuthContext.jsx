import { createContext, useContext, useState, useEffect } from 'react'
import { googleLogout } from '@react-oauth/google'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('accessToken')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
        if (storedToken) {
          setAccessToken(storedToken)
        }
      } catch (error) {
        console.error('Error parsing stored user:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
      }
    }
    setIsLoading(false)
  }, [])

  const login = (userData, token = null) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    if (token) {
      setAccessToken(token)
      localStorage.setItem('accessToken', token)
    }
  }

  const updateAccessToken = (token) => {
    setAccessToken(token)
    localStorage.setItem('accessToken', token)
  }

  const logout = () => {
    googleLogout()
    setUser(null)
    setAccessToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('accessToken')
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    accessToken,
    updateAccessToken
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

