'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { copyToClipboard } from '@/lib/clipboard'
import type { Ad, Client } from '@/types'

interface Props {
  ads: Ad[]
  startIndex: number
  client: Client
  onClose: () => void
  onClientSelect?: (c: Client) => void
}

export default function MobileLightbox({ ads, startIndex, client, onClose, onClientSelect }: Props) {
  const [index, setIndex] = useState(startIndex)
  const [liked, setLiked] = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTapRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
  const ad = ads[index]

  // Keyboard nav
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex(i => Math.min(ads.length - 1, i + 1))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [ads.length, onClose])

  // Autoplay video
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = true
    v.play().catch(() => {})
  }, [index])

  // Swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = Math.abs(e.changedTouches[0].clientY - start.y)
    const now = Date.now()

    // Double-tap to like
    if (Math.abs(dx) < 12 && dy < 12) {
      if (now - lastTapRef.current < 300) {
        setLiked(true)
        setShowHeart(true)
        setHeartKey(k => k + 1)
        setTimeout(() => setShowHeart(false), 900)
      }
      lastTapRef.current = now
      return
    }

    if (dy > 40) return // vertical swipe — ignore
    if (dx < -50) setIndex(i => Math.min(ads.length - 1, i + 1))
    else if (dx > 50) setIndex(i => Math.max(0, i - 1))
    touchStartRef.current = null
  }, [ads.length])

  const handle = client.igHandle || client.id
  const seed = (index * 1337 + 1234)
  const likes = (seed % 8000) + 500 + (liked ? 1 : 0)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-[env(safe-area-inset-top)] pb-2 flex-shrink-0">
        <button onClick={onClose} className="p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/20"
          style={{ background: client.color || '#27272a' }}
        >
          <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[13px] font-semibold leading-tight">{handle}</p>
          <p className="text-white/50 text-[11px]">Sponsored</p>
        </div>
        <span className="text-white/40 text-[11px] tabular-nums">{index + 1} / {ads.length}</span>
      </div>

      {/* Dot indicators */}
      {ads.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-2 flex-shrink-0">
          {ads.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === index ? '6px' : '5px',
                height: i === index ? '6px' : '5px',
                background: i === index ? 'white' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>
      )}

      {/* Media */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full h-full flex items-center justify-center"
          >
            {ad.type === 'image' ? (
              <img src={ad.src} alt="" className="max-w-full max-h-full object-contain" />
            ) : (
              <video
                ref={videoRef}
                src={ad.src}
                muted
                loop
                playsInline
                preload="auto"
                className="max-w-full max-h-full object-contain"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Double-tap heart */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              key={heartKey}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
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
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setLiked(l => !l)}>
            <motion.div
              animate={liked ? { scale: [1, 1.35, 0.88, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.38, times: [0, 0.2, 0.5, 0.7, 1] }}
            >
              <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24"
                fill={liked ? '#fe3c72' : 'none'}
                stroke={liked ? '#fe3c72' : 'white'}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>
          </button>
          <a href="https://jbradbixler.com/" target="_blank" rel="noopener noreferrer">
            <svg className="w-[26px] h-[26px] stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </a>
          <button onClick={() => copyToClipboard('https://jbradbixler.com/').catch(() => {})}>
            <svg className="w-[26px] h-[26px] stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <svg className="w-[26px] h-[26px] stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      <div className="px-4 pb-1 flex-shrink-0">
        <p className="text-white text-[13px] font-semibold">{likes.toLocaleString()} likes</p>
      </div>

      {ad.caption && (
        <div className="px-4 pb-2 flex-shrink-0">
          <p className="text-white text-[13px] leading-snug">
            <span className="font-semibold mr-1">{handle}</span>{ad.caption}
          </p>
        </div>
      )}

      <div className="px-4 pb-safe flex-shrink-0" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => onClientSelect ? onClientSelect(client) : onClose()}
          className="w-full py-2 rounded-md bg-[#0095f6] text-white text-[13px] font-semibold"
        >
          {client.cta || 'Learn More'}
        </button>
      </div>
    </motion.div>
  )
}
