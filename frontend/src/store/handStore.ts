import { create } from 'zustand'

interface HandState {
  rawFiles: File[]
  setRawFiles: (files: File[]) => void
  addRawFiles: (files: File[]) => void
  clearRawFiles: () => void
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
}))
