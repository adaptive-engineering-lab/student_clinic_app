import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/auth/useSession'
import { SyncStatusBanner } from '../components/SyncStatusBanner'
import { BreadcrumbTrail } from '../components/navigation/BreadcrumbTrail'
import { BottomTabBar } from '../components/navigation/BottomTabBar'
import { getLastPath } from '../components/navigation/useNavigationHistory'

export function AppLayout() {
  const { session, role } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const hasAttemptedRestore = useRef(false)

  // A PWA relaunched from its home-screen icon always opens at start_url ('/'), not
  // wherever the user left off — restore their last page once per app load (FR-007).
  useEffect(() => {
    if (hasAttemptedRestore.current) return
    if (!session || location.pathname !== '/') return
    hasAttemptedRestore.current = true

    const lastPath = getLastPath(session.user.id)
    if (lastPath && lastPath !== location.pathname) {
      navigate(lastPath, { replace: true })
    }
  }, [session, location.pathname, navigate])

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6">
        <span className="font-semibold">School Nurse Clinic</span>
        {session && (
          <div className="flex items-center gap-2 text-sm text-gray-600 sm:gap-4">
            <span className="hidden sm:inline">
              {session.user.email} ({role ?? 'no role assigned'})
            </span>
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="flex min-h-11 min-w-11 items-center justify-center rounded border px-3 py-2"
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      {session && <SyncStatusBanner />}
      {session && <BreadcrumbTrail />}
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
      {session && <BottomTabBar />}
    </div>
  )
}
