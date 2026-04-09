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
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  // Touch tracking
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null)
  // Mouse tracking for desktop drag
  const mouseDownRef = useRef<{ x: number; moved: boolean } | null>(null)

  const { dark, hotPink } = useTheme()
  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'

  const currentSet = storySets[clientIdx]
  const images = currentSet?.images ?? []
  const totalStories = images.length

  const goNextClient = useCallback((dir: number) => {
    if (dir > 0 && clientIdx < storySets.length - 1) {
      setSlideDir(1)
      setClientIdx(c => c + 1)
      setStoryIdx(0)
      setProgress(0)
    } else if (dir < 0 && clientIdx > 0) {
      setSlideDir(-1)
      setClientIdx(c => c - 1)
      setStoryIdx(0)
      setProgress(0)
    } else if (dir > 0) {
      onClose()
    }
  }, [clientIdx, storySets.length, onClose])

  const goNext = useCallback(() => {
    if (storyIdx < totalStories - 1) {
      setStoryIdx(s => s + 1)
      setProgress(0)
    } else {
      goNextClient(1)
    }
  }, [storyIdx, totalStories, goNextClient])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1)
      setProgress(0)
    } else {
      goNextClient(-1)
    }
  }, [storyIdx, goNextClient])

  // rAF progress timer
  useEffect(() => {
    if (paused) return
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
  }, [storyIdx, clientIdx, paused, goNext])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  goPrev()
      else if (e.key === 'ArrowRight') goNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext, onClose])

  // ── Touch handlers (mobile) ───────────────────────────────────────────────
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
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

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
      goNextClient(dx < 0 ? 1 : -1)
      return
    }

    if (dt < 250 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      const screenW = window.innerWidth
      if (e.changedTouches[0].clientX < screenW * 0.35) goPrev()
      else goNext()
    }
  }, [onClose, goNextClient, goPrev, goNext])

  // ── Mouse handlers (desktop) ──────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't hijack the close button
    if ((e.target as HTMLElement).closest('button')) return
    mouseDownRef.current = { x: e.clientX, moved: false }
    setPaused(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseDownRef.current) return
    if (Math.abs(e.clientX - mouseDownRef.current.x) > 6) {
      mouseDownRef.current.moved = true
    }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    setPaused(false)
    const start = mouseDownRef.current
    mouseDownRef.current = null
    if (!start) return

    const dx = e.clientX - start.x

    // Horizontal drag → switch brand
    if (start.moved && Math.abs(dx) > 50) {
      goNextClient(dx < 0 ? 1 : -1)
      return
    }

    // Click (no meaningful drag) → navigate within brand
    if (Math.abs(dx) < 10) {
      const rect = e.currentTarget.getBoundingClientRect()
      const relX = e.clientX - rect.left
      if (relX < rect.width * 0.35) goPrev()
      else goNext()
    }
  }, [goNextClient, goPrev, goNext])

  // Cancel drag if mouse leaves
  const handleMouseLeave = useCallback(() => {
    if (mouseDownRef.current) {
      mouseDownRef.current = null
      setPaused(false)
    }
  }, [])

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
      {/* Brand slide — animates on client switch */}
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

          {/* Left / right tap zones — subtle visual hint on hover */}
          <div className="absolute inset-y-0 left-0 w-[35%] z-20" style={{ cursor: 'w-resize' }} />
          <div className="absolute inset-y-0 right-0 w-[65%] z-20" style={{ cursor: 'e-resize' }} />

          {/* Story image — anchored to top so brand header overlays the image */}
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

          {/* Brand navigation hint — shown when multiple brands available */}
          {storySets.length > 1 && (
            <div className="absolute bottom-8 inset-x-0 z-30 flex justify-center gap-1.5 pointer-events-none">
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
    </motion.div>
  )
}
