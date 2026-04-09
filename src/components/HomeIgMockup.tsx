'use client'

import { useRef, useLayoutEffect, useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import { DarkModeProvider, useTheme } from '@/context/DarkModeContext'
import { BookmarkProvider } from '@/context/BookmarkContext'
import IosStatusBar from './IosStatusBar'
import MobileFeed from './mobile/MobileFeed'
import MobileSearch from './mobile/MobileSearch'
import MobileReels from './mobile/MobileReels'
import MobileSavedTab from './mobile/MobileSavedTab'
import MobileAboutProfile from './mobile/MobileAboutProfile'
import MobileNav, { type MobileTab } from './mobile/MobileNav'
import type { Client } from '@/types'

const SCREEN_W = 390
const SCREEN_H = 844
const FRAME_PAD = 13
const FRAME_H   = SCREEN_H + FRAME_PAD * 2

export default function HomeIgMockup() {
  const { dispatch, goToAbout, about } = usePortfolio()
  const frameRef         = useRef<HTMLDivElement>(null)
  const screenOverlayRef = useRef<HTMLDivElement>(null)
  const wrapRef          = useRef<HTMLDivElement>(null)
  const [zoom, setZoom]  = useState(1)
  const [nudgeY, setNudgeY] = useState(0)
  // Hide phone until zoom is calculated to avoid SSR→client shape flash
  const [phoneMounted, setPhoneMounted] = useState(false)

  // Refs so wheel handler never goes stale
  const allowPageScrollRef = useRef(false)
  const nudgingRef         = useRef(false)

  useLayoutEffect(() => {
    const compute = () => setZoom(Math.min(1, (window.innerHeight - 260) / FRAME_H))
    compute()
    setPhoneMounted(true)
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // Intercept wheel events: nudge the phone when feed scroll bottoms out,
  // then release page scroll after the spring animation settles.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0) {
        // Scrolling up — reset so the nudge can fire again next time
        allowPageScrollRef.current = false
        nudgingRef.current = false
        return
      }

      // Find the innermost vertically-scrollable element under the cursor
      let node = e.target as HTMLElement | null
      let scrollable: HTMLElement | null = null
      while (node && node !== el) {
        const style = window.getComputedStyle(node)
        const overflow = style.overflowY
        if (
          (overflow === 'auto' || overflow === 'scroll') &&
          node.scrollHeight > node.clientHeight + 2
        ) {
          scrollable = node
          break
        }
        node = node.parentElement
      }

      const atBottom = scrollable
        ? scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 12
        : false

      if (!atBottom) {
        allowPageScrollRef.current = false
        return
      }

      // Feed is at the bottom — gate the page scroll behind a nudge
      if (!allowPageScrollRef.current) {
        e.preventDefault()
        if (!nudgingRef.current) {
          nudgingRef.current = true
          // Spring the phone upward, then release it back
          setNudgeY(-16)
          setTimeout(() => setNudgeY(0), 180)
          // After the spring settles, open the page scroll floodgate
          setTimeout(() => {
            allowPageScrollRef.current = true
            nudgingRef.current = false
          }, 480)
        }
      }
      // If allowPageScrollRef.current is true, we don't preventDefault → page scrolls
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handleFrameMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const frame = frameRef.current
    const overlay = screenOverlayRef.current
    if (!frame) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    frame.style.background = [
      `radial-gradient(circle 14% at ${x}% ${y}%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.92) 18%, rgba(235,238,255,0.55) 45%, transparent 68%)`,
      `radial-gradient(ellipse 82% 60% at ${x}% ${y}%, rgba(218,222,255,0.88) 0%, rgba(168,172,210,0.48) 32%, rgba(115,118,152,0.14) 62%, transparent 80%)`,
      `radial-gradient(ellipse 52% 38% at ${100 - x * 0.3}% ${100 - y * 0.3}%, rgba(195,198,225,0.55) 0%, rgba(155,158,185,0.22) 42%, transparent 65%)`,
      `linear-gradient(135deg,#d4d4da 0%,#909098 7%,#5e5e66 16%,#3e3e46 30%,#2c2c34 46%,#1e1e26 62%,#141418 78%,#0e0e12 100%)`,
    ].join(', ')
    if (overlay) {
      overlay.style.opacity = '1'
      overlay.style.background = `radial-gradient(ellipse 90% 70% at ${x}% ${y}%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 42%, transparent 70%)`
    }
  }, [])

  const handleFrameMouseLeave = useCallback(() => {
    if (frameRef.current) frameRef.current.style.background = 'linear-gradient(135deg,#c0c0c8 0%,#848490 6%,#585860 14%,#3c3c44 28%,#2a2a32 46%,#1c1c24 64%,#121218 82%,#0c0c10 100%)'
    if (screenOverlayRef.current) screenOverlayRef.current.style.opacity = '0'
  }, [])

  const openClient = useCallback((client: Client) => {
    dispatch({ type: 'SELECT_CLIENT', client })
  }, [dispatch])

  // Total layout height of phone + both shadow divs (used for scale margin compensation)
  const TOTAL_H = FRAME_H + 56 - 6 + 88 + 1  // 1009px

  return (
    <div ref={wrapRef} className="ig-mockup-wrap flex-shrink-0 flex flex-col items-center relative">
      {/* Nudge wrapper — pure translateY, no zoom, so GPU compositing never touches border-radius */}
      <motion.div
        animate={{ y: nudgeY }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      >
        {/*
          scale() instead of zoom:
          - zoom is non-standard and interacts badly with GPU compositing (causes border-radius flash)
          - transform:scale() composes cleanly with framer-motion's layer promotion
          - marginBottom compensates layout space so siblings aren't pushed down by full-size element
          - opacity:0 until phoneMounted so the scale(1)→scale(zoom) jump isn't visible
        */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            marginBottom: `${(zoom - 1) * TOTAL_H}px`,
            opacity: phoneMounted ? 1 : 0,
          }}
        >
          <DarkModeProvider>
            <BookmarkProvider>
              <PhoneFrame
                frameRef={frameRef}
                screenOverlayRef={screenOverlayRef}
                onMouseMove={handleFrameMouseMove}
                onMouseLeave={handleFrameMouseLeave}
                onClientSelect={openClient}
                onProfileSelect={goToAbout}
                about={about}
              />
            </BookmarkProvider>
          </DarkModeProvider>

          {/* Drop shadow glow */}
          <div aria-hidden style={{ width:`${SCREEN_W + FRAME_PAD * 2}px`, height:'56px', marginTop:'-6px', pointerEvents:'none', background:['radial-gradient(ellipse 88% 100% at 50% 8%, rgba(155,160,225,0.28) 0%, transparent 68%)','radial-gradient(ellipse 60% 80%  at 50% 10%, rgba(170,175,240,0.18) 0%, transparent 55%)','radial-gradient(ellipse 36% 55%  at 50% 12%, rgba(190,195,255,0.22) 0%, transparent 42%)'].join(', '), filter:'blur(9px)' }} />
          <div aria-hidden style={{ width:`${SCREEN_W + FRAME_PAD * 2}px`, height:'88px', marginTop:'1px', pointerEvents:'none', borderRadius:'0 0 54px 54px', background:'linear-gradient(to bottom, rgba(100,100,108,0.20) 0%, rgba(14,14,18,0.14) 18%, rgba(14,14,18,0.08) 48%, transparent 100%)', filter:'blur(22px)', opacity:0.75, transform:'scaleX(0.92)' }} />
        </div>
      </motion.div>
    </div>
  )
}

