'use client'

import { useState, useRef, useCallback } from 'react'

type LeadStatus = 'new' | 'enriching' | 'enriched' | 'error'

type Lead = {
  id: string
  name: string
  email: string
  phone: string
  company: string
  role: string
  reason: string
  status: LeadStatus
}

type EnrichedPerson = {
  title: string
  bio: string
  background: string
  social_presence: string
}

type EnrichedCompany = {
  description: string
  marketing_focus: string
  recent_campaigns: string[]
  channels: string[]
  brand_voice: string
  target_audience: string
}

type EnrichedIntelligence = {
  lead_score: number
  lead_score_reason: string
  recommended_angle: string
  talking_points: string[]
  estimated_budget: string
  urgency: string
}

type EnrichedData = {
  person: EnrichedPerson
  company: EnrichedCompany
  intelligence: EnrichedIntelligence
}

function parseCSV(text: string): Lead[] {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map((line, i) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue }
      current += char
    }
    values.push(current.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    return {
      id: `lead-${i}-${Date.now()}`,
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      company: row.company || '',
      role: row.role || row.title || row.position || '',
      reason: row.reason || row.message || row.inquiry || '',
      status: 'new' as LeadStatus,
    }
  }).filter(l => l.name)
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#22c55e' : score >= 5 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-white/10 rounded-full h-2">
        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}/10</span>
    </div>
  )
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const lower = urgency.toLowerCase()
  const isHigh = lower.startsWith('high')
  const isMed = lower.startsWith('med')
  const color = isHigh ? 'bg-red-500/20 text-red-400 border-red-500/30'
    : isMed ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    : 'bg-white/10 text-white/50 border-white/10'
  const label = isHigh ? 'High Urgency' : isMed ? 'Medium Urgency' : 'Low Urgency'
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${color}`}>{label}</span>
  )
}

function StatusPill({ status }: { status: LeadStatus }) {
  const map: Record<LeadStatus, { label: string; cls: string }> = {
    new: { label: 'New', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    enriching: { label: 'Researching...', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' },
    enriched: { label: 'Enriched', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    error: { label: 'Error', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>{label}</span>
  )
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-[#ff0080]/20 border border-[#ff0080]/40 flex items-center justify-center text-xs font-bold text-[#ff0080] shrink-0">
      {letters.toUpperCase()}
    </div>
  )
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [enriched, setEnriched] = useState<Record<string, EnrichedData>>({})
  const [selected, setSelected] = useState<Lead | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setLeads(parsed)
      setSelected(null)
    }
    reader.readAsText(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) loadFile(file)
  }, [])

  const enrichLead = async (lead: Lead) => {
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'enriching' } : l))
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      })
      const json = await res.json()
      if (json.data) {
        setEnriched(prev => ({ ...prev, [lead.id]: json.data }))
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'enriched' } : l))
      } else {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'error' } : l))
      }
    } catch {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'error' } : l))
    }
  }

  const enrichAll = () => {
    leads.filter(l => l.status === 'new').forEach(enrichLead)
  }

  const stats = {
    total: leads.length,
    enriched: leads.filter(l => l.status === 'enriched').length,
    pending: leads.filter(l => l.status === 'new').length,
  }

  const selectedData = selected ? enriched[selected.id] : null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main panel */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${selected ? 'mr-[480px]' : ''}`}>
        {/* Header */}
        <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Lead Intelligence</h1>
            <p className="text-xs text-white/40 mt-0.5">Upload a CSV to research and enrich inbound leads</p>
          </div>
          <div className="flex items-center gap-3">
            {leads.length > 0 && stats.pending > 0 && (
              <button
                onClick={enrichAll}
                className="text-sm px-4 py-2 rounded-lg bg-[#ff0080]/20 text-[#ff0080] border border-[#ff0080]/30 hover:bg-[#ff0080]/30 transition-colors font-medium"
              >
                Enrich All ({stats.pending})
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm px-4 py-2 rounded-lg bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-colors font-medium"
            >
              {leads.length ? 'Load New CSV' : 'Load CSV'}
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        </div>

        {/* Stats row */}
        {leads.length > 0 && (
          <div className="grid grid-cols-3 gap-px border-b border-white/8 shrink-0">
            {[
              { label: 'Total Leads', value: stats.total },
              { label: 'Enriched', value: stats.enriched },
              { label: 'Pending', value: stats.pending },
            ].map(s => (
              <div key={s.label} className="px-6 py-4 bg-white/2">
                <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                <div className="text-xs text-white/40 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state / Drop zone */}
        {leads.length === 0 && (
          <div
            className={`flex-1 flex flex-col items-center justify-center gap-4 transition-colors ${dragging ? 'bg-[#ff0080]/5' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <div className={`w-16 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${dragging ? 'border-[#ff0080] bg-[#ff0080]/10' : 'border-white/20'}`}>
              <svg className="w-7 h-7 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-white/60 font-medium">Drop a CSV here or click Load CSV</p>
              <p className="text-white/30 text-sm mt-1">Columns: name, email, phone, company, role, reason</p>
            </div>
            <a
              href="/leads-sample.csv"
              download
              className="text-xs text-[#ff0080]/70 hover:text-[#ff0080] transition-colors underline underline-offset-2"
            >
              Download sample CSV
            </a>
          </div>
        )}

        {/* Lead table */}
        {leads.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#0a0a0a] border-b border-white/8 z-10">
                <tr>
                  {['Lead', 'Company', 'Role', 'Reason', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs text-white/40 font-medium px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leads.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(selected?.id === lead.id ? null : lead)}
                    className={`cursor-pointer transition-colors hover:bg-white/4 ${selected?.id === lead.id ? 'bg-white/6' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Initials name={lead.name} />
                        <div>
                          <div className="text-sm font-medium">{lead.name}</div>
                          <div className="text-xs text-white/40">{lead.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/70">{lead.company}</td>
                    <td className="px-6 py-4 text-sm text-white/50">{lead.role}</td>
                    <td className="px-6 py-4 max-w-xs">
                      <p className="text-sm text-white/50 truncate">{lead.reason}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill status={lead.status} />
                    </td>
                    <td className="px-6 py-4">
                      {lead.status === 'new' || lead.status === 'error' ? (
                        <button
                          onClick={e => { e.stopPropagation(); enrichLead(lead) }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 transition-colors text-white/70"
                        >
                          {lead.status === 'error' ? 'Retry' : 'Enrich'}
                        </button>
                      ) : lead.status === 'enriched' ? (
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(lead) }}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#ff0080]/15 hover:bg-[#ff0080]/25 border border-[#ff0080]/30 transition-colors text-[#ff0080]"
                        >
                          View Intel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side panel */}
      {selected && (
        <div className="fixed right-0 top-0 bottom-0 w-[480px] bg-[#111] border-l border-white/8 flex flex-col overflow-hidden z-20">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Initials name={selected.name} />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{selected.name}</div>
                <div className="text-xs text-white/40 truncate">{selected.company}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white transition-colors shrink-0 ml-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Inquiry */}
            <div className="px-5 py-4 border-b border-white/6">
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">Their Inquiry</p>
              <p className="text-sm text-white/70 leading-relaxed">{selected.reason}</p>
              <div className="flex gap-4 mt-3 text-xs text-white/30">
                <span>{selected.email}</span>
                <span>{selected.phone}</span>
              </div>
            </div>

            {/* Enriched data or loading/empty state */}
            {selected.status === 'new' && (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-4">
                <p className="text-white/40 text-sm">No intel yet. Click Enrich to research this lead.</p>
                <button
                  onClick={() => enrichLead(selected)}
                  className="text-sm px-5 py-2.5 rounded-lg bg-[#ff0080]/20 text-[#ff0080] border border-[#ff0080]/30 hover:bg-[#ff0080]/30 transition-colors font-medium"
                >
                  Enrich This Lead
                </button>
              </div>
            )}

            {selected.status === 'enriching' && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-7 h-7 border-2 border-[#ff0080]/40 border-t-[#ff0080] rounded-full animate-spin" />
                <p className="text-sm text-white/40">Researching {selected.name} and {selected.company}...</p>
              </div>
            )}

            {selected.status === 'error' && (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-4">
                <p className="text-red-400 text-sm">Research failed. Check your API key and try again.</p>
                <button
                  onClick={() => enrichLead(selected)}
                  className="text-sm px-5 py-2.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {selected.status === 'enriched' && selectedData && (
              <div className="divide-y divide-white/6">
                {/* Lead score */}
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Lead Score</p>
                    <UrgencyBadge urgency={selectedData.intelligence.urgency} />
                  </div>
                  <ScoreBar score={selectedData.intelligence.lead_score} />
                  <p className="text-xs text-white/50 mt-2 leading-relaxed">{selectedData.intelligence.lead_score_reason}</p>
                </div>

                {/* Recommended angle */}
                <div className="px-5 py-4">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">Recommended Pitch Angle</p>
                  <p className="text-sm text-white/80 leading-relaxed">{selectedData.intelligence.recommended_angle}</p>
                </div>

                {/* Talking points */}
                <div className="px-5 py-4">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">Talking Points</p>
                  <ul className="space-y-2">
                    {selectedData.intelligence.talking_points.map((pt, i) => (
                      <li key={i} className="flex gap-2 text-sm text-white/70">
                        <span className="text-[#ff0080] shrink-0 mt-0.5">+</span>
                        <span className="leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Person */}
                <div className="px-5 py-4">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">About {selected.name.split(' ')[0]}</p>
                  <p className="text-sm text-white/70 leading-relaxed mb-2">{selectedData.person.bio}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{selectedData.person.background}</p>
                  {selectedData.person.social_presence && (
                    <p className="text-xs text-white/40 mt-2 leading-relaxed italic">{selectedData.person.social_presence}</p>
                  )}
                </div>

                {/* Company */}
                <div className="px-5 py-4">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">{selected.company}</p>
                  <p className="text-sm text-white/70 leading-relaxed mb-3">{selectedData.company.description}</p>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-white/30 mb-1">Brand Voice</p>
                      <p className="text-xs text-white/60">{selectedData.company.brand_voice}</p>
                    </div>
                    <div>
                      <p className="text-xs text-white/30 mb-1">Target Audience</p>
                      <p className="text-xs text-white/60">{selectedData.company.target_audience}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-white/30 mb-1">Marketing Focus</p>
                    <p className="text-xs text-white/60 leading-relaxed">{selectedData.company.marketing_focus}</p>
                  </div>

                  {selectedData.company.channels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {selectedData.company.channels.map(ch => (
                        <span key={ch} className="text-xs px-2 py-0.5 rounded bg-white/8 text-white/50 border border-white/8">{ch}</span>
                      ))}
                    </div>
                  )}

                  {selectedData.company.recent_campaigns.length > 0 && (
                    <div>
                      <p className="text-xs text-white/30 mb-2">Recent Campaigns</p>
                      <ul className="space-y-1.5">
                        {selectedData.company.recent_campaigns.map((c, i) => (
                          <li key={i} className="text-xs text-white/50 leading-relaxed pl-3 border-l border-white/10">{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div className="px-5 py-4">
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">Estimated Budget</p>
                  <p className="text-sm text-white/70">{selectedData.intelligence.estimated_budget}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
