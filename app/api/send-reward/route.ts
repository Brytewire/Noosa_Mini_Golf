import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

function buildHtml(playerName: string, rewardName: string, prizeValue: string, description: string, holeNumber: number) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FBE8DC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 16px rgba(27,75,68,0.10);">

    <div style="background:#1B4B44;padding:32px 24px;text-align:center;">
      <p style="margin:0;font-size:32px;">⭐ 🎯 ⭐</p>
      <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#F5F0A9;letter-spacing:2px;">HOLE IN ONE!</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Noosa Mini Golf · Hole ${holeNumber}</p>
    </div>

    <div style="padding:24px;">

      <div style="background:#FBEEE6;border:1px solid #E8A98B;border-radius:16px;padding:20px;text-align:center;margin-bottom:20px;">
        <p style="margin:0;font-size:15px;font-weight:600;color:#92400e;">Congratulations, ${playerName}!</p>
        <p style="margin:8px 0 0;font-size:13px;color:#71717a;">You've won a prize for your hole in one.</p>
      </div>

      <div style="border:2px dashed #4CAF7D;border-radius:16px;padding:24px;text-align:center;background:#f0fdf4;">
        <p style="margin:0;font-size:22px;">🎉</p>
        <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#166534;">${rewardName}</p>
        <p style="margin:6px 0 0;font-size:24px;font-weight:800;color:#15803d;">${prizeValue}</p>
        ${description ? `<p style="margin:10px 0 0;font-size:13px;color:#16a34a;">${description}</p>` : ''}
        <p style="margin:16px 0 0;font-size:13px;color:#15803d;font-weight:600;">Show this email at the counter to claim your prize.</p>
      </div>

    </div>

    <div style="padding:16px 24px;text-align:center;font-size:11px;color:#a1a1aa;border-top:1px solid #f4f4f5;">
      Noosa Mini Golf &bull; See you next time!
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const { email, playerName, rewardName, prizeValue, description, holeNumber } =
      (await request.json()) as {
        email: string
        playerName: string
        rewardName: string
        prizeValue: string
        description: string
        holeNumber: number
      }

    if (!email || !playerName || !rewardName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Noosa Mini Golf <onboarding@resend.dev>',
      to: email,
      subject: `🎯 Hole in One Prize – ${rewardName}`,
      html: buildHtml(playerName, rewardName, prizeValue, description ?? '', holeNumber),
    })

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
