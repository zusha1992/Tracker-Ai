import { useState } from 'react'
import { X } from 'lucide-react'
import { useFilterStore } from '../../store/filterStore'
import { useHandStore } from '../../store/handStore'
import { CardSlotsFilter } from './CardSlotsFilter'
import { cn } from '../../lib/cn'

const POSITIONS = ['BTN', 'CO', 'HJ', 'UTG', 'BB', 'SB']
const POT_TYPES = [
  { value: 'single-raise', label: 'Single Raise' },
  { value: '3bet', label: '3-Bet' },
  { value: '4bet+', label: '4-Bet+' },
]

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors select-none',
        active
          ? 'bg-[var(--accent-green)] border-[var(--accent-green)] text-white'
          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]'
      )}
    >
      {label}
    </button>
  )
}

type Tab = 'position' | 'stakes' | 'potType' | 'result' | 'date' | 'cards' | null

function tabHasFilter(tab: Tab, f: ReturnType<typeof useFilterStore>): boolean {
  if (tab === 'position') return f.positions.length > 0
  if (tab === 'stakes')   return f.stakes.length > 0
  if (tab === 'potType')  return f.potTypes.length > 0 || f.multiway !== null
  if (tab === 'result')   return f.result !== 'all' || f.showdown !== 'all'
  if (tab === 'date')     return f.dateFrom !== null || f.dateTo !== null
  if (tab === 'cards')    return f.holeCardsFilter.length > 0 || f.boardFilter.length > 0
  return false
}

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: 'position', label: 'Position' },
  { id: 'stakes',   label: 'Stakes' },
  { id: 'potType',  label: 'Pot Type' },
  { id: 'result',   label: 'Result' },
  { id: 'date',     label: 'Date' },
  { id: 'cards',    label: 'Cards' },
]

export const FilterBar = ({ count }: { count: number }) => {
  const f = useFilterStore()
  const allHands = useHandStore((s) => s.hands)
  const [activeTab, setActiveTab] = useState<Tab>(null)

  const availableStakes = [...new Set(allHands.map((h) => h.stakes))].sort()

  const totalActive = NAV_TABS.filter((t) => tabHasFilter(t.id, f)).length

  const handleTabClick = (id: Tab) => {
    setActiveTab((prev) => (prev === id ? null : id))
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] overflow-visible">
      {/* Nav row */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mr-2">
          Filters
        </span>
        <div className="w-px h-4 bg-[var(--border)] mr-1" />
        {NAV_TABS.map(({ id, label }) => {
          const hasFilter = tabHasFilter(id, f)
          const isActive = activeTab === id
          return (
            <button
              key={id}
              onClick={() => handleTabClick(id)}
              className={cn(
                'relative px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                isActive
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              )}
            >
              {label}
              {hasFilter && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent-green)]" />
              )}
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-3 text-xs text-[var(--text-muted)]">
          <span>
            <strong className="text-[var(--text-primary)]">{count.toLocaleString()}</strong> hands
          </span>
          {totalActive > 0 && (
            <button
              onClick={() => { f.clearAll(); setActiveTab(null) }}
              className="flex items-center gap-1 text-[var(--accent-red)] hover:opacity-75 transition-opacity"
            >
              <X size={11} />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Panel */}
      {activeTab && (
        <div className="px-4 py-3">
          {activeTab === 'position' && (
            <div className="flex flex-wrap gap-1.5">
              {POSITIONS.map((p) => (
                <Chip key={p} label={p} active={f.positions.includes(p)}
                  onClick={() => f.setPositions(toggle(f.positions, p))} />
              ))}
            </div>
          )}

          {activeTab === 'stakes' && (
            <div className="flex flex-wrap gap-1.5">
              {availableStakes.map((s) => (
                <Chip key={s} label={s} active={f.stakes.includes(s)}
                  onClick={() => f.setStakes(toggle(f.stakes, s))} />
              ))}
            </div>
          )}

          {activeTab === 'potType' && (
            <div className="flex flex-wrap gap-1.5">
              {POT_TYPES.map((pt) => (
                <Chip key={pt.value} label={pt.label} active={f.potTypes.includes(pt.value)}
                  onClick={() => f.setPotTypes(toggle(f.potTypes, pt.value))} />
              ))}
              <Chip label="Multiway" active={f.multiway === true}
                onClick={() => f.setMultiway(f.multiway === true ? null : true)} />
            </div>
          )}

          {activeTab === 'result' && (
            <div className="flex flex-wrap gap-1.5">
              {(['won', 'lost'] as const).map((v) => (
                <Chip key={v} label={v === 'won' ? 'Won' : 'Lost'}
                  active={f.result === v}
                  onClick={() => f.setResult(f.result === v ? 'all' : v)} />
              ))}
              <div className="w-px h-5 self-center bg-[var(--border)]" />
              <Chip label="Showdown" active={f.showdown === 'yes'}
                onClick={() => f.setShowdown(f.showdown === 'yes' ? 'all' : 'yes')} />
              <Chip label="No showdown" active={f.showdown === 'no'}
                onClick={() => f.setShowdown(f.showdown === 'no' ? 'all' : 'no')} />
            </div>
          )}

          {activeTab === 'date' && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span>From</span>
              <input type="date" value={f.dateFrom ?? ''}
                onChange={(e) => f.setDateFrom(e.target.value || null)}
                className="px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]
                  text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-green)]" />
              <span>→</span>
              <input type="date" value={f.dateTo ?? ''}
                onChange={(e) => f.setDateTo(e.target.value || null)}
                className="px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)]
                  text-[var(--text-primary)] text-xs focus:outline-none focus:border-[var(--accent-green)]" />
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="space-y-3">
              <CardSlotsFilter label="Hole cards" selected={f.holeCardsFilter}
                maxCards={2} onChange={f.setHoleCardsFilter} />
              <CardSlotsFilter label="Board" selected={f.boardFilter}
                maxCards={5} onChange={f.setBoardFilter} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
