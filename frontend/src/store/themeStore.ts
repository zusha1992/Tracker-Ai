import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
}

const getInitialTheme = (): boolean => {
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: getInitialTheme(),
  toggle: () => set((s) => ({ isDark: !s.isDark })),
}))
