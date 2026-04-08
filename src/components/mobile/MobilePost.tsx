'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { copyToClipboard } from '@/lib/clipboard'
import type { Ad, Client } from '@/types'

interface Props {
  ad: Ad
  client: Client
  postKey: string
  onAvatarClick: () => void
  onContact: () => void
  onShare: () => void
}

export default function MobilePost({ ad, client, postKey, onAvatarClick, onContact, onShare }: Props) {
  const postRef  = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef(0)

  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [muted, setMuted] = useState(true)
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null)
  const [heartKey, setHeartKey] = useState(0)

  const handle = client.igHandle || client.id
  const seed = postKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const likes = (seed * 1337 % 8000) + 500
  const cta = client.cta || 'Learn More'

  useIntersectionObserver(postRef, (visible) => {
    const v = videoRef.current
    if (!v) return
    if (visible) v.play().catch(() => {})
    else v.pause()
  }, { threshold: 0.5 })

  const triggerHeart = useCallback((clientX: number, clientY: number) => {
    const rect = mediaRef.current?.getBoundingClientRect()
    if (!rect) return
    setHeartPos({ x: clientX - rect.left, y: clientY - rect.top })
    setHeartKey(k => k + 1)
    setLiked(true)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now()
    const touch = e.changedTouches[0]
    if (now - lastTapRef.current < 300) {
      triggerHeart(touch.clientX, touch.clientY)
    }
    lastTapRef.current = now
  }, [triggerHeart])

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <article ref={postRef} className="bg-white border-b border-black/[0.05]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          onClick={onAvatarClick}
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-black/[0.06]"
          style={{ background: client.color || '#27272a' }}
        >
          <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain" />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={onAvatarClick} className="text-[13px] font-semibold text-[#1d1d1f] leading-tight block text-left">
            {handle}
          </button>
          <span className="text-[11px] text-zinc-400">Sponsored</span>
        </div>
        <button className="text-[#1d1d1f] text-xl px-1 cursor-default leading-none">···</button>
      </div>

      {/* Media */}
      <div ref={mediaRef} className="w-full relative bg-zinc-100 select-none" onTouchEnd={handleTouchEnd}>
        {ad.type === 'image' ? (
          <img src={ad.src} alt="" className="w-full block object-cover" loading="lazy" />
        ) : (
          <>
            <video
              ref={videoRef}
              src={ad.src}
              muted
              loop
              playsInline
              preload="metadata"
              className="w-full block object-cover"
            />
            <button
              onClick={toggleMute}
              className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/55 flex items-center justify-center"
            >
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

        {/* Double-tap heart overlay */}
        <AnimatePresence>
          {heartPos && (
            <motion.div
              key={heartKey}
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.3, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="absolute pointer-events-none drop-shadow-xl"
              style={{ left: heartPos.x - 44, top: heartPos.y - 44 }}
              onAnimationComplete={() => setHeartPos(null)}
            >
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
          {/* Heart */}
          <button onClick={() => setLiked(l => !l)}>
            <motion.div
              animate={liked ? { scale: [1, 1.35, 0.88, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.38, times: [0, 0.2, 0.5, 0.7, 1] }}
            >
              <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24"
                fill={liked ? '#fe3c72' : 'none'}
                stroke={liked ? '#fe3c72' : '#1d1d1f'}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>
          </button>
          {/* Chat → about/contact */}
          <button onClick={onContact}>
            <svg className="w-[26px] h-[26px] stroke-[#1d1d1f]" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          {/* Send → clipboard */}
          <button onClick={() => { copyToClipboard('https://jbradbixler.com/').then(() => onShare()).catch(() => onShare()) }}>
            <svg className="w-[26px] h-[26px] stroke-[#1d1d1f]" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {/* Bookmark */}
        <button onClick={() => setBookmarked(v => !v)}>
          <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            fill={bookmarked ? '#1d1d1f' : 'none'}
            stroke={bookmarked ? '#1d1d1f' : '#1d1d1f'}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Likes */}
      <div className="px-3 pb-0.5 text-[13px] font-semibold text-[#1d1d1f]">
        {(likes + (liked ? 1 : 0)).toLocaleString()} likes
      </div>

      {/* Caption */}
      {ad.caption && (
        <div className="px-3 pb-2 text-[13px] text-[#1d1d1f] leading-snug">
          <span className="font-semibold mr-1">{handle}</span>{ad.caption}
        </div>
      )}

      {/* CTA */}
      <div className="px-3 pb-3">
        <button onClick={onAvatarClick} className="w-full py-2 rounded-md bg-[#0095f6] text-white text-[13px] font-semibold">
          {cta}
        </button>
      </div>
    </article>
  )
}
