// Favorites management with per-user color coding

// Assign colors to users based on email
const USER_COLORS = [
  '#FF6B6B', // red
  '#4ECDC4', // teal
  '#FFD93D', // yellow
  '#6BCB77', // green
  '#95E1D3', // mint
  '#F38181', // pink
  '#AA96DA', // purple
  '#FCBAD3', // light pink
  '#FDA7DF', // magenta
  '#A8D8EA', // light blue
]

export const getUserColor = (userEmail) => {
  if (!userEmail) return USER_COLORS[0]
  
  // Generate consistent color based on email
  let hash = 0
  for (let i = 0; i < userEmail.length; i++) {
    hash = userEmail.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % USER_COLORS.length
  return USER_COLORS[index]
}

export const getUserInitials = (userName) => {
  if (!userName) return '?'
  const parts = userName.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return userName[0].toUpperCase()
}

// Get favorites from recording metadata
export const getFavorites = (recording) => {
  return recording.favorites || []
}

// Check if current user favorited
export const isFavoritedByUser = (recording, userEmail) => {
  const favorites = getFavorites(recording)
  return favorites.some(fav => fav.userEmail === userEmail)
}

// Toggle favorite for current user
export const toggleFavorite = (recording, user) => {
  const favorites = getFavorites(recording)
  const userEmail = user.email
  
  const existingIndex = favorites.findIndex(fav => fav.userEmail === userEmail)
  
  if (existingIndex >= 0) {
    // Remove favorite
    favorites.splice(existingIndex, 1)
  } else {
    // Add favorite
    favorites.push({
      userEmail: userEmail,
      userName: user.name,
      timestamp: Date.now()
    })
  }
  
  return favorites
}


