import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

interface PlayerResult {
  name: string
  total: number
  scores: number[]
}

interface VoucherData {
  title: string
  description: string
  promo_code: string
  valid_days: number
}

function buildHtml(players: PlayerResult[], voucher?: VoucherData | null) {
  const winner = players[0]
  const isSolo = players.length === 1

  const rows = players
    .map(
      (p, i) => `
      <tr style="border-bottom:1px solid #e4e4e7;">
        <td style="padding:10px 12px;font-weight:700;color:#a1a1aa;">${i + 1}.</td>
        <td style="padding:10px 12px;font-weight:600;color:#1B2E2B;">${p.name}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:700;color:${i === 0 ? '#E8A98B' : '#3f3f46'};">${p.total}</td>
      </tr>`,
    )
    .join('')

  const holeHeaders = players[0].scores
    .map((_, i) => `<th style="padding:6px 8px;text-align:center;font-size:11px;color:#71717a;">H${i + 1}</th>`)
    .join('')

  const holeRows = players
    .map(
      (p) => `
      <tr style="border-bottom:1px solid #f4f4f5;">
        <td style="padding:6px 8px;font-size:12px;font-weight:600;color:#3f3f46;">${p.name.split(' ')[0]}</td>
        ${p.scores.map((s) => `<td style="padding:6px 8px;text-align:center;font-size:12px;color:${s === 1 ? '#4CAF7D' : '#18181b'};font-weight:${s === 1 ? '700' : '400'};">${s}</td>`).join('')}
        <td style="padding:6px 8px;text-align:center;font-size:12px;font-weight:700;color:#18181b;">${p.total}</td>
      </tr>`,
    )
    .join('')

  const voucherHtml = voucher ? `
    <div style="margin-top:24px;border:2px dashed #F5F0A9;border-radius:16px;padding:20px;text-align:center;background:#fffdf0;">
      <p style="margin:0;font-size:22px;">🎉</p>
      <p style="margin:8px 0 0;font-size:17px;font-weight:700;color:#1B4B44;">${voucher.title}</p>
      ${voucher.description ? `<p style="margin:6px 0 0;font-size:12px;color:#5A7A73;">${voucher.description}</p>` : ''}
      ${voucher.promo_code ? `<p style="margin:12px 0 0;display:inline-block;background:#fff;border-radius:10px;padding:8px 20px;font-family:monospace;font-size:14px;font-weight:700;letter-spacing:.15em;color:#1B2E2B;border:1px dashed #ccc;">${voucher.promo_code}</p>` : ''}
      ${voucher.valid_days > 0 ? `<p style="margin:8px 0 0;font-size:11px;color:#5A7A73;">Valid for ${voucher.valid_days} days</p>` : ''}
      <p style="margin:10px 0 0;font-size:12px;color:#1B4B44;font-weight:600;">Show this email at the counter to redeem.</p>
    </div>` : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FBE8DC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 2px 8px rgba(27,75,68,0.10);">

    <div style="background:#1B4B44;padding:32px 24px;text-align:center;">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">⛳ Noosa Mini Golf</p>
      <h1 style="margin:8px 0 0;font-size:26px;font-weight:800;color:#F5F0A9;letter-spacing:1px;">Your Scorecard</h1>
      <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">18 holes complete ✓</p>
    </div>

    <div style="padding:24px;">

      <div style="background:#FBEEE6;border:1px solid #E8A98B;border-radius:16px;padding:20px;text-align:center;margin-bottom:20px;">
        <p style="margin:0;font-size:28px;">🏆</p>
        <p style="margin:8px 0 0;font-size:17px;font-weight:700;color:#1B2E2B;">${isSolo ? winner.name : `${winner.name} wins!`}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#71717a;">${isSolo ? 'Your score' : 'Winning score'}</p>
        <p style="margin:6px 0 0;font-size:56px;font-weight:800;color:#1B4B44;line-height:1;">${winner.total}</p>
      </div>

      ${!isSolo ? `
      <h2 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#5A7A73;text-transform:uppercase;letter-spacing:.05em;">Final Scores</h2>
      <table style="width:100%;border-collapse:collapse;background:#f9faf7;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        ${rows}
      </table>` : ''}

      <h2 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#5A7A73;text-transform:uppercase;letter-spacing:.05em;">Hole by Hole</h2>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;background:#f9faf7;border-radius:12px;overflow:hidden;">
          <thead>
            <tr style="background:#1B4B44;">
              <th style="padding:7px 8px;text-align:left;font-size:11px;color:rgba(255,255,255,0.8);">Player</th>
              ${holeHeaders}
              <th style="padding:7px 8px;text-align:center;font-size:11px;color:rgba(255,255,255,0.8);">Tot</th>
            </tr>
          </thead>
          <tbody>${holeRows}</tbody>
        </table>
      </div>

      ${voucherHtml}

    </div>

    <div style="padding:20px 24px;text-align:center;border-top:1px solid #f4f4f5;">
      <p style="margin:0 0 14px;font-size:14px;color:#3f3f46;font-weight:600;">Ready for another round?</p>
      <p style="margin:0;font-size:13px;color:#5A7A73;">Play again for just $5 — show this email at the kiosk.</p>
    </div>
    <div style="padding:12px 24px;text-align:center;font-size:11px;color:#a1a1aa;border-top:1px solid #f4f4f5;">
      Noosa Mini Golf &bull; See you next time!
    </div>
  </div>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const { email, players, voucher } = (await request.json()) as {
      email: string
      players: PlayerResult[]
      voucher?: VoucherData | null
    }

    if (!email || !players?.length) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'Noosa Mini Golf <onboarding@resend.dev>',
      to: email,
      subject: 'Your Noosa Mini Golf Scorecard',
      html: buildHtml(players, voucher),
    })

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
