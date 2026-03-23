import { useMemo, useState, useTransition, useDeferredValue } from 'react'
import { useHandStore } from '../store/handStore'
import { useThemeStore } from '../store/themeStore'
import { getChartColors } from '../theme/tokens'
import { AnalyticsChart, type ChartId, type MergedPoint } from '../features/graphs/AnalyticsChart'
import { cn } from '../lib/cn'
import type { Hand } from '../types/hand'

const TABS: { id: ChartId; label: string }[] = [
  { id: 'all',         label: 'All' },
  { id: 'net',         label: 'Net Winnings' },
  { id: 'showdown',    label: 'Showdown' },
  { id: 'nonShowdown', label: 'Non-Showdown' },
  { id: 'ev',          label: 'EV' },
  { id: 'rake',        label: 'Rake' },
]

const MAX_POINTS = 1000

function buildMergedPoints(hands: Hand[]): MergedPoint[] {
  let net = 0, showdown = 0, nonShowdown = 0, ev = 0, rake = 0
  const all = hands.map((h, i) => {
    net         = Math.round((net         + h.netWinnings)                         * 100) / 100
    showdown    = Math.round((showdown    + (h.wentToShowdown  ? h.netWinnings : 0)) * 100) / 100
    nonShowdown = Math.round((nonShowdown + (!h.wentToShowdown ? h.netWinnings : 0)) * 100) / 100
    ev          = Math.round((ev          + (h.evWinnings ?? h.netWinnings))        * 100) / 100
    rake        = Math.round((rake        + h.rake)                                * 100) / 100
    return { index: i + 1, hand: h, net, showdown, nonShowdown, ev, rake }
  })

  // Downsample for rendering performance — keep every Nth point + always keep last
  if (all.length <= MAX_POINTS) return all
  const step = Math.ceil(all.length / MAX_POINTS)
  const sampled = all.filter((_, i) => i % step === 0)
  if (sampled[sampled.length - 1] !== all[all.length - 1]) sampled.push(all[all.length - 1])
  return sampled
}

export const Analytics = () => {
  const allHands = useHandStore((s) => s.hands)
  const isDark = useThemeStore((s) => s.isDark)
  getChartColors(isDark)
  const [activeChart, setActiveChart] = useState<ChartId>('all')
  const [isPending, startTransition] = useTransition()

  const points = useMemo(() => buildMergedPoints(allHands), [allHands])
  const deferredPoints = useDeferredValue(points)

  if (!allHands.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Parse a hand history file on the Dashboard to see charts.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab selector */}
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => startTransition(() => setActiveChart(id))}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
              activeChart === id
                ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart — fade while switching tabs */}
      <div style={{ opacity: isPending ? 0.4 : 1, transition: 'opacity 0.15s ease' }}>
        <AnalyticsChart points={deferredPoints} activeChart={activeChart} />
      </div>
    </div>
  )
}
