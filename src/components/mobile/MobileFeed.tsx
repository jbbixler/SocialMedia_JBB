'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import MobilePost from './MobilePost'
import type { Client, Ad } from '@/types'

interface Props {
  onClientSelect: (client: Client) => void
  onProfileSelect: () => void
}

interface AdWithClient { ad: Ad; client: Client; key: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function MobileFeed({ onClientSelect, onProfileSelect }: Props) {
  const { clients, about } = usePortfolio()
  const [allAds, setAllAds] = useState<AdWithClient[]>([])
  const [rendered, setRendered] = useState(12)
  const [showCopied, setShowCopied] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const pairs: AdWithClient[] = []
    clients.forEach(c => c.ads.forEach((ad, i) => pairs.push({ ad, client: c, key: `${c.id}-${i}` })))
    setAllAds(shuffle(pairs))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setRendered(r => Math.min(r + 12, allAds.length))
    }, { rootMargin: '400px' })
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [allAds.length])

  const handleShare = useCallback(() => {
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }, [])

  const visible = allAds.slice(0, rendered)

  return (
    <div className="flex-1 overflow-y-auto bg-white" style={{ paddingBottom: 'calc(49px + env(safe-area-inset-bottom))' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-black/[0.06] flex items-center justify-between px-4 h-[44px]">
        <span
          className="text-[22px] font-semibold tracking-[-0.03em] text-[#1d1d1f]"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          {about?.name || 'James Bradley'}
        </span>
        <button onClick={onProfileSelect}>
          <svg className="w-6 h-6 stroke-[#1d1d1f]" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Stories */}
      <div className="flex gap-4 px-4 py-3 overflow-x-auto border-b border-black/[0.06]" style={{ scrollbarWidth: 'none' }}>
        {/* "Me" story — always first */}
        {about && (
          <button
            onClick={onProfileSelect}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
            title={about.name}
          >
            <div className="relative w-[62px] h-[62px]">
              <div
                className="w-full h-full rounded-full p-[2.5px]"
                style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
              >
                <div
                  className="w-full h-full rounded-full overflow-hidden border-2 border-white flex items-center justify-center"
                  style={{ background: about.color || '#1d1d1f' }}
                >
                  {about.avatar ? (
                    <img src={about.avatar} alt={about.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-semibold">{about.name.charAt(0)}</span>
                  )}
                </div>
              </div>
              {/* Green active dot */}
              <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#22c55e] border-2 border-white" />
            </div>
            <span className="text-[11px] text-[#1d1d1f] max-w-[62px] truncate">{about.handle || 'you'}</span>
          </button>
        )}

        {clients.map(c => (
          <button
            key={c.id}
            onClick={() => onClientSelect(c)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div
              className="w-[62px] h-[62px] rounded-full p-[2.5px]"
              style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden border-2 border-white flex items-center justify-center"
                style={{ background: c.color || '#27272a' }}
              >
                <img src={c.igAvatar || c.logo} alt={c.name} className="w-full h-full object-contain" />
              </div>
            </div>
            <span className="text-[11px] text-[#1d1d1f] max-w-[62px] truncate">{c.igHandle || c.id}</span>
          </button>
        ))}
      </div>

      {/* Feed posts */}
      {visible.map(({ ad, client, key }) => (
        <MobilePost
          key={key}
          ad={ad}
          client={client}
          postKey={key}
          onAvatarClick={() => onClientSelect(client)}
          onContact={onProfileSelect}
          onShare={handleShare}
        />
      ))}
      {rendered < allAds.length && <div ref={sentinelRef} className="h-4" />}

      {/* Copied toast */}
      <AnimatePresence>
        {showCopied && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#1d1d1f]/90 text-white text-xs font-medium whitespace-nowrap z-50 pointer-events-none"
          >
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
