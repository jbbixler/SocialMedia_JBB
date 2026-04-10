'use client'

import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'
import { copyToClipboard } from '@/lib/clipboard'
import { haptic } from '@/lib/haptic'
import { useBookmarks } from '@/context/BookmarkContext'
import { useTheme } from '@/context/DarkModeContext'
import LazyVideo from '../LazyVideo'
import type { Ad, Client } from '@/types'

interface Props {
  ad: Ad
  client: Client
  postKey: string
  onAvatarClick: () => void
  onContact: () => void
  onShare: () => void
  personal?: boolean
}

export default function MobilePost({ ad, client, postKey, onAvatarClick, onContact, onShare, personal }: Props) {
  const postRef  = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const lastTapRef = useRef(0)

  const { toggle, isSaved } = useBookmarks()
  const { dark, hotPink } = useTheme()

  const [liked, setLiked] = useState(false)
  const [muted, setMuted] = useState(true)
  const [heartPos, setHeartPos] = useState<{ x: number; y: number } | null>(null)
  const [heartKey, setHeartKey] = useState(0)
  const [showMenu, setShowMenu] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentSent, setCommentSent] = useState(false)
  const [comments, setComments] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(`comments_${postKey}`) || '[]') } catch { return [] }
  })

  const bookmarked = isSaved(postKey)
  const handle = client.igHandle || client.id
  const seed = postKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const likes = (seed * 1337 % 8000) + 500
  const cta = client.cta || 'Learn More'

  // Theme colors
  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const textColor = dark || hotPink ? '#fff' : '#1d1d1f'
  const subColor = dark || hotPink ? 'rgba(255,255,255,0.5)' : '#8e8e8e'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
  const iconStroke = dark || hotPink ? '#fff' : '#1d1d1f'
  const menuBg = dark || hotPink ? '#1c1c1e' : '#fff'
  const menuText = dark || hotPink ? '#fff' : '#1d1d1f'
  const inputBg = dark || hotPink ? '#1a1a1a' : '#f5f5f7'

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
      haptic([30, 20, 60])
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

  const handleBookmark = () => {
    toggle({ ad, client, key: postKey })
  }

  const handleComment = useCallback(async () => {
    const text = commentText.trim()
    if (!text) return
    // Add locally immediately
    const updated = [...comments, text]
    setComments(updated)
    try { localStorage.setItem(`comments_${postKey}`, JSON.stringify(updated)) } catch {}
    setCommentSent(true)
    setShowComment(false)
    setCommentText('')
    setTimeout(() => setCommentSent(false), 100)
    // Email notification (fire-and-forget)
    fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: text, clientName: client.name, adIndex: postKey, adSrc: ad.src }),
    }).catch(() => {})
  }, [commentText, comments, client.name, postKey])

  return (
    <>
      <article ref={postRef} className="border-b" style={{ background: bg, borderColor, transition: 'background 0.4s ease' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <button
            onClick={onAvatarClick}
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border"
            style={{ background: client.color || '#27272a', borderColor }}
          >
            <img src={client.igAvatar || client.logo} alt={handle} className="w-full h-full object-contain" />
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={onAvatarClick} className="text-[13px] font-semibold leading-tight block text-left" style={{ color: textColor }}>
              {handle}
            </button>
            {!personal && <span className="text-[11px]" style={{ color: subColor }}>Sponsored</span>}
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
                      onClick={() => { setShowMenu(false); onAvatarClick() }}
                      className="w-full text-left px-4 py-3.5 text-[14px] border-b"
                      style={{ color: menuText, borderColor }}
                    >
                      About this account
                    </button>
                    {client.website && (
                      <a
                        href={client.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowMenu(false)}
                        className="w-full text-left px-4 py-3.5 text-[14px] flex items-center gap-2 block"
                        style={{ color: menuText }}
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
        <div ref={mediaRef} className="w-full relative select-none" style={{ background: '#111' }} onTouchEnd={handleTouchEnd}>
          {ad.type === 'image' ? (
            <img src={ad.src} alt="" className="w-full block object-cover" loading="lazy" />
          ) : (
            <>
              <LazyVideo videoRef={videoRef} src={ad.src} muted loop playsInline className="w-full block object-cover" />
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

        {/* CTA button — hidden for personal posts */}
        {!personal && (
          <div className="px-3 pt-2">
            <button
              onClick={onAvatarClick}
              className="w-full py-2 rounded-lg text-[13px] font-semibold border"
              style={{ borderColor: '#0095f6', color: '#fff', background: '#0095f6' }}
            >
              {cta}
            </button>
          </div>
        )}

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
              {comments.length > 0 && (
                <span className="text-[12px] font-medium" style={{ color: subColor }}>{comments.length}</span>
              )}
            </button>
            {/* Send → clipboard */}
            <button onClick={() => { copyToClipboard('https://social-media-4qprfs6vv-jbbixlers-projects.vercel.app/').then(() => onShare()).catch(() => onShare()) }}>
              <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" fill="none" stroke={iconStroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          {/* Bookmark */}
          <button onClick={handleBookmark}>
            <svg className="w-[26px] h-[26px]" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              fill={bookmarked ? iconStroke : 'none'}
              stroke={iconStroke}
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        </div>

        {/* Likes */}
        <div className="px-3 pb-0.5 text-[13px] font-semibold" style={{ color: textColor }}>
          {(likes + (liked ? 1 : 0)).toLocaleString()} likes
        </div>

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
            <button onClick={() => setShowComment(true)} className="text-[12px] text-left mt-0.5" style={{ color: subColor }}>
              Add a comment…
            </button>
          </div>
        )}

      </article>

      {/* Comment sheet */}
      <AnimatePresence>
        {showComment && (
          <>
            <motion.div
              className="fixed inset-0 z-[100] bg-black/50"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowComment(false)}
            />
            <motion.div
              className="fixed bottom-0 inset-x-0 z-[101] rounded-t-2xl p-5 pb-8"
              style={{ background: menuBg }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            >
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-4" />
              <p className="text-[15px] font-semibold mb-3 text-center" style={{ color: menuText }}>Leave a comment</p>
              <p className="text-[12px] text-center mb-4" style={{ color: subColor }}>on @{handle}'s ad</p>
              {commentSent ? (
                <p className="text-center text-[14px]" style={{ color: subColor }}>Comment sent! Thanks.</p>
              ) : (
                <>
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Write your thoughts…"
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-[14px] outline-none resize-none"
                    style={{ background: inputBg, color: menuText, border: `1px solid ${borderColor}` }}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim()}
                    className="w-full mt-3 py-3 rounded-xl text-[14px] font-semibold"
                    style={{ background: commentText.trim() ? '#0095f6' : (dark ? '#333' : '#e0e0e0'), color: commentText.trim() ? '#fff' : subColor }}
                  >
                    Send comment
                  </button>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
