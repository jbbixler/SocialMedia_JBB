import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { comment, clientName, adIndex } = await req.json()
    const RESEND_KEY = process.env.RESEND_API_KEY
    const TO_EMAIL = process.env.LEAD_EMAIL || 'jbbleads@gmail.com'

    const siteUrl = 'https://jbradbixler.com'
    const html = `
      <h2 style="margin:0 0 16px">💬 New Comment on Portfolio Ad</h2>
      <p style="margin:0 0 4px"><strong>Client:</strong> ${clientName}</p>
      <p style="margin:0 0 16px"><strong>Ad:</strong> <a href="${siteUrl}" style="color:#0095f6">${siteUrl}</a> → ${clientName} (ad key: ${adIndex})</p>
      <blockquote style="border-left:3px solid #0095f6;margin:0 0 16px;padding:8px 16px;background:#f5f5f7;border-radius:0 8px 8px 0;font-size:15px">
        ${comment}
      </blockquote>
      <p style="color:#888;font-size:12px;margin:0">Only visible to you — not shown to other visitors.</p>
    `

    if (!RESEND_KEY) {
      console.log('RESEND_API_KEY not set — comment:', comment)
      return NextResponse.json({ ok: true, warn: 'no resend key' })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Portfolio Comments <onboarding@resend.dev>',
        to: TO_EMAIL,
        subject: `💬 New Comment — ${clientName}`,
        html,
      }),
    })

    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Comment email error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
