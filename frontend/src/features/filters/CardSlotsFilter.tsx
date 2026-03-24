import { useState } from 'react'

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

// Two independent card slots — allows same rank twice (e.g. JJ)
function TwoSlotPicker({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [pickingSlot, setPickingSlot] = useState<0 | 1 | null>(null)

  const slot0 = selected[0] ?? null
  const slot1 = selected[1] ?? null

  const pickRank = (rank: string) => {
    if (pickingSlot === null) return
    const next: (string | null)[] = [slot0, slot1]
    next[pickingSlot] = rank
    onChange(next.filter(Boolean) as string[])
    setPickingSlot(null)
  }

  const clearSlot = (i: 0 | 1) => {
    const next: (string | null)[] = [slot0, slot1]
    next[i] = null
    onChange(next.filter(Boolean) as string[])
    setPickingSlot(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {([0, 1] as const).map((i) => {
          const val = i === 0 ? slot0 : slot1
          const isActive = pickingSlot === i
          return (
            <div key={i} className="relative">
              <button
                onClick={() => setPickingSlot(isActive ? null : i)}
                className={`w-10 h-14 rounded-lg border-2 flex items-center justify-center text-sm font-bold transition-colors
                  bg-[var(--bg-elevated)]
                  ${isActive
                    ? 'border-[var(--accent-green)] text-[var(--text-primary)]'
                    : val
                      ? 'border-[var(--accent-green)] text-[var(--accent-green)]'
                      : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-green)]'
                  }`}
              >
                {val ?? '?'}
              </button>
              {val && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearSlot(i) }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--accent-red)] text-white text-[10px] flex items-center justify-center leading-none"
                >
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {pickingSlot !== null && (
        <div className="flex flex-wrap gap-1">
          {RANKS.map((rank) => (
            <button
              key={rank}
              onClick={() => pickRank(rank)}
              className="w-8 h-8 rounded-md text-xs font-bold border border-[var(--border)]
                text-[var(--text-muted)] hover:border-[var(--accent-green)] hover:text-[var(--text-primary)] transition-colors"
            >
              {rank}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function CardSlotsFilter({
  label,
  selected,
  maxCards,
  onChange,
}: {
  label: string
  selected: string[]
  maxCards: number
  onChange: (ranks: string[]) => void
}) {
  if (maxCards === 2) {
    return (
      <div className="flex items-start gap-3">
        <span className="text-xs text-[var(--text-muted)] shrink-0 w-20 pt-3">{label}</span>
        <TwoSlotPicker selected={selected} onChange={onChange} />
      </div>
    )
  }

  // Board: rank chip grid (unchanged)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--text-muted)] shrink-0 w-20">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {RANKS.map((rank) => {
          const active = selected.includes(rank)
          const disabled = !active && selected.length >= maxCards
          return (
            <button
              key={rank}
              disabled={disabled}
              onClick={() => onChange(toggle(selected, rank))}
              className={`w-8 h-8 rounded-md text-xs font-bold border transition-colors
                ${active
                  ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-white'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent-green)] hover:text-[var(--text-primary)]'}
                disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {rank}
            </button>
          )
        })}
      </div>
      {selected.length > 0 && (
        <button
          onClick={() => onChange([])}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors ml-1"
        >
          ✕
        </button>
      )}
    </div>
  )
}
