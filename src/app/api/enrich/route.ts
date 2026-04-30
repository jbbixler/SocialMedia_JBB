import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { lead } = await req.json()

    const prompt = `You are a B2B sales intelligence researcher. A potential client has submitted a lead inquiry. Research everything you know about this person and their brand's marketing activity.

Lead details:
- Name: ${lead.name}
- Title/Role: ${lead.role}
- Company: ${lead.company}
- Email: ${lead.email}
- Their inquiry: "${lead.reason}"

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "person": {
    "title": "their actual job title",
    "bio": "2-3 sentence professional background",
    "background": "where they worked before, career trajectory",
    "social_presence": "LinkedIn/Twitter activity level and topics they post about"
  },
  "company": {
    "description": "what the company does and their market position",
    "marketing_focus": "their current marketing strategy and priorities",
    "recent_campaigns": ["campaign or initiative name and description", "another one", "another one"],
    "channels": ["Instagram", "TikTok"],
    "brand_voice": "how they communicate - tone, style, aesthetic",
    "target_audience": "who they are trying to reach"
  },
  "intelligence": {
    "lead_score": 8,
    "lead_score_reason": "why this lead is scored this way (budget, fit, urgency)",
    "recommended_angle": "exactly how to pitch James's services to this specific person based on their needs and company context",
    "talking_points": ["specific thing to mention", "another specific hook", "a third"],
    "estimated_budget": "low/mid/high with reasoning",
    "urgency": "low/medium/high with reasoning"
  }
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip any markdown code fences if Claude added them
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    const data = JSON.parse(cleaned)
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Enrich API error:', err)
    return NextResponse.json({ error: 'Failed to enrich lead' }, { status: 500 })
  }
}
