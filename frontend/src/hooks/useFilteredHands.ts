import { useMemo } from 'react'
import { useHandStore } from '../store/handStore'
import { useFilterStore } from '../store/filterStore'
import type { Hand } from '../types/hand'

export function useFilteredHands(): Hand[] {
  const hands = useHandStore((s) => s.hands)
  const f = useFilterStore()

  return useMemo(() => {
    return hands.filter((h) => {
      if (f.positions.length && !f.positions.includes(h.position ?? '')) return false
      if (f.stakes.length && !f.stakes.includes(h.stakes)) return false
      if (f.potTypes.length && !f.potTypes.includes(h.potType)) return false
      if (f.multiway !== null && h.isMultiway !== f.multiway) return false
      if (f.result === 'won' && h.netWinnings < 0) return false
      if (f.result === 'lost' && h.netWinnings >= 0) return false
      if (f.showdown === 'yes' && !h.wentToShowdown) return false
      if (f.showdown === 'no' && h.wentToShowdown) return false
      if (f.dateFrom && h.timestamp < f.dateFrom) return false
      if (f.dateTo && h.timestamp > f.dateTo + 'T23:59:59') return false
      if (f.holeCardsFilter.length) {
        const heroRanks = h.holeCards.map((c) => c[0].toUpperCase())
        if (!f.holeCardsFilter.every((r) => heroRanks.includes(r))) return false
      }
      if (f.boardFilter.length) {
        const boardRanks = h.board.map((c) => c[0].toUpperCase())
        if (!f.boardFilter.every((r) => boardRanks.includes(r))) return false
      }
      return true
    })
  }, [hands, f.positions, f.stakes, f.potTypes, f.multiway, f.result, f.showdown, f.dateFrom, f.dateTo, f.holeCardsFilter, f.boardFilter])
}
