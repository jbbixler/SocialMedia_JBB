'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/DarkModeContext'
import MobilePost from './MobilePost'
import MobileStoryViewer from './MobileStoryViewer'
import type { About, Client, Ad } from '@/types'

interface Props {
  about: About | null
}

export default function MobileAboutProfile({ about }: Props) {
  const { dark, hotPink } = useTheme()
  const [descExpanded, setDescExpanded] = useState(false)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const [storyOpen, setStoryOpen] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  // Scroll the overlay feed to the tapped post without touching outer page scroll
  useEffect(() => {
    if (viewingIndex === null || !feedRef.current) return
    const el = feedRef.current.children[viewingIndex] as HTMLElement | undefined
    if (el) feedRef.current.scrollTop = el.offsetTop
  }, [viewingIndex])

  const bg          = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const textColor   = dark || hotPink ? '#fff' : '#1d1d1f'
  const subColor    = dark || hotPink ? 'rgba(255,255,255,0.55)' : '#8e8e8e'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
  const cardBg      = hotPink ? 'rgba(255,255,255,0.15)' : dark ? '#111' : '#efefef'
  const gridGap     = dark || hotPink ? '#222' : '#f0f0f0'
  const linkColor   = dark || hotPink ? 'rgba(255,255,255,0.7)' : '#00376b'
  const storyRing   = hotPink
    ? 'linear-gradient(45deg,#ff1493,#ff69b4,#ff0080,#c71585)'
    : 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'

  if (!about) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: bg, paddingBottom: 'calc(68px + env(safe-area-inset-bottom))' }}>
        <p className="text-[14px]" style={{ color: subColor }}>Profile coming soon.</p>
      </div>
    )
  }

  const name = about.name
  const handle = about.handle
  const bio = about.bio
  const totalMedia = about.media.length

  const aboutClient: Client = {
    id: 'about',
    name: about.name,
    logo: about.avatar,
    igAvatar: about.avatar,
    color: about.color,
    igHandle: about.handle,
    website: about.website,
    description: about.bio,
    services: about.services,
    ads: about.media as Ad[],
  }

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col" style={{ background: bg, transition: 'background 0.3s ease' }}>
    <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(68px + env(safe-area-inset-bottom))' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-30 border-b flex items-center justify-between px-4 h-[44px]"
        style={{ background: bg, borderColor }}
      >
        <span
          className="text-[17px] font-semibold tracking-[-0.02em]"
          style={{ color: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          {handle}
        </span>
        <a href={about.website || 'https://jbradbixler.com/'} target="_blank" rel="noopener noreferrer">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
          <button
            className="relative flex-shrink-0"
            onClick={() => setStoryOpen(true)}
          >
            <div
              className="w-[86px] h-[86px] rounded-full p-[2.5px]"
              style={{ background: storyRing }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: about.color || '#1d1d1f', border: `2.5px solid ${bg}` }}
              >
                {about.avatar ? (
                  <img src={about.avatar} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-2xl">{name.charAt(0)}</span>
                )}
              </div>
            </div>
            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#22c55e]" style={{ border: `2px solid ${bg}` }} />
          </button>

          {/* Stats */}
          <div className="flex-1 flex items-center justify-around pt-3">
            <Stat label="Work" value="999+" textColor={textColor} />
            <Stat label="Brands" value="15+" textColor={textColor} />
            <Stat label="Potential" value="∞" textColor={textColor} />
          </div>
        </div>

        {/* Name + role + bio */}
        <div className="mt-3">
          <p className="text-[13px] font-semibold" style={{ color: textColor }}>{name}</p>
          {about.role && (
            <p className="text-[12px] mt-0.5" style={{ color: subColor }}>{about.role}</p>
          )}
          {about.services.length > 0 && (
            <p className="text-[12px] mt-0.5" style={{ color: subColor }}>{about.services.slice(0, 3).join(' · ')}</p>
          )}
          {bio && (
            <div className="mt-1.5">
              <p className="text-[13px] leading-snug" style={{ color: textColor }}>
                {descExpanded ? bio : bio.slice(0, 120) + (bio.length > 120 ? '…' : '')}
              </p>
              {bio.length > 120 && (
                <button onClick={() => setDescExpanded(v => !v)} className="text-[13px] mt-0.5" style={{ color: subColor }}>
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
              style={{ color: linkColor }}
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
            className="block text-center py-1.5 rounded-lg text-[13px] font-semibold"
            style={{ background: cardBg, color: textColor }}
          >
            Contact
          </a>
        </div>
      </div>

      {/* Services section */}
      {about.services.length > 0 && (
        <div className="px-4 pb-4 border-b" style={{ borderColor }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: subColor }}>Services</p>
          <div className="flex flex-wrap gap-1.5">
            {about.services.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: cardBg, color: textColor }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Media grid or placeholder */}
      {totalMedia > 0 ? (
        <>
          <div className="border-t flex items-center justify-center py-2.5" style={{ borderColor }}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div className="grid grid-cols-3 gap-[1.5px]" style={{ background: gridGap }}>
            {about.media.map((item, i) => (
              <button
                key={i}
                className="relative aspect-square overflow-hidden block w-full"
                style={{ background: cardBg }}
                onClick={() => setViewingIndex(i)}
              >
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
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="px-4 py-12 flex flex-col items-center gap-3 text-center border-t" style={{ borderColor }}>
          <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" stroke={subColor}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 15l5-5 4 4 3-3 6 6" />
          </svg>
          <p className="text-[13px]" style={{ color: subColor }}>Coming soon</p>
        </div>
      )}
    </div>

      {/* Full-screen post viewer — slides up when grid item tapped */}
      <AnimatePresence>
        {viewingIndex !== null && (
          <motion.div
            className="absolute inset-0 z-[100] flex flex-col overflow-hidden"
            style={{ background: bg }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center gap-3 px-3 h-[44px] border-b" style={{ borderColor, background: bg }}>
              <button onClick={() => setViewingIndex(null)} className="flex items-center gap-1.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span className="text-[15px]" style={{ color: textColor }}>Posts</span>
              </button>
            </div>
            {/* Scrollable posts — jump to tapped index */}
            <div ref={feedRef} className="flex-1 overflow-y-auto" style={{ background: bg }}>
              {about.media.map((item, idx) => (
                <div key={idx}>
                  <MobilePost
                    ad={item as Ad}
                    client={aboutClient}
                    postKey={`about-${idx}`}
                    onAvatarClick={() => setViewingIndex(null)}
                    onContact={() => {}}
                    onShare={() => {}}
                    personal
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Story viewer — opens when avatar tapped */}
      <AnimatePresence>
        {storyOpen && (
          <MobileStoryViewer
            storySets={[{ client: aboutClient, images: about.media.filter(m => m.type === 'image') as Ad[] }]}
            initialClientIndex={0}
            onClose={() => setStoryOpen(false)}
            onClientSelect={() => setStoryOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ label, value, textColor }: { label: string; value: string | number; textColor: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[16px] font-semibold" style={{ color: textColor }}>{value}</span>
      <span className="text-[12px]" style={{ color: textColor }}>{label}</span>
    </div>
  )
}
