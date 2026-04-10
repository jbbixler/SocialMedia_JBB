'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import type { Client, Ad } from '@/types'
import IgMockup from './IgMockup'
import Lightbox from './Lightbox'

const pageVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.05 } },
  exit:   { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0 },
}

function getContrastColor(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#1d1d1f'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#1d1d1f' : '#ffffff'
}

export default function ClientView({ client }: { client: Client }) {
  const { dispatch, goToAbout } = usePortfolio()
  const [showWorks, setShowWorks] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)
  const [descOverflows, setDescOverflows] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const descRef = useRef<HTMLDivElement>(null)

  const btnBg   = client.color || '#1d1d1f'
  const btnText = getContrastColor(btnBg)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [])

  // Detect whether description text overflows its clamped container
  useEffect(() => {
    const el = descRef.current
    if (!el) return
    setDescOverflows(el.scrollHeight > el.clientHeight + 2)
  }, [client.description])

  const handleToggle = useCallback(() => {
    setShowWorks(v => {
      if (v) {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return false
      }
      // Open — scroll to grid after it mounts
      setTimeout(() => gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
      return true
    })
  }, [])

  return (
    <>
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        exit="exit"
        className="min-h-screen flex flex-col"
      >
        {/* ── Topbar ──────────────────────────────────── */}
        <div className="sticky top-0 z-40 flex items-center gap-4 px-8 py-4 border-b border-black/[0.06] bg-[#f5f5f7]/80 backdrop-blur-xl">
          <motion.button
            variants={itemVariants}
            onClick={() => dispatch({ type: 'BACK_TO_HOME' })}
            className="flex items-center gap-2 text-[#6e6e73] hover:text-[#1d1d1f] transition-colors text-sm border border-black/[0.1] rounded-lg px-3 py-1.5 flex-shrink-0"
            whileHover={{ borderColor: 'rgba(0,0,0,0.22)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L4 7l5 5" />
            </svg>
            All Clients
          </motion.button>

          {client.logo && (
            client.website ? (
              <a href={client.website} target="_blank" rel="noopener noreferrer" title={`Visit ${client.name}`}>
                <img src={client.logo} alt={client.name} className="h-7 max-w-[140px] object-contain hover:opacity-75 transition-opacity" />
              </a>
            ) : (
              <img src={client.logo} alt={client.name} className="h-7 max-w-[140px] object-contain" />
            )
          )}

          <motion.h2 variants={itemVariants} className="text-sm font-medium text-[#6e6e73] tracking-tight truncate">
            {client.name}
          </motion.h2>

          <motion.button
            variants={itemVariants}
            onClick={goToAbout}
            className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-xs text-[#6e6e73] hover:text-[#1d1d1f] transition-colors border border-black/[0.1] rounded-lg px-3 py-1.5"
            whileHover={{ borderColor: 'rgba(0,0,0,0.22)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Contact
          </motion.button>
        </div>

        {/* ── Main: description left, phone right ─────── */}
        <div className="flex flex-col lg:flex-row gap-10 px-8 py-12 items-stretch">

          {/* Description column — stretches to phone height, pins services+btn at bottom */}
          <motion.div variants={itemVariants} className="flex-1 max-w-xl flex flex-col min-h-0">

            {/* Portfolio summary — structured sections */}
            {client.summary ? (
              <div className="relative mb-6">
                <div
                  ref={descRef}
                  className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                  style={{ maxHeight: descExpanded ? '2000px' : '11rem' }}
                >
                  {([
                    { label: 'Overview',     text: client.summary.overview },
                    { label: 'Role',         text: client.summary.role },
                    { label: 'Challenge',    text: client.summary.challenge },
                    { label: 'Creative',     text: client.summary.creative },
                    { label: 'Performance',  text: client.summary.performance },
                    client.summary.volume ? { label: 'Volume & Budget', text: client.summary.volume } : null,
                  ] as Array<{ label: string; text: string } | null>)
                    .filter((x): x is { label: string; text: string } => x !== null)
                    .map(({ label, text }) => (
                      <div key={label} className="mb-4">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.09em] text-[#86868b] mb-1">{label}</p>
                        <p className="text-[0.88rem] leading-[1.75] text-[#6e6e73]">{text}</p>
                      </div>
                    ))
                  }
                </div>

                {!descExpanded && descOverflows && (
                  <div className="absolute bottom-0 left-0 right-0">
                    <div className="h-10 bg-gradient-to-t from-[#f5f5f7] to-transparent pointer-events-none" />
                    <button
                      onClick={() => setDescExpanded(true)}
                      className="text-[0.78rem] font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors pt-0.5"
                    >
                      Continue reading ↓
                    </button>
                  </div>
                )}

                {descExpanded && (
                  <button
                    onClick={() => setDescExpanded(false)}
                    className="text-[0.78rem] font-medium text-[#6e6e73] hover:text-[#1d1d1f] transition-colors mt-1 block"
                  >
                    Show less ↑
                  </button>
                )}
              </div>
            ) : client.description && client.description !== 'Coming soon' && (
              <div className="relative mb-6">
                <div
                  ref={descRef}
                  className="text-[0.95rem] leading-[1.85] text-[#6e6e73] whitespace-pre-line overflow-hidden transition-[max-height] duration-300 ease-in-out"
                  style={{ maxHeight: descExpanded ? '1000px' : '11rem' }}
                >
                  {client.description}
                </div>
              </div>
            )}

            {/* Spacer — pushes services + button to the bottom */}
            <div className="flex-1" />

            {/* Services + button — pinned at bottom, aligned with phone bottom */}
            <div>
              {client.services.length > 0 && (
                <div className="mb-6">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#86868b] mb-3">Services</p>
                  <div className="flex flex-wrap gap-2">
                    {client.services.map(s => (
                      <span key={s} className="px-3 py-1 rounded-full border border-black/[0.1] bg-black/[0.03] text-[0.75rem] text-[#6e6e73]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!showWorks && <ToggleBtn showWorks={showWorks} onClick={handleToggle} bg={btnBg} text={btnText} />}
            </div>
          </motion.div>

          {/* Phone */}
          <motion.div variants={itemVariants} className="flex-shrink-0">
            <IgMockup client={client} initialAdIndex={0} />
          </motion.div>
        </div>

        {/* ── Creative works grid ─────────────────────── */}
        <AnimatePresence>
          {showWorks && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ type: 'spring', stiffness: 240, damping: 28 }}
              className="px-8 pb-20"
              ref={gridRef}
            >
              <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-[#86868b] mb-5">
                Selected Work — {client.name}
              </p>
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
                {client.ads.map((ad, i) => (
                  <AdThumb key={i} ad={ad} index={i} onClick={() => setLightboxIndex(i)} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Floating button — only visible while grid is open ── */}
        <AnimatePresence>
          {showWorks && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="fixed bottom-8 left-8 z-50"
            >
              <ToggleBtn showWorks={showWorks} onClick={handleToggle} bg={btnBg} text={btnText} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            key="lightbox"
            ads={client.ads}
            startIndex={lightboxIndex}
            client={client}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

function ToggleBtn({ showWorks, onClick, bg, text }: { showWorks: boolean; onClick: () => void; bg: string; text: string }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all"
      style={{ background: bg, color: text, boxShadow: '0 2px 12px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.07)' }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {showWorks ? 'Hide creative' : 'View selected creative'}
      <svg
        width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        style={{ transform: showWorks ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
      >
        <path d="M2 5l5 5 5-5" />
      </svg>
    </motion.button>
  )
}

function AdThumb({ ad, index, onClick }: { ad: Ad; index: number; onClick: () => void }) {
  return (
    <motion.div
      className="break-inside-avoid mb-3 rounded-xl overflow-hidden cursor-pointer relative group bg-white border border-black/[0.06]"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <div data-ratio={ad.ratio} className="w-full overflow-hidden">
        {ad.type === 'image' ? (
          <img src={ad.src} alt="" loading="lazy" className="w-full h-full object-cover block" />
        ) : (
          <>
            <video
              src={ad.src}
              muted
              preload="metadata"
              playsInline
              className="w-full h-full object-cover block"
              onLoadedMetadata={e => {
                const v = e.currentTarget
                v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
              <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="w-4 h-4 fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
