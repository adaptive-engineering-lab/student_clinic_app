import { Link } from 'react-router-dom'
import { useSession } from '../lib/auth/useSession'
import { OutbreakAlertBanner } from '../features/alerts/OutbreakAlertBanner'

/** Placeholder landing page — replaced by role-specific views as later phases land. */
const TODAY = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function DashboardPage() {
  const { role } = useSession()

  return (
    <div>
      {(role === 'nurse' || role === 'super_admin') && <OutbreakAlertBanner />}
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="text-sm text-gray-500">{TODAY}</p>
      <p className="text-gray-600">Signed in as {role ?? 'unassigned'}.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {(role === 'nurse' || role === 'super_admin') && (
          <Link
            to="/students"
            className="flex min-h-11 items-center rounded bg-red-600 px-4 py-2 text-white"
          >
            Student profiles &amp; visits
          </Link>
        )}
        {role && (
          <Link to="/reports" className="flex min-h-11 items-center rounded border px-4 py-2">
            Reports
          </Link>
        )}
      </div>
    </div>
  )
}
