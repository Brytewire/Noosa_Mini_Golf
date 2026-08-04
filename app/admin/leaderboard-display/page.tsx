'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

interface Entry {
  id: string
  player_name: string
  total_score: number
}

const REFRESH_MS = 30_000

const RANK_COLOURS = [
  { row: 'bg-[#FBEEE6] border-l-4 border-pp-accent', rank: 'text-pp-accent', name: 'text-pp-text text-xl font-black', score: 'text-pp-primary text-3xl font-black', medal: '🥇' },
  { row: 'bg-slate-100 border-l-4 border-slate-400', rank: 'text-slate-500', name: 'text-pp-text text-lg font-bold', score: 'text-pp-primary text-2xl font-black', medal: '🥈' },
  { row: 'bg-orange-50 border-l-4 border-orange-400', rank: 'text-orange-500', name: 'text-pp-text text-lg font-bold', score: 'text-pp-primary text-2xl font-black', medal: '🥉' },
]

export default function LeaderboardDisplay() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [now, setNow] = useState(Date.now())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    const { data: playersData } = await supabase
      .from('players')
      .select('id, player_name, total_score')
      .order('total_score', { ascending: true })
      .limit(10)

    setEntries(
      (playersData ?? []).map((p) => ({ id: p.id, player_name: p.player_name, total_score: p.total_score }))
    )
    setLoading(false)
    setLastUpdated(new Date())
  }, [])

  useEffect(() => {
    fetchLeaderboard()
    const dataInterval = setInterval(fetchLeaderboard, REFRESH_MS)
    const tickInterval = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(dataInterval); clearInterval(tickInterval) }
  }, [fetchLeaderboard])

  const secondsUntilRefresh = REFRESH_MS / 1000 - Math.floor((now - lastUpdated.getTime()) / 1000)

  return (
    <div ref={containerRef} className="flex min-h-screen flex-col bg-admin-primary text-pp-primary">

      {/* Header */}
      <header className="flex items-center justify-between border-b border-pp-primary/20 px-8 py-4">
        <div className="flex items-center gap-5">
          <Image
            src="/images/NMG-Logo.webp"
            alt="Noosa Mini Golf"
            width={90}
            height={55}
            className="object-contain"
          />
          <div>
            <h1 className="font-display text-3xl font-black tracking-tight text-pp-primary">Leaderboard</h1>
            <p className="text-sm text-pp-primary/60">Noosa Mini Golf · Lowest score wins</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-pp-primary/50">
              {lastUpdated.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-xs text-pp-primary/40">
              Refreshing in {Math.max(0, secondsUntilRefresh)}s
            </p>
          </div>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-pp-primary/10 text-pp-primary/60 transition-colors hover:bg-pp-primary/20 hover:text-pp-primary"
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Single leaderboard column — one course, no comparison needed */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        {/* Column labels */}
        <div className="grid grid-cols-[4rem_1fr_6rem] border-b border-pp-primary/20 bg-white/40 px-6 py-3 text-xs font-semibold uppercase tracking-widest text-pp-primary/60">
          <span className="text-center">Rank</span>
          <span>Player</span>
          <span className="text-center">Score</span>
        </div>

        {/* Rows */}
        <div className="flex-1 divide-y divide-pp-primary/10 bg-white/60">
          {loading ? (
            <div className="flex h-full items-center justify-center text-pp-primary/50">Loading…</div>
          ) : entries.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-pp-primary/50">
              <span className="text-5xl">🌴</span>
              <span className="text-sm">No scores yet — be first!</span>
            </div>
          ) : entries.map((entry, i) => {
            const style = RANK_COLOURS[i]
            return (
              <div
                key={entry.id}
                className={`grid grid-cols-[4rem_1fr_6rem] items-center px-6 py-4 ${style?.row ?? 'bg-white'}`}
              >
                <div className="flex justify-center">
                  {i < 3 ? (
                    <span className="text-2xl leading-none">{style.medal}</span>
                  ) : (
                    <span className="text-base font-bold text-pp-text-light">{i + 1}</span>
                  )}
                </div>
                <span className={style?.name ?? 'text-pp-text text-base font-semibold'}>
                  {entry.player_name}
                </span>
                <span className={`text-center ${style?.score ?? 'text-pp-primary text-xl font-bold'}`}>
                  {entry.total_score}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-pp-primary/20 py-3 text-center text-xs text-pp-primary/40">
        Refreshes automatically every 30 seconds · Noosa Mini Golf
      </footer>
    </div>
  )
}
