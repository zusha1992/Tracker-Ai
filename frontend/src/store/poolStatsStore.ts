import { create } from 'zustand'

export interface PoolStats {
  hands: number
  vpip: number
  pfr: number
  threeBet: number
  foldFlopBet: number
  foldTurnBet: number
  foldRiverBet: number
  flopCbet: number
  wtsd: number
}

interface PoolStatsStore {
  stats: PoolStats | null
  setStats: (s: PoolStats) => void
  clear: () => void
}

export const usePoolStatsStore = create<PoolStatsStore>((set) => ({
  stats: null,
  setStats: (s) => set({ stats: s }),
  clear: () => set({ stats: null }),
}))
