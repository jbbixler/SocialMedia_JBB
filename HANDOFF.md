# Portfolio — Handoff Document
**Last updated:** April 30, 2026  
**Project:** James Bradley Bixler — Interactive Ad Portfolio  
**Repo:** https://github.com/jbbixler/SocialMedia_JBB  
**Branch:** main  
**Local path:** `/Users/jamesbixler/portfolio-next`

---

## What This Is

A Next.js portfolio that mimics Instagram's mobile UI. On desktop it renders an iPhone mockup in the browser with a fully interactive IG-style app inside. On real mobile (<768px) it renders as a full-screen native-feeling app. Visitors can browse ad creative by client, view stories, watch reels, and chat with a Claude AI bot that collects lead info.

---

## Live URLs

| | |
|---|---|
| **Production** | Deployed on Vercel (connect custom domain — not yet done) |
| **Ads portfolio route** | `/ads-socialmedia` |
| **Home page** | `/` — 360° background viewer with contact info |

---

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **AI Chatbot:** Anthropic Claude API (`/api/chat`)
- **Email:** Resend API (`/api/lead`, `/api/visit`, `/api/comment`)
- **Asset CDN:** Cloudinary (cloud: `ddcdzio9n`)
- **Analytics:** Vercel Analytics
- **Deployment:** Vercel (auto-deploys on push to main)

---

## Environment Variables (set in Vercel dashboard)

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Sends lead/visit/comment emails |
| `ANTHROPIC_API_KEY` | Powers the chatbot |
| `LEAD_EMAIL` | Override destination email (defaults to `jbbleads@gmail.com`) |

---

## Key Files

| File | Purpose |
|---|---|
| `data.json` | **Source of truth** — all clients, ads, about section |
| `src/lib/data.ts` | Loads data.json |
| `src/types/index.ts` | TypeScript types: Client, Ad, About |
| `src/app/page.tsx` | Home page (360° viewer) |
| `src/app/ads-socialmedia/page.tsx` | Ad portfolio route |
| `src/app/layout.tsx` | Root layout — Analytics + VisitPing |
| `src/components/Portfolio.tsx` | Desktop/mobile split, AnimatePresence routing |
| `src/components/HomeView.tsx` | Desktop hero + phone mockup + brand grid |
| `src/components/HomeIgMockup.tsx` | Scaled phone frame (desktop) |
| `src/components/ClientView.tsx` | Desktop client detail page |
| `src/components/HomePage.tsx` | 360° background home page |
| `src/components/VisitPing.tsx` | Fires visit notification email on page load |

### Mobile Components (`src/components/mobile/`)

| File | Purpose |
|---|---|
| `MobileApp.tsx` | Root on real mobile, manages screen state |
| `MobileFeed.tsx` | Main feed — stories bar + posts (ads + personal) |
| `MobileSearch.tsx` | Search tab — brand grid + "Selected Work" grid |
| `MobileReels.tsx` | Vertical video swipe |
| `MobileClientProfile.tsx` | Client profile with tappable story ring |
| `MobileAboutProfile.tsx` | James's profile — personal posts + story viewer |
| `MobileSavedTab.tsx` | Claude AI chatbot + saved/bookmarked posts |
| `MobilePost.tsx` | Single feed post (`personal` prop hides Sponsored/CTA) |
| `MobileStoryViewer.tsx` | Full-screen story viewer |
| `MobileNav.tsx` | Bottom nav bar |

### API Routes (`src/app/api/`)

| Route | Purpose |
|---|---|
| `/api/chat` | Claude AI chatbot — goal: collect contact info in ≤3 messages |
| `/api/lead` | Emails transcript to `jbbleads@gmail.com` on contact captured or 5min inactivity |
| `/api/visit` | Emails visit notification (city, country, device, page) |
| `/api/comment` | Emails story comments |

---

## Cloudinary

- **Account:** `ddcdzio9n` (new account created April 2026)
- **Old disabled account:** `dwrvp3dmf` — do not use
- **Upload script:** `scripts/upload-to-cloudinary.mjs` — re-run if new assets need uploading
- **URL format:** `https://res.cloudinary.com/ddcdzio9n/image/upload/f_auto,q_auto/portfolio/assets/clients/[CLIENT]/[FILENAME]`
- **Credit budget:** 25 credits/month rolling. ~24GB bandwidth. Estimated ~1,600 visits before limit.
- **Warning:** Do NOT add transformation params beyond `f_auto,q_auto` — that's what burned the old account

