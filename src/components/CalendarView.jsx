import { useState } from 'react'
import './CalendarView.css'

function CalendarView({ events, onDateClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start.dateTime || event.start.date)
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear()
      )
    })
  }

  const isToday = (day) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    )
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentMonth(new Date())
  }

  const getEventType = (title) => {
    const lowerTitle = title?.toLowerCase() || ''
    if (lowerTitle.includes('ensayo') || lowerTitle.includes('rehearsal') || lowerTitle.includes('practice')) {
      return 'rehearsal'
    }
    if (lowerTitle.includes('concierto') || lowerTitle.includes('gig') || lowerTitle.includes('show') || lowerTitle.includes('actuación')) {
      return 'gig'
    }
    return 'other'
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const days = []
  // Empty cells for days before the start of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const dayEvents = getEventsForDate(date)
    const hasEvents = dayEvents.length > 0
    const today = isToday(day)

    days.push(
      <div
        key={day}
        className={`calendar-day ${hasEvents ? 'has-events' : ''} ${today ? 'today' : ''}`}
        onClick={() => hasEvents && onDateClick(date, dayEvents)}
      >
        <div className="day-number">{day}</div>
        {hasEvents && (
          <div className="event-indicators">
            {dayEvents.slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className={`event-dot ${getEventType(event.summary)}`}
                title={event.summary}
              ></div>
            ))}
            {dayEvents.length > 3 && <div className="more-events">+{dayEvents.length - 3}</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth} className="month-nav-btn">‹</button>
        <div className="month-title">
          <span>{monthName}</span>
          <button onClick={goToToday} className="today-btn">Today</button>
        </div>
        <button onClick={goToNextMonth} className="month-nav-btn">›</button>
      </div>

      <div className="calendar-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {days}
      </div>

      <div className="calendar-legend">
        <div className="legend-item">
          <div className="event-dot rehearsal"></div>
          <span>Rehearsal</span>
        </div>
        <div className="legend-item">
          <div className="event-dot gig"></div>
          <span>Gig</span>
        </div>
        <div className="legend-item">
          <div className="event-dot other"></div>
          <span>Other</span>
        </div>
      </div>
    </div>
  )
}

export default CalendarView

