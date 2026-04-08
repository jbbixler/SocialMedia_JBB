export type Ratio = '1:1' | '4:5' | '9:16' | '1.91:1'

export interface Ad {
  type: 'image' | 'video'
  src: string
  ratio: Ratio
  caption?: string
}

export interface About {
  name: string        // "James Bradley"
  handle: string      // "jbradbixler"
  avatar: string      // profile photo (Instagram-style)
  logo: string        // page logo (same or different)
  bio: string         // description / bio text
  website: string     // "https://jbradbixler.com/"
  role: string        // "Paid Social Creative Director"
  color: string       // theme color
  services: string[]  // skills / services offered
  media: Ad[]         // images/videos in the about section
}

export interface Client {
  id: string
  name: string
  logo: string       // _clientpage logo — used in topbar / client view
  igAvatar: string   // _Instagram logo — used as IG profile pic / story circle
  color: string
  igHandle: string
  website?: string
  description: string
  services: string[]
  cta?: string       // CTA button label for the IG feed (defaults to 'Learn More')
  brandType?: string // e.g. 'E-Commerce', 'Lead Generation', 'Consumer Services'
  ads: Ad[]
}

export type ViewState =
  | { view: 'home' }
  | { view: 'client'; client: Client }
  | { view: 'ad'; client: Client; adIndex: number }
