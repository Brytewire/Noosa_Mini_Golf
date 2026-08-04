import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client using the service role key.
 * This bypasses Row-Level Security entirely.
 *
 * ⚠️  ONLY import this in server-side code (API routes in /app/api/).
 *     Never import in 'use client' components or any file prefixed with NEXT_PUBLIC_.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
