'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import { copyToClipboard } from '@/lib/clipboard'
import type { Ad, Client } from '@/types'

interface Reel { ad: Ad; client: Client; key: string }

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
  onProfileSelect: () => void
}

const WINDOW_SIZE = 5 // render this many slides around the active one

export default function MobileReels({ onClientSelect, onProfileSelect }: Props) {
  const { clients } = usePortfolio()
  const [reels, setReels] = useState<Reel[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [muted, setMuted] = useState(true)
  // Ref so IntersectionObserver closures always read current mute state
  const mutedRef = useRef(true)
  const toggleMute = () => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
  }

  useEffect(() => {
    const all: Reel[] = []
    clients.forEach(c => {
      c.ads.forEach((ad, i) => {
        if (ad.ratio === '9:16') all.push({ ad, client: c, key: `${c.id}-${i}` })
      })
    })
    setReels(shuffle(all))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only render slides within a window around the active index
  const windowStart = Math.max(0, activeIndex - 2)
  const windowEnd   = Math.min(reels.length - 1, activeIndex + 2)

  if (reels.length === 0) {
    return (
      <div className="flex-1 bg-black flex items-center justify-center">
        <p className="text-white/40 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="flex-1 relative bg-black overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-3 pb-2 pointer-events-none">
        <span
          className="text-white text-[17px] font-semibold drop-shadow"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          Reels
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

      {/* Scroll-snap container */}
      <div
        className="absolute inset-0 overflow-y-scroll"
        style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {reels.map((reel, i) => {
          const inWindow = i >= windowStart && i <= windowEnd
          return (
            <ReelSlide
              key={reel.key}
              reel={reel}
              index={i}
              inWindow={inWindow}
              muted={muted}
              mutedRef={mutedRef}
              onActive={() => setActiveIndex(i)}
              onToggleMute={toggleMute}
              onClientSelect={onClientSelect}
              onProfileSelect={onProfileSelect}
            />
          )
        })}
      </div>
    </div>
  )
}

interface SlideProps {
  reel: Reel
  index: number
  inWindow: boolean
  muted: boolean
  mutedRef: React.MutableRefObject<boolean>
  onActive: () => void
  onToggleMute: () => void
  onClientSelect: (c: Client) => void
  onProfileSelect: () => void
}

function ReelSlide({ reel, index, inWindow, muted, mutedRef, onActive, onToggleMute, onClientSelect, onProfileSelect }: SlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const slideRef = useRef<HTMLDivElement>(null)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [showHeart, setShowHeart] = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const lastTapRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  // Play/pause — reads mutedRef so it always has the current value
  useEffect(() => {
    const el = slideRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      const v = videoRef.current
      if (entry.isIntersecting) {
        onActive()
        if (v) {
          v.muted = mutedRef.current
          v.play().catch(() => { v.muted = true; v.play().catch(() => {}) })
        }
      } else {
        if (v) { v.pause(); v.currentTime = 0 }
      }
    }, { threshold: 0.8 })
    obs.observe(el)
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync mute prop changes to video while it's playing
  useEffect(() => {
    const v = videoRef.current
    if (!v || v.paused) return
    v.muted = muted
  }, [muted])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current
    if (!start) return
    const dx = Math.abs(e.changedTouches[0].clientX - start.x)
    const dy = Math.abs(e.changedTouches[0].clientY - start.y)
    touchStartRef.current = null
    if (dx > 15 || dy > 20) return // was a scroll, not a tap
    const now = Date.now()
    if (now - lastTapRef.current < 300) {
      // Double-tap → like
      setLiked(true)
      setShowHeart(true)
      setHeartKey(k => k + 1)
      setTimeout(() => setShowHeart(false), 900)
    } else {
      // Single tap → toggle mute (like Instagram)
      onToggleMute()
    }
    lastTapRef.current = now
  }, [onToggleMute])

  const handle = reel.client.igHandle || reel.client.id
  const seed = index * 1337 + 2891
  const likes = ((seed % 12000) + 800) + (liked ? 1 : 0)

  return (
    <div
      ref={slideRef}
      className="relative bg-black"
      style={{
        // Fills exactly the scroll container (which is inset-0 inside flex-1)
        height: '100%',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Media — only load src when in render window */}
      {reel.ad.type === 'video' ? (
        <video
          ref={videoRef}
          src={inWindow ? reel.ad.src : undefined}
          muted
          loop
          playsInline
          preload={inWindow ? 'auto' : 'none'}
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : (
        inWindow ? (
          <img
            src={reel.ad.src}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            loading="eager"
          />
        ) : (
          <div className="absolute inset-0 bg-black" />
        )
      )}

      {/* Double-tap heart */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            key={heartKey}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            initial={{ scale: 0.4, opacity: 1 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg width="100" height="100" viewBox="0 0 24 24" fill="white" className="drop-shadow-2xl">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 40%, transparent 72%, rgba(0,0,0,0.28) 100%)' }}
      />

      {/* Right-side actions */}
      <div className="absolute right-3 z-20 flex flex-col items-center gap-5" style={{ bottom: '88px' }}>
        {/* Avatar */}
        <button onClick={() => onClientSelect(reel.client)} className="flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white flex items-center justify-center"
            style={{ background: reel.client.color || '#27272a' }}
          >
            <img src={reel.client.igAvatar || reel.client.logo} alt={handle} className="w-full h-full object-contain" />
          </div>
          <div className="w-5 h-5 rounded-full bg-[#0095f6] flex items-center justify-center -mt-2.5 border-2 border-black">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 5v14M5 12h14" /></svg>
          </div>
        </button>

        {/* Like */}
        <button onClick={() => setLiked(l => !l)} className="flex flex-col items-center gap-1">
          <motion.div
            animate={liked ? { scale: [1, 1.35, 0.88, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.38, times: [0, 0.2, 0.5, 0.7, 1] }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24"
              fill={liked ? '#fe3c72' : 'none'}
              stroke={liked ? '#fe3c72' : 'white'}
              strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.div>
          <span className="text-white text-[12px] font-medium">{likes.toLocaleString()}</span>
        </button>

        {/* Contact → about/profile */}
        <button onClick={onProfileSelect} className="flex flex-col items-center gap-1">
          <svg className="w-8 h-8 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-white text-[12px] font-medium">Contact</span>
        </button>

        {/* Share */}
        <button onClick={() => copyToClipboard('https://jbradbixler.com/').catch(() => {})} className="flex flex-col items-center gap-1">
          <svg className="w-8 h-8 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>

        {/* Bookmark */}
        <button onClick={() => setBookmarked(v => !v)}>
          <svg className="w-7 h-7" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            fill={bookmarked ? 'white' : 'none'}
            stroke="white"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-0 right-16 z-20 px-4" style={{ bottom: '88px' }}>
        <button onClick={() => onClientSelect(reel.client)} className="mb-1.5">
          <span className="text-white text-[14px] font-semibold drop-shadow">@{handle}</span>
        </button>
        {reel.ad.caption && (
          <p className="text-white/90 text-[13px] leading-snug line-clamp-2">{reel.ad.caption}</p>
        )}
        <button
          onClick={() => onClientSelect(reel.client)}
          className="w-full mt-2.5 py-2 rounded-md bg-white/10 border border-white/30 text-white text-[13px] font-semibold backdrop-blur-sm"
        >
          {reel.client.cta || 'Learn More'}
        </button>
        {reel.ad.type === 'video' && (
          <div className="flex items-center gap-2 mt-2">
            <svg className="w-3.5 h-3.5 fill-white opacity-60" viewBox="0 0 24 24">
              <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
            </svg>
            <span className="text-white/60 text-[12px]">Original Audio · {handle}</span>
          </div>
        )}
      </div>
    </div>
  )
}
