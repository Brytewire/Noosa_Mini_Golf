import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'adverts'

export async function POST(request: Request) {
  const adminPassword = request.headers.get('x-admin-password')
  if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { url: null, error: { message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file')
  const path = formData.get('path')

  if (!(file instanceof File) || typeof path !== 'string' || !path) {
    return NextResponse.json(
      { url: null, error: { message: 'Missing file or path' } },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json(
      { url: null, error: { message: uploadError.message } },
      { status: 500 }
    )
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl, error: null })
}
