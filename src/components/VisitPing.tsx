'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function VisitPing() {
  const pathname = usePathname()

  useEffect(() => {
    // Only ping once per session per path
    const key = `visited:${pathname}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')

    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {})
  }, [pathname])

  return null
}
