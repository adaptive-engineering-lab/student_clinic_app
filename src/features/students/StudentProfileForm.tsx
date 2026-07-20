import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { NewStudent, Student } from '../../types/student'

interface StudentProfileFormProps {
  /** When editing, the existing student; omit to create a new one. */
  student?: Student
  onSaved: (student: Student) => void
}

/**
 * Demographics create/edit (F-1.1). first_name, last_name, date_of_birth, and
 * student_id_ext are required at creation (FR-001).
 */
export function StudentProfileForm({ student, onSaved }: StudentProfileFormProps) {
  const [firstName, setFirstName] = useState(student?.first_name ?? '')
  const [lastName, setLastName] = useState(student?.last_name ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(student?.date_of_birth ?? '')
  const [studentIdExt, setStudentIdExt] = useState(student?.student_id_ext ?? '')
  const [gender, setGender] = useState(student?.gender ?? '')
  const [grade, setGrade] = useState(student?.grade ?? '')
  const [homeroom, setHomeroom] = useState(student?.homeroom ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload: NewStudent = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      student_id_ext: studentIdExt,
      gender: gender || null,
      grade: grade || null,
      homeroom: homeroom || null,
    }

    const query = student
      ? supabase.from('students').update(payload).eq('id', student.id).select().single()
      : supabase.from('students').insert(payload).select().single()

    const { data, error } = await query
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved(data as Student)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded border p-4">
      <h3 className="font-semibold">{student ? 'Edit student' : 'New student'}</h3>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-gray-700">First name</span>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Last name</span>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm text-gray-700">Date of birth</span>
        <input
          type="date"
          required
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <label className="block">
        <span className="text-sm text-gray-700">Student ID (SIS)</span>
        <input
          required
          value={studentIdExt}
          onChange={(e) => setStudentIdExt(e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm text-gray-700">Gender</span>
          <input
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Grade</span>
          <input
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Homeroom</span>
          <input
            value={homeroom}
            onChange={(e) => setHomeroom(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Saving…' : student ? 'Save changes' : 'Create student'}
      </button>
    </form>
  )
}
