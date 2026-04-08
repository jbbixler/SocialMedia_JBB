'use client'

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { Client, About, ViewState } from '@/types'

type Action =
  | { type: 'SELECT_CLIENT'; client: Client }
  | { type: 'SELECT_AD'; index: number }
  | { type: 'JUMP_TO_CLIENT_AD'; client: Client; adIndex: number }
  | { type: 'BACK_TO_HOME' }
  | { type: 'BACK_TO_CLIENT' }

function reducer(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case 'SELECT_CLIENT':
      return { view: 'client', client: action.client }
    case 'SELECT_AD':
      if (state.view !== 'client') return state
      return { view: 'ad', client: state.client, adIndex: action.index }
    case 'JUMP_TO_CLIENT_AD':
      return { view: 'ad', client: action.client, adIndex: action.adIndex }
    case 'BACK_TO_HOME':
      return { view: 'home' }
    case 'BACK_TO_CLIENT':
      if (state.view !== 'ad') return state
      return { view: 'client', client: state.client }
    default:
      return state
  }
}

interface ContextValue {
  state: ViewState
  clients: Client[]
  about: About | null
  dispatch: React.Dispatch<Action>
  goToAbout: () => void
}

const PortfolioContext = createContext<ContextValue | null>(null)

export function PortfolioProvider({
  children,
  clients,
  about,
}: {
  children: ReactNode
  clients: Client[]
  about: About | null
}) {
  const [state, dispatch] = useReducer(reducer, { view: 'home' })

  const goToAbout = useCallback(() => {
    if (state.view !== 'home') {
      dispatch({ type: 'BACK_TO_HOME' })
      setTimeout(() => {
        document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })
      }, 350)
    } else {
      document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [state.view])

  return (
    <PortfolioContext.Provider value={{ state, clients, about, dispatch, goToAbout }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used inside PortfolioProvider')
  return ctx
}
