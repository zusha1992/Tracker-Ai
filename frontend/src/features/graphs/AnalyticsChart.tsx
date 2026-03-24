import { useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import { getChartColors } from '../../theme/tokens'
import { HandDetailModal } from '../hands/HandDetailModal'
import type { Hand } from '../../types/hand'

export interface MergedPoint {
  index: number
  hand: Hand
  net: number
  showdown: number
  nonShowdown: number
  ev: number
  rake: number
}

export type ChartId = 'all' | 'net' | 'showdown' | 'nonShowdown' | 'ev' | 'rake'

type ColorKey = 'green' | 'blue' | 'red' | 'orange' | 'gray'

interface SeriesMeta {
  key: keyof Pick<MergedPoint, 'net' | 'showdown' | 'nonShowdown' | 'ev' | 'rake'>
  label: string
  colorKey: ColorKey
}

const SERIES: SeriesMeta[] = [
  { key: 'net',         label: 'Net Winnings',  colorKey: 'green'  },
  { key: 'showdown',    label: 'Showdown',       colorKey: 'blue'   },
  { key: 'nonShowdown', label: 'Non-Showdown',   colorKey: 'red'    },
  { key: 'ev',          label: 'EV',             colorKey: 'orange' },
  { key: 'rake',        label: 'Rake Paid',      colorKey: 'gray'   },
]

interface TooltipProps {
  active?: boolean
  payload?: { dataKey: string; value: number; color: string; payload: MergedPoint }[]
  activeChart: ChartId
  hidden: Set<string>
}

const CustomTooltip = ({ active, payload, activeChart, hidden }: TooltipProps) => {
  if (!active || !payload?.length) return null
  const point = payload[0].payload   // direct from Recharts — no index lookup needed
  if (!point) return null
  const h = point.hand

  const visiblePayload = (payload ?? []).filter((p) => {
    if (hidden.has(p.dataKey)) return false
    if (activeChart !== 'all' && p.dataKey !== activeChart) return false
    return true
  })

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs shadow-lg min-w-[160px]">
      <p className="font-semibold text-[var(--text-primary)] mb-1">Hand #{h.handId.slice(-6)}</p>
      <p className="text-[var(--text-muted)]">{h.stakes} · {h.position ?? '?'}</p>
      {h.holeCards.length > 0 && (
        <p className="text-[var(--text-muted)]">{h.holeCards.join(' ')}</p>
      )}
      <p
        className="font-bold mt-1"
        style={{ color: h.netWinnings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
      >
        {h.netWinnings >= 0 ? '+' : ''}${h.netWinnings.toFixed(2)}
      </p>
      <div className="mt-1 space-y-0.5">
        {visiblePayload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {SERIES.find((s) => s.key === p.dataKey)?.label}: ${p.value.toFixed(2)}
          </p>
        ))}
      </div>
    </div>
  )
}

interface Props {
  points: MergedPoint[]
  activeChart: ChartId
}

