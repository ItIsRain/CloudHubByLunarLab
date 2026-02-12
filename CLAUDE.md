# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudHub by Lunar Labs — a Next-Gen Event & Hackathon Management Platform combining event pages/ticketing (like Luma) with hackathon management/team formation/judging (like lablab.ai). The full feature spec lives in `event-platform-frontend-prompt.md`.

**Current state:** ~15-20% implemented. Landing page, auth pages, explore page, and basic dashboard are built. All major dependencies are installed but many (FullCalendar, Tiptap, Monaco, Recharts, TanStack Table, dnd-kit, react-dropzone) are not yet used in any pages.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** (strict mode)
- **Tailwind CSS 4** — configured via `@theme` in `globals.css`, NOT a tailwind.config file
- **shadcn/ui** (Radix primitives) with CVA variants — components in `src/components/ui/`
- **Framer Motion 12** — animations on all interactive elements
- **Zustand** — client state (`src/store/auth-store.ts`, `src/store/ui-store.ts`)
- **TanStack Query v5** — server state (provider in `src/providers/query-provider.tsx`)
- **React Hook Form + Zod** — form handling and validation
- **Sonner** — toast notifications

## Architecture

### Path alias
`@/*` maps to `./src/*` (configured in tsconfig.json).

### Route structure (App Router)
- `src/app/(auth)/` — Auth route group with shared split-screen layout (login, register)
- `src/app/dashboard/` — Authenticated user dashboard
- `src/app/explore/` — Event/hackathon discovery with filtering
- `src/app/page.tsx` — Landing page (hero, features, pricing, testimonials)

### Key directories
- `src/components/ui/` — shadcn/ui base components (Button, Card, Badge, Dialog, etc.) with extended variants (gradient button, dot/pulse badge)
- `src/components/cards/` — Domain cards (EventCard with 3 variants: default/compact/featured, HackathonCard with live countdown)
- `src/components/layout/` — Navbar (responsive, scroll-aware, auth-aware) and Footer
- `src/lib/types.ts` — All TypeScript interfaces (~450 lines): User, Event, Hackathon, Team, Submission, Notification, etc.
- `src/lib/mock-data.ts` — Comprehensive mock dataset (~1500 lines) with helper functions like `getFeaturedEvents()`, `getActiveHackathons()`
- `src/lib/utils.ts` — Utility functions including `cn()` (clsx+twMerge), date/time formatters, `slugify`, `getInitials`, `debounce`, `throttle`
- `src/providers/` — QueryProvider (TanStack Query), ThemeProvider
- `src/store/` — Zustand stores with localStorage persistence

### Auth
Mock auth via Zustand store (`auth-store.ts`). No real auth provider yet — designed to be replaced with NextAuth/Clerk. Login auto-creates users if not found in mock data.

### Data
All data is currently from `src/lib/mock-data.ts`. No API routes exist yet. The spec defines `src/app/api/` routes but they're not implemented.

## Design System

### Fonts (Google Fonts, imported in globals.css)
- **Display/headings:** Outfit
- **Body:** Space Grotesk
- **Monospace:** JetBrains Mono

### Colors (HSL, defined in globals.css @theme)
- **Primary:** Electric Coral — `hsl(12 100% 55%)`
- **Accent:** Vibrant Magenta — `hsl(322 80% 55%)`
- Full dark mode support with separate dark theme values

### Custom CSS utilities (globals.css)
- `.gradient-text` — multi-color gradient text
- `.glass` — glassmorphism (backdrop-blur + semi-transparent bg)
- `.noise` — texture overlay
- `.shimmer` — loading skeleton animation
- `.grid-bg` / `.dot-bg` — background patterns
- `.stagger-1` through `.stagger-10` — staggered animation delays

### Design rules (from spec)
1. Every page should feel like a premium SaaS product, not generic Bootstrap/Material
2. Motion is mandatory — page transitions, staggered list entries, hover lifts, skeleton loaders
3. Every list/table needs a designed empty state with CTA
4. Loading states use skeleton shimmer, not spinners
5. Responsive first: mobile -> tablet -> desktop
6. Card-based layouts with subtle borders, soft shadows, hover lift

## Patterns to Follow

- All pages currently use `"use client"` — no Server Components yet
- Components use `cn()` from `@/lib/utils` for conditional class merging
- Card components use CVA for variant management (see `button.tsx`, `badge.tsx` for examples)
- Animations use Framer Motion's `motion.div` with `initial`/`animate`/`whileHover` patterns
- Images use `next/image` with remote patterns configured in `next.config.ts` for: Dicebear avatars, Unsplash, YouTube thumbnails
- Enums for statuses: `UserRole`, `EventStatus`, `HackathonStatus` (7 states), `EventCategory` (12 categories) — all in `types.ts`
