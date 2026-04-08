'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, MotionConfig } from 'framer-motion'
import { PortfolioProvider, usePortfolio } from '@/context/PortfolioContext'
import type { Client, About } from '@/types'
import HomeView from './HomeView'
import ClientView from './ClientView'
import AdView from './AdView'
import MobileApp from './mobile/MobileApp'

export default function Portfolio({ clients, about }: { clients: Client[]; about: About | null }) {
  return (
    <PortfolioProvider clients={clients} about={about}>
      <MotionConfig
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        reducedMotion="user"
      >
        <PortfolioInner />
      </MotionConfig>
    </PortfolioProvider>
  )
}

function PortfolioInner() {
  const { state, clients, about } = usePortfolio()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isMobile) return <MobileApp about={about} />

  return (
    <AnimatePresence mode="sync">
      {state.view === 'home' && (
        <HomeView key="home" clients={clients} about={about} />
      )}
      {state.view === 'client' && (
        <ClientView key={`client-${state.client.id}`} client={state.client} />
      )}
      {state.view === 'ad' && (
        <AdView
          key={`ad-${state.client.id}`}
          client={state.client}
          initialAdIndex={state.adIndex}
        />
      )}
    </AnimatePresence>
  )
}
