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
  const screenRef        = useRef<HTMLDivElement>(null)
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
  const [activeTab, setActiveTab] = useState<'feed' | 'search' | 'reels' | 'saved' | 'profile'>('feed')
  const [storyState, setStoryState] = useState<{ startIdx: number } | null>(null)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hey! Tell me about your brand's advertising goals and I'll help figure out the best approach 🎯" },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  const toggleDark = useCallback(() => setDark(d => !d), [])
  const onHeartTap = useCallback(() => setHeartCount(c => c + 1), [])

  const sendChat = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const userMsg = { role: 'user' as const, content: text }
    const newMessages = [...chatMessages, userMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages }) })
      const data = await res.json()
      setChatMessages(m => [...m, { role: 'assistant', content: data.content }])
    } catch { setChatMessages(m => [...m, { role: 'assistant', content: "I'm having trouble connecting right now." }]) }
    finally { setChatLoading(false) }
  }, [chatInput, chatLoading, chatMessages])

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
            ref={screenRef}
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

            {/* ── Story viewer overlay ─────────────────────── */}
            {storyState && (() => {
              const storySets = clients
                .filter(c => c.ads.some(a => a.type === 'image' && a.ratio === '9:16'))
                .map(c => ({ client: c, images: c.ads.filter(a => a.type === 'image' && a.ratio === '9:16') }))
              return <PhoneStoryViewer storySets={storySets} initialClientIndex={storyState.startIdx} onClose={() => setStoryState(null)} />
            })()}

            {/* Top nav — dark toggle left, name center, heart right */}
            <div
              className="flex-shrink-0 relative flex items-center justify-between px-4 pb-2.5 border-b"
              style={{ background: dark ? '#000' : '#fff', borderColor: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', transition: 'background 0.3s ease', display: activeTab === 'feed' ? undefined : 'none' }}
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

            {/* ── FEED TAB ─────────────────────────────────────── */}
            {activeTab === 'feed' && (() => {
              const storySets = clients.filter(c => c.ads.some(a => a.type === 'image' && a.ratio === '9:16'))
              const nonStory  = clients.filter(c => !storySets.some(s => s.id === c.id))
              const borderC   = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
              const nameColor = dark ? '#fff' : '#1d1d1f'
              const frameBorder = dark ? '#000' : '#fff'
              return <>
                {/* Stories */}
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
                  {about && (
                    <button onClick={goToAbout} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="relative w-[58px] h-[58px]">
                        <div className="w-full h-full rounded-full p-[2.5px]" style={{ background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                          <div className="w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ background: about.color || '#1d1d1f', borderColor: frameBorder }}>
                            {about.avatar ? <img src={about.avatar} alt={about.name} className="w-full h-full object-cover" /> : <span className="text-white text-[11px] font-semibold">{about.name.charAt(0)}</span>}
                          </div>
                        </div>
                        <span className="absolute bottom-0 right-0 w-[13px] h-[13px] rounded-full bg-[#22c55e] border-[2px]" style={{ borderColor: frameBorder }} />
                      </div>
                      <span className="text-[10px] max-w-[58px] truncate" style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#8e8e8e' }}>{about.handle || 'you'}</span>
                    </button>
                  )}
                  {storySets.map((c, idx) => (
                    <button key={c.id} onClick={() => setStoryState({ startIdx: idx })} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-[58px] h-[58px] rounded-full p-[2.5px]" style={{ background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
                        <div className="w-full h-full rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ background: c.color || '#27272a', borderColor: frameBorder }}>
                          <img src={c.igAvatar || c.logo} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      </div>
                      <span className="text-[10px] max-w-[58px] truncate" style={{ color: nameColor }}>{c.igHandle || c.id}</span>
                    </button>
                  ))}
                  {nonStory.map(c => (
                    <button key={c.id} onClick={() => dispatch({ type: 'SELECT_CLIENT', client: c })} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-[58px] h-[58px] rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ background: c.color || '#27272a', borderColor: dark ? '#444' : '#ddd' }}>
                        <img src={c.igAvatar || c.logo} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <span className="text-[10px] max-w-[58px] truncate" style={{ color: nameColor }}>{c.igHandle || c.id}</span>
                    </button>
                  ))}
                </div>
                {/* Feed */}
                <div ref={feedRef} className="flex-1 overflow-y-auto" style={{ background: dark ? '#000' : '#f5f5f7', transition: 'background 0.3s ease' }}>
                  {visible.map(({ ad, client, key }, i) => (
                    <div key={key} data-post-index={i} data-client-id={client.id} style={{ borderTop: i > 0 ? `6px solid ${dark ? '#0a0a0a' : '#e5e5ea'}` : 'none' }}>
                      <IgPost ad={ad} client={client} adIndex={i} isInitial={false} dark={dark} commentPortal={screenRef.current} onMediaClick={() => dispatch({ type: 'SELECT_CLIENT', client })} onShare={handleShare} />
                    </div>
                  ))}
                  {hasMore && <div ref={sentinelRef} className="h-1" />}
                </div>
              </>
            })()}

            {/* ── SEARCH TAB ───────────────────────────────────── */}
            {activeTab === 'search' && (
              <div className="flex-1 overflow-y-auto" style={{ background: dark ? '#000' : '#fff' }}>
                <div className="px-4 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
                  <p className="text-[17px] font-semibold text-center" style={{ color: dark ? '#fff' : '#1d1d1f', fontFamily: '-apple-system,system-ui,sans-serif' }}>Search</p>
                  <div className="mt-2.5 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: dark ? '#1a1a1a' : '#efefef' }}>
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={dark ? 'rgba(255,255,255,0.4)' : '#8e8e8e'} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <span className="text-[14px]" style={{ color: dark ? 'rgba(255,255,255,0.3)' : '#8e8e8e' }}>Search brands</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-0.5 mt-0.5">
                  {clients.map(c => (
                    <button key={c.id} onClick={() => dispatch({ type: 'SELECT_CLIENT', client: c })} className="flex flex-col items-center gap-1.5 py-4 px-2">
                      <div className="w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center" style={{ background: c.color || '#27272a' }}>
                        <img src={c.igAvatar || c.logo} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight max-w-[72px] truncate" style={{ color: dark ? '#fff' : '#1d1d1f' }}>{c.igHandle || c.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── REELS TAB ────────────────────────────────────── */}
            {activeTab === 'reels' && (() => {
              const reelAds = clients.flatMap(c => c.ads.filter(a => a.ratio === '9:16').map(ad => ({ ad, client: c })))
              return (
                <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
                  <div className="absolute top-0 inset-x-0 z-10 px-4 pt-3 pb-2">
                    <p className="text-white text-[17px] font-semibold drop-shadow" style={{ fontFamily: '-apple-system,system-ui,sans-serif' }}>Reels</p>
                  </div>
                  <div className="absolute inset-0 overflow-y-scroll" style={{ scrollSnapType: 'y mandatory' }}>
                    {reelAds.map(({ ad, client: c }, i) => (
                      <div key={i} className="relative bg-black flex-shrink-0" style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
                        {ad.type === 'video'
                          ? <video src={ad.src} muted loop playsInline className="absolute inset-0 w-full h-full object-contain" />
                          : <img src={ad.src} alt="" className="absolute inset-0 w-full h-full object-contain" loading="lazy" />}
                        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 40%)' }} />
                        <div className="absolute left-3 z-10" style={{ bottom: '72px' }}>
                          <button onClick={() => dispatch({ type: 'SELECT_CLIENT', client: c })} className="text-white text-[13px] font-semibold drop-shadow">@{c.igHandle || c.id}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── SAVED / CHAT TAB ─────────────────────────────── */}
            {activeTab === 'saved' && (
              <div className="flex-1 flex flex-col overflow-hidden" style={{ background: dark ? '#000' : '#fff' }}>
                <div className="flex-shrink-0 px-4 py-3 border-b" style={{ borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                  <p className="text-[17px] font-semibold text-center" style={{ color: dark ? '#fff' : '#1d1d1f', fontFamily: '-apple-system,system-ui,sans-serif' }}>Direct</p>
                  <p className="text-[11px] text-center mt-1 font-semibold uppercase tracking-[0.08em]" style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#8e8e8e' }}>Let's Talk</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
                  {chatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className="max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-snug" style={{ background: m.role === 'user' ? '#0095f6' : (dark ? '#111' : '#f5f5f7'), color: m.role === 'user' ? '#fff' : (dark ? '#fff' : '#1d1d1f'), borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && <div className="flex justify-start"><div className="px-3 py-2 rounded-2xl text-[13px]" style={{ background: dark ? '#111' : '#f5f5f7', color: dark ? 'rgba(255,255,255,0.4)' : '#8e8e8e' }}>…</div></div>}
                </div>
                <div className="flex-shrink-0 px-3 pb-3">
                  <div className="flex gap-2 items-end rounded-2xl px-3 py-2" style={{ background: dark ? '#1a1a1a' : '#efefef' }}>
                    <textarea value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }} placeholder="Message…" rows={1} className="flex-1 bg-transparent text-[13px] outline-none resize-none" style={{ color: dark ? '#fff' : '#1d1d1f', maxHeight: 80 }} />
                    <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} className="w-6 h-6 flex items-center justify-center flex-shrink-0 mb-0.5">
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={chatInput.trim() ? '#0095f6' : 'rgba(150,150,150,0.5)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── PROFILE TAB ──────────────────────────────────── */}
            {activeTab === 'profile' && (
              <div className="flex-1 overflow-y-auto" style={{ background: dark ? '#000' : '#fff' }}>
                {about ? (
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-[70px] h-[70px] rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: dark ? '#333' : '#e5e5e5', background: about.color || '#1d1d1f' }}>
                        {about.avatar ? <img src={about.avatar} alt={about.name} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1 mt-1">
                        <p className="text-[16px] font-semibold" style={{ color: dark ? '#fff' : '#1d1d1f' }}>{about.name}</p>
                        <p className="text-[13px] mt-0.5" style={{ color: dark ? 'rgba(255,255,255,0.5)' : '#8e8e8e' }}>@{about.handle}</p>
                        {about.role && <p className="text-[12px] mt-1 font-medium" style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#8e8e8e' }}>{about.role}</p>}
                      </div>
                    </div>
                    {about.bio && <p className="text-[13px] leading-snug mb-3" style={{ color: dark ? 'rgba(255,255,255,0.85)' : '#1d1d1f' }}>{about.bio}</p>}
                    {about.services.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {about.services.map(s => (
                          <span key={s} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.1)' : '#f0f0f0', color: dark ? '#fff' : '#1d1d1f' }}>{s}</span>
                        ))}
                      </div>
                    )}
                    <button onClick={goToAbout} className="w-full py-2 rounded-xl text-[13px] font-semibold border" style={{ borderColor: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)', color: dark ? '#fff' : '#1d1d1f' }}>
                      View Full Profile
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[14px]" style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#8e8e8e' }}>No profile info</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Bottom nav ───────────────────────────────────── */}
            <div className="flex-shrink-0" style={{ background: dark ? '#000' : '#fff', borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>
              <div className="flex items-center justify-around" style={{ height: '49px' }}>
                {([ ['feed','home'], ['search','search'], ['reels','reels'], ['saved','send'], ['profile','person'] ] as const).map(([tab, icon]) => {
                  const active = activeTab === tab
                  const fill = active ? (dark ? '#fff' : '#1d1d1f') : (dark ? 'rgba(255,255,255,0.4)' : '#8e8e8e')
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 h-full flex items-center justify-center">
                      {icon === 'home' && <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill={active ? fill : 'none'} stroke={fill} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
                      {icon === 'search' && <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="1.75" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                      {icon === 'reels' && <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill={active ? fill : 'none'} stroke={fill} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" /><line x1="2" y1="7" x2="7" y2="7" /><line x1="2" y1="17" x2="7" y2="17" /><line x1="17" y1="17" x2="22" y2="17" /><line x1="17" y1="7" x2="22" y2="7" /></svg>}
                      {icon === 'send' && <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke={fill} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>}
                      {icon === 'person' && <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill={active ? fill : 'none'} stroke={fill} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-center pb-2 pt-1">
                <div className="w-[130px] h-[5px] rounded-full" style={{ background: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)' }} />
              </div>
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

// ── Inline phone story viewer (absolute within the phone screen, not fixed) ───
interface StorySet { client: import('@/types').Client; images: import('@/types').Ad[] }

function PhoneStoryViewer({ storySets, initialClientIndex, onClose }: { storySets: StorySet[]; initialClientIndex: number; onClose: () => void }) {
  const [clientIdx, setClientIdx] = useState(initialClientIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [slideDir, setSlideDir] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef(performance.now())

  const currentSet = storySets[clientIdx]
  const images = currentSet?.images ?? []
  const total = images.length

  const goNextClient = useCallback((dir: number) => {
    if (dir > 0 && clientIdx < storySets.length - 1) { setSlideDir(1); setClientIdx(c => c + 1); setStoryIdx(0); setProgress(0) }
    else if (dir < 0 && clientIdx > 0) { setSlideDir(-1); setClientIdx(c => c - 1); setStoryIdx(0); setProgress(0) }
    else if (dir > 0) onClose()
  }, [clientIdx, storySets.length, onClose])

  const goNext = useCallback(() => {
    if (storyIdx < total - 1) { setStoryIdx(s => s + 1); setProgress(0) }
    else goNextClient(1)
  }, [storyIdx, total, goNextClient])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx(s => s - 1); setProgress(0) } else goNextClient(-1)
  }, [storyIdx, goNextClient])

  useEffect(() => {
    setProgress(0)
    startRef.current = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - startRef.current) / 5000, 1)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else goNext()
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [storyIdx, clientIdx, goNext])

  if (!currentSet || images.length === 0) { onClose(); return null }
  const ad = images[storyIdx]
  const handle = currentSet.client.igHandle || currentSet.client.id
  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  }
  return (
    <motion.div
      className="absolute inset-0 z-[200] bg-black flex flex-col overflow-hidden"
      style={{ borderRadius: 'inherit' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <AnimatePresence mode="wait" custom={slideDir}>
        <motion.div key={clientIdx} custom={slideDir} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.26, ease: [0.32, 0, 0.67, 0] }} className="absolute inset-0">
          {/* Progress bars */}
          <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-2 pt-2">
            {images.map((_, i) => (
              <div key={i} className="flex-1 h-[2px] rounded-full bg-white/30 overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%' }} />
              </div>
            ))}
          </div>
          {/* Header */}
          <div className="absolute top-5 inset-x-0 z-30 flex items-center gap-2 px-3">
            <div className="w-7 h-7 rounded-full overflow-hidden border border-white flex-shrink-0" style={{ background: currentSet.client.color || '#27272a' }}>
              <img src={currentSet.client.igAvatar || currentSet.client.logo} alt={handle} className="w-full h-full object-contain" />
            </div>
            <span className="text-white text-[12px] font-semibold drop-shadow flex-1">{handle}</span>
            <button onClick={onClose} className="p-1">
              <svg className="w-5 h-5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {/* Image */}
          <AnimatePresence mode="wait">
            <motion.img key={`${clientIdx}-${storyIdx}`} src={ad.src} alt="" className="absolute inset-0 w-full h-full object-contain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} />
          </AnimatePresence>
          {/* Click zones */}
          <div className="absolute inset-0 z-20 flex">
            <button className="flex-1 h-full" onClick={goPrev} />
            <button className="flex-1 h-full" onClick={goNext} />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
