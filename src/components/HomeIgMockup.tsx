'use client'

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import IgPost from './IgPost'
import IosStatusBar from './IosStatusBar'
import type { Client, Ad } from '@/types'

const SCREEN_W = 390
const SCREEN_H = 844
const FRAME_PAD = 13
const FRAME_H   = SCREEN_H + FRAME_PAD * 2

interface AdWithClient { ad: Ad; client: Client; key: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const PAGE_SIZE = 50

export default function HomeIgMockup() {
  const { clients, about, dispatch, goToAbout } = usePortfolio()
  const feedRef          = useRef<HTMLDivElement>(null)
  const sentinelRef      = useRef<HTMLDivElement>(null)
  const frameRef         = useRef<HTMLDivElement>(null)
  const screenOverlayRef = useRef<HTMLDivElement>(null)
  const storiesRef    = useRef<HTMLDivElement>(null)
  const dragRef       = useRef({ startX: 0, scrollLeft: 0, dragging: false, didDrag: false })
  const velocityRef   = useRef({ x: 0, lastX: 0, lastT: 0 })
  const momentumRaf   = useRef(0)

  const stopMomentum = () => cancelAnimationFrame(momentumRaf.current)

  const startMomentum = useCallback((velocity: number) => {
    const el = storiesRef.current
    if (!el) return
    stopMomentum()
    const FRICTION = 0.92
    const step = () => {
      velocity *= FRICTION
      if (Math.abs(velocity) < 0.5) return
      el.scrollLeft += velocity
      momentumRaf.current = requestAnimationFrame(step)
    }
    momentumRaf.current = requestAnimationFrame(step)
  }, [])

  const onStoriesMouseDown = useCallback((e: React.MouseEvent) => {
    const el = storiesRef.current
    if (!el) return
    stopMomentum()
    dragRef.current = { startX: e.pageX, scrollLeft: el.scrollLeft, dragging: true, didDrag: false }
    velocityRef.current = { x: 0, lastX: e.pageX, lastT: Date.now() }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [startMomentum])

  const onStoriesMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return
    const el = storiesRef.current
    if (!el) return
    const dx = e.pageX - dragRef.current.startX
    if (Math.abs(dx) > 4) dragRef.current.didDrag = true
    el.scrollLeft = dragRef.current.scrollLeft - dx

    // Track velocity
    const now = Date.now()
    const dt = now - velocityRef.current.lastT
    if (dt > 0) {
      velocityRef.current.x = (velocityRef.current.lastX - e.pageX) / dt * 16
      velocityRef.current.lastX = e.pageX
      velocityRef.current.lastT = now
    }
  }, [])

  const endDrag = useCallback((e?: React.MouseEvent) => {
    const el = storiesRef.current
    if (!el) return
    if (e && dragRef.current.didDrag) e.stopPropagation()
    dragRef.current.dragging = false
    el.style.cursor = 'grab'
    el.style.userSelect = ''
    startMomentum(velocityRef.current.x)
  }, [startMomentum])

  const onStoriesMouseUp   = useCallback((e: React.MouseEvent) => endDrag(e), [endDrag])
  const onStoriesMouseLeave = useCallback(() => endDrag(), [endDrag])


  const [rendered, setRendered] = useState(100)
  const [zoom, setZoom] = useState(1)
  const [allAds, setAllAds] = useState<AdWithClient[]>([])
  const [showCopied, setShowCopied] = useState(false)
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
  const [dark, setDark] = useState(true)
  const [heartCount, setHeartCount] = useState(0)

  const toggleDark = useCallback(() => setDark(d => !d), [])
  const onHeartTap = useCallback(() => setHeartCount(c => c + 1), [])

