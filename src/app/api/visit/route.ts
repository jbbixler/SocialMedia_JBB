import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { path } = await req.json()

    const RESEND_KEY = process.env.RESEND_API_KEY
    if (!RESEND_KEY) return NextResponse.json({ ok: true })

    // Vercel populates these headers automatically in production
    const country  = req.headers.get('x-vercel-ip-country') ?? 'Unknown'
    const region   = req.headers.get('x-vercel-ip-country-region') ?? ''
    const city     = req.headers.get('x-vercel-ip-city') ?? 'Unknown'
    const ip       = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'Unknown'
    const ua       = req.headers.get('user-agent') ?? ''

    const device = /Mobile|Android|iPhone|iPad/.test(ua) ? '📱 Mobile' : '🖥️ Desktop'
    const pageLabel = path === '/' ? 'Home' : path

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;color:#1d1d1f">
        <h2 style="margin:0 0 6px;font-size:20px">👀 New portfolio visitor</h2>
        <p style="margin:0 0 20px;color:#6e6e73;font-size:13px">Someone just landed on your site.</p>
        <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px">
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:5px 16px 5px 0;color:#86868b;font-size:13px;white-space:nowrap">Page</td><td style="font-size:13px;font-weight:600">${pageLabel}</td></tr>
            <tr><td style="padding:5px 16px 5px 0;color:#86868b;font-size:13px;white-space:nowrap">Location</td><td style="font-size:13px">${city}${region ? ', ' + region : ''} &nbsp;·&nbsp; ${country}</td></tr>
            <tr><td style="padding:5px 16px 5px 0;color:#86868b;font-size:13px;white-space:nowrap">Device</td><td style="font-size:13px">${device}</td></tr>
            <tr><td style="padding:5px 16px 5px 0;color:#86868b;font-size:13px;white-space:nowrap">IP</td><td style="font-size:13px;color:#86868b">${ip}</td></tr>
          </table>
        </div>
        <p style="margin:16px 0 0;color:#86868b;font-size:11px">jbradbixler.com</p>
      </div>
    `

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Portfolio Tracker <onboarding@resend.dev>',
        to: 'jbbleads@gmail.com',
        subject: `👀 New visitor — ${city}, ${country} (${pageLabel})`,
        html,
      }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Visit ping error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
