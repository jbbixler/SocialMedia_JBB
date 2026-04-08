'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Ad, Client } from '@/types'

interface Props {
  ads: Ad[]
  startIndex: number
  client: Client
  onClose: () => void
}

export default function Lightbox({ ads, startIndex, client, onClose }: Props) {
  const [index, setIndex] = useState(startIndex)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ad = ads[index]

  const prev = () => setIndex(i => Math.max(0, i - 1))
  const next = () => setIndex(i => Math.min(ads.length - 1, i + 1))

  // Keyboard navigation
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  // Autoplay video on index change, try unmuted first
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = false
    v.play().catch(() => {
      v.muted = true
      v.play().catch(() => {})
    })
  }, [index])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      {/* Counter */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[11px] text-white/40 tracking-widest uppercase tabular-nums pointer-events-none">
        {index + 1} / {ads.length}
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        title="Close (Esc)"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13" />
          <line x1="13" y1="1" x2="1" y2="13" />
        </svg>
      </button>

      {/* Media */}
      <div
        className="relative flex items-center justify-center"
        style={{ maxWidth: 'min(88vw, 640px)', maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {ad.type === 'image' ? (
          <img
            key={ad.src}
            src={ad.src}
            alt=""
            className="rounded-xl object-contain shadow-2xl"
            style={{ maxWidth: '100%', maxHeight: '88vh' }}
          />
        ) : (
          <video
            key={ad.src}
            ref={videoRef}
            src={ad.src}
            loop
            playsInline
            className="rounded-xl object-contain shadow-2xl"
            style={{ maxWidth: '100%', maxHeight: '88vh' }}
          />
        )}
      </div>

      {/* Prev */}
      <button
        onClick={e => { e.stopPropagation(); prev() }}
        disabled={index === 0}
        className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
        title="Previous (←)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Next */}
      <button
        onClick={e => { e.stopPropagation(); next() }}
        disabled={index === ads.length - 1}
        className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white disabled:opacity-20 disabled:pointer-events-none transition-colors"
        title="Next (→)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </motion.div>
  )
}