  // Shuffle all ads client-side only to avoid hydration mismatch
  useEffect(() => {
    const pairs: AdWithClient[] = []
    clients.forEach(c => c.ads.forEach((ad, i) => pairs.push({ ad, client: c, key: `${c.id}-${i}` })))
    setAllAds(shuffle(pairs))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = allAds.slice(0, rendered)
  const hasMore = rendered < allAds.length

  const handleShare = useCallback(() => {
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }, [])

  const handleFrameMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current
    const overlay = screenOverlayRef.current
    if (!frame) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    frame.style.background = [
      // Tight chrome hot-spot — pure mirror glint at cursor
      `radial-gradient(circle 14% at ${x}% ${y}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 18%, rgba(235,238,255,0.55) 45%, transparent 68%)`,
      // Wide primary specular lobe
      `radial-gradient(ellipse 82% 60% at ${x}% ${y}%, rgba(218,222,255,0.88) 0%, rgba(168,172,210,0.48) 32%, rgba(115,118,152,0.14) 62%, transparent 80%)`,
      // Opposite-side rim light (secondary bounce)
      `radial-gradient(ellipse 52% 38% at ${100 - x * 0.3}% ${100 - y * 0.3}%, rgba(195,198,225,0.55) 0%, rgba(155,158,185,0.22) 42%, transparent 65%)`,
      // Chrome base — bright highlights, deep shadows, high contrast
      `linear-gradient(135deg,#d4d4da 0%,#909098 7%,#5e5e66 16%,#3e3e46 30%,#2c2c34 46%,#1e1e26 62%,#141418 78%,#0e0e12 100%)`,
    ].join(', ')
    if (overlay) {
      overlay.style.opacity = '1'
      overlay.style.background = `radial-gradient(ellipse 90% 70% at ${x}% ${y}%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 42%, transparent 70%)`
    }
  }, [])

  const handleFrameMouseLeave = useCallback(() => {
    if (frameRef.current) frameRef.current.style.background = 'linear-gradient(135deg,#c0c0c8 0%,#848490 6%,#585860 14%,#3c3c44 28%,#2a2a32 46%,#1c1c24 64%,#121218 82%,#0c0c10 100%)'
    if (screenOverlayRef.current) screenOverlayRef.current.style.opacity = '0'
  }, [])

