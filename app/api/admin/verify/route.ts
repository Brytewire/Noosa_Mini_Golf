import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()
  const correct = process.env.ADMIN_PASSWORD

  if (!correct || password !== correct) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