export const AnalyticsChart = ({ points, activeChart }: Props) => {
  const colors = getChartColors()
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const toggleSeries = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const openHand = (point: MergedPoint) => {
    const arrayIdx = points.findIndex((p) => p.index === point.index)
    if (arrayIdx !== -1) {
      setSelectedHand(point.hand)
      setSelectedIdx(arrayIdx)
    }
  }

  const handlePrev =
    selectedIdx !== null && selectedIdx > 0
      ? () => { setSelectedHand(points[selectedIdx - 1].hand); setSelectedIdx(selectedIdx - 1) }
      : undefined

  const handleNext =
    selectedIdx !== null && selectedIdx < points.length - 1
      ? () => { setSelectedHand(points[selectedIdx + 1].hand); setSelectedIdx(selectedIdx + 1) }
      : undefined

  const colorMap: Record<ColorKey, string> = {
    green:  colors.green,
    blue:   colors.blue,
    red:    colors.red,
    orange: colors.orange,
    gray:   colors.gray,
  }

  // In single-tab mode: show only that series (ignoring toggle state)
  // In all mode: show series that aren't hidden
  const visibleSeries = activeChart === 'all'
    ? SERIES.filter((s) => !hidden.has(s.key))
    : SERIES.filter((s) => s.key === activeChart)

  // Legend always shows all series so you can toggle in "all" mode
  const legendSeries = activeChart === 'all' ? SERIES : SERIES.filter((s) => s.key === activeChart)

  // Clean round ticks snapped to nearest existing point.index (data may be downsampled)
  const xTicks = (() => {
    if (!points.length) return []
    const maxIdx = points[points.length - 1].index
    const raw = maxIdx / 6
    const mag = Math.pow(10, Math.floor(Math.log10(raw)))
    const step = Math.ceil(raw / mag) * mag
    const desired: number[] = []
    for (let v = step; v <= maxIdx; v += step) desired.push(Math.round(v))
    // Snap each desired value to the nearest actual index in the data
    return [...new Set(
      desired.map(t => points.reduce((b, p) => Math.abs(p.index - t) < Math.abs(b.index - t) ? p : b).index)
    )]
  })()

  return (
    <>
      <div
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4"
        style={{ animation: 'chart-fadein 0.3s ease' }}
      >
        {/* Legend / toggles */}
        <div className="flex flex-wrap gap-3 mb-4 pl-1">
          {legendSeries.map((s) => {
            const isHidden = activeChart === 'all' && hidden.has(s.key)
            return (
              <button
                key={s.key}
                onClick={() => activeChart === 'all' && toggleSeries(s.key)}
                className="flex items-center gap-1.5 text-xs transition-opacity"
                style={{
                  opacity: isHidden ? 0.35 : 1,
                  cursor: activeChart === 'all' ? 'pointer' : 'default',
                }}
                title={activeChart === 'all' ? (isHidden ? 'Show' : 'Hide') : undefined}
              >
                <span
                  className="inline-block w-5 rounded-full transition-all"
                  style={{
                    height: isHidden ? '1px' : '2px',
                    background: colorMap[s.colorKey],
                  }}
                />
                <span style={{ color: isHidden ? 'var(--text-muted)' : colorMap[s.colorKey] }}>
                  {s.label}
                </span>
              </button>
            )
          })}
        </div>

        <ResponsiveContainer width="100%" height={380} style={{ overflow: 'visible' }}>
          <LineChart
            data={points}
            margin={{ top: 4, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid stroke={colors.border} strokeDasharray="3 3" vertical={true} />

            <XAxis
              dataKey="index"
              tick={{ fontSize: 11, fill: colors.muted, fontWeight: 500 }}
              axisLine={{ stroke: colors.border }}
              tickLine={false}
              ticks={xTicks}
              tickFormatter={(v) => Number(v).toLocaleString()}
            />
            <YAxis
              orientation="left"
              tick={{ fontSize: 11, fill: colors.muted, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickCount={7}
              tickFormatter={(v) => `$${Math.round(v).toLocaleString()}`}
              width={75}
            />

            <Tooltip
              content={<CustomTooltip activeChart={activeChart} hidden={hidden} />}
              isAnimationActive={false}
              allowEscapeViewBox={{ x: false, y: false }}
              wrapperStyle={{ zIndex: 50 }}
            />

            <ReferenceLine y={0} stroke={colors.muted} strokeWidth={1} />

            {visibleSeries.map((s, si) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={colorMap[s.colorKey]}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                activeDot={(dotProps: any) => {
                  const point: MergedPoint = dotProps.payload
                  // Only the first visible series renders the clickable dot to avoid stacking
                  if (si !== 0) return <circle cx={dotProps.cx} cy={dotProps.cy} r={0} />
                  return (
                    <circle
                      cx={dotProps.cx}
                      cy={dotProps.cy}
                      r={6}
                      fill={colorMap[s.colorKey]}
                      stroke={colors.surface}
                      strokeWidth={2}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); openHand(point) }}
                    />
                  )
                }}
              />
            ))}

          </LineChart>
        </ResponsiveContainer>
      </div>

      {selectedHand && (
        <HandDetailModal
          hand={selectedHand}
          onClose={() => { setSelectedHand(null); setSelectedIdx(null) }}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  )
}
