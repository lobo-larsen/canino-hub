import './BottomNav.css'

function BottomNav({ activeTab, onTabChange }) {
  const tabs = [
    { 
      id: 'explore', 
      icon: '🎵', 
      label: 'Explore',
      description: 'Browse recordings'
    },
    { 
      id: 'record', 
      icon: '🎙️', 
      label: 'Record',
      description: 'Start recording'
    },
    { 
      id: 'planner', 
      icon: '📅', 
      label: 'Planner',
      description: 'Band calendar'
    }
  ]

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
          title={tab.description}
          aria-label={tab.description}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav

