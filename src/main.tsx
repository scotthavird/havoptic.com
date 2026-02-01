import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { WatchlistProvider } from './context/WatchlistContext'
import { NewsletterBellProvider } from './context/NewsletterBellContext'
import { PushNotificationProvider } from './context/PushNotificationContext'
import { FlyingBell } from './components/FlyingBell'
import { PushAnnouncementBanner } from './components/PushAnnouncementBanner'
import { PushSuccessModal } from './components/PushSuccessModal'
import { PushWatchlistPrompt } from './components/PushWatchlistPrompt'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <WatchlistProvider>
      <NewsletterBellProvider>
        <PushNotificationProvider>
          <App />
          <FlyingBell />
          <PushAnnouncementBanner />
          <PushSuccessModal />
          <PushWatchlistPrompt />
        </PushNotificationProvider>
      </NewsletterBellProvider>
    </WatchlistProvider>
  </AuthProvider>
)
