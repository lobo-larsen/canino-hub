import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTotalStats } from '../utils/indexedDB'
import RecordingControls from './RecordingControls'
import RecordingsList from './RecordingsList'
import SharedFolderSettings from './SharedFolderSettings'
import DriveSetupBanner from './DriveSetupBanner'
import DriveBrowser from './DriveBrowser'
import BottomNav from './BottomNav'
import Planner from './Planner'
import './Dashboard.css'

function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ count: 0, duration: 0, size: 0 })
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState('explore') // 'explore', 'record', 'planner'
  const [showSettings, setShowSettings] = useState(false)
  const [showLocalModal, setShowLocalModal] = useState(false)
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)
  const isSwipingRef = useRef(false)

  const tabs = ['explore', 'record', 'planner']
  const goToNextTab = () => {
    const idx = tabs.indexOf(activeTab)
    const next = (idx + 1) % tabs.length
    setActiveTab(tabs[next])
  }
  const goToPrevTab = () => {
    const idx = tabs.indexOf(activeTab)
    const prev = (idx - 1 + tabs.length) % tabs.length
    setActiveTab(tabs[prev])
  }

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return
    const t = e.touches[0]
    touchStartXRef.current = t.clientX
    touchStartYRef.current = t.clientY
    isSwipingRef.current = true
  }

  const handleTouchMove = (e) => {
    // Prevent vertical scroll hijack: only prevent if clear horizontal swipe
    if (!isSwipingRef.current || !e.touches || e.touches.length === 0) return
    const dx = e.touches[0].clientX - touchStartXRef.current
    const dy = e.touches[0].clientY - touchStartYRef.current
    if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // hint browser we handle it
      e.preventDefault()
    }
  }

  const handleTouchEnd = (e) => {
    if (!isSwipingRef.current) return
    isSwipingRef.current = false
    const touch = e.changedTouches && e.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - touchStartXRef.current
    const dy = touch.clientY - touchStartYRef.current
    const horizontal = Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3
    if (!horizontal) return
    if (dx < 0) {
      // swipe left → next tab
      goToNextTab()
    } else {
      // swipe right → prev tab
      goToPrevTab()
    }
  }

  const loadStats = async () => {
    try {
      const totalStats = await getTotalStats()
      setStats(totalStats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  useEffect(() => {
    loadStats()
  }, [refreshTrigger])

  const handleSettingsClose = () => {
    setShowSettings(false)
  }

  const handleRecordingSaved = () => {
    setRefreshTrigger(prev => prev + 1)
    // After saving, go back to explore to see the recording
    setActiveTab('explore')
  }

  const handleLocalRecordingsUpdate = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="dashboard fade-in">
      {/* Top Header */}
      <div className="minimal-header">
        <div className="header-left">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="user-avatar" />
          ) : (
            <div className="user-avatar-placeholder">
              {user?.name?.charAt(0) || '?'}
            </div>
          )}
        </div>
        <h1 className="app-title-spaced">C A N I N O - H U B</h1>
        <button 
          onClick={() => setShowSettings(true)}
          className="settings-icon-btn"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Main Content Area - Changes based on active tab */}
      <div 
        className="content-view"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Explore Tab (Left) - Browse recordings */}
        {activeTab === 'explore' && (
          <div className="explore-view fade-in">
            <DriveSetupBanner />
            <DriveBrowser reloadKey={refreshTrigger} />
            
            {/* Show local recordings banner if any exist */}
            {stats.count > 0 && (
              <div className="local-recordings-notice">
                <div className="notice-content">
                  <span className="notice-icon">📱</span>
                  <div>
                    <strong>{stats.count} local recording{stats.count > 1 ? 's' : ''}</strong> ready to upload
                  </div>
                </div>
                <button 
                  onClick={() => setShowLocalModal(true)}
                  className="view-local-btn"
                >
                  View & Upload
                </button>
              </div>
            )}
          </div>
        )}

        {/* Record Tab (Center) - Recording interface */}
        {activeTab === 'record' && (
          <div className="record-view fade-in">
            <RecordingControls onRecordingSaved={handleRecordingSaved} />
          </div>
        )}

        {/* Planner Tab (Right) - Future feature */}
        {activeTab === 'planner' && (
          <div className="planner-view fade-in">
            <Planner />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Modal for local recordings view */}
      {showLocalModal && (
        <div className="modal-overlay" onClick={() => setShowLocalModal(false)}>
          <div className="local-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📱 Local Recordings</h3>
              <button onClick={() => setShowLocalModal(false)} className="close-modal-btn">✕</button>
            </div>
            <div className="modal-content">
              <RecordingsList refreshTrigger={refreshTrigger} onUpdate={handleLocalRecordingsUpdate} />
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={handleSettingsClose}>
          <div onClick={(e) => e.stopPropagation()}>
            <SharedFolderSettings 
              onClose={handleSettingsClose} 
              onDataCleared={handleLocalRecordingsUpdate}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
