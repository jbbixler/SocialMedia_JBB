import { NextRequest, NextResponse } from 'next/server'

interface Message { role: string; content: string }

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json()
    const RESEND_KEY = process.env.RESEND_API_KEY
    const TO_EMAIL = process.env.LEAD_EMAIL || 'jbbleads@gmail.com'

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    const html = `
      <h2>New Lead from Portfolio Chatbot</h2>
      <pre style="font-family:sans-serif;white-space:pre-wrap;background:#f5f5f7;padding:16px;border-radius:8px">${transcript}</pre>
      <p style="color:#888;font-size:12px">Sent from jbradbixler portfolio</p>
    `

    if (!RESEND_KEY) {
      console.log('RESEND_API_KEY not set — lead transcript:\n', transcript)
      return NextResponse.json({ ok: true, warn: 'no resend key' })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Portfolio Bot <onboarding@resend.dev>',
        to: TO_EMAIL,
        subject: '🎯 New Portfolio Lead',
        html,
      }),
    })

    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Lead email error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
