'use client'

import { useState, useRef, useEffect, useCallback, RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { copyToClipboard } from '@/lib/clipboard'
import { useBookmarks } from '@/context/BookmarkContext'
import { useTheme } from '@/context/DarkModeContext'
import LazyVideo from '../LazyVideo'
import MobileStoryViewer from './MobileStoryViewer'
import type { Client, Ad } from '@/types'

// Swipe-right-to-go-back gesture — applies directly to element via ref
function useSwipeBack(onBack: () => void): RefObject<HTMLDivElement> {
  const elRef = useRef<HTMLDivElement>(null)
  const touchRef = useRef<{ startX: number; startY: number; locked: boolean } | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: false }
      el.style.transition = 'none'
    }

    const onMove = (e: TouchEvent) => {
      const t = touchRef.current
      if (!t) return
      const dx = e.touches[0].clientX - t.startX
      const dy = Math.abs(e.touches[0].clientY - t.startY)
      if (!t.locked) {
        if (dy > 10 && dy > Math.abs(dx)) { touchRef.current = null; return } // vertical scroll
        t.locked = true
      }
      if (dx > 0) el.style.transform = `translateX(${dx}px)`
    }

    const onEnd = (e: TouchEvent) => {
      const t = touchRef.current
      touchRef.current = null
      el.style.transition = 'transform 0.25s ease'
      if (!t) return
      const dx = e.changedTouches[0].clientX - t.startX
      const vx = dx / Math.max(1, e.timeStamp - performance.now() + 300) // rough velocity
      if (dx > 80 || (dx > 40 && vx > 0.3)) {
        el.style.transform = `translateX(100%)`
        setTimeout(onBack, 230)
      } else {
        el.style.transform = 'translateX(0)'
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onBack])

  return elRef
}

interface Props {
  client: Client
  onBack: () => void
  onClientSelect?: (c: Client) => void
  onProfileSelect: () => void
}

type ProfileTab = 'posts' | 'reels'

