'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useGameStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'

const RATINGS = [
  { value: 4, emoji: '😄', label: 'Excellent', sublabel: 'Loved it!', bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700' },
  { value: 3, emoji: '😊', label: 'Good',      sublabel: 'Pretty good', bg: 'bg-pp-bg', border: 'border-pp-secondary', text: 'text-pp-primary' },
  { value: 2, emoji: '😐', label: 'Okay',      sublabel: 'Could be better', bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700' },
  { value: 1, emoji: '😞', label: 'Poor',      sublabel: 'Needs improvement', bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-600' },
]

export default function FeedbackPage() {
  const router = useRouter()
  const { email } = useGameStore()

  const [selected, setSelected] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(false)

  async function handleSubmit() {
    if (selected === null) return
    setSubmitting(true)
    setError(false)

    const { error: dbError } = await supabase.from('feedback').insert({
      rating: selected,
      comment: comment.trim() || null,
      email: email ?? null,
    })

    setSubmitting(false)
    if (dbError) {
      setError(true)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-pp-bg">
        <div className="rounded-b-3xl bg-pp-primary px-6 pb-8 pt-10 text-white">
          <button onClick={() => router.push('/results')} className="mb-5 text-sm text-white/80 hover:text-white">
            ← Back
          </button>
          <h1 className="font-display text-3xl text-white">Leave Feedback</h1>
        </div>
        <main className="mx-auto max-w-md px-4 py-12 text-center">
          <div className="rounded-2xl bg-white px-6 py-10 shadow-[var(--shadow-card)]">
            <p className="text-6xl">🙏</p>
            <h2 className="mt-4 font-display text-2xl text-pp-primary">Thanks for your feedback!</h2>
            <p className="mt-2 text-sm text-pp-text-light">We really appreciate you taking the time to share your experience.</p>
            <button
              onClick={() => router.push('/results')}
              className="mt-8 flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base text-pp-primary shadow-[var(--shadow-button)] transition-transform active:scale-[0.97]"
            >
              Back to Results
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pp-bg">
      {/* Header */}
      <div className="rounded-b-3xl bg-pp-primary px-6 pb-8 pt-10 text-white">
        <button onClick={() => router.back()} className="mb-5 text-sm text-white/80 hover:text-white">
          ← Back
        </button>
        <h1 className="font-display text-3xl text-white">Leave Feedback</h1>
        <p className="mt-1 text-sm text-white/80">How was your overall experience?</p>
      </div>

      <main className="mx-auto max-w-md px-4 py-8">
        {/* Rating selector */}
        <div className="flex flex-col gap-3">
          {RATINGS.map((r) => {
            const isSelected = selected === r.value
            return (
              <button
                key={r.value}
                onClick={() => setSelected(r.value)}
                className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all active:scale-[0.98]
                  ${isSelected
                    ? `${r.bg} ${r.border} shadow-[var(--shadow-card)]`
                    : 'border-pp-border bg-white'
                  }`}
              >
                <span className="text-4xl">{r.emoji}</span>
                <div className="flex-1">
                  <p className={`font-display text-lg ${isSelected ? r.text : 'text-pp-text'}`}>{r.label}</p>
                  <p className="text-xs text-pp-text-light">{r.sublabel}</p>
                </div>
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all
                  ${isSelected ? `${r.border} ${r.border.replace('border-', 'bg-')}` : 'border-pp-border'}`}>
                  {isSelected && (
                    <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2,6 5,9 10,3" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Comment field */}
        <div className="mt-6">
          <label className="mb-1 block text-sm font-semibold text-pp-text">
            Any other comments? <span className="font-normal text-pp-text-light">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you thought..."
            rows={4}
            maxLength={500}
            className="w-full rounded-xl border-2 border-pp-border bg-white px-4 py-3 text-base text-pp-text placeholder-[#A0B0A0] transition-all focus:border-pp-secondary focus:outline-none resize-none"
          />
          <p className="mt-1 text-right text-xs text-pp-text-light">{comment.length}/500</p>
        </div>

        {error && (
          <p className="mt-3 text-sm text-pp-accent">Something went wrong — please try again.</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={selected === null || submitting}
          className="mt-6 flex h-[52px] w-full items-center justify-center rounded-full bg-pp-secondary font-display text-base tracking-wide text-pp-primary shadow-[var(--shadow-button)] transition-transform active:scale-[0.97] disabled:bg-[#D5DDD5] disabled:text-[#8A9A8A] disabled:shadow-none"
        >
          {submitting ? 'Submitting…' : 'Submit Feedback'}
        </button>
      </main>
    </div>
  )
}
