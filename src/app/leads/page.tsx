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

const C = {
  cyan: '#00d4ff',
  green: '#00ff87',
  orange: '#ff6200',
  red: '#ff003c',
  gold: '#ffd700',
  bg: '#020409',
  bgCard: '#060e1a',
  bgRow: '#0a1628',
  border: '#0d2d47',
  borderBright: '#1a4d72',
  textDim: '#2a5f7a',
  textMid: '#4a9ab5',
  textFull: '#c8eeff',
}

function SegmentScore({ score }: { score: number }) {
  const color = score >= 8 ? C.green : score >= 5 ? C.orange : C.red
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 10,
              background: i < score ? color : C.border,
              boxShadow: i < score ? `0 0 6px ${color}88` : 'none',
              transition: 'all 0.4s ease',
            }}
          />
        ))}
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>{score}/10</span>
    </div>
  )
}

function ThreatBadge({ urgency }: { urgency: string }) {
  const lower = urgency.toLowerCase()
  const isHigh = lower.startsWith('high')
  const isMed = lower.startsWith('med')
  const color = isHigh ? C.red : isMed ? C.orange : C.textMid
  const label = isHigh ? 'THREAT: HIGH' : isMed ? 'THREAT: MED' : 'THREAT: LOW'
  return (
    <span className="font-mono text-xs font-bold px-2 py-0.5 border" style={{ color, borderColor: color, background: `${color}18`, letterSpacing: '0.1em' }}>
      {label}
    </span>
  )
}

function StatusTag({ status }: { status: LeadStatus }) {
  const map: Record<LeadStatus, { label: string; color: string }> = {
    new: { label: 'UNPROCESSED', color: C.textMid },
    enriching: { label: 'SCANNING...', color: C.cyan },
    enriched: { label: 'INTEL_ACQ', color: C.green },
    error: { label: 'SYS_ERR', color: C.red },
  }
  const { label, color } = map[status]
  return (
    <span
      className="font-mono text-xs font-bold px-2 py-0.5 border"
      style={{
        color,
        borderColor: `${color}66`,
        background: `${color}12`,
        letterSpacing: '0.08em',
        animation: status === 'enriching' ? 'pulse 1.2s ease-in-out infinite' : 'none',
      }}
    >
      {label}
    </span>
  )
}

