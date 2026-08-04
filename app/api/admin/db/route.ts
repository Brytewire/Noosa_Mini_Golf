import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Tables the admin is allowed to query via this proxy
const ALLOWED_TABLES = new Set([
  'rounds',
  'players',
  'scores',
  'adverts',
  'rewards',
  'completion_rewards',
  'feedback',
  'advert_events',
  'reward_claims',
])

type Filter = {
  col: string
  op: 'eq' | 'in' | 'gte' | 'lt' | 'is'
  val: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(q: any, filters: Filter[] = []): any {
  for (const f of filters) {
    switch (f.op) {
      case 'eq':  q = q.eq(f.col, f.val);                      break
      case 'in':  q = q.in(f.col, f.val as unknown[]);          break
      case 'gte': q = q.gte(f.col, f.val);                     break
      case 'lt':  q = q.lt(f.col, f.val);                      break
      case 'is':  q = q.is(f.col, f.val);                      break
    }
  }
  return q
}

export async function POST(request: Request) {
  console.log('[admin/db] SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  console.log('[admin/db] SERVICE_ROLE_KEY prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 15))

  // ── Auth ─────────────────────────────────────────────────────
  const adminPassword = request.headers.get('x-admin-password')
  if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { data: null, error: { message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { operation, table } = body as { operation: string; table: string }

  // ── Table allowlist ───────────────────────────────────────────
  if (!ALLOWED_TABLES.has(table)) {
    return NextResponse.json(
      { data: null, error: { message: `Table '${table}' not allowed` } },
      { status: 400 }
    )
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any = { data: null, error: null }

    // ── SELECT ────────────────────────────────────────────────────
    if (operation === 'select') {
      const { columns = '*', filters, order, limit, single, maybeSingle } = body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabaseAdmin.from(table).select(columns)
      q = applyFilters(q, filters)
      if (order) q = q.order(order.col, { ascending: order.ascending ?? false })
      if (limit)  q = q.limit(limit)
      if (single)      result = await q.single()
      else if (maybeSingle) result = await q.maybeSingle()
      else             result = await q

    // ── INSERT ────────────────────────────────────────────────────
    } else if (operation === 'insert') {
      const { data: insertData, returning, single } = body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabaseAdmin.from(table).insert(insertData)
      if (returning) q = q.select()
      if (single) result = await q.single()
      else        result = await q

    // ── UPDATE ────────────────────────────────────────────────────
    } else if (operation === 'update') {
      const { data: updateData, filters, returning, single } = body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabaseAdmin.from(table).update(updateData)
      q = applyFilters(q, filters)
      if (returning) q = q.select()
      if (single) result = await q.single()
      else        result = await q

    // ── DELETE ────────────────────────────────────────────────────
    } else if (operation === 'delete') {
      const { filters } = body
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = supabaseAdmin.from(table).delete()
      q = applyFilters(q, filters)
      result = await q

    } else {
      return NextResponse.json(
        { data: null, error: { message: `Unknown operation: ${operation}` } },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { data: null, error: { message: String(e) } },
      { status: 500 }
    )
  }
}
