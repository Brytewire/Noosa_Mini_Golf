'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Confetti } from '@/app/components/Confetti'

const PLAYER_COLORS = ['#E8A98B', '#1B4B44', '#8FBBAE', '#F5F0A9', '#0F3630', '#C97B5A']
const MEDALS = ['🥇', '🥈', '🥉']

interface CompletionVoucher {
  title: string
  description: string
  promo_code: string
  valid_days: number
}

export default function ResultsPage() {
  const router = useRouter()
  const { players, scores, email, startedAt, reset, roundSaved, markRoundSaved } = useGameStore()
  const [saveError, setSaveError] = useState(false)
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [voucher, setVoucher] = useState<CompletionVoucher | null>(null)

  useEffect(() => {
    if (players.length === 0) {
      router.replace('/')
    }
  }, [players.length, router])

  useEffect(() => {
    if (saveError && !errorDismissed) {
      const t = setTimeout(() => setErrorDismissed(true), 5000)
      return () => clearTimeout(t)
    }
  }, [saveError, errorDismissed])

  useEffect(() => {
    async function fetchVoucher() {
      const { data } = await supabase
        .from('completion_rewards')
        .select('title, description, promo_code, valid_days')
        .eq('is_active', true)
        .maybeSingle()
      setVoucher(data ?? null)
    }
    fetchVoucher()
  }, [])

  const totals = players.map((p) => ({
    player: p,
    total: (scores[p.id] ?? []).reduce((sum, s) => sum + s, 0),
  })).sort((a, b) => a.total - b.total)

  useEffect(() => {
    if (roundSaved || players.length === 0 || !email) return

    async function saveRound() {
      const { data: round, error: roundError } = await supabase
        .from('rounds')
        .insert({ email, started_at: startedAt })
        .select('id')
        .single()

      if (roundError || !round) { setSaveError(true); return }
      markRoundSaved()

      const playerResults: { name: string; total: number; scores: number[] }[] = []

      for (let i = 0; i < players.length; i++) {
        const p = players[i]
        const playerScores = scores[p.id] ?? []
        const total = playerScores.reduce((sum, s) => sum + s, 0)

        const { data: player, error: playerError } = await supabase
          .from('players')
          .insert({ round_id: round.id, player_name: p.name, player_order: i, total_score: total })
          .select('id')
          .single()

        if (playerError || !player) { setSaveError(true); return }

        const holeScores = playerScores.map((score, idx) => ({
          round_id: round.id,
          player_id: player.id,
          hole_number: idx + 1,
          score,
        }))

        const { error: scoresError } = await supabase.from('scores').insert(holeScores)
        if (scoresError) { setSaveError(true); return }

        playerResults.push({ name: p.name, total, scores: playerScores })
      }

      playerResults.sort((a, b) => a.total - b.total)

      const { data: emailVoucher } = await supabase
        .from('completion_rewards')
        .select('title, description, promo_code, valid_days')
        .eq('is_active', true)
        .maybeSingle()

      fetch('/api/send-scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          players: playerResults,
          voucher: emailVoucher ?? null,
        }),
      }).catch(() => {/* email failure is non-fatal */})
    }

    saveRound()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (players.length === 0) return <div className="min-h-screen bg-pp-bg-tint" />

  const winner = totals[0]
  const isSolo = players.length === 1

  function handlePlayAgain() {
    reset()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-pp-bg-tint">
      <Confetti />

      {/* Header */}
      <div className="bg-pp-primary px-6 pb-10 pt-12 text-center text-white">
        <h1 className="mt-1 font-display text-4xl text-white">Final Scores</h1>
        <p className="mt-2 text-sm text-white/80">18 holes complete ✓</p>
      </div>

      <main className="mx-auto max-w-md px-4 py-6">

        {/* Winner card */}
        <div className="mb-6 rounded-2xl bg-white px-6 py-6 text-center shadow-[var(--shadow-elevated)]">
          <p className="text-5xl">🏆</p>
          <p className="mt-3 font-display text-3xl text-pp-primary">
            {isSolo ? winner.player.name : `${winner.player.name} wins!`}
          </p>
          <p className="mt-1 text-sm text-pp-text-light">
            {isSolo ? 'Your score' : 'Score'}: <span className="font-display text-lg text-pp-text">{winner.total}</span>
          </p>
        </div>

        {/* Scoreboard */}
        {!isSolo && (
          <div className="mb-6 flex flex-col gap-2">
            {totals.map(({ player, total }, i) => {
              const color = PLAYER_COLORS[parseInt(player.id)] ?? '#9CA3AF'
              return (
                <div
                  key={player.id}
                  className={`flex items-center rounded-xl px-5 py-4 shadow-[var(--shadow-card)] ${i === 0 ? 'bg-[#FBEEE6] ring-1 ring-[#E8A98B]/40' : 'bg-white'}`}
                >
                  <span className="mr-3 text-xl">{MEDALS[i] ?? `${i + 1}.`}</span>
                  <div
                    className="mr-3 h-4 w-4 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-semibold text-pp-text">{player.name}</span>
                  <div className="mx-3 flex-1 border-b border-dotted border-zinc-300" />
                  <span
                    className="font-display text-2xl"
                    style={{ color: i === 0 ? '#E8A98B' : '#1B2E2B' }}
                  >
                    {total}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Ticket-style voucher — only shown if configured in admin */}
        {voucher && (
          <div className="relative mb-6">
            <div className="absolute left-[-10px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-pp-bg-tint" />
            <div className="absolute right-[-10px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-pp-bg-tint" />
            <div
              className="rounded-2xl px-6 py-5 text-center"
              style={{
                background: '#fffdf0',
                border: '2px dashed #F5F0A9',
                backgroundImage: 'repeating-linear-gradient(45deg, rgba(232,169,139,0.1), rgba(232,169,139,0.1) 10px, transparent 10px, transparent 20px)',
              }}
            >
              <p className="text-3xl">🎉</p>
              <p className="mt-2 font-display text-xl text-pp-accent">{voucher.title}</p>
              <p className="mt-1 text-sm text-pp-text-light">{voucher.description}</p>
              {voucher.promo_code && (
                <div className="mx-auto mt-3 inline-block rounded-lg border border-dashed border-pp-text-light bg-white px-5 py-2 font-mono text-sm font-bold tracking-[3px] text-pp-text">
                  {voucher.promo_code}
                </div>
              )}
              {voucher.valid_days > 0 && (
                <p className="mt-2 text-xs text-pp-text-light">Valid for {voucher.valid_days} days</p>
              )}
            </div>
          </div>
        )}

        {/* Standing $5 replay offer — kiosk redemption, no external link */}
        <div className="mb-6 rounded-2xl border-2 border-dashed border-pp-secondary bg-white px-5 py-4 text-center">
          <p className="font-display text-xl text-pp-accent">🎉 Play again for just $5!</p>
          <p className="mt-1 text-xs text-pp-text-light">Show this screen at the kiosk</p>
        </div>

        <button
          onClick={() => router.push('/leaderboard')}
          className="mb-3 flex h-[52px] w-full items-center justify-center rounded-full border-2 border-pp-primary font-display text-base text-pp-primary transition-transform active:scale-[0.97]"
        >
          View Leaderboard
        </button>

        <button
          onClick={handlePlayAgain}
          className="mb-3 flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base text-pp-primary shadow-[var(--shadow-button)] transition-transform active:scale-[0.97]"
        >
          Play Again
        </button>

        <button
          onClick={() => router.push('/feedback')}
          className="flex h-[52px] w-full items-center justify-center rounded-full border-2 border-pp-primary font-display text-base text-pp-primary transition-transform active:scale-[0.97]"
        >
          Leave Feedback
        </button>
      </main>

      {/* Toast error — bottom, auto-dismiss */}
      {saveError && !errorDismissed && (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex items-center gap-3 rounded-xl border-l-4 border-red-500 bg-[#FDE8E8] px-4 py-3 shadow-lg">
          <span className="text-sm text-red-700 flex-1">
            Could not save your round — check your connection and try again.
          </span>
          <button
            onClick={() => setErrorDismissed(true)}
            className="text-red-500 hover:text-red-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
