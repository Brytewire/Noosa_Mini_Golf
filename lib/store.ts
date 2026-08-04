import { create } from 'zustand'

export interface Player {
  id: string
  name: string
}

interface GameState {
  players: Player[]
  scores: Record<string, number[]>
  email: string | null
  startedAt: string | null
  roundSaved: boolean
  startGame: (players: Player[]) => void
  setScore: (playerId: string, holeIndex: number, score: number) => void
  setEmail: (email: string) => void
  markRoundSaved: () => void
  reset: () => void
}

export const useGameStore = create<GameState>()((set) => ({
  players: [],
  scores: {},
  email: null,
  startedAt: null,
  roundSaved: false,
  startGame: (players) =>
    set({
      players,
      scores: Object.fromEntries(players.map((p) => [p.id, new Array(18).fill(0)])),
      startedAt: new Date().toISOString(),
      roundSaved: false,
    }),
  setScore: (playerId, holeIndex, score) =>
    set((state) => ({
      scores: {
        ...state.scores,
        [playerId]: state.scores[playerId].map((s, i) => (i === holeIndex ? score : s)),
      },
    })),
  setEmail: (email) => set({ email }),
  markRoundSaved: () => set({ roundSaved: true }),
  reset: () => set({ players: [], scores: {}, email: null, startedAt: null, roundSaved: false }),
}))
