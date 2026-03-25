import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, ArrowUpRight, ArrowDownUp } from 'lucide-react'
import { useHandStore } from '../store/handStore'
import { useFilterStore } from '../store/filterStore'
import { buildSessions, formatTime, formatDuration, type Session } from '../lib/sessions'

// ── Insights helpers ────────────────────────────────────────────────────────

const HOURS = ['12am–6am', '6am–12pm', '12pm–6pm', '6pm–12am']
function hourBucket(ts: string): number {
  const h = parseInt(ts.slice(11, 13), 10)
  if (h < 6) return 0
  if (h < 12) return 1
  if (h < 18) return 2
  return 3
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function avgBB100(sessions: Session[]): number {
  if (!sessions.length) return 0
  const totalHands = sessions.reduce((s, sess) => s + sess.hands.length, 0)
  if (!totalHands) return 0
  const totalBB = sessions.reduce((s, sess) => s + sess.hands.reduce((a, h) => a + h.netBB, 0), 0)
  return (totalBB / totalHands) * 100
}

// ── Sub-components ──────────────────────────────────────────────────────────

const fmt = (n: number, dp = 2) => `${n >= 0 ? '+' : ''}${n.toFixed(dp)}`

const SummaryCard = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
    <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
    <p className="text-lg font-bold" style={{
      color: positive === undefined ? 'var(--text-primary)' : positive ? 'var(--accent-green)' : 'var(--accent-red)'
    }}>{value}</p>
  </div>
)

interface InsightBarProps {
  label: string
  value: number   // BB/100
  hands: number
  maxAbs: number
}
const InsightBar = ({ label, value, hands, maxAbs }: InsightBarProps) => {
  const pct = maxAbs > 0 ? Math.abs(value) / maxAbs * 100 : 0
  const color = value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 text-[var(--text-muted)]">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4 }} />
      </div>
      <span className="w-14 text-right font-semibold" style={{ color }}>{fmt(value, 1)}</span>
      <span className="w-16 text-right text-[var(--text-muted)]">{hands.toLocaleString()}</span>
    </div>
  )
}

