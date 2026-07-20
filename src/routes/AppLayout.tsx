import { Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/auth/useSession'
import { SyncStatusBanner } from '../components/SyncStatusBanner'

export function AppLayout() {
  const { session, role } = useSession()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <span className="font-semibold">School Nurse Clinic</span>
        {session && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>
              {session.user.email} ({role ?? 'no role assigned'})
            </span>
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="rounded border px-3 py-1"
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      {session && <SyncStatusBanner />}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
