import { useState } from 'react'
import { useSendHomeNotice } from '../communications/useSendHomeNotice'
import { SendHomeNotice } from '../communications/SendHomeNotice'
import type { Visit } from '../../types/visit'

interface VisitHistoryNoticeProps {
  visit: Visit
}

/**
 * FR-016/acceptance scenario 3: from visit history, a sent-home visit's notice is
 * retrievable and linked. Shows the retrieval link once a notice exists; otherwise
 * shows the generation trigger (SendHomeNotice).
 */
export function VisitHistoryNotice({ visit }: VisitHistoryNoticeProps) {
  const { notice, loading, getSignedUrl, refetch } = useSendHomeNotice(visit.id)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  if (visit.disposition !== 'sent_home') return null
  if (loading) return <p className="text-sm text-gray-500">Checking for send-home notice…</p>

  if (!notice) {
    return <SendHomeNotice visitId={visit.id} onGenerated={() => void refetch()} />
  }

  return (
    <div className="text-sm">
      {signedUrl ? (
        <a href={signedUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
          Open send-home notice
        </a>
      ) : (
        <button
          type="button"
          className="text-blue-700 underline"
          onClick={async () => {
            if (notice.pdf_url) setSignedUrl(await getSignedUrl(notice.pdf_url))
          }}
        >
          View send-home notice
        </button>
      )}
    </div>
  )
}
