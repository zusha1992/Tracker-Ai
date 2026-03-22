import { create } from 'zustand'

export interface ParseSummary {
  handCount: number
  stakes: string[]
  dateRange: { first: string | null; last: string | null }
  hero: string
  site: string
}

interface HandState {
  rawFiles: File[]
  setRawFiles: (files: File[]) => void
  addRawFiles: (files: File[]) => void
  clearRawFiles: () => void
  parseSummary: ParseSummary | null
  setParseSummary: (s: ParseSummary | null) => void
  isParsing: boolean
  setIsParsing: (v: boolean) => void
  parseError: string | null
  setParseError: (e: string | null) => void
}

export const useHandStore = create<HandState>((set, get) => ({
  rawFiles: [],
  setRawFiles: (files) => set({ rawFiles: files }),
  addRawFiles: (incoming) => {
    const existing = get().rawFiles
    const existingNames = new Set(existing.map((f) => f.name))
    const newFiles = incoming.filter((f) => !existingNames.has(f.name))
    set({ rawFiles: [...existing, ...newFiles] })
  },
  clearRawFiles: () => set({ rawFiles: [] }),
  parseSummary: null,
  setParseSummary: (s) => set({ parseSummary: s }),
  isParsing: false,
  setIsParsing: (v) => set({ isParsing: v }),
  parseError: null,
  setParseError: (e) => set({ parseError: e }),
}))
