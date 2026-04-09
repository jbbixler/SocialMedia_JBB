'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import { useTheme } from '@/context/DarkModeContext'
import MobilePost from './MobilePost'
import MobileStoryViewer from './MobileStoryViewer'
import type { Client, Ad } from '@/types'

interface Props {
  onClientSelect: (client: Client) => void
  onProfileSelect: () => void
}

interface AdWithClient { ad: Ad; client: Client; key: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MobileFeed({ onClientSelect, onProfileSelect }: Props) {
  const { clients, about } = usePortfolio()
  const { dark, hotPink, toggleDark, onHeartTap, setStoryOpen } = useTheme()
  const [allAds, setAllAds] = useState<AdWithClient[]>([])
  const [rendered, setRendered] = useState(12)
  const [showCopied, setShowCopied] = useState(false)
  const [storyClientIdx, setStoryClientIdx] = useState<number | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Theme colors
  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const textColor = dark || hotPink ? '#fff' : '#1d1d1f'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
  const subColor = dark || hotPink ? 'rgba(255,255,255,0.5)' : '#8e8e8e'

  useEffect(() => {
    const pairs: AdWithClient[] = []
    clients.forEach(c => c.ads.forEach((ad, i) => pairs.push({ ad, client: c, key: `${c.id}-${i}` })))
    setAllAds(shuffle(pairs))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setRendered(r => Math.min(r + 12, allAds.length))
    }, { rootMargin: '400px' })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [allAds.length])

  const handleShare = useCallback(() => {
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }, [])

  // Build story sets — 9:16 static images only per client
  const storySets = clients
    .map(c => ({ client: c, images: c.ads.filter(a => a.type === 'image' && a.ratio === '9:16') }))
    .filter(s => s.images.length > 0)

  const visible = allAds.slice(0, rendered)

  return (
    <>
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: bg, paddingBottom: 'calc(68px + env(safe-area-inset-bottom))', transition: 'background 0.4s ease' }}
      >
        {/* Top bar — dark toggle left, name center, heart right */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-4 h-[44px] border-b"
          style={{ background: bg, borderColor, transition: 'background 0.4s ease' }}
        >
          {/* Dark mode toggle */}
          <button onClick={toggleDark} className="w-8 h-8 flex items-center justify-center">
            {dark || hotPink ? (
              <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {/* Centered name */}
          <span
            className="absolute left-1/2 -translate-x-1/2 text-[18px] font-semibold tracking-[-0.03em]"
            style={{ color: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
          >
            {about?.name || 'James Bradley'}
          </span>

          {/* Heart Easter egg */}
          <button onClick={onHeartTap} className="w-8 h-8 flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Stories */}
        <div
          className="flex gap-4 px-4 py-3 overflow-x-auto border-b"
          style={{ scrollbarWidth: 'none', borderColor }}
        >
          {/* "Me" story — navigates to profile */}
          {about && (
            <button
              onClick={onProfileSelect}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
              title={about.name}
            >
              <div className="relative w-[62px] h-[62px]">
                <div
                  className="w-full h-full rounded-full p-[2.5px]"
                  style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
                >
                  <div
                    className="w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center"
                    style={{ background: about.color || '#1d1d1f', borderColor: bg }}
                  >
                    {about.avatar ? (
                      <img src={about.avatar} alt={about.name} className="w-full h-full object-cover" />
                    ) : (
                      <span style={{ color: '#fff' }} className="font-semibold">{about.name.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2" style={{ borderColor: bg }} />
              </div>
              <span className="text-[11px] max-w-[62px] truncate" style={{ color: subColor }}>{about.handle || 'you'}</span>
            </button>
          )}

          {/* Client stories — only shown if they have 9:16 statics */}
          {storySets.map((set, i) => (
            <button
              key={set.client.id}
              onClick={() => { setStoryClientIdx(i); setStoryOpen(true) }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div
                className="w-[62px] h-[62px] rounded-full p-[2.5px]"
                style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
              >
                <div
                  className="w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center"
                  style={{ background: set.client.color || '#27272a', borderColor: bg }}
                >
                  <img src={set.client.igAvatar || set.client.logo} alt={set.client.name} className="w-full h-full object-contain" />
                </div>
              </div>
              <span className="text-[11px] max-w-[62px] truncate" style={{ color: textColor }}>
                {set.client.igHandle || set.client.id}
              </span>
            </button>
          ))}

          {/* Clients without 9:16 statics — tap goes to client profile */}
          {clients
            .filter(c => !storySets.some(s => s.client.id === c.id))
            .map(c => (
              <button
                key={c.id}
                onClick={() => onClientSelect(c)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div
                  className="w-[62px] h-[62px] rounded-full p-[2.5px]"
                  style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
                >
                  <div
                    className="w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center"
                    style={{ background: c.color || '#27272a', borderColor: bg }}
                  >
                    <img src={c.igAvatar || c.logo} alt={c.name} className="w-full h-full object-contain" />
                  </div>
                </div>
                <span className="text-[11px] max-w-[62px] truncate" style={{ color: textColor }}>
                  {c.igHandle || c.id}
                </span>
              </button>
            ))}
        </div>

        {/* Feed posts */}
        {visible.map(({ ad, client, key }) => (
          <MobilePost
            key={key}
            ad={ad}
            client={client}
            postKey={key}
            onAvatarClick={() => onClientSelect(client)}
            onContact={onProfileSelect}
            onShare={handleShare}
          />
        ))}
        {rendered < allAds.length && <div ref={sentinelRef} className="h-4" />}

        {/* Copied toast */}
        <AnimatePresence>
          {showCopied && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#1d1d1f]/90 text-white text-xs font-medium whitespace-nowrap z-50 pointer-events-none"
            >
              Link copied to clipboard
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Story viewer overlay */}
      <AnimatePresence>
        {storyClientIdx !== null && (
          <MobileStoryViewer
            storySets={storySets}
            initialClientIndex={storyClientIdx}
            onClose={() => { setStoryClientIdx(null); setStoryOpen(false) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
