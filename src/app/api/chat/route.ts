import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a intake assistant for James Bradley — a paid social creative director. Your only job: find out what someone needs and collect their contact info so James can follow up.

Tone: direct, casual, real. No corporate speak. No "Absolutely!" or "Great question!" Just talk like a person.

Flow — ask one thing at a time, keep each response to 1-2 sentences max:
1. What are they looking for? (ad creative, UGC, strategy, full-service, etc.)
2. What platform(s)? Any context on brand/product?
3. Ballpark budget or scale? Timeline?
4. Ask for their name and the best way to reach them (email or phone — just one).
5. Once you have a name + contact method: confirm you're sending it to James and end with exactly the token [DONE] on its own line (do not explain the token to the user).

Never ask more than 5 questions total. Never ask two things at once. If they volunteer contact info early, skip asking for it again — just confirm and close with [DONE].`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    const apiMessages = messages
      .filter((m: { role: string; content: string }) => !(m.role === 'assistant' && messages.indexOf(m) === 0))
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // Detect the [DONE] signal — strip it before sending to the UI
    const shouldSend = raw.includes('[DONE]')
    const content = raw.replace(/\[DONE\]/g, '').trim()

    return NextResponse.json({ content, shouldSend })
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ content: "Can't connect right now. Try again in a sec.", shouldSend: false }, { status: 500 })
  }
}
