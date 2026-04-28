'use client'
import { useEffect, useRef, useState } from 'react'

const isIOS = () =>
  typeof window !== 'undefined' &&
  /iPad|iPhone|iPod/.test(navigator.userAgent)

const needsOrientationPermission = () =>
  isIOS() &&
  typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function'

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showMotionPrompt, setShowMotionPrompt] = useState(false)
  const [motionEnabled, setMotionEnabled] = useState<boolean | null>(null)
  const motionEnabledRef = useRef<boolean>(false)

  const enableMotion = () => {
    if (needsOrientationPermission()) {
      ;(DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> })
        .requestPermission()
        .then((response) => {
          if (response === 'granted') {
            motionEnabledRef.current = true
            setMotionEnabled(true)
          } else {
            setMotionEnabled(false)
          }
          setShowMotionPrompt(false)
        })
        .catch(() => setShowMotionPrompt(false))
    } else {
      motionEnabledRef.current = true
      setMotionEnabled(true)
      setShowMotionPrompt(false)
    }
  }

  useEffect(() => {
    // Lock to portrait so rotating the phone only moves the 360 view, not the UI
    const orient = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    orient?.lock?.('portrait')?.catch(() => {})
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let rafId: number
    let cleanup: (() => void) | undefined

    import('three').then((THREE) => {
      const scene = new THREE.Scene()
      const getH = () => window.visualViewport?.height ?? window.innerHeight
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / getH(), 0.1, 100)
      camera.position.set(0, 0, 0)

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
      renderer.setSize(window.innerWidth, getH())
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

      const geometry = new THREE.SphereGeometry(50, 64, 32)
      geometry.scale(-1, 1, 1)
      const texture = new THREE.TextureLoader().load('/assets/360-background.jpeg')
      texture.colorSpace = THREE.SRGBColorSpace
      const material = new THREE.MeshBasicMaterial({ map: texture })
      scene.add(new THREE.Mesh(geometry, material))

      // ── Gyroscope: proper quaternion math (from Three.js DeviceOrientationControls) ──
      // This is the only correct way — Euler lon/lat conversion causes gimbal lock & jitter
      const gyroTarget = new THREE.Quaternion()
      const zee = new THREE.Vector3(0, 0, 1)
      const euler = new THREE.Euler()
      const q0 = new THREE.Quaternion()
      const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)) // -90° around X
      let usingGyro = false

      const getScreenAngle = () =>
        THREE.MathUtils.degToRad(
          typeof screen !== 'undefined' && screen.orientation ? screen.orientation.angle : 0
        )

      const onDeviceOrientation = (e: DeviceOrientationEvent) => {
        if (!motionEnabledRef.current) return
        if (e.alpha === null || e.beta === null || e.gamma === null) return
        usingGyro = true

        const alpha = THREE.MathUtils.degToRad(e.alpha)
        const beta  = THREE.MathUtils.degToRad(e.beta)
        const gamma = THREE.MathUtils.degToRad(e.gamma)

        euler.set(beta, alpha, -gamma, 'YXZ')
        gyroTarget.setFromEuler(euler)
        gyroTarget.multiply(q1)
        gyroTarget.multiply(q0.setFromAxisAngle(zee, -getScreenAngle()))
      }

      window.addEventListener('deviceorientation', onDeviceOrientation)

      // ── Mouse / touch drag (desktop + touch override) ──
      let lon = 180, targetLon = 180
      let lat = 0,   targetLat = 0
      let isDragging = false
      let prevX = 0, prevY = 0

      const onMouseDown = (e: MouseEvent) => { isDragging = true; prevX = e.clientX; prevY = e.clientY }
      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging) return
        targetLon -= (e.clientX - prevX) * 0.18
        targetLat  = Math.max(-85, Math.min(85, targetLat + (e.clientY - prevY) * 0.18))
        prevX = e.clientX; prevY = e.clientY
      }
      const onMouseUp = () => { isDragging = false }

      const onTouchStart = (e: TouchEvent) => { isDragging = true; prevX = e.touches[0].clientX; prevY = e.touches[0].clientY }
      const onTouchMove  = (e: TouchEvent) => {
        if (!isDragging) return
        e.preventDefault()
        targetLon -= (e.touches[0].clientX - prevX) * 0.25
        targetLat  = Math.max(-85, Math.min(85, targetLat + (e.touches[0].clientY - prevY) * 0.25))
        prevX = e.touches[0].clientX; prevY = e.touches[0].clientY
      }
      const onTouchEnd = () => { isDragging = false }

      canvas.addEventListener('mousedown', onMouseDown)
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      canvas.addEventListener('touchstart', onTouchStart, { passive: false })
      canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
      canvas.addEventListener('touchend',   onTouchEnd)

      const onResize = () => {
        camera.aspect = window.innerWidth / getH()
        camera.updateProjectionMatrix()
        renderer.setSize(window.innerWidth, getH())
      }
      window.addEventListener('resize', onResize)

      // Detect mobile for auto-enable (Android)
      const isMobile = 'ontouchstart' in window
      if (isMobile && !needsOrientationPermission()) {
        motionEnabledRef.current = true
        setMotionEnabled(true)
      } else if (isMobile && needsOrientationPermission()) {
        setShowMotionPrompt(true)
      }

      const animate = () => {
        rafId = requestAnimationFrame(animate)

        if (usingGyro && !isDragging) {
          // Quaternion slerp — buttery smooth, no gimbal lock
          camera.quaternion.slerp(gyroTarget, 0.1)
        } else {
          // Desktop / touch drag — lon/lat with lerp
          const isMobileNow = 'ontouchstart' in window
          if (!isDragging && !isMobileNow) targetLon += 0.015
          lon += (targetLon - lon) * 0.12
          lat += (targetLat - lat) * 0.12

          const phi   = THREE.MathUtils.degToRad(90 - lat)
          const theta = THREE.MathUtils.degToRad(lon)
          camera.lookAt(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
          )
        }

        renderer.render(scene, camera)
      }
      animate()

      cleanup = () => {
        cancelAnimationFrame(rafId)
        window.removeEventListener('deviceorientation', onDeviceOrientation)
        canvas.removeEventListener('mousedown', onMouseDown)
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        canvas.removeEventListener('touchstart', onTouchStart)
        canvas.removeEventListener('touchmove',  onTouchMove)
        canvas.removeEventListener('touchend',   onTouchEnd)
        window.removeEventListener('resize', onResize)
        renderer.dispose()
        geometry.dispose()
        material.dispose()
        texture.dispose()
      }
    })

    return () => { if (cleanup) cleanup(); else cancelAnimationFrame(rafId) }
  }, [])

  return (
    <div className="relative w-screen overflow-hidden bg-black select-none" style={{ height: '100dvh' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
        <h1
          className="text-white font-light tracking-widest"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 3.2rem)', textShadow: '0 2px 20px rgba(0,0,0,0.6)' }}
        >
          James Bradley
        </h1>
        <div className="flex flex-col items-center gap-3 pointer-events-auto">
          <a
            href="tel:+17346263989"
            className="text-white/70 hover:text-white transition-colors duration-200 tracking-wide"
            style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}
          >
            734-626-3989
          </a>
          <a
            href="mailto:jbradbixler@gmail.com"
            className="text-white/70 hover:text-white transition-colors duration-200 tracking-wide"
            style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.15rem)', textShadow: '0 1px 10px rgba(0,0,0,0.5)' }}
          >
            jbradbixler@gmail.com
          </a>
        </div>
      </div>

      {showMotionPrompt && motionEnabled !== true && (
        <button
          onClick={enableMotion}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '100px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.82rem',
            letterSpacing: '0.06em',
            padding: '10px 22px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            cursor: 'pointer',
          }}
        >
          Enable Motion
        </button>
      )}
    </div>
  )
}
