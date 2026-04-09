'use client'

import { useState, useEffect } from 'react'

function StatusTime({ dark }: { dark: boolean }) {
  const [time, setTime] = useState(() => {
    const d = new Date()
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' AM','').replace(' PM','')
  })
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setTime(d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' AM','').replace(' PM',''))
    }
    const id = setInterval(tick, 10000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ color: dark ? '#fff' : '#000', fontSize: '15px', fontWeight: 600, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif', letterSpacing: '-0.01em' }}>
      {time}
    </span>
  )
}

function StatusIcons({ dark }: { dark: boolean }) {
  const c = dark ? '#fff' : '#000'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
        <rect x="0"    y="8"   width="3" height="4"  rx="1" fill={c} />
        <rect x="4.5"  y="5.5" width="3" height="6.5" rx="1" fill={c} />
        <rect x="9"    y="3"   width="3" height="9"  rx="1" fill={c} />
        <rect x="13.5" y="0"   width="3" height="12" rx="1" fill={c} />
      </svg>
      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
        <path d="M8 10.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z" fill={c} />
        <path d="M4.2 7.3a5.4 5.4 0 0 1 7.6 0" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M1.6 4.7a9 9 0 0 1 12.8 0" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
        <div style={{ width: '25px', height: '12px', border: `1.5px solid ${c}`, borderRadius: '3.5px', padding: '1.5px' }}>
          <div style={{ width: '99%', height: '100%', background: c, borderRadius: '1.5px' }} />
        </div>
        <div style={{ width: '2px', height: '5px', background: c, borderRadius: '0 1px 1px 0', opacity: 0.4 }} />
      </div>
    </div>
  )
}

export default function IosStatusBar({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex-shrink-0 flex items-end justify-between px-7 pb-1.5" style={{ height: '59px', background: dark ? '#000' : '#fff', transition: 'background 0.3s ease' }}>
      <StatusTime dark={dark} />
      <StatusIcons dark={dark} />
    </div>
  )
}
