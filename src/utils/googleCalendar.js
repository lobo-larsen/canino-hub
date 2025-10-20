// Google Calendar API integration

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

/**
 * Verify token info and scopes
 */
export const verifyTokenInfo = async (accessToken) => {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`)
    const data = await response.json()
    console.log('🔑 Token Info:', data)
    console.log('   Scopes granted:', data.scope)
    console.log('   Has calendar scope?', data.scope?.includes('calendar') ? '✓ YES' : '✗ NO')
    console.log('   Has drive scope?', data.scope?.includes('drive') ? '✓ YES' : '✗ NO')
    return data
  } catch (error) {
    console.error('❌ Error verifying token:', error)
    return null
  }
}

/**
 * List all accessible calendars
 */
export const listAccessibleCalendars = async (accessToken) => {
  try {
    const url = `${CALENDAR_API_BASE}/users/me/calendarList`
    console.log('📋 Listing accessible calendars...')
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      console.error('❌ Failed to list calendars:', response.status, response.statusText)
      return []
    }

    const data = await response.json()
    console.log('✓ Accessible calendars:', data.items?.length || 0)
    data.items?.forEach((cal, index) => {
      console.log(`   ${index + 1}. ${cal.summary} (${cal.id})`)
      console.log(`      Access role: ${cal.accessRole}`)
    })
    
    return data.items || []
  } catch (error) {
    console.error('❌ Error listing calendars:', error)
    return []
  }
}

/**
 * Get calendar events for a specific time range
 */
export const getCalendarEvents = async (accessToken, timeMin, timeMax, calendarId = 'primary') => {
  try {
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '100'
    })

    const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    
    console.log('📡 Fetching calendar events from:', url)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    console.log('📡 Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ API Error Response:', errorData)
      throw new Error(`Failed to fetch calendar events: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('✓ API Response:', data)
    console.log('✓ Events found:', data.items?.length || 0)
    
    return data.items || []
  } catch (error) {
    console.error('❌ Error fetching calendar events:', error)
    throw error
  }
}

/**
 * Create a new calendar event
 */
export const createCalendarEvent = async (accessToken, event, calendarId = 'primary') => {
  try {
    const url = `${CALENDAR_API_BASE}/calendars/${calendarId}/events`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      throw new Error(`Failed to create event: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error creating calendar event:', error)
    throw error
  }
}

/**
 * Update a calendar event
 */
export const updateCalendarEvent = async (accessToken, eventId, event, calendarId = 'primary') => {
  try {
    const url = `${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    })

    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error updating calendar event:', error)
    throw error
  }
}

/**
 * Delete a calendar event
 */
export const deleteCalendarEvent = async (accessToken, eventId, calendarId = 'primary') => {
  try {
    const url = `${CALENDAR_API_BASE}/calendars/${calendarId}/events/${eventId}`
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to delete event: ${response.status}`)
    }

    return true
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    throw error
  }
}

/**
 * Format event for display
 */
export const formatEventTime = (event) => {
  const start = event.start.dateTime || event.start.date
  const end = event.end.dateTime || event.end.date
  
  const startDate = new Date(start)
  const endDate = new Date(end)
  
  // All-day event
  if (event.start.date) {
    return {
      date: startDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: 'All day',
      isAllDay: true
    }
  }
  
  // Timed event
  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
  return {
    date: startDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }),
    time: `${startDate.toLocaleTimeString('en-US', timeOptions)} - ${endDate.toLocaleTimeString('en-US', timeOptions)}`,
    isAllDay: false
  }
}

