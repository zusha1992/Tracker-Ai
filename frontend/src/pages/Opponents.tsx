import { useState } from 'react'
import { cn } from '../lib/cn'
import { usePoolStatsStore, type PoolStats } from '../store/poolStatsStore'

const STAKES = ['All', 'NL25', 'NL50', 'NL100', 'NL200']

interface StatDef {
  label: string
  key: keyof PoolStats
  unit: string
  gto: number
  exploit: (v: number) => string | null
}

const SECTIONS: { title: string; stats: StatDef[] }[] = [
  {
    title: 'Preflop',
    stats: [
      {
        label: 'VPIP', key: 'vpip', unit: '%', gto: 25,
        exploit: (v) => v > 32 ? 'Pool is loose — value bet thinner, bluff less' : v < 20 ? 'Pool is tight — steal more, respect their opens' : null,
      },
      {
        label: 'PFR', key: 'pfr', unit: '%', gto: 18,
        exploit: (v) => v < 13 ? 'Many passive callers — bet for value, avoid big bluffs' : v > 26 ? 'Aggressive field — tighten 3-bet range, defend wider' : null,
      },
      {
        label: '3-Bet %', key: 'threeBet', unit: '%', gto: 6.5,
        exploit: (v) => v > 10 ? 'Pool 3-bets too much — flat more, 4-bet bluff light' : v < 4 ? 'Pool rarely 3-bets — open wider, respect their 3-bets' : null,
      },
    ],
  },
  {
    title: 'Fold vs Aggression',
    stats: [
      {
        label: 'Fold to Flop Bet', key: 'foldFlopBet', unit: '%', gto: 45,
        exploit: (v) => v > 55 ? 'Pool folds too much on flop — c-bet almost any flop' : v < 35 ? 'Pool calls bets wide — c-bet only strong hands, give up air' : null,
      },
      {
        label: 'Fold to Turn Bet', key: 'foldTurnBet', unit: '%', gto: 50,
        exploit: (v) => v > 60 ? 'Pool gives up on turn — double barrel frequently' : v < 40 ? 'Pool calls turns wide — barrel only with equity or value' : null,
      },
      {
        label: 'Fold to River Bet', key: 'foldRiverBet', unit: '%', gto: 50,
        exploit: (v) => v > 60 ? 'Pool folds river too much — bluff rivers more' : v < 40 ? 'Pool calls rivers wide — never bluff, value bet thin' : null,
      },
    ],
  },
  {
    title: 'C-Bet',
    stats: [
      {
        label: 'Flop C-Bet %', key: 'flopCbet', unit: '%', gto: 55,
        exploit: (v) => v > 70 ? 'Pool c-bets too much — raise flop more, float wide' : v < 40 ? 'Pool checks back often — bet/raise when they check to you' : null,
      },
    ],
  },
  {
    title: 'Showdown',
    stats: [
      {
        label: 'WTSD', key: 'wtsd', unit: '%', gto: 28,
        exploit: (v) => v > 36 ? 'Pool calls down too much — never bluff river, value bet thin' : v < 22 ? 'Pool folds river often — bluff rivers more' : null,
      },
    ],
  },
]

function StatCard({ def, value }: { def: StatDef; value: number }) {
  const diff = value - def.gto
  const isOk = Math.abs(diff) < def.gto * 0.1
  const exploitMsg = def.exploit(value)

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
      <p className="text-xs text-[var(--text-muted)] mb-1">{def.label}</p>
      <p className={`text-2xl font-bold ${isOk ? 'text-[var(--text-primary)]' : 'text-[var(--accent-red)]'}`}>
        {value}{def.unit}
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">GTO ~{def.gto}{def.unit}</p>
      {exploitMsg && (
        <p className="text-[10px] text-[var(--accent-red)] mt-2 leading-snug">{exploitMsg}</p>
      )}
    </div>
  )
}

export const Opponents = () => {
  const stats = usePoolStatsStore((s) => s.stats)
  const [activeStake, setActiveStake] = useState('All')

  if (!stats) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">Parse a hand history file on the Dashboard to see player pool stats.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Player Pool</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{stats.hands.toLocaleString()} hands analyzed</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-2 py-1.5">
          {STAKES.map((s) => (
            <button
              key={s}
              onClick={() => setActiveStake(s)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-semibold transition-colors',
                activeStake === s
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            {section.title}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {section.stats.map((def) => (
              <StatCard key={def.key} def={def} value={stats[def.key] as number} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
