'use client'

import { useRef, useEffect, useState } from 'react'

interface Props {
  src: string
  className?: string
  style?: React.CSSProperties
  muted?: boolean
  loop?: boolean
  playsInline?: boolean
  autoPlay?: boolean
  controls?: boolean
  /** Called once metadata is loaded — use to seek to a poster frame */
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void
  videoRef?: React.RefObject<HTMLVideoElement>
  /** How far outside the viewport to start loading (default 400px) */
  rootMargin?: string
}

/**
 * LazyVideo — defers setting `src` until the element is within rootMargin of
 * the viewport. This prevents dozens of simultaneous video fetches on mount,
 * which is the primary cause of slow feed load times.
 */
export default function LazyVideo({
  src,
  className,
  style,
  muted = true,
  loop = false,
  playsInline = true,
  autoPlay = false,
  controls = false,
  onLoadedMetadata,
  videoRef: externalRef,
  rootMargin = '400px',
}: Props) {
  const internalRef = useRef<HTMLVideoElement>(null)
  const ref = externalRef ?? internalRef
  const [activeSrc, setActiveSrc] = useState<string | undefined>(undefined)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActiveSrc(src)
          obs.disconnect()
        }
      },
      { rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [src, rootMargin, ref])

  return (
    <video
      ref={ref}
      src={activeSrc}
      preload={activeSrc ? 'metadata' : 'none'}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      autoPlay={autoPlay}
      controls={controls}
      className={className}
      style={style}
      onLoadedMetadata={onLoadedMetadata}
    />
  )
}
