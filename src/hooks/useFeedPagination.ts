import { useState, useCallback } from 'react'
import type { Ad } from '@/types'

const BATCH_SIZE = 15

export function useFeedPagination(ads: Ad[], initialIndex: number) {
  const [rendered, setRendered] = useState(() =>
    Math.min(Math.max(BATCH_SIZE, initialIndex + 3), ads.length),
  )

  const loadMore = useCallback(() => {
    setRendered(prev => Math.min(prev + BATCH_SIZE, ads.length))
  }, [ads.length])

  return {
    visibleAds: ads.slice(0, rendered),
    hasMore: rendered < ads.length,
    loadMore,
  }
}
