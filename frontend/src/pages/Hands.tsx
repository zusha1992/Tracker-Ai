import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowDownUp } from 'lucide-react'
import { useHandStore } from '../store/handStore'
import { useFilteredHands } from '../hooks/useFilteredHands'
import { FilterBar } from '../features/filters/FilterBar'
import { HandDetailModal } from '../features/hands/HandDetailModal'
import type { Hand } from '../types/hand'

const PAGE_SIZE = 50

export const Hands = () => {
  const allHands = useHandStore((s) => s.hands)
  const filtered = useFilteredHands()
  const [sortDesc, setSortDesc] = useState(true) // true = best first
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [page, setPage] = useState(0)

  const hands = useMemo(() => {
    setPage(0)
    return [...filtered].sort((a, b) => sortDesc ? b.netWinnings - a.netWinnings : a.netWinnings - b.netWinnings)
  }, [filtered, sortDesc])

  const selected = selectedIdx !== null ? hands[selectedIdx] : null

  if (!allHands.length) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Hands</p>
        <p className="text-sm text-[var(--text-muted)]">
          Parse hand history files on the Dashboard to see hands here.
        </p>
      </div>
    )
  }

  const pageHands = hands.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(hands.length / PAGE_SIZE)

  return (
    <>
      <div className="space-y-3">
        <FilterBar count={hands.length} />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {hands.length.toLocaleString()} hands
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-elevated)] disabled:opacity-40"
              >
                ←
              </button>
              <span>{page + 1} / {totalPages}</span>
              <button
                disabled={page === totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--bg-elevated)] disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>

        {/* Table header */}
        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide bg-[var(--bg-elevated)] px-4 py-2">
            <span>Date</span>
            <span>Stakes</span>
            <span>Position</span>
            <span>Cards</span>
            <span>SD</span>
            <div className="flex items-center justify-end gap-1">
              <span>Result</span>
              <button
                onClick={() => { setSortDesc((v) => !v); setPage(0) }}
                className="text-[var(--text-muted)] hover:text-[var(--accent-green)] transition-colors"
              >
                <ArrowDownUp size={11} />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {pageHands.map((hand) => (
              <HandRow
                key={hand.handId}
                hand={hand}
                onClick={() => setSelectedIdx(page * PAGE_SIZE + pageHands.indexOf(hand))}
              />
            ))}
          </div>
        </div>
      </div>

      {selected && selectedIdx !== null && (
        <HandDetailModal
          hand={selected}
          onClose={() => setSelectedIdx(null)}
          onPrev={selectedIdx > 0 ? () => setSelectedIdx(selectedIdx - 1) : undefined}
          onNext={selectedIdx < hands.length - 1 ? () => setSelectedIdx(selectedIdx + 1) : undefined}
        />
      )}
    </>
  )
}

const HandRow = ({ hand, onClick }: { hand: Hand; onClick: () => void }) => {
  const win = hand.netWinnings >= 0
  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] items-center px-4 py-2.5
        text-sm text-left hover:bg-[var(--bg-elevated)] transition-colors"
    >
      <span className="text-[var(--text-muted)] text-xs">
        {format(new Date(hand.timestamp), 'MMM d, yy · HH:mm')}
      </span>
      <span className="text-[var(--text-primary)]">{hand.stakes}</span>
      <span className="text-[var(--text-primary)]">{hand.position ?? '—'}</span>
      <span className="text-[var(--text-muted)] text-xs font-mono">
        {hand.holeCards.length ? hand.holeCards.join(' ') : '—'}
      </span>
      <span className="text-[var(--text-muted)]">{hand.wentToShowdown ? '✓' : ''}</span>
      <span
        className="text-right font-semibold"
        style={{ color: win ? 'var(--accent-green)' : 'var(--accent-red)' }}
      >
        {win ? '+' : ''}${hand.netWinnings.toFixed(2)}
      </span>
    </button>
  )
}
