'use client'

import type { ReactNode } from 'react'
import { useTheme } from '@/context/DarkModeContext'

export type MobileTab = 'feed' | 'reels' | 'saved' | 'search' | 'profile'

interface Props {
  tab: MobileTab
  onTab: (tab: MobileTab) => void
}

export default function MobileNav({ tab, onTab }: Props) {
  const { dark, hotPink } = useTheme()
  const bg = hotPink ? 'transparent' : dark ? '#000' : '#fff'
  const activeFill = hotPink ? '#fff' : dark ? '#fff' : '#1d1d1f'
  const inactiveFill = hotPink ? 'rgba(255,255,255,0.55)' : dark ? 'rgba(255,255,255,0.45)' : '#8e8e8e'
  const border = dark || hotPink ? 'border-white/[0.1]' : 'border-black/[0.1]'

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t ${border}`}
      style={{
        background: bg,
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(49px + env(safe-area-inset-bottom))',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Home */}
      <NavBtn active={tab === 'feed'} onClick={() => onTab('feed')} label="Home" activeFill={activeFill} inactiveFill={inactiveFill}>
        <svg viewBox="0 0 24 24" className="w-[26px] h-[26px]"
          fill={tab === 'feed' ? activeFill : 'none'}
          stroke={tab === 'feed' ? activeFill : inactiveFill}
          strokeWidth={tab === 'feed' ? 0 : 1.75}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </NavBtn>

      {/* Reels */}
      <NavBtn active={tab === 'reels'} onClick={() => onTab('reels')} label="Reels" activeFill={activeFill} inactiveFill={inactiveFill}>
        <svg viewBox="0 0 24 24" className="w-[26px] h-[26px]"
          fill={tab === 'reels' ? activeFill : 'none'}
          stroke={tab === 'reels' ? activeFill : inactiveFill}
          strokeWidth={tab === 'reels' ? 0 : 1.75}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <path fill={tab === 'reels' ? (dark || hotPink ? '#000' : '#fff') : inactiveFill} stroke="none" d="M10 8l6 4-6 4V8z" />
        </svg>
      </NavBtn>

      {/* Send / Saved */}
      <NavBtn active={tab === 'saved'} onClick={() => onTab('saved')} label="Saved" activeFill={activeFill} inactiveFill={inactiveFill}>
        <svg viewBox="0 0 24 24" className="w-[26px] h-[26px]"
          fill="none"
          stroke={tab === 'saved' ? activeFill : inactiveFill}
          strokeWidth={tab === 'saved' ? 2.1 : 1.75}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </NavBtn>

      {/* Search */}
      <NavBtn active={tab === 'search'} onClick={() => onTab('search')} label="Search" activeFill={activeFill} inactiveFill={inactiveFill}>
        <svg viewBox="0 0 24 24" className="w-[26px] h-[26px]"
          fill="none"
          stroke={tab === 'search' ? activeFill : inactiveFill}
          strokeWidth={tab === 'search' ? 2.25 : 1.75}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="10.5" cy="10.5" r="7.5" />
          <line x1="21" y1="21" x2="15.8" y2="15.8" />
        </svg>
      </NavBtn>

      {/* Profile */}
      <NavBtn active={tab === 'profile'} onClick={() => onTab('profile')} label="Profile" activeFill={activeFill} inactiveFill={inactiveFill}>
        <svg viewBox="0 0 24 24" className="w-[26px] h-[26px]"
          fill={tab === 'profile' ? activeFill : 'none'}
          stroke={tab === 'profile' ? activeFill : inactiveFill}
          strokeWidth={tab === 'profile' ? 0 : 1.75}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </NavBtn>
    </nav>
  )
}

function NavBtn({ children, active, onClick, label, activeFill, inactiveFill }: {
  children: ReactNode; active: boolean; onClick: () => void; label: string
  activeFill: string; inactiveFill: string
}) {
  void activeFill; void inactiveFill
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center w-16 h-12"
    >
      {children}
    </button>
  )
}
