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

// ─── Quick Links ─────────────────────────────────────────────────────────────

function buildLinks(lead: Lead) {
  const cleanPhone = lead.phone.replace(/\D/g, '')
  const emailDomain = lead.email.includes('@') ? lead.email.split('@')[1] : ''
  const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'me.com', 'aol.com']
  const websiteUrl = emailDomain && !personalDomains.includes(emailDomain.toLowerCase())
    ? `https://${emailDomain}`
    : `https://www.google.com/search?q=${encodeURIComponent(lead.company + ' official website')}`
  const q = encodeURIComponent(lead.company)
  const qPerson = encodeURIComponent(lead.name + ' ' + lead.company)

  return [
    {
      label: 'TruePeopleSearch',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5 5a5 5 0 0 0-10 0h10z"/>
        </svg>
      ),
      url: cleanPhone ? `https://www.truepeoplesearch.com/results?phoneno=${cleanPhone}` : null,
    },
    {
      label: 'LinkedIn',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
        </svg>
      ),
      url: `https://www.linkedin.com/search/results/people/?keywords=${qPerson}`,
    },
    {
      label: 'Instagram',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
        </svg>
      ),
      url: `https://www.instagram.com/${encodeURIComponent(lead.company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9._]/g, ''))}/`,
    },
    {
      label: 'TikTok',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0z"/>
        </svg>
      ),
      url: `https://www.tiktok.com/search?q=${q}`,
    },
    {
      label: 'Facebook',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
        </svg>
      ),
      url: `https://www.facebook.com/search/top?q=${q}`,
    },
    {
      label: 'Reddit',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M6.167 8a.831.831 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661zm1.843 3.647c.315 0 1.403-.038 1.976-.611a.232.232 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83.458 0 .83-.381.83-.83a.831.831 0 0 0-1.66 0z"/>
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.828-1.165c-.315 0-.602.124-.812.325-.801-.573-1.9-.945-3.121-.993l.534-2.501 1.738.372a.83.83 0 1 0 .83-.869.83.83 0 0 0-.744.468l-1.938-.41a.203.203 0 0 0-.153.028.186.186 0 0 0-.086.134l-.592 2.788c-1.24.038-2.358.41-3.17.992-.21-.2-.496-.324-.81-.324a1.163 1.163 0 0 0-.478 2.224c-.02.115-.029.23-.029.353 0 1.795 2.091 3.256 4.669 3.256 2.577 0 4.668-1.451 4.668-3.256 0-.114-.01-.238-.029-.353.401-.181.688-.592.688-1.069 0-.65-.525-1.165-1.165-1.165z"/>
        </svg>
      ),
      url: `https://www.reddit.com/search/?q=${q}`,
    },
    {
      label: 'Website',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855.173-.324.33-.682.468-1.068H8.5zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.49a13.65 13.65 0 0 1-.312 2.5zm2.802-3.5a6.959 6.959 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5h2.49zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7.024 7.024 0 0 0-3.072-2.472c.218.284.418.598.597.933zM10.855 4a7.966 7.966 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4h2.355z"/>
        </svg>
      ),
      url: websiteUrl,
    },
    {
      label: 'FB Ads Library',
      icon: (
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
          <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
        </svg>
      ),
      url: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&q=${q}&search_type=keyword_unordered`,
    },
  ]
}

function CyberQuickLinks({ lead }: { lead: Lead }) {
  const links = buildLinks(lead)
  return (
    <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: `1px solid ${C.border}`, background: `${C.bg}88` }}>
      <span className="text-xs font-mono tracking-widest uppercase mr-1" style={{ color: C.textDim }}>LINKS</span>
      {links.map(link => (
        link.url ? (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 transition-all"
            style={{ color: C.textMid, border: `1px solid ${C.borderBright}`, background: 'transparent', letterSpacing: '0.06em' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.cyan; (e.currentTarget as HTMLElement).style.borderColor = C.cyan; (e.currentTarget as HTMLElement).style.background = `${C.cyan}12`; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 8px ${C.cyan}33` }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.textMid; (e.currentTarget as HTMLElement).style.borderColor = C.borderBright; (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
          >
            {link.icon}
            {link.label}
          </a>
        ) : (
          <span key={link.label} className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1" style={{ color: C.textDim, border: `1px solid ${C.border}`, opacity: 0.4 }} title="No phone number available">
            {link.icon}
            {link.label}
          </span>
        )
      ))}
    </div>
  )
}

