import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'
import { Toaster } from 'sonner'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light })
  StatusBar.setOverlaysWebView({ overlay: false })
  SplashScreen.hide({ fadeOutDuration: 300 })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster position="bottom-center" richColors />
    </AuthProvider>
  </StrictMode>,
)
