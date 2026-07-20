import { Link } from 'react-router-dom'
import { useSession } from '../lib/auth/useSession'

/** Placeholder landing page — replaced by role-specific views as later phases land. */
export function DashboardPage() {
  const { role } = useSession()

  return (
    <div>
      <h1 className="text-lg font-semibold">Dashboard</h1>
      <p className="text-gray-600">
        Signed in as {role ?? 'unassigned'}. Outbreak alerts are built out in a later phase.
      </p>
      <div className="mt-4 flex gap-3">
        {(role === 'nurse' || role === 'super_admin') && (
          <Link to="/students" className="inline-block rounded bg-red-600 px-4 py-2 text-white">
            Student profiles &amp; visits
          </Link>
        )}
        {role && (
          <Link to="/reports" className="inline-block rounded border px-4 py-2">
            Reports
          </Link>
        )}
      </div>
    </div>
  )
}
