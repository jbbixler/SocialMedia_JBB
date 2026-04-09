'use client'

import { useState, useRef, useEffect, useCallback, RefObject } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBookmarks } from '@/context/BookmarkContext'
import { useTheme } from '@/context/DarkModeContext'
import MobilePost from './MobilePost'
import type { Ad, Client } from '@/types'

interface SavedAdItem { ad: Ad; client: Client; key: string }

function useSwipeBack(onBack: () => void): RefObject<HTMLDivElement> {
  const elRef = useRef<HTMLDivElement>(null)
  const touchRef = useRef<{ startX: number; startY: number; locked: boolean } | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    const onStart = (e: TouchEvent) => {
      touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: false }
      el.style.transition = 'none'
    }
    const onMove = (e: TouchEvent) => {
      const t = touchRef.current
      if (!t) return
      const dx = e.touches[0].clientX - t.startX
      const dy = Math.abs(e.touches[0].clientY - t.startY)
      if (!t.locked) {
        if (dy > 10 && dy > Math.abs(dx)) { touchRef.current = null; return }
        t.locked = true
      }
      if (dx > 0) el.style.transform = `translateX(${dx}px)`
    }
    const onEnd = (e: TouchEvent) => {
      const t = touchRef.current
      touchRef.current = null
      el.style.transition = 'transform 0.25s ease'
      if (!t) return
      const dx = e.changedTouches[0].clientX - t.startX
      if (dx > 80) {
        el.style.transform = 'translateX(100%)'
        setTimeout(onBack, 230)
      } else {
        el.style.transform = 'translateX(0)'
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onBack])

  return elRef
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hey! I'm here to help match you with the right social media creative strategy. To get started — what kind of brand or product are you looking to advertise?",
}

export default function MobileSavedTab() {
  const { saved } = useBookmarks()
  const { dark, hotPink } = useTheme()
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const feedOverlayRef = useRef<HTMLDivElement>(null)
  const swipeRef = useSwipeBack(() => setViewingIndex(null))
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'
  const cardBg = hotPink ? 'rgba(255,255,255,0.15)' : dark ? '#111' : '#f5f5f7'
  const textColor = dark || hotPink ? '#fff' : '#1d1d1f'
  const subColor = dark || hotPink ? 'rgba(255,255,255,0.55)' : '#8e8e8e'
  const borderColor = dark || hotPink ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
  const inputBg = dark || hotPink ? '#1a1a1a' : '#efefef'

  useEffect(() => {
    // Skip initial mount — only auto-scroll when new messages are added
    if (messages.length <= 1) return
    // Scroll within the container directly — avoids propagating to the outer page
    const el = scrollContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: data.content ?? "Thanks for sharing that! Let me know more about your goals." }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "Something went wrong. Try again in a moment." }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const sendLead = useCallback(async () => {
    setSent(true)
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      })
    } catch {}
  }, [messages])

  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ background: bg, paddingBottom: 'calc(49px + env(safe-area-inset-bottom))', transition: 'background 0.4s ease' }}
    >
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-center h-[44px] border-b" style={{ borderColor }}>
        <span
          className="text-[17px] font-semibold tracking-[-0.02em]"
          style={{ color: textColor, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          Direct
        </span>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* ── Chatbot section ───────────────────────────────────────────── */}
        <div className="px-4 pt-4 pb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: subColor }}>
            Let's Talk
          </p>

          {/* Message thread */}
          <div className="flex flex-col gap-2.5 mb-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-snug"
                  style={{
                    background: m.role === 'user'
                      ? (hotPink ? '#fff' : '#0095f6')
                      : cardBg,
                    color: m.role === 'user'
                      ? (hotPink ? '#3d4e28' : '#fff')
                      : textColor,
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl text-[13px]" style={{ background: cardBg, color: subColor, borderRadius: '18px 18px 18px 4px' }}>
                  Typing…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row */}
          {!sent ? (
            <div className="flex gap-2 items-end">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Message…"
                className="flex-1 rounded-full px-4 py-2 text-[14px] outline-none"
                style={{ background: inputBg, color: textColor, border: `1px solid ${borderColor}` }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: input.trim() ? (hotPink ? '#fff' : '#0095f6') : 'transparent', transition: 'background 0.2s' }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() ? (hotPink ? '#3d4e28' : '#fff') : subColor}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          ) : null}

          {/* Send to James CTA — appears after a few messages */}
          {messages.length >= 5 && !sent && (
            <button
              onClick={sendLead}
              className="w-full mt-3 py-2.5 rounded-full text-[13px] font-semibold"
              style={{ background: hotPink ? '#fff' : '#0095f6', color: hotPink ? '#3d4e28' : '#fff' }}
            >
              Send to James
            </button>
          )}
          {sent && (
            <p className="text-center text-[13px] mt-3" style={{ color: subColor }}>
              Sent! James will be in touch soon.
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 my-2 border-t" style={{ borderColor }} />

        {/* ── Saved ads section ─────────────────────────────────────────── */}
        <div className="px-4 pt-2 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: subColor }}>
            Saved ({saved.length})
          </p>

          {saved.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke={subColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              <p className="text-[13px]" style={{ color: subColor }}>Save ads you like to view them here</p>
            </div>
          ) : (
            <div className="columns-2 gap-2">
              {saved.map((item, idx) => (
                <button
                  key={item.key}
                  onClick={() => setViewingIndex(idx)}
                  className="break-inside-avoid mb-2 rounded-xl overflow-hidden w-full text-left"
                  style={{ border: `1px solid ${borderColor}` }}
                >
                  {item.ad.type === 'image' ? (
                    <img src={item.ad.src} alt="" className="w-full block object-cover" loading="lazy" />
                  ) : (
                    <video
                      src={item.ad.src}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full block object-cover"
                      onLoadedMetadata={e => {
                        const v = e.currentTarget
                        v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5
                      }}
                    />
                  )}
                  <div className="px-2 py-1.5">
                    <p className="text-[11px] font-semibold truncate" style={{ color: textColor }}>
                      {item.client.igHandle || item.client.id}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-screen feed viewer — all saved posts, scrolled to tapped index */}
      <AnimatePresence>
        {viewingIndex !== null && (
          <motion.div
            className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
            style={{ background: bg }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div ref={swipeRef} className="flex-1 flex flex-col overflow-hidden">
            {/* Close bar */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-3 h-[44px] border-b"
              style={{ borderColor, background: bg }}
            >
              <button onClick={() => setViewingIndex(null)} className="flex items-center gap-1.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={textColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span className="text-[15px]" style={{ color: textColor }}>Saved</span>
              </button>
            </div>

            {/* All saved posts — scroll to tapped one */}
            <div
              ref={feedOverlayRef}
              className="flex-1 overflow-y-auto"
              style={{ background: bg }}
            >
              {saved.map((item, idx) => (
                <div
                  key={item.key}
                  ref={idx === viewingIndex ? (el) => { el?.scrollIntoView() } : undefined}
                >
                  <MobilePost
                    ad={item.ad}
                    client={item.client}
                    postKey={item.key}
                    onAvatarClick={() => {}}
                    onContact={() => {}}
                    onShare={() => {}}
                  />
                </div>
              ))}
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
