import { useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'

export const useTheme = () => {
  const { isDark, toggle } = useThemeStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return { isDark, toggle }
}
