import { supabase } from '../supabase'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // Constitution Principle V / FR-027

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const

/**
 * Signs the user out after 30 minutes with no interaction. Supabase's JWT expiry
 * governs token lifetime, not idle time, so inactivity has to be tracked client-side
 * (research.md §8).
 */
export function registerInactivityTimeout(timeoutMs: number = INACTIVITY_TIMEOUT_MS): () => void {
  let timer: ReturnType<typeof setTimeout>

  const resetTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      void supabase.auth.signOut()
    }, timeoutMs)
  }

  for (const event of ACTIVITY_EVENTS) {
    window.addEventListener(event, resetTimer, { passive: true })
  }
  resetTimer()

  return () => {
    clearTimeout(timer)
    for (const event of ACTIVITY_EVENTS) {
      window.removeEventListener(event, resetTimer)
    }
  }
}
