# Canino Hub

A mobile-first web application for managing audio recordings with Google authentication.

## Features

- 🎙️ **Audio Recording** - Record with multiple quality presets (Voice, Standard, High, Studio)
- 💾 **Local Storage** - Recordings saved in browser (IndexedDB) for offline access
- ☁️ **Google Drive Upload** - Selectively upload recordings to Google Drive
- 🎵 **Playback Controls** - Built-in audio player for each recording
- ✏️ **Easy Management** - Rename, download, and delete recordings
- 🔐 **Google OAuth Authentication** - Secure sign-in with your Google account
- 📱 **Mobile-First Design** - Optimized for mobile devices with responsive desktop support
- 📊 **Real-time Stats** - Track total recordings, duration, and storage used

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- A Google Cloud Project with OAuth 2.0 credentials

### Setting up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application**
6. Add authorized JavaScript origins:
   - `http://localhost:3001` (for development)
   - Your production domain (when deployed)
7. Add authorized redirect URIs:
   - `http://localhost:3001` (for development)
   - Your production domain (when deployed)
8. Copy the **Client ID**

### Enable Google Drive API

1. In Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on it and click **Enable**
4. This allows the app to upload recordings to Google Drive

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

4. Add your Google OAuth Client ID to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

### Running the App

Start the development server:
```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

### Building for Production

```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.jsx    # Main dashboard after login
│   ├── Header.jsx       # App header with user info
│   ├── LoginPage.jsx    # Google OAuth login page
│   └── MainApp.jsx      # Main app wrapper
├── contexts/            # React contexts
│   └── AuthContext.jsx  # Authentication state management
├── App.jsx              # Root app component
├── App.css              # App-level styles
├── index.css            # Global styles
└── main.jsx             # App entry point
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **@react-oauth/google** - Google OAuth integration
- **React Router** - Client-side routing
- **CSS3** - Styling with CSS variables and modern features

## Next Steps

- Add audio recording functionality
- Implement Google Drive integration for storage
- Add recording playback and editing features
- Create recording organization and tagging system
- Add sharing and export capabilities

## License

MIT

