'use client'

import { createContext, useContext, useState, useCallback } from 'react'

// All heart sound filenames in public/assets/sounds/heart/
const HEART_SOUNDS = [
  '14 LEX SFX.mp3',
  'Chief Keef Aye.mp3',
  'Eagle.mp3',
  'Gun Cock.mp3',
  'Gunshot.mp3',
  'HI C VOX (1).mp3',
  'HI C VOX (18).mp3',
  'HI C VOX (21).mp3',
  'Hip.mp3',
  'MainPercHit.mp3',
  'News.mp3',
  'Plasma.mp3',
  'Plug.mp3',
  'Ray.mp3',
  'Rugburn.mp3',
  'SFX ( Shots ) @PoloBoyShawty.mp3',
  'SFX Airhorn Smooker 3.mp3',
  'SFX OGWrecker.mp3',
  'SFX-03.mp3',
  'SFX-07.mp3',
  'SFX.mp3',
  'SFX1-B.mp3',
  'Speak.mp3',
  'StoopidXool Key SFX.mp3',
  'That Girl Aye.mp3',
  'Tip.mp3',
  'Triple.mp3',
  'TronHat.mp3',
  'YJSRSnare.mp3',
  'ZoomOut.mp3',
  'had to lmao.mp3',
  'money machine.mp3',
  'phone beep.mp3',
  'snaredancy.mp3',
]

interface ThemeCtx {
  dark: boolean
  hotPink: boolean   // true = camo Easter egg active
  heartCount: number
  toggleDark: () => void
  onHeartTap: () => void
  camoBg: string     // CSS background value to use instead of solid color
}

// Solid fallback color used for borders/tints when camo is active
export const CAMO_TINT = '#3d4e28'

const Ctx = createContext<ThemeCtx>({
  dark: false,
  hotPink: false,
  heartCount: 0,
  toggleDark: () => {},
  onHeartTap: () => {},
  camoBg: CAMO_TINT,
})

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)
  const [heartCount, setHeartCount] = useState(0)

  const toggleDark = useCallback(() => setDark(d => !d), [])

  const onHeartTap = useCallback(() => {
    const file = HEART_SOUNDS[Math.floor(Math.random() * HEART_SOUNDS.length)]
    try {
      const audio = new Audio('/assets/sounds/heart/' + encodeURIComponent(file))
      audio.volume = 0.75
      audio.play().catch(() => {})
    } catch {}
    setHeartCount(c => c + 1)
  }, [])

  const hotPink = heartCount >= 69
  // camoBg: used as the `background` CSS value; transparent so .camo-bg class shows through
  const camoBg = hotPink ? 'transparent' : ''

  return (
    <Ctx.Provider value={{ dark, hotPink, heartCount, toggleDark, onHeartTap, camoBg }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
