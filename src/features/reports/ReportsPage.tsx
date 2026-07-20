import { useState } from 'react'
import { useSession } from '../../lib/auth/useSession'
import { ReportFilters } from './ReportFilters'
import { VisitFrequencyReport } from './VisitFrequencyReport'
import { ImmunizationReport } from './ImmunizationReport'
import { AdminAggregateReport } from './AdminAggregateReport'
import { ReportHistory } from './ReportHistory'
import { OutbreakConfigForm } from './OutbreakConfigForm'
import { useGenerateReport } from './useGenerateReport'
import { sendReportEmail } from './sendReportEmail'
import { exportVisitFrequencyCsv } from './exportCsv'
import { useVisitFrequencyReport } from './useVisitFrequencyReport'
import { EMPTY_REPORT_FILTERS, type ReportFilterValues } from '../../types/report'

/**
 * FR-017/FR-018: nurse sees full-detail reports; admin sees only the aggregate
 * variant. A nurse can also preview the admin variant for the same filters, so the
 * boundary is visibly demonstrable (spec.md US5's acceptance scenario 2).
 */
export function ReportsPage() {
  const { role } = useSession()
  const [filters, setFilters] = useState<ReportFilterValues>(EMPTY_REPORT_FILTERS)
  const [showAdminPreview, setShowAdminPreview] = useState(false)
  const isNurse = role === 'nurse' || role === 'super_admin'

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">Reports</h1>

      <ReportFilters values={filters} onChange={setFilters} />

      {isNurse ? (
        <>
          <VisitFrequencyReport filters={filters} />
          <ImmunizationReport filters={filters} />
          <NurseCsvExport filters={filters} />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showAdminPreview}
              onChange={(e) => setShowAdminPreview(e.target.checked)}
            />
            Preview admin (aggregate-only) variant
          </label>
          {showAdminPreview && <AdminAggregateReport filters={filters} />}
        </>
      ) : (
        <AdminAggregateReport filters={filters} />
      )}

      <ReportGenerateActions filters={filters} audience={isNurse ? 'nurse' : 'admin'} />
      <ReportHistory />

      {role === 'super_admin' && <OutbreakConfigForm />}
    </div>
  )
}

function NurseCsvExport({ filters }: { filters: ReportFilterValues }) {
  const { rows } = useVisitFrequencyReport(filters)
  return (
    <button
      type="button"
      onClick={() => exportVisitFrequencyCsv(rows)}
      className="rounded border px-3 py-2 text-sm"
    >
      Export CSV
    </button>
  )
}

function ReportGenerateActions({
  filters,
  audience,
}: {
  filters: ReportFilterValues
  audience: 'nurse' | 'admin'
}) {
  const { generate, generating, error, lastReportId, lastPdfUrl } = useGenerateReport()
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<string | null>(null)
  const [emailing, setEmailing] = useState(false)

  return (
    <div className="space-y-2 rounded border p-3">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={generating}
        onClick={() => void generate('visit_frequency', audience, filters)}
        className="rounded bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {generating ? 'Generating…' : 'Generate PDF'}
      </button>

      {lastPdfUrl && (
        <a
          href={lastPdfUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-blue-700 underline"
        >
          Open generated PDF
        </a>
      )}

      {lastReportId && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="email"
            placeholder="Email PDF to…"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            className="min-w-0 flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={emailing}
            className="min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50"
            onClick={async () => {
              setEmailing(true)
              const sent = await sendReportEmail(lastReportId, recipientEmail)
              setEmailing(false)
              setEmailStatus(sent ? 'Report emailed.' : 'Failed to send report email.')
            }}
          >
            Email PDF
          </button>
          {emailStatus && (
            <span role="status" className="text-sm text-gray-700">
              {emailStatus}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
