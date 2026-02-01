import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { WatchlistProvider } from './context/WatchlistContext'
import { NewsletterBellProvider } from './context/NewsletterBellContext'
import { FlyingBell } from './components/FlyingBell'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <WatchlistProvider>
      <NewsletterBellProvider>
        <App />
        <FlyingBell />
      </NewsletterBellProvider>
    </WatchlistProvider>
  </AuthProvider>
)
