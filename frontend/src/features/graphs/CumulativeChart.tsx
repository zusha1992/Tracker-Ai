import { useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Brush,
  CartesianGrid,
} from 'recharts'
import { useThemeStore } from '../../store/themeStore'
import { getChartColors } from '../../theme/tokens'
import { HandDetailModal } from '../hands/HandDetailModal'
import type { Hand } from '../../types/hand'

export interface ChartPoint {
  index: number       // 1-based position in this chart's point array
  cumulative: number
  hand: Hand
}

interface Props {
  points: ChartPoint[]
  color: string
  title: string
  height?: number
  showBrush?: boolean
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const h = p.hand
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
      <p className="text-[var(--text-muted)] mt-0.5">
        Running: {p.cumulative >= 0 ? '+' : ''}${p.cumulative.toFixed(2)}
      </p>
    </div>
  )
}

export const CumulativeChart = ({ points, color, title, height = 260, showBrush = true }: Props) => {
  const isDark = useThemeStore((s) => s.isDark)
  const colors = getChartColors(isDark)
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null)
  const [selectedArrayIdx, setSelectedArrayIdx] = useState<number | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      const point = data.activePayload[0].payload
      setSelectedHand(point.hand)
      setSelectedArrayIdx(point.index - 1)
    }
  }

  const handlePrev =
    selectedArrayIdx !== null && selectedArrayIdx > 0
      ? () => {
          const prev = points[selectedArrayIdx - 1]
          setSelectedHand(prev.hand)
          setSelectedArrayIdx(selectedArrayIdx - 1)
        }
      : undefined

  const handleNext =
    selectedArrayIdx !== null && selectedArrayIdx < points.length - 1
      ? () => {
          const next = points[selectedArrayIdx + 1]
          setSelectedHand(next.hand)
          setSelectedArrayIdx(selectedArrayIdx + 1)
        }
      : undefined

  const gradientId = `grad-${title.replace(/\s+/g, '')}`

  if (!points.length) {
    return (
      <div
        className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4"
        style={{ height: height + 60 }}
      >
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{title}</p>
        <p className="text-xs text-[var(--text-muted)]">No data</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">{title}</p>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={points}
            onClick={handleClick}
            margin={{ top: 4, right: 8, left: 0, bottom: showBrush ? 8 : 0 }}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke={colors.border} strokeDasharray="3 3" />

            <XAxis
              dataKey="index"
              tick={{ fontSize: 10, fill: colors.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `#${v}`}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: colors.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v}`}
              width={55}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine y={0} stroke={colors.muted} strokeDasharray="4 4" strokeWidth={1} />

            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: colors.surface, strokeWidth: 2 }}
            />

            {showBrush && (
              <Brush
                dataKey="index"
                height={22}
                stroke={colors.border}
                fill={colors.elevated}
                travellerWidth={6}
                tickFormatter={(v) => `#${v}`}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {selectedHand && (
        <HandDetailModal
          hand={selectedHand}
          onClose={() => { setSelectedHand(null); setSelectedArrayIdx(null) }}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </>
  )
}
