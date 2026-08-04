'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { HOLES } from '@/lib/holes'
import { useGameStore } from '@/lib/store'
import { HoleMap } from '@/app/components/HoleMap'
import { Confetti } from '@/app/components/Confetti'
import { supabase } from '@/lib/supabase'

interface AdvertData {
  id: string
  name: string
  image_url: string
  book_url: string
}

interface RewardData {
  id: string
  name: string
  description: string
  prize_value: string
  image_url: string
}

export default function ScorePage() {
  const params = useParams<{ hole: string }>()
  const router = useRouter()
  const hole = Number(params.hole)

  const { players, scores, email, setScore } = useGameStore()
  const holeData = HOLES[hole - 1]

  const [pendingAdvert, setPendingAdvert] = useState<AdvertData | null>(null)
  const [showAdvert, setShowAdvert] = useState(false)

  // In-app browser overlay for the advert's booking link
  const [adLinkUrl, setAdLinkUrl] = useState<string | null>(null)
  const [adLinkLoading, setAdLinkLoading] = useState(false)
  const [iframeSize, setIframeSize] = useState<{ width: number; height: number } | null>(null)
  const iframeLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const iframeOpenedAtRef = useRef(0)
  const adLinkUrlRef = useRef<string | null>(null)

  const [pendingReward, setPendingReward] = useState<RewardData | null>(null)
  const [claimId, setClaimId] = useState<string | null>(null)

  // Hole-in-one celebration — fires for every score of 1
  const [showHoleInOne, setShowHoleInOne] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [holeInOneWinner, setHoleInOneWinner] = useState('')
  const [emailingSelf, setEmailingSelf] = useState(false)

  // Tracks which player IDs have already triggered the overlay on this hole
  const celebratedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (players.length === 0) {
      router.replace('/')
    }
  }, [players.length, router])

  // Reset celebration tracking when hole changes
  useEffect(() => {
    celebratedRef.current = new Set()
    setPendingReward(null)
    setClaimId(null)
    setShowHoleInOne(false)
    setShowConfetti(false)
  }, [hole])

  useEffect(() => {
    if (players.length === 0) return
    supabase
      .from('adverts')
      .select('id, name, image_url, book_url')
      .eq('is_active', true)
      .contains('display_after_holes', [hole])
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setPendingAdvert(data ?? null) })
  }, [hole, players.length])

  useEffect(() => {
    if (players.length === 0) return
    supabase
      .from('rewards')
      .select('id, name, description, prize_value, image_url')
      .eq('is_active', true)
      .eq('hole_number', hole)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setPendingReward(data ?? null) })
  }, [hole, players.length])

  // Sites blocking iframes (X-Frame-Options / CSP frame-ancestors) don't expose that to
  // parent JS — cross-origin frame content is opaque. We infer a block if the frame never
  // fires `load`, or fires implausibly fast (blocked frames tend to resolve near-instantly).
  const IFRAME_LOAD_TIMEOUT_MS = 5000
  const IFRAME_SUSPICIOUSLY_FAST_MS = 250

  const handleIframeLoad = useCallback(() => {
    if (iframeLoadTimerRef.current) {
      clearTimeout(iframeLoadTimerRef.current)
      iframeLoadTimerRef.current = null
    }
    const elapsed = Date.now() - iframeOpenedAtRef.current
    if (elapsed < IFRAME_SUSPICIOUSLY_FAST_MS && adLinkUrlRef.current) {
      window.location.href = adLinkUrlRef.current
      return
    }
    setAdLinkLoading(false)
  }, [])

  // Optional cooperative signal — sites that opt in can postMessage to confirm they
  // loaded inside the frame, letting us clear the spinner before `load` even fires.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (adLinkUrlRef.current && (e.data === 'webber:iframe-ready' || e.data?.type === 'webber:iframe-ready')) {
        handleIframeLoad()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [handleIframeLoad])

  useEffect(() => {
    return () => {
      if (iframeLoadTimerRef.current) clearTimeout(iframeLoadTimerRef.current)
    }
  }, [])

  // Nested iframes ignore the child page's <meta name="viewport"> tag — mobile Safari in
  // particular falls back to a desktop-width layout unless the iframe's pixel size is given
  // explicitly, so we measure the real viewport and set it as width/height attributes below.
  const ADLINK_HEADER_HEIGHT = 56
  useEffect(() => {
    if (!adLinkUrl) return
    function updateSize() {
      setIframeSize({ width: window.innerWidth, height: window.innerHeight - ADLINK_HEADER_HEIGHT })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [adLinkUrl])

  if (players.length === 0) {
    return <div className="min-h-screen bg-pp-bg-tint" />
  }

  const allScored = players.every((p) => (scores[p.id]?.[hole - 1] ?? 0) > 0)
  const isLastHole = hole === 18

  const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th']
  const POSITION_STYLES: Record<string, string> = {
    '1st': 'bg-amber-400 text-white',
    '2nd': 'bg-slate-400 text-white',
    '3rd': 'bg-orange-700 text-white',
    '4th': 'bg-zinc-300 text-zinc-700',
    '5th': 'bg-zinc-300 text-zinc-700',
    '6th': 'bg-zinc-300 text-zinc-700',
  }

  const runningTotal = (playerId: string) =>
    scores[playerId]?.slice(0, hole - 1).reduce((sum, s) => sum + s, 0) ?? 0

  const positions: Record<string, string> = {}
  if (hole > 1) {
    ;[...players]
      .map((p) => ({ id: p.id, total: runningTotal(p.id) }))
      .sort((a, b) => a.total - b.total)
      .forEach((p, i) => { positions[p.id] = ORDINALS[i] ?? `${i + 1}th` })
  }

  function handleBack() {
    if (hole === 1) {
      router.push('/players')
    } else {
      router.push(`/score/${hole - 1}`)
    }
  }

  function logEvent(advertId: string, eventType: 'impression' | 'book' | 'skip') {
    supabase.from('advert_events').insert({ advert_id: advertId, event_type: eventType }).then()
  }

  async function logRewardClaim(playerName: string, reward: RewardData) {
    const { data } = await supabase.from('reward_claims').insert({
      reward_id: reward.id,
      reward_name: reward.name,
      player_name: playerName,
      player_email: email ?? null,
      hole_number: hole,
      prize_value: reward.prize_value,
    }).select('id').single()
    if (data?.id) setClaimId(data.id)
  }

  function handleScoreClick(playerId: string, playerName: string, currentScore: number, n: number) {
    setScore(playerId, hole - 1, n)
    // Show hole-in-one celebration for any score of 1, once per player per hole
    if (n === 1 && currentScore !== 1 && !celebratedRef.current.has(playerId)) {
      celebratedRef.current.add(playerId)
      setHoleInOneWinner(playerName)
      setShowConfetti(true)
      setShowHoleInOne(true)
      if (pendingReward) logRewardClaim(playerName, pendingReward)
    }
  }

  async function handleEmailReward() {
    if (!email || !pendingReward) return
    setEmailingSelf(true)
    await fetch('/api/send-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        playerName: holeInOneWinner,
        rewardName: pendingReward.name,
        prizeValue: pendingReward.prize_value,
        description: pendingReward.description,
        holeNumber: hole,
      }),
    })
    if (claimId) {
      await supabase.from('reward_claims').update({ emailed: true }).eq('id', claimId)
    }
    setEmailingSelf(false)
    setShowHoleInOne(false)
  }

  function handleNext() {
    if (pendingAdvert) {
      logEvent(pendingAdvert.id, 'impression')
      setShowAdvert(true)
      return
    }
    navigateNext()
  }

  function navigateNext() {
    if (isLastHole) {
      router.push('/results')
    } else {
      router.push(`/score/${hole + 1}`)
    }
  }

  function openAdLink(url: string) {
    setAdLinkLoading(true)
    iframeOpenedAtRef.current = Date.now()
    adLinkUrlRef.current = url
    setAdLinkUrl(url)
    iframeLoadTimerRef.current = setTimeout(() => {
      window.location.href = url
    }, IFRAME_LOAD_TIMEOUT_MS)
  }

  function closeAdLink() {
    if (iframeLoadTimerRef.current) {
      clearTimeout(iframeLoadTimerRef.current)
      iframeLoadTimerRef.current = null
    }
    adLinkUrlRef.current = null
    setAdLinkUrl(null)
    setAdLinkLoading(false)
    setShowAdvert(false)
    navigateNext()
  }

  return (
    <div className="min-h-screen bg-pp-bg">

      {showConfetti && <Confetti />}

      {/* ── Hole-in-one celebration overlay ── */}
      {showHoleInOne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6">

          <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-elevated)]">

            {/* Celebration header */}
            <div className="bg-pp-primary px-6 py-8 text-center">
              <div className="flex justify-center gap-3 text-4xl">
                <span>⭐</span><span>🎯</span><span>⭐</span>
              </div>
              <h2 className="mt-3 font-display text-5xl text-pp-secondary tracking-wide">
                HOLE IN ONE!
              </h2>
              <p className="mt-2 font-display text-2xl text-white">{holeInOneWinner}</p>
              <p className="mt-1 text-sm text-white/60">Hole {hole}</p>
            </div>

            <div className="px-6 py-5">
              {pendingReward ? (
                <>
                  {pendingReward.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pendingReward.image_url}
                      alt={pendingReward.name}
                      className="w-full rounded-xl object-contain"
                      style={{ maxHeight: '340px' }}
                    />
                  )}
                  <div className="mt-5 flex flex-col gap-2">
                    {email && (
                      <button
                        onClick={handleEmailReward}
                        disabled={emailingSelf}
                        className="flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base text-pp-primary shadow-[var(--shadow-button)] active:scale-[0.97] disabled:opacity-50"
                      >
                        {emailingSelf ? 'Sending…' : '📧 Email Prize to Me'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowHoleInOne(false)}
                      className="flex h-[52px] w-full items-center justify-center rounded-full border-2 border-pp-primary font-display text-base text-pp-primary active:bg-pp-bg"
                    >
                      Collect at Counter →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* No prize — just celebration */}
                  <div className="rounded-2xl bg-pp-bg px-5 py-5 text-center">
                    <p className="text-3xl">🎉</p>
                    <p className="mt-2 font-display text-xl text-pp-primary">Amazing shot!</p>
                    <p className="mt-1 text-sm text-pp-text-light">
                      The hole never stood a chance.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHoleInOne(false)}
                    className="mt-5 flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base text-pp-primary shadow-[var(--shadow-button)] active:scale-[0.97]"
                  >
                    Keep Playing! →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Advert overlay ── */}
      {showAdvert && pendingAdvert && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Branded header */}
          <div className="flex h-12 shrink-0 items-center justify-center bg-pp-primary">
            <span className="font-display text-sm tracking-widest text-pp-secondary">PUTT PUTT</span>
          </div>
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingAdvert.image_url}
              alt={pendingAdvert.name}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="shrink-0 flex items-center gap-3 bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
            <button
              onClick={() => { logEvent(pendingAdvert.id, 'skip'); navigateNext() }}
              className="flex-1 h-[52px] rounded-full border-2 border-pp-border font-semibold text-pp-text-light"
            >
              Skip
            </button>
            {pendingAdvert.book_url ? (
              <button
                onClick={() => {
                  logEvent(pendingAdvert.id, 'book')
                  openAdLink(pendingAdvert.book_url)
                }}
                className="flex-1 flex h-[52px] items-center justify-center rounded-full bg-pp-accent font-display text-base text-white active:scale-[0.97]"
              >
                Book Now
              </button>
            ) : (
              <button
                onClick={() => { logEvent(pendingAdvert.id, 'skip'); navigateNext() }}
                className="flex-1 flex h-[52px] items-center justify-center rounded-full bg-pp-primary font-display text-base text-white active:scale-[0.97]"
              >
                {isLastHole ? '🏆 See Final Scores' : 'Continue →'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── In-app browser overlay for advert booking link ── */}
      {adLinkUrl && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black">
          <div className="flex h-14 shrink-0 items-center bg-pp-primary px-4">
            <button
              onClick={closeAdLink}
              className="flex h-9 items-center gap-1.5 rounded-full bg-pp-secondary px-4 font-display text-sm text-pp-primary active:scale-[0.97]"
            >
              <span aria-hidden>←</span> Return to Scorecard
            </button>
          </div>
          <div className="relative flex-1 min-h-0 bg-white">
            {adLinkLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-pp-border border-t-pp-primary" />
              </div>
            )}
            <iframe
              key={adLinkUrl}
              src={adLinkUrl}
              onLoad={handleIframeLoad}
              title="Advert destination"
              className="h-full w-full border-0"
              width={iframeSize?.width}
              height={iframeSize?.height}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
            />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-b-3xl bg-pp-primary px-4 pb-5 pt-8 text-white">
        <div className="flex items-center justify-between">
          <button onClick={handleBack} className="text-sm text-white/80 hover:text-white">
            ← Back
          </button>
          <div className="text-center">
            <p className="text-xs text-white/70">Noosa Mini Golf</p>
            <p className="font-display text-4xl text-white">Hole {hole} of 18</p>
          </div>
          <div className="w-12" />
        </div>
        {/* Gold progress bar — 12px tall */}
        <div className="mt-4 h-3 w-full rounded-full bg-white/20">
          <div
            className="h-3 rounded-full bg-pp-secondary transition-all duration-500"
            style={{ width: `${(hole / 18) * 100}%` }}
          />
        </div>
      </div>

      <main className="mx-auto max-w-md px-4 py-4">
        {/* Score buttons per player */}
        <p className="mb-2 text-sm font-semibold text-pp-text-light">How many shots?</p>
        <div className="flex flex-col gap-3">
          {players.map((player) => {
            const current = scores[player.id]?.[hole - 1] ?? 0
            const pos = positions[player.id]
            return (
              <div key={player.id} className="rounded-2xl bg-white px-4 py-4 shadow-[var(--shadow-card)]">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {hole > 1 && pos && (
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${POSITION_STYLES[pos] ?? 'bg-zinc-300 text-zinc-700'}`}>
                        {pos}
                      </span>
                    )}
                    <p className="font-display text-base text-pp-text">{player.name}</p>
                  </div>
                  {hole > 1 && (
                    <p className="text-base text-pp-text-light">
                      Score Total:{' '}
                      <span className="font-display text-2xl font-bold text-pp-text">{runningTotal(player.id)}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleScoreClick(player.id, player.name, current, n)}
                      className={`flex h-14 flex-1 items-center justify-center rounded-xl border-2 font-display text-xl transition-all active:scale-95
                        ${current === n
                          ? 'border-pp-secondary bg-pp-secondary text-pp-primary shadow-[var(--shadow-button)] scale-[1.05]'
                          : 'border-pp-border bg-white text-pp-text hover:border-pp-secondary/50'
                        }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {current === 1 && (
                  <p className="mt-2 text-center text-xs font-semibold text-pp-accent">⭐ Hole in one!</p>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={!allScored}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base tracking-wide text-pp-primary shadow-[var(--shadow-button)] transition-transform active:scale-[0.97] disabled:bg-[#D5DDD5] disabled:text-[#8A9A8A] disabled:shadow-none"
        >
          {isLastHole ? '🏆 See Final Scores →' : `Next: Hole ${hole + 1} →`}
        </button>

        {/* Hole map */}
        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)]">
          <HoleMap hole={hole} />
          {holeData?.isChallenge ? (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-2">
              <p className="text-xs font-semibold text-amber-700">🎡 Challenge Hole — spin the wheel first!</p>
              <p className="text-xs text-amber-600">{holeData.challengeText}</p>
            </div>
          ) : (
            <div className="border-l-4 border-pp-secondary bg-white px-4 py-3">
              {pendingReward ? (
                <p className="text-xs font-semibold text-pp-accent">🎯 Hole-in-one prize available on this hole!</p>
              ) : (
                <p className="text-xs italic text-pp-text-light">💡 {holeData?.tip}</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
