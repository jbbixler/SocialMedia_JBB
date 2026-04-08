import { useEffect, RefObject } from 'react'

export function useIntersectionObserver(
  ref: RefObject<Element | null>,
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => callback(entry.isIntersecting),
      options,
    )
    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])
}
