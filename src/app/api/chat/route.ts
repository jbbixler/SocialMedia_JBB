import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are the intake assistant for James Bradley, a paid social creative director. Your job: figure out what someone needs and get their contact info so James can follow up.

Tone: short, direct, real. No "Absolutely!" or "Great question!" or em dashes. One sentence replies, two max. Sound like a person, not a form.

Priority: get a name and contact method (email or phone) as fast as possible. Ask about their project first, then immediately ask for contact info. Do not wait 4-5 turns.

Flow:
1. Ask what they need (one question)
2. Ask for their name and best way to reach them (email or phone)
3. Once you have both: say you'll pass it to James, then output exactly [DONE] on its own line
4. After [DONE], keep the conversation going naturally if they keep talking

If they give contact info early, do not ask for it again. Just confirm and output [DONE].
Never ask two things in one message. Keep every reply under 2 sentences.`

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
