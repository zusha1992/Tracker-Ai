import { useHandStore } from '../store/handStore'
import { useFilteredHands } from '../hooks/useFilteredHands'
import { FileUpload } from '../features/upload/FileUpload'
import { FileStatus } from '../features/upload/FileStatus'

const API = 'http://localhost:8000'

export const Dashboard = () => {
  const rawFiles   = useHandStore((s) => s.rawFiles)
  const isParsing  = useHandStore((s) => s.isParsing)
  const allHands   = useHandStore((s) => s.hands)
  const hands      = useFilteredHands()
  const parseError = useHandStore((s) => s.parseError)
  const setIsParsing  = useHandStore((s) => s.setIsParsing)
  const setHands      = useHandStore((s) => s.setHands)
  const setParseError = useHandStore((s) => s.setParseError)

  const handleParse = async () => {
    if (!rawFiles.length) return
    setIsParsing(true)
    setParseError(null)

    try {
      const form = new FormData()
      for (const file of rawFiles) form.append('files', file)

      const res = await fetch(`${API}/api/parse/hands`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail ?? 'Parse failed')
      }
      const data = await res.json()
      setHands(data.hands)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsParsing(false)
    }
  }

  // Compute stats from hands
  const totalProfit = hands.reduce((s, h) => s + h.netWinnings, 0)
  const totalRake   = hands.reduce((s, h) => s + h.rake, 0)
  const totalBB     = hands.reduce((s, h) => s + h.netBB, 0)
  const bb100       = hands.length > 0 ? (totalBB / hands.length) * 100 : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Upload section */}
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

      {/* Stat cards */}
      {allHands.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Hands" value={hands.length.toLocaleString()} />
          <StatCard
            label="Total Profit"
            value={`${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`}
            positive={totalProfit >= 0}
          />
          <StatCard
            label="BB / 100"
            value={`${bb100 >= 0 ? '+' : ''}${bb100.toFixed(1)}`}
            positive={bb100 >= 0}
          />
          <StatCard label="Rake Paid" value={`$${totalRake.toFixed(2)}`} />
        </div>
      )}
    </div>
  )
}

const StatCard = ({
  label,
  value,
  positive,
}: {
  label: string
  value: string
  positive?: boolean
}) => (
  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
    <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
    <p
      className="text-lg font-bold"
      style={{
        color:
          positive === undefined
            ? 'var(--text-primary)'
            : positive
            ? 'var(--accent-green)'
            : 'var(--accent-red)',
      }}
    >
      {value}
    </p>
  </div>
)
