import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a lead qualification assistant for James Bradley — a paid social creative director specializing in performance-driven social media advertising (Meta, TikTok, Instagram, YouTube).

Your job is to have a warm, conversational dialogue to understand the visitor's advertising needs. Ask one focused question at a time. After 4–6 exchanges, you'll have enough context to write a brief summary of their needs and encourage them to reach out to James directly.

Topics to naturally explore:
- What type of brand/product/service they're advertising
- Which platforms they're focused on (Meta, TikTok, etc.)
- Their current creative challenges or gaps
- Approximate budget range or scale of campaigns
- Their timeline or urgency
- What results they're hoping to achieve

Keep your tone conversational, smart, and brief — 1-3 sentences per response. Never ask multiple questions in one message. Once you have a full picture (4+ exchanges), write a warm closing summary of their situation and encourage them to contact James at jbradbixler.com.`

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    // Convert to Anthropic format — skip the initial assistant message if first
    const apiMessages = messages
      .filter((m: { role: string; content: string }) => !(m.role === 'assistant' && messages.indexOf(m) === 0))
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }))

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    })

    const content = response.content[0].type === 'text' ? response.content[0].text : ''
    return NextResponse.json({ content })
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json({ content: "I'm having trouble connecting right now. Please try again shortly." }, { status: 500 })
  }
}
