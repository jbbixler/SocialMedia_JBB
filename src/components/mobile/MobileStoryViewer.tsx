'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Client, Ad } from '@/types'

interface StorySet {
  client: Client
  images: Ad[]  // 9:16 static images only
}

interface Props {
  storySets: StorySet[]
  initialClientIndex: number
  onClose: () => void
}

const STORY_DURATION = 5000 // ms per story

export default function MobileStoryViewer({ storySets, initialClientIndex, onClose }: Props) {
  const [clientIdx, setClientIdx] = useState(initialClientIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [paused, setPaused] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(null)

  const currentSet = storySets[clientIdx]
  const images = currentSet?.images ?? []
  const totalStories = images.length

  const goNext = useCallback(() => {
    if (storyIdx < totalStories - 1) {
      setStoryIdx(s => s + 1)
      setProgress(0)
    } else if (clientIdx < storySets.length - 1) {
      setClientIdx(c => c + 1)
      setStoryIdx(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [storyIdx, totalStories, clientIdx, storySets.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1)
      setProgress(0)
    } else if (clientIdx > 0) {
      setClientIdx(c => c - 1)
      setStoryIdx(0)
      setProgress(0)
    }
  }, [storyIdx, clientIdx])

  // Auto-advance timer using rAF for smooth progress bar
  useEffect(() => {
    if (paused) return
    progressRef.current = 0
    startTimeRef.current = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current
      const p = Math.min(elapsed / STORY_DURATION, 1)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        goNext()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [storyIdx, clientIdx, paused, goNext])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    setPaused(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setPaused(false)
    const start = touchStartRef.current
    if (!start) return
    const dx = e.changedTouches[0].clientX - start.x
    const dy = e.changedTouches[0].clientY - start.y
    const dt = Date.now() - start.t
    touchStartRef.current = null

    // Swipe down → close
    if (dy > 80 && Math.abs(dx) < 60) { onClose(); return }

    // Quick tap — navigate
    if (dt < 250 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      const screenW = window.innerWidth
      if (e.changedTouches[0].clientX < screenW * 0.35) goPrev()
      else goNext()
    }
  }

  if (!currentSet || images.length === 0) {
    onClose()
    return null
  }

  const ad = images[storyIdx]
  const handle = currentSet.client.igHandle || currentSet.client.id

  return (
    <motion.div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars */}
      <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-2 pt-2">
        {images.map((_, i) => (
          <div key={i} className="flex-1 h-[2px] rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < storyIdx ? '100%' : i === storyIdx ? `${progress * 100}%` : '0%',
                transition: i === storyIdx ? 'none' : undefined,
              }}
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
        <button onClick={onClose} className="ml-auto p-1">
          <svg className="w-6 h-6 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Image */}
      <AnimatePresence mode="wait">
        <motion.img
          key={`${clientIdx}-${storyIdx}`}
          src={ad.src}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      </AnimatePresence>

      {/* Client switcher arrows — appear when at edge */}
      {clientIdx > 0 && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/30"
          onClick={e => { e.stopPropagation(); setClientIdx(c => c - 1); setStoryIdx(0); setProgress(0) }}
        >
          <svg className="w-4 h-4 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      {clientIdx < storySets.length - 1 && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 flex items-center justify-center rounded-full bg-black/30"
          onClick={e => { e.stopPropagation(); setClientIdx(c => c + 1); setStoryIdx(0); setProgress(0) }}
        >
          <svg className="w-4 h-4 stroke-white" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </motion.div>
  )
}
