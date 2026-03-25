import { create } from 'zustand'

interface ChatStore {
  open: boolean
  pendingMessage: string | null
  setOpen: (v: boolean) => void
  toggle: () => void
  sendMessage: (text: string) => void   // open + queue a message
  clearPending: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  open: false,
  pendingMessage: null,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
  sendMessage: (text) => set({ open: true, pendingMessage: text }),
  clearPending: () => set({ pendingMessage: null }),
}))