const FilterChip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
      active
        ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-white'
        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
    }`}
  >{label}</button>
)

interface SessionRowProps {
  session: Session
  onOpen: (s: Session) => void
}
const SessionRow = ({ session: s, onOpen }: SessionRowProps) => {
  const profitColor = s.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  const bb100Color  = s.bb100  >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 text-xs hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer group"
      onClick={() => onOpen(s)}
    >
      <span className="w-4 shrink-0" />
      <span className="flex-1 text-[var(--text-muted)]">
        {formatTime(s.startTime)} – {formatTime(s.endTime)}
      </span>
      <span className="w-14 text-[var(--text-muted)] shrink-0">{s.stakes}</span>
      <span className="w-16 text-right text-[var(--text-primary)] shrink-0">{s.hands.length.toLocaleString()}</span>
      <span className="w-20 text-right font-semibold shrink-0" style={{ color: profitColor }}>
        {fmt(s.profit)}$
      </span>
      <span className="w-20 text-right font-semibold shrink-0" style={{ color: bb100Color }}>
        {fmt(s.bb100, 1)}
      </span>
      <span className="w-14 text-right text-[var(--text-muted)] shrink-0">{formatDuration(s.durationMin)}</span>
      <span className="w-16 text-right text-[var(--text-muted)] shrink-0">${s.rake.toFixed(2)}</span>
      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-green)] flex items-center gap-1">
        Analyze <ArrowUpRight size={11} />
      </span>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export const Sessions = () => {
  const allHands   = useHandStore((s) => s.hands)
  const setSession = useFilterStore((s) => s.setSession)
  const navigate   = useNavigate()
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [stakeFilter, setStakeFilter]     = useState<string | null>(null)
  const [dateFrom,    setDateFrom]        = useState('')
  const [dateTo,      setDateTo]          = useState('')
  const [sortBy,      setSortBy]          = useState<'date' | 'profit'>('date')
  const [sortDesc,    setSortDesc]        = useState(true)

  const allSessions = useMemo(() => buildSessions(allHands), [allHands])

  const availableStakes = useMemo(
    () => [...new Set(allSessions.map((s) => s.stakes))].sort(),
    [allSessions]
  )

  const filteredSessions = useMemo(() => {
    let result = allSessions
    if (stakeFilter) result = result.filter((s) => s.stakes === stakeFilter)
    if (dateFrom)    result = result.filter((s) => s.date >= dateFrom)
    if (dateTo)      result = result.filter((s) => s.date <= dateTo)
    if (sortBy === 'profit') result = [...result].sort((a, b) => sortDesc ? b.profit - a.profit : a.profit - b.profit)
    if (sortBy === 'date')   result = [...result].sort((a, b) => sortDesc ? b.startTime.localeCompare(a.startTime) : a.startTime.localeCompare(b.startTime))
    return result
  }, [allSessions, stakeFilter, dateFrom, dateTo, sortBy])

  // Group filtered sessions by date (preserve sort order for profit sort)
  const byDate = useMemo(() => {
    if (sortBy === 'profit') {
      // Each session is its own "group" when sorted by profit
      return filteredSessions.map((s) => [s.date, [s]] as [string, Session[]])
    }
    const map = new Map<string, Session[]>()
    for (const s of filteredSessions) {
      const existing = map.get(s.date)
      if (existing) existing.push(s)
      else map.set(s.date, [s])
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filteredSessions, sortBy])

  // Insights — computed from all sessions (not filtered)
  const insights = useMemo(() => {
    // By hour bucket
    const hourGroups: Session[][] = [[], [], [], []]
    allSessions.forEach((s) => hourGroups[hourBucket(s.startTime)].push(s))

    // By day of week
    const dayGroups: Session[][] = Array.from({ length: 7 }, () => [])
    allSessions.forEach((s) => {
      const dow = new Date(s.date).getDay()
      dayGroups[dow].push(s)
    })

    // By stakes
    const stakesMap = new Map<string, Session[]>()
    allSessions.forEach((s) => {
      if (!stakesMap.has(s.stakes)) stakesMap.set(s.stakes, [])
      stakesMap.get(s.stakes)!.push(s)
    })

    return { hourGroups, dayGroups, stakesMap }
  }, [allSessions])

  const openInAnalytics = (s: Session) => {
    setSession(s.startTime, s.endTime)
    navigate('/analytics')
  }

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      next.has(date) ? next.delete(date) : next.add(date)
      return next
    })
  }

  if (!allHands.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Parse a hand history file on the Dashboard to see sessions.</p>
      </div>
    )
  }

  // Summary totals
  const totProfit = filteredSessions.reduce((s, r) => s + r.profit, 0)
  const totHands  = filteredSessions.reduce((s, r) => s + r.hands.length, 0)
  const totRake   = filteredSessions.reduce((s, r) => s + r.rake, 0)
  const totBB100  = avgBB100(filteredSessions)

  // Insight bars
  const hourBB100s = insights.hourGroups.map((g) => ({ bb: avgBB100(g), hands: g.reduce((a, s) => a + s.hands.length, 0) }))
  const dayBB100s  = insights.dayGroups.map((g) => ({ bb: avgBB100(g), hands: g.reduce((a, s) => a + s.hands.length, 0) }))
  const stakesBB100s = Array.from(insights.stakesMap.entries()).map(([k, v]) => ({ label: k, bb: avgBB100(v), hands: v.reduce((a, s) => a + s.hands.length, 0) }))

  const maxHour   = Math.max(...hourBB100s.map((v) => Math.abs(v.bb)), 0.01)
  const maxDay    = Math.max(...dayBB100s.map((v) => Math.abs(v.bb)), 0.01)
  const maxStakes = Math.max(...stakesBB100s.map((v) => Math.abs(v.bb)), 0.01)

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Sessions"     value={filteredSessions.length.toString()} />
        <SummaryCard label="Total Profit" value={`${totProfit >= 0 ? '+' : ''}$${totProfit.toFixed(2)}`} positive={totProfit >= 0} />
        <SummaryCard label="BB / 100"     value={fmt(totBB100, 1)} positive={totBB100 >= 0} />
        <SummaryCard label="Rake Paid"    value={`$${totRake.toFixed(2)}`} />
      </div>

      {/* Insights */}
      {allSessions.length >= 3 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-4">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Performance Insights</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* By time of day */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Time of Day</p>
                <div className="flex gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="w-14 text-right">BB/100</span>
                  <span className="w-16 text-right">Hands</span>
                </div>
              </div>
              {HOURS.map((label, i) => (
                hourBB100s[i].hands > 0 && (
                  <InsightBar key={label} label={label} value={hourBB100s[i].bb} hands={hourBB100s[i].hands} maxAbs={maxHour} />
                )
              ))}
            </div>

            {/* By day of week */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Day of Week</p>
                <div className="flex gap-2 text-[10px] text-[var(--text-muted)]">
                  <span className="w-14 text-right">BB/100</span>
                  <span className="w-16 text-right">Hands</span>
                </div>
              </div>
              {DAYS.map((label, i) => (
                dayBB100s[i].hands > 0 && (
                  <InsightBar key={label} label={label} value={dayBB100s[i].bb} hands={dayBB100s[i].hands} maxAbs={maxDay} />
                )
              ))}
            </div>

            {/* By stakes */}
            {stakesBB100s.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">By Stakes</p>
                  <div className="flex gap-2 text-[10px] text-[var(--text-muted)]">
                    <span className="w-14 text-right">BB/100</span>
                    <span className="w-16 text-right">Hands</span>
                  </div>
                </div>
                {stakesBB100s.map(({ label, bb, hands }) => (
                  <InsightBar key={label} label={label} value={bb} hands={hands} maxAbs={maxStakes} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters + sort */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 flex flex-wrap items-center gap-4">
        {/* Stakes */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-muted)] mr-1">Stakes</span>
          <FilterChip label="All" active={stakeFilter === null} onClick={() => setStakeFilter(null)} />
          {availableStakes.map((s) => (
            <FilterChip key={s} label={s} active={stakeFilter === s} onClick={() => setStakeFilter(stakeFilter === s ? null : s)} />
          ))}
        </div>

        <div className="w-px h-5 bg-[var(--border)]" />

        {/* Date range */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-green)]" />
          <span>→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-green)]" />
        </div>

        {/* Clear */}
        {(stakeFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setStakeFilter(null); setDateFrom(''); setDateTo('') }}
            className="ml-auto text-xs text-[var(--accent-red)] hover:opacity-75 transition-opacity"
          >Clear filters</button>
        )}
      </div>

      {/* Session tree */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
          <span className="w-4 shrink-0" />
          <button
            className="flex-1 flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors"
            onClick={() => { setSortBy('date'); setSortDesc(sortBy === 'date' ? !sortDesc : true) }}
          >
            Date / Time
            <ArrowDownUp size={10} className={sortBy === 'date' ? 'text-[var(--accent-green)]' : ''} />
          </button>
          <span className="w-14 shrink-0">Stakes</span>
          <span className="w-16 text-right shrink-0">Hands</span>
          <button
            className="w-20 flex items-center justify-end gap-1 hover:text-[var(--text-primary)] transition-colors"
            onClick={() => { setSortBy('profit'); setSortDesc(sortBy === 'profit' ? !sortDesc : true) }}
          >
            Profit
            <ArrowDownUp size={10} className={sortBy === 'profit' ? 'text-[var(--accent-green)]' : ''} />
          </button>
          <span className="w-20 text-right shrink-0">BB / 100</span>
          <span className="w-14 text-right shrink-0">Duration</span>
          <span className="w-16 text-right shrink-0">Rake</span>
        </div>

        {byDate.length === 0 && (
          <p className="px-4 py-6 text-xs text-[var(--text-muted)] text-center">No sessions match the current filter.</p>
        )}

        {byDate.map(([date, sessions]) => {
          const isExpanded  = expandedDates.has(date)
          const dayProfit   = sessions.reduce((s, r) => s + r.profit, 0)
          const dayHands    = sessions.reduce((s, r) => s + r.hands.length, 0)
          const dayDuration = sessions.reduce((s, r) => s + r.durationMin, 0)
          const dayRake     = sessions.reduce((s, r) => s + r.rake, 0)
          const dayBB100    = avgBB100(sessions)
          const profitColor = dayProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
          const bb100Color  = dayBB100  >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
          const multiStakes = [...new Set(sessions.map((s) => s.stakes))]

          return (
            <div key={`${date}-${sessions[0].id}`} className="border-b border-[var(--border)] last:border-b-0">
              {/* Date header row — aligned with same columns as session rows */}
              <button
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                onClick={() => toggleDate(date)}
              >
                <span className="w-4 shrink-0">
                  {isExpanded
                    ? <ChevronDown size={13} className="text-[var(--text-muted)]" />
                    : <ChevronRight size={13} className="text-[var(--text-muted)]" />
                  }
                </span>
                {/* Date — takes the "time" column width */}
                <span className="flex-1 text-xs font-semibold text-[var(--text-primary)]">{date}</span>
                {/* Stakes — same column */}
                <span className="w-14 shrink-0 text-xs text-[var(--text-muted)]">
                  {multiStakes.length === 1 ? multiStakes[0] : 'Mixed'}
                </span>
                {/* Hands */}
                <span className="w-16 shrink-0 text-right text-xs text-[var(--text-muted)]">
                  {dayHands.toLocaleString()}
                </span>
                {/* Profit */}
                <span className="w-20 shrink-0 text-right text-xs font-semibold" style={{ color: profitColor }}>
                  {fmt(dayProfit)}$
                </span>
                {/* BB/100 */}
                <span className="w-20 shrink-0 text-right text-xs font-semibold" style={{ color: bb100Color }}>
                  {fmt(dayBB100, 1)}
                </span>
                {/* Duration */}
                <span className="w-14 shrink-0 text-right text-xs text-[var(--text-muted)]">
                  {formatDuration(dayDuration)}
                </span>
                {/* Rake */}
                <span className="w-16 shrink-0 text-right text-xs text-[var(--text-muted)]">
                  ${dayRake.toFixed(2)}
                </span>
                {sessions.length > 1 && (
                  <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                    {sessions.length} sessions
                  </span>
                )}
              </button>

              {/* Session rows */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--bg-elevated)]/30">
                  {sessions.map((s) => (
                    <SessionRow key={s.id} session={s} onOpen={openInAnalytics} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-[var(--text-muted)] text-center">
        Click a session to open it in Analytics · Sessions split by gaps &gt; 1 hour
      </p>
    </div>
  )
}
