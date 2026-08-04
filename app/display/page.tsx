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
    <div className="flex min-h-screen flex-col bg-zinc-950 text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-12 pt-10 pb-6">
        <div>
          <p className="text-lg font-semibold text-zinc-400 uppercase tracking-widest">Leaderboard</p>
          <h1 className="mt-1 text-5xl font-black">Noosa Mini Golf</h1>
        </div>

        <div className="flex flex-col items-end gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-green-400" />
            </span>
            <span className="text-sm font-semibold text-green-400 uppercase tracking-wider">Live</span>
          </div>
          {lastUpdated && (
            <p className="text-xs text-zinc-500">
              Updated {lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="flex-1 px-12 pb-12">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-6xl">⛳</p>
              <p className="mt-6 text-2xl font-bold text-zinc-400">No scores yet — be the first!</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-2xl px-8 py-5 ${
                  i === 0
                    ? 'bg-amber-400/10 ring-2 ring-amber-400/40'
                    : i === 1
                    ? 'bg-slate-400/10 ring-1 ring-slate-400/30'
                    : i === 2
                    ? 'bg-orange-700/10 ring-1 ring-orange-700/30'
                    : 'bg-white/5'
                }`}
              >
                <div className="flex items-center gap-6">
                  {i < 3 ? (
                    <span className="text-4xl leading-none">{MEDALS[i]}</span>
                  ) : (
                    <span className="w-10 text-center text-2xl font-bold text-zinc-500">{i + 1}.</span>
                  )}
                  <div>
                    <p className={`text-3xl font-bold ${i === 0 ? 'text-amber-300' : 'text-white'}`}>
                      {entry.player_name.split(' ')[0]}
                    </p>
                    {entry.played_at && (
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {new Date(entry.played_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>

                <div className={`text-5xl font-black ${i === 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {entry.total_score}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-12 py-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">Lowest score wins · 18 holes</p>
        <p className="text-sm text-zinc-500">Noosa Mini Golf</p>
      </div>
    </div>
  )
}
