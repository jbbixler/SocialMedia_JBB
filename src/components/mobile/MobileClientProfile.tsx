'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { copyToClipboard } from '@/lib/clipboard'
import type { Client, Ad } from '@/types'

interface Props {
  client: Client
  onBack: () => void
  onClientSelect?: (c: Client) => void
  onProfileSelect: () => void
}

type ProfileTab = 'posts' | 'reels'

export default function MobileClientProfile({ client, onBack, onClientSelect, onProfileSelect }: Props) {
  const [descExpanded, setDescExpanded] = useState(false)
  const [tab, setTab] = useState<ProfileTab>('posts')
  const [feedStartIndex, setFeedStartIndex] = useState<number | null>(null)

  const handle = client.igHandle || client.id
  const reelAds = client.ads.filter(ad => ad.ratio === '9:16')
  const totalPosts = client.ads.length

  // When a grid thumb is tapped, open the post feed starting at that index
  if (feedStartIndex !== null) {
    return (
      <motion.div
        className="flex-1 flex flex-col bg-white overflow-hidden"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <ClientPostFeed
          client={client}
          ads={tab === 'reels' ? reelAds : client.ads}
          startIndex={feedStartIndex}
          onBack={() => setFeedStartIndex(null)}
          onProfileSelect={onProfileSelect}
        />
      </motion.div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white" style={{ paddingBottom: 'calc(49px + env(safe-area-inset-bottom))' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-black/[0.06] flex items-center gap-3 px-3 h-[44px]">
        <button onClick={onBack} className="p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span
          className="text-[17px] font-semibold text-[#1d1d1f] tracking-[-0.02em]"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          {handle}
        </span>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start gap-5">
          <div
            className="w-[86px] h-[86px] rounded-full flex-shrink-0 overflow-hidden border border-black/[0.08] flex items-center justify-center"
            style={{ background: client.color || '#27272a' }}
          >
            <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 flex items-center justify-around pt-2">
            <Stat label="Posts" value={totalPosts} />
            <Stat label="Work" value="Full" />
            <Stat label="Since" value="2025" />
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[13px] font-semibold text-[#1d1d1f]">{client.name}</p>
          {client.services.length > 0 && (
            <p className="text-[12px] text-zinc-500 mt-0.5">{client.services.slice(0, 3).join(' · ')}</p>
          )}
          {client.description && (
            <div className="mt-1.5">
              <p className="text-[13px] text-[#1d1d1f] leading-snug">
                {descExpanded ? client.description : client.description.slice(0, 120) + (client.description.length > 120 ? '…' : '')}
              </p>
              {client.description.length > 120 && (
                <button onClick={() => setDescExpanded(v => !v)} className="text-[13px] text-zinc-400 mt-0.5">
                  {descExpanded ? 'less' : 'more'}
                </button>
              )}
            </div>
          )}
          {client.website && (
            <a href={client.website} target="_blank" rel="noopener noreferrer"
              className="text-[13px] font-medium mt-1 block" style={{ color: '#00376b' }}>
              {client.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={onProfileSelect}
            className="flex-1 text-center py-1.5 rounded-lg bg-[#efefef] text-[13px] font-semibold text-[#1d1d1f]"
          >
            Contact
          </button>
          {client.website && (
            <a href={client.website} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-center py-1.5 rounded-lg bg-[#efefef] text-[13px] font-semibold text-[#1d1d1f]">
              Visit Site
            </a>
          )}
        </div>
      </div>

      {/* Posts / Reels tab bar */}
      <div className="flex border-t border-black/[0.08]">
        <button
          onClick={() => setTab('posts')}
          className="flex-1 flex items-center justify-center py-2.5 gap-1.5"
          style={{ borderBottom: tab === 'posts' ? '2px solid #1d1d1f' : '2px solid transparent' }}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"
            stroke={tab === 'posts' ? '#1d1d1f' : '#8e8e8e'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        {reelAds.length > 0 && (
          <button
            onClick={() => setTab('reels')}
            className="flex-1 flex items-center justify-center py-2.5"
            style={{ borderBottom: tab === 'reels' ? '2px solid #1d1d1f' : '2px solid transparent' }}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24"
              fill={tab === 'reels' ? '#1d1d1f' : 'none'}
              stroke={tab === 'reels' ? '#1d1d1f' : '#8e8e8e'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="3" />
              <path fill={tab === 'reels' ? 'white' : '#8e8e8e'} stroke="none" d="M10 8l6 4-6 4V8z" />
            </svg>
          </button>
        )}
      </div>

      {/* Grid */}
      {tab === 'posts' && (
        <div className="grid grid-cols-3 gap-[1.5px] bg-[#f0f0f0]">
          {client.ads.map((ad, i) => (
            <GridThumb key={i} ad={ad} onClick={() => setFeedStartIndex(i)} />
          ))}
        </div>
      )}

      {tab === 'reels' && (
        <div className="grid grid-cols-3 gap-[1.5px] bg-[#f0f0f0]">
          {reelAds.map((ad, i) => (
            <GridThumb key={i} ad={ad} isReel onClick={() => setFeedStartIndex(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vertical post feed opened when a grid thumb is tapped ────────────────────
function ClientPostFeed({ client, ads, startIndex, onBack, onProfileSelect }: {
  client: Client
  ads: Ad[]
  startIndex: number
  onBack: () => void
  onProfileSelect: () => void
}) {
  const feedRef = useRef<HTMLDivElement>(null)
  const [showCopied, setShowCopied] = useState(false)

  const handleShare = useCallback(() => {
    setShowCopied(true)
    setTimeout(() => setShowCopied(false), 2000)
  }, [])

  // Scroll to the tapped post on mount
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    requestAnimationFrame(() => {
      const target = feed.querySelector(`[data-post-index="${startIndex}"]`) as HTMLElement | null
      if (target) feed.scrollTop = target.offsetTop
    })
  }, [startIndex])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center gap-3 px-3 h-[44px] border-b border-black/[0.06] bg-white z-30">
        <button onClick={onBack} className="p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d1d1f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-[#1d1d1f]">Posts</span>
      </div>

      {/* Scrollable posts */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 'calc(49px + env(safe-area-inset-bottom))' }}
      >
        {ads.map((ad, i) => (
          <div key={i} data-post-index={i} className={i > 0 ? 'border-t border-black/[0.06]' : ''}>
            <FeedPost ad={ad} client={client} index={i} onShare={handleShare} onContact={onProfileSelect} />
          </div>
        ))}
      </div>

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

// ── Individual post in the feed ───────────────────────────────────────────────
function FeedPost({ ad, client, index, onShare, onContact }: { ad: Ad; client: Client; index: number; onShare: () => void; onContact: () => void }) {
  const postRef  = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [liked, setLiked] = useState(false)
  const [muted, setMuted] = useState(true)
  const [showHeart, setShowHeart] = useState(false)
  const [heartKey, setHeartKey] = useState(0)
  const lastTapRef = useRef(0)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handle = client.igHandle || client.id
  const seed = index * 1337 + 1234
  const likes = ((seed % 8000) + 500) + (liked ? 1 : 0)
  const cta = client.cta || 'Learn More'

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
      setLiked(true)
      setShowHeart(true)
      setHeartKey(k => k + 1)
      setTimeout(() => setShowHeart(false), 900)
    }
    lastTapRef.current = now
  }, [])

  return (
    <article ref={postRef} className="bg-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-black/[0.06]" style={{ background: client.color || '#27272a' }}>
          <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold text-[#1d1d1f] leading-tight">{handle}</span>
          <span className="block text-[11px] text-zinc-400">Sponsored</span>
        </div>
        <button className="text-[#1d1d1f] text-xl px-1 cursor-default leading-none">···</button>
      </div>

      {/* Media */}
      <div className="w-full relative bg-zinc-100 select-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {ad.type === 'image' ? (
          <img src={ad.src} alt="" className="w-full block object-cover" loading="lazy" />
        ) : (
          <>
            <video ref={videoRef} src={ad.src} muted loop playsInline preload="metadata" className="w-full block object-cover" />
            <button
              onClick={e => { e.stopPropagation(); const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted) }}
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
        <AnimatePresence>
          {showHeart && (
            <motion.div key={heartKey}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
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
                fill={liked ? '#fe3c72' : 'none'} stroke={liked ? '#fe3c72' : '#1d1d1f'}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>
          </button>
          <button onClick={onContact}>
            <svg className="w-[26px] h-[26px] stroke-[#1d1d1f]" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button onClick={() => copyToClipboard('https://jbradbixler.com/').then(onShare).catch(onShare)}>
            <svg className="w-[26px] h-[26px] stroke-[#1d1d1f]" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <svg className="w-[26px] h-[26px] stroke-[#1d1d1f]" viewBox="0 0 24 24" fill="none" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </div>

      <div className="px-3 pb-0.5 text-[13px] font-semibold text-[#1d1d1f]">{likes.toLocaleString()} likes</div>
      {ad.caption && (
        <div className="px-3 pb-2 text-[13px] text-[#1d1d1f] leading-snug">
          <span className="font-semibold mr-1">{handle}</span>{ad.caption}
        </div>
      )}
      <div className="px-3 pb-3">
        <button className="w-full py-2 rounded-md bg-[#0095f6] text-white text-[13px] font-semibold">{cta}</button>
      </div>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[16px] font-semibold text-[#1d1d1f]">{value}</span>
      <span className="text-[12px] text-[#1d1d1f]">{label}</span>
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
          <video ref={videoRef} src={ad.src} muted playsInline preload="metadata" className="w-full h-full object-cover"
            onLoadedMetadata={e => { const v = e.currentTarget; v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5 }} />
          <div className="absolute top-1.5 right-1.5">
            <svg className="w-4 h-4 fill-white drop-shadow" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4zm-2 7H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2z" />
            </svg>
          </div>
        </>
      )}
      {isReel && ad.type === 'image' && (
        <div className="absolute top-1.5 right-1.5">
          <svg className="w-4 h-4 fill-white drop-shadow" viewBox="0 0 24 24">
            <rect x="2" y="2" width="20" height="20" rx="3" />
          </svg>
        </div>
      )}
    </button>
  )
}
