'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import type { Client, About } from '@/types'
import HomeIgMockup from './HomeIgMockup'
import AboutSection from './AboutSection'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}

// Phone wrapper keeps full opacity on exit so layoutId can animate position smoothly
const phoneVariant = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
  exit:   { opacity: 1 },
}

// Calm pastel hues — lavender, sky, mint, peach, rose, aqua
const PASTEL_HUES = [262, 200, 158, 28, 335, 182]
let _rippleHueIdx = 0

interface Ripple { x: number; y: number; frame: number; hue: number }

// ── Deep perspective water — cursor-proximity ripple effect ───────────────────
function WaterCanvas() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  // Mouse position in canvas coordinates (W×H space), -9999 = off-screen
  const mouseRef   = useRef({ x: -9999, y: -9999 })
  const ripplesRef = useRef<Ripple[]>([])
  const frameRef   = useRef(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Convert screen → canvas coordinates and spawn ripples on movement
  useEffect(() => {
    if (!mounted) return
    const W = 1400
    const H = 720
    let lastRippleX = -9999
    let lastRippleY = -9999

    const onMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const cx = ((e.clientX - rect.left) / rect.width)  * W
      const cy = ((e.clientY - rect.top)  / rect.height) * H
      mouseRef.current = { x: cx, y: cy }

      // Spawn a ripple whenever cursor travels far enough
      const dx = cx - lastRippleX
      const dy = cy - lastRippleY
      if (Math.hypot(dx, dy) > 28) {
        const hue = PASTEL_HUES[_rippleHueIdx % PASTEL_HUES.length]
        _rippleHueIdx++
        ripplesRef.current.push({ x: cx, y: cy, frame: frameRef.current, hue })
        if (ripplesRef.current.length > 10) ripplesRef.current.shift()
        lastRippleX = cx
        lastRippleY = cy
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [mounted])

  useEffect(() => {
    if (!mounted) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 1400
    const H = 720
    const CX      = W / 2
    const HORIZON = H * 0.06

    const WAVE_SPEED  = 4.5
    const RIPPLE_LIFE = 140  // frames
    const MAX_RIPPLES = 18

    let rafId: number

    const draw = () => {
      frameRef.current++
      const frame = frameRef.current

      ctx.clearRect(0, 0, W, H)

      // Expire old ripples
      ripplesRef.current = ripplesRef.current.filter(r => frame - r.frame < RIPPLE_LIFE)

      // Ambient auto-spawn — calm water feel between cursor interactions
      if (frame % 108 === 0) {
        const ax = W * 0.08 + Math.random() * W * 0.84
        const ay = HORIZON + (H - HORIZON) * (0.2 + Math.random() * 0.6)
        ripplesRef.current.push({ x: ax, y: ay, frame, hue: PASTEL_HUES[_rippleHueIdx++ % PASTEL_HUES.length] })
        if (ripplesRef.current.length > MAX_RIPPLES) ripplesRef.current.shift()
      }

      // ── Ripple rings — perspective-projected ellipses ──────────────────
      for (const ripple of ripplesRef.current) {
        const age    = frame - ripple.frame
        const tLife  = age / RIPPLE_LIFE
        const cs     = Math.pow(1 - tLife, 0.65)   // smooth opacity fade
        const radius = age * WAVE_SPEED

        // Perspective: rings near horizon are flat ellipses, near viewer more circular
        const yFrac = Math.max(0, Math.min(1, (ripple.y - HORIZON) / (H - HORIZON)))
        const rX = radius * (0.08 + yFrac * 0.92)
        const rY = radius * (0.018 + yFrac * 0.30)

        if (rX < 1) continue

        const { hue } = ripple
        // Each ripple: 4 stroked ellipses, wide→narrow, faint→bright→faint
        // Gives a soft glowing ring with natural falloff
        const baseW = (0.5 + yFrac * 7) * cs

        // outer halo
        ctx.beginPath()
        ctx.ellipse(ripple.x, ripple.y, Math.max(1, rX + rX * 0.12), Math.max(0.1, rY + rY * 0.12), 0, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${hue}, 30%, 70%, ${0.022 * cs})`
        ctx.lineWidth = Math.max(0.5, baseW * 5.5)
        ctx.stroke()

        // mid glow
        ctx.beginPath()
        ctx.ellipse(ripple.x, ripple.y, Math.max(1, rX + rX * 0.04), Math.max(0.1, rY + rY * 0.04), 0, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${hue}, 28%, 68%, ${0.065 * cs})`
        ctx.lineWidth = Math.max(0.4, baseW * 2.5)
        ctx.stroke()

        // bright ring core
        ctx.beginPath()
        ctx.ellipse(ripple.x, ripple.y, Math.max(0.5, rX), Math.max(0.1, rY), 0, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${hue}, 26%, 66%, ${0.10 * cs})`
        ctx.lineWidth = Math.max(0.3, baseW * 1.4)
        ctx.stroke()

        // inner trailing shadow
        ctx.beginPath()
        ctx.ellipse(ripple.x, ripple.y, Math.max(0.3, rX - rX * 0.06), Math.max(0.05, rY - rY * 0.06), 0, 0, Math.PI * 2)
        ctx.strokeStyle = `hsla(${hue}, 22%, 62%, ${0.04 * cs})`
        ctx.lineWidth = Math.max(0.2, baseW * 0.8)
        ctx.stroke()
      }

      // Fade overlay — dissolve top (horizon) and bottom edges
      const fade = ctx.createLinearGradient(0, 0, 0, H)
      fade.addColorStop(0,    'rgba(245,245,247,1)')
      fade.addColorStop(0.10, 'rgba(245,245,247,0.95)')
      fade.addColorStop(0.24, 'rgba(245,245,247,0.50)')
      fade.addColorStop(0.40, 'rgba(245,245,247,0.06)')
      fade.addColorStop(0.58, 'rgba(245,245,247,0.20)')
      fade.addColorStop(0.76, 'rgba(245,245,247,0.78)')
      fade.addColorStop(1,    'rgba(245,245,247,1)')
      ctx.fillStyle = fade
      ctx.fillRect(0, 0, W, H)

      rafId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(rafId)
  }, [mounted])

  if (!mounted) return <div style={{ height: '400px', width: '100%' }} />

  return (
    <canvas
      ref={canvasRef}
      width={1400}
      height={720}
      style={{ width: '100%', height: '560px', display: 'block' }}
    />
  )
}

export default function HomeView({ clients, about }: { clients: Client[]; about: About | null }) {
  const { dispatch } = usePortfolio()

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex flex-col items-center pb-24"
    >
      {/* ── Hero — fills exactly one viewport, brands scroll into view ───── */}
      <div className="min-h-[100svh] w-full flex flex-col items-center justify-center px-6 pt-10 pb-6">
        {/* Header */}
        <motion.header variants={fadeUp} className="text-center mb-8">
          <h1
            className="text-[clamp(1.75rem,4vw,3rem)] font-semibold tracking-[-0.04em] leading-tight text-[#1d1d1f]"
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
          >
            Paid Social Creatives
          </h1>
          <p className="mt-3 text-[#6e6e73] text-[15px]">
            Select a brand to view content
          </p>
        </motion.header>

        {/* Phone — uses phoneVariant so it stays opaque during exit, letting layoutId pan it */}
        <motion.div variants={phoneVariant} className="relative z-10">
          <HomeIgMockup />
        </motion.div>
      </div>

      {/* Water canvas — bleeds up well behind the phone, full-width breakout */}
      <div
        className="-mt-96 pointer-events-none"
        style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)' }}
      >
        <WaterCanvas />
      </div>

      {/* Brands section — below the water fade, always off-screen on load */}
      <motion.div
        variants={fadeUp}
        className="-mt-24 relative z-10 w-full max-w-5xl px-6 flex flex-col gap-4"
      >
        <h2
          className="text-[clamp(1.25rem,3vw,2.25rem)] font-semibold tracking-[-0.04em] leading-tight text-[#1d1d1f] px-1 pt-10"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}
        >
          Brands
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {clients.map(client => (
            <BrandCard
              key={client.id}
              client={client}
              onSelect={() => dispatch({ type: 'SELECT_CLIENT', client })}
            />
          ))}
        </div>
      </motion.div>

      {/* About section — always visible below brands */}
      {about && <AboutSection about={about} />}
    </motion.div>
  )
}

function BrandCard({ client, onSelect }: { client: Client; onSelect: () => void }) {
  const hasUGC = client.services.includes('UGC')
  // Shown explicitly: Creative Direction + UGC (if applicable). +x = rest of services.
  const extraCount = client.services.length - 1 - (hasUGC ? 1 : 0)

  return (
    <motion.button
      layout
      onClick={onSelect}
      className="group flex flex-col items-center justify-between gap-2 rounded-2xl bg-white p-4 cursor-pointer aspect-square"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.11), 0 0 0 1px rgba(0,0,0,0.04)' }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Logo */}
      <div className="flex-1 w-full flex items-center justify-center py-1">
        {client.logo ? (
          <img
            src={client.logo}
            alt={client.name}
            className="max-h-[68px] max-w-[90%] object-contain opacity-85 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <span className="text-xs font-semibold text-[#1d1d1f] text-center leading-tight">{client.name}</span>
        )}
      </div>

      {/* Pills: brand type → Creative Direction → UGC → +x more */}
      <div className="flex flex-wrap gap-1 justify-center w-full">
        {client.brandType && (
          <span className="text-[8.5px] text-[#86868b] bg-black/[0.04] rounded-full px-2 py-0.5 leading-tight">
            {client.brandType}
          </span>
        )}
        <span className="text-[8.5px] text-[#86868b] bg-black/[0.04] rounded-full px-2 py-0.5 leading-tight">
          Creative Direction
        </span>
        {hasUGC && (
          <span className="text-[8.5px] text-[#86868b] bg-black/[0.04] rounded-full px-2 py-0.5 leading-tight">
            UGC
          </span>
        )}
        {extraCount > 0 && (
          <span className="text-[8.5px] text-[#86868b]">+{extraCount} more</span>
        )}
      </div>
    </motion.button>
  )
}
