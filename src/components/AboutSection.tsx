'use client'

import { motion } from 'framer-motion'
import type { About } from '@/types'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
}

export default function AboutSection({ about }: { about: About }) {
  const hasMedia = about.media.length > 0

  return (
    <motion.div
      id="about-section"
      variants={fadeUp}
      className="w-full max-w-5xl -mt-24 relative z-10 mb-10 px-6"
    >
      {/* Section label */}
      <p className="text-[0.68rem] font-semibold tracking-[0.1em] uppercase text-[#86868b] mb-6">
        About
      </p>

      {/* Profile card */}
      <div
        className="rounded-3xl bg-white p-8 flex flex-col lg:flex-row gap-10 items-start"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)' }}
      >
        {/* Avatar + name block */}
        <div className="flex flex-col items-center lg:items-start gap-4 flex-shrink-0">
          {/* Story-ring avatar */}
          <div className="relative">
            <div
              className="w-28 h-28 rounded-full p-[3px]"
              style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}
            >
              <div
                className="w-full h-full rounded-full overflow-hidden border-[3px] border-white flex items-center justify-center"
                style={{ background: about.color || '#1d1d1f' }}
              >
                {about.avatar ? (
                  <img src={about.avatar} alt={about.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-semibold text-xl">
                    {about.name.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            {/* Green active dot */}
            <span
              className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#22c55e] border-2 border-white"
              aria-label="Active"
            />
          </div>

          <div className="text-center lg:text-left">
            <p className="text-[15px] font-semibold text-[#1d1d1f] leading-tight">{about.name}</p>
            {about.handle && (
              <p className="text-[13px] text-[#6e6e73] mt-0.5">@{about.handle}</p>
            )}
            {about.role && (
              <p className="text-[12px] text-[#86868b] mt-1">{about.role}</p>
            )}
          </div>

          {/* Contact button — only link to external website */}
          <a
            href={about.website || 'https://jbradbixler.com/'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ background: about.color || '#1d1d1f', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Contact
          </a>
        </div>

        {/* Bio + services */}
        <div className="flex-1 min-w-0">
          {about.bio && (
            <p className="text-[0.95rem] leading-[1.85] text-[#6e6e73] whitespace-pre-line mb-6">
              {about.bio}
            </p>
          )}

          {about.services.length > 0 && (
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-[#86868b] mb-3">Services</p>
              <div className="flex flex-wrap gap-2">
                {about.services.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full border border-black/[0.1] bg-black/[0.03] text-[0.75rem] text-[#6e6e73]">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media grid — shown only if media exists */}
      {hasMedia && (
        <div className="mt-6">
          <p className="text-[0.65rem] font-semibold tracking-[0.1em] uppercase text-[#86868b] mb-4">
            Creative Highlights
          </p>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
            {about.media.map((item, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-3 rounded-xl overflow-hidden bg-white border border-black/[0.06]"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                {item.type === 'image' ? (
                  <img src={item.src} alt="" loading="lazy" className="w-full h-full object-cover block" />
                ) : (
                  <video
                    src={item.src}
                    muted
                    preload="metadata"
                    playsInline
                    className="w-full h-full object-cover block"
                    onLoadedMetadata={e => {
                      const v = e.currentTarget
                      v.currentTime = v.duration > 5 ? 5 : v.duration * 0.5
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