function CleanQuickLinks({ lead }: { lead: Lead }) {
  const links = buildLinks(lead)
  return (
    <div className="px-8 py-4 flex items-center gap-2 flex-wrap" style={{ borderBottom: '1px solid #f2f2f7', background: '#fafafa' }}>
      {links.map(link => (
        link.url ? (
          <a
            key={link.label}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full transition-all"
            style={{ color: '#007AFF', background: '#f0f7ff' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#dff0ff' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#f0f7ff' }}
          >
            {link.icon}
            {link.label}
          </a>
        ) : (
          <span key={link.label} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full" style={{ color: '#c7c7cc', background: '#f5f5f7' }} title="No phone number available">
            {link.icon}
            {link.label}
          </span>
        )
      ))}
    </div>
  )
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
      name: row.name || row['full name'] || row['full_name'] || '',
      email: row.email || row['work email'] || row['work_email'] || row['email address'] || '',
      phone: row.phone || row['phone number'] || row['phone_number'] || row['mobile'] || '',
      company: row.company || row['company name'] || row['company_name'] || row['organization'] || '',
      role: row.role || row.title || row.position || row['job title'] || row['job_title'] || '',
      reason: row.reason || row.message || row.inquiry || row.notes || row.comments || '',
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
          <CyberQuickLinks lead={p.selected} />
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
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold text-white shrink-0" style={{ background: `hsl(${hue}, 60%, 50%)` }}>
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
      <span className="text-base font-bold tabular-nums w-10 text-right" style={{ color }}>{score}/10</span>
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
      <span className="text-base font-medium" style={{ color: text }}>{label}</span>
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
    <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: map.bg, color: map.text }}>{map.label}</span>
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
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1d1d1f' }}>Lead Intelligence</h1>
            <p className="text-lg mt-0.5" style={{ color: '#8e8e93' }}>Upload a CSV to research inbound leads</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button onClick={p.onToggle} className="text-base font-medium px-5 py-2.5 rounded-full transition-all" style={{ color: '#1d1d1f', background: '#f2f2f7', border: 'none' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = '#e5e5ea' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = '#f2f2f7' }}>
              Cyber UI
            </button>
            {p.leads.length > 0 && p.stats.pending > 0 && (
              <button onClick={p.onEnrichAll} className="text-base font-semibold px-6 py-2.5 rounded-full text-white transition-all" style={{ background: '#007AFF' }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#0071e3' }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = '#007AFF' }}>
                Research All ({p.stats.pending})
              </button>
            )}
            <button onClick={() => p.fileRef.current?.click()} className="text-base font-semibold px-6 py-2.5 rounded-full transition-all" style={{ color: '#007AFF', background: '#f0f7ff', border: 'none' }}
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
                <div className="text-5xl font-bold tabular-nums" style={{ color: s.color }}>{s.value}</div>
                <div className="text-lg mt-1" style={{ color: '#8e8e93' }}>{s.label}</div>
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
                    <th key={h} className="text-left px-8 py-4 text-base font-semibold" style={{ color: '#8e8e93' }}>{h}</th>
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
                            <div className="text-xl font-semibold" style={{ color: '#1d1d1f' }}>{lead.name}</div>
                            <div className="text-base" style={{ color: '#8e8e93' }}>{lead.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-xl font-medium" style={{ color: '#1d1d1f' }}>{lead.company}</td>
                      <td className="px-8 py-4 text-lg" style={{ color: '#8e8e93' }}>{lead.role}</td>
                      <td className="px-8 py-4 max-w-[260px]"><p className="text-lg truncate" style={{ color: '#8e8e93' }}>{lead.reason}</p></td>
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
                <div className="text-2xl font-bold truncate" style={{ color: '#1d1d1f' }}>{p.selected.name}</div>
                <div className="text-lg" style={{ color: '#8e8e93' }}>{p.selected.role} at {p.selected.company}</div>
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

          <CleanQuickLinks lead={p.selected} />
          <div className="flex-1 overflow-y-auto">
            {/* Inquiry */}
            <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
              <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>Their Inquiry</p>
              <p className="text-xl leading-relaxed" style={{ color: '#1d1d1f' }}>{p.selected.reason}</p>
              <div className="flex gap-5 mt-4 text-lg" style={{ color: '#8e8e93' }}>
                <span>{p.selected.email}</span>
                <span>{p.selected.phone}</span>
              </div>
            </div>

            {currentLead.status === 'new' && (
              <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-5">
                <p className="text-2xl font-medium" style={{ color: '#1d1d1f' }}>No research yet</p>
                <p className="text-lg" style={{ color: '#8e8e93' }}>Click Research to pull intelligence on this lead.</p>
                <button onClick={() => p.onEnrich(p.selected!)} className="text-lg font-semibold px-8 py-3 rounded-full text-white transition-all" style={{ background: '#007AFF' }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.background = '#0071e3' }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.background = '#007AFF' }}>
                  Research This Lead
                </button>
              </div>
            )}

            {currentLead.status === 'enriching' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-blue-100 border-t-blue-500 animate-spin" />
                <p className="text-xl font-medium" style={{ color: '#1d1d1f' }}>Researching {p.selected.name.split(' ')[0]}...</p>
                <p className="text-lg" style={{ color: '#8e8e93' }}>{p.selected.company}</p>
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
                    <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8e8e93' }}>Lead Score</p>
                    <CleanUrgency urgency={selectedData.intelligence.urgency} />
                  </div>
                  <CleanScore score={selectedData.intelligence.lead_score} />
                  <p className="text-lg mt-3 leading-relaxed" style={{ color: '#6e6e73' }}>{selectedData.intelligence.lead_score_reason}</p>
                </div>

                {/* Ads placeholder */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#8e8e93' }}>Their Active Ads</p>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: '#8e8e93', background: '#f2f2f7' }}>Coming Soon</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-xl flex flex-col items-center justify-center gap-2 aspect-square" style={{ background: '#f5f5f7', border: '1.5px dashed #d1d1d6' }}>
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#c7c7cc" strokeWidth={1.5}>
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                          <path d="M3 15l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="8.5" cy="8.5" r="1.5" fill="#c7c7cc" stroke="none" />
                        </svg>
                        <span className="text-xs font-medium" style={{ color: '#c7c7cc' }}>Ad {i + 1}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm mt-3 leading-relaxed" style={{ color: '#c7c7cc' }}>
                    Connect the Facebook Ads Library API to pull their active ads automatically.
                  </p>
                </div>

                {/* Pitch angle */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>How to Pitch</p>
                  <p className="text-xl leading-relaxed" style={{ color: '#1d1d1f' }}>{selectedData.intelligence.recommended_angle}</p>
                </div>

                {/* Talking points */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: '#8e8e93' }}>Talking Points</p>
                  <ul className="space-y-3">
                    {selectedData.intelligence.talking_points.map((pt, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#f0f7ff' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#007AFF' }} />
                        </div>
                        <span className="text-lg leading-relaxed" style={{ color: '#1d1d1f' }}>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Person */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>About {p.selected.name.split(' ')[0]}</p>
                  <p className="text-lg leading-relaxed mb-3" style={{ color: '#1d1d1f' }}>{selectedData.person.bio}</p>
                  <p className="text-lg leading-relaxed" style={{ color: '#6e6e73' }}>{selectedData.person.background}</p>
                  {selectedData.person.social_presence && (
                    <p className="text-lg mt-3 leading-relaxed" style={{ color: '#8e8e93' }}>{selectedData.person.social_presence}</p>
                  )}
                </div>

                {/* Company */}
                <div className="px-8 py-6" style={{ borderBottom: '1px solid #f2f2f7' }}>
                  <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#8e8e93' }}>{p.selected.company}</p>
                  <p className="text-lg leading-relaxed mb-5" style={{ color: '#1d1d1f' }}>{selectedData.company.description}</p>

                  <div className="grid grid-cols-2 gap-5 mb-5">
                    {[{ label: 'Brand Voice', val: selectedData.company.brand_voice }, { label: 'Target Audience', val: selectedData.company.target_audience }].map(f => (
                      <div key={f.label}>
                        <p className="text-sm font-semibold mb-1" style={{ color: '#8e8e93' }}>{f.label}</p>
                        <p className="text-lg" style={{ color: '#1d1d1f' }}>{f.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mb-5">
                    <p className="text-sm font-semibold mb-1" style={{ color: '#8e8e93' }}>Marketing Focus</p>
                    <p className="text-lg leading-relaxed" style={{ color: '#1d1d1f' }}>{selectedData.company.marketing_focus}</p>
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
                          <li key={i} className="text-lg leading-relaxed pl-4" style={{ color: '#1d1d1f', borderLeft: '2px solid #e5e5ea' }}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Budget */}
                <div className="px-8 py-6">
                  <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#8e8e93' }}>Budget Estimate</p>
                  <p className="text-2xl font-semibold" style={{ color: '#1d1d1f' }}>{selectedData.intelligence.estimated_budget}</p>
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
  const [theme, setTheme] = useState<Theme>('clean')
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
