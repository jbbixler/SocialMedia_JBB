'use client'

import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import type { Ad, Client } from '@/types'

interface Props {
  ad: Ad
  client: Client
  adIndex: number
  isInitial: boolean
  dark?: boolean
  commentPortal?: HTMLElement | null
  onMediaClick?: () => void
  onShare?: () => void
}

export default function IgPost({ ad, client, adIndex, isInitial, dark = true, commentPortal, onMediaClick, onShare }: Props) {
  const postRef  = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef(0)

  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(() => {
    if (typeof window === 'undefined') return false
    try { return JSON.parse(localStorage.getItem(`bm_ig_${client.id}_${adIndex}`) || 'false') } catch { return false }
  })
  const [comments, setComments] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(`comments_${client.id}-${adIndex}`) || '[]') } catch { return [] }
  })
  const [showMenu, setShowMenu] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null)
  const [heartKey, setHeartKey] = useState(0)

  const handle = client.igHandle || client.id
  const likes  = ((adIndex * 1337 + 1234) % 8000) + 500 + (liked ? 1 : 0)
  const cta    = client.cta || 'Learn More'

  const bg        = dark ? '#000' : '#fff'
  const textColor = dark ? '#fff' : '#1d1d1f'
  const subColor  = dark ? 'rgba(255,255,255,0.5)' : '#8e8e8e'
  const borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const iconStroke  = dark ? '#fff' : '#1d1d1f'
  const menuBg      = dark ? '#1c1c1e' : '#fff'
  const inputBg     = dark ? '#1a1a1a' : '#f5f5f7'

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

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    triggerHeart(e.clientX, e.clientY)
  }, [triggerHeart])

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const toggleBookmark = () => {
    const next = !bookmarked
    setBookmarked(next)
    try { localStorage.setItem(`bm_ig_${client.id}_${adIndex}`, JSON.stringify(next)) } catch {}
  }

  const handleComment = useCallback(() => {
    const text = commentText.trim()
    if (!text) return
    const updated = [...comments, text]
    setComments(updated)
    try { localStorage.setItem(`comments_${client.id}-${adIndex}`, JSON.stringify(updated)) } catch {}
    setCommentText('')
    setShowComment(false)
    fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: text, clientName: client.name, adIndex: `${client.id}-${adIndex}`, adSrc: ad.src }),
    }).catch(() => {})
  }, [commentText, comments, client.name, client.id, adIndex, ad.src])

  const MediaWrapper = isInitial ? motion.div : 'div'
  const mediaProps   = isInitial ? { layoutId: `ad-media-${client.id}-${adIndex}` } : {}

  return (
    <div ref={postRef} style={{ background: bg, transition: 'background 0.3s ease' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          onClick={onMediaClick}
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border"
          style={{ background: client.color || '#27272a', borderColor }}
        >
          <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </button>
        <div className="flex-1 min-w-0">
          <button onClick={onMediaClick} className="text-[13px] font-semibold leading-tight block text-left" style={{ color: textColor }}>{handle}</button>
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
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-7 z-50 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
                  style={{ background: menuBg, border: `1px solid ${borderColor}` }}
                >
                  <button
                    onClick={() => { setShowMenu(false); onMediaClick?.() }}
                    className="w-full text-left px-4 py-3.5 text-[14px] border-b"
                    style={{ color: textColor, borderColor }}
                  >About this account</button>
                  {client.website && (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowMenu(false)}
                      className="w-full text-left px-4 py-3.5 text-[14px] flex items-center gap-2 block"
                      style={{ color: textColor }}
                    >
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
      <MediaWrapper
        {...mediaProps}
        ref={mediaRef}
        data-ratio={ad.ratio}
        className="w-full bg-zinc-900 relative overflow-hidden select-none"
        onDoubleClick={handleDoubleClick}
      >
        {ad.type === 'image' ? (
          <img src={ad.src} alt="" className="w-full h-full object-cover block" loading="lazy" />
        ) : (
          <>
            <video ref={videoRef} src={ad.src} muted loop playsInline preload="metadata" className="w-full h-full object-cover block" />
            <button
              onClick={toggleMute}
              className="absolute bottom-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
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

        {/* Double-click heart */}
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
      </MediaWrapper>

      {/* CTA */}
      <div className="px-3 pt-2">
        <button
          onClick={onMediaClick}
          className="w-full py-2 rounded-lg text-[13px] font-semibold border"
          style={{ borderColor, color: textColor, background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }}
        >
          {cta}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-4">
          {/* Heart */}
          <button onClick={() => setLiked(l => !l)}>
            <motion.div animate={liked ? { scale: [1, 1.35, 0.88, 1.1, 1] } : { scale: 1 }} transition={{ duration: 0.38, times: [0, 0.2, 0.5, 0.7, 1] }}>
              <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24"
                fill={liked ? '#fe3c72' : 'none'}
                stroke={liked ? '#fe3c72' : iconStroke}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>
          </button>
          {/* Comment */}
          <button onClick={() => setShowComment(true)} className="flex items-center gap-1">
            <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {comments.length > 0 && <span className="text-[12px] font-medium" style={{ color: subColor }}>{comments.length}</span>}
          </button>
          {/* Share */}
          <button onClick={() => { navigator.clipboard.writeText('https://jbradbixler.com/').catch(() => {}); onShare?.() }}>
            <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {/* Bookmark */}
        <button onClick={toggleBookmark}>
          <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
            fill={bookmarked ? iconStroke : 'none'} stroke={iconStroke}
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      {/* Likes */}
      <div className="px-3 pb-0.5 text-[13px] font-semibold" style={{ color: textColor }}>{likes.toLocaleString()} likes</div>

      {/* Caption */}
      {ad.caption && (
        <div className="px-3 pb-2 text-[13px] leading-snug" style={{ color: textColor }}>
          <span className="font-semibold mr-1">{handle}</span>{ad.caption}
        </div>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <div className="px-3 pb-1 flex flex-col gap-1">
          {comments.map((c, i) => (
            <div key={i} className="text-[13px] leading-snug" style={{ color: textColor }}>
              <span className="font-semibold mr-1">you</span>{c}
            </div>
          ))}
          <button onClick={() => setShowComment(true)} className="text-[12px] text-left mt-0.5" style={{ color: subColor }}>Add a comment…</button>
        </div>
      )}

      {/* Comment sheet — portaled into phone frame on desktop, fixed on mobile */}
      {showComment && (() => {
        const sheet = (
          <AnimatePresence>
            {showComment && (
              <>
                <motion.div
                  style={{ position: commentPortal ? 'absolute' : 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)' }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowComment(false)}
                />
                <motion.div
                  style={{ position: commentPortal ? 'absolute' : 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, background: menuBg, borderRadius: '16px 16px 0 0', padding: '20px 20px 32px' }}
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                >
                  <div style={{ width: 40, height: 4, borderRadius: 9999, background: dark ? '#555' : '#d1d1d6', margin: '0 auto 16px' }} />
                  <p className="text-[15px] font-semibold mb-3 text-center" style={{ color: textColor }}>Leave a comment</p>
                  <p className="text-[12px] text-center mb-4" style={{ color: subColor }}>on @{handle}'s ad</p>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write your thoughts…"
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-[14px] outline-none resize-none"
                    style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    className="w-full mt-3 py-3 rounded-xl text-[14px] font-semibold"
                    style={{ background: commentText.trim() ? '#0095f6' : (dark ? '#333' : '#e0e0e0'), color: commentText.trim() ? '#fff' : subColor }}
                  >
                    Send comment
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        )
        return commentPortal ? createPortal(sheet, commentPortal) : sheet
      })()}
    </div>
  )
}
