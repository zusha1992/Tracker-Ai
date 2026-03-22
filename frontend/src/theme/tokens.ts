export const getChartColors = (isDark: boolean) => ({
  green: isDark ? '#00d084' : '#1a7f37',
  red: isDark ? '#f85149' : '#cf222e',
  muted: isDark ? '#8b949e' : '#636c76',
  border: isDark ? '#30363d' : '#d0d7de',
  surface: isDark ? '#161b22' : '#ffffff',
  elevated: isDark ? '#1c2128' : '#f0f2f5',
  text: isDark ? '#e6edf3' : '#1f2328',
  blue: isDark ? '#58a6ff' : '#0969da',
  purple: isDark ? '#bc8cff' : '#8250df',
  orange: isDark ? '#f0883e' : '#bc4c00',
})
