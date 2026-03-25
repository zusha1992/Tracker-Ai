import { create } from 'zustand'

export interface FilterState {
  positions: string[]
  stakes: string[]
  potTypes: string[]
  multiway: boolean | null    // null = all, true = multiway only, false = HU only
  result: 'all' | 'won' | 'lost'
  showdown: 'all' | 'yes' | 'no'
  dateFrom: string | null
  dateTo: string | null
  holeCardsFilter: string[]   // max 2 specific cards
  boardFilter: string[]        // max 5 specific board cards
  sessionStart: string | null  // ISO timestamp of session's first hand
  sessionEnd: string | null    // ISO timestamp of session's last hand

  setPositions: (v: string[]) => void
  setStakes: (v: string[]) => void
  setPotTypes: (v: string[]) => void
  setMultiway: (v: boolean | null) => void
  setResult: (v: FilterState['result']) => void
  setShowdown: (v: FilterState['showdown']) => void
  setDateFrom: (v: string | null) => void
  setDateTo: (v: string | null) => void
  setHoleCardsFilter: (v: string[]) => void
  setBoardFilter: (v: string[]) => void
  setSession: (start: string, end: string) => void
  clearSession: () => void
  clearAll: () => void
}

const defaults = {
  positions: [],
  stakes: [],
  potTypes: [],
  multiway: null,
  result: 'all' as const,
  showdown: 'all' as const,
  dateFrom: null,
  dateTo: null,
  holeCardsFilter: [],
  boardFilter: [],
  sessionStart: null,
  sessionEnd: null,
}

export const useFilterStore = create<FilterState>((set) => ({
  ...defaults,
  setPositions:       (v) => set({ positions: v }),
  setStakes:          (v) => set({ stakes: v }),
  setPotTypes:        (v) => set({ potTypes: v }),
  setMultiway:        (v) => set({ multiway: v }),
  setResult:          (v) => set({ result: v }),
  setShowdown:        (v) => set({ showdown: v }),
  setDateFrom:        (v) => set({ dateFrom: v }),
  setDateTo:          (v) => set({ dateTo: v }),
  setHoleCardsFilter: (v) => set({ holeCardsFilter: v }),
  setBoardFilter:     (v) => set({ boardFilter: v }),
  setSession:         (start, end) => set({ sessionStart: start, sessionEnd: end }),
  clearSession:       () => set({ sessionStart: null, sessionEnd: null }),
  clearAll:           () => set(defaults),
}))
