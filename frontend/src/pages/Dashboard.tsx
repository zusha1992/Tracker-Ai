import { useHandStore } from '../store/handStore'
import { FileUpload } from '../features/upload/FileUpload'
import { FileStatus } from '../features/upload/FileStatus'
import { format } from 'date-fns'

const API = 'http://localhost:8000'

export const Dashboard = () => {
  const rawFiles = useHandStore((s) => s.rawFiles)
  const isParsing = useHandStore((s) => s.isParsing)
  const parseSummary = useHandStore((s) => s.parseSummary)
  const parseError = useHandStore((s) => s.parseError)
  const setIsParsing = useHandStore((s) => s.setIsParsing)
  const setParseSummary = useHandStore((s) => s.setParseSummary)
  const setParseError = useHandStore((s) => s.setParseError)

  const handleParse = async () => {
    if (!rawFiles.length) return
    setIsParsing(true)
    setParseError(null)
    setParseSummary(null)

    try {
      const form = new FormData()
      for (const file of rawFiles) form.append('files', file)

      const res = await fetch(`${API}/api/parse/summary`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Parse failed')
      }
      const data = await res.json()
      setParseSummary(data)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsParsing(false)
    }
  }

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    try { return format(new Date(iso), 'MMM d, yyyy') } catch { return iso }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Import Hand History</h2>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Upload one or more hand history files, or select an entire folder.
        </p>
      </div>

      {rawFiles.length > 0 && <FileStatus />}
      <FileUpload />

      {rawFiles.length > 0 && (
        <button
          onClick={handleParse}
          disabled={isParsing}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors
            bg-[var(--accent-green)] text-white
            hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isParsing ? 'Parsing…' : `Parse ${rawFiles.length} file${rawFiles.length > 1 ? 's' : ''}`}
        </button>
      )}

      {parseError && (
        <div className="rounded-lg border border-[var(--accent-red)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--accent-red)]">
          {parseError}
        </div>
      )}

      {parseSummary && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
              {parseSummary.site}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--accent-green)] text-white">
              Parsed
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stat label="Total Hands" value={parseSummary.handCount.toLocaleString()} />
            <Stat label="Hero" value={parseSummary.hero} />
            <Stat label="Stakes" value={parseSummary.stakes.join(', ') || '—'} />
            <Stat label="Date Range" value={`${fmtDate(parseSummary.dateRange.first)} → ${fmtDate(parseSummary.dateRange.last)}`} />
          </div>
        </div>
      )}
    </div>
  )
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
    <p className="text-sm font-semibold text-[var(--text-primary)]">{value}</p>
  </div>
)
