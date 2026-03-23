import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useHandStore } from '../store/handStore'
import { useFilteredHands } from '../hooks/useFilteredHands'
import { useThemeStore } from '../store/themeStore'
import { getChartColors } from '../theme/tokens'
import { FileUpload } from '../features/upload/FileUpload'
import { FileStatus } from '../features/upload/FileStatus'
import { CumulativeChart } from '../features/graphs/CumulativeChart'

const API = 'http://localhost:8000'

export const Dashboard = () => {
  const rawFiles   = useHandStore((s) => s.rawFiles)
  const isParsing  = useHandStore((s) => s.isParsing)
  const allHands   = useHandStore((s) => s.hands)
  const hands      = useFilteredHands()
  const isDark     = useThemeStore((s) => s.isDark)
  const colors     = getChartColors(isDark)
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

  const netPoints = useMemo(() => {
    let cum = 0
    return hands.map((h, i) => ({
      index: i + 1,
      cumulative: Math.round((cum += h.netWinnings) * 100) / 100,
      hand: h,
    }))
  }, [hands])

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
          className="relative w-full py-2.5 rounded-lg text-sm font-semibold overflow-hidden
            bg-[var(--accent-green)] text-white hover:opacity-90
            disabled:cursor-not-allowed transition-opacity"
        >
          {/* Shimmer sweep when parsing */}
          {isParsing && (
            <span
              className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
              }}
            />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {isParsing && <Loader2 size={15} className="animate-spin" />}
            {isParsing
              ? `Parsing ${rawFiles.length} file${rawFiles.length > 1 ? 's' : ''}…`
              : `Parse ${rawFiles.length} file${rawFiles.length > 1 ? 's' : ''}`}
          </span>
        </button>
      )}

      {parseError && (
        <div className="rounded-lg border border-[var(--accent-red)] bg-[var(--bg-surface)] p-4 text-sm text-[var(--accent-red)]">
          {parseError}
        </div>
      )}

      {/* Stat cards */}
      {allHands.length > 0 && (
        <>
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
          <CumulativeChart
            points={netPoints}
            color={colors.green}
            title="Net Winnings"
            height={180}
            showBrush={false}
          />
        </>
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
