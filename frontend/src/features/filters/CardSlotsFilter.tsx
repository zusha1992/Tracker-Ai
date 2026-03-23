const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
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
