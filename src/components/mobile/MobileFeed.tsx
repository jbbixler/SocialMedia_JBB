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

const HEART_COLORS = [
  '#ff3b5c', '#ff9f0a', '#30d158', '#0a84ff', '#bf5af2',
  '#ff69b4', '#00c7be', '#ffd60a', '#ff6b00', '#ffffff',
]

export default function MobileFeed({ onClientSelect, onProfileSelect }: Props) {
  const { clients, about } = usePortfolio()
  const { dark, hotPink, heartCount, toggleDark, onHeartTap, setStoryOpen } = useTheme()
  const [allAds, setAllAds] = useState<AdWithClient[]>([])
  const [rendered, setRendered] = useState(12)
  const [showCopied, setShowCopied] = useState(false)
  const [storyClientIdx, setStoryClientIdx] = useState<number | null>(null)
  const sentinelRef  = useRef<HTMLDivElement>(null)
  const storiesRef   = useRef<HTMLDivElement>(null)
  const storyDragRef = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false })

  const onStoriesMouseDown = useCallback((e: React.MouseEvent) => {
    const el = storiesRef.current
    if (!el) return
    storyDragRef.current = { down: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    el.style.cursor = 'grabbing'
  }, [])

  const onStoriesMouseMove = useCallback((e: React.MouseEvent) => {
    if (!storyDragRef.current.down) return
    const el = storiesRef.current
    if (!el) return
    const dx = e.clientX - storyDragRef.current.startX
    if (Math.abs(dx) > 5) storyDragRef.current.moved = true
    el.scrollLeft = storyDragRef.current.scrollLeft - dx
  }, [])

  const onStoriesMouseUp = useCallback(() => {
    const el = storiesRef.current
    if (el) el.style.cursor = 'grab'
    storyDragRef.current.down = false
    // Reset after click event fires so taps still work
    setTimeout(() => { storyDragRef.current.moved = false }, 80)
  }, [])

  const onStoriesMouseLeave = useCallback(() => {
    if (!storyDragRef.current.down) return
    storyDragRef.current.down = false
    const el = storiesRef.current
    if (el) el.style.cursor = 'grab'
    setTimeout(() => { storyDragRef.current.moved = false }, 80)
  }, [])

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
      {/* ── Header — lives OUTSIDE the scroll container so it never moves ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 h-[44px] relative"
        style={{ background: bg, borderBottom: `1px solid ${borderColor}`, transition: 'background 0.4s ease' }}
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

          {/* Heart Easter egg — cycles color on each tap */}
          <button onClick={onHeartTap} className="w-8 h-8 flex items-center justify-center">
            {(() => {
              const heartColor = heartCount > 0
                ? HEART_COLORS[(heartCount - 1) % HEART_COLORS.length]
                : textColor
              const filled = heartCount > 0
              return (
                <svg className="w-6 h-6" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
                  fill={filled ? heartColor : 'none'}
                  stroke={heartColor}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              )
            })()}
          </button>
      </div>

      {/* ── Scrollable feed content ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: bg, paddingBottom: 'calc(68px + env(safe-area-inset-bottom))', transition: 'background 0.4s ease' }}
      >
        {/* Stories */}
        <div
          ref={storiesRef}
          className="flex gap-4 px-4 py-3 overflow-x-auto border-b select-none"
          style={{ scrollbarWidth: 'none', borderColor, cursor: 'grab' }}
          onMouseDown={onStoriesMouseDown}
          onMouseMove={onStoriesMouseMove}
          onMouseUp={onStoriesMouseUp}
          onMouseLeave={onStoriesMouseLeave}
        >
          {/* "Me" story — navigates to profile */}
          {about && (
            <button
              onClick={() => { if (!storyDragRef.current.moved) onProfileSelect() }}
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
              onClick={() => { if (!storyDragRef.current.moved) { setStoryClientIdx(i); setStoryOpen(true) } }}
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
                onClick={() => { if (!storyDragRef.current.moved) onClientSelect(c) }}
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
            onClientSelect={(client) => { setStoryClientIdx(null); setStoryOpen(false); onClientSelect(client) }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
