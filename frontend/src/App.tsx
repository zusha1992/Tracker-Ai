import { useEffect, useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'
import { SplashScreen } from './components/SplashScreen'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { Hands } from './pages/Hands'
import { Sessions } from './pages/Sessions'
import { Opponents } from './pages/Opponents'
import { useHandStore } from './store/handStore'
import { usePoolStatsStore } from './store/poolStatsStore'
import { ChatAgent } from './components/ChatAgent'

const API = 'http://localhost:8000'
const MIN_SPLASH_MS = 8000

const ThemeBootstrap = () => { useTheme(); return null }

// Always redirect to /dashboard on app start regardless of last URL
const HomeRedirect = () => {
  const navigate = useNavigate()
  useEffect(() => { navigate('/dashboard', { replace: true }) }, [])
  return null
}

const App = () => {
  const setHands     = useHandStore((s) => s.setHands)
  const setPoolStats = usePoolStatsStore((s) => s.setStats)

  const [showSplash, setShowSplash] = useState(true)
  const [fading,     setFading]     = useState(false)

  const dataReady  = useRef(false)
  const timerReady = useRef(false)

  const tryDismiss = () => {
    if (!dataReady.current || !timerReady.current) return
    setFading(true)
    setTimeout(() => setShowSplash(false), 1000)
  }

  useEffect(() => {
    const t = setTimeout(() => { timerReady.current = true; tryDismiss() }, MIN_SPLASH_MS)

    fetch(`${API}/api/hands`)
      .then((r) => r.json())
      .then((data) => {
        if (data.hands?.length) setHands(data.hands)
        if (data.poolStats)     setPoolStats(data.poolStats)
      })
      .catch(() => {})
      .finally(() => { dataReady.current = true; tryDismiss() })

    return () => clearTimeout(t)
  }, [])

  return (
    <BrowserRouter>
      <ThemeBootstrap />
      <HomeRedirect />
      {showSplash && <SplashScreen fading={fading} />}
      <ChatAgent />
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
