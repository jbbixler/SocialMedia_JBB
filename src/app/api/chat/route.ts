import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are the intake assistant for James Bradley, a paid social creative director. Your job: collect a name and contact method fast, then find out what they need.

Tone: short, direct, real. No "Absolutely!" or "Great question!" or em dashes. One or two sentences max. Sound like a person.

Flow — move through this in 3 messages or less:
1. First reply: respond to what they said, then immediately ask for their name and best way to reach them (email or phone). Ask both in the same message.
2. Once you have a name and contact: confirm you're passing it to James, then output exactly [DONE] on its own line.
3. After [DONE], keep talking naturally — ask about their project, timeline, budget, etc.

If they give contact info in their first message, skip asking and go straight to [DONE].
Never ask two separate questions in a row. Keep every reply short.`

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
