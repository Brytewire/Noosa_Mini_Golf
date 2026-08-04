'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { adminSelect, adminInsert, adminUpdate, adminDelete } from '@/lib/admin-db'
import AnalyticsSection from './analytics-section'
import { ClipboardList, Mail, Gift, Megaphone, BarChart2, Trophy, Pencil, Trash2, MessageSquare, type LucideIcon } from 'lucide-react'

// ── Interfaces ─────────────────────────────────────────────────────────────────

interface PlayerRow {
  id: string
  player_name: string
  total_score: number
}

interface Round {
  id: string
  email: string
  created_at: string
  started_at: string | null
  players: PlayerRow[]
}

interface EditPlayer {
  id: string
  name: string
  scores: number[]
}

interface EmailStat {
  email: string
  firstSeen: string
  roundCount: number
}

interface Advert {
  id: string
  name: string
  image_url: string
  book_url: string
  display_after_holes: number[]
  is_active: boolean
  created_at: string
}

interface Reward {
  id: string
  name: string
  description: string
  hole_number: number
  prize_value: string
  image_url: string
  is_active: boolean
  created_at: string
}

interface CompletionVoucher {
  id: string
  title: string
  description: string
  promo_code: string
  valid_days: number
  is_active: boolean
  created_at: string
}

interface RewardClaim {
  id: string
  reward_id: string
  reward_name: string
  player_name: string
  player_email: string | null
  hole_number: number
  prize_value: string
  emailed: boolean
  created_at: string
}

type Section = 'rounds' | 'emails' | 'adverts' | 'analytics' | 'leaderboard' | 'rewards' | 'feedback'

const NAV: { id: Section; label: string; Icon: LucideIcon }[] = [
  { id: 'rounds',      label: 'Rounds',      Icon: ClipboardList },
  { id: 'emails',      label: 'Emails',      Icon: Mail },
  { id: 'rewards',     label: 'Rewards',     Icon: Gift },
  { id: 'adverts',     label: 'Adverts',     Icon: Megaphone },
  { id: 'analytics',   label: 'Analytics',   Icon: BarChart2 },
  { id: 'leaderboard', label: 'Leaderboard', Icon: Trophy },
  { id: 'feedback',    label: 'Feedback',    Icon: MessageSquare },
]

// ── Auth gate ──────────────────────────────────────────────────────────────────

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true); setError('')
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) { sessionStorage.setItem('admin_auth', '1'); sessionStorage.setItem('admin_pw', password); onSuccess() }
    else setError('Incorrect password.')
  }

  return (
    <div
      className="flex min-h-screen items-start justify-center pt-[10vh]"
      style={{
        backgroundImage: 'url(/images/Admin%20Home%20Background.png)',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center top',
      }}
    >
      <div className="w-full max-w-[260px] rounded-2xl bg-white px-6 py-6 shadow-xl">
        <div className="mb-4 flex justify-center">
          <Image src="/images/NMG-Logo.webp" alt="Noosa Mini Golf" width={140} height={90} className="object-contain" />
        </div>
        <h1 className="text-center text-lg font-bold text-pp-primary">Admin Login</h1>
        <p className="mt-0.5 text-center text-xs text-pp-text-light">Noosa Mini Golf</p>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="mt-5 w-full rounded-xl border border-pp-border bg-white px-3 py-2.5 text-sm text-pp-text placeholder-[#A0B0A0] focus:outline-none focus:ring-2 focus:ring-pp-primary"
        />
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        <button
          onClick={handleLogin}
          disabled={!password || loading}
          className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-pp-primary text-sm font-semibold text-white disabled:opacity-40"
        >
          {loading ? 'Checking…' : 'Login'}
        </button>
      </div>
    </div>
  )
}

// ── Edit modal ─────────────────────────────────────────────────────────────────

