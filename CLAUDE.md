# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudHub by Lunar Labs — a Next-Gen Event & Hackathon Management Platform combining event pages/ticketing (like Luma) with hackathon management/team formation/judging (like lablab.ai). The full feature spec lives in `event-platform-frontend-prompt.md`.

**Current state:** Core platform is functional. Landing page, auth (Supabase), explore, dashboard, event/hackathon CRUD, registration with screening pipeline, phase-based judging system, reviewer management, winners system, real-time notifications, and email communications are all implemented. Most data flows through Supabase with real API routes.

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
- **Supabase** — PostgreSQL database, auth, RLS, storage
- **Zustand** — client state (`src/store/auth-store.ts`, `src/store/ui-store.ts`)
- **TanStack Query v5** — server state (provider in `src/providers/query-provider.tsx`)
- **React Hook Form + Zod** — form handling and validation
- **Sonner** — toast notifications

## Architecture

### Path alias
`@/*` maps to `./src/*` (configured in tsconfig.json).

### Route structure (App Router)
- `src/app/(auth)/` — Auth route group with shared split-screen layout (login, register)
- `src/app/dashboard/` — Authenticated user dashboard (events, hackathons, settings)
- `src/app/explore/` — Event/hackathon discovery with filtering
- `src/app/judge/` — Judge/reviewer dashboard and scoring pages
- `src/app/api/` — API routes for all CRUD and business logic
- `src/app/page.tsx` — Landing page (hero, features, pricing, testimonials)

### Key directories
- `src/components/ui/` — shadcn/ui base components (Button, Card, Badge, Dialog, etc.) with extended variants
- `src/components/cards/` — Domain cards (EventCard with 3 variants, HackathonCard with live countdown)
- `src/components/layout/` — Navbar (responsive, scroll-aware, auth-aware) and Footer
- `src/lib/types.ts` — All TypeScript interfaces: User, Event, Hackathon, CompetitionPhase, PhaseDecision, etc.
- `src/lib/supabase/` — Supabase clients (`server.ts`, `admin.ts`, `client.ts`), mappers, auth helpers
- `src/lib/api-auth.ts` — Dual auth: session cookies OR API key (Bearer token)
- `src/lib/constants.ts` — `UUID_RE`, `PLAN_LIMITS`, `PRICING_TIERS`, categories, tags
- `src/hooks/` — TanStack Query hooks for events, hackathons, teams, notifications, bookmarks, phase scoring, etc.
- `src/providers/` — QueryProvider (TanStack Query), ThemeProvider, AuthProvider
- `src/store/` — Zustand stores with localStorage persistence

### Auth
Supabase Auth with session cookies. `AuthProvider` at `src/providers/auth-provider.tsx` hydrates Zustand store on mount. Middleware at `src/lib/supabase/middleware.ts` protects: /dashboard, /admin, /onboarding, /settings, /profile/edit, /events/create, /hackathons/create, /judge, /mentor.

### Data
All data flows through Supabase via API routes. Mappers at `src/lib/supabase/mappers.ts` convert between DB snake_case and frontend camelCase.

### Supabase Tables
`profiles`, `events`, `hackathons`, `notifications`, `teams`, `team_members`, `testimonials`, `bookmarks`, `hackathon_registrations`, `competition_phases`, `phase_reviewers`, `reviewer_assignments`, `phase_scores`, `phase_decisions`, `reviewer_conflicts`, `phase_finalists`, `api_keys`, `competition_winners`, `award_tracks`, `hackathon_announcements`, `email_templates`, `email_log`, `scheduled_emails`, `judge_invitations` — all with RLS enabled.

## Phase-Based Judging System

### Overview
Hackathons have **competition phases** (e.g., "Abu Dhabi Phase", "Dubai Phase"). Each phase has:
- Scoring criteria (weighted or unweighted, per-criterion maxScore)
- Reviewers (invited/accepted via `phase_reviewers`)
- Applicant assignments (via `reviewer_assignments`)
- Scores (via `phase_scores`)
- Decisions (via `phase_decisions`, majority-rule engine)
- Finalists (via `phase_finalists`)

### Key API routes
- `GET/POST /api/hackathons/[id]/phases` — CRUD for competition phases
- `GET/POST/DELETE /api/hackathons/[id]/phases/[phaseId]/assignments` — Reviewer-to-applicant assignments (round-robin auto-assign)
- `GET/POST /api/hackathons/[id]/phases/[phaseId]/scores` — Score submission and retrieval
- `GET/POST /api/hackathons/[id]/phases/[phaseId]/decisions` — Majority-rule decision engine + overrides
- `GET/POST /api/hackathons/[id]/phases/[phaseId]/finalists` — Auto/manual finalist selection
- `GET /api/hackathons/my-phases` — Reviewer's assigned phases (dashboard discovery)
- `GET /api/judge/scores` — Reviewer's complete score history with stats

