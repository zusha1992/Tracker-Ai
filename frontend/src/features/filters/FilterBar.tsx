import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { useFilterStore } from '../../store/filterStore'
import { useHandStore } from '../../store/handStore'
import { CardSlotsFilter } from './CardSlotsFilter'
import { cn } from '../../lib/cn'

const POSITIONS = ['BTN', 'CO', 'HJ', 'UTG', 'BB', 'SB']
const POT_TYPES: { value: string; label: string }[] = [
  { value: 'single-raise', label: 'Single Raise' },
  { value: '3bet', label: '3-Bet' },
  { value: '4bet+', label: '4-Bet+' },
]

// ── small reusables ────────────────────────────────────────────────────────

const Chip = ({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      'px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors select-none',
      active
        ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-white'
        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)]'
    )}
  >
    {label}
  </button>
)

const SelectChip = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'appearance-none pl-2.5 pr-6 py-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer',
        value !== 'all'
          ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-white'
          : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-surface)] hover:border-[var(--text-muted)]'
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
  </div>
)

// ── toggle helpers ─────────────────────────────────────────────────────────

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

// ── main component ─────────────────────────────────────────────────────────

export const FilterBar = ({ count }: { count: number }) => {
  const f = useFilterStore()
  const allHands = useHandStore((s) => s.hands)
  const [showExtra, setShowExtra] = useState(false)

  // Derive available stakes from loaded hands
  const availableStakes = [...new Set(allHands.map((h) => h.stakes))].sort()

  const activeCount = [
    f.positions.length > 0,
    f.stakes.length > 0,
    f.potTypes.length > 0,
    f.multiway !== null,
    f.result !== 'all',
    f.showdown !== 'all',
    f.dateFrom !== null,
    f.dateTo !== null,
    f.holeCardsFilter.length > 0,
    f.boardFilter.length > 0,
  ].filter(Boolean).length


  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 space-y-3">
      {/* Row 1 */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Position */}
        <div className="flex gap-1">
          {POSITIONS.map((p) => (
            <Chip
              key={p}
              label={p}
              active={f.positions.includes(p)}
              onClick={() => f.setPositions(toggle(f.positions, p))}
            />
          ))}
        </div>

        <div className="w-px h-5 bg-[var(--border)]" />

        {/* Stakes */}
        {availableStakes.map((s) => (
          <Chip
            key={s}
            label={s}
            active={f.stakes.includes(s)}
            onClick={() => f.setStakes(toggle(f.stakes, s))}
          />
        ))}

        <div className="w-px h-5 bg-[var(--border)]" />

        {/* Pot type */}
        {POT_TYPES.map((pt) => (
          <Chip
            key={pt.value}
            label={pt.label}
            active={f.potTypes.includes(pt.value)}
            onClick={() => f.setPotTypes(toggle(f.potTypes, pt.value))}
          />
        ))}

        <div className="w-px h-5 bg-[var(--border)]" />

        {/* Multiway */}
        <Chip
          label="Multiway"
          active={f.multiway === true}
          onClick={() => f.setMultiway(f.multiway === true ? null : true)}
        />

        <div className="w-px h-5 bg-[var(--border)]" />

        {/* Result */}
        <SelectChip
          label="Result"
          value={f.result}
          options={[
            { value: 'all', label: 'All results' },
            { value: 'won', label: 'Won' },
            { value: 'lost', label: 'Lost' },
          ]}
          onChange={(v) => f.setResult(v as any)}
        />

        {/* Showdown */}
        <SelectChip
          label="Showdown"
          value={f.showdown}
          options={[
            { value: 'all', label: 'All' },
            { value: 'yes', label: 'Showdown' },
            { value: 'no', label: 'No showdown' },
          ]}
          onChange={(v) => f.setShowdown(v as any)}
        />

        {/* Extra toggle */}
        <button
          onClick={() => setShowExtra((v) => !v)}
          className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
        >
          Date & Cards
          <ChevronDown size={12} className={cn('transition-transform', showExtra && 'rotate-180')} />
        </button>
      </div>

      {/* Row 2 — date & cards */}
      {showExtra && (
        <div className="space-y-3 pt-2 border-t border-[var(--border)]">
          {/* Date range */}
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="w-20 shrink-0">Date range</span>
            <input
              type="date"
              value={f.dateFrom ?? ''}
              onChange={(e) => f.setDateFrom(e.target.value || null)}
              className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]
                text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-green)]"
            />
            <span>→</span>
            <input
              type="date"
              value={f.dateTo ?? ''}
              onChange={(e) => f.setDateTo(e.target.value || null)}
              className="px-2 py-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]
                text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-green)]"
            />
          </div>

          {/* Hole cards */}
          <CardSlotsFilter
            label="Hole cards"
            selected={f.holeCardsFilter}
            maxCards={2}
            onChange={f.setHoleCardsFilter}
          />

          <CardSlotsFilter
            label="Board"
            selected={f.boardFilter}
            maxCards={5}
            onChange={f.setBoardFilter}
          />
        </div>
      )}

      {/* Summary row */}
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          <strong className="text-[var(--text-primary)]">{count.toLocaleString()}</strong> hands
          {activeCount > 0 && ` · ${activeCount} filter${activeCount > 1 ? 's' : ''} active`}
        </span>
        {activeCount > 0 && (
          <button
            onClick={f.clearAll}
            className="flex items-center gap-1 text-[var(--accent-red)] hover:opacity-75 transition-opacity"
          >
            <X size={11} />
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