function HexAvatar({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return (
    <div className="relative shrink-0" style={{ width: 34, height: 34 }}>
      <svg viewBox="0 0 34 34" width="34" height="34" className="absolute inset-0">
        <polygon points="17,2 31,10 31,24 17,32 3,24 3,10" fill={`${C.cyan}15`} stroke={C.cyan} strokeWidth="1" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold" style={{ color: C.cyan }}>
        {letters.toUpperCase()}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div style={{ width: 8, height: 8, background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
      <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: C.cyan }}>{children}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${C.borderBright}, transparent)` }} />
    </div>
  )
}

function CornerFrame({ children, className, glow }: { children: React.ReactNode; className?: string; glow?: boolean }) {
  const borderColor = glow ? C.cyan : C.borderBright
  const sz = 10
  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="absolute top-0 left-0" style={{ width: sz, height: sz, borderTop: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }} />
      <div className="absolute top-0 right-0" style={{ width: sz, height: sz, borderTop: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}` }} />
      <div className="absolute bottom-0 left-0" style={{ width: sz, height: sz, borderBottom: `1px solid ${borderColor}`, borderLeft: `1px solid ${borderColor}` }} />
      <div className="absolute bottom-0 right-0" style={{ width: sz, height: sz, borderBottom: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}` }} />
      {children}
    </div>
  )
}

function Timestamp() {
  const now = new Date()
  const ts = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  return <span className="font-mono text-xs" style={{ color: C.textDim }}>{ts}</span>
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
    if (selected?.id === lead.id) setSelected({ ...lead, status: 'enriching' })
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
        if (selected?.id === lead.id) setSelected({ ...lead, status: 'enriched' })
      } else {
        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'error' } : l))
        if (selected?.id === lead.id) setSelected({ ...lead, status: 'error' })
      }
    } catch {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'error' } : l))
      if (selected?.id === lead.id) setSelected({ ...lead, status: 'error' })
    }
  }

  const enrichAll = () => leads.filter(l => l.status === 'new').forEach(enrichLead)

  const stats = {
    total: leads.length,
    enriched: leads.filter(l => l.status === 'enriched').length,
    pending: leads.filter(l => l.status === 'new').length,
  }

  const selectedData = selected ? enriched[selected.id] : null
  const currentLead = selected ? leads.find(l => l.id === selected.id) ?? selected : null

  return (
    <div className="flex h-screen overflow-hidden font-mono" style={{ background: C.bg, color: C.textFull }}>

      {/* Scanline overlay */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'fixed',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.012) 3px, rgba(0,212,255,0.012) 4px)',
          zIndex: 9999,
        }}
      />

      {/* Dot grid bg */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'fixed',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, #0d2d4788 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          zIndex: 0,
        }}
      />

      {/* Main panel */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 relative z-10`}
        style={{ marginRight: selected ? 500 : 0 }}
      >
        {/* Header */}
        <div
          className="px-6 py-3 flex items-center justify-between gap-4 shrink-0"
          style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bgCard}cc` }}
        >
          <div className="flex items-center gap-4">
            {/* Logo mark */}
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 20 20" width="20" height="20">
                <polygon points="10,1 19,6 19,14 10,19 1,14 1,6" fill="none" stroke={C.cyan} strokeWidth="1.2" />
                <polygon points="10,5 15,8 15,12 10,15 5,12 5,8" fill={`${C.cyan}30`} stroke={C.cyan} strokeWidth="0.6" />
              </svg>
              <div>
                <div className="text-xs font-bold tracking-widest uppercase" style={{ color: C.cyan }}>LEAD INTELLIGENCE SYS</div>
                <div className="text-xs" style={{ color: C.textDim }}>// CLEARANCE: INTERNAL // v2.1.0</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Timestamp />
            {leads.length > 0 && stats.pending > 0 && (
              <button
                onClick={enrichAll}
                className="text-xs px-4 py-2 font-bold tracking-widest uppercase transition-all"
                style={{
                  color: C.cyan,
                  border: `1px solid ${C.cyan}`,
                  background: `${C.cyan}15`,
                  letterSpacing: '0.12em',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = `${C.cyan}30`; (e.target as HTMLElement).style.boxShadow = `0 0 16px ${C.cyan}44` }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = `${C.cyan}15`; (e.target as HTMLElement).style.boxShadow = 'none' }}
              >
                RUN_ALL ({stats.pending})
              </button>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-4 py-2 font-bold tracking-widest uppercase transition-all"
              style={{
                color: C.textMid,
                border: `1px solid ${C.borderBright}`,
                background: C.bgCard,
                letterSpacing: '0.12em',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = C.cyan; (e.target as HTMLElement).style.color = C.cyan }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = C.borderBright; (e.target as HTMLElement).style.color = C.textMid }}
            >
              {leads.length ? 'LOAD_CSV' : 'IMPORT_CSV'}
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        </div>

        {/* Stats row */}
        {leads.length > 0 && (
          <div className="grid grid-cols-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            {[
              { label: 'SUBJECTS_LOADED', value: stats.total, color: C.textMid },
              { label: 'PROFILES_COMPILED', value: stats.enriched, color: C.green },
              { label: 'PENDING_ANALYSIS', value: stats.pending, color: C.orange },
            ].map((s, i) => (
              <div
                key={s.label}
                className="px-6 py-4"
                style={{
                  borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
                  background: `${C.bgCard}88`,
                }}
              >
                <div className="text-3xl font-bold tabular-nums" style={{ color: s.color, textShadow: `0 0 20px ${s.color}66` }}>{s.value}</div>
                <div className="text-xs mt-1 tracking-widest" style={{ color: C.textDim }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {leads.length === 0 && (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-6 transition-colors"
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <CornerFrame
              className="flex flex-col items-center justify-center gap-4 p-12"
              glow={dragging}
            >
              <svg viewBox="0 0 48 48" width="48" height="48">
                <polygon points="24,3 43,13.5 43,34.5 24,45 5,34.5 5,13.5" fill="none" stroke={dragging ? C.cyan : C.borderBright} strokeWidth="1.2" />
                <path d="M24 16v10M24 26l-5-5M24 26l5-5" stroke={dragging ? C.cyan : C.textDim} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="text-center">
                <div className="text-sm font-bold tracking-widest uppercase" style={{ color: dragging ? C.cyan : C.textMid }}>
                  {dragging ? 'RELEASE TO UPLOAD' : 'AWAITING DATA UPLOAD'}
                </div>
                <div className="text-xs mt-2 tracking-wider" style={{ color: C.textDim }}>DROP CSV OR CLICK IMPORT_CSV</div>
                <div className="text-xs mt-1" style={{ color: C.textDim }}>FIELDS: name, email, phone, company, role, reason</div>
              </div>
            </CornerFrame>
            <a
              href="/leads-sample.csv"
              download
              className="text-xs tracking-widest uppercase transition-colors"
              style={{ color: C.textDim }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = C.cyan }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = C.textDim }}
            >
              [DOWNLOAD SAMPLE DATASET]
            </a>
          </div>
        )}

        {/* Lead table */}
        {leads.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10" style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}` }}>
                <tr>
                  {['SUBJECT', 'ORGANIZATION', 'DESIGNATION', 'STATED PURPOSE', 'STATUS', 'OPS'].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-bold tracking-widest"
                      style={{ color: C.textDim, borderBottom: `1px solid ${C.border}` }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, idx) => {
                  const isSelected = selected?.id === lead.id
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(isSelected ? null : lead)}
                      className="cursor-pointer transition-all"
                      style={{
                        background: isSelected ? `${C.cyan}0e` : idx % 2 === 0 ? 'transparent' : `${C.bgCard}44`,
                        borderBottom: `1px solid ${C.border}`,
                        borderLeft: isSelected ? `2px solid ${C.cyan}` : '2px solid transparent',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = `${C.bgRow}` }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? 'transparent' : `${C.bgCard}44` }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <HexAvatar name={lead.name} />
                          <div>
                            <div className="text-sm font-bold" style={{ color: C.textFull }}>{lead.name}</div>
                            <div className="text-xs" style={{ color: C.textDim }}>{lead.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold" style={{ color: C.textMid }}>{lead.company}</td>
                      <td className="px-5 py-3.5 text-xs uppercase tracking-wide" style={{ color: C.textDim }}>{lead.role}</td>
                      <td className="px-5 py-3.5 max-w-[260px]">
                        <p className="text-xs truncate" style={{ color: C.textDim }}>{lead.reason}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusTag status={lead.status} />
                      </td>
                      <td className="px-5 py-3.5">
                        {(lead.status === 'new' || lead.status === 'error') && (
                          <button
                            onClick={e => { e.stopPropagation(); enrichLead(lead) }}
                            className="text-xs px-3 py-1.5 font-bold tracking-widest uppercase transition-all"
                            style={{ color: C.textDim, border: `1px solid ${C.borderBright}`, letterSpacing: '0.1em' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.color = C.cyan; (e.target as HTMLElement).style.borderColor = C.cyan; (e.target as HTMLElement).style.background = `${C.cyan}15` }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.color = C.textDim; (e.target as HTMLElement).style.borderColor = C.borderBright; (e.target as HTMLElement).style.background = 'transparent' }}
                          >
                            {lead.status === 'error' ? 'RETRY' : 'ANALYZE'}
                          </button>
                        )}
                        {lead.status === 'enriched' && (
                          <button
                            onClick={e => { e.stopPropagation(); setSelected(lead) }}
                            className="text-xs px-3 py-1.5 font-bold tracking-widest uppercase transition-all"
                            style={{ color: C.green, border: `1px solid ${C.green}66`, background: `${C.green}12`, letterSpacing: '0.1em' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.background = `${C.green}25`; (e.target as HTMLElement).style.boxShadow = `0 0 12px ${C.green}33` }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.background = `${C.green}12`; (e.target as HTMLElement).style.boxShadow = 'none' }}
                          >
                            VIEW_DOSSIER
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Intelligence side panel */}
      {selected && currentLead && (
        <div
          className="fixed right-0 top-0 bottom-0 flex flex-col overflow-hidden z-20"
          style={{
            width: 500,
            background: C.bgCard,
            borderLeft: `1px solid ${C.borderBright}`,
            boxShadow: `-8px 0 40px ${C.cyan}18`,
          }}
        >
          {/* Panel header */}
          <div
            className="px-5 py-3 flex items-center justify-between shrink-0"
            style={{ borderBottom: `1px solid ${C.borderBright}`, background: `${C.bg}cc` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <HexAvatar name={selected.name} />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: C.cyan }}>{selected.name}</div>
                <div className="text-xs tracking-widest uppercase" style={{ color: C.textDim }}>{selected.company}</div>
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="transition-colors shrink-0 ml-3 font-mono text-xs tracking-wider"
              style={{ color: C.textDim }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = C.red }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = C.textDim }}
            >
              [CLOSE]
            </button>
          </div>

          {/* Intel classification bar */}
          <div
            className="px-5 py-2 flex items-center justify-between"
            style={{ background: `${C.cyan}10`, borderBottom: `1px solid ${C.border}` }}
          >
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.cyan }}>INTELLIGENCE DOSSIER</span>
            <span className="text-xs" style={{ color: C.textDim }}>REF: {selected.id.slice(0, 12).toUpperCase()}</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Inquiry block */}
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <SectionLabel>SIGINT // STATED PURPOSE</SectionLabel>
              <p className="text-sm leading-relaxed" style={{ color: C.textFull }}>{selected.reason}</p>
              <div className="flex gap-4 mt-3 text-xs" style={{ color: C.textDim }}>
                <span>{selected.email}</span>
                <span>{selected.phone}</span>
              </div>
            </div>

            {/* States */}
            {currentLead.status === 'new' && (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-5">
                <CornerFrame className="px-8 py-6 flex flex-col items-center gap-4">
                  <div className="text-xs tracking-widest uppercase" style={{ color: C.textDim }}>NO INTELLIGENCE ON FILE</div>
                  <button
                    onClick={() => enrichLead(selected)}
                    className="text-sm px-6 py-2.5 font-bold tracking-widest uppercase transition-all"
                    style={{ color: C.cyan, border: `1px solid ${C.cyan}`, background: `${C.cyan}18`, letterSpacing: '0.14em' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = `${C.cyan}30`; (e.target as HTMLElement).style.boxShadow = `0 0 20px ${C.cyan}44` }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = `${C.cyan}18`; (e.target as HTMLElement).style.boxShadow = 'none' }}
                  >
                    INITIATE_SCAN
                  </button>
                </CornerFrame>
              </div>
            )}

            {currentLead.status === 'enriching' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="relative">
                  <svg viewBox="0 0 60 60" width="60" height="60" className="animate-spin" style={{ animationDuration: '3s' }}>
                    <polygon points="30,3 55,17 55,43 30,57 5,43 5,17" fill="none" stroke={C.cyan} strokeWidth="1" strokeDasharray="4 4" />
                  </svg>
                  <svg viewBox="0 0 60 60" width="60" height="60" className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
                    <polygon points="30,10 48,20 48,40 30,50 12,40 12,20" fill="none" stroke={`${C.cyan}66`} strokeWidth="0.8" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold" style={{ color: C.cyan }}>AI</div>
                </div>
                <div className="text-xs tracking-widest uppercase" style={{ color: C.textMid }}>SCANNING SUBJECT...</div>
                <div className="text-xs" style={{ color: C.textDim }}>{selected.name} // {selected.company}</div>
              </div>
            )}

            {currentLead.status === 'error' && (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-5">
                <div className="text-xs tracking-widest uppercase" style={{ color: C.red }}>CONNECTION FAILED // RETRY REQUIRED</div>
                <button
                  onClick={() => enrichLead(selected)}
                  className="text-sm px-5 py-2 font-bold tracking-widest uppercase"
                  style={{ color: C.red, border: `1px solid ${C.red}`, background: `${C.red}15`, letterSpacing: '0.12em' }}
                >
                  RETRY_SCAN
                </button>
              </div>
            )}

            {currentLead.status === 'enriched' && selectedData && (
              <div>
                {/* Lead score */}
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel>THREAT ASSESSMENT</SectionLabel>
                    <ThreatBadge urgency={selectedData.intelligence.urgency} />
                  </div>
                  <div className="mb-2">
                    <div className="text-xs mb-2 tracking-wider" style={{ color: C.textDim }}>ACQUISITION_PROBABILITY</div>
                    <SegmentScore score={selectedData.intelligence.lead_score} />
                  </div>
                  <p className="text-xs mt-3 leading-relaxed" style={{ color: C.textMid }}>{selectedData.intelligence.lead_score_reason}</p>
                </div>

                {/* Recommended angle */}
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <SectionLabel>RECOMMENDED VECTOR</SectionLabel>
                  <p className="text-sm leading-relaxed" style={{ color: C.textFull }}>{selectedData.intelligence.recommended_angle}</p>
                </div>

                {/* Talking points */}
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <SectionLabel>ENGAGEMENT DIRECTIVES</SectionLabel>
                  <ul className="space-y-2.5">
                    {selectedData.intelligence.talking_points.map((pt, i) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="text-xs font-bold mt-0.5 shrink-0" style={{ color: C.cyan }}>{'>'}</span>
                        <span className="leading-relaxed text-xs" style={{ color: C.textFull }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Person */}
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <SectionLabel>SUBJECT PROFILE // {selected.name.toUpperCase()}</SectionLabel>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: C.textFull }}>{selectedData.person.bio}</p>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: C.textMid }}>{selectedData.person.background}</p>
                  {selectedData.person.social_presence && (
                    <div className="mt-2 pl-3" style={{ borderLeft: `2px solid ${C.cyan}44` }}>
                      <div className="text-xs" style={{ color: C.textDim }}>SIGINT // SOCIAL</div>
                      <p className="text-xs leading-relaxed mt-1" style={{ color: C.textMid }}>{selectedData.person.social_presence}</p>
                    </div>
                  )}
                </div>

                {/* Company */}
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <SectionLabel>ORG PROFILE // {selected.company.toUpperCase()}</SectionLabel>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: C.textFull }}>{selectedData.company.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[
                      { label: 'BRAND_VOICE', val: selectedData.company.brand_voice },
                      { label: 'TARGET_DEMO', val: selectedData.company.target_audience },
                    ].map(f => (
                      <div key={f.label}>
                        <div className="text-xs mb-1 tracking-wider" style={{ color: C.textDim }}>{f.label}</div>
                        <p className="text-xs" style={{ color: C.textMid }}>{f.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div className="text-xs mb-1 tracking-wider" style={{ color: C.textDim }}>MARKETING_FOCUS</div>
                    <p className="text-xs leading-relaxed" style={{ color: C.textMid }}>{selectedData.company.marketing_focus}</p>
                  </div>

                  {selectedData.company.channels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {selectedData.company.channels.map(ch => (
                        <span
                          key={ch}
                          className="text-xs px-2 py-0.5 font-bold tracking-wider uppercase"
                          style={{ color: C.cyan, border: `1px solid ${C.cyan}44`, background: `${C.cyan}12` }}
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  )}

                  {selectedData.company.recent_campaigns.length > 0 && (
                    <div>
                      <div className="text-xs mb-2 tracking-wider" style={{ color: C.textDim }}>RECENT_OPS</div>
                      <ul className="space-y-2">
                        {selectedData.company.recent_campaigns.map((c, i) => (
                          <li
                            key={i}
                            className="text-xs leading-relaxed pl-3"
                            style={{ color: C.textMid, borderLeft: `1px solid ${C.borderBright}` }}
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div className="px-5 py-4">
                  <SectionLabel>BUDGET ESTIMATE</SectionLabel>
                  <p className="text-sm" style={{ color: C.gold }}>{selectedData.intelligence.estimated_budget}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