### Reviewer status
Reviewers can be "invited" or "accepted". Both statuses grant access to judge pages, scoring, and assignments. All APIs and RLS policies accept both statuses.

### Blind review
When `blind_review = true` on a phase, API strips applicant identity (name, email) from responses for non-organizer reviewers. Frontend does NOT duplicate this logic.

### Supabase FK join pattern
FK joins may return objects OR arrays depending on cardinality. Always normalize:
```typescript
const normalizeJoin = (val: any) => (Array.isArray(val) ? val[0] : val) ?? null;
```
Use manual profile enrichment (separate `profiles` query) as a fallback when FK joins don't return expected data.

### Admin client usage
Phase-related API routes use `getSupabaseAdminClient()` instead of `getSupabaseServerClient()` because RLS on `competition_phases` can block FK joins for reviewers. Auth is verified independently at the API level.

## Winners System

### Overview
Hackathons can have **competition winners** tied to award tracks. Winners are managed in the dashboard Winners tab and displayed publicly after the `winners_announcement` date.

### Key API routes
- `GET/POST/PATCH/DELETE /api/hackathons/[id]/winners` — CRUD for competition winners
- `GET /api/hackathons/[id]/winners/public` — Public endpoint (no auth required), only returns winners after `winners_announcement` date
- `POST /api/hackathons/[id]/winners/email` — Send bulk emails to all winners with template placeholders

### Public winners
The public hackathon page (`page-client.tsx`) uses `usePublicWinners()` to fetch winners. When `winnersAnnounced` is true, a "Winners" tab appears and winners are highlighted in the Overview tab. Completed hackathons default to the Winners tab.

### Winner email placeholders
`{{winner_name}}`, `{{award_label}}`, `{{rank}}`, `{{hackathon_name}}`, `{{organizer_name}}`, `{{hackathon_url}}`, `{{dashboard_url}}`

## Notification System

### Overview
Real-time in-app notifications displayed in a slide-over panel from the navbar. Bell icon shows unread count badge (auto-refreshes every 30s).

### Notification types
`event-reminder`, `hackathon-update`, `team-invite`, `team-message`, `submission-feedback`, `winner-announcement`, `system`

### Events that trigger notifications
| Event | Type | Route |
|-------|------|-------|
| User registers for hackathon | `hackathon-update` | `register/route.ts` |
| Registration status change | `hackathon-update` | `participants/route.ts`, `screen/route.ts` |
| Winner declared | `winner-announcement` | `winners/route.ts` |
| Announcement sent | `hackathon-update` | `announcements/route.ts` |
| Judge invited (if has account) | `hackathon-update` | `judges/invite/route.ts` |
| Application scored (first review) | `submission-feedback` | `phases/[phaseId]/scores/route.ts` |
| Waitlist promotion | `hackathon-update` | `register/route.ts`, `rsvp/route.ts` |
| Team auto-matching | `team-invite` | `teams/match/route.ts` |

### Key files
- `src/components/special/notification-panel.tsx` — Slide-over UI with icons per type
- `src/hooks/use-notifications.ts` — TanStack Query hooks (`useNotifications`, `useUnreadNotificationCount`, `useMarkAllNotificationsRead`)
- `src/components/layout/navbar.tsx` — Renders `NotificationPanel`, shows real unread count

## Email System

### Email helpers (`src/lib/resend.ts`)
- `emailWrapper(content: string)` — Full HTML email template wrapper (takes a **string**, not an object)
- Helper functions: `statusBanner`, `bodySection`, `greeting`, `paragraph`, `ctaButton`, `eventName`, `divider`, `infoBox`, `COLORS`
- All exported for use in API routes
- Email body content supports HTML formatting (bold, italic, lists, etc.) — do NOT `escapeHtml()` the body, only escape user names

### Bulk email routes
- `PUT /api/hackathons/[id]/email-templates` — Send to registrants filtered by status
- `POST /api/hackathons/[id]/winners/email` — Send to all winners
- `POST /api/hackathons/[id]/announcements` — Send announcements + create in-app notifications

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
- Next.js 16 uses `params: Promise<{}>` pattern (must await params in route handlers)
- `useSearchParams()` requires Suspense boundary for static prerendering
- Supabase FK joins: `.select('*, organizer:profiles!organizer_id(*)')` — always normalize with `normalizeJoin`
- UUID vs slug detection in API routes: use `UUID_RE` regex to choose `id.eq.` vs `slug.eq.` filter
- API responses should use camelCase (mappers convert from snake_case DB columns)
- Hackathon column is `cover_image` (not `banner_url`)
- Completed hackathons show in explore/landing with green "Completed" badge; active hackathons always sort before completed
- For nested FK joins that may silently fail, use separate queries with lookup maps instead (see `winners/email/route.ts` pattern)
- Notification panel is rendered in `navbar.tsx` and connected to `notificationPanelOpen` in ui-store
