import { NextRequest, NextResponse } from 'next/server'

interface Message { role: string; content: string }

function extractContact(messages: Message[]) {
  const text = messages.map(m => m.content).join(' ')
  const email = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] ?? null
  const phone = text.match(/(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)?.[0] ?? null
  // Grab the last user message that likely contains a name (short, no @)
  const nameLine = messages
    .filter(m => m.role === 'user')
    .map(m => m.content.trim())
    .find(c => c.split(' ').length <= 4 && !c.includes('@') && !c.match(/\d{7,}/))
  return { email, phone, nameLine: nameLine ?? null }
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await req.json()
    const RESEND_KEY = process.env.RESEND_API_KEY
    const TO_EMAIL = process.env.LEAD_EMAIL || 'jbbleads@gmail.com'

    const { email, phone, nameLine } = extractContact(messages)

    const transcript = messages
      .map(m => `<b>${m.role === 'user' ? 'Visitor' : 'Bot'}:</b> ${m.content}`)
      .join('<br><br>')

    const contactRows = [
      email && `<tr><td style="padding:4px 12px 4px 0;color:#86868b;font-size:13px">Email</td><td style="font-size:13px;font-weight:600">${email}</td></tr>`,
      phone && `<tr><td style="padding:4px 12px 4px 0;color:#86868b;font-size:13px">Phone</td><td style="font-size:13px;font-weight:600">${phone}</td></tr>`,
      nameLine && `<tr><td style="padding:4px 12px 4px 0;color:#86868b;font-size:13px">Name hint</td><td style="font-size:13px">${nameLine}</td></tr>`,
    ].filter(Boolean).join('')

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;color:#1d1d1f">
        <h2 style="margin:0 0 8px;font-size:22px">New lead 🎯</h2>
        <p style="margin:0 0 20px;color:#6e6e73;font-size:14px">Someone just chatted on the portfolio.</p>

        ${contactRows ? `
        <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#86868b">Contact Info</p>
          <table style="border-collapse:collapse">${contactRows}</table>
        </div>` : ''}

        <div style="background:#f5f5f7;border-radius:12px;padding:16px 20px">
          <p style="margin:0 0 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#86868b">Conversation</p>
          <div style="font-size:13px;line-height:1.7;color:#1d1d1f">${transcript}</div>
        </div>

        <p style="margin:20px 0 0;color:#86868b;font-size:11px">jbradbixler.com portfolio chatbot</p>
      </div>
    `

    if (!RESEND_KEY) {
      console.log('RESEND_API_KEY not set — lead transcript:\n', messages.map(m => `${m.role}: ${m.content}`).join('\n'))
      return NextResponse.json({ ok: true, warn: 'no resend key' })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Portfolio Bot <onboarding@resend.dev>',
        to: TO_EMAIL,
        subject: `🎯 New lead${email ? `: ${email}` : phone ? `: ${phone}` : ''}`,
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
