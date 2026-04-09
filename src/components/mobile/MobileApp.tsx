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
    <div className="flex flex-col h-[100dvh] overflow-hidden" style={{ background: bg, transition: 'background 0.4s ease' }}>
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
