import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getCalendarEvents, formatEventTime, verifyTokenInfo, listAccessibleCalendars } from '../utils/googleCalendar'
import { getBandCalendarId } from '../utils/bandCalendarConfig'
import DriveAuthButton from './DriveAuthButton'
import CalendarView from './CalendarView'
import './Planner.css'

function Planner() {
  const { accessToken } = useAuth()
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('calendar') // 'calendar' or 'list'
  const [eventFilter, setEventFilter] = useState('all') // 'all', 'rehearsals', 'gigs'
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDateEvents, setSelectedDateEvents] = useState([])

  useEffect(() => {
    if (accessToken) {
      loadEvents()
    }
  }, [accessToken, currentDate])

  const loadEvents = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      // Get events for the next 30 days from the band's calendar
      const timeMin = new Date()
      const timeMax = new Date()
      timeMax.setDate(timeMax.getDate() + 30)

      const bandCalendarId = getBandCalendarId()
      console.log('📅 Loading calendar events...')
      console.log('   Calendar ID:', bandCalendarId)
      console.log('   Date range:', timeMin.toLocaleDateString(), 'to', timeMax.toLocaleDateString())
      console.log('   Access token:', accessToken ? '✓ Present' : '✗ Missing')
      console.log('   Access token (first 20 chars):', accessToken ? accessToken.substring(0, 20) + '...' : 'N/A')
      
      // Verify token and scopes
      console.log('🔍 Verifying access token and scopes...')
      await verifyTokenInfo(accessToken)
      
      // List all accessible calendars
      const accessibleCalendars = await listAccessibleCalendars(accessToken)
      const bandCalendarAccessible = accessibleCalendars.find(cal => cal.id === bandCalendarId)
      if (bandCalendarAccessible) {
        console.log('✓ Band calendar found in accessible calendars!')
        console.log('   Access role:', bandCalendarAccessible.accessRole)
      } else {
        console.warn('⚠️ Band calendar NOT found in accessible calendars!')
        console.warn('   This means you don\'t have access to:', bandCalendarId)
        console.warn('   Make sure the calendar is shared with your account.')
      }
      
      const calendarEvents = await getCalendarEvents(accessToken, timeMin, timeMax, bandCalendarId)
      console.log('✓ Calendar events loaded:', calendarEvents.length, 'events')
      setEvents(calendarEvents)
    } catch (err) {
      console.error('❌ Error loading calendar events:', err)
      console.error('   Error details:', err.message)
      
      // More specific error messages
      let errorMessage = 'Failed to load calendar events.'
      
      if (err.message.includes('404')) {
        errorMessage = 'Calendar not found. Make sure canino.sound@gmail.com calendar is shared with you.'
      } else if (err.message.includes('403')) {
        errorMessage = 'Access denied. You need permission to view this calendar.'
      } else if (err.message.includes('401')) {
        errorMessage = 'Authentication error. Try reconnecting Google Calendar.'
      } else {
        errorMessage += ' ' + err.message
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthSuccess = (token) => {
    console.log('✅ Calendar authentication successful')
    loadEvents()
  }

  if (!accessToken) {
    return (
      <div className="planner-view">
        <div className="planner-empty">
          <div className="empty-icon">📅</div>
          <h3>Band Calendar</h3>
          <p className="empty-text">Connect Google Calendar to see your band's schedule</p>
          <p className="empty-subtext">This will connect to canino.sound@gmail.com calendar</p>
          <DriveAuthButton onSuccess={handleAuthSuccess}>
            📅 Connect Google Calendar
          </DriveAuthButton>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="planner-view">
        <div className="planner-loading">
          <div className="loading-spinner">⏳</div>
          <p>Loading calendar...</p>
          <p className="loading-details">Fetching events from canino.sound@gmail.com</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="planner-view">
        <div className="planner-error">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
          <div className="error-actions">
            <button onClick={loadEvents} className="retry-btn">
              🔄 Try Again
            </button>
            <DriveAuthButton onSuccess={handleAuthSuccess}>
              🔄 Reconnect Calendar
            </DriveAuthButton>
          </div>
        </div>
      </div>
    )
  }

  const categorizeEvent = (eventTitle) => {
    const lowerTitle = eventTitle?.toLowerCase() || ''
    if (lowerTitle.includes('ensayo') || lowerTitle.includes('rehearsal') || lowerTitle.includes('practice')) {
      return 'rehearsal'
    }
    if (lowerTitle.includes('concierto') || lowerTitle.includes('gig') || lowerTitle.includes('show') || lowerTitle.includes('actuación')) {
      return 'gig'
    }
    return 'other'
  }

  const getEventIcon = (category) => {
    switch (category) {
      case 'rehearsal':
        return '🎸'
      case 'gig':
        return '🎤'
      default:
        return '📌'
    }
  }

  const upcomingEvents = events
    .filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date)
      return eventDate >= new Date()
    })
    .filter(event => {
      if (eventFilter === 'all') return true
      const category = categorizeEvent(event.summary)
      if (eventFilter === 'rehearsals') return category === 'rehearsal'
      if (eventFilter === 'gigs') return category === 'gig'
      return true
    })

  const handleDateClick = (date, dayEvents) => {
    setSelectedDate(date)
    setSelectedDateEvents(dayEvents)
  }

  const closeDateModal = () => {
    setSelectedDate(null)
    setSelectedDateEvents([])
  }

  // Categorized event counts
  const rehearsalCount = upcomingEvents.filter(e => categorizeEvent(e.summary) === 'rehearsal').length
  const gigCount = upcomingEvents.filter(e => categorizeEvent(e.summary) === 'gig').length

  return (
    <div className="planner-view">
      <div className="planner-header">
        <h3>📅 Band Calendar</h3>
        <div className="calendar-info">
          <span className="calendar-account">canino.sound@gmail.com</span>
        </div>
        <button onClick={loadEvents} className="refresh-calendar-btn" title="Refresh">
          🔄
        </button>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button
          onClick={() => setViewMode('calendar')}
          className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
        >
          📅 Calendar
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
        >
          📋 List
        </button>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && events.length > 0 && (
        <CalendarView events={events} onDateClick={handleDateClick} />
      )}

      {/* Event Filters */}
      {upcomingEvents.length > 0 && (
        <div className="event-filters">
          <button
            onClick={() => setEventFilter('all')}
            className={`filter-btn ${eventFilter === 'all' ? 'active' : ''}`}
          >
            All ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setEventFilter('rehearsals')}
            className={`filter-btn rehearsal ${eventFilter === 'rehearsals' ? 'active' : ''}`}
          >
            🎸 Rehearsals ({rehearsalCount})
          </button>
          <button
            onClick={() => setEventFilter('gigs')}
            className={`filter-btn gig ${eventFilter === 'gigs' ? 'active' : ''}`}
          >
            🎤 Gigs ({gigCount})
          </button>
        </div>
      )}

      {upcomingEvents.length === 0 ? (
        <div className="no-events">
          <div className="no-events-icon">🗓️</div>
          <p>No upcoming events</p>
          <p className="no-events-hint">
            Create events in Google Calendar to see them here
          </p>
        </div>
      ) : (
        <div className="events-list">
          {upcomingEvents.map((event) => {
            const { date, time, isAllDay } = formatEventTime(event)
            const now = new Date()
            const eventStart = new Date(event.start.dateTime || event.start.date)
            const isToday = eventStart.toDateString() === now.toDateString()
            const isTomorrow = eventStart.toDateString() === new Date(now.getTime() + 86400000).toDateString()
            const category = categorizeEvent(event.summary)
            const icon = getEventIcon(category)

            return (
              <div key={event.id} className={`event-card ${category} ${isToday ? 'today' : ''}`}>
                <div className="event-icon-badge">
                  <span className="event-icon">{icon}</span>
                </div>

                <div className="event-details">
                  <div className="event-header">
                    <h4 className="event-title">{event.summary || 'Untitled Event'}</h4>
                    {isToday && <span className="today-badge">Today</span>}
                    {isTomorrow && <span className="tomorrow-badge">Tomorrow</span>}
                  </div>

                  <div className="event-meta">
                    <div className="event-time">
                      <span className="time-icon">🕐</span>
                      {time}
                    </div>

                    {event.location && (
                      <div className="event-location">
                        <span className="location-icon">📍</span>
                        {event.location}
                      </div>
                    )}
                  </div>

                  {event.description && (
                    <div className="event-description">
                      {event.description}
                    </div>
                  )}

                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-in-calendar-link"
                  >
                    View in Google Calendar →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Date Modal */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="modal-overlay" onClick={closeDateModal}>
          <div className="date-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
              <button onClick={closeDateModal} className="close-modal-btn">✕</button>
            </div>
            <div className="modal-content">
              {selectedDateEvents.map((event) => {
                const { time } = formatEventTime(event)
                const category = categorizeEvent(event.summary)
                const icon = getEventIcon(category)

                return (
                  <div key={event.id} className={`modal-event-card ${category}`}>
                    <span className="modal-event-icon">{icon}</span>
                    <div className="modal-event-details">
                      <h4>{event.summary}</h4>
                      <p className="modal-event-time">🕐 {time}</p>
                      {event.location && <p className="modal-event-location">📍 {event.location}</p>}
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="modal-event-link"
                      >
                        View in Google Calendar →
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Planner

