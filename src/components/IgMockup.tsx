'use client'

import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { useFeedPagination } from '@/hooks/useFeedPagination'
import IgPost from './IgPost'
import IosStatusBar from './IosStatusBar'
import Lightbox from './Lightbox'
import type { Client } from '@/types'

const SCREEN_W = 390
const SCREEN_H = 844
const FRAME_PAD = 13
const FRAME_H = SCREEN_H + FRAME_PAD * 2

interface Props {
  client: Client
  initialAdIndex: number
}

export default function IgMockup({ client, initialAdIndex }: Props) {
  const { clients, about, dispatch, goToAbout } = usePortfolio()
  const feedRef         = useRef<HTMLDivElement>(null)
  const sentinelRef     = useRef<HTMLDivElement>(null)
  const frameRef        = useRef<HTMLDivElement>(null)
  const screenOverlayRef = useRef<HTMLDivElement>(null)
  const storiesRef      = useRef<HTMLDivElement>(null)
  const dragRef         = useRef({ startX: 0, scrollLeft: 0, dragging: false, didDrag: false })
  const velocityRef     = useRef({ x: 0, lastX: 0, lastT: 0 })
  const momentumRaf     = useRef(0)

  const stopMomentum = useCallback(() => cancelAnimationFrame(momentumRaf.current), [])

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
  }, [stopMomentum])

  const onStoriesMouseDown = useCallback((e: React.MouseEvent) => {
    const el = storiesRef.current
    if (!el) return
    stopMomentum()
    dragRef.current = { startX: e.pageX, scrollLeft: el.scrollLeft, dragging: true, didDrag: false }
    velocityRef.current = { x: 0, lastX: e.pageX, lastT: Date.now() }
    el.style.cursor = 'grabbing'
    el.style.userSelect = 'none'
  }, [stopMomentum])

  const onStoriesMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return
    const el = storiesRef.current
    if (!el) return
    const dx = e.pageX - dragRef.current.startX
    if (Math.abs(dx) > 4) dragRef.current.didDrag = true
    el.scrollLeft = dragRef.current.scrollLeft - dx
    const now = Date.now()
    const dt = now - velocityRef.current.lastT
    if (dt > 0) {
      velocityRef.current.x = (velocityRef.current.lastX - e.pageX) / dt * 16
      velocityRef.current.lastX = e.pageX
      velocityRef.current.lastT = now
    }
  }, [])

  const endStoryDrag = useCallback((e?: React.MouseEvent) => {
    const el = storiesRef.current
    if (!el) return
    if (e && dragRef.current.didDrag) e.stopPropagation()
    dragRef.current.dragging = false
    el.style.cursor = 'grab'
    el.style.userSelect = ''
    startMomentum(velocityRef.current.x)
  }, [startMomentum])

  const onStoriesMouseUp    = useCallback((e: React.MouseEvent) => endStoryDrag(e), [endStoryDrag])
  const onStoriesMouseLeave = useCallback(() => endStoryDrag(), [endStoryDrag])

  const [currentIndex,  setCurrentIndex]  = useState(initialAdIndex)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showCopied, setShowCopied] = useState(false)

  // Auto-scroll — all refs so callbacks are stable and ordering-safe
  const autoScrollActive = useRef(true)
  const rafIdRef         = useRef<number>(0)
  const reactivateTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Defined as plain ref-based functions so they can be referenced before effects
  const pauseAutoScroll = useCallback(() => {
    autoScrollActive.current = false
    if (reactivateTimer.current) clearTimeout(reactivateTimer.current)
  }, [])

  const scheduleReactivate = useCallback(() => {
    if (reactivateTimer.current) clearTimeout(reactivateTimer.current)
    reactivateTimer.current = setTimeout(() => { autoScrollActive.current = true }, 30000)
  }, [])

  const handleShare = useCallback(() => {
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }, [])

  const handleFrameMouseEnter = useCallback(() => {
    pauseAutoScroll()
  }, [pauseAutoScroll])

  const handleFrameMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current
    const overlay = screenOverlayRef.current
    if (!frame) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    frame.style.background = [
      `radial-gradient(circle 14% at ${x}% ${y}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 18%, rgba(235,238,255,0.55) 45%, transparent 68%)`,
      `radial-gradient(ellipse 82% 60% at ${x}% ${y}%, rgba(218,222,255,0.88) 0%, rgba(168,172,210,0.48) 32%, rgba(115,118,152,0.14) 62%, transparent 80%)`,
      `radial-gradient(ellipse 52% 38% at ${100 - x * 0.3}% ${100 - y * 0.3}%, rgba(195,198,225,0.55) 0%, rgba(155,158,185,0.22) 42%, transparent 65%)`,
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
    scheduleReactivate()
  }, [scheduleReactivate])

  const { visibleAds, hasMore, loadMore } = useFeedPagination(client.ads, initialAdIndex)

  // Fit phone in viewport — useLayoutEffect runs before paint, preventing the initial snap
  useLayoutEffect(() => {
    const compute = () => setZoom(Math.min(1, (window.innerHeight - 160) / FRAME_H))
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])


  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const target = feed.querySelector(`[data-post-index="${initialAdIndex}"]`) as HTMLElement | null
    if (target) requestAnimationFrame(() => { feed.scrollTop = target.offsetTop })
  }, [initialAdIndex])

  useIntersectionObserver(sentinelRef, visible => { if (visible) loadMore() }, {
    root: feedRef.current, rootMargin: '200px', threshold: 0,
  })

  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) setCurrentIndex(Number((e.target as HTMLElement).dataset.postIndex))
      })
    }, { root: feed, threshold: 0.5 })
    feed.querySelectorAll('[data-post-index]').forEach(p => obs.observe(p))
    return () => obs.disconnect()
  }, [visibleAds.length])

  useEffect(() => {
    const wrap = feedRef.current?.closest('.ig-mockup-wrap') as HTMLElement | null
    if (!wrap) return
    const handler = (e: WheelEvent) => {
      const feed = feedRef.current
      if (!feed) return
      const { scrollTop, scrollHeight, clientHeight } = feed
      const atTop    = scrollTop === 0 && e.deltaY < 0
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0
      if (!atTop && !atBottom) { e.preventDefault(); feed.scrollTop += e.deltaY; pauseAutoScroll() }
    }
    wrap.addEventListener('wheel', handler as EventListener, { passive: false })
    return () => wrap.removeEventListener('wheel', handler as EventListener)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseAutoScroll])

  // Auto-scroll RAF loop — 0.4px/frame ≈ ~24px/s at 60fps, very gentle drift
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return

    const SPEED = 0.4 // px per frame

    const tick = () => {
      if (autoScrollActive.current && feed) {
        // Reset to top when reaching the bottom so it loops
        if (feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 2) {
          feed.scrollTop = 0
        } else {
          feed.scrollTop += SPEED
        }
      }
      rafIdRef.current = requestAnimationFrame(tick)
    }
    rafIdRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafIdRef.current)
  }, [])

  const scrollToIndex = useCallback((idx: number) => {
    const feed = feedRef.current
    const target = feed?.querySelector(`[data-post-index="${idx}"]`) as HTMLElement | null
    if (target) feed!.scrollTo({ top: target.offsetTop, behavior: 'smooth' })
  }, [])

  // Story order: current client first
  const storyClients = [client, ...clients.filter(c => c.id !== client.id)]

  return (
    <>
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
        <div>
          <div style={{ zoom }}>
            {/* ── iPhone 16 Pro frame ─────────────────────── */}
            <motion.div
              ref={frameRef}
              layoutId="ig-phone"
              className="relative"
              onMouseEnter={handleFrameMouseEnter}
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

              {/* ── Screen ──────────────────────────────── */}
              <div
                className="relative bg-black flex flex-col overflow-hidden"
                style={{ width:`${SCREEN_W}px`, height:`${SCREEN_H}px`, borderRadius:'42px' }}
              >
                {/* Cursor-reactive glass sheen over screen — very subtle */}
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
                <IosStatusBar />

                {/* Top nav */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 pb-2.5 bg-black border-b border-white/[0.07]">
                  <button
                    onClick={goToAbout}
                    className="text-white hover:opacity-75 transition-opacity text-left"
                    style={{ fontFamily:'-apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif', fontSize:'19px', fontWeight:600, letterSpacing:'-0.025em', lineHeight:1 }}
                  >
                    {about?.name || 'James Bradley'}
                  </button>
                  <div className="flex items-center gap-4">
                    <button onClick={goToAbout}>
                      <svg className="w-6 h-6 stroke-white hover:stroke-red-400 transition-colors" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Stories */}
                <div
                  ref={storiesRef}
                  className="flex-shrink-0 flex gap-3 px-4 py-3 bg-black border-b border-white/[0.07] overflow-x-auto select-none"
                  style={{ scrollbarWidth: 'none', cursor: 'grab' }}
                  onMouseDown={onStoriesMouseDown}
                  onMouseMove={onStoriesMouseMove}
                  onMouseUp={onStoriesMouseUp}
                  onMouseLeave={onStoriesMouseLeave}
                  onDragStart={e => e.preventDefault()}
                >
                  {/* "Me" story — always first */}
                  {about && (
                    <button
                      onClick={goToAbout}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                      title={about.name}
                    >
                      <div className="relative w-[58px] h-[58px]">
                        <div
                          className="w-full h-full rounded-full p-[2.5px]"
                          style={{ background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
                        >
                          <div
                            className="w-full h-full rounded-full overflow-hidden border-2 border-black flex items-center justify-center"
                            style={{ background: about.color || '#1d1d1f' }}
                          >
                            {about.avatar ? (
                              <img src={about.avatar} alt={about.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-[11px] font-semibold">{about.name.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <span className="absolute bottom-0 right-0 w-[13px] h-[13px] rounded-full bg-[#22c55e] border-[2px] border-black" />
                      </div>
                      <span className="text-[10px] text-white max-w-[58px] truncate">
                        {about.handle || 'you'}
                      </span>
                    </button>
                  )}

                  {storyClients.map(c => {
                    const isCurrent = c.id === client.id
                    return (
                      <button
                        key={c.id}
                        onClick={() => dispatch({ type: 'SELECT_CLIENT', client: c })}
                        className="flex flex-col items-center gap-1 flex-shrink-0 group"
                        title={c.name}
                      >
                        <div
                          className={`w-[58px] h-[58px] rounded-full p-[2.5px] transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
                          style={{ background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
                        >
                          <div
                            className="w-full h-full rounded-full overflow-hidden border-2 border-black flex items-center justify-center"
                            style={{ background: c.color || '#27272a' }}
                          >
                            <img
                              src={c.igAvatar || c.logo}
                              alt={c.name}
                              className="w-full h-full object-contain"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          </div>
                        </div>
                        <span className={`text-[10px] max-w-[58px] truncate ${isCurrent ? 'text-white' : 'text-zinc-400'}`}>
                          {c.igHandle || c.id}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Feed */}
                <div ref={feedRef} className="flex-1 overflow-y-auto">
                  {visibleAds.map((ad, i) => (
                    <div key={i} data-post-index={i} className={i > 0 ? 'border-t-[6px] border-[#0a0a0a]' : ''}>
                      <IgPost
                        ad={ad}
                        client={client}
                        adIndex={i}
                        isInitial={i === initialAdIndex}
                        onMediaClick={() => setLightboxIndex(i)}
                        onShare={handleShare}
                      />
                    </div>
                  ))}
                  {hasMore && <div ref={sentinelRef} className="h-1" />}
                </div>

                {/* Home indicator */}
                <div className="flex-shrink-0 flex justify-center items-end pb-2 pt-1.5 bg-black">
                  <div className="w-[130px] h-[5px] bg-white/30 rounded-full" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox key="lightbox" ads={client.ads} startIndex={lightboxIndex} client={client} onClose={() => setLightboxIndex(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

