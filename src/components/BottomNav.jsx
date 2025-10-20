import './BottomNav.css'

function BottomNav({ activeTab, onTabChange }) {
  const regularTabs = [
    { 
      id: 'explore', 
      icon: '♪', 
      label: 'Explore',
      description: 'Browse recordings'
    },
    { 
      id: 'planner', 
      icon: '◐', 
      label: 'Planner',
      description: 'Band calendar'
    }
  ]

  const recordTab = {
    id: 'record', 
    icon: '●', 
    label: 'Record',
    description: 'Start recording'
  }

  return (
    <nav className="bottom-nav-fab">
      {/* Left: Explore */}
      <button
        onClick={() => onTabChange('explore')}
        className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`}
        title="Browse recordings"
        aria-label="Browse recordings"
      >
        <span className="nav-icon">♪</span>
        <span className="nav-label">Explore</span>
      </button>

      {/* Central FAB */}
      <button
        onClick={() => onTabChange(recordTab.id)}
        className={`fab-record ${activeTab === recordTab.id ? 'active' : ''}`}
        title={recordTab.description}
        aria-label={recordTab.description}
      >
        <span className="fab-icon">{recordTab.icon}</span>
      </button>

      {/* Right: Planner */}
      <button
        onClick={() => onTabChange('planner')}
        className={`nav-item ${activeTab === 'planner' ? 'active' : ''}`}
        title="Band calendar"
        aria-label="Band calendar"
      >
        <span className="nav-icon">◐</span>
        <span className="nav-label">Planner</span>
      </button>
    </nav>
  )
}

export default BottomNav