// Inner phone frame — reads dark from context so status bar + screen bg stay in sync
interface PhoneFrameProps {
  frameRef: React.RefObject<HTMLDivElement>
  screenOverlayRef: React.RefObject<HTMLDivElement>
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseLeave: () => void
  onClientSelect: (client: Client) => void
  onProfileSelect: () => void
  about: import('@/types').About | null
}

function PhoneFrame({ frameRef, screenOverlayRef, onMouseMove, onMouseLeave, onClientSelect, onProfileSelect, about }: PhoneFrameProps) {
  const { dark, hotPink, storyOpen } = useTheme()
  const screenBg = dark ? '#000' : '#fff'

  return (
    <motion.div
      ref={frameRef}
      layoutId="ig-phone"
      className="relative"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        borderRadius: '54px',
        background: 'linear-gradient(135deg,#c0c0c8 0%,#848490 6%,#585860 14%,#3c3c44 28%,#2a2a32 46%,#1c1c24 64%,#121218 82%,#0c0c10 100%)',
        padding: `${FRAME_PAD}px`,
        width: `${SCREEN_W + FRAME_PAD * 2}px`,
        boxShadow: [
          '0 60px 120px rgba(0,0,0,0.38)',
          '0 24px 48px rgba(0,0,0,0.20)',
          'inset 0 2px 0 rgba(255,255,255,0.55)',
          'inset 0 -1.5px 0 rgba(0,0,0,0.55)',
          'inset 2px 0 0 rgba(255,255,255,0.18)',
          'inset -2px 0 0 rgba(0,0,0,0.38)',
        ].join(','),
      }}
    >
      {/* Side buttons */}
      <div className="absolute" style={{ left:'-3.5px', top:'108px',  width:'3.5px', height:'34px', background:'linear-gradient(to right,#1e1e20,#3a3a3c)', borderRadius:'3px 0 0 3px' }} />
      <div className="absolute" style={{ left:'-3.5px', top:'158px',  width:'3.5px', height:'62px', background:'linear-gradient(to right,#1e1e20,#3a3a3c)', borderRadius:'3px 0 0 3px' }} />
      <div className="absolute" style={{ left:'-3.5px', top:'232px',  width:'3.5px', height:'62px', background:'linear-gradient(to right,#1e1e20,#3a3a3c)', borderRadius:'3px 0 0 3px' }} />
      <div className="absolute" style={{ right:'-3.5px', top:'190px', width:'3.5px', height:'80px', background:'linear-gradient(to left,#1e1e20,#3a3a3c)',  borderRadius:'0 3px 3px 0' }} />

      {/* Screen */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{ width:`${SCREEN_W}px`, height:`${SCREEN_H}px`, borderRadius:'42px', background: screenBg, transition: 'background 0.3s ease' }}
      >
        <div ref={screenOverlayRef} aria-hidden style={{ position:'absolute', inset:0, borderRadius:'42px', pointerEvents:'none', zIndex:48, opacity:0, transition:'opacity 0.4s ease' }} />
        <div className="absolute z-50 left-1/2 -translate-x-1/2" style={{ top:'13px', width:'120px', height:'36px', background:'#000', borderRadius:'50px', boxShadow:'0 0 0 1.5px rgba(255,255,255,0.06)' }} />

        {/* Status bar — forced dark while story viewer is open */}
        <IosStatusBar dark={dark || storyOpen} />

        {/* transform: translateZ(0) scopes all fixed elements to the phone frame */}
        <div className="flex-1 relative overflow-hidden" style={{ transform: 'translateZ(0)' }}>
          <EmbeddedMobileApp onClientSelect={onClientSelect} onProfileSelect={onProfileSelect} about={about} />
        </div>

      </div>
    </motion.div>
  )
}

// ── Embedded mobile app — renders the full mobile experience inside the phone ──
interface EmbeddedProps {
  onClientSelect: (client: Client) => void
  onProfileSelect: () => void
  about: import('@/types').About | null
}

function EmbeddedMobileApp({ onClientSelect, onProfileSelect, about }: EmbeddedProps) {
  const [tab, setTab] = useState<MobileTab>('feed')

  return (
    // h-full fills the flex-1 container above; relative so fixed children anchor here
    <div className="h-full flex flex-col relative overflow-hidden">
      {tab === 'feed'    && <MobileFeed    onClientSelect={onClientSelect} onProfileSelect={onProfileSelect} />}
      {tab === 'search'  && <MobileSearch  onClientSelect={onClientSelect} />}
      {tab === 'reels'   && <MobileReels   onClientSelect={onClientSelect} onProfileSelect={onProfileSelect} />}
      {tab === 'saved'   && <MobileSavedTab />}
      {tab === 'profile' && <MobileAboutProfile about={about} />}
      <MobileNav tab={tab} onTab={setTab} />
    </div>
  )
}
