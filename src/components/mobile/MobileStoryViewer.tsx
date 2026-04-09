'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/DarkModeContext'
import type { Client, Ad } from '@/types'

interface StorySet {
  client: Client
  images: Ad[]
}

interface Props {
  storySets: StorySet[]
  initialClientIndex: number
  onClose: () => void
}

const STORY_DURATION = 5000

export default function MobileStoryViewer({ storySets, initialClientIndex, onClose }: Props) {
  const [clientIdx, setClientIdx] = useState(initialClientIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const [slideDir, setSlideDir] = useState(0)

  // Bottom bar interaction state
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentSent, setCommentSent] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)

  const rafRef       = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const mouseDownRef  = useRef<{ x: number; moved: boolean } | null>(null)
  const inputRef      = useRef<HTMLInputElement>(null)

  const { dark, hotPink } = useTheme()
  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'

  const currentSet = storySets[clientIdx]
  const images     = currentSet?.images ?? []
  const totalStories = images.length

  // Reset per-story state when brand changes
  useEffect(() => {
    setLiked(false)
    setBookmarked(false)
    setCommentText('')
    setCommentSent(false)
    setInputFocused(false)
  }, [clientIdx])

  const goNextClient = useCallback((dir: number) => {
    if (dir > 0 && clientIdx < storySets.length - 1) {
      setSlideDir(1); setClientIdx(c => c + 1); setStoryIdx(0); setProgress(0)
    } else if (dir < 0 && clientIdx > 0) {
      setSlideDir(-1); setClientIdx(c => c - 1); setStoryIdx(0); setProgress(0)
    } else if (dir > 0) {
      onClose()
    }
  }, [clientIdx, storySets.length, onClose])

  const goNext = useCallback(() => {
    if (storyIdx < totalStories - 1) { setStoryIdx(s => s + 1); setProgress(0) }
    else goNextClient(1)
  }, [storyIdx, totalStories, goNextClient])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) { setStoryIdx(s => s - 1); setProgress(0) }
    else goNextClient(-1)
  }, [storyIdx, goNextClient])

  // rAF progress timer — pauses while input is focused
  const isPaused = paused || inputFocused
  useEffect(() => {
    if (isPaused) return
    setProgress(0)
    startTimeRef.current = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - startTimeRef.current) / STORY_DURATION, 1)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
      else goNext()
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [storyIdx, clientIdx, isPaused, goNext])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (inputFocused) return
      if (e.key === 'ArrowLeft')  goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, onClose, inputFocused])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    setPaused(true)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    setPaused(false)
    const start = touchStartRef.current
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    const dt = Date.now() - start.t
    touchStartRef.current = null
    if (dy > 80 && Math.abs(dx) < 80) { onClose(); return }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) { goNextClient(dx < 0 ? 1 : -1); return }
    if (dt < 250 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      const screenW = window.innerWidth
      if (e.changedTouches[0].clientX < screenW * 0.35) goPrev()
      else goNext()
    }
  }, [onClose, goNextClient, goPrev, goNext])

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-nav]')) return
    mouseDownRef.current = { x: e.clientX, moved: false }
    setPaused(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDownRef.current) return
    if (Math.abs(e.clientX - mouseDownRef.current.x) > 6) mouseDownRef.current.moved = true
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setPaused(false)
    const start = mouseDownRef.current
    mouseDownRef.current = null
    if (!start) return
    const dx = e.clientX - start.x
    if (start.moved && Math.abs(dx) > 50) { goNextClient(dx < 0 ? 1 : -1); return }
    if (Math.abs(dx) < 10) {
      const rect = e.currentTarget.getBoundingClientRect()
      const relX = e.clientX - rect.left
      if (relX < rect.width * 0.35) goPrev()
      else goNext()
    }
  }, [goNextClient, goPrev, goNext])

  const handleMouseLeave = useCallback(() => {
    if (mouseDownRef.current) { mouseDownRef.current = null; setPaused(false) }
  }, [])

  const sendComment = useCallback(async () => {
    const text = commentText.trim()
    if (!text) return
    setCommentSent(true)
    setCommentText('')
    setInputFocused(false)
    try {
      await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: `story-${currentSet.client.id}-${storyIdx}`, comment: text }),
      })
    } catch {}
  }, [commentText, currentSet, storyIdx])

  if (!currentSet || images.length === 0) { onClose(); return null }

  const ad      = images[storyIdx]
  const handle  = currentSet.client.igHandle || currentSet.client.id
  const ctaHref = currentSet.client.website || ''
  const ctaLabel = currentSet.client.cta || 'Learn More'

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden select-none"
      style={{ cursor: 'pointer', background: bg, transition: 'background 0.3s ease' }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Brand slide */}
      <AnimatePresence mode="wait" custom={slideDir}>
        <motion.div
          key={clientIdx}
          custom={slideDir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.32, 0, 0.67, 0] }}
          className="absolute inset-0"
        >
          {/* Story image — anchored to top */}
          <AnimatePresence mode="wait">
            <motion.img
              key={`${clientIdx}-${storyIdx}`}
              src={ad.src}
              alt=""
              className="absolute left-0 right-0 w-full"
              style={{ top: 0, height: 'auto' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            />
          </AnimatePresence>

          {/* ── Top scrim — ensures brand header is always legible ─────────── */}
          <div
            className="absolute top-0 inset-x-0 z-[25] pointer-events-none"
            style={{ height: '110px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)' }}
          />

          {/* Progress bars */}
          <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-2 pt-2">
            {images.map((_, i) => (
              <div key={i} className="flex-1 h-[2px] rounded-full bg-white/30 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 inset-x-0 z-30 flex items-center gap-3 px-4">
            <div
              className="w-8 h-8 rounded-full overflow-hidden border-2 border-white flex-shrink-0"
              style={{ background: currentSet.client.color || '#27272a' }}
            >
              <img src={currentSet.client.igAvatar || currentSet.client.logo} alt={handle} className="w-full h-full object-contain" />
            </div>
            <span className="text-white text-[13px] font-semibold drop-shadow">{handle}</span>
            <span className="text-white/60 text-[12px]">Sponsored</span>
            <button
              data-no-nav
              onClick={onClose}
              onMouseDown={e => e.stopPropagation()}
              className="ml-auto p-1"
              style={{ cursor: 'pointer' }}
            >
              <svg className="w-6 h-6 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Left / right tap zones */}
          <div className="absolute inset-y-0 left-0 w-[35%] z-20" style={{ cursor: 'w-resize' }} />
          <div className="absolute inset-y-0 right-0 w-[65%] z-20" style={{ cursor: 'e-resize' }} />

          {/* Brand dots */}
          {storySets.length > 1 && (
            <div className="absolute bottom-[108px] inset-x-0 z-30 flex justify-center gap-1.5 pointer-events-none">
              {storySets.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === clientIdx ? '16px' : '5px',
                    height: '5px',
                    background: i === clientIdx ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom action bar — outside slide so it doesn't flash on brand switch ── */}
      <div
        data-no-nav
        className="absolute bottom-0 inset-x-0 z-40 flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', cursor: 'default' }}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
      >
        {/* CTA link button */}
        {ctaHref && (
          <div className="px-4 pb-2.5 pt-1">
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-full text-[14px] font-semibold text-white"
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.28)',
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              {ctaLabel}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
              </svg>
            </a>
          </div>
        )}

        {/* Reply row */}
        <div className="flex items-center gap-2.5 px-3 pb-3">
          {/* Reply input */}
          <div
            className="flex-1 flex items-center rounded-full overflow-hidden"
            style={{ border: '1.5px solid rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)' }}
          >
            {commentSent ? (
              <span className="px-4 py-2 text-[13px] text-white/70 w-full">Sent ✓</span>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter') sendComment() }}
                placeholder={`Reply to ${handle}…`}
                className="flex-1 bg-transparent outline-none px-4 py-2.5 text-[13px] text-white placeholder-white/55 w-full min-w-0"
                style={{ cursor: 'text' }}
              />
            )}
            {commentText.trim() && (
              <button
                onClick={sendComment}
                onMouseDown={e => e.stopPropagation()}
                className="px-3 py-2 text-[13px] font-semibold text-white/90 flex-shrink-0"
              >
                Send
              </button>
            )}
          </div>

          {/* Heart */}
          <button
            onClick={() => setLiked(l => !l)}
            onMouseDown={e => e.stopPropagation()}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
            style={{ cursor: 'pointer' }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="w-[26px] h-[26px]"
              animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                fill={liked ? '#ff3b5c' : 'none'}
                stroke={liked ? '#ff3b5c' : 'rgba(255,255,255,0.9)'}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </button>

          {/* Share */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => {
              if (navigator.share) navigator.share({ url: currentSet.client.website || window.location.href }).catch(() => {})
            }}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
            style={{ cursor: 'pointer' }}
          >
            <svg viewBox="0 0 24 24" className="w-[24px] h-[24px]" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>

          {/* Bookmark */}
          <button
            onClick={() => setBookmarked(b => !b)}
            onMouseDown={e => e.stopPropagation()}
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
            style={{ cursor: 'pointer' }}
          >
            <motion.svg
              viewBox="0 0 24 24"
              className="w-[24px] h-[24px]"
              animate={bookmarked ? { scale: [1, 1.25, 1] } : { scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <path
                d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
                fill={bookmarked ? 'rgba(255,255,255,0.9)' : 'none'}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