---

## Assets

| Location | Contents |
|---|---|
| `public/assets/clients/` | All ad images + videos (gitignored for videos) |
| `public/assets/about/media/` | James's 15 personal photos/videos |
| `public/assets/about/Logo/BRAD_symbol.png` | James's profile picture |
| `public/assets/360-background.jpeg` | Home page 360° background |

**Note:** Video files (`.mp4`, `.mov`) are gitignored — they live locally and on Cloudinary only.

---

## Features

### Easter Egg
- Tap the heart in the feed header
- At 69 taps: full pink mode (hotPink) — everything turns pink, meteor shower on mobile
- Battery icon: 80% at rest, fills 0→100% as heart tapped 1→69 times
- iOS status bar + story bar background change with pink theme

### Story Rings
- Gradient ring on: feed bubbles, client profile avatar, about profile avatar
- Tapping avatar opens story viewer for that client/profile
- Ring switches to pink gradient in hotPink mode

### Lead Gen (Chatbot)
- Lives in the "Direct Messages" tab (bookmark icon)
- Claude AI, instructed to get name + contact within first 3 messages
- Fires silent email to `jbbleads@gmail.com` when contact captured
- Also fires after 5 minutes of inactivity with full transcript

### Visit Tracking
- Every new page visit (once per session) emails `jbbleads@gmail.com`
- Includes: city, region, country, device type, page visited
- Vercel Analytics dashboard also available at vercel.com → project → Analytics

---

## data.json Structure

```json
{
  "clients": [
    {
      "id": "client-id",
      "name": "Brand Name",
      "logo": "https://res.cloudinary.com/ddcdzio9n/...",
      "igAvatar": "https://res.cloudinary.com/ddcdzio9n/...",
      "igHandle": "@handle",
      "color": "#hexcolor",
      "website": "https://...",
      "cta": "Shop Now",
      "brandType": "DTC",
      "services": ["Creative Direction", "UGC"],
      "kpi": { "value": "+43%", "label": "ROAS" },
      "description": "...",
      "summary": {
        "overview": "...",
        "role": "...",
        "challenge": "...",
        "creative": "...",
        "performance": "...",
        "volume": "..."
      },
      "ads": [
        { "type": "image", "src": "https://res.cloudinary.com/...", "ratio": "1:1" }
      ]
    }
  ],
  "about": {
    "name": "James Bradley",
    "handle": "jbb",
    "avatar": "/assets/about/Logo/BRAD_symbol.png",
    "bio": "Let's get in touch!",
    "color": "#1d1d1f",
    "website": "https://jbradbixler.com/",
    "services": [...],
    "media": [
      { "type": "image", "src": "/assets/about/media/...", "ratio": "1:1" }
    ]
  }
}
```

**Rules for data.json:**
- No em dashes (—) anywhere
- Ad ratios: `"1:1"`, `"9:16"`, `"4:5"`, `"16:9"`, `"1.91:1"`
- KPI values replace the old "Full Work" stat on client profiles

---

## Adding a New Client

1. Add assets to `public/assets/clients/[ClientName]/`
2. Run `node scripts/upload-to-cloudinary.mjs` to push to Cloudinary
3. Add client entry to `data.json` following the structure above
4. No code changes needed — everything reads from `data.json`

---

## Pending / Next Steps

- [ ] Connect custom domain in Vercel dashboard
- [ ] Compress + re-upload `flower_de7167f8...joyce_9x16.mp4` (127MB, currently missing from Cloudinary — too large for free plan)
- [ ] Story viewer desktop polish: dead space background black + top-aligned (was requested, not yet done)
- [ ] Brand squares on desktop equal height (was requested, not yet done)

---

## Common Commands

```bash
# Run dev server
npm run dev

# Build
npm run build

# Upload new assets to Cloudinary
node scripts/upload-to-cloudinary.mjs

# Push to production (Vercel auto-deploys)
git add . && git commit -m "message" && git push
```

---

## Contacts / Accounts

| Service | Account |
|---|---|
| GitHub | jbbixler/SocialMedia_JBB |
| Vercel | Connected to GitHub, auto-deploys |
| Cloudinary | `ddcdzio9n` — new account (April 2026) |
| Resend | API key in Vercel env vars |
| Lead email | jbbleads@gmail.com |
