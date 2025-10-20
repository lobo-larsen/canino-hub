// Comments/Notes management

// Get comments from recording metadata
export const getComments = (recording) => {
  return recording.comments || []
}

// Add a comment
export const addComment = (recording, user, commentText) => {
  const comments = getComments(recording)
  
  const newComment = {
    id: Date.now().toString(),
    text: commentText,
    userEmail: user.email,
    userName: user.name,
    timestamp: Date.now()
  }
  
  comments.push(newComment)
  return comments
}

// Delete a comment (only by the user who created it)
export const deleteComment = (recording, commentId, userEmail) => {
  const comments = getComments(recording)
  const commentIndex = comments.findIndex(c => c.id === commentId)
  
  if (commentIndex >= 0) {
    const comment = comments[commentIndex]
    // Only allow deletion by the comment author
    if (comment.userEmail === userEmail) {
      comments.splice(commentIndex, 1)
    }
  }
  
  return comments
}

// Format timestamp for display
export const formatCommentDate = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}


