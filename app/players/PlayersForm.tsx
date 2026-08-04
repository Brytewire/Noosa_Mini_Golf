'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useGameStore, Player } from '@/lib/store'

const MAX_PLAYERS = 6

export const PLAYER_COLORS = ['#E8A98B', '#1B4B44', '#8FBBAE', '#F5F0A9', '#0F3630', '#C97B5A']

export function PlayersForm() {
  const router = useRouter()
  const { startGame, setEmail } = useGameStore()

  const [names, setNames] = useState(['', '', '', '', '', ''])
  const [emailValue, setEmailValue] = useState('')
  const [emailError, setEmailError] = useState('')
  const [marketingConsent, setMarketingConsent] = useState(true)
  const [consentError, setConsentError] = useState('')
  const [visiblePlayers, setVisiblePlayers] = useState(2)

  function updateName(index: number, value: string) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
  }

  function handleStart() {
    if (!names[0].trim()) return
    if (!emailValue.trim()) {
      setEmailError('Email address is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
      setEmailError('Please enter a valid email address.')
      return
    }
    if (!marketingConsent) {
      setConsentError('Please tick the box to continue.')
      return
    }
    const activePlayers: Player[] = names
      .map((name, i) => ({ id: String(i), name: name.trim() }))
      .filter((p, i) => i === 0 || p.name)
    startGame(activePlayers)
    setEmail(emailValue.trim())
    router.push('/course-rules')
  }

  const LABELS = ['Player 1 ★', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6']
  const PLACEHOLDERS = ['Required', 'Optional', 'Optional', 'Optional', 'Optional', 'Optional']

  return (
    <div className="min-h-screen bg-pp-bg-tint">
      {/* Header */}
      <div className="rounded-b-3xl bg-pp-primary px-6 pb-8 pt-10 text-white">
        <button onClick={() => router.back()} className="mb-5 text-sm text-white/80 hover:text-white">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-white/20">
            <Image src="/images/NMG-Logo.webp" alt="Noosa Mini Golf" fill sizes="40px" className="object-contain p-1" />
          </div>
          <div>
            <h1 className="font-display text-xl text-white">Noosa Mini Golf</h1>
            <p className="text-sm text-white/80">18 holes</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 py-8">
        <h2 className="mb-1 font-display text-2xl text-pp-text">⛳ Who&apos;s playing?</h2>
        <p className="mb-1 text-sm text-pp-text-light">Player 1 is required. Add up to 6 players.</p>
        <p className="mb-6 text-xs text-pp-text-light">Ages 5+ · under-10s must be supervised</p>

        <div className="flex flex-col gap-4">
          {Array.from({ length: visiblePlayers }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="h-5 w-5 flex-shrink-0 rounded-full shadow-sm"
                style={{ backgroundColor: PLAYER_COLORS[i] }}
              />
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-pp-text-light">
                  {LABELS[i]}
                </label>
                <input
                  type="text"
                  placeholder={PLACEHOLDERS[i]}
                  value={names[i]}
                  onChange={(e) => updateName(i, e.target.value)}
                  maxLength={20}
                  className="pp-input h-[52px] w-full rounded-xl border-2 border-pp-border bg-white px-4 text-pp-text placeholder-[#B0A090] transition-all focus:border-pp-secondary focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>

        {visiblePlayers < MAX_PLAYERS ? (
          <button
            onClick={() => setVisiblePlayers((v) => Math.min(v + 1, MAX_PLAYERS))}
            className="mt-3 text-sm font-semibold text-pp-primary active:text-pp-accent"
          >
            + Add player
          </button>
        ) : (
          <p className="mt-3 text-xs text-pp-text-light">Max 6 players per group — see staff for bigger groups</p>
        )}

        {/* Email field */}
        <div className="mt-8">
          <label className="mb-1 block text-sm font-semibold text-pp-text">
            Email Address <span className="text-pp-accent">*</span>
          </label>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={emailValue}
            onChange={(e) => { setEmailValue(e.target.value); setEmailError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            className="pp-input h-[52px] w-full rounded-xl border-2 border-pp-border bg-white px-4 text-pp-text placeholder-[#B0A090] transition-all focus:border-pp-secondary focus:outline-none"
          />
          {emailError && <p className="mt-1 text-xs text-pp-accent">{emailError}</p>}
        </div>

        {/* Marketing consent */}
        <div className="mt-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => { setMarketingConsent(e.target.checked); setConsentError('') }}
              className="mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer accent-pp-primary"
            />
            <span className="text-sm leading-relaxed text-pp-text-light">
              Send me my scorecard, rewards or specials from this venue or associated venues.
            </span>
          </label>
          {consentError && <p className="mt-1.5 text-xs text-pp-accent">{consentError}</p>}
        </div>

        <button
          onClick={handleStart}
          disabled={!names[0].trim() || !emailValue.trim()}
          className="mt-8 flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base tracking-wide text-pp-primary shadow-[var(--shadow-button)] transition-transform active:scale-[0.97] disabled:bg-[#D5DDD5] disabled:text-[#8A9A8A] disabled:shadow-none"
        >
          Start Round →
        </button>
      </main>
    </div>
  )
}
