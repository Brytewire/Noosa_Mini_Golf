/**
 * Client-side helpers for admin database operations.
 *
 * All calls are routed through /api/admin/db, which uses the Supabase
 * service role key (bypassing RLS) and verifies the admin password.
 *
 * The admin password is read from sessionStorage ('admin_pw'), set at login.
 */

export type AdminFilter = {
  col: string
  op: 'eq' | 'in' | 'gte' | 'lt' | 'is'
  val: unknown
}

export type AdminOrder = { col: string; ascending?: boolean }

type AdminResult<T> = { data: T | null; error: { message: string } | null }

async function adminFetch<T>(body: object): Promise<AdminResult<T>> {
  const password =
    typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('admin_pw') ?? '')
      : ''

  const res = await fetch('/api/admin/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password,
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  return json as AdminResult<T>
}

// ── SELECT ────────────────────────────────────────────────────────────────────

export async function adminSelect<T = unknown>(
  table: string,
  options: {
    columns?: string
    filters?: AdminFilter[]
    order?: AdminOrder
    limit?: number
    single?: boolean
    maybeSingle?: boolean
  } = {}
): Promise<AdminResult<T>> {
  return adminFetch<T>({ operation: 'select', table, ...options })
}

// ── INSERT ────────────────────────────────────────────────────────────────────

export async function adminInsert<T = unknown>(
  table: string,
  data: object | object[],
  options: { returning?: boolean; single?: boolean } = {}
): Promise<AdminResult<T>> {
  return adminFetch<T>({ operation: 'insert', table, data, ...options })
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export async function adminUpdate<T = unknown>(
  table: string,
  data: object,
  filters: AdminFilter[],
  options: { returning?: boolean; single?: boolean } = {}
): Promise<AdminResult<T>> {
  return adminFetch<T>({ operation: 'update', table, data, filters, ...options })
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function adminDelete(
  table: string,
  filters: AdminFilter[]
): Promise<AdminResult<null>> {
  return adminFetch<null>({ operation: 'delete', table, filters })
}

// ── STORAGE UPLOAD ───────────────────────────────────────────────────────────

export async function adminUploadImage(
  file: File,
  path: string
): Promise<{ url: string | null; error: { message: string } | null }> {
  const password =
    typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('admin_pw') ?? '')
      : ''

  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)

  const res = await fetch('/api/admin/storage', {
    method: 'POST',
    headers: { 'x-admin-password': password },
    body: formData,
  })

  return res.json()
}
