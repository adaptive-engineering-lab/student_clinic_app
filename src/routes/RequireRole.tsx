import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession, type AppRole } from '../lib/auth/useSession'

interface RequireRoleProps {
  allow: AppRole[]
  children: ReactNode
}

/**
 * Client-side route guard. This is a UX convenience only — the real access boundary
 * is enforced by RLS policies (Constitution Principle V), so a bug here can hide a
 * link but can never expose data the database wouldn't otherwise allow.
 */
export function RequireRole({ allow, children }: RequireRoleProps) {
  const { session, role, loading } = useSession()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (!role || !allow.includes(role)) return <Navigate to="/" replace />

  return children
}
