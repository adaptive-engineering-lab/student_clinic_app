import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSyncOnReconnect } from './lib/offline/sync'
import { registerInactivityTimeout } from './lib/auth/session'

registerSyncOnReconnect()
registerInactivityTimeout()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
