import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase'

export type AppRole = 'nurse' | 'admin' | 'super_admin'

export interface SessionState {
  session: Session | null
  role: AppRole | null
  loading: boolean
}

/** Current auth session plus the caller's app role (from public.user_roles). */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, role: null, loading: true })

  useEffect(() => {
    let cancelled = false

    async function loadRole(session: Session | null) {
      if (!session) {
        if (!cancelled) setState({ session: null, role: null, loading: false })
        return
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!cancelled) {
        setState({ session, role: (data?.role as AppRole) ?? null, loading: false })
      }
    }

    supabase.auth.getSession().then(({ data }) => loadRole(data.session))

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadRole(session)
    })

    return () => {
      cancelled = true
      subscription.subscription.unsubscribe()
    }
  }, [])

  return state
}
