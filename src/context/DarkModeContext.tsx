'use client'

import { createContext, useContext, useState, useCallback } from 'react'

// All heart sound filenames in public/assets/sounds/heart/
const HEART_SOUNDS = [
  '14 LEX SFX.mp3',
  '808 2og_G.mp3',
  'Chief Keef 2012 Riser.wav',
  'Chief Keef Aye.mp3',
  'DOWNWARD_PHONKKICK.wav',
  'DS_BPT_bass_synth_rifle_D.wav',
  'EDPH - Reverse Bass Kick - A#.wav',
  'Eagle.mp3',
  'Gun Cock.mp3',
  'Gunshot.mp3',
  'HI C VOX (1).mp3',
  'HI C VOX (18).mp3',
  'HI C VOX (21).mp3',
  'Hip.mp3',
  'JF No Beat - GMS - Kick 26.wav',
  'JF No Beat - GMS - Perc 36.wav',
  'JJP_R90SRNB_synth_bass_one_shot_must_have_rnb_C#maj.wav',
  'KEEF FX 3 (Kill Bill).wav',
  'LLTXS_fuck_snare_one_shot_widebuilder.wav',
  'MainPercHit.mp3',
  'News.mp3',
  'Perc_01_313LIT.wav',
  'Perc_02_313LIT.wav',
  'Perc_03_313LIT.wav',
  'Perc_04_313LIT.wav',
  'Perc_05_313LIT.wav',
  'Perc_06_313LIT.wav',
  'Perc_07_313LIT.wav',
  'Perc_08_313LIT.wav',
  'Perc_09_313LIT.wav',
  'Perc_10_313LIT.wav',
  'Perc_11_313LIT.wav',
  'Perc_12_313LIT.wav',
  'Perc_13_313LIT.wav',
  'Perc_14_313LIT.wav',
  'Perc_15_313LIT.wav',
  'Perc_16_313LIT.wav',
  'Perc_17_313LIT.wav',
  'Perc_18_313LIT.wav',
  'Perc_19_313LIT.wav',
  'Perc_20_313LIT.wav',
  'Perc_21_313LIT.wav',
  'Perc_22_313LIT.wav',
  'Perc_23_313LIT.wav',
  'Perc_24_313LIT.wav',
  'Perc_25_313LIT.wav',
  'Perc_26_313LIT.wav',
  'Perc_27_313LIT.wav',
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
  'SULLIVAN_KING_snare_ember_dry.wav',
  'Sosa Chant.wav',
  'Speak.mp3',
  'StoopidXool Key SFX.mp3',
  'TS_PAUL_MABURY_snare_one_shot_snappy_big_m1.wav',
  'That Girl Aye.mp3',
  'Tip.mp3',
  'Triple.mp3',
  'TronHat.mp3',
  'VIOLIN touch.mp3',
  'Vai Tomar - JF No Beat - GMS.wav',
  'WHERESSK - 963CTM808v2.wav',
  'YJSRSnare.mp3',
  'ZoomOut.mp3',
  'clap 4 - hand crushed by a mallet.wav',
  'ff_rdt_clap_one_shot_drama.wav',
  'had to lmao.mp3',
  'money machine.mp3',
  'openhat (jaws).wav',
  'phone beep.mp3',
  'snaredancy.mp3',
]

interface ThemeCtx {
  dark: boolean
  hotPink: boolean   // true = hot pink Easter egg active
  heartCount: number
  storyOpen: boolean // true while story viewer is visible
  toggleDark: () => void
  onHeartTap: () => void
  setStoryOpen: (v: boolean) => void
}

const Ctx = createContext<ThemeCtx>({
  dark: false,
  hotPink: false,
  heartCount: 0,
  storyOpen: false,
  toggleDark: () => {},
  onHeartTap: () => {},
  setStoryOpen: () => {},
})

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)
  const [heartCount, setHeartCount] = useState(0)
  const [storyOpen, setStoryOpen] = useState(false)

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

  return (
    <Ctx.Provider value={{ dark, hotPink, heartCount, storyOpen, toggleDark, onHeartTap, setStoryOpen }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
