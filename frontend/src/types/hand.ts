export interface Action {
  player: string
  action: string
  label: string
}

export interface Streets {
  preflop?: Action[]
  flop?: Action[]
  turn?: Action[]
  river?: Action[]
}

export interface Hand {
  handId: string
  timestamp: string
  stakes: string
  bb: number
  position: string | null
  holeCards: string[]
  board: string[]
  netWinnings: number
  netBB: number
  pot: number
  rake: number
  potType: 'single-raise' | '3bet' | '4bet+'
  isMultiway: boolean
  wentToShowdown: boolean
  showdownCards: Record<string, string[]>
  opponents: string[]
  playerPositions: Record<string, string>
  streets: Streets
}
