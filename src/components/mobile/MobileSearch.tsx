'use client'

import { useState, useEffect, useRef } from 'react'
import { usePortfolio } from '@/context/PortfolioContext'
import { useTheme } from '@/context/DarkModeContext'
import type { Client, Ad } from '@/types'

interface AssetWithClient { ad: Ad; client: Client }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface Props {
  onClientSelect: (client: Client) => void
}

export default function MobileSearch({ onClientSelect }: Props) {
  const { clients } = usePortfolio()
  const { dark, hotPink } = useTheme()
  const [query, setQuery] = useState('')
  const [randomAssets, setRandomAssets] = useState<AssetWithClient[]>([])

  const bg        = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const textColor = dark || hotPink ? '#fff' : '#1d1d1f'
  const subColor  = dark || hotPink ? 'rgba(255,255,255,0.55)' : '#8e8e8e'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
  const inputBg   = dark || hotPink ? '#1c1c1e' : '#efefef'
  const gridGap   = dark || hotPink ? '#222' : '#f0f0f0'
  const cardBg    = hotPink ? 'rgba(255,255,255,0.15)' : dark ? '#111' : '#fff'

  useEffect(() => {
    const all: AssetWithClient[] = []
    clients.forEach(c => c.ads.forEach(ad => all.push({ ad, client: c })))
    setRandomAssets(shuffle(all).slice(0, 30))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const q = query.trim().toLowerCase()

  const matchedClients = q
    ? clients.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.igHandle || '').toLowerCase().includes(q) ||
        (c.brandType || '').toLowerCase().includes(q) ||
        c.services.some(s => s.toLowerCase().includes(q))
      )
    : clients

  // When searching: collect all ads from matched clients, categorised
  const statics        = q ? matchedClients.flatMap(c => c.ads.filter(a => a.type === 'image').map(ad => ({ ad, client: c }))) : []
  const motionGraphics = q ? matchedClients.flatMap(c => c.ads.filter(a => a.type === 'video').map(ad => ({ ad, client: c }))) : []
  // UGC = videos from clients with UGC service; duration filter applied per-element via UgcThumb
  const ugcClients     = q ? matchedClients.filter(c => c.services.includes('UGC')) : []
  const ugcVideos      = ugcClients.flatMap(c => c.ads.filter(a => a.type === 'video').map(ad => ({ ad, client: c })))

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: bg, paddingBottom: 'calc(68px + env(safe-area-inset-bottom))', transition: 'background 0.3s ease' }}>
      {/* Search bar */}
      <div className="sticky top-0 z-30 px-4 pt-3 pb-2 border-b" style={{ background: bg, borderColor }}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" stroke={subColor}>
            <circle cx="10.5" cy="10.5" r="7.5" /><line x1="21" y1="21" x2="15.8" y2="15.8" />
          </svg>
          <input
            type="search"
            placeholder="Search brands, services, UGC…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-[10px] pl-9 pr-4 py-2 text-[16px] outline-none"
            style={{ background: inputBg, color: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
          />
        </div>
      </div>

      {/* ── No-query state: brand grid + random asset grid ── */}
      {!q && (
        <>
          <BrandGrid clients={matchedClients} onClientSelect={onClientSelect} cardBg={cardBg} textColor={textColor} subColor={subColor} gridGap={gridGap} />
          {randomAssets.length > 0 && (
            <>
              <SectionLabel subColor={subColor}>Selected Work</SectionLabel>
              <div className="grid grid-cols-3 gap-[1.5px]" style={{ background: gridGap }}>
                {randomAssets.map(({ ad, client }, i) => (
                  <AssetThumb key={i} ad={ad} cardBg={cardBg} onClick={() => onClientSelect(client)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Search results ── */}
      {q && (
        <>
          {matchedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" stroke={subColor}>
                <circle cx="10.5" cy="10.5" r="7.5" /><line x1="21" y1="21" x2="15.8" y2="15.8" />
              </svg>
              <p className="text-[14px]" style={{ color: subColor }}>No results for "{query}"</p>
            </div>
          ) : (
            <>
              <SectionLabel subColor={subColor}>Brands</SectionLabel>
              <BrandGrid clients={matchedClients} onClientSelect={onClientSelect} cardBg={cardBg} textColor={textColor} subColor={subColor} gridGap={gridGap} />

              {statics.length > 0 && (
                <>
                  <SectionLabel subColor={subColor}>Statics</SectionLabel>
                  <div className="grid grid-cols-3 gap-[1.5px]" style={{ background: gridGap }}>
                    {statics.map(({ ad, client }, i) => (
                      <AssetThumb key={i} ad={ad} cardBg={cardBg} onClick={() => onClientSelect(client)} />
                    ))}
                  </div>
                </>
              )}

              {motionGraphics.length > 0 && (
                <>
                  <SectionLabel subColor={subColor}>Motion Graphics</SectionLabel>
                  <div className="grid grid-cols-3 gap-[1.5px]" style={{ background: gridGap }}>
                    {motionGraphics.map(({ ad, client }, i) => (
                      <AssetThumb key={i} ad={ad} cardBg={cardBg} onClick={() => onClientSelect(client)} />
                    ))}
                  </div>
                </>
              )}

              {ugcVideos.length > 0 && (
                <>
                  <SectionLabel subColor={subColor}>UGC</SectionLabel>
                  <div className="grid grid-cols-3 gap-[1.5px]" style={{ background: gridGap }}>
                    {ugcVideos.map(({ ad, client }, i) => (
                      <UgcThumb key={i} ad={ad} cardBg={cardBg} onClick={() => onClientSelect(client)} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionLabel({ children, subColor }: { children: React.ReactNode; subColor: string }) {
  return (
    <div className="px-4 pt-5 pb-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: subColor }}>{children}</p>
    </div>
  )
}

interface BrandGridProps { clients: Client[]; onClientSelect: (c: Client) => void; cardBg: string; textColor: string; subColor: string; gridGap: string }
function BrandGrid({ clients, onClientSelect, cardBg, textColor, subColor, gridGap }: BrandGridProps) {
  return (
    <div className="grid grid-cols-3 gap-[1.5px] mt-[1.5px]" style={{ background: gridGap }}>
      {clients.map(client => (
        <button
          key={client.id}
          onClick={() => onClientSelect(client)}
          className="aspect-square flex flex-col items-center justify-center gap-2 p-3"
          style={{ background: cardBg }}
        >
          <div
            className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: client.color || '#f5f5f7' }}
          >
            {(client.igAvatar || client.logo) ? (
              <img src={client.igAvatar || client.logo} alt={client.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-[10px] font-semibold text-center px-1 leading-tight" style={{ color: textColor }}>{client.name}</span>
            )}
          </div>
          <span className="text-[11px] text-center leading-tight max-w-full truncate" style={{ color: textColor }}>
            {client.igHandle || client.id}
          </span>
          {client.brandType && (
            <span className="text-[9px]" style={{ color: subColor }}>{client.brandType}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function AssetThumb({ ad, onClick, cardBg }: { ad: Ad; onClick: () => void; cardBg: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  return (
    <button onClick={onClick} className="relative aspect-square overflow-hidden block w-full" style={{ background: cardBg }}>
      {ad.type === 'image' ? (
        <img src={ad.src} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <>
          <video
            ref={videoRef}
            src={ad.src}
            muted playsInline preload="metadata"
            className="w-full h-full object-cover"
            onLoadedMetadata={e => {
              const v = e.currentTarget
              v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5
            }}
          />
          <div className="absolute top-1 right-1">
            <svg className="w-3.5 h-3.5 fill-white drop-shadow" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4zm-2 7H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z" />
            </svg>
          </div>
        </>
      )}
    </button>
  )
}

// UGC thumb — only renders once metadata confirms duration > 15s
function UgcThumb({ ad, onClick, cardBg }: { ad: Ad; onClick: () => void; cardBg: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [show, setShow] = useState(false)

  return (
    <button
      onClick={onClick}
      className="relative aspect-square overflow-hidden block w-full"
      style={{ background: cardBg, display: show ? 'block' : 'none' }}
    >
      <video
        ref={videoRef}
        src={ad.src}
        muted playsInline preload="metadata"
        className="w-full h-full object-cover"
        onLoadedMetadata={e => {
          const v = e.currentTarget
          if (v.duration > 15) {
            v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5
            setShow(true)
          }
        }}
      />
      {show && (
        <div className="absolute top-1 right-1">
          <svg className="w-3.5 h-3.5 fill-white drop-shadow" viewBox="0 0 24 24">
            <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4zm-2 7H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z" />
          </svg>
        </div>
      )}
    </button>
  )
}
