'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface LeaderboardEntry {
  player_name: string
  total_score: number
  played_at: string
}

const MEDALS = ['🥇', '🥈', '🥉']
const PERIOD_OPTIONS = ['All Time', 'This Month'] as const
type Period = typeof PERIOD_OPTIONS[number]

export default function LeaderboardPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('All Time')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true)

      let query = supabase
        .from('rounds')
        .select('id, created_at')

      if (period === 'This Month') {
        const start = new Date()
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        query = query.gte('created_at', start.toISOString())
      }

      const { data: rounds } = await query
      if (!rounds || rounds.length === 0) {
        setEntries([])
        setLoading(false)
        return
      }

      const roundIds = rounds.map((r) => r.id)
      const roundDateMap: Record<string, string> = {}
      rounds.forEach((r) => { roundDateMap[r.id] = r.created_at })

      const { data: players } = await supabase
        .from('players')
        .select('player_name, total_score, round_id')
        .in('round_id', roundIds)
        .order('total_score', { ascending: true })
        .limit(20)

      if (!players) { setEntries([]); setLoading(false); return }

      setEntries(
        players.map((p) => ({
          player_name: p.player_name,
          total_score: p.total_score,
          played_at: roundDateMap[p.round_id] ?? '',
        }))
      )
      setLoading(false)
    }

    fetchLeaderboard()
  }, [period])

  return (
    <div className="min-h-screen bg-pp-bg-tint">
      {/* Header */}
      <div className="bg-pp-primary px-6 pb-10 pt-12 text-white">
        <button onClick={() => router.back()} className="mb-5 text-sm text-white/80 hover:text-white">
          ← Back
        </button>
        <h1 className="font-display text-3xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-sm text-white/80">Lowest scores win!</p>
      </div>

      <main className="mx-auto max-w-md px-4 py-6">
        {/* Period toggle */}
        <div className="mb-6 flex rounded-xl bg-white p-1 ring-1 ring-pp-border">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                period === p ? 'bg-pp-primary text-white' : 'text-pp-text-light'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="py-16 text-center text-sm text-pp-text-light">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-[var(--shadow-card)] ring-1 ring-pp-border">
            <p className="text-4xl">⛳</p>
            <p className="mt-3 font-semibold text-pp-text">No scores yet</p>
            <p className="mt-1 text-sm text-pp-text-light">Be the first to play!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl bg-white px-5 py-3 shadow-[var(--shadow-card)] ring-1 ring-pp-border"
              >
                <div className="flex items-center gap-3">
                  {i < 3 ? (
                    <span className="text-2xl leading-none">{MEDALS[i]}</span>
                  ) : (
                    <span className="w-7 text-center text-sm font-bold text-pp-text-light">{i + 1}.</span>
                  )}
                  <div>
                    <p className="font-semibold text-pp-text">
                      {entry.player_name.split(' ')[0]}
                    </p>
                    {entry.played_at && (
                      <p className="text-xs text-pp-text-light">
                        {new Date(entry.played_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <span className={`text-lg font-bold ${i === 0 ? 'text-pp-accent' : 'text-pp-text'}`}>
                  {entry.total_score}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
