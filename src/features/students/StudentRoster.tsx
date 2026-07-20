import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Student } from '../../types/student'

interface StudentRosterProps {
  onSelect: (student: Student) => void
  selectedId?: string
  /** Bump this (e.g. on create/save) to force a re-fetch. */
  refreshKey?: number
}

/** Student roster with name search (F-1.1). `students` has a direct SELECT grant — not read-audited. */
export function StudentRoster({ onSelect, selectedId, refreshKey }: StudentRosterProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const request = query
      ? supabase
          .from('students')
          .select('*')
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
          .order('last_name')
      : supabase.from('students').select('*').order('last_name')

    request.then(({ data, error }) => {
      if (cancelled) return
      if (!error) setStudents((data ?? []) as Student[])
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [query, refreshKey])

  return (
    <div className="w-72 shrink-0 space-y-3">
      <input
        type="search"
        placeholder="Search students…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border px-3 py-2"
      />
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="divide-y rounded border">
          {students.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                  s.id === selectedId ? 'bg-red-50 font-medium' : ''
                }`}
              >
                {s.last_name}, {s.first_name}
                {s.grade ? <span className="text-gray-500"> — Grade {s.grade}</span> : null}
              </button>
            </li>
          ))}
          {students.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">No students found.</li>
          )}
        </ul>
      )}
    </div>
  )
}
