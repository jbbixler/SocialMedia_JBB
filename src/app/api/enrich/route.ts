import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function tavilySearch(query: string): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return '(no search results — TAVILY_API_KEY not set)'

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'advanced',
      max_results: 5,
      include_answer: true,
    }),
  })

  if (!res.ok) return `(search failed: ${res.status})`

  const data = await res.json()

  const lines: string[] = []
  if (data.answer) lines.push(`Summary: ${data.answer}`)
  for (const r of data.results ?? []) {
    lines.push(`\nSource: ${r.url}\n${r.content}`)
  }
  return lines.join('\n') || '(no results)'
}

export async function POST(req: NextRequest) {
  try {
    const { lead } = await req.json()

    // Run two searches in parallel — person and company marketing
    const [personResults, companyResults] = await Promise.all([
      tavilySearch(`${lead.name} ${lead.company} ${lead.role} marketing`),
      tavilySearch(`${lead.company} marketing campaigns social media strategy brand`),
    ])

    const prompt = `You are a B2B sales intelligence researcher building a dossier on an inbound lead for James Bradley, a paid social creative director.

Below are live web search results about this person and their company. Use them as your primary source of truth. Fill in gaps with your own knowledge only where search results are silent.

---
LEAD DETAILS:
- Name: ${lead.name}
- Title/Role: ${lead.role}
- Company: ${lead.company}
- Email: ${lead.email}
- Their inquiry: "${lead.reason}"

---
WEB SEARCH — PERSON (${lead.name} at ${lead.company}):
${personResults}

---
WEB SEARCH — COMPANY MARKETING (${lead.company}):
${companyResults}

---

Using the above, return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "person": {
    "title": "their actual job title",
    "bio": "2-3 sentence professional background based on search results",
    "background": "career trajectory, past roles, where they came from",
    "social_presence": "what they post about on LinkedIn/Twitter/X, their public voice"
  },
  "company": {
    "description": "what the company does and their current market position",
    "marketing_focus": "their current marketing strategy and priorities based on recent activity",
    "recent_campaigns": ["specific real campaign name and what it was", "another real one", "another"],
    "channels": ["Instagram", "TikTok"],
    "brand_voice": "how they actually communicate — tone, aesthetic, style",
    "target_audience": "who they are trying to reach and why"
  },
  "intelligence": {
    "lead_score": 8,
    "lead_score_reason": "why this lead scores this way based on budget signals, fit with James's work, and urgency",
    "recommended_angle": "exactly how James should pitch to this specific person given their role, company context, and stated reason for inquiry",
    "talking_points": ["specific hook tied to something real about their brand", "another concrete angle", "a third"],
    "estimated_budget": "estimate with reasoning based on company size and marketing sophistication",
    "urgency": "low/medium/high with specific reasoning"
  }
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json({ data })
  } catch (err) {
    console.error('Enrich API error:', err)
    return NextResponse.json({ error: 'Failed to enrich lead' }, { status: 500 })
  }
}
