'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import MobileNav, { type MobileTab } from './MobileNav'
import MobileFeed from './MobileFeed'
import MobileSearch from './MobileSearch'
import MobileReels from './MobileReels'
import MobileClientProfile from './MobileClientProfile'
import MobileAboutProfile from './MobileAboutProfile'
import MobileSavedTab from './MobileSavedTab'
import { DarkModeProvider } from '@/context/DarkModeContext'
import { BookmarkProvider } from '@/context/BookmarkContext'
import { useTheme } from '@/context/DarkModeContext'
import type { Client, About } from '@/types'

type Screen =
  | { screen: 'feed' }
  | { screen: 'search' }
  | { screen: 'reels' }
  | { screen: 'profile' }
  | { screen: 'saved' }
  | { screen: 'client'; client: Client; from: MobileTab }

interface Props {
  about: About | null
}

export default function MobileApp({ about }: Props) {
  return (
    <DarkModeProvider>
      <BookmarkProvider>
        <MobileAppInner about={about} />
      </BookmarkProvider>
    </DarkModeProvider>
  )
}

function MobileAppInner({ about }: Props) {
  const { dark, hotPink } = useTheme()
  const [current, setCurrent] = useState<Screen>({ screen: 'feed' })
  const [tab, setTab] = useState<MobileTab>('feed')

  const goTab = (t: MobileTab) => {
    setTab(t)
    setCurrent({ screen: t })
  }

  const openClient = (client: Client) => {
    const from: MobileTab =
      current.screen === 'reels' ? 'reels'
      : current.screen === 'search' ? 'search'
      : current.screen === 'profile' ? 'profile'
      : 'feed'
    setCurrent({ screen: 'client', client, from })
  }

  const openProfile = () => {
    setTab('profile')
    setCurrent({ screen: 'profile' })
  }

  const goBack = () => {
    if (current.screen === 'client') {
      const t = current.from
      setTab(t)
      setCurrent({ screen: t })
    }
  }

  const bg = hotPink ? '#ff69b4' : dark ? '#000' : '#fff'

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden relative" style={{ background: bg, transition: 'background 0.4s ease' }}>
      {hotPink && <MeteorShower />}
      {/* No AnimatePresence transition — instant tab switching like Instagram */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {current.screen === 'feed' && (
          <MobileFeed onClientSelect={openClient} onProfileSelect={openProfile} />
        )}
        {current.screen === 'search' && (
          <MobileSearch onClientSelect={openClient} />
        )}
        {current.screen === 'reels' && (
          <MobileReels onClientSelect={openClient} onProfileSelect={openProfile} />
        )}
        {current.screen === 'profile' && (
          <MobileAboutProfile about={about} />
        )}
        {current.screen === 'saved' && (
          <MobileSavedTab />
        )}
        {current.screen === 'client' && (
          <MobileClientProfile
            client={current.client}
            onBack={goBack}
            onClientSelect={openClient}
            onProfileSelect={openProfile}
          />
        )}
      </div>

      <MobileNav tab={tab} onTab={goTab} />
    </div>
  )
}

// ── Meteor shower overlay ─────────────────────────────────────────────────────

const METEORS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${4 + (i * 5.5) % 92}%`,
  width: `${1.2 + (i % 3) * 0.6}px`,
  height: `${45 + (i % 5) * 22}px`,
  delay: `${(i * 0.37) % 4.2}s`,
  duration: `${1.6 + (i % 4) * 0.55}s`,
  rotate: `${-12 + (i % 7) * 4}deg`,
}))

const TWINKLERS = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${3 + (i * 4.3) % 94}%`,
  top: `${2 + (i * 4.1) % 96}%`,
  size: `${2 + (i % 3)}px`,
  delay: `${(i * 0.29) % 2.8}s`,
  duration: `${1.1 + (i % 4) * 0.45}s`,
}))

function MeteorShower() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 40 }}>
      {TWINKLERS.map(s => (
        <div
          key={s.id}
          className="twinkle-star"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}
      {METEORS.map(m => (
        <div
          key={m.id}
          className="meteor-star"
          style={{ left: m.left, top: '-140px', width: m.width, height: m.height, animationDelay: m.delay, animationDuration: m.duration, transform: `rotate(${m.rotate})` }}
        />
      ))}
    </div>
  )
}
