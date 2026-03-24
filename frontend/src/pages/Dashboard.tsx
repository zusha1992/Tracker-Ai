import { useMemo, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { useHandStore } from '../store/handStore'
import { usePoolStatsStore } from '../store/poolStatsStore'
import { useFilteredHands } from '../hooks/useFilteredHands'
import { useThemeStore } from '../store/themeStore'
import { getChartColors } from '../theme/tokens'
import { FileUpload } from '../features/upload/FileUpload'
import { FileStatus } from '../features/upload/FileStatus'
import { CumulativeChart } from '../features/graphs/CumulativeChart'

const API = 'http://localhost:8000'

interface Session { date: string; stakes: string; hand_count: number }

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
  const setPoolStats  = usePoolStatsStore((s) => s.setStats)
  const clearPoolStats = usePoolStatsStore((s) => s.clear)

  const [sessions, setSessions]   = useState<Session[]>([])
  const [deleting, setDeleting]   = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/sessions`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .catch(() => {})
  }, [allHands])

  const handleDeleteSession = async (date: string) => {
    setDeleting(date)
    try {
      await fetch(`${API}/api/sessions/${date}`, { method: 'DELETE' })
      const data = await fetch(`${API}/api/hands`).then((r) => r.json())
      setHands(data.hands ?? [])
      if (data.poolStats) setPoolStats(data.poolStats)
      else clearPoolStats()
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(null)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Delete all saved hands?')) return
    await fetch(`${API}/api/hands`, { method: 'DELETE' })
    setHands([])
    clearPoolStats()
  }

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
      if (data.poolStats) setPoolStats(data.poolStats)
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

      {/* Saved sessions */}
      {sessions.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Saved Data</span>
            <button
              onClick={handleClearAll}
              className="text-xs text-[var(--accent-red)] hover:opacity-75 transition-opacity"
            >
              Clear all
            </button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {sessions.map((s) => (
              <div key={`${s.date}-${s.stakes}`} className="flex items-center justify-between px-4 py-2 text-xs">
                <span className="text-[var(--text-primary)] font-medium">{s.date}</span>
                <span className="text-[var(--text-muted)]">{s.stakes}</span>
                <span className="text-[var(--text-muted)]">{s.hand_count.toLocaleString()} hands</span>
                <button
                  onClick={() => handleDeleteSession(s.date)}
                  disabled={deleting === s.date}
                  className="text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors disabled:opacity-40"
                >
                  {deleting === s.date ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skeleton while parsing */}
      {isParsing && allHands.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 h-[72px] animate-pulse">
              <div className="h-2.5 w-20 rounded bg-[var(--bg-elevated)] mb-3" />
              <div className="h-5 w-16 rounded bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      {allHands.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animation: 'chart-fadein 0.4s ease' }}>
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