  // Fit phone to viewport — useLayoutEffect runs before paint, preventing the initial snap
  useLayoutEffect(() => {
    const compute = () => setZoom(Math.min(1, (window.innerHeight - 260) / FRAME_H))
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // Infinite scroll
  const handleSentinel = useCallback((vis: boolean) => {
    if (vis) setRendered(r => Math.min(r + PAGE_SIZE, allAds.length))
  }, [allAds.length])

  useIntersectionObserver(sentinelRef, handleSentinel, {
    root: feedRef.current, rootMargin: '300px', threshold: 0,
  })

  // Track active client from visible feed post (desktop only)
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = (e.target as HTMLElement).dataset.clientId
          if (id) setActiveClientId(id)
        }
      })
    }, { root: feed, threshold: 0.5 })
    feed.querySelectorAll('[data-client-id]').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [visible.length])


  // Wheel isolation
  useEffect(() => {
    const wrap = feedRef.current?.closest('.ig-mockup-wrap') as HTMLElement | null
    if (!wrap) return
    const handler = (e: WheelEvent) => {
      const feed = feedRef.current
      if (!feed) return
      const { scrollTop, scrollHeight, clientHeight } = feed
      const atTop    = scrollTop === 0 && e.deltaY < 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0
      if (!atTop && !atBottom) { e.preventDefault(); feed.scrollTop += e.deltaY }
    }
    wrap.addEventListener('wheel', handler as EventListener, { passive: false })
    return () => wrap.removeEventListener('wheel', handler as EventListener)
  }, [])

  return (
    <div className="ig-mockup-wrap flex-shrink-0 flex flex-col items-center relative">
      <AnimatePresence>
        {showCopied && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <span className="px-4 py-1.5 rounded-full bg-[#1d1d1f]/90 text-white text-xs font-medium whitespace-nowrap">
              Link copied to clipboard
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ zoom }}>
        {/* iPhone 16 Pro frame — shared layoutId for animation to ClientView */}
        <motion.div
          ref={frameRef}
          layoutId="ig-phone"
          className="relative"
          onMouseMove={handleFrameMouseMove}
          onMouseLeave={handleFrameMouseLeave}
          style={{
            borderRadius: '54px',
            background: 'linear-gradient(135deg,#c0c0c8 0%,#848490 6%,#585860 14%,#3c3c44 28%,#2a2a32 46%,#1c1c24 64%,#121218 82%,#0c0c10 100%)',
            padding: `${FRAME_PAD}px`,
            width: `${SCREEN_W + FRAME_PAD * 2}px`,
            boxShadow: [
              '0 60px 120px rgba(0,0,0,0.38)',
              '0 24px 48px rgba(0,0,0,0.20)',
              'inset 0 2px 0 rgba(255,255,255,0.55)',
              'inset 0 -1.5px 0 rgba(0,0,0,0.55)',
              'inset 2px 0 0 rgba(255,255,255,0.18)',
              'inset -2px 0 0 rgba(0,0,0,0.38)',
            ].join(','),
          }}
        >
          {/* Side buttons */}
          <div className="absolute" style={{ left:'-3.5px', top:'108px',  width:'3.5px', height:'34px', background:'linear-gradient(to right,#1e1e20,#3a3a3c)', borderRadius:'3px 0 0 3px' }} />
          <div className="absolute" style={{ left:'-3.5px', top:'158px',  width:'3.5px', height:'62px', background:'linear-gradient(to right,#1e1e20,#3a3a3c)', borderRadius:'3px 0 0 3px' }} />
          <div className="absolute" style={{ left:'-3.5px', top:'232px',  width:'3.5px', height:'62px', background:'linear-gradient(to right,#1e1e20,#3a3a3c)', borderRadius:'3px 0 0 3px' }} />
          <div className="absolute" style={{ right:'-3.5px', top:'190px', width:'3.5px', height:'80px', background:'linear-gradient(to left,#1e1e20,#3a3a3c)',  borderRadius:'0 3px 3px 0' }} />

          {/* Screen */}
          <div
            className="relative flex flex-col overflow-hidden"
            style={{ width:`${SCREEN_W}px`, height:`${SCREEN_H}px`, borderRadius:'42px', background: dark ? '#000' : '#fff', transition: 'background 0.3s ease' }}
          >
            {/* Cursor-reactive glass sheen — very subtle */}
            <div
              ref={screenOverlayRef}
              aria-hidden
              style={{
                position: 'absolute', inset: 0, borderRadius: '42px',
                pointerEvents: 'none', zIndex: 48, opacity: 0,
                transition: 'opacity 0.4s ease',
              }}
            />
            {/* Dynamic Island */}
            <div className="absolute z-50 left-1/2 -translate-x-1/2" style={{ top:'13px', width:'120px', height:'36px', background:'#000', borderRadius:'50px', boxShadow:'0 0 0 1.5px rgba(255,255,255,0.06)' }} />

            {/* Status bar */}
            <IosStatusBar dark={dark} />

            {/* Top nav — dark toggle left, name center, heart right */}
            <div
              className="flex-shrink-0 relative flex items-center justify-between px-4 pb-2.5 border-b"
              style={{ background: dark ? '#000' : '#fff', borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', transition: 'background 0.3s ease' }}
            >
              {/* Dark mode toggle */}
              <button onClick={toggleDark} className="w-8 h-8 flex items-center justify-center">
                {dark ? (
                  <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              {/* Centered name */}
              <button
                onClick={goToAbout}
                className="absolute left-1/2 -translate-x-1/2"
                style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif', fontSize:'19px', fontWeight:600, letterSpacing:'-0.025em', lineHeight:1, color: dark ? '#fff' : '#1d1d1f' }}
              >
                {about?.name || 'James Bradley'}
              </button>

              {/* Heart Easter egg */}
              <button onClick={onHeartTap} className="w-8 h-8 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#1d1d1f'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Stories — only clients with 9:16 static images */}
            {(() => {
              const storySets = clients.filter(c => c.ads.some(a => a.type === 'image' && a.ratio === '9:16'))
              const nonStory  = clients.filter(c => !storySets.some(s => s.id === c.id))
              const borderC   = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
              const nameColor = dark ? '#fff' : '#1d1d1f'
              const frameBorder = dark ? '#000' : '#fff'
              return (
                <div
                  ref={storiesRef}
                  className="flex-shrink-0 flex gap-3 px-4 py-3 border-b overflow-x-auto select-none"
                  style={{ scrollbarWidth: 'none', cursor: 'grab', background: dark ? '#000' : '#fff', borderColor: borderC, transition: 'background 0.3s ease' }}
                  onMouseDown={onStoriesMouseDown}
                  onMouseMove={onStoriesMouseMove}
                  onMouseUp={onStoriesMouseUp}
                  onMouseLeave={onStoriesMouseLeave}
                  onDragStart={e => e.preventDefault()}
                >
                  {/* "Me" story */}
                  {about && (
                    <button onClick={goToAbout} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="relative w-[58px] h-[58px]">
                        <div className="w-full h-full rounded-full p-[2.5px]" style={{ background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                          <div className="w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ background: about.color || '#1d1d1f', borderColor: frameBorder }}>
                            {about.avatar
                              ? <img src={about.avatar} alt={about.name} className="w-full h-full object-cover" />
                              : <span className="text-white text-[11px] font-semibold">{about.name.charAt(0)}</span>}
                          </div>
                        </div>
                        <span className="absolute bottom-0 right-0 w-[13px] h-[13px] rounded-full bg-[#22c55e] border-[2px]" style={{ borderColor: frameBorder }} />
                      </div>
                      <span className="text-[10px] max-w-[58px] truncate" style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#8e8e8e' }}>{about.handle || 'you'}</span>
                    </button>
                  )}

                  {/* Clients with 9:16 statics — story ring */}
                  {storySets.map(c => (
                    <button key={c.id} onClick={() => dispatch({ type: 'SELECT_CLIENT', client: c })} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-[58px] h-[58px] rounded-full p-[2.5px]" style={{ background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                        <div className="w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ background: c.color || '#27272a', borderColor: frameBorder }}>
                          <img src={c.igAvatar || c.logo} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      </div>
                      <span className="text-[10px] max-w-[58px] truncate" style={{ color: nameColor }}>{c.igHandle || c.id}</span>
                    </button>
                  ))}

                  {/* Clients without 9:16 statics — no story ring */}
                  {nonStory.map(c => (
                    <button key={c.id} onClick={() => dispatch({ type: 'SELECT_CLIENT', client: c })} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-[58px] h-[58px] rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ background: c.color || '#27272a', borderColor: dark ? '#444' : '#ddd' }}>
                        <img src={c.igAvatar || c.logo} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <span className="text-[10px] max-w-[58px] truncate" style={{ color: nameColor }}>{c.igHandle || c.id}</span>
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Feed */}
            <div ref={feedRef} className="flex-1 overflow-y-auto" style={{ background: dark ? '#000' : '#f5f5f7', transition: 'background 0.3s ease' }}>
              {visible.map(({ ad, client, key }, i) => (
                <div key={key} data-post-index={i} data-client-id={client.id} style={{ borderTop: i > 0 ? `6px solid ${dark ? '#0a0a0a' : '#e5e5ea'}` : 'none' }}>
                  <IgPost
                    ad={ad}
                    client={client}
                    adIndex={i}
                    isInitial={false}
                    dark={dark}
                    onMediaClick={() => dispatch({ type: 'SELECT_CLIENT', client })}
                    onShare={handleShare}
                  />
                </div>
              ))}
              {hasMore && <div ref={sentinelRef} className="h-1" />}
            </div>

            {/* Home indicator */}
            <div className="flex-shrink-0 flex justify-center items-end pb-2 pt-1.5" style={{ background: dark ? '#000' : '#fff', transition: 'background 0.3s ease' }}>
              <div className="w-[130px] h-[5px] rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' }} />
            </div>
          </div>
        </motion.div>

        {/* ── Drop shadow — soft pastel glow cast onto the wave surface ── */}
        <div
          aria-hidden
          style={{
            width: `${SCREEN_W + FRAME_PAD * 2}px`,
            height: '56px',
            marginTop: '-6px',
            pointerEvents: 'none',
            // Three-layer glow: wide outer halo + mid + core — mirrors ripple aesthetic
            background: [
              'radial-gradient(ellipse 88% 100% at 50% 8%, rgba(155,160,225,0.28) 0%, transparent 68%)',
              'radial-gradient(ellipse 60% 80%  at 50% 10%, rgba(170,175,240,0.18) 0%, transparent 55%)',
              'radial-gradient(ellipse 36% 55%  at 50% 12%, rgba(190,195,255,0.22) 0%, transparent 42%)',
            ].join(', '),
            filter: 'blur(9px)',
          }}
        />

        {/* ── Blurred reflection — impressionist mirror of phone into water ── */}
        <div
          aria-hidden
          style={{
            width: `${SCREEN_W + FRAME_PAD * 2}px`,
            height: '88px',
            marginTop: '1px',
            pointerEvents: 'none',
            borderRadius: '0 0 54px 54px',
            // Titanium edge at top (nearest to phone), dark screen body, fades to transparent
            background: [
              'linear-gradient(to bottom,',
              '  rgba(100,100,108,0.20) 0%,',
              '  rgba(14,14,18,0.14) 18%,',
              '  rgba(14,14,18,0.08) 48%,',
              '  transparent 100%)',
            ].join(''),
            filter: 'blur(22px)',
            opacity: 0.75,
            transform: 'scaleX(0.92)',
          }}
        />
      </div>
    </div>
  )
}
