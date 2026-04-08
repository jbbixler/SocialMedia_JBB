import rawData from '../../data.json'
import type { Client, About } from '@/types'

interface RawAbout {
  name: string
  handle: string
  avatar: string
  logo: string
  bio: string
  website: string
  role: string
  color: string
  services: string[]
  media: Array<{ type: 'image' | 'video'; src: string; ratio: string; caption?: string }>
}

interface RawData {
  clients: Client[]
  about: RawAbout | null
}

function normalizePath(p: string): string {
  if (!p) return ''
  if (p.startsWith('http://') || p.startsWith('https://')) return p
  return p.startsWith('/') ? p : `/${p}`
}

// Support both old format (bare array) and new format ({ clients, about })
const raw = (Array.isArray(rawData)
  ? { clients: rawData as Client[], about: null }
  : rawData) as RawData

export const clients: Client[] = raw.clients.map(c => ({
  ...c,
  logo:     normalizePath(c.logo),
  igAvatar: normalizePath(c.igAvatar),
  ads: c.ads.map(a => ({
    ...a,
    src: normalizePath(a.src),
  })),
}))

export const about: About | null = raw.about ? {
  ...raw.about,
  avatar: normalizePath(raw.about.avatar),
  logo:   normalizePath(raw.about.logo),
  media:  raw.about.media.map(m => ({ ...m, src: normalizePath(m.src) })) as About['media'],
} : null
