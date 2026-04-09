'use client'

import { useState } from 'react'
import type { About } from '@/types'

interface Props {
  about: About | null
}

export default function MobileAboutProfile({ about }: Props) {
  const [descExpanded, setDescExpanded] = useState(false)

  if (!about) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white" style={{ paddingBottom: 'calc(49px + env(safe-area-inset-bottom))' }}>
        <p className="text-[#8e8e8e] text-[14px]">Profile coming soon.</p>
      </div>
    )
  }

  const name = about.name
  const handle = about.handle
  const bio = about.bio
  const totalMedia = about.media.length

  return (
    <div className="flex-1 overflow-y-auto bg-white" style={{ paddingBottom: 'calc(49px + env(safe-area-inset-bottom))' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 bg-white border-b border-black/[0.06] flex items-center justify-between px-4 h-[44px]"
      >
        <span
          className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.02em]"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          {handle}
        </span>
        <a href={about.website || 'https://jbradbixler.com/'} target="_blank" rel="noopener noreferrer">
          <svg className="w-6 h-6 stroke-[#1d1d1f]" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-start gap-5">
          {/* Avatar with green active dot */}
          <div className="relative flex-shrink-0">
            <div
              className="w-[86px] h-[86px] rounded-full p-[2.5px]"
              style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden border-[2.5px] border-white flex items-center justify-center"
                style={{ background: about.color || '#1d1d1f' }}
              >
                {about.avatar ? (
                  <img src={about.avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{name.charAt(0)}</span>
                )}
              </div>
            </div>
            {/* Green active dot */}
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white" />
          </div>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pt-3">
            <Stat label="Work" value="999+" />
            <Stat label="Brands" value="15+" />
            <Stat label="Potential" value="∞" />
          </div>
        </div>

        {/* Name + role + bio */}
        <div className="mt-3">
          <p className="text-[13px] font-semibold text-[#1d1d1f]">{name}</p>
          {about.role && (
            <p className="text-[12px] text-zinc-500 mt-0.5">{about.role}</p>
          )}
          {about.services.length > 0 && (
            <p className="text-[12px] text-zinc-500 mt-0.5">{about.services.slice(0, 3).join(' · ')}</p>
          )}
          {bio && (
            <div className="mt-1.5">
              <p className="text-[13px] text-[#1d1d1f] leading-snug">
                {descExpanded ? bio : bio.slice(0, 120) + (bio.length > 120 ? '…' : '')}
              </p>
              {bio.length > 120 && (
                <button onClick={() => setDescExpanded(v => !v)} className="text-[13px] text-zinc-400 mt-0.5">
                  {descExpanded ? 'less' : 'more'}
                </button>
              )}
            </div>
          )}
          {about.website && (
            <a
              href={about.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium mt-1 block"
              style={{ color: '#00376b' }}
            >
              {about.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* Contact button */}
        <div className="mt-3">
          <a
            href={about.website || 'https://jbradbixler.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center py-1.5 rounded-lg bg-[#efefef] text-[13px] font-semibold text-[#1d1d1f]"
          >
            Contact
          </a>
        </div>
      </div>

      {/* Services section */}
      {about.services.length > 0 && (
        <div className="px-4 pb-4 border-b border-black/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8e8e8e] mb-2">Services</p>
          <div className="flex flex-wrap gap-1.5">
            {about.services.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-[#f0f0f0] text-[11px] text-[#1d1d1f]">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Media grid or placeholder */}
      {totalMedia > 0 ? (
        <>
          <div className="border-t border-black/[0.08] flex items-center justify-center py-2.5">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-[1.5px] bg-[#f0f0f0]">
            {about.media.map((item, i) => (
              <div key={i} className="relative aspect-square overflow-hidden bg-zinc-100">
                {item.type === 'image' ? (
                  <img src={item.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <>
                    <video
                      src={item.src}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                      onLoadedMetadata={e => {
                        const v = e.currentTarget
                        v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5
                      }}
                    />
                    <div className="absolute top-1.5 right-1.5">
                      <svg className="w-3.5 h-3.5 fill-white drop-shadow" viewBox="0 0 24 24">
                        <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4zm-2 7H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="px-4 py-12 flex flex-col items-center gap-3 text-center border-t border-black/[0.08]">
          <svg className="w-12 h-12 stroke-[#c7c7cc]" viewBox="0 0 24 24" fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 15l5-5 4 4 3-3 6 6" />
          </svg>
          <p className="text-[13px] text-[#8e8e8e]">Coming soon</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[16px] font-semibold text-[#1d1d1f]">{value}</span>
      <span className="text-[12px] text-[#1d1d1f]">{label}</span>
    </div>
  )
}