function EditModal({ round, onClose, onSaved }: {
  round: Round
  onClose: () => void
  onSaved: (updated: Round) => void
}) {
  const [editPlayers, setEditPlayers] = useState<EditPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: scoresRaw } = await supabase
        .from('scores')
        .select('player_id, hole_number, score')
        .eq('round_id', round.id)
        .order('hole_number', { ascending: true })

      const byPlayer: Record<string, number[]> = {}
      for (const s of scoresRaw ?? []) {
        if (!byPlayer[s.player_id]) byPlayer[s.player_id] = new Array(18).fill(0)
        byPlayer[s.player_id][s.hole_number - 1] = s.score
      }

      setEditPlayers(
        round.players.map((p) => ({
          id: p.id,
          name: p.player_name,
          scores: byPlayer[p.id] ?? new Array(18).fill(0),
        }))
      )
      setLoading(false)
    }
    load()
  }, [round])

  function setName(idx: number, name: string) {
    setEditPlayers((prev) => prev.map((p, i) => i === idx ? { ...p, name } : p))
  }

  function setScore(playerIdx: number, holeIdx: number, val: string) {
    const n = Math.max(1, Math.min(20, parseInt(val) || 1))
    setEditPlayers((prev) =>
      prev.map((p, i) => i !== playerIdx ? p : {
        ...p,
        scores: p.scores.map((s, j) => j === holeIdx ? n : s),
      })
    )
  }

  async function handleSave() {
    setSaving(true)
    for (const p of editPlayers) {
      const total = p.scores.reduce((sum, s) => sum + s, 0)
      await adminUpdate('players', { player_name: p.name, total_score: total }, [{ col: 'id', op: 'eq', val: p.id }])
      for (let i = 0; i < p.scores.length; i++) {
        await adminUpdate('scores', { score: p.scores[i] }, [{ col: 'player_id', op: 'eq', val: p.id }, { col: 'hole_number', op: 'eq', val: i + 1 }])
      }
    }
    const updatedRound: Round = {
      ...round,
      players: editPlayers
        .map((p) => ({ id: p.id, player_name: p.name, total_score: p.scores.reduce((sum, s) => sum + s, 0) }))
        .sort((a, b) => a.total_score - b.total_score),
    }
    setSaving(false)
    onSaved(updatedRound)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-700">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="font-bold text-white">Edit Round</h2>
            <p className="text-xs text-zinc-400">{new Date(round.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-zinc-500">Loading scores…</div>
        ) : (
          <>
            <div className="border-b border-zinc-800 px-6 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Player Names</p>
              <div className="flex flex-wrap gap-3">
                {editPlayers.map((p, i) => (
                  <div key={p.id} className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-500">Player {i + 1}</label>
                    <input
                      value={p.name}
                      onChange={(e) => setName(i, e.target.value)}
                      className="w-36 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pp-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Hole Scores</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500">
                    <th className="pb-2 pr-4 text-left">Hole</th>
                    {editPlayers.map((p) => (
                      <th key={p.id} className="pb-2 px-2 text-center">{p.name.split(' ')[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {Array.from({ length: 18 }, (_, holeIdx) => (
                    <tr key={holeIdx}>
                      <td className="py-1.5 pr-4 text-zinc-400">{holeIdx + 1}</td>
                      {editPlayers.map((p, playerIdx) => (
                        <td key={p.id} className="px-2 py-1.5 text-center">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={p.scores[holeIdx]}
                            onChange={(e) => setScore(playerIdx, holeIdx, e.target.value)}
                            className="w-14 rounded-lg bg-zinc-800 px-2 py-1 text-center text-sm text-white focus:outline-none focus:ring-2 focus:ring-pp-primary"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-zinc-700">
                    <td className="pt-3 text-xs font-bold text-zinc-400 uppercase">Total</td>
                    {editPlayers.map((p) => (
                      <td key={p.id} className="pt-3 px-2 text-center font-bold text-pp-secondary">
                        {p.scores.reduce((sum, s) => sum + s, 0)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
              <button onClick={onClose} className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630] disabled:opacity-40">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Advert Modal ───────────────────────────────────────────────────────────────

function AdvertModal({ advert, onClose, onSaved }: {
  advert: Advert | null
  onClose: () => void
  onSaved: (saved: Advert) => void
}) {
  const [name, setName] = useState(advert?.name ?? '')
  const [bookUrl, setBookUrl] = useState(advert?.book_url ?? '')
  const [selectedHoles, setSelectedHoles] = useState<number[]>(advert?.display_after_holes ?? [])
  const [isActive, setIsActive] = useState(advert?.is_active ?? true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(advert?.image_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleHole(hole: number) {
    setSelectedHoles((prev) =>
      prev.includes(hole) ? prev.filter((h) => h !== hole) : [...prev, hole].sort((a, b) => a - b)
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSave() {
    if (!name.trim()) { setError('Advert name is required.'); return }
    if (!imagePreview) { setError('Please upload an image.'); return }
    setSaving(true); setError('')
    try {
      let imageUrl = advert?.image_url ?? ''
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('adverts').upload(path, imageFile, { contentType: imageFile.type })
        if (uploadError) { setError(`Image upload failed: ${uploadError.message}`); setSaving(false); return }
        const { data: urlData } = supabase.storage.from('adverts').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
      const payload = { name: name.trim(), image_url: imageUrl, book_url: bookUrl.trim(), display_after_holes: selectedHoles, is_active: isActive }
      if (advert) {
        const { data, error: updateError } = await adminUpdate('adverts', payload, [{ col: 'id', op: 'eq', val: advert.id }], { returning: true, single: true })
        if (updateError) { setError(updateError.message); setSaving(false); return }
        onSaved(data as Advert)
      } else {
        const { data, error: insertError } = await adminInsert('adverts', payload, { returning: true, single: true })
        if (insertError) { setError(insertError.message); setSaving(false); return }
        onSaved(data as Advert)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-700">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="font-bold text-white">{advert ? 'Edit Advert' : 'New Advert'}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        {error && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-3">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}

        <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Advert Name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="e.g. Golf Clubhouse — Happy Hour Specials"
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Booking Link <span className="normal-case font-normal text-zinc-600">(optional)</span>
            </label>
            <input
              value={bookUrl}
              onChange={(e) => setBookUrl(e.target.value)}
              placeholder="https://example.com/book"
              type="url"
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary"
            />
            <p className="mt-1 text-xs text-zinc-500">Players tap "Book Now" to open this link in a new tab</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Advert Image</label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} className="hidden" />
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="h-48 w-full rounded-xl object-contain bg-zinc-800" />
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 rounded-lg bg-zinc-700/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-600">
                  Change Image
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-40 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 text-zinc-500 hover:border-pp-primary hover:text-pp-primary transition-colors"
              >
                <span className="text-3xl mb-2">🖼</span>
                <span className="text-sm font-semibold">Click to upload image</span>
                <span className="text-xs mt-1">JPEG, PNG, GIF, WebP</span>
              </button>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Display After Hole</label>
              <div className="flex gap-3">
                <button onClick={() => setSelectedHoles(Array.from({ length: 18 }, (_, i) => i + 1))} className="text-xs text-pp-primary hover:text-[#0F3630]">Select All</button>
                <button onClick={() => setSelectedHoles([])} className="text-xs text-zinc-500 hover:text-zinc-300">Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-9 gap-1.5">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
                <button
                  key={hole}
                  onClick={() => toggleHole(hole)}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    selectedHoles.includes(hole) ? 'bg-pp-primary text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {hole}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">
              {selectedHoles.length === 0
                ? 'Not scheduled — advert will not display in the app'
                : `Displays after hole${selectedHoles.length > 1 ? 's' : ''}: ${selectedHoles.join(', ')}`
              }
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Active</p>
              <p className="text-xs text-zinc-400">Advert displays to players in the app</p>
            </div>
            <button
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-pp-primary' : 'bg-zinc-600'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630] disabled:opacity-40">
            {saving ? 'Saving…' : advert ? 'Save Changes' : 'Create Advert'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Adverts Section ────────────────────────────────────────────────────────────

function AdvertsSection({ adverts, setAdverts }: {
  adverts: Advert[]
  setAdverts: React.Dispatch<React.SetStateAction<Advert[]>>
}) {
  const [editingAdvert, setEditingAdvert] = useState<Advert | null>(null)
  const [creating, setCreating] = useState(false)

  async function deleteAdvert(id: string) {
    if (!confirm('Delete this advert? This cannot be undone.')) return
    await adminDelete('adverts', [{ col: 'id', op: 'eq', val: id }])
    setAdverts((prev) => prev.filter((a) => a.id !== id))
  }

  async function toggleActive(advert: Advert) {
    const { data } = await adminUpdate<Advert>('adverts', { is_active: !advert.is_active }, [{ col: 'id', op: 'eq', val: advert.id }], { returning: true, single: true })
    if (data) setAdverts((prev) => prev.map((a) => a.id === data.id ? data : a))
  }

  function handleSaved(saved: Advert) {
    setAdverts((prev) => {
      const exists = prev.find((a) => a.id === saved.id)
      return exists ? prev.map((a) => a.id === saved.id ? saved : a) : [saved, ...prev]
    })
    setEditingAdvert(null)
    setCreating(false)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-pp-text">Adverts</h1>
        <button onClick={() => setCreating(true)} className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630]">
          + New Advert
        </button>
      </div>

      {adverts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-5xl mb-3">📢</p>
          <p className="font-semibold text-zinc-400">No adverts yet</p>
          <p className="mt-1 text-sm text-zinc-600">Create an advert to display between holes</p>
          <button onClick={() => setCreating(true)} className="mt-5 rounded-full bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200">
            Create First Advert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {adverts.map((advert) => (
            <div key={advert.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-admin-border">
              <div className="relative h-[370px] bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={advert.image_url} alt={advert.name} className="h-full w-full object-contain" />
                <span className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold ${advert.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-500'}`}>
                  {advert.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="truncate font-semibold text-pp-text">{advert.name}</p>
                <div className="mt-2 rounded-lg bg-zinc-100 px-2.5 py-2">
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Display After Hole</p>
                  {advert.display_after_holes.length === 0
                    ? <p className="text-[10px] text-zinc-500">Not scheduled</p>
                    : (
                      <>
                        <div className="grid grid-cols-9 gap-1">
                          {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
                            <span
                              key={hole}
                              className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                                advert.display_after_holes.includes(hole)
                                  ? 'bg-pp-primary text-white'
                                  : 'bg-zinc-200 text-zinc-500'
                              }`}
                            >
                              {hole}
                            </span>
                          ))}
                        </div>
                        <p className="mt-1.5 text-[10px] text-zinc-500">
                          Displays after hole{advert.display_after_holes.length > 1 ? 's' : ''}: {advert.display_after_holes.join(', ')}
                        </p>
                      </>
                    )
                  }
                </div>
                {advert.book_url
                  ? <p className="mt-0.5 truncate text-xs text-pp-primary">Book: {advert.book_url}</p>
                  : <p className="mt-0.5 text-xs text-zinc-400">No booking link</p>
                }
                <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
                  <button onClick={() => setEditingAdvert(advert)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-pp-primary hover:bg-[#EDF5ED] transition-colors">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => toggleActive(advert)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-colors">
                    {advert.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => deleteAdvert(advert.id)} className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editingAdvert !== null) && (
        <AdvertModal
          advert={editingAdvert}
          onClose={() => { setCreating(false); setEditingAdvert(null) }}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

// ── Reward Modal ───────────────────────────────────────────────────────────────

function RewardModal({ reward, onClose, onSaved }: {
  reward: Reward | null
  onClose: () => void
  onSaved: (saved: Reward) => void
}) {
  const [name, setName] = useState(reward?.name ?? '')
  const [description, setDescription] = useState(reward?.description ?? '')
  const [prizeValue, setPrizeValue] = useState(reward?.prize_value ?? '')
  const [holeNumber, setHoleNumber] = useState(reward?.hole_number ?? 1)
  const [isActive, setIsActive] = useState(reward?.is_active ?? true)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(reward?.image_url || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSave() {
    if (!name.trim()) { setError('Reward name is required.'); return }
    if (!prizeValue.trim()) { setError('Prize value is required.'); return }
    setSaving(true); setError('')
    try {
      let imageUrl = reward?.image_url ?? ''
      if (imageFile) {
        const ext = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `reward-${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('adverts').upload(path, imageFile, { contentType: imageFile.type })
        if (uploadError) { setError(`Image upload failed: ${uploadError.message}`); setSaving(false); return }
        const { data: urlData } = supabase.storage.from('adverts').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }
      const payload = {
        name: name.trim(), description: description.trim(), prize_value: prizeValue.trim(),
        hole_number: holeNumber, image_url: imageUrl, is_active: isActive,
      }
      if (reward) {
        const { data, error: err } = await adminUpdate<Reward>('rewards', payload, [{ col: 'id', op: 'eq', val: reward.id }], { returning: true, single: true })
        if (err) { setError(err.message); setSaving(false); return }
        onSaved(data as Reward)
      } else {
        const { data, error: err } = await adminInsert<Reward>('rewards', payload, { returning: true, single: true })
        if (err) { setError(err.message); setSaving(false); return }
        onSaved(data as Reward)
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'An unexpected error occurred.') }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-700">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="font-bold text-white">{reward ? 'Edit Reward' : 'New Reward'}</h2>
          <button onClick={onClose} className="text-xl leading-none text-zinc-400 hover:text-white">✕</button>
        </div>
        {error && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-3">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}
        <div className="flex flex-1 flex-col gap-5 overflow-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Reward Name</label>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }}
              placeholder="e.g. Hole in One Special"
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Prize Value</label>
            <input value={prizeValue} onChange={e => setPrizeValue(e.target.value)}
              placeholder="e.g. $10 off your next game"
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Description <span className="normal-case font-normal text-zinc-600">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Show this screen at the counter to collect your prize."
              rows={2}
              className="w-full resize-none rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Hole Number</label>
            <div className="grid grid-cols-9 gap-1.5">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
                <button
                  key={hole}
                  type="button"
                  onClick={() => setHoleNumber(hole)}
                  className={`flex h-9 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                    holeNumber === hole ? 'bg-pp-primary text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {hole}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-500">Triggers on hole {holeNumber}</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Prize Image <span className="normal-case font-normal text-zinc-600">(optional)</span></label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleFileChange} className="hidden" />
            {imagePreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Preview" className="h-36 w-full rounded-xl object-contain bg-zinc-800" />
                <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 rounded-lg bg-zinc-700/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-600">Change</button>
                <button onClick={() => { setImagePreview(null); setImageFile(null) }} className="absolute bottom-2 left-2 rounded-lg bg-red-600/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">Remove</button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 text-zinc-500 transition-colors hover:border-pp-primary hover:text-pp-primary">
                <span className="text-2xl mb-1">🖼</span>
                <span className="text-sm font-semibold">Click to upload image</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Active</p>
              <p className="text-xs text-zinc-400">Reward triggers in the app</p>
            </div>
            <button onClick={() => setIsActive(p => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-pp-primary' : 'bg-zinc-600'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630] disabled:opacity-40">
            {saving ? 'Saving…' : reward ? 'Save Changes' : 'Create Reward'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Voucher Modal ──────────────────────────────────────────────────────────────

function VoucherModal({ voucher, onClose, onSaved }: {
  voucher: CompletionVoucher | null
  onClose: () => void
  onSaved: (saved: CompletionVoucher) => void
}) {
  const [title, setTitle] = useState(voucher?.title ?? '')
  const [description, setDescription] = useState(voucher?.description ?? 'Show this screen at the counter on your next visit.')
  const [promoCode, setPromoCode] = useState(voucher?.promo_code ?? '')
  const [validDays, setValidDays] = useState(voucher?.valid_days ?? 30)
  const [isActive, setIsActive] = useState(voucher?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError('')
    const payload = {
      title: title.trim(),
      description: description.trim(),
      promo_code: promoCode.trim(),
      valid_days: validDays,
      is_active: isActive,
    }
    if (voucher) {
      const { data, error: err } = await adminUpdate<CompletionVoucher>('completion_rewards', payload, [{ col: 'id', op: 'eq', val: voucher.id }], { returning: true, single: true })
      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data as CompletionVoucher)
    } else {
      const { data, error: err } = await adminInsert<CompletionVoucher>('completion_rewards', payload, { returning: true, single: true })
      if (err) { setError(err.message); setSaving(false); return }
      onSaved(data as CompletionVoucher)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-700">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="font-bold text-white">{voucher ? 'Edit Voucher' : 'New Completion Voucher'}</h2>
          <button onClick={onClose} className="text-xl leading-none text-zinc-400 hover:text-white">✕</button>
        </div>
        {error && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-6 py-3">
            <p className="text-sm font-medium text-red-400">{error}</p>
          </div>
        )}
        <div className="flex flex-1 flex-col gap-5 overflow-auto px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Title</label>
            <input value={title} onChange={e => { setTitle(e.target.value); setError('') }}
              placeholder="e.g. $5 off your next game!"
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Show this screen at the counter on your next visit."
              className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Promo Code <span className="normal-case font-normal text-zinc-600">(optional)</span>
              </label>
              <input value={promoCode} onChange={e => setPromoCode(e.target.value)}
                placeholder="e.g. PUTT5"
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-pp-primary font-mono uppercase" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">Valid Days</label>
              <input type="number" min={0} value={validDays} onChange={e => setValidDays(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-xl bg-zinc-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pp-primary" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Active</p>
              <p className="text-xs text-zinc-400">Voucher displays on the results screen</p>
            </div>
            <button onClick={() => setIsActive(p => !p)}
              className={`relative h-6 w-11 rounded-full transition-colors ${isActive ? 'bg-pp-primary' : 'bg-zinc-600'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
          <button onClick={onClose} className="rounded-full bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630] disabled:opacity-40">
            {saving ? 'Saving…' : voucher ? 'Save Changes' : 'Create Voucher'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Rewards Section ────────────────────────────────────────────────────────────

function RewardsSection() {
  const [rewards, setRewards] = useState<Reward[]>([])
  const [claims, setClaims] = useState<RewardClaim[]>([])
  const [vouchers, setVouchers] = useState<CompletionVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'setup' | 'claims' | 'voucher'>('setup')
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [creating, setCreating] = useState(false)
  const [emailingId, setEmailingId] = useState<string | null>(null)
  const [editingVoucher, setEditingVoucher] = useState<CompletionVoucher | null>(null)
  const [creatingVoucher, setCreatingVoucher] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [{ data: rd }, { data: cd }, { data: vd }] = await Promise.all([
      adminSelect<Reward[]>('rewards', { order: { col: 'created_at', ascending: false } }),
      adminSelect<RewardClaim[]>('reward_claims', { order: { col: 'created_at', ascending: false }, limit: 200 }),
      adminSelect<CompletionVoucher[]>('completion_rewards', { order: { col: 'created_at', ascending: false } }),
    ])
    setRewards(rd ?? [])
    setClaims(cd ?? [])
    setVouchers(vd ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function handleSaved(saved: Reward) {
    setRewards(prev => {
      const exists = prev.find(r => r.id === saved.id)
      return exists ? prev.map(r => r.id === saved.id ? saved : r) : [saved, ...prev]
    })
    setCreating(false); setEditingReward(null)
  }

  async function deleteReward(id: string) {
    if (!confirm('Delete this reward? This cannot be undone.')) return
    await adminDelete('rewards', [{ col: 'id', op: 'eq', val: id }])
    setRewards(prev => prev.filter(r => r.id !== id))
  }

  async function toggleActive(r: Reward) {
    const { data } = await adminUpdate<Reward>('rewards', { is_active: !r.is_active }, [{ col: 'id', op: 'eq', val: r.id }], { returning: true, single: true })
    if (data) setRewards(prev => prev.map(x => x.id === data.id ? data : x))
  }

  async function emailClaim(claim: RewardClaim) {
    if (!claim.player_email) return
    setEmailingId(claim.id)
    await fetch('/api/send-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: claim.player_email, playerName: claim.player_name, rewardName: claim.reward_name,
        prizeValue: claim.prize_value, description: '', holeNumber: claim.hole_number,
      }),
    })
    await supabase.from('reward_claims').update({ emailed: true }).eq('id', claim.id)
    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, emailed: true } : c))
    setEmailingId(null)
  }

  function handleVoucherSaved(saved: CompletionVoucher) {
    setVouchers(prev => {
      const exists = prev.find(v => v.id === saved.id)
      return exists ? prev.map(v => v.id === saved.id ? saved : v) : [saved, ...prev]
    })
    setCreatingVoucher(false); setEditingVoucher(null)
  }

  async function deleteVoucher(id: string) {
    if (!confirm('Delete this voucher? This cannot be undone.')) return
    await adminDelete('completion_rewards', [{ col: 'id', op: 'eq', val: id }])
    setVouchers(prev => prev.filter(v => v.id !== id))
  }

  async function toggleVoucherActive(v: CompletionVoucher) {
    const { data } = await adminUpdate<CompletionVoucher>('completion_rewards', { is_active: !v.is_active }, [{ col: 'id', op: 'eq', val: v.id }], { returning: true, single: true })
    if (data) setVouchers(prev => prev.map(x => x.id === data.id ? data : x))
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-pp-text">Rewards</h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-zinc-100 p-0.5">
            {(['setup', 'claims', 'voucher'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-pp-primary text-white shadow-sm' : 'text-pp-text-light hover:text-pp-text'}`}>
                {tab === 'setup' ? 'Hole-in-One' : tab === 'claims' ? `Claims${claims.length > 0 ? ` (${claims.length})` : ''}` : 'Completion'}
              </button>
            ))}
          </div>
          {activeTab === 'setup' && (
            <button onClick={() => setCreating(true)} className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630]">
              + New Reward
            </button>
          )}
          {activeTab === 'voucher' && (
            <button onClick={() => setCreatingVoucher(true)} className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630]">
              + New Voucher
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-zinc-400">Loading…</div>
      ) : activeTab === 'setup' ? (
        rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl mb-3">🎁</p>
            <p className="font-semibold text-zinc-400">No rewards configured yet</p>
            <p className="mt-1 text-sm text-zinc-500">Add a hole-in-one prize for any hole</p>
            <button onClick={() => setCreating(true)} className="mt-5 rounded-full bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200">
              Create First Reward
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {rewards.map(reward => {
              return (
                <div key={reward.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-admin-border">
                  {reward.image_url ? (
                    <div className="relative h-[370px] bg-zinc-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={reward.image_url} alt={reward.name} className="h-full w-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex h-[370px] items-center justify-center bg-pp-primary">
                      <span className="text-4xl">🎯</span>
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-pp-text leading-tight">{reward.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${reward.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {reward.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-pp-primary">{reward.prize_value}</p>
                    {reward.description && <p className="mt-1 truncate text-xs text-zinc-400">{reward.description}</p>}
                    <div className="mt-2 rounded-lg bg-zinc-100 px-2.5 py-2">
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Triggers On Hole</p>
                      <div className="grid grid-cols-9 gap-1">
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((hole) => (
                          <span
                            key={hole}
                            className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
                              reward.hole_number === hole ? 'bg-pp-primary text-white' : 'bg-zinc-200 text-zinc-500'
                            }`}
                          >
                            {hole}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] text-zinc-500">Triggers on hole {reward.hole_number}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
                      <button onClick={() => setEditingReward(reward)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-pp-primary hover:bg-[#EDF5ED] transition-colors">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={() => toggleActive(reward)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-colors">
                        {reward.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => deleteReward(reward.id)} className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        claims.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl mb-3">🎯</p>
            <p className="font-semibold text-zinc-400">No prize claims yet</p>
            <p className="mt-1 text-sm text-zinc-500">Claims appear here when players score hole-in-ones</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-admin-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-pp-primary">
                  <tr className="text-left text-xs text-white">
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Player</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Email</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Hole</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Prize</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap text-center">Emailed</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-border">
                  {claims.map((claim, idx) => {
                    return (
                      <tr key={claim.id} className={idx % 2 === 1 ? 'bg-admin-table-stripe' : 'bg-white'}>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{fmtDate(claim.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-pp-text">{claim.player_name}</td>
                        <td className="px-4 py-3 text-zinc-500"><div className="max-w-[180px] truncate">{claim.player_email || '—'}</div></td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600">Hole {claim.hole_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-pp-primary">{claim.prize_value || claim.reward_name}</td>
                        <td className="px-4 py-3 text-center">
                          {claim.emailed ? <span className="text-xs font-semibold text-green-600">✓ Sent</span> : <span className="text-xs text-zinc-400">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {claim.player_email && !claim.emailed && (
                            <button onClick={() => emailClaim(claim)} disabled={emailingId === claim.id}
                              className="rounded-full bg-pp-primary px-3 py-1 text-xs font-semibold text-white hover:bg-[#0F3630] disabled:opacity-40">
                              {emailingId === claim.id ? 'Sending…' : 'Email Prize'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {activeTab === 'voucher' && (
        loading ? (
          <div className="flex h-64 items-center justify-center text-zinc-400">Loading…</div>
        ) : vouchers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-5xl mb-3">🎟️</p>
            <p className="font-semibold text-zinc-400">No completion vouchers yet</p>
            <p className="mt-1 text-sm text-zinc-500">Add a voucher to show players at the end of their round</p>
            <button onClick={() => setCreatingVoucher(true)} className="mt-5 rounded-full bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200">
              Create First Voucher
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map(v => (
              <div key={v.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-admin-border">
                <div
                  className="px-5 py-5 text-center"
                  style={{
                    background: '#fffdf0',
                    borderBottom: '2px dashed #F5C518',
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(245,197,24,0.05), rgba(245,197,24,0.05) 10px, transparent 10px, transparent 20px)',
                  }}
                >
                  <p className="text-2xl">🎉</p>
                  <p className="mt-1 font-display text-lg text-pp-accent">{v.title}</p>
                  <p className="mt-0.5 text-xs text-pp-text-light">{v.description}</p>
                  {v.promo_code && (
                    <div className="mx-auto mt-2 inline-block rounded-lg border border-dashed border-pp-text-light bg-white px-4 py-1.5 font-mono text-xs font-bold tracking-[2px] text-pp-text">
                      {v.promo_code}
                    </div>
                  )}
                  {v.valid_days > 0 && <p className="mt-1.5 text-xs text-pp-text-light">Valid {v.valid_days} days</p>}
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3">
                    <button onClick={() => setEditingVoucher(v)} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-pp-primary hover:bg-[#EDF5ED] transition-colors">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => toggleVoucherActive(v)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 transition-colors">
                      {v.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => deleteVoucher(v.id)} className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {(creating || editingReward !== null) && (
        <RewardModal
          reward={editingReward}
          onClose={() => { setCreating(false); setEditingReward(null) }}
          onSaved={handleSaved}
        />
      )}

      {(creatingVoucher || editingVoucher !== null) && (
        <VoucherModal
          voucher={editingVoucher}
          onClose={() => { setCreatingVoucher(false); setEditingVoucher(null) }}
          onSaved={handleVoucherSaved}
        />
      )}
    </>
  )
}

// ── Leaderboard Section ────────────────────────────────────────────────────────

interface LeaderboardEntry {
  id: string
  player_name: string
  total_score: number
}

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardSection() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editScore, setEditScore] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const { data: playersData } = await supabase
      .from('players').select('id, player_name, total_score').order('total_score', { ascending: true }).limit(20)
    setEntries((playersData ?? []).map((p) => ({ id: p.id, player_name: p.player_name, total_score: p.total_score })))
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  function startEdit(entry: LeaderboardEntry) {
    setEditingId(entry.id)
    setEditName(entry.player_name)
    setEditScore(String(entry.total_score))
  }

  async function handleSave(id: string) {
    setSaving(true)
    const score = Math.max(1, parseInt(editScore) || 1)
    const name = editName.trim()
    await adminUpdate('players', { player_name: name, total_score: score }, [{ col: 'id', op: 'eq', val: id }])
    setEntries((prev) =>
      prev.map((e) => e.id === id ? { ...e, player_name: name, total_score: score } : e).sort((a, b) => a.total_score - b.total_score)
    )
    setSaving(false)
    setEditingId(null)
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl text-pp-text">Leaderboard</h1>
        <div className="flex gap-3">
          <button onClick={fetchLeaderboard} className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200">
            ↺ Refresh
          </button>
          <button onClick={() => window.open('/admin/leaderboard-display', '_blank')} className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630]">
            ⊞ Display Mode
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-zinc-400">Loading…</div>
      ) : (
        <div className="mx-auto max-w-xl overflow-hidden rounded-xl bg-white ring-1 ring-admin-border">
          <div className="bg-pp-primary px-4 py-3">
            <h2 className="font-display text-lg text-white">⛳ Noosa Mini Golf</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border bg-admin-bg text-left text-xs text-pp-text-light">
                <th className="w-10 px-3 py-2 text-center font-semibold uppercase tracking-wider">Rank</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider">Player</th>
                <th className="w-16 px-3 py-2 text-center font-semibold uppercase tracking-wider">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {entries.length === 0 ? (
                <tr><td colSpan={3} className="px-3 py-10 text-center text-sm text-zinc-400">No scores yet</td></tr>
              ) : entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  onClick={() => editingId !== entry.id && startEdit(entry)}
                  className={`cursor-pointer transition-colors ${
                    editingId === entry.id
                      ? 'bg-[#EDF5ED]'
                      : i === 0
                        ? 'bg-[#FBEEE6] hover:bg-[#F7E3D4]'
                        : i % 2 === 1
                          ? 'bg-admin-table-stripe hover:bg-[#EDF5ED]'
                          : 'bg-white hover:bg-[#EDF5ED]'
                  }`}
                >
                  <td className="px-3 py-2.5 text-center">
                    {i < 3 ? <span className="text-base leading-none">{MEDALS[i]}</span> : <span className="text-sm font-semibold text-zinc-400">{i + 1}</span>}
                  </td>
                  {editingId === entry.id ? (
                    <>
                      <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(entry.id); if (e.key === 'Escape') setEditingId(null) }}
                          autoFocus
                          className="w-full rounded-lg bg-white px-2 py-1.5 text-sm text-zinc-900 ring-2 ring-pp-primary focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min={1} value={editScore}
                            onChange={(e) => setEditScore(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(entry.id); if (e.key === 'Escape') setEditingId(null) }}
                            className="w-12 rounded-lg bg-white px-1 py-1.5 text-center text-sm text-zinc-900 ring-2 ring-pp-primary focus:outline-none"
                          />
                          <button onClick={(e) => { e.stopPropagation(); handleSave(entry.id) }} disabled={saving}
                            className="rounded-md bg-pp-primary px-2 py-1 text-xs font-bold text-white hover:bg-[#0F3630] disabled:opacity-40">✓</button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingId(null) }}
                            className="rounded-md bg-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-300">✕</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 font-medium text-pp-text">{entry.player_name}</td>
                      <td className={`px-3 py-2.5 text-center font-display text-lg ${i === 0 ? 'text-pp-accent' : 'text-pp-text'}`}>
                        {entry.total_score}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

// ── Feedback Section ───────────────────────────────────────────────────────────

interface FeedbackRow {
  id: string
  created_at: string
  rating: number
  comment: string | null
  email: string | null
  admin_comment: string | null
  status: 'open' | 'closed'
}

const RATING_LABELS: Record<number, { emoji: string; label: string; color: string }> = {
  4: { emoji: '😄', label: 'Excellent', color: 'text-emerald-600 bg-emerald-50' },
  3: { emoji: '😊', label: 'Good',      color: 'text-pp-primary bg-pp-bg' },
  2: { emoji: '😐', label: 'Okay',      color: 'text-amber-600 bg-amber-50' },
  1: { emoji: '😞', label: 'Poor',      color: 'text-red-600 bg-red-50' },
}

function FeedbackSection() {
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null)

  useEffect(() => {
    adminSelect<FeedbackRow[]>('feedback', { order: { col: 'created_at', ascending: false }, limit: 500 })
      .then(({ data, error }) => {
        if (error) { setFetchError(error.message); console.error('Feedback fetch error:', error) }
        if (data) setRows(data as FeedbackRow[])
        setLoading(false)
      })
  }, [])

  async function saveAdminComment(id: string, value: string) {
    setSavingId(id)
    await adminUpdate('feedback', { admin_comment: value || null }, [{ col: 'id', op: 'eq', val: id }])
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, admin_comment: value || null } : r))
    setSavingId(null)
  }

  async function saveStatus(id: string, newStatus: 'open' | 'closed') {
    setSavingStatusId(id)
    await adminUpdate('feedback', { status: newStatus }, [{ col: 'id', op: 'eq', val: id }])
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r))
    setSavingStatusId(null)
  }

  const counts = [4, 3, 2, 1].map((r) => ({ rating: r, count: rows.filter((f) => f.rating === r).length }))
  const avg = rows.length ? (rows.reduce((s, f) => s + f.rating, 0) / rows.length).toFixed(1) : null

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-pp-text">Feedback</h1>
        <p className="text-sm text-pp-text-light">{rows.length} response{rows.length !== 1 ? 's' : ''} total</p>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="mb-6 grid grid-cols-6 gap-3">
          <div className="col-span-1 flex flex-col items-center justify-center rounded-xl bg-pp-primary px-4 py-4 text-center text-white">
            <p className="font-display text-4xl">{avg}</p>
            <p className="mt-1 text-xs text-white/70">Avg Rating</p>
          </div>
          {counts.map(({ rating, count }) => {
            const r = RATING_LABELS[rating]
            return (
              <div key={rating} className="flex flex-col items-center justify-center rounded-xl bg-white px-3 py-4 text-center ring-1 ring-admin-border">
                <span className="text-2xl">{r.emoji}</span>
                <p className="mt-1 font-display text-xl text-pp-text">{count}</p>
                <p className="text-xs font-semibold text-pp-text-light">{r.label} {count === 1 ? 'Review' : 'Reviews'}</p>
              </div>
            )
          })}
          <div className="flex flex-col items-center justify-center rounded-xl bg-white px-3 py-4 text-center ring-1 ring-admin-border">
            <span className="text-2xl">📋</span>
            <p className="mt-1 font-display text-xl text-pp-text">{rows.length}</p>
            <p className="text-xs font-semibold text-pp-text-light">Total {rows.length === 1 ? 'Review' : 'Reviews'}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-16 text-center text-pp-text-light">Loading…</p>
      ) : fetchError ? (
        <p className="py-16 text-center text-red-500">Error loading feedback: {fetchError}</p>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-pp-text-light">No feedback submitted yet.</p>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto rounded-xl ring-1 ring-admin-border">
            <table className="min-w-full text-sm">
              <thead className="bg-pp-primary">
                <tr className="text-left text-xs text-white">
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Time</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Rating</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Comment</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Admin Comment</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-admin-border">
                {rows.map((row, idx) => {
                  const r = RATING_LABELS[row.rating]
                  return (
                    <tr key={row.id} className={`transition-colors hover:bg-[#EDF5ED] ${idx % 2 === 1 ? 'bg-admin-table-stripe' : 'bg-white'}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{fmtDate(row.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{fmtTime(row.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${r.color}`}>
                          {r.emoji} {r.label}
                        </span>
                      </td>
                      <td className="px-4 py-3"><div className="max-w-[160px] truncate text-zinc-500">{row.email ?? '—'}</div></td>
                      <td className="px-4 py-3 text-zinc-600"><div className="max-w-[220px] truncate" title={row.comment ?? ''}>{row.comment ?? <span className="text-zinc-300 italic">no comment</span>}</div></td>
                      <td className="px-4 py-3 min-w-[320px]">
                        <textarea
                          defaultValue={row.admin_comment ?? ''}
                          onBlur={(e) => {
                            const val = e.target.value.trim()
                            if (val !== (row.admin_comment ?? '')) saveAdminComment(row.id, val)
                          }}
                          rows={2}
                          placeholder="Add note…"
                          className="w-full resize-none rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs text-zinc-600 placeholder-zinc-300 hover:border-pp-border focus:border-pp-secondary focus:outline-none focus:bg-white transition-all"
                        />
                        {savingId === row.id && <span className="text-xs text-pp-text-light">Saving…</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={row.status ?? 'open'}
                          disabled={savingStatusId === row.id}
                          onChange={(e) => saveStatus(row.id, e.target.value as 'open' | 'closed')}
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pp-primary disabled:opacity-50 ${
                            row.status === 'closed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-red-200 bg-red-50 text-red-600'
                          }`}
                        >
                          <option value="open">Open</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
        </div>
      )}
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function Dashboard() {
  const [section, setSection] = useState<Section>('rounds')
  const [rounds, setRounds] = useState<Round[]>([])
  const [adverts, setAdverts] = useState<Advert[]>([])
  const [loading, setLoading] = useState(true)
  const [openFeedbackCount, setOpenFeedbackCount] = useState(0)
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [editEmailValue, setEditEmailValue] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: roundsRaw } = await supabase
      .from('rounds').select('id, email, created_at, started_at')
      .order('created_at', { ascending: false }).limit(500)

    if (!roundsRaw) { setLoading(false); return }

    const roundIds = roundsRaw.map((r) => r.id)
    const { data: playersRaw } = await supabase.from('players').select('id, round_id, player_name, total_score').in('round_id', roundIds)

    const playersByRound: Record<string, PlayerRow[]> = {}
    for (const p of playersRaw ?? []) {
      if (!playersByRound[p.round_id]) playersByRound[p.round_id] = []
      playersByRound[p.round_id].push({ id: p.id, player_name: p.player_name, total_score: p.total_score })
    }

    setRounds(
      roundsRaw.map((r) => ({
        id: r.id, email: r.email, created_at: r.created_at,
        started_at: (r as Record<string, unknown>).started_at as string | null ?? null,
        players: (playersByRound[r.id] ?? []).sort((a, b) => a.total_score - b.total_score),
      }))
    )
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    adminSelect<Advert[]>('adverts', { order: { col: 'created_at', ascending: false } })
      .then(({ data }) => { if (data) setAdverts(data as Advert[]) })
  }, [])

  useEffect(() => {
    supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'open')
      .then(({ count }) => setOpenFeedbackCount(count ?? 0))
  }, [])

  const emailStats: EmailStat[] = useMemo(() => {
    const map: Record<string, EmailStat> = {}
    for (const r of rounds) {
      if (!r.email) continue
      if (!map[r.email]) {
        map[r.email] = { email: r.email, firstSeen: r.created_at, roundCount: 0 }
      } else if (r.created_at < map[r.email].firstSeen) {
        map[r.email].firstSeen = r.created_at
      }
      map[r.email].roundCount++
    }
    return Object.values(map).sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
  }, [rounds])

  async function deleteRound(id: string) {
    if (!confirm('Delete this round? This cannot be undone.')) return
    await adminDelete('scores', [{ col: 'round_id', op: 'eq', val: id }])
    await adminDelete('players', [{ col: 'round_id', op: 'eq', val: id }])
    await adminDelete('rounds', [{ col: 'id', op: 'eq', val: id }])
    setRounds((prev) => prev.filter((r) => r.id !== id))
  }

  function handleSaved(updated: Round) {
    setRounds((prev) => prev.map((r) => r.id === updated.id ? updated : r))
    setEditingRound(null)
  }

  async function handleEmailSave(oldEmail: string) {
    const newEmail = editEmailValue.trim()
    if (!newEmail || newEmail === oldEmail) { setEditingEmail(null); return }
    setSavingEmail(true)
    await adminUpdate('rounds', { email: newEmail }, [{ col: 'email', op: 'eq', val: oldEmail }])
    setRounds((prev) => prev.map((r) => r.email === oldEmail ? { ...r, email: newEmail } : r))
    setSavingEmail(false)
    setEditingEmail(null)
  }

  function exportEmails() {
    const rows = emailStats.map((e) => `${e.email},${new Date(e.firstSeen).toLocaleDateString('en-AU')},${e.roundCount}`)
    const csv = ['Email,Date Entered,Rounds Played', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'putt-putt-emails.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })

  function navBadge(id: Section) {
    if (id === 'rounds') return rounds.length
    if (id === 'emails') return emailStats.length
    if (id === 'adverts') return adverts.length
    if (id === 'feedback') return openFeedbackCount
    return null
  }

  if (section === 'feedback') {
    return (
      <div className="flex h-screen overflow-hidden bg-admin-bg text-pp-text">
        <aside className="flex w-56 shrink-0 flex-col bg-pp-primary">
          <div className="flex flex-col items-center border-b border-white/20 px-4 py-5">
            <Image src="/images/NMG-Logo.webp" alt="Noosa Mini Golf" width={150} height={90} className="object-contain" />
            <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-white/60">Admin Portal</p>
          </div>
          <nav className="flex-1 px-2 py-4">
            {NAV.map((item) => {
              const badge = navBadge(item.id)
              const active = section === item.id
              return (
                <button key={item.id} onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors mb-1 ${active ? 'bg-white/20 text-white border-l-[3px] border-white pl-[9px]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
                  <item.Icon size={16} className={active ? 'text-white' : 'text-white/70'} />
                  <span>{item.label}</span>
                  {badge !== null && (
                    item.id === 'feedback'
                      ? <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${badge > 0 ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>{badge > 0 ? `${badge}!` : '✓'}</span>
                      : <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}>{badge}</span>
                  )}
                </button>
              )
            })}
          </nav>
          <div className="border-t border-white/20 px-2 py-4">
            <button onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload() }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span>Log Out</span>
            </button>
          </div>
        </aside>
        <main className="flex flex-1 flex-col overflow-hidden px-8 py-8">
          <FeedbackSection />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-admin-bg text-pp-text">

      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-pp-primary">
        <div className="flex flex-col items-center border-b border-white/20 px-4 py-5">
          <Image src="/images/NMG-Logo.webp" alt="Noosa Mini Golf" width={150} height={90} className="object-contain" />
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-white/60">Admin Portal</p>
        </div>

        <nav className="flex-1 px-2 py-4">
          {NAV.map((item) => {
            const badge = navBadge(item.id)
            const active = section === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors mb-1 ${
                  active
                    ? 'bg-white/20 text-white border-l-[3px] border-white pl-[9px]'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.Icon size={16} className={active ? 'text-white' : 'text-white/70'} />
                <span>{item.label}</span>
                {badge !== null && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/70'}`}>
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/20 px-2 py-4">
          <button
            onClick={() => { sessionStorage.removeItem('admin_auth'); window.location.reload() }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto px-8 py-8">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-pp-text-light">Loading…</p>
          </div>
        ) : section === 'rewards' ? (
          <RewardsSection />
        ) : section === 'leaderboard' ? (
          <LeaderboardSection />
        ) : section === 'analytics' ? (
          <AnalyticsSection />
        ) : section === 'adverts' ? (
          <AdvertsSection adverts={adverts} setAdverts={setAdverts} />
        ) : section === 'rounds' ? (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl text-pp-text">Rounds</h1>
            </div>

            {rounds.length === 0 ? (
              <p className="py-16 text-center text-pp-text-light">No rounds yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl ring-1 ring-admin-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-pp-primary">
                      <tr className="text-left text-xs text-white">
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Date</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Time</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap text-center">Duration</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap text-center">Players</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Email</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Player Names</th>
                        <th className="px-4 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Scores</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-border">
                      {rounds.map((round, idx) => (
                        <tr key={round.id} className={`transition-colors hover:bg-[#EDF5ED] ${idx % 2 === 1 ? 'bg-admin-table-stripe' : 'bg-white'}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-500">{fmtDate(round.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400">{fmtTime(round.created_at)}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center text-zinc-500">
                            {round.started_at
                              ? `${Math.round((new Date(round.created_at).getTime() - new Date(round.started_at).getTime()) / 60000)} min`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center font-semibold text-pp-text">{round.players.length}</td>
                          <td className="px-4 py-3"><div className="max-w-[180px] truncate text-zinc-500">{round.email || '—'}</div></td>
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-600">{round.players.map((p) => p.player_name).join(', ') || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-semibold text-zinc-600">{round.players.map((p) => p.total_score).join(', ') || '—'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <button onClick={() => setEditingRound(round)} title="Edit"
                                className="rounded-lg p-1.5 text-pp-primary hover:bg-[#EDF5ED] transition-colors">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => deleteRound(round.id)} title="Delete"
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h1 className="font-display text-2xl text-pp-text">Emails</h1>
              <button
                onClick={exportEmails}
                disabled={emailStats.length === 0}
                className="rounded-full bg-pp-primary px-5 py-2 text-sm font-semibold text-white hover:bg-[#0F3630] disabled:opacity-40"
              >
                Export CSV
              </button>
            </div>

            {emailStats.length === 0 ? (
              <p className="py-16 text-center text-pp-text-light">No emails collected yet.</p>
            ) : (
              <div className="overflow-hidden rounded-xl ring-1 ring-admin-border">
                <table className="w-full text-sm">
                  <thead className="bg-pp-primary">
                    <tr className="text-left text-xs text-white">
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider">Email</th>
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider whitespace-nowrap">Date Entered</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider">Rounds</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {emailStats.map((stat, idx) => (
                      <tr key={stat.email} className={`transition-colors hover:bg-[#EDF5ED] ${idx % 2 === 1 ? 'bg-admin-table-stripe' : 'bg-white'}`}>
                        {editingEmail === stat.email ? (
                          <>
                            <td className="px-3 py-2">
                              <input
                                type="email" value={editEmailValue}
                                onChange={(e) => setEditEmailValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleEmailSave(stat.email); if (e.key === 'Escape') setEditingEmail(null) }}
                                autoFocus
                                className="w-full rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-900 ring-2 ring-pp-primary focus:outline-none"
                              />
                            </td>
                            <td className="px-5 py-2 text-zinc-500 whitespace-nowrap">{fmtDate(stat.firstSeen)}</td>
                            <td className="px-5 py-2 text-right font-semibold text-pp-text">{stat.roundCount}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEmailSave(stat.email)} disabled={savingEmail}
                                  className="rounded-md bg-pp-primary px-2.5 py-1 text-xs font-bold text-white hover:bg-[#0F3630] disabled:opacity-40">✓</button>
                                <button onClick={() => setEditingEmail(null)}
                                  className="rounded-md bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-300">✕</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-5 py-3 text-pp-text">{stat.email}</td>
                            <td className="px-5 py-3 text-zinc-500 whitespace-nowrap">{fmtDate(stat.firstSeen)}</td>
                            <td className="px-5 py-3 text-right font-semibold text-pp-text">{stat.roundCount}</td>
                            <td className="px-5 py-3 whitespace-nowrap">
                              <button
                                onClick={() => { setEditingEmail(stat.email); setEditEmailValue(stat.email) }}
                                title="Edit"
                                className="rounded-lg p-1.5 text-pp-primary hover:bg-[#EDF5ED] transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {editingRound && (
        <EditModal round={editingRound} onClose={() => setEditingRound(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === '1') setAuthed(true)
    setChecked(true)
  }, [])

  if (!checked) return <div className="min-h-screen bg-zinc-950" />
  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />
  return <Dashboard />
}
