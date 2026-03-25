import { useMemo, useEffect, useState } from 'react'
import { Loader2, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useHandStore } from '../store/handStore'
import { usePoolStatsStore } from '../store/poolStatsStore'
import { useFilteredHands } from '../hooks/useFilteredHands'
import { getChartColors } from '../theme/tokens'
import { FileUpload } from '../features/upload/FileUpload'
import { FileStatus } from '../features/upload/FileStatus'
import { CumulativeChart } from '../features/graphs/CumulativeChart'
import { buildSessions, formatTime, formatDuration } from '../lib/sessions'
import { DashboardAIBar } from '../components/ChatAgent'

const API = 'http://localhost:8000'

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  if (h >= 18 && h < 22) return 'Good evening'
  return 'Good night'
}

interface SavedSession { date: string; stakes: string; hand_count: number }

export const Dashboard = () => {
  const rawFiles      = useHandStore((s) => s.rawFiles)
  const isParsing     = useHandStore((s) => s.isParsing)
  const allHands      = useHandStore((s) => s.hands)
  const hands         = useFilteredHands()
  const colors        = getChartColors()
  const parseError    = useHandStore((s) => s.parseError)
  const setIsParsing  = useHandStore((s) => s.setIsParsing)
  const setHands      = useHandStore((s) => s.setHands)
  const setParseError = useHandStore((s) => s.setParseError)
  const setPoolStats  = usePoolStatsStore((s) => s.setStats)
  const clearPoolStats= usePoolStatsStore((s) => s.clear)

  const hasData = allHands.length > 0

  const [savedSessions,   setSavedSessions]   = useState<SavedSession[]>([])
  const [deleting,        setDeleting]         = useState<string | null>(null)
  const [importOpen,      setImportOpen]       = useState(!hasData)
  const [savedOpen,       setSavedOpen]        = useState(false)

  // Open import panel when there's no data yet
  useEffect(() => { if (!hasData) setImportOpen(true) }, [hasData])

  useEffect(() => {
    fetch(`${API}/api/sessions`)
      .then((r) => r.json())
      .then((d) => setSavedSessions(d.sessions ?? []))
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

  // Chart points
  const netPoints = useMemo(() => {
    let cum = 0
    return hands.map((h, i) => ({
      index: i + 1,
      cumulative: Math.round((cum += h.netWinnings) * 100) / 100,
      hand: h,
    }))
  }, [hands])

  // Overall stats
  const totalProfit = hands.reduce((s, h) => s + h.netWinnings, 0)
  const totalRake   = hands.reduce((s, h) => s + h.rake, 0)
  const totalBB     = hands.reduce((s, h) => s + h.netBB, 0)
  const bb100       = hands.length > 0 ? (totalBB / hands.length) * 100 : 0

  // Sessions for last session + current run cards
  const sessions = useMemo(() => buildSessions(allHands), [allHands])
  const lastSession = sessions[0] ?? null
  const recentSessions = sessions.slice(0, 5)
  const runProfit = recentSessions.reduce((s, sess) => s + sess.profit, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {getGreeting()}, Noam
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Here's your performance overview.</p>
      </div>

      {/* ── AI Bar ── */}
      <DashboardAIBar />

      {/* ── Chart ── */}
      {hasData ? (
        <CumulativeChart
          points={netPoints}
          color={colors.green}
          title="Net Winnings"
          height={220}
          showBrush={false}
        />
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Welcome to TrackerAI</p>
          <p className="text-xs text-[var(--text-muted)]">Import your hand history below to get started.</p>
        </div>
      )}

      {/* ── Stat cards ── */}
      {isParsing && !hasData ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 h-[72px] animate-pulse">
              <div className="h-2.5 w-20 rounded bg-[var(--bg-elevated)] mb-3" />
              <div className="h-5 w-16 rounded bg-[var(--bg-elevated)]" />
            </div>
          ))}
        </div>
      ) : hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Hands"  value={hands.length.toLocaleString()} />
          <StatCard label="Total Profit" value={`${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`} positive={totalProfit >= 0} />
          <StatCard label="BB / 100"     value={`${bb100 >= 0 ? '+' : ''}${bb100.toFixed(1)}`}              positive={bb100 >= 0} />
          <StatCard label="Rake Paid"    value={`$${totalRake.toFixed(2)}`} />
        </div>
      )}

      {/* ── Last session + Current run ── */}
      {hasData && sessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Last Session */}
          {lastSession && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Last Session</p>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{lastSession.date}</span>
                <span className="text-xs text-[var(--text-muted)]">{lastSession.stakes}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {formatTime(lastSession.startTime)} – {formatTime(lastSession.endTime)}
                <span className="mx-1.5">·</span>
                {lastSession.hands.length.toLocaleString()} hands
                <span className="mx-1.5">·</span>
                {formatDuration(lastSession.durationMin)}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className="text-lg font-bold"
                  style={{ color: lastSession.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
                >
                  {lastSession.profit >= 0 ? '+' : ''}${lastSession.profit.toFixed(2)}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: lastSession.bb100 >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
                >
                  {lastSession.bb100 >= 0 ? '+' : ''}{lastSession.bb100.toFixed(1)} BB/100
                </span>
              </div>
            </div>
          )}

          {/* Current Run */}
          {recentSessions.length > 0 && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-2">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                Recent Run · Last {recentSessions.length} Session{recentSessions.length > 1 ? 's' : ''}
              </p>
              {/* Session dots */}
              <div className="flex items-center gap-2">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    title={`${s.date}: ${s.profit >= 0 ? '+' : ''}$${s.profit.toFixed(2)}`}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: s.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      opacity: 0.85,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'white' }}>
                      {s.profit >= 0 ? '+' : '–'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-lg font-bold"
                  style={{ color: runProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
                >
                  {runProfit >= 0 ? '+' : ''}${runProfit.toFixed(2)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">combined profit</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Import hands (collapsible) ── */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
        <button
          onClick={() => setImportOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Plus size={14} />
            Import Hands
          </span>
          {importOpen
            ? <ChevronDown size={14} className="text-[var(--text-muted)]" />
            : <ChevronRight size={14} className="text-[var(--text-muted)]" />
          }
        </button>

        {importOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-[var(--border)]">
            <div className="pt-3">
              {rawFiles.length > 0 && <FileStatus />}
              <FileUpload />
            </div>

            {rawFiles.length > 0 && (
              <button
                onClick={handleParse}
                disabled={isParsing}
                className="relative w-full py-2.5 rounded-lg text-sm font-semibold overflow-hidden
                  bg-[var(--accent-green)] text-white hover:opacity-90
                  disabled:cursor-not-allowed transition-opacity"
              >
                {isParsing && (
                  <span
                    className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_ease-in-out_infinite]"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)' }}
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
              <div className="rounded-lg border border-[var(--accent-red)] bg-[var(--bg-surface)] p-3 text-xs text-[var(--accent-red)]">
                {parseError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Saved data (collapsible) ── */}
      {savedSessions.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
          <button
            onClick={() => setSavedOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Saved Data
              <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                ({savedSessions.length} date{savedSessions.length > 1 ? 's' : ''})
              </span>
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); handleClearAll() }}
                className="text-xs text-[var(--accent-red)] hover:opacity-75 transition-opacity"
              >
                Clear all
              </button>
              {savedOpen
                ? <ChevronDown size={14} className="text-[var(--text-muted)]" />
                : <ChevronRight size={14} className="text-[var(--text-muted)]" />
              }
            </div>
          </button>

          {savedOpen && (
            <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
              {savedSessions.map((s) => (
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
          )}
        </div>
      )}

    </div>
  )
}

const StatCard = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-4">
    <p className="text-xs text-[var(--text-muted)] mb-0.5">{label}</p>
    <p className="text-base font-bold" style={{
      color: positive === undefined ? 'var(--text-primary)' : positive ? 'var(--accent-green)' : 'var(--accent-red)'
    }}>
      {value}
    </p>
  </div>
)
