'use client'

import { useState, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type LeadStatus = 'new' | 'enriching' | 'enriched' | 'error'
type Theme = 'cyber' | 'clean'

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

type EnrichedData = {
  person: { title: string; bio: string; background: string; social_presence: string }
  company: {
    description: string
    marketing_focus: string
    recent_campaigns: string[]
    channels: string[]
    brand_voice: string
    target_audience: string
  }
  intelligence: {
    lead_score: number
    lead_score_reason: string
    recommended_angle: string
    talking_points: string[]
    estimated_budget: string
    urgency: string
  }
}

type DashProps = {
  leads: Lead[]
  enriched: Record<string, EnrichedData>
  selected: Lead | null
  dragging: boolean
  stats: { total: number; enriched: number; pending: number }
  fileRef: React.RefObject<HTMLInputElement>
  onSelect: (lead: Lead | null) => void
  onEnrich: (lead: Lead) => void
  onEnrichAll: () => void
  onFile: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onToggle: () => void
  theme: Theme
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CYBERPUNK THEME
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  cyan: '#00d4ff', green: '#00ff87', orange: '#ff6200',
  red: '#ff003c', gold: '#ffd700', bg: '#020409',
  bgCard: '#060e1a', bgRow: '#0a1628', border: '#0d2d47',
  borderBright: '#1a4d72', textDim: '#2a5f7a', textMid: '#4a9ab5', textFull: '#c8eeff',
}

function SegmentScore({ score }: { score: number }) {
  const color = score >= 8 ? C.green : score >= 5 ? C.orange : C.red
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} style={{ width: 16, height: 10, background: i < score ? color : C.border, boxShadow: i < score ? `0 0 6px ${color}88` : 'none', transition: 'all 0.4s ease' }} />
        ))}
      </div>
      <span className="font-mono text-xs font-bold" style={{ color }}>{score}/10</span>
    </div>
  )
}

function ThreatBadge({ urgency }: { urgency: string }) {
  const lower = urgency.toLowerCase()
  const isHigh = lower.startsWith('high'), isMed = lower.startsWith('med')
  const color = isHigh ? C.red : isMed ? C.orange : C.textMid
  return (
    <span className="font-mono text-xs font-bold px-2 py-0.5 border" style={{ color, borderColor: color, background: `${color}18`, letterSpacing: '0.1em' }}>
      {isHigh ? 'THREAT: HIGH' : isMed ? 'THREAT: MED' : 'THREAT: LOW'}
    </span>
  )
}

