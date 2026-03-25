import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2, Sparkles, Mic, MicOff } from 'lucide-react'
import { useSpeech } from '../hooks/useSpeech'
import { useNavigate, useLocation } from 'react-router-dom'
import { useHandStore } from '../store/handStore'
import { useFilterStore } from '../store/filterStore'
import { useChatStore } from '../store/chatStore'

const API = 'http://localhost:8000'

interface Message { role: 'user' | 'assistant'; content: string }
interface Action {
  type: 'navigate' | 'filter' | 'navigate+filter' | 'clearFilters'
  page?: string
  filter?: { stakes?: string | null; position?: string | null; result?: string | null; dateFrom?: string | null; dateTo?: string | null }
}

const PAGE_ROUTES: Record<string, string> = {
  dashboard: '/dashboard', analytics: '/analytics', hands: '/hands',
  sessions: '/sessions', opponents: '/opponents',
}

export const ChatAgent = () => {
  const open           = useChatStore((s) => s.open)
  const setOpen        = useChatStore((s) => s.setOpen)
  const toggle         = useChatStore((s) => s.toggle)
  const pendingMessage = useChatStore((s) => s.pendingMessage)
  const clearPending   = useChatStore((s) => s.clearPending)
  const location       = useLocation()
  const onDashboard    = location.pathname === '/dashboard'

  const [input, setInput]       = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey Noam! Ask me anything about your stats, or say \"show me my NL50 hands\" and I'll take you there." }
  ])
  const [loading, setLoading] = useState(false)

  const navigate     = useNavigate()
  const allHands     = useHandStore((s) => s.hands)
  const setStakes    = useFilterStore((s) => s.setStakes)
  const setPositions = useFilterStore((s) => s.setPositions)
  const setResult    = useFilterStore((s) => s.setResult)
  const setDateFrom  = useFilterStore((s) => s.setDateFrom)
  const setDateTo    = useFilterStore((s) => s.setDateTo)
  const clearAll     = useFilterStore((s) => s.clearAll)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const { listening, toggle: toggleMic, supported: micSupported } = useSpeech((t) => {
    setInput(t)
    send(t)
  })

  // Auto-send pending message from dashboard bar
  useEffect(() => {
    if (open && pendingMessage) {
      clearPending()
      send(pendingMessage)
    }
  }, [open, pendingMessage])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const buildContext = () => {
    if (!allHands.length) return {}
    const totalProfit = allHands.reduce((s, h) => s + h.netWinnings, 0)
    const totalRake   = allHands.reduce((s, h) => s + h.rake, 0)
    const totalBB     = allHands.reduce((s, h) => s + h.netBB, 0)
    const stakes      = [...new Set(allHands.map((h) => h.stakes))].sort()
    const dates       = allHands.map((h) => h.timestamp).sort()
    return {
      totalHands: allHands.length,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalRake: Math.round(totalRake * 100) / 100,
      bb100: Math.round((totalBB / allHands.length) * 10000) / 100,
      stakes,
      dateRange: dates.length ? `${dates[0].slice(0, 10)} → ${dates[dates.length - 1].slice(0, 10)}` : null,
    }
  }

  const applyAction = (action: Action) => {
    if (action.type === 'clearFilters') { clearAll(); return }
    if (action.filter) {
      const f = action.filter
      if (f.stakes)   setStakes([f.stakes])
      if (f.position) setPositions([f.position])
      if (f.result)   setResult(f.result === 'win' ? 'won' : f.result === 'loss' ? 'lost' : 'all')
      if (f.dateFrom) setDateFrom(f.dateFrom)
      if (f.dateTo)   setDateTo(f.dateTo)
    }
    if ((action.type === 'navigate' || action.type === 'navigate+filter') && action.page) {
      const route = PAGE_ROUTES[action.page.toLowerCase()]
      if (route) navigate(route)
    }
  }

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: messages.slice(-10), context: buildContext() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages([...newHistory, { role: 'assistant', content: data.text }])
      if (data.action) applyAction(data.action)
    } catch {
      setMessages([...newHistory, { role: 'assistant', content: "Sorry, I couldn't reach the AI right now. Make sure the backend is running." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button — hidden on dashboard */}
      {!onDashboard && (
        <button
          onClick={toggle}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105"
          style={{ background: 'var(--accent-green)' }}
          title="Ask AI"
        >
          {open ? <X size={18} color="white" /> : <Sparkles size={18} color="white" />}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-22 right-6 z-50 w-80 rounded-xl border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-surface)', height: 420 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
               style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={14} style={{ color: 'var(--accent-green)' }} />
              <span className="text-sm font-semibold text-[var(--text-primary)]">TrackerAI Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                  style={m.role === 'user'
                    ? { background: 'var(--accent-green)', color: 'white' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-primary)' }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2" style={{ background: 'var(--bg-elevated)' }}>
                  <Loader2 size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t border-[var(--border)]" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex items-center gap-2">
              {micSupported && (
                <button
                  onClick={toggleMic}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                  style={{ background: listening ? 'var(--accent-red)' : 'var(--bg-base)' }}
                  title={listening ? 'Stop recording' : 'Speak'}
                >
                  {listening
                    ? <MicOff size={12} style={{ color: 'white' }} />
                    : <Mic size={12} style={{ color: 'var(--text-muted)' }} />
                  }
                </button>
              )}
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder={listening ? 'Listening...' : 'Ask anything...'}
                className="flex-1 bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                style={{ background: 'var(--accent-green)' }}
              >
                <Send size={12} color="white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Inline bar — used on Dashboard above the chart
export const DashboardAIBar = () => {
  const sendMessage = useChatStore((s) => s.sendMessage)
  const setOpen     = useChatStore((s) => s.setOpen)
  const [input, setInput]   = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (text?: string) => {
    const t = (text ?? input).trim()
    if (!t) return
    setInput('')
    sendMessage(t)
  }

  const { listening, toggle: toggleMic, supported: micSupported } = useSpeech((t) => submit(t))

  return (
    /* Gradient-border wrapper */
    <div
      style={{
        padding: 1.5,
        borderRadius: 16,
        background: focused || listening
          ? 'linear-gradient(135deg, var(--accent-green) 0%, #7c3aed 50%, #0ea5e9 100%)'
          : 'var(--border)',
        backgroundSize: '200% 200%',
        animation: (focused || listening) ? 'ai-border-spin 3s ease infinite' : undefined,
        transition: 'background 0.3s',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: 'var(--bg-surface)', borderRadius: 14.5, cursor: 'text' }}
      >
        {/* AI orb */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: listening
              ? 'linear-gradient(135deg, #f85149, #ff6b6b)'
              : 'linear-gradient(135deg, var(--accent-green) 0%, #7c3aed 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: listening
              ? 'ai-orb-listen 1s ease-in-out infinite'
              : 'ai-orb-pulse 3s ease-in-out infinite',
          }}
        >
          <Sparkles size={15} color="white" />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          onFocus={() => { setFocused(true); setOpen(true) }}
          onBlur={() => setFocused(false)}
          placeholder={listening ? 'Listening...' : 'Ask anything — navigate, filter, or learn from your data...'}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
        />

        {/* Mic button */}
        {micSupported && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleMic() }}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: listening ? 'var(--accent-red)' : 'var(--bg-elevated)',
            }}
            title={listening ? 'Stop recording' : 'Speak to AI'}
          >
            {listening
              ? <MicOff size={13} style={{ color: 'white' }} />
              : <Mic size={13} style={{ color: 'var(--text-muted)' }} />
            }
          </button>
        )}

        {/* Send button */}
        {input && !listening && (
          <button
            onClick={(e) => { e.stopPropagation(); submit() }}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--accent-green), #0ea5e9)' }}
          >
            <Send size={13} color="white" />
          </button>
        )}
      </div>
    </div>
  )
}
