import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTheme } from './hooks/useTheme'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Analytics } from './pages/Analytics'
import { Hands } from './pages/Hands'
import { Sessions } from './pages/Sessions'
import { Opponents } from './pages/Opponents'

// Activates theme syncing to DOM — must live inside the component tree
const ThemeBootstrap = () => {
  useTheme()
  return null
}

const App = () => {
  return (
    <BrowserRouter>
      <ThemeBootstrap />
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
