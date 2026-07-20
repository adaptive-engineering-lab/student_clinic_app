import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import type { NewStudent, Student } from '../../types/student'

interface StudentProfileFormProps {
  /** When editing, the existing student; omit to create a new one. */
  student?: Student
  onSaved: (student: Student) => void
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const CURRENT_YEAR = new Date().getFullYear()
// Typical K-12 age range; widen if a school needs older/younger students.
const DOB_YEARS = Array.from({ length: 19 }, (_, i) => CURRENT_YEAR - 3 - i)

function parseDateOfBirth(value: string | undefined): {
  day: number | ''
  month: number | ''
  year: number | ''
} {
  if (!value) return { day: '', month: '', year: '' }
  const [year, month, day] = value.split('-').map(Number)
  return { day, month, year }
}

/** Returns a zero-padded 'YYYY-MM-DD', or null if day/month/year isn't a real date. */
function buildDateOfBirth(day: number | '', month: number | '', year: number | ''): string | null {
  if (day === '' || month === '' || year === '') return null
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Demographics create/edit (F-1.1). first_name, last_name, date_of_birth, and
 * student_id_ext are required at creation (FR-001).
 */
export function StudentProfileForm({ student, onSaved }: StudentProfileFormProps) {
  const [firstName, setFirstName] = useState(student?.first_name ?? '')
  const [lastName, setLastName] = useState(student?.last_name ?? '')
  const initialDob = parseDateOfBirth(student?.date_of_birth)
  const [dobDay, setDobDay] = useState<number | ''>(initialDob.day)
  const [dobMonth, setDobMonth] = useState<number | ''>(initialDob.month)
  const [dobYear, setDobYear] = useState<number | ''>(initialDob.year)
  const [studentIdExt, setStudentIdExt] = useState(student?.student_id_ext ?? '')
  const [gender, setGender] = useState(student?.gender ?? '')
  const [grade, setGrade] = useState(student?.grade ?? '')
  const [homeroom, setHomeroom] = useState(student?.homeroom ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const dateOfBirth = buildDateOfBirth(dobDay, dobMonth, dobYear)
    if (!dateOfBirth) {
      setError('Enter a valid date of birth (day, month, and year).')
      return
    }

    setSubmitting(true)

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
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

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

      <div>
        <span className="text-sm text-gray-700">Date of birth</span>
        <div className="mt-1 grid grid-cols-3 gap-3">
          <label className="block">
            <span className="sr-only">Day</span>
            <select
              required
              value={dobDay}
              onChange={(e) => setDobDay(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Day</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Month</span>
            <select
              required
              value={dobMonth}
              onChange={(e) => setDobMonth(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Month</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Year</span>
            <select
              required
              value={dobYear}
              onChange={(e) => setDobYear(e.target.value ? Number(e.target.value) : '')}
              className="w-full rounded border px-3 py-2"
            >
              <option value="">Year</option>
              {DOB_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

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