function CyberStatusTag({ status }: { status: LeadStatus }) {
  const map: Record<LeadStatus, { label: string; color: string }> = {
    new: { label: 'UNPROCESSED', color: C.textMid },
    enriching: { label: 'SCANNING...', color: C.cyan },
    enriched: { label: 'INTEL_ACQ', color: C.green },
    error: { label: 'SYS_ERR', color: C.red },
  }
  const { label, color } = map[status]
  return (
    <span className="font-mono text-xs font-bold px-2 py-0.5 border" style={{ color, borderColor: `${color}66`, background: `${color}12`, letterSpacing: '0.08em', animation: status === 'enriching' ? 'pulse 1.2s ease-in-out infinite' : 'none' }}>
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

function CyberSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div style={{ width: 8, height: 8, background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
      <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: C.cyan }}>{children}</span>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(to right, ${C.borderBright}, transparent)` }} />
    </div>
  )
}

function CyberCornerFrame({ children, glow }: { children: React.ReactNode; glow?: boolean }) {
  const bc = glow ? C.cyan : C.borderBright
  return (
    <div className="relative px-10 py-8 flex flex-col items-center gap-4">
      <div className="absolute top-0 left-0" style={{ width: 10, height: 10, borderTop: `1px solid ${bc}`, borderLeft: `1px solid ${bc}` }} />
      <div className="absolute top-0 right-0" style={{ width: 10, height: 10, borderTop: `1px solid ${bc}`, borderRight: `1px solid ${bc}` }} />
      <div className="absolute bottom-0 left-0" style={{ width: 10, height: 10, borderBottom: `1px solid ${bc}`, borderLeft: `1px solid ${bc}` }} />
      <div className="absolute bottom-0 right-0" style={{ width: 10, height: 10, borderBottom: `1px solid ${bc}`, borderRight: `1px solid ${bc}` }} />
      {children}
    </div>
  )
}

function CyberDashboard(p: DashProps) {
  const currentLead = p.selected ? p.leads.find(l => l.id === p.selected!.id) ?? p.selected : null
  const selectedData = p.selected ? p.enriched[p.selected.id] : null

  return (
    <div className="flex h-screen overflow-hidden font-mono" style={{ background: C.bg, color: C.textFull }}>
      {/* Scanlines */}
      <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,212,255,0.012) 3px, rgba(0,212,255,0.012) 4px)', zIndex: 9999 }} />
      {/* Dot grid */}
      <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, backgroundImage: 'radial-gradient(circle, #0d2d4788 1px, transparent 1px)', backgroundSize: '28px 28px', zIndex: 0 }} />

      <div className="flex flex-col flex-1 min-w-0 relative z-10 transition-all duration-300" style={{ marginRight: p.selected ? 500 : 0 }}>
        {/* Header */}
        <div className="px-6 py-3 flex items-center justify-between gap-4 shrink-0" style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bgCard}cc` }}>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 20 20" width="20" height="20">
              <polygon points="10,1 19,6 19,14 10,19 1,14 1,6" fill="none" stroke={C.cyan} strokeWidth="1.2" />
              <polygon points="10,5 15,8 15,12 10,15 5,12 5,8" fill={`${C.cyan}30`} stroke={C.cyan} strokeWidth="0.6" />
            </svg>
            <div>
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: C.cyan }}>LEAD INTELLIGENCE SYS</div>
              <div className="text-xs" style={{ color: C.textDim }}>// CLEARANCE: INTERNAL // v2.1.0</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button onClick={p.onToggle} className="font-mono text-xs px-3 py-1.5 font-bold tracking-widest uppercase transition-all" style={{ color: C.textDim, border: `1px solid ${C.borderBright}` }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = C.cyan; (e.target as HTMLElement).style.borderColor = C.cyan }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = C.textDim; (e.target as HTMLElement).style.borderColor = C.borderBright }}>
              CLEAN_UI
            </button>
            {p.leads.length > 0 && p.stats.pending > 0 && (
              <button onClick={p.onEnrichAll} className="text-xs px-4 py-2 font-bold tracking-widest uppercase transition-all" style={{ color: C.cyan, border: `1px solid ${C.cyan}`, background: `${C.cyan}15`, letterSpacing: '0.12em' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = `${C.cyan}30`; (e.target as HTMLElement).style.boxShadow = `0 0 16px ${C.cyan}44` }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = `${C.cyan}15`; (e.target as HTMLElement).style.boxShadow = 'none' }}>
                RUN_ALL ({p.stats.pending})
              </button>
            )}
            <button onClick={() => p.fileRef.current?.click()} className="text-xs px-4 py-2 font-bold tracking-widest uppercase transition-all" style={{ color: C.textMid, border: `1px solid ${C.borderBright}`, background: C.bgCard, letterSpacing: '0.12em' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = C.cyan; (e.target as HTMLElement).style.color = C.cyan }}
              onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = C.borderBright; (e.target as HTMLElement).style.color = C.textMid }}>
              {p.leads.length ? 'LOAD_CSV' : 'IMPORT_CSV'}
            </button>
            <input ref={p.fileRef} type="file" accept=".csv" className="hidden" onChange={p.onFile} />
          </div>
        </div>

        {/* Stats */}
        {p.leads.length > 0 && (
          <div className="grid grid-cols-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
            {[{ label: 'SUBJECTS_LOADED', value: p.stats.total, color: C.textMid }, { label: 'PROFILES_COMPILED', value: p.stats.enriched, color: C.green }, { label: 'PENDING_ANALYSIS', value: p.stats.pending, color: C.orange }].map((s, i) => (
              <div key={s.label} className="px-6 py-4" style={{ borderRight: i < 2 ? `1px solid ${C.border}` : 'none', background: `${C.bgCard}88` }}>
                <div className="text-3xl font-bold tabular-nums" style={{ color: s.color, textShadow: `0 0 20px ${s.color}66` }}>{s.value}</div>
                <div className="text-xs mt-1 tracking-widest" style={{ color: C.textDim }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {p.leads.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6" onDragOver={p.onDragOver} onDragLeave={p.onDragLeave} onDrop={p.onDrop}>
            <CyberCornerFrame glow={p.dragging}>
              <svg viewBox="0 0 48 48" width="48" height="48">
                <polygon points="24,3 43,13.5 43,34.5 24,45 5,34.5 5,13.5" fill="none" stroke={p.dragging ? C.cyan : C.borderBright} strokeWidth="1.2" />
                <path d="M24 16v10M24 26l-5-5M24 26l5-5" stroke={p.dragging ? C.cyan : C.textDim} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="text-sm font-bold tracking-widest uppercase" style={{ color: p.dragging ? C.cyan : C.textMid }}>{p.dragging ? 'RELEASE TO UPLOAD' : 'AWAITING DATA UPLOAD'}</div>
              <div className="text-xs text-center" style={{ color: C.textDim }}>FIELDS: name, email, phone, company, role, reason</div>
            </CyberCornerFrame>
            <a href="/leads-sample.csv" download className="text-xs tracking-widest uppercase transition-colors" style={{ color: C.textDim }} onMouseEnter={e => { (e.target as HTMLElement).style.color = C.cyan }} onMouseLeave={e => { (e.target as HTMLElement).style.color = C.textDim }}>
              [DOWNLOAD SAMPLE DATASET]
            </a>
          </div>
        )}

        {/* Table */}
        {p.leads.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10" style={{ background: C.bgCard, borderBottom: `1px solid ${C.border}` }}>
                <tr>
                  {['SUBJECT', 'ORGANIZATION', 'DESIGNATION', 'STATED PURPOSE', 'STATUS', 'OPS'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-bold tracking-widest" style={{ color: C.textDim, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.leads.map((lead, idx) => {
                  const isSel = p.selected?.id === lead.id
                  return (
                    <tr key={lead.id} onClick={() => p.onSelect(isSel ? null : lead)} className="cursor-pointer transition-all"
                      style={{ background: isSel ? `${C.cyan}0e` : idx % 2 === 0 ? 'transparent' : `${C.bgCard}44`, borderBottom: `1px solid ${C.border}`, borderLeft: isSel ? `2px solid ${C.cyan}` : '2px solid transparent' }}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = C.bgRow }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = idx % 2 === 0 ? 'transparent' : `${C.bgCard}44` }}>
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
                      <td className="px-5 py-3.5 max-w-[240px]"><p className="text-xs truncate" style={{ color: C.textDim }}>{lead.reason}</p></td>
                      <td className="px-5 py-3.5"><CyberStatusTag status={lead.status} /></td>
                      <td className="px-5 py-3.5">
                        {(lead.status === 'new' || lead.status === 'error') && (
                          <button onClick={e => { e.stopPropagation(); p.onEnrich(lead) }} className="text-xs px-3 py-1.5 font-bold tracking-widest uppercase transition-all"
                            style={{ color: C.textDim, border: `1px solid ${C.borderBright}`, letterSpacing: '0.1em' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.color = C.cyan; (e.target as HTMLElement).style.borderColor = C.cyan; (e.target as HTMLElement).style.background = `${C.cyan}15` }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.color = C.textDim; (e.target as HTMLElement).style.borderColor = C.borderBright; (e.target as HTMLElement).style.background = 'transparent' }}>
                            {lead.status === 'error' ? 'RETRY' : 'ANALYZE'}
                          </button>
                        )}
                        {lead.status === 'enriched' && (
                          <button onClick={e => { e.stopPropagation(); p.onSelect(lead) }} className="text-xs px-3 py-1.5 font-bold tracking-widest uppercase transition-all"
                            style={{ color: C.green, border: `1px solid ${C.green}66`, background: `${C.green}12`, letterSpacing: '0.1em' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.background = `${C.green}25`; (e.target as HTMLElement).style.boxShadow = `0 0 12px ${C.green}33` }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.background = `${C.green}12`; (e.target as HTMLElement).style.boxShadow = 'none' }}>
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

      {/* Side panel */}
      {p.selected && currentLead && (
        <div className="fixed right-0 top-0 bottom-0 flex flex-col overflow-hidden z-20" style={{ width: 500, background: C.bgCard, borderLeft: `1px solid ${C.borderBright}`, boxShadow: `-8px 0 40px ${C.cyan}18` }}>
          <div className="px-5 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${C.borderBright}`, background: `${C.bg}cc` }}>
            <div className="flex items-center gap-3 min-w-0">
              <HexAvatar name={p.selected.name} />
              <div className="min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: C.cyan }}>{p.selected.name}</div>
                <div className="text-xs tracking-widest uppercase" style={{ color: C.textDim }}>{p.selected.company}</div>
              </div>
            </div>
            <button onClick={() => p.onSelect(null)} className="font-mono text-xs tracking-wider transition-colors" style={{ color: C.textDim }} onMouseEnter={e => { (e.target as HTMLElement).style.color = C.red }} onMouseLeave={e => { (e.target as HTMLElement).style.color = C.textDim }}>[CLOSE]</button>
          </div>
          <div className="px-5 py-2 flex items-center justify-between" style={{ background: `${C.cyan}10`, borderBottom: `1px solid ${C.border}` }}>
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: C.cyan }}>INTELLIGENCE DOSSIER</span>
            <span className="text-xs" style={{ color: C.textDim }}>REF: {p.selected.id.slice(0, 12).toUpperCase()}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <CyberSectionLabel>SIGINT // STATED PURPOSE</CyberSectionLabel>
              <p className="text-sm leading-relaxed" style={{ color: C.textFull }}>{p.selected.reason}</p>
              <div className="flex gap-4 mt-3 text-xs" style={{ color: C.textDim }}>
                <span>{p.selected.email}</span><span>{p.selected.phone}</span>
              </div>
            </div>
            {currentLead.status === 'new' && (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-5">
                <CyberCornerFrame>
                  <div className="text-xs tracking-widest uppercase" style={{ color: C.textDim }}>NO INTELLIGENCE ON FILE</div>
                  <button onClick={() => p.onEnrich(p.selected!)} className="text-sm px-6 py-2.5 font-bold tracking-widest uppercase transition-all" style={{ color: C.cyan, border: `1px solid ${C.cyan}`, background: `${C.cyan}18`, letterSpacing: '0.14em' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = `${C.cyan}30`; (e.target as HTMLElement).style.boxShadow = `0 0 20px ${C.cyan}44` }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = `${C.cyan}18`; (e.target as HTMLElement).style.boxShadow = 'none' }}>
                    INITIATE_SCAN
                  </button>
                </CyberCornerFrame>
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
              </div>
            )}
            {currentLead.status === 'error' && (
              <div className="flex flex-col items-center justify-center py-16 px-5 text-center gap-5">
                <div className="text-xs tracking-widest uppercase" style={{ color: C.red }}>CONNECTION FAILED</div>
                <button onClick={() => p.onEnrich(p.selected!)} className="text-sm px-5 py-2 font-bold tracking-widest uppercase" style={{ color: C.red, border: `1px solid ${C.red}`, background: `${C.red}15`, letterSpacing: '0.12em' }}>RETRY_SCAN</button>
              </div>
            )}
            {currentLead.status === 'enriched' && selectedData && (
              <div>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <CyberSectionLabel>THREAT ASSESSMENT</CyberSectionLabel>
                    <ThreatBadge urgency={selectedData.intelligence.urgency} />
                  </div>
                  <div className="text-xs mb-2 tracking-wider" style={{ color: C.textDim }}>ACQUISITION_PROBABILITY</div>
                  <SegmentScore score={selectedData.intelligence.lead_score} />
                  <p className="text-xs mt-3 leading-relaxed" style={{ color: C.textMid }}>{selectedData.intelligence.lead_score_reason}</p>
                </div>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <CyberSectionLabel>RECOMMENDED VECTOR</CyberSectionLabel>
                  <p className="text-sm leading-relaxed" style={{ color: C.textFull }}>{selectedData.intelligence.recommended_angle}</p>
                </div>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <CyberSectionLabel>ENGAGEMENT DIRECTIVES</CyberSectionLabel>
                  <ul className="space-y-2.5">
                    {selectedData.intelligence.talking_points.map((pt, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="text-xs font-bold mt-0.5 shrink-0" style={{ color: C.cyan }}>{'>'}</span>
                        <span className="text-xs leading-relaxed" style={{ color: C.textFull }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <CyberSectionLabel>SUBJECT PROFILE</CyberSectionLabel>
                  <p className="text-xs leading-relaxed mb-2" style={{ color: C.textFull }}>{selectedData.person.bio}</p>
                  <p className="text-xs leading-relaxed" style={{ color: C.textMid }}>{selectedData.person.background}</p>
                  {selectedData.person.social_presence && (
                    <div className="mt-3 pl-3" style={{ borderLeft: `2px solid ${C.cyan}44` }}>
                      <div className="text-xs" style={{ color: C.textDim }}>SIGINT // SOCIAL</div>
                      <p className="text-xs leading-relaxed mt-1" style={{ color: C.textMid }}>{selectedData.person.social_presence}</p>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <CyberSectionLabel>ORG PROFILE // {p.selected.company.toUpperCase()}</CyberSectionLabel>
                  <p className="text-xs leading-relaxed mb-4" style={{ color: C.textFull }}>{selectedData.company.description}</p>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {[{ label: 'BRAND_VOICE', val: selectedData.company.brand_voice }, { label: 'TARGET_DEMO', val: selectedData.company.target_audience }].map(f => (
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
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {selectedData.company.channels.map(ch => (
                      <span key={ch} className="text-xs px-2 py-0.5 font-bold tracking-wider uppercase" style={{ color: C.cyan, border: `1px solid ${C.cyan}44`, background: `${C.cyan}12` }}>{ch}</span>
                    ))}
                  </div>
                  {selectedData.company.recent_campaigns.length > 0 && (
                    <div>
                      <div className="text-xs mb-2 tracking-wider" style={{ color: C.textDim }}>RECENT_OPS</div>
                      <ul className="space-y-2">
                        {selectedData.company.recent_campaigns.map((c, i) => (
                          <li key={i} className="text-xs leading-relaxed pl-3" style={{ color: C.textMid, borderLeft: `1px solid ${C.borderBright}` }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="px-5 py-4">
                  <CyberSectionLabel>BUDGET ESTIMATE</CyberSectionLabel>
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

// ─────────────────────────────────────────────────────────────────────────────
// CLEAN APPLE THEME
// ─────────────────────────────────────────────────────────────────────────────

function CleanAvatar({ name }: { name: string }) {
  const parts = name.trim().split(' ')
  const letters = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  const hue = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) || 0) * 13) % 360
  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0" style={{ background: `hsl(${hue}, 60%, 50%)` }}>
      {letters.toUpperCase()}
    </div>
  )
}

function CleanScore({ score }: { score: number }) {
  const pct = (score / 10) * 100
  const color = score >= 8 ? '#34c759' : score >= 5 ? '#ff9f0a' : '#ff3b30'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 rounded-full h-2 bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color }}>{score}/10</span>
    </div>
  )
}

function CleanStatus({ status }: { status: LeadStatus }) {
  const map: Record<LeadStatus, { label: string; dot: string; text: string }> = {
    new: { label: 'New', dot: '#007AFF', text: '#007AFF' },
    enriching: { label: 'Researching', dot: '#ff9f0a', text: '#ff9f0a' },
    enriched: { label: 'Complete', dot: '#34c759', text: '#34c759' },
    error: { label: 'Failed', dot: '#ff3b30', text: '#ff3b30' },
  }
  const { label, dot, text } = map[status]
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: dot, animation: status === 'enriching' ? 'pulse 1.2s ease-in-out infinite' : 'none' }} />
      <span className="text-sm font-medium" style={{ color: text }}>{label}</span>
    </div>
  )
}

function CleanUrgency({ urgency }: { urgency: string }) {
  const lower = urgency.toLowerCase()
  const isHigh = lower.startsWith('high'), isMed = lower.startsWith('med')
  const map = {
    bg: isHigh ? '#fff1f0' : isMed ? '#fff7e6' : '#f0f9ff',
    text: isHigh ? '#ff3b30' : isMed ? '#ff9f0a' : '#007AFF',
    label: isHigh ? 'High Urgency' : isMed ? 'Medium Urgency' : 'Low Urgency',
  }
  return (
    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: map.bg, color: map.text }}>{map.label}</span>
  )
}

function CleanDashboard(p: DashProps) {
  const currentLead = p.selected ? p.leads.find(l => l.id === p.selected!.id) ?? p.selected : null
  const selectedData = p.selected ? p.enriched[p.selected.id] : null

  return (
    <div className="flex h-screen overflow-hidden bg-white" style={{ color: '#1d1d1f', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif' }}>

      <div className="flex flex-col flex-1 min-w-0 transition-all duration-300" style={{ marginRight: p.selected ? 520 : 0 }}>
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between gap-4 shrink-0 bg-white" style={{ borderBottom: '1px solid #e5e5ea' }}>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1d1d1f' }}>Lead Intelligence</h1>
            <p className="text-base mt-0.5" style={{ color: '#8e8e93' }}>Upload a CSV to research inbound leads</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button onClick={p.onToggle} className="text-sm font-medium px-4 py-2 rounded-full transition-all" style={{ color: '#1d1d1f', background: '#f2f2f7', border: 'none' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#e5e5ea' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#f2f2f7' }}>
              Cyber UI
            </button>
            {p.leads.length > 0 && p.stats.pending > 0 && (
              <button onClick={p.onEnrichAll} className="text-sm font-semibold px-5 py-2 rounded-full text-white transition-all" style={{ background: '#007AFF' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#0071e3' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = '#007AFF' }}>
                Research All ({p.stats.pending})
              </button>
            )}
            <button onClick={() => p.fileRef.current?.click()} className="text-sm font-semibold px-5 py-2 rounded-full transition-all" style={{ color: '#007AFF', background: '#f0f7ff', border: 'none' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#dff0ff' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#f0f7ff' }}>
              {p.leads.length ? 'Load New CSV' : 'Import CSV'}
            </button>
            <input ref={p.fileRef} type="file" accept=".csv" className="hidden" onChange={p.onFile} />
          </div>
        </div>

        {/* Stats */}
        {p.leads.length > 0 && (
          <div className="grid grid-cols-3 shrink-0 bg-white" style={{ borderBottom: '1px solid #e5e5ea' }}>
            {[
              { label: 'Total Leads', value: p.stats.total, color: '#1d1d1f' },
              { label: 'Researched', value: p.stats.enriched, color: '#34c759' },
              { label: 'Pending', value: p.stats.pending, color: '#ff9f0a' },
            ].map((s, i) => (
              <div key={s.label} className="px-8 py-5" style={{ borderRight: i < 2 ? '1px solid #e5e5ea' : 'none' }}>
                <div className="text-4xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
                <div className="text-base mt-1" style={{ color: '#8e8e93' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {p.leads.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-5" onDragOver={p.onDragOver} onDragLeave={p.onDragLeave} onDrop={p.onDrop}>
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center transition-all" style={{ background: p.dragging ? '#f0f7ff' : '#f5f5f7', border: `2px dashed ${p.dragging ? '#007AFF' : '#c7c7cc'}` }}>
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke={p.dragging ? '#007AFF' : '#8e8e93'}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold" style={{ color: '#1d1d1f' }}>{p.dragging ? 'Drop to import' : 'Drop a CSV file here'}</p>
              <p className="text-base mt-1" style={{ color: '#8e8e93' }}>or click Import CSV above</p>
              <p className="text-sm mt-1" style={{ color: '#c7c7cc' }}>Columns: name, email, phone, company, role, reason</p>
            </div>
            <a href="/leads-sample.csv" download className="text-base font-medium transition-colors" style={{ color: '#007AFF' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#0071e3' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#007AFF' }}>
              Download sample CSV
            </a>
          </div>
        )}

        {/* Table */}
        {p.leads.length > 0 && (
          <div className="flex-1 overflow-y-auto bg-white">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-white" style={{ borderBottom: '1px solid #e5e5ea' }}>
                <tr>
                  {['Lead', 'Company', 'Role', 'Reason', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-8 py-4 text-sm font-semibold" style={{ color: '#8e8e93' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.leads.map(lead => {
                  const isSel = p.selected?.id === lead.id
                  return (
                    <tr key={lead.id} onClick={() => p.onSelect(isSel ? null : lead)} className="cursor-pointer transition-colors"
                      style={{ background: isSel ? '#f0f7ff' : 'white', borderBottom: '1px solid #f2f2f7' }}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '#f9f9fb' }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'white' }}>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <CleanAvatar name={lead.name} />
                          <div>
                            <div className="text-lg font-semibold" style={{ color: '#1d1d1f' }}>{lead.name}</div>
                            <div className="text-sm" style={{ color: '#8e8e93' }}>{lead.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-lg font-medium" style={{ color: '#1d1d1f' }}>{lead.company}</td>
                      <td className="px-8 py-4 text-base" style={{ color: '#8e8e93' }}>{lead.role}</td>
                      <td className="px-8 py-4 max-w-[260px]"><p className="text-base truncate" style={{ color: '#8e8e93' }}>{lead.reason}</p></td>
                      <td className="px-8 py-4"><CleanStatus status={lead.status} /></td>
                      <td className="px-8 py-4">
                        {(lead.status === 'new' || lead.status === 'error') && (
                          <button onClick={e => { e.stopPropagation(); p.onEnrich(lead) }} className="text-base font-semibold transition-colors" style={{ color: '#007AFF' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#0071e3' }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#007AFF' }}>
                            {lead.status === 'error' ? 'Retry' : 'Research'}
                          </button>
                        )}
                        {lead.status === 'enriched' && (
                          <button onClick={e => { e.stopPropagation(); p.onSelect(lead) }} className="text-base font-semibold transition-colors" style={{ color: '#34c759' }}
                            onMouseEnter={e => { (e.target as HTMLElement).style.color = '#2da44e' }}
                            onMouseLeave={e => { (e.target as HTMLElement).style.color = '#34c759' }}>
                            View Profile
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

      {/* Clean side panel */}
      {p.selected && currentLead && (
        <div className="fixed right-0 top-0 bottom-0 flex flex-col overflow-hidden z-20 bg-white" style={{ width: 520, borderLeft: '1px solid #e5e5ea', boxShadow: '-4px 0 24px rgba(0,0,0,0.08)' }}>
          {/* Panel header */}
          <div className="px-8 py-6 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid #f2f2f7' }}>
            <div className="flex items-center gap-4 min-w-0">
              <CleanAvatar name={p.selected.name} />
              <div className="min-w-0">
                <div className="text-xl font-bold truncate" style={{ color: '#1d1d1f' }}>{p.selected.name}</div>
                <div className="text-base" style={{ color: '#8e8e93' }}>{p.selected.role} at {p.selected.company}</div>
              </div>
            </div>
            <button onClick={() => p.onSelect(null)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: '#f2f2f7' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#e5e5ea' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f2f2f7' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#8e8e93" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Inquiry */}
            <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>Their Inquiry</p>
              <p className="text-lg leading-relaxed" style={{ color: '#1d1d1f' }}>{p.selected.reason}</p>
              <div className="flex gap-5 mt-4 text-base" style={{ color: '#8e8e93' }}>
                <span>{p.selected.email}</span>
                <span>{p.selected.phone}</span>
              </div>
            </div>

            {currentLead.status === 'new' && (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-5">
                <p className="text-xl font-medium" style={{ color: '#1d1d1f' }}>No research yet</p>
                <p className="text-base" style={{ color: '#8e8e93' }}>Click Research to pull intelligence on this lead.</p>
                <button onClick={() => p.onEnrich(p.selected!)} className="text-base font-semibold px-8 py-3 rounded-full text-white transition-all" style={{ background: '#007AFF' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = '#0071e3' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = '#007AFF' }}>
                  Research This Lead
                </button>
              </div>
            )}

            {currentLead.status === 'enriching' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin" />
                <p className="text-lg font-medium" style={{ color: '#1d1d1f' }}>Researching {p.selected.name.split(' ')[0]}...</p>
                <p className="text-base" style={{ color: '#8e8e93' }}>{p.selected.company}</p>
              </div>
            )}

            {currentLead.status === 'error' && (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-5">
                <p className="text-lg font-medium" style={{ color: '#ff3b30' }}>Research failed</p>
                <button onClick={() => p.onEnrich(p.selected!)} className="text-base font-semibold px-6 py-2.5 rounded-full" style={{ color: '#ff3b30', background: '#fff1f0' }}>Try Again</button>
              </div>
            )}

            {currentLead.status === 'enriched' && selectedData && (
              <div>
                {/* Score */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8e8e93' }}>Lead Score</p>
                    <CleanUrgency urgency={selectedData.intelligence.urgency} />
                  </div>
                  <CleanScore score={selectedData.intelligence.lead_score} />
                  <p className="text-base mt-3 leading-relaxed" style={{ color: '#6e6e73' }}>{selectedData.intelligence.lead_score_reason}</p>
                </div>

                {/* Pitch angle */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>How to Pitch</p>
                  <p className="text-lg leading-relaxed" style={{ color: '#1d1d1f' }}>{selectedData.intelligence.recommended_angle}</p>
                </div>

                {/* Talking points */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#8e8e93' }}>Talking Points</p>
                  <ul className="space-y-3">
                    {selectedData.intelligence.talking_points.map((pt, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#f0f7ff' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#007AFF' }} />
                        </div>
                        <span className="text-base leading-relaxed" style={{ color: '#1d1d1f' }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Person */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>About {p.selected.name.split(' ')[0]}</p>
                  <p className="text-base leading-relaxed mb-3" style={{ color: '#1d1d1f' }}>{selectedData.person.bio}</p>
                  <p className="text-base leading-relaxed" style={{ color: '#6e6e73' }}>{selectedData.person.background}</p>
                  {selectedData.person.social_presence && (
                    <p className="text-base mt-3 leading-relaxed" style={{ color: '#8e8e93' }}>{selectedData.person.social_presence}</p>
                  )}
                </div>

                {/* Company */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>{p.selected.company}</p>
                  <p className="text-base leading-relaxed mb-5" style={{ color: '#1d1d1f' }}>{selectedData.company.description}</p>

                  <div className="grid grid-cols-2 gap-5 mb-5">
                    {[{ label: 'Brand Voice', val: selectedData.company.brand_voice }, { label: 'Target Audience', val: selectedData.company.target_audience }].map(f => (
                      <div key={f.label}>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#8e8e93' }}>{f.label}</p>
                        <p className="text-base" style={{ color: '#1d1d1f' }}>{f.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-5">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#8e8e93' }}>Marketing Focus</p>
                    <p className="text-base leading-relaxed" style={{ color: '#1d1d1f' }}>{selectedData.company.marketing_focus}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {selectedData.company.channels.map(ch => (
                      <span key={ch} className="text-sm font-medium px-3 py-1 rounded-full" style={{ color: '#007AFF', background: '#f0f7ff' }}>{ch}</span>
                    ))}
                  </div>

                  {selectedData.company.recent_campaigns.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-3" style={{ color: '#8e8e93' }}>Recent Campaigns</p>
                      <ul className="space-y-2">
                        {selectedData.company.recent_campaigns.map((c, i) => (
                          <li key={i} className="text-base leading-relaxed pl-4" style={{ color: '#1d1d1f', borderLeft: '2px solid #e5e5ea' }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div className="px-8 py-6">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8e8e93' }}>Budget Estimate</p>
                  <p className="text-xl font-semibold" style={{ color: '#1d1d1f' }}>{selectedData.intelligence.estimated_budget}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root — shared state, two views
// ─────────────────────────────────────────────────────────────────────────────

export default function LeadsDashboard() {
  const [theme, setTheme] = useState<Theme>('cyber')
  const [leads, setLeads] = useState<Lead[]>([])
  const [enriched, setEnriched] = useState<Record<string, EnrichedData>>({})
  const [selected, setSelected] = useState<Lead | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => { setLeads(parseCSV(e.target?.result as string)); setSelected(null) }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.name.endsWith('.csv')) loadFile(file)
  }, [])

  const enrichLead = async (lead: Lead) => {
    const update = (status: LeadStatus) => {
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status } : l))
      setSelected(prev => prev?.id === lead.id ? { ...lead, status } : prev)
    }
    update('enriching')
    try {
      const res = await fetch('/api/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead }) })
      const json = await res.json()
      if (json.data) { setEnriched(prev => ({ ...prev, [lead.id]: json.data })); update('enriched') }
      else update('error')
    } catch { update('error') }
  }

  const props: DashProps = {
    leads, enriched, selected, dragging, fileRef,
    stats: {
      total: leads.length,
      enriched: leads.filter(l => l.status === 'enriched').length,
      pending: leads.filter(l => l.status === 'new').length,
    },
    onSelect: setSelected,
    onEnrich: enrichLead,
    onEnrichAll: () => leads.filter(l => l.status === 'new').forEach(enrichLead),
    onFile: e => { const f = e.target.files?.[0]; if (f) loadFile(f) },
    onDragOver: e => { e.preventDefault(); setDragging(true) },
    onDragLeave: () => setDragging(false),
    onDrop: handleDrop,
    onToggle: () => setTheme(t => t === 'cyber' ? 'clean' : 'cyber'),
    theme,
  }

  return theme === 'cyber' ? <CyberDashboard {...props} /> : <CleanDashboard {...props} />
}