export default function MobileClientProfile({ client, onBack, onClientSelect, onProfileSelect }: Props) {
  const { dark, hotPink } = useTheme()
  const [descExpanded, setDescExpanded] = useState(false)
  const [tab, setTab] = useState<ProfileTab>('posts')
  const [feedStartIndex, setFeedStartIndex] = useState<number | null>(null)
  const [reelsViewerIndex, setReelsViewerIndex] = useState<number | null>(null)
  const swipeRef = useSwipeBack(onBack)

  const [storyOpen, setStoryOpen] = useState(false)

  const handle = client.igHandle || client.id
  // Reels: 9:16 videos only
  const reelAds = client.ads.filter(ad => ad.ratio === '9:16' && ad.type === 'video')
  // Stories: 9:16 static images only
  const storyImages = client.ads.filter(ad => ad.type === 'image' && ad.ratio === '9:16')
  const totalPosts = client.ads.length

  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const textColor = dark || hotPink ? '#fff' : '#1d1d1f'
  const subColor = dark || hotPink ? 'rgba(255,255,255,0.5)' : '#8e8e8e'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'
  const storyRing = hotPink
    ? 'linear-gradient(45deg,#ff1493,#ff69b4,#ff0080,#c71585)'
    : 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'

  // Reels viewer (full-screen) for this client's videos
  if (reelsViewerIndex !== null) {
    return (
      <ClientReelsViewer
        client={client}
        ads={reelAds}
        startIndex={reelsViewerIndex}
        onBack={() => setReelsViewerIndex(null)}
        onProfileSelect={onProfileSelect}
      />
    )
  }

  // Post feed opened from grid
  if (feedStartIndex !== null) {
    return (
      <ClientPostFeed
        client={client}
        ads={client.ads}
        startIndex={feedStartIndex}
        onBack={() => setFeedStartIndex(null)}
        onProfileSelect={onProfileSelect}
      />
    )
  }

  return (
    <div ref={swipeRef} className="flex-1 relative overflow-hidden flex flex-col">
    <div className="flex-1 overflow-y-auto" style={{ background: bg, paddingBottom: 'calc(68px + env(safe-area-inset-bottom))', transition: 'background 0.4s ease' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-3 h-[44px] border-b" style={{ background: bg, borderColor }}>
        <button onClick={onBack} className="p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[17px] font-semibold tracking-[-0.02em]" style={{ color: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
          {handle}
        </span>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-5">
          <button
            className="flex-shrink-0 rounded-full focus:outline-none"
            onClick={() => storyImages.length > 0 && setStoryOpen(true)}
            style={{ cursor: storyImages.length > 0 ? 'pointer' : 'default' }}
          >
            <div
              className="w-[86px] h-[86px] rounded-full p-[2.5px]"
              style={{ background: storyImages.length > 0 ? storyRing : borderColor }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden border-[3px] flex items-center justify-center"
                style={{ background: client.color || '#27272a', borderColor: bg }}
              >
                <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain" />
              </div>
            </div>
          </button>
          <div className="flex-1 flex items-center justify-around pt-2">
            <Stat label="Posts" value={totalPosts} dark={dark || hotPink} />
            <Stat label={client.kpi?.label ?? 'Work'} value={client.kpi?.value ?? 'Full'} dark={dark || hotPink} />
            <Stat label="Since" value="2025" dark={dark || hotPink} />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[13px] font-semibold" style={{ color: textColor }}>{client.name}</p>
          {client.services.length > 0 && (
            <p className="text-[12px] mt-0.5" style={{ color: subColor }}>{client.services.slice(0, 3).join(' · ')}</p>
          )}
          {client.description && (
            <div className="mt-1.5">
              <p className="text-[13px] leading-snug" style={{ color: textColor }}>
                {descExpanded ? client.description : client.description.slice(0, 120) + (client.description.length > 120 ? '…' : '')}
              </p>
              {client.description.length > 120 && (
                <button onClick={() => setDescExpanded(v => !v)} className="text-[13px] mt-0.5" style={{ color: subColor }}>
                  {descExpanded ? 'less' : 'more'}
                </button>
              )}
            </div>
          )}
          {client.website && (
            <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium mt-1 block" style={{ color: '#0095f6' }}>
              {client.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={onProfileSelect} className="flex-1 text-center py-1.5 rounded-lg text-[13px] font-semibold" style={{ background: dark || hotPink ? 'rgba(255,255,255,0.12)' : '#efefef', color: textColor }}>
            Contact
          </button>
          {client.website && (
            <a href={client.website} target="_blank" rel="noopener noreferrer" className="flex-1 text-center py-1.5 rounded-lg text-[13px] font-semibold" style={{ background: dark || hotPink ? 'rgba(255,255,255,0.12)' : '#efefef', color: textColor }}>
              Visit Site
            </a>
          )}
        </div>
      </div>

      {/* Posts / Reels tab bar */}
      <div className="flex border-t" style={{ borderColor }}>
        <button
          onClick={() => setTab('posts')}
          className="flex-1 flex items-center justify-center py-2.5 gap-1.5"
          style={{ borderBottom: tab === 'posts' ? `2px solid ${textColor}` : '2px solid transparent' }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"
            stroke={tab === 'posts' ? textColor : subColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        {reelAds.length > 0 && (
          <button
            onClick={() => setTab('reels')}
            className="flex-1 flex items-center justify-center py-2.5"
            style={{ borderBottom: tab === 'reels' ? `2px solid ${textColor}` : '2px solid transparent' }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24"
              fill={tab === 'reels' ? textColor : 'none'}
              stroke={tab === 'reels' ? textColor : subColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <path fill={tab === 'reels' ? (dark || hotPink ? '#000' : '#fff') : subColor} stroke="none" d="M10 8l6 4-6 4V8z" />
            </svg>
          </button>
        )}
      </div>

      {/* Posts grid */}
      {tab === 'posts' && (
        <div className="grid grid-cols-3 gap-[1.5px]" style={{ background: borderColor }}>
          {client.ads.map((ad, i) => (
            <GridThumb key={i} ad={ad} onClick={() => setFeedStartIndex(i)} />
          ))}
        </div>
      )}

      {/* Reels — tap thumb to open full-screen reels viewer */}
      {tab === 'reels' && (
        <div className="grid grid-cols-3 gap-[1.5px]" style={{ background: borderColor }}>
          {reelAds.map((ad, i) => (
            <GridThumb key={i} ad={ad} isReel onClick={() => setReelsViewerIndex(i)} />
          ))}
        </div>
      )}
    </div>

    {/* Story viewer overlay */}
    <AnimatePresence>
      {storyOpen && storyImages.length > 0 && (
        <MobileStoryViewer
          storySets={[{ client, images: storyImages }]}
          initialClientIndex={0}
          onClose={() => setStoryOpen(false)}
        />
      )}
    </AnimatePresence>
    </div>
  )
}

// ── Full-screen reels-style viewer for client videos ─────────────────────────
function ClientReelsViewer({ client, ads, startIndex, onBack, onProfileSelect }: {
  client: Client; ads: Ad[]; startIndex: number; onBack: () => void; onProfileSelect: () => void
}) {
  const [activeIndex, setActiveIndex] = useState(startIndex)
  const [muted, setMuted] = useState(true)
  const mutedRef = useRef(true)
  const toggleMute = () => { const n = !mutedRef.current; mutedRef.current = n; setMuted(n) }
  const handle = client.igHandle || client.id
  const swipeRef = useSwipeBack(onBack)

  const windowStart = Math.max(0, activeIndex - 2)
  const windowEnd = Math.min(ads.length - 1, activeIndex + 2)

  return (
    <div ref={swipeRef} className="flex-1 relative bg-black overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center gap-3 px-4 pt-3 pb-2 pointer-events-none">
        <button className="pointer-events-auto" onClick={onBack}>
          <svg className="w-7 h-7 stroke-white drop-shadow" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-white text-[16px] font-semibold drop-shadow flex-1" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
          @{handle}
        </span>
        <button className="pointer-events-auto" onClick={toggleMute}>
          {muted ? (
            <svg className="w-6 h-6 stroke-white drop-shadow" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className="w-6 h-6 stroke-white drop-shadow" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>

      <div
        className="absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {ads.map((ad, i) => (
          <ClientReelSlide
            key={i}
            ad={ad}
            client={client}
            index={i}
            inWindow={i >= windowStart && i <= windowEnd}
            muted={muted}
            mutedRef={mutedRef}
            onActive={() => setActiveIndex(i)}
            onProfileSelect={onProfileSelect}
          />
        ))}
      </div>
    </div>
  )
}

function ClientReelSlide({ ad, client, index, inWindow, muted, mutedRef, onActive, onProfileSelect }: {
  ad: Ad; client: Client; index: number; inWindow: boolean; muted: boolean
  mutedRef: React.MutableRefObject<boolean>; onActive: () => void; onProfileSelect: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const slideRef = useRef<HTMLDivElement>(null)
  const [liked, setLiked] = useState(false)
  const { toggle, isSaved } = useBookmarks()
  const bookmarked = isSaved(`${client.id}-${index}`)
  const likes = ((index * 1337 + 2891) % 12000) + 800

  useEffect(() => {
    const el = slideRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      const v = videoRef.current
      if (entry.isIntersecting) {
        onActive()
        if (v) { v.muted = mutedRef.current; v.play().catch(() => { v.muted = true; v.play().catch(() => {}) }) }
      } else {
        if (v) { v.pause(); v.currentTime = 0 }
      }
    }, { threshold: 0.8 })
    obs.observe(el)
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const v = videoRef.current
    if (!v || v.paused) return
    v.muted = muted
  }, [muted])

  return (
    <div ref={slideRef} className="relative bg-black" style={{ height: '100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}>
      {inWindow && (
        <video ref={videoRef} src={ad.src} muted loop playsInline preload="auto"
          className="absolute inset-0 w-full h-full object-contain" />
      )}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 40%, transparent 72%, rgba(0,0,0,0.28) 100%)' }} />

      {/* Right actions */}
      <div className="absolute right-3 z-20 flex flex-col items-center gap-5" style={{ bottom: '88px' }}>
        <button onClick={() => setLiked(l => !l)} className="flex flex-col items-center gap-1">
          <motion.div animate={liked ? { scale: [1, 1.35, 0.88, 1.1, 1] } : { scale: 1 }} transition={{ duration: 0.38, times: [0, 0.2, 0.5, 0.7, 1] }}>
            <svg className="w-8 h-8" viewBox="0 0 24 24"
              fill={liked ? '#fe3c72' : 'none'} stroke={liked ? '#fe3c72' : 'white'}
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.div>
          <span className="text-white text-[12px] font-medium">{(likes + (liked ? 1 : 0)).toLocaleString()}</span>
        </button>
        <button onClick={() => toggle({ ad, client, key: `${client.id}-${index}` })}>
          <svg className="w-7 h-7" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            fill={bookmarked ? 'white' : 'none'} stroke="white">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button onClick={() => copyToClipboard('https://social-media-4qprfs6vv-jbbixlers-projects.vercel.app/').catch(() => {})}>
          <svg className="w-7 h-7 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-0 right-16 z-20 px-4" style={{ bottom: '88px' }}>
        <span className="text-white text-[14px] font-semibold drop-shadow">@{client.igHandle || client.id}</span>
        {ad.caption && <p className="text-white/90 text-[13px] leading-snug line-clamp-2 mt-1">{ad.caption}</p>}
      </div>
    </div>
  )
}

// ── Client post feed (from grid tap) ──────────────────────────────────────────
function ClientPostFeed({ client, ads, startIndex, onBack, onProfileSelect }: {
  client: Client; ads: Ad[]; startIndex: number; onBack: () => void; onProfileSelect: () => void
}) {
  const feedRef = useRef<HTMLDivElement>(null)
  const swipeRef = useSwipeBack(onBack)
  const [showCopied, setShowCopied] = useState(false)
  const { dark, hotPink } = useTheme()
  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const textColor = dark || hotPink ? '#fff' : '#1d1d1f'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'

  const handleShare = useCallback(() => {
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }, [])

  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    requestAnimationFrame(() => {
      const target = feed.querySelector(`[data-post-index="${startIndex}"]`) as HTMLElement | null
      if (target) feed.scrollTop = target.offsetTop
    })
  }, [startIndex])

  return (
    <div ref={swipeRef} className="flex-1 flex flex-col overflow-hidden" style={{ background: bg }}>
      <div className="flex-shrink-0 flex items-center gap-3 px-3 h-[44px] border-b z-30" style={{ background: bg, borderColor }}>
        <button onClick={onBack} className="p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold" style={{ color: textColor }}>Posts</span>
      </div>

      <div ref={feedRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(68px + env(safe-area-inset-bottom))' }}>
        {ads.map((ad, i) => (
          <div key={i} data-post-index={i} className="border-t" style={{ borderColor }}>
            <FeedPost ad={ad} client={client} index={i} onShare={handleShare} onContact={onProfileSelect} />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showCopied && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#1d1d1f]/90 text-white text-xs font-medium whitespace-nowrap z-50 pointer-events-none"
          >
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FeedPost({ ad, client, index, onShare, onContact }: { ad: Ad; client: Client; index: number; onShare: () => void; onContact: () => void }) {
  const postRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [liked, setLiked] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showHeart, setShowHeart] = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const lastTapRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const { toggle, isSaved } = useBookmarks()
  const { dark, hotPink } = useTheme()

  const bookmarked = isSaved(`${client.id}-fp-${index}`)
  const handle = client.igHandle || client.id
  const likes = (((index * 1337 + 1234) % 8000) + 500) + (liked ? 1 : 0)
  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const textColor = dark || hotPink ? '#fff' : '#1d1d1f'
  const subColor = dark || hotPink ? 'rgba(255,255,255,0.5)' : '#8e8e8e'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
  const iconStroke = dark || hotPink ? '#fff' : '#1d1d1f'
  const menuBg = dark || hotPink ? '#1c1c1e' : '#fff'

  useIntersectionObserver(postRef, (visible) => {
    const v = videoRef.current
    if (!v) return
    if (visible) v.play().catch(() => {})
    else v.pause()
  }, { threshold: 0.5 })

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current
    if (!start) return
    const dx = Math.abs(e.changedTouches[0].clientX - start.x)
    const dy = Math.abs(e.changedTouches[0].clientY - start.y)
    touchStartRef.current = null
    if (dx > 15 || dy > 20) return
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      setLiked(true); setShowHeart(true); setHeartKey(k => k + 1)
      setTimeout(() => setShowHeart(false), 900)
    }
    lastTapRef.current = now
  }, [])

  return (
    <article ref={postRef} style={{ background: bg }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border" style={{ background: client.color || '#27272a', borderColor }}>
          <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold leading-tight" style={{ color: textColor }}>{handle}</span>
          <span className="block text-[11px]" style={{ color: subColor }}>Sponsored</span>
        </div>
        {/* Three dots */}
        <div className="relative">
          <button onClick={() => setShowMenu(v => !v)} className="text-xl px-1 leading-none" style={{ color: textColor }}>···</button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }} transition={{ duration: 0.15 }}
                  className="absolute right-0 top-7 z-50 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
                  style={{ background: menuBg, border: `1px solid ${borderColor}` }}
                >
                  <button onClick={() => { setShowMenu(false); onContact() }}
                    className="w-full text-left px-4 py-3.5 text-[14px] border-b" style={{ color: textColor, borderColor }}>
                    About this account
                  </button>
                  {client.website && (
                    <a href={client.website} target="_blank" rel="noopener noreferrer"
                      onClick={() => setShowMenu(false)}
                      className="w-full text-left px-4 py-3.5 text-[14px] flex items-center gap-2 block" style={{ color: textColor }}>
                      Visit brand website
                      <svg className="w-3.5 h-3.5 ml-auto opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Media */}
      <div className="w-full relative select-none" style={{ background: '#111' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {ad.type === 'image' ? (
          <img src={ad.src} alt="" className="w-full block object-cover" loading="lazy" />
        ) : (
          <>
            <LazyVideo videoRef={videoRef} src={ad.src} muted loop playsInline className="w-full block object-cover" />
            <button onClick={e => { e.stopPropagation(); const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted) }}
              className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/55 flex items-center justify-center">
              {muted ? (
                <svg className="w-3.5 h-3.5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </>
        )}
        <AnimatePresence>
          {showHeart && (
            <motion.div key={heartKey} className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ scale: 0.4, opacity: 1 }} animate={{ scale: 1.2, opacity: 1 }} exit={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
              <svg width="88" height="88" viewBox="0 0 24 24" fill="white">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(l => !l)}>
            <motion.div animate={liked ? { scale: [1, 1.35, 0.88, 1.1, 1] } : { scale: 1 }} transition={{ duration: 0.38, times: [0, 0.2, 0.5, 0.7, 1] }}>
              <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24"
                fill={liked ? '#fe3c72' : 'none'} stroke={liked ? '#fe3c72' : iconStroke}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>
          </button>
          <button onClick={onContact}>
            <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button onClick={() => copyToClipboard('https://social-media-4qprfs6vv-jbbixlers-projects.vercel.app/').then(onShare).catch(onShare)}>
            <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <button onClick={() => toggle({ ad, client, key: `${client.id}-fp-${index}` })}>
          <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            fill={bookmarked ? iconStroke : 'none'} stroke={iconStroke}>
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      <div className="px-3 pb-0.5 text-[13px] font-semibold" style={{ color: textColor }}>{likes.toLocaleString()} likes</div>
      {ad.caption && (
        <div className="px-3 pb-3 text-[13px] leading-snug" style={{ color: textColor }}>
          <span className="font-semibold mr-1">{handle}</span>{ad.caption}
        </div>
      )}
    </article>
  )
}

function Stat({ label, value, dark }: { label: string; value: string | number; dark: boolean }) {
  const color = dark ? '#fff' : '#1d1d1f'
  return (
    <div className="flex flex-col items-center">
      <span className="text-[16px] font-semibold" style={{ color }}>{value}</span>
      <span className="text-[12px]" style={{ color }}>{label}</span>
    </div>
  )
}

function GridThumb({ ad, onClick, isReel }: { ad: Ad; onClick: () => void; isReel?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  return (
    <button className="relative aspect-square overflow-hidden bg-zinc-100 block w-full" onClick={onClick}>
      {ad.type === 'image' ? (
        <img src={ad.src} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <>
          <LazyVideo videoRef={videoRef} src={ad.src} muted playsInline className="w-full h-full object-cover"
            onLoadedMetadata={e => { const v = e.currentTarget; v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5 }} />
          <div className="absolute top-1.5 right-1.5">
            <svg className="w-4 h-4 fill-white drop-shadow" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4zm-2 7H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z" />
            </svg>
          </div>
        </>
      )}
      {isReel && (
        <div className="absolute top-1.5 right-1.5">
          <svg className="w-4 h-4 fill-white drop-shadow" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="3" />
            <path fill="rgba(0,0,0,0.5)" stroke="none" d="M10 8l6 4-6 4V8z" />
          </svg>
        </div>
      )}
    </button>
  )
}
