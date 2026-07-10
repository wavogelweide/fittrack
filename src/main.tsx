import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { initTheme } from './components/theme'

// Theme vor dem ersten Render anwenden, damit nichts aufblitzt
initTheme()

registerSW({ immediate: true })

// Persistenten Speicher anfordern, damit iOS die IndexedDB nicht bei
// Platzmangel löscht (Phase 7); Status wird im Profil-Tab angezeigt
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
