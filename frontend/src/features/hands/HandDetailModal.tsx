import { useEffect } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'
import type { Hand, Action } from '../../types/hand'

interface Props {
  hand: Hand
  onClose: () => void
  onPrev?: () => void
  onNext?: () => void
}

const SUIT_COLOR: Record<string, string> = {
  h: '#f85149',
  d: '#f85149',
  c: '#000000',
  s: '#000000',
}

const Card = ({ card }: { card: string }) => {
  const rank = card.slice(0, -1)
  const suit = card.slice(-1)
  const color = SUIT_COLOR[suit] ?? 'var(--text-primary)'
  const suitSymbol: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' }
  return (
    <span
      className="inline-flex items-center justify-center w-9 h-12 rounded-md border border-[var(--border)]
        text-sm font-bold select-none"
      style={{ color, background: '#ffffff' }}
    >
      {rank}{suitSymbol[suit] ?? suit}
    </span>
  )
}


const ActionLine = ({ a, positions }: { a: Action; positions: Record<string, string> }) => {
  const isHero = a.player === 'Hero'
  const isFold = a.action === 'folds'
  const pos = positions[a.player]
  return (
    <div className={`flex gap-2 text-xs py-0.5 ${isFold ? 'opacity-50' : ''}`}>
      {pos && (
        <span className="w-9 text-[var(--text-muted)] font-mono shrink-0">{pos}</span>
      )}
      <span
        className="font-semibold min-w-[70px] shrink-0"
        style={{ color: isHero ? 'var(--accent-green)' : 'var(--text-muted)' }}
      >
        {a.player}
      </span>
      <span className="text-[var(--text-primary)]">{a.label}</span>
    </div>
  )
}

export const HandDetailModal = ({ hand, onClose, onPrev, onNext }: Props) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); onPrev?.() }
      if (e.key === 'ArrowDown') { e.preventDefault(); onNext?.() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onPrev, onNext])

  const streets: Array<[string, string]> = [
    ['Preflop', 'preflop'],
    ['Flop', 'flop'],
    ['Turn', 'turn'],
    ['River', 'river'],
  ]

  const boardByStreet = [
    hand.board.slice(0, 3),
    hand.board.slice(3, 4),
    hand.board.slice(4, 5),
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Hand #{hand.handId}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {format(new Date(hand.timestamp), 'MMM d, yyyy · HH:mm')} · {hand.stakes} · {hand.position ?? '?'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-base font-bold mr-1"
              style={{ color: hand.netWinnings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {hand.netWinnings >= 0 ? '+' : ''}${hand.netWinnings.toFixed(2)}
            </span>
            <button
              onClick={onPrev}
              disabled={!onPrev}
              title="Previous hand (↑)"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
            >
              <ChevronUp size={18} />
            </button>
            <button
              onClick={onNext}
              disabled={!onNext}
              title="Next hand (↓)"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
            >
              <ChevronDown size={18} />
            </button>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Cards row */}
        <div className="px-5 py-4 flex items-center gap-4 border-b border-[var(--border)]">
          <div className="flex gap-1.5">
            {hand.holeCards.length > 0
              ? hand.holeCards.map((c) => <Card key={c} card={c} />)
              : <span className="text-xs text-[var(--text-muted)]">No cards recorded</span>
            }
          </div>
          {hand.board.length > 0 && (
            <>
              <span className="w-px self-stretch bg-[var(--border)] mx-1" />
              <div className="flex gap-1.5">
                {hand.board.map((c, i) => <Card key={`${c}-${i}`} card={c} />)}
              </div>
            </>
          )}
        </div>

        {/* Streets */}
        <div className="px-5 py-4 space-y-4 max-h-72 overflow-y-auto scrollbar-thin">
          {streets.map(([label, key], si) => {
            const actions = hand.streets[key as keyof typeof hand.streets]
            if (!actions?.length) return null
            const boardCards = key === 'flop' ? boardByStreet[0] : key === 'turn' ? boardByStreet[1] : key === 'river' ? boardByStreet[2] : []
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                    {label}
                  </span>
                  {boardCards.length > 0 && (
                    <div className="flex gap-1">
                      {boardCards.map((c, i) => <Card key={`${c}-${i}`} card={c} />)}
                    </div>
                  )}
                </div>
                <div className="pl-1">
                  {actions.map((a, i) => <ActionLine key={i} a={a} positions={hand.playerPositions} />)}
                </div>
              </div>
            )
          })}
        </div>

        {/* Showdown */}
        {Object.keys(hand.showdownCards).length > 0 && (
          <div className="px-5 py-3 border-t border-[var(--border)] space-y-2">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Showdown</p>
            {Object.entries(hand.showdownCards).map(([player, cards]) => (
              <div key={player} className="flex items-center gap-3">
                <span
                  className="text-xs font-semibold min-w-[70px] shrink-0"
                  style={{ color: player === 'Hero' ? 'var(--accent-green)' : 'var(--text-muted)' }}
                >
                  {player}
                </span>
                <div className="flex gap-1">
                  {cards.map((c, i) => <Card key={`${c}-${i}`} card={c} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex gap-4 text-xs text-[var(--text-muted)]">
          <span>Pot: <strong className="text-[var(--text-primary)]">${hand.pot.toFixed(2)}</strong></span>
          <span>Rake: <strong className="text-[var(--text-primary)]">${hand.rake.toFixed(2)}</strong></span>
        </div>
      </div>
    </div>
  )
}
