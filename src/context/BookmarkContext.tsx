'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Ad, Client } from '@/types'

export interface SavedAd { ad: Ad; client: Client; key: string }

interface BookmarkCtx {
  saved: SavedAd[]
  toggle: (item: SavedAd) => void
  isSaved: (key: string) => boolean
}

const Ctx = createContext<BookmarkCtx>({ saved: [], toggle: () => {}, isSaved: () => false })

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedAd[]>([])

  // Hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('jbb_saved')
      if (raw) setSaved(JSON.parse(raw))
    } catch {}
  }, [])

  const toggle = useCallback((item: SavedAd) => {
    setSaved(prev => {
      const exists = prev.some(s => s.key === item.key)
      const next = exists ? prev.filter(s => s.key !== item.key) : [...prev, item]
      try { localStorage.setItem('jbb_saved', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const isSaved = useCallback((key: string) => saved.some(s => s.key === key), [saved])

  return <Ctx.Provider value={{ saved, toggle, isSaved }}>{children}</Ctx.Provider>
}

export const useBookmarks = () => useContext(Ctx)
