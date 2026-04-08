'use client'

import { motion } from 'framer-motion'
import { usePortfolio } from '@/context/PortfolioContext'
import IgMockup from './IgMockup'
import type { Client } from '@/types'

const pageVariants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.3, ease: 'easeOut', staggerChildren: 0.08 } },
  exit:   { opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } },
}

const slideIn = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
}

interface Props {
  client: Client
  initialAdIndex: number
}

export default function AdView({ client, initialAdIndex }: Props) {
  const { dispatch } = usePortfolio()

  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="min-h-screen flex flex-col"
    >
      {/* Close button */}
      <button
        onClick={() => dispatch({ type: 'BACK_TO_CLIENT' })}
        title="Back (Esc)"
        className="fixed top-6 right-7 z-50 w-10 h-10 rounded-full border border-black/[0.1] bg-white flex items-center justify-center text-[#6e6e73] hover:text-[#1d1d1f] hover:border-black/20 transition-colors text-lg"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
      >
        ✕
      </button>

      {/* Main layout */}
      <div className="flex-1 flex items-start justify-center gap-10 px-8 py-12 flex-wrap">

        {/* ── Sidebar ──────────────────────────────────── */}
        <motion.div
          variants={slideIn}
          className="flex-1 min-w-[260px] max-w-[360px] bg-white rounded-2xl p-7 sticky top-12"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          {/* Logo + name */}
          <div className="flex items-center gap-3 pb-5 mb-5 border-b border-black/[0.06]">
            {client.logo && (
              <img
                src={client.logo}
                alt={client.name}
                className="h-6 object-contain opacity-90"
              />
            )}
            <span className="text-sm font-semibold text-[#1d1d1f] truncate">{client.name}</span>
          </div>

          {client.description && (
            <p className="text-[0.85rem] leading-[1.75] text-[#6e6e73] mb-5">
              {client.description}
            </p>
          )}

          {client.services.length > 0 && (
            <>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#86868b] mb-3">
                Services
              </p>
              <div className="flex flex-wrap gap-2">
                {client.services.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full border border-black/[0.08] bg-black/[0.03] text-[0.72rem] text-[#6e6e73]">
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}

          {client.website && (
            <a
              href={client.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center gap-2 text-xs text-[#6e6e73] hover:text-[#0066cc] transition-colors group"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              <span className="group-hover:underline">{client.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
        </motion.div>

        {/* ── iPhone Mockup ────────────────────────────── */}
        <motion.div variants={slideIn} style={{ '--stagger': '0.1s' } as React.CSSProperties}>
          <IgMockup client={client} initialAdIndex={initialAdIndex} />
        </motion.div>
      </div>
    </motion.div>
  )
}
