import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { Hands } from './pages/Hands'
import { Sessions } from './pages/Sessions'
import { Opponents } from './pages/Opponents'
import { useHandStore } from './store/handStore'
import { usePoolStatsStore } from './store/poolStatsStore'

const API = 'http://localhost:8000'

// Activates theme syncing to DOM — must live inside the component tree
const ThemeBootstrap = () => {
  useTheme()
  return null
}

// Load saved hands from DB on startup
const DataLoader = () => {
  const setHands     = useHandStore((s) => s.setHands)
  const setPoolStats = usePoolStatsStore((s) => s.setStats)

  useEffect(() => {
    fetch(`${API}/api/hands`)
      .then((r) => r.json())
      .then((data) => {
        if (data.hands?.length) setHands(data.hands)
        if (data.poolStats)     setPoolStats(data.poolStats)
      })
      .catch(() => {}) // backend not running — fail silently
  }, [])

  return null
}

const App = () => {
  return (
    <BrowserRouter>
      <ThemeBootstrap />
      <DataLoader />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="hands" element={<Hands />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="opponents" element={<Opponents />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
