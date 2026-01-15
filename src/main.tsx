import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import { NewsletterBellProvider } from './context/NewsletterBellContext'
import { FlyingBell } from './components/FlyingBell'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <NewsletterBellProvider>
      <App />
      <FlyingBell />
    </NewsletterBellProvider>
  </AuthProvider>
)
