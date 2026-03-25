import type { Hand } from '../types/hand'

export interface Session {
  id: string          // startTime — stable unique key
  date: string        // "YYYY-MM-DD"
  startTime: string   // as stored in DB e.g. "2026-02-10 10:15:30"
  endTime: string
  stakes: string
  hands: Hand[]
  profit: number
  bb100: number
  rake: number
  durationMin: number
}

const GAP_MS = 60 * 60 * 1000  // 1 hour

function parseTs(ts: string): number {
  // Handle both "YYYY-MM-DD HH:MM:SS" and ISO variants
  return new Date(ts.replace(' ', 'T')).getTime()
}

function makeSession(hands: Hand[]): Session {
  const profit      = Math.round(hands.reduce((s, h) => s + h.netWinnings, 0) * 100) / 100
  const totalBB     = hands.reduce((s, h) => s + h.netBB, 0)
  const rake        = Math.round(hands.reduce((s, h) => s + h.rake, 0) * 100) / 100
  const durationMin = Math.round((parseTs(hands[hands.length - 1].timestamp) - parseTs(hands[0].timestamp)) / 60000)

  // Most common stakes in this session
  const counts = hands.reduce<Record<string, number>>((acc, h) => {
    acc[h.stakes] = (acc[h.stakes] ?? 0) + 1; return acc
  }, {})
  const stakes = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]

  return {
    id:          hands[0].timestamp,
    date:        hands[0].timestamp.slice(0, 10),
    startTime:   hands[0].timestamp,
    endTime:     hands[hands.length - 1].timestamp,
    stakes,
    hands,
    profit,
    bb100:       hands.length > 0 ? (totalBB / hands.length) * 100 : 0,
    rake,
    durationMin,
  }
}

export function buildSessions(hands: Hand[]): Session[] {
  if (!hands.length) return []

  const sorted = [...hands].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const sessions: Session[] = []
  let current: Hand[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const gap = parseTs(sorted[i].timestamp) - parseTs(current[current.length - 1].timestamp)
    if (gap > GAP_MS) {
      sessions.push(makeSession(current))
      current = [sorted[i]]
    } else {
      current.push(sorted[i])
    }
  }
  sessions.push(makeSession(current))

  return sessions.sort((a, b) => b.startTime.localeCompare(a.startTime))
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function formatTime(ts: string): string {
  return ts.slice(11, 16)  // "HH:MM"
}
