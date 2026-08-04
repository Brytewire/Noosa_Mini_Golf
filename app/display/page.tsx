'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Entry {
  player_name: string
  total_score: number
  played_at: string
}

const MEDALS = ['🥇', '🥈', '🥉']
const REFRESH_MS = 60_000

export default function DisplayPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchEntries = useCallback(async () => {
    const { data: rounds } = await supabase
      .from('rounds')
      .select('id, created_at')

    if (!rounds?.length) { setEntries([]); return }

    const roundIds = rounds.map((r) => r.id)
    const dateMap: Record<string, string> = {}
    rounds.forEach((r) => { dateMap[r.id] = r.created_at })

    const { data: players } = await supabase
      .from('players')
      .select('player_name, total_score, round_id')
      .in('round_id', roundIds)
      .order('total_score', { ascending: true })
      .limit(10)

    setEntries(
      (players ?? []).map((p) => ({
        player_name: p.player_name,
        total_score: p.total_score,
        played_at: dateMap[p.round_id] ?? '',
      }))
    )
    setLastUpdated(new Date())
  }, [])

  // Fetch on load
  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Auto-refresh data
  useEffect(() => {
    const t = setInterval(() => fetchEntries(), REFRESH_MS)
    return () => clearInterval(t)
  }, [fetchEntries])

  return (
    <div className="flex min-h-screen flex-col bg-pp-bg" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between bg-pp-header-bg px-12 pt-10 pb-6">
        <div>
          <p className="text-lg font-semibold text-pp-primary/60 uppercase tracking-widest">Leaderboard</p>
          <h1 className="mt-1 text-5xl font-black text-pp-primary">Noosa Mini Golf</h1>
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Live</span>
          </div>
          {lastUpdated && (
            <p className="text-xs text-pp-primary/50">
              Updated {lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="flex-1 px-12 py-10">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-6xl">⛳</p>
              <p className="mt-6 text-2xl font-bold text-pp-text-light">No scores yet — be the first!</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-2xl px-8 py-5 shadow-[var(--shadow-card)] ${
                  i === 0
                    ? 'bg-[#FBEEE6] ring-2 ring-pp-accent/40'
                    : i === 1
                    ? 'bg-white ring-1 ring-slate-300'
                    : i === 2
                    ? 'bg-white ring-1 ring-orange-300'
                    : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-6">
                  {i < 3 ? (
                    <span className="text-4xl leading-none">{MEDALS[i]}</span>
                  ) : (
                    <span className="w-10 text-center text-2xl font-bold text-pp-text-light">{i + 1}.</span>
                  )}
                  <div>
                    <p className="text-3xl font-bold text-pp-text">
                      {entry.player_name.split(' ')[0]}
                    </p>
                    {entry.played_at && (
                      <p className="mt-0.5 text-sm text-pp-text-light">
                        {new Date(entry.played_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-5xl font-black text-pp-primary">
                  {entry.total_score}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-pp-border px-12 py-4 flex items-center justify-between">
        <p className="text-sm text-pp-text-light">Lowest score wins · 18 holes</p>
        <p className="text-sm text-pp-text-light">Noosa Mini Golf</p>
      </div>
    </div>
  )
}
