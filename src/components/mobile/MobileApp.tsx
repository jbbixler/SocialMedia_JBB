'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import MobileNav, { type MobileTab } from './MobileNav'
import MobileFeed from './MobileFeed'
import MobileSearch from './MobileSearch'
import MobileReels from './MobileReels'
import MobileClientProfile from './MobileClientProfile'
import MobileAboutProfile from './MobileAboutProfile'
import type { Client, About } from '@/types'

type Screen =
  | { screen: 'feed' }
  | { screen: 'search' }
  | { screen: 'reels' }
  | { screen: 'profile' }
  | { screen: 'client'; client: Client; from: MobileTab }

interface Props {
  about: About | null
}

export default function MobileApp({ about }: Props) {
  const [current, setCurrent] = useState<Screen>({ screen: 'feed' })
  const [tab, setTab] = useState<MobileTab>('feed')

  const goTab = (t: MobileTab) => {
    setTab(t)
    setCurrent({ screen: t })
  }

  const openClient = (client: Client) => {
    const from: MobileTab = current.screen === 'reels' ? 'reels'
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

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-white">
      <AnimatePresence mode="wait">
        {current.screen === 'feed' && (
          <SlideIn key="feed" direction="left">
            <MobileFeed onClientSelect={openClient} onProfileSelect={openProfile} />
          </SlideIn>
        )}
        {current.screen === 'search' && (
          <SlideIn key="search" direction="left">
            <MobileSearch onClientSelect={openClient} />
          </SlideIn>
        )}
        {current.screen === 'reels' && (
          <SlideIn key="reels" direction="left">
            <MobileReels onClientSelect={openClient} onProfileSelect={openProfile} />
          </SlideIn>
        )}
        {current.screen === 'profile' && (
          <SlideIn key="profile" direction="right">
            <MobileAboutProfile about={about} />
          </SlideIn>
        )}
        {current.screen === 'client' && (
          <SlideIn key={`client-${current.client.id}`} direction="right">
            <MobileClientProfile
              client={current.client}
              onBack={goBack}
              onClientSelect={openClient}
              onProfileSelect={openProfile}
            />
          </SlideIn>
        )}
      </AnimatePresence>

      <MobileNav tab={tab} onTab={goTab} />
    </div>
  )
}

function SlideIn({ children, direction }: { children: React.ReactNode; direction: 'left' | 'right' }) {
  const x = direction === 'right' ? 40 : -40
  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden"
      initial={{ opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -x }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
