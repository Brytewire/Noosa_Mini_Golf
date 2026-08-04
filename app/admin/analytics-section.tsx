'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { adminSelect, type AdminFilter } from '@/lib/admin-db'

// ── Types ──────────────────────────────────────────────────────────────────────

interface RoundRow {
  id: string
  email: string
  created_at: string
  started_at: string | null
}

interface PlayerRow {
  total_score: number
  round_id: string
}

interface AdvertEvent {
  advert_id: string
  event_type: string
}

interface FeedbackRow {
  rating: number
  status: string
  created_at: string
}

type FilterPeriod = 'all' | 'year' | 'month' | 'custom'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent = 'green' }: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'blue'
}) {
  const borderColor = accent === 'green' ? 'border-l-pp-primary' : 'border-l-[#8FBBAE]'
  const valueColor = accent === 'green' ? 'text-pp-primary' : 'text-[#8FBBAE]'
  const labelColor = accent === 'green' ? 'text-pp-text-light' : 'text-[#5A7A73]'
  return (
    <div className={`rounded-xl bg-white p-4 ring-1 ring-admin-border border-l-4 ${borderColor}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-pp-text-light">{sub}</p>}
    </div>
  )
}

function BarChart({ data, skipLabel = 1, colorClass = 'bg-admin-primary', barAreaClass = 'h-36', fillHeight = false }: {
  data: { label: string; value: number }[]
  skipLabel?: number
  colorClass?: string
  barAreaClass?: string
  fillHeight?: boolean
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className={fillHeight ? 'flex flex-col flex-1 min-h-0' : ''}>
      {/* Bar area */}
      <div className={`flex ${fillHeight ? 'flex-1 min-h-0' : barAreaClass} items-stretch gap-px`}>
        {data.map((d, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col justify-end items-center">
            <div
              className={`w-full rounded-t-sm ${colorClass} transition-all duration-300`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 1 : 0)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      {/* Count labels row — consistent position just above x-axis */}
      <div className="flex gap-px mt-0.5">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 text-center">
            <span className="text-[9px] font-semibold text-zinc-500">{d.value > 0 ? d.value : ''}</span>
          </div>
        ))}
      </div>
      {/* X-axis line */}
      <div className="border-t border-zinc-200 mt-0.5" />
      {/* X-axis labels in a dedicated row below the bars */}
      <div className="flex gap-px mt-1">
        {data.map((d, i) => (
          <div key={i} className="min-w-0 flex-1 text-center">
            {i % skipLabel === 0 && (
              <span className="text-[9px] leading-tight text-zinc-600">{d.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AnalyticsSection() {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const [period, setPeriod] = useState<FilterPeriod>('year')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [customFrom, setCustomFrom] = useState(todayStr)
  const [customTo, setCustomTo] = useState(todayStr)

  const [rounds, setRounds] = useState<RoundRow[]>([])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [events, setEvents] = useState<AdvertEvent[]>([])
  const [advertNames, setAdvertNames] = useState<Record<string, string>>({})
  const [eventsAvailable, setEventsAvailable] = useState(true)
  const [feedback, setFeedback] = useState<FeedbackRow[]>([])
  const [totalOpenFeedback, setTotalOpenFeedback] = useState(0)
  const [loading, setLoading] = useState(true)

  const { startDate, endDate } = useMemo(() => {
    if (period === 'year') {
      return { startDate: `${year}-01-01`, endDate: `${year + 1}-01-01` }
    }
    if (period === 'month') {
      const m = month + 1
      const nm = m === 12 ? 1 : m + 1
      const ny = m === 12 ? year + 1 : year
      return {
        startDate: `${year}-${String(m).padStart(2, '0')}-01`,
        endDate: `${ny}-${String(nm).padStart(2, '0')}-01`,
      }
    }
    if (period === 'custom' && customFrom && customTo) {
      const to = new Date(customTo)
      to.setDate(to.getDate() + 1)
      return { startDate: customFrom, endDate: to.toISOString().slice(0, 10) }
    }
    return { startDate: null, endDate: null }
  }, [period, year, month, customFrom, customTo])

  useEffect(() => {
    async function load() {
      setLoading(true)

      let q = supabase.from('rounds').select('id, email, created_at, started_at')
      if (startDate) q = q.gte('created_at', startDate)
      if (endDate) q = q.lt('created_at', endDate)
      const { data: roundsData } = await q.order('created_at', { ascending: true })
      const r = roundsData ?? []
      setRounds(r)

      if (r.length > 0) {
        const { data: pd } = await supabase.from('players').select('total_score, round_id').in('round_id', r.map(x => x.id))
        setPlayers(pd ?? [])
      } else {
        setPlayers([])
      }

      const eventFilters: AdminFilter[] = []
      if (startDate) eventFilters.push({ col: 'created_at', op: 'gte', val: startDate })
      if (endDate)   eventFilters.push({ col: 'created_at', op: 'lt',  val: endDate })
      const { data: ed, error: evErr } = await adminSelect<AdvertEvent[]>('advert_events', {
        columns: 'advert_id, event_type',
        filters: eventFilters,
      })
      if (evErr) {
        setEventsAvailable(false)
        setEvents([])
      } else {
        setEventsAvailable(true)
        setEvents(ed ?? [])
      }

      const { data: ad } = await adminSelect<{ id: string; name: string }[]>('adverts', { columns: 'id, name' })
      const names: Record<string, string> = {}
      for (const a of ad ?? []) names[a.id] = a.name
      setAdvertNames(names)

      let fq = supabase.from('feedback').select('rating, status, created_at')
      if (startDate) fq = fq.gte('created_at', startDate)
      if (endDate) fq = fq.lt('created_at', endDate)
      const { data: fd } = await fq
      setFeedback(fd ?? [])

      const { count: openCount } = await supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'open')
      setTotalOpenFeedback(openCount ?? 0)

      setLoading(false)
    }
    load()
  }, [startDate, endDate])

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const totalRounds = rounds.length
  const totalPlayers = players.length
  const avgPlayersPerRound = totalRounds > 0 ? (totalPlayers / totalRounds).toFixed(1) : '—'
  const uniqueEmails = new Set(rounds.filter(r => r.email).map(r => r.email)).size

  const durations = rounds
    .filter(r => r.started_at)
    .map(r => (new Date(r.created_at).getTime() - new Date(r.started_at!).getTime()) / 60000)
    .filter(d => d > 0 && d < 300)
  const avgDuration = durations.length > 0
    ? `${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)} min` : '—'

  const validScores = players.map(p => p.total_score).filter(s => s > 0)
  const avgScore = validScores.length > 0
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : '—'
  const bestScore = validScores.length > 0 ? Math.min(...validScores) : '—'

  const { gamesOverTime, skipLabel } = useMemo(() => {
    if (period === 'month') {
      const days = new Date(year, month + 1, 0).getDate()
      const counts = new Array(days).fill(0)
      for (const r of rounds) counts[new Date(r.created_at).getUTCDate() - 1]++
      return { gamesOverTime: counts.map((v, i) => ({ label: String(i + 1), value: v })), skipLabel: 5 }
    }
    if (period === 'year') {
      const counts = new Array(12).fill(0)
      for (const r of rounds) counts[new Date(r.created_at).getUTCMonth()]++
      return { gamesOverTime: counts.map((v, i) => ({ label: MONTHS_SHORT[i], value: v })), skipLabel: 1 }
    }
    if (period === 'custom' && customFrom && customTo) {
      const from = new Date(customFrom)
      const to = new Date(customTo)
      const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1
      if (diffDays <= 90) {
        const map: Record<string, number> = {}
        for (let i = 0; i < diffDays; i++) {
          const d = new Date(from)
          d.setDate(d.getDate() + i)
          map[d.toISOString().slice(0, 10)] = 0
        }
        for (const r of rounds) {
          const k = r.created_at.slice(0, 10)
          if (k in map) map[k]++
        }
        const entries = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
        return { gamesOverTime: entries.map(([k, v]) => ({ label: k.slice(5), value: v })), skipLabel: Math.ceil(diffDays / 15) }
      }
      const map: Record<string, number> = {}
      for (const r of rounds) {
        const d = new Date(r.created_at)
        const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
        map[k] = (map[k] ?? 0) + 1
      }
      const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
      return { gamesOverTime: sorted.map(([k, v]) => ({ label: `${MONTHS_SHORT[Number(k.slice(5)) - 1]} '${k.slice(2, 4)}`, value: v })), skipLabel: 1 }
    }
    const map: Record<string, number> = {}
    for (const r of rounds) {
      const d = new Date(r.created_at)
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      map[k] = (map[k] ?? 0) + 1
    }
    const sorted = Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
    return { gamesOverTime: sorted.map(([k, v]) => ({ label: `${MONTHS_SHORT[Number(k.slice(5)) - 1]} '${k.slice(2, 4)}`, value: v })), skipLabel: 1 }
  }, [rounds, period, year, month, customFrom, customTo])

  const timeDistribution = useMemo(() => {
    const counts = new Array(15).fill(0) // slots 9am–11pm
    for (const r of rounds) {
      const h = new Date(r.created_at).getHours()
      if (h >= 9 && h <= 23) counts[h - 9]++
    }
    return Array.from({ length: 15 }, (_, i) => {
      const h = i + 9
      const label = h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`
      return { label, value: counts[i] }
    })
  }, [rounds])

  const gamesPerDayOfWeek = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const counts = new Array(7).fill(0)
    for (const r of rounds) {
      const dayIndex = (new Date(r.created_at).getDay() + 6) % 7 // Mon=0 … Sun=6
      counts[dayIndex]++
    }
    return days.map((label, i) => ({ label, value: counts[i] }))
  }, [rounds])

  const avgFeedbackRating = feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1) : '—'

  const impressions = events.filter(e => e.event_type === 'impression').length
  const bookClicks = events.filter(e => e.event_type === 'book').length
  const skipClicks = events.filter(e => e.event_type === 'skip').length
  const ctr = impressions > 0 ? `${((bookClicks / impressions) * 100).toFixed(1)}%` : '—'

  const advertBreakdown = useMemo(() => {
    const map: Record<string, { imp: number; book: number; skip: number }> = {}
    for (const e of events) {
      if (!map[e.advert_id]) map[e.advert_id] = { imp: 0, book: 0, skip: 0 }
      if (e.event_type === 'impression') map[e.advert_id].imp++
      if (e.event_type === 'book') map[e.advert_id].book++
      if (e.event_type === 'skip') map[e.advert_id].skip++
    }
    return Object.entries(map)
      .map(([id, s]) => ({
        id, name: advertNames[id] ?? 'Unknown Advert',
        impressions: s.imp, bookClicks: s.book, skipClicks: s.skip,
        ctrNum: s.imp > 0 ? (s.book / s.imp) * 100 : 0,
        ctr: s.imp > 0 ? `${((s.book / s.imp) * 100).toFixed(1)}%` : '—',
      }))
      .sort((a, b) => b.impressions - a.impressions)
  }, [events, advertNames])

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header + filters */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-2xl text-pp-text">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented period control */}
          <div className="flex rounded-lg bg-zinc-100 p-0.5">
            {(['all', 'year', 'month', 'custom'] as FilterPeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                  period === p ? 'bg-admin-primary text-white shadow-sm' : 'text-pp-text-light hover:text-pp-text'
                }`}
              >
                {p === 'all' ? 'All Time' : p === 'year' ? 'Year' : p === 'month' ? 'Month' : 'Date Range'}
              </button>
            ))}
          </div>
          {(period === 'year' || period === 'month') && (
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-pp-text"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {period === 'month' && (
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-pp-text"
            >
              {MONTHS_LONG.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          )}
          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} max={customTo} onChange={e => setCustomFrom(e.target.value)}
                className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-pp-text" />
              <span className="text-sm text-pp-text-light">to</span>
              <input type="date" value={customTo} min={customFrom} max={todayStr} onChange={e => setCustomTo(e.target.value)}
                className="rounded-lg border border-admin-border bg-white px-3 py-1.5 text-sm text-pp-text" />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-pp-text-light">Loading analytics…</p>
      ) : (
        <div className="flex flex-col gap-8">

          {/* ── Game stats ── */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-pp-text-light">Game Stats <span className="normal-case font-normal">(selected period)</span></p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
              <StatCard label="Total Rounds" value={totalRounds} />
              <StatCard label="Total Players" value={totalPlayers} />
              <StatCard label="Avg Players / Round" value={avgPlayersPerRound} />
              <StatCard label="Emails Captured" value={uniqueEmails} />
              <StatCard label="Avg Round Duration" value={avgDuration} sub="start to finish" />
              <StatCard label="Avg Score" value={avgScore} sub="per player" />
              <StatCard label="Best Score" value={bestScore} sub="lowest wins" />
            </div>
          </section>

          {/* ── Advert Performance + Feedback side by side ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-pp-text-light">Advert Performance</p>
              {eventsAvailable ? (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="ADVERT IMPRESSIONS" value={impressions} sub="times shown" accent="blue" />
                  <StatCard label={`"BOOK NOW" BUTTON CLICKS`} value={bookClicks} sub="tapped Book Now" accent="blue" />
                  <StatCard label={`"SKIP" BUTTON CLICKS`} value={skipClicks} sub="tapped Skip" accent="blue" />
                  <StatCard label="Advert Click-Through Rate" value={ctr} sub="Book ÷ Impressions" accent="blue" />
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                  Advert tracking is not set up yet. Run the SQL to create the <code className="font-mono">advert_events</code> table.
                </div>
              )}
              <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wider text-pp-text-light">Feedback</p>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Average Feedback Rating" value={avgFeedbackRating} sub="out of 4 (period)" />
                <StatCard label="Feedback Items Unresolved" value={totalOpenFeedback} sub="status: open (all time)" />
              </div>
            </section>

            <section className="flex flex-col">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-pp-text-light">Games per Day of Week</p>
              <div className="flex flex-col flex-1 rounded-xl bg-white p-4 ring-1 ring-admin-border">
                {totalRounds === 0 ? (
                  <p className="py-4 text-center text-xs text-pp-text-light">No games in this period</p>
                ) : (
                  <BarChart data={gamesPerDayOfWeek} skipLabel={1} colorClass="bg-admin-primary" fillHeight />
                )}
              </div>
            </section>
          </div>

          {/* ── Row 1: Games Over Time + Time Played Distribution ── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-5 ring-1 ring-admin-border">
              <p className="mb-1 text-sm font-semibold text-pp-text">
                {period === 'month' ? `Daily Games — ${MONTHS_LONG[month]} ${year}` : period === 'year' ? `Monthly Games — ${year}` : 'Games Over Time'}
              </p>
              <p className="mb-4 text-xs text-pp-text-light">{totalRounds} round{totalRounds !== 1 ? 's' : ''} in this period</p>
              {gamesOverTime.every(d => d.value === 0) ? (
                <p className="py-10 text-center text-sm text-pp-text-light">No games in this period</p>
              ) : (
                <BarChart data={gamesOverTime} skipLabel={skipLabel} />
              )}
            </div>

            <div className="rounded-xl bg-white p-5 ring-1 ring-admin-border">
              <p className="mb-1 text-sm font-semibold text-pp-text">Time of Games Played</p>
              <p className="mb-4 text-xs text-pp-text-light">Number of rounds completed each hour (9am – 11pm)</p>
              {totalRounds === 0 ? (
                <p className="py-10 text-center text-sm text-pp-text-light">No games in this period</p>
              ) : (
                <BarChart data={timeDistribution} skipLabel={1} colorClass="bg-[#8FBBAE]" />
              )}
            </div>
          </div>

          {/* ── CTR by Advert ── */}
          {eventsAvailable && advertBreakdown.length > 0 ? (
            <div className="rounded-xl bg-white p-5 ring-1 ring-admin-border">
              <p className="mb-1 text-sm font-semibold text-pp-text">Click-Through Rate by Advert</p>
              <p className="mb-5 text-xs text-pp-text-light">% of impressions that resulted in a Book Now tap</p>
              <div className="flex flex-col gap-3">
                {[...advertBreakdown]
                  .sort((a, b) => b.ctrNum - a.ctrNum)
                  .map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="w-56 shrink-0 truncate text-sm text-pp-text" title={a.name}>{a.name}</span>
                      <div className="flex-1 overflow-hidden rounded-full bg-zinc-100" style={{ height: 22 }}>
                        <div
                          className="flex h-full items-center justify-end rounded-full pr-2 bg-admin-primary transition-all duration-500"
                          style={{ width: `${Math.max(a.ctrNum, a.impressions > 0 ? 2 : 0)}%` }}
                        >
                          {a.ctrNum >= 8 && <span className="text-[10px] font-bold text-white">{a.ctr}</span>}
                        </div>
                      </div>
                      <span className="w-12 shrink-0 text-right text-sm font-bold text-zinc-600">{a.ctr}</span>
                      <span className="w-16 shrink-0 text-right text-xs text-pp-text-light">{a.impressions} shown</span>
                    </div>
                  ))}
              </div>
              {advertBreakdown.every(a => a.impressions === 0) && (
                <p className="py-6 text-center text-sm text-pp-text-light">No impressions recorded yet</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-5 ring-1 ring-admin-border flex items-center justify-center">
              <p className="text-sm text-pp-text-light">No advert data for this period</p>
            </div>
          )}

          {/* ── Per-advert table ── */}
          {eventsAvailable && advertBreakdown.length > 0 && (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-pp-text-light">Per-Advert Breakdown</p>
              <div className="overflow-hidden rounded-xl ring-1 ring-admin-border">
                <table className="w-full text-sm">
                  <thead className="bg-admin-primary">
                    <tr className="text-left text-xs text-white">
                      <th className="px-5 py-3 font-semibold uppercase tracking-wider">Advert</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider">Shown</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider">Book</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider">Skip</th>
                      <th className="px-5 py-3 text-right font-semibold uppercase tracking-wider">CTR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {advertBreakdown.map((a, idx) => (
                      <tr key={a.id} className={`transition-colors hover:bg-[#EDF5ED] ${idx % 2 === 1 ? 'bg-admin-table-stripe' : 'bg-white'}`}>
                        <td className="px-5 py-3 font-medium text-pp-text">{a.name}</td>
                        <td className="px-5 py-3 text-right text-zinc-500">{a.impressions}</td>
                        <td className="px-5 py-3 text-right font-semibold text-green-600">{a.bookClicks}</td>
                        <td className="px-5 py-3 text-right text-zinc-400">{a.skipClicks}</td>
                        <td className="px-5 py-3 text-right font-bold text-pp-primary">{a.ctr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {eventsAvailable && advertBreakdown.length === 0 && (
            <div className="rounded-xl border border-admin-border bg-white px-5 py-8 text-center">
              <p className="text-sm text-pp-text-light">No advert events recorded yet in this period.</p>
              <p className="mt-1 text-xs text-zinc-300">Data appears here once players start seeing adverts.</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
