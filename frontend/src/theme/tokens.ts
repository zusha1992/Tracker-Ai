// All colors are CSS variables — theme changes happen via CSS with no React re-render.
// The isDark parameter is kept for backwards compatibility but no longer used.
export const getChartColors = (_isDark?: boolean) => ({
  green:   'var(--accent-green)',
  red:     'var(--accent-red)',
  blue:    'var(--chart-blue)',
  orange:  'var(--chart-orange)',
  gray:    'var(--chart-gray)',
  muted:   'var(--text-muted)',
  border:  'var(--border)',
  surface: 'var(--bg-surface)',
  elevated:'var(--bg-elevated)',
  text:    'var(--text-primary)',
})
