import { useState, type FormEvent } from 'react'
import { useSendHomeNotice } from './useSendHomeNotice'

interface SendHomeNoticeProps {
  visitId: string
  onGenerated?: () => void
}

/**
 * FR-016 trigger UI: shown for a sent-home visit that has no notice yet. Print
 * downloads the PDF via a signed URL; email sends it through the Edge Function's
 * Resend path. An email failure is surfaced, not swallowed (Constitution Principle
 * III's "no silent failure" applies to this delivery path too).
 */
export function SendHomeNotice({ visitId, onGenerated }: SendHomeNoticeProps) {
  const { generating, generate, error } = useSendHomeNotice(visitId)
  const [choice, setChoice] = useState<'print' | 'email'>('print')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus(null)

    const emailed = await generate(choice === 'email' ? recipientEmail : undefined)
    if (choice === 'email') {
      setStatus(
        emailed ? 'Notice generated and emailed.' : 'Notice generated, but email failed to send.',
      )
    } else {
      setStatus('Notice generated.')
    }
    onGenerated?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-3">
      <h4 className="text-sm font-semibold">Generate send-home notice</h4>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p className="text-sm text-green-700">{status}</p>}

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`notice-choice-${visitId}`}
            checked={choice === 'print'}
            onChange={() => setChoice('print')}
          />
          Print
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={`notice-choice-${visitId}`}
            checked={choice === 'email'}
            onChange={() => setChoice('email')}
          />
          Email to emergency contact
        </label>
      </div>

      {choice === 'email' && (
        <label className="block">
          <span className="text-sm text-gray-700">Recipient email</span>
          <input
            required
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={generating}
        className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {generating ? 'Generating…' : 'Generate notice'}
      </button>
    </form>
  )
}
