'use client'

import { useRouter } from 'next/navigation'

const RULES = [
  'Please consider allowing small groups to play through.',
  'Maximum 6 players per hole.',
  'After 5 shots, pick up your ball and mark 6 on your scorecard.',
  'Each player completes the hole before the next player starts.',
  'Tee off from the mat.',
  'Ball against rail can be moved out 1 clubhead length.',
  '1 stroke penalty for out of bounds ball. Replace ball at point of exit.',
]

export default function CourseRulesPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-pp-bg">
      {/* Header */}
      <div className="rounded-b-3xl bg-pp-primary px-6 pb-8 pt-10 text-white">
        <button
          onClick={() => router.back()}
          className="mb-5 text-sm text-white/80 hover:text-white"
        >
          ← Back
        </button>
        <h1 className="font-display text-3xl text-white">Course Rules</h1>
        <p className="mt-1 text-sm text-white/80">For the enjoyment of your game and others</p>
      </div>

      <main className="mx-auto max-w-md px-4 py-8">
        <button
          onClick={() => router.push('/score/1')}
          className="flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base tracking-wide text-pp-primary shadow-[var(--shadow-button)] transition-transform active:scale-[0.97]"
        >
          Let&apos;s Play! →
        </button>

        {/* Rules card */}
        <div className="mt-4 rounded-2xl bg-white px-5 py-6 shadow-[var(--shadow-card)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="text-3xl">⛳</span>
            <h2 className="font-display text-xl text-pp-text">Before you tee off</h2>
          </div>

          <div className="flex flex-col gap-4">
            {RULES.map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pp-secondary">
                  <span className="font-display text-xs font-bold text-pp-primary">{i + 1}</span>
                </div>
                <p className="text-sm leading-relaxed text-pp-text">{rule}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-pp-border pt-5 text-center">
            <p className="font-display text-lg italic text-pp-primary">Enjoy Your Game!</p>
          </div>
        </div>

        {/* 5-stroke limit callout */}
        <div className="mt-4 rounded-2xl border-l-4 border-pp-secondary bg-white px-5 py-4 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-pp-text-light">
            5 Stroke Limit
          </p>
          <p className="mt-1 text-sm text-pp-text">
            After 5 shots, pick up your ball and mark <span className="font-bold text-pp-accent">6</span> on your scorecard.
          </p>
        </div>
      </main>
    </div>
  )
}
