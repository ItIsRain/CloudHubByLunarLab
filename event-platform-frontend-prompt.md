# Full Frontend Prompt: Next-Gen Event & Hackathon Management Platform

> **Use this prompt with any AI coding assistant (Cursor, Claude, Bolt, v0, etc.) to scaffold the complete frontend.**

---

## 🎯 Project Overview

Build a **modern event and hackathon management platform** that combines the best of Luma (beautiful event pages, ticketing, community) and lablab.ai (hackathon management, team formation, project submissions, judging) — while surpassing both in design, UX, and feature completeness.

The platform name is **[YOUR_PLATFORM_NAME]**. It serves event organizers, hackathon hosts, participants, sponsors, judges, and mentors.

---

## 🛠 Tech Stack & Libraries

```
Framework:       Next.js 15 (App Router, Server Components)
Language:        TypeScript (strict mode)
Styling:         Tailwind CSS 4 + tailwind-animate
UI Components:   shadcn/ui (Radix primitives) — install ALL components
Animations:      Framer Motion 12
Icons:           Lucide React + Phosphor Icons (for variety)
Forms:           React Hook Form + Zod validation
State:           Zustand (global) + TanStack Query v5 (server state)
Tables:          TanStack Table v8
Rich Text:       Tiptap Editor
Date/Time:       date-fns + react-day-picker
Charts:          Recharts 2
Drag & Drop:     dnd-kit
File Upload:     react-dropzone
Toast/Notifs:    Sonner
Maps:            Mapbox GL JS or react-map-gl
Calendar View:   @fullcalendar/react
Payments UI:     Stripe Elements (mock integration)
Auth UI:         Mock auth context (ready for NextAuth/Clerk)
Markdown:        react-markdown + rehype-highlight
Code Editor:     Monaco Editor (for hackathon README editing)
```

---

## 🎨 Design System & Principles

### Theme
- **Light mode default** with full dark mode support (system preference + manual toggle)
- Color palette: Neutral base (zinc/slate) with a single vibrant accent color (electric indigo `#6366f1` or customize)
- Typography: Inter for body, Cal Sans or Space Grotesk for display headings
- Border radius: `0.75rem` default (rounded-xl feel)
- Subtle glassmorphism on overlays/modals (backdrop-blur-xl + semi-transparent backgrounds)
- Micro-interactions on every button, card hover, and page transition
- No clutter — generous whitespace, max content width of 1280px

### Design Rules
1. **No generic Bootstrap/Material feel** — every page should feel like a premium SaaS product
2. **Motion is mandatory** — page transitions (Framer Motion layout animations), staggered list entries, hover lifts on cards, skeleton loaders
3. **Empty states are designed** — every list/table has a beautiful illustrated empty state with a CTA
4. **Loading states everywhere** — skeleton shimmer, not spinners
5. **Responsive first** — mobile → tablet → desktop, bottom sheet dialogs on mobile
6. **Consistent spacing scale** — 4px base (Tailwind default)
7. **Card-based layouts** — subtle borders, soft shadows (`shadow-sm`), hover → `shadow-md` lift

---

## 📁 Complete File/Route Structure

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   └── onboarding/page.tsx              ← multi-step profile setup
│
├── (marketing)/
│   ├── page.tsx                          ← Landing / Home page
│   ├── about/page.tsx
│   ├── pricing/page.tsx
│   ├── blog/
│   │   ├── page.tsx                      ← Blog listing
│   │   └── [slug]/page.tsx              ← Blog post
│   ├── contact/page.tsx
│   ├── changelog/page.tsx
│   ├── careers/page.tsx
│   └── legal/
│       ├── terms/page.tsx
│       ├── privacy/page.tsx
│       └── cookies/page.tsx
│
├── explore/
│   ├── page.tsx                          ← Discover events (filterable grid)
│   ├── events/page.tsx                   ← All events (list/grid toggle)
│   ├── hackathons/page.tsx               ← All hackathons
│   ├── communities/page.tsx              ← Community calendars
│   ├── categories/[category]/page.tsx    ← Category filtered view
│   └── search/page.tsx                   ← Global search results
│
├── events/
│   ├── [eventId]/
│   │   ├── page.tsx                      ← Public event page (hero, details, register)
│   │   ├── tickets/page.tsx              ← Ticket selection & checkout
│   │   ├── speakers/page.tsx             ← Speaker lineup
│   │   ├── schedule/page.tsx             ← Agenda / schedule timeline
│   │   ├── gallery/page.tsx              ← Event photo/video gallery
│   │   ├── live/page.tsx                 ← Live stream embed + chat
│   │   └── recap/page.tsx                ← Post-event recap & recordings
│   └── create/page.tsx                   ← Create new event (multi-step form)
│
├── hackathons/
│   ├── [hackathonId]/
│   │   ├── page.tsx                      ← Public hackathon page
│   │   ├── overview/page.tsx             ← Rules, prizes, timeline
│   │   ├── tracks/page.tsx               ← Challenge tracks / themes
│   │   ├── teams/page.tsx                ← Team formation & browse teams
│   │   ├── submissions/page.tsx          ← All project submissions gallery
│   │   ├── submissions/[projectId]/page.tsx ← Single project detail
│   │   ├── leaderboard/page.tsx          ← Live leaderboard & rankings
│   │   ├── mentors/page.tsx              ← Mentor directory + booking
│   │   ├── resources/page.tsx            ← Docs, APIs, starter kits
│   │   ├── schedule/page.tsx             ← Hackathon schedule (kickoff, workshops, demos)
│   │   ├── sponsors/page.tsx             ← Sponsor showcase
│   │   ├── faq/page.tsx                  ← FAQ accordion
│   │   └── live/page.tsx                 ← Live dashboard (countdown, announcements)
│   └── create/page.tsx                   ← Create hackathon wizard
│
├── dashboard/                            ← Authenticated user dashboard
│   ├── page.tsx                          ← Overview (upcoming events, active hackathons)
│   ├── events/
│   │   ├── page.tsx                      ← My events (registered/hosting)
│   │   └── [eventId]/
│   │       ├── page.tsx                  ← Event management overview
│   │       ├── edit/page.tsx             ← Edit event details
│   │       ├── guests/page.tsx           ← Guest list management
│   │       ├── tickets/page.tsx          ← Ticket types & pricing management
│   │       ├── check-in/page.tsx         ← QR code check-in interface
│   │       ├── emails/page.tsx           ← Email blasts & templates
│   │       ├── analytics/page.tsx        ← Event analytics & reports
│   │       └── settings/page.tsx         ← Event settings (visibility, etc.)
│   │
│   ├── hackathons/
│   │   ├── page.tsx                      ← My hackathons (participating/organizing)
│   │   └── [hackathonId]/
│   │       ├── page.tsx                  ← Hackathon management overview
│   │       ├── edit/page.tsx             ← Edit hackathon details
│   │       ├── participants/page.tsx     ← Participant management
│   │       ├── teams/page.tsx            ← Team management & approval
│   │       ├── submissions/page.tsx      ← Review submissions
│   │       ├── judging/page.tsx          ← Judging panel & criteria setup
│   │       ├── mentors/page.tsx          ← Manage mentors
│   │       ├── sponsors/page.tsx         ← Manage sponsors & tiers
│   │       ├── prizes/page.tsx           ← Prize management
│   │       ├── announcements/page.tsx    ← Broadcast announcements
│   │       ├── analytics/page.tsx        ← Hackathon analytics
│   │       └── settings/page.tsx         ← Hackathon settings
│   │
│   ├── community/
│   │   ├── page.tsx                      ← My community / calendar page
│   │   ├── members/page.tsx             ← Member directory
│   │   ├── newsletter/page.tsx          ← Newsletter composer
│   │   └── settings/page.tsx            ← Community settings
│   │
│   ├── submissions/
│   │   ├── page.tsx                      ← My project submissions
│   │   ├── new/page.tsx                  ← New submission form
│   │   └── [submissionId]/
│   │       ├── page.tsx                  ← Submission detail/edit
│   │       └── edit/page.tsx
│   │
│   ├── team/
│   │   ├── page.tsx                      ← My teams overview
│   │   └── [teamId]/page.tsx            ← Team workspace
│   │
│   ├── messages/page.tsx                 ← Inbox / direct messages
│   ├── notifications/page.tsx            ← All notifications
│   ├── bookmarks/page.tsx                ← Saved events & hackathons
│   ├── certificates/page.tsx             ← Achievement certificates
│   ├── billing/page.tsx                  ← Billing & payment history
│   │
│   ├── profile/
│   │   ├── page.tsx                      ← View my public profile
│   │   └── edit/page.tsx                ← Edit profile
│   │
│   └── settings/
│       ├── page.tsx                      ← General settings
│       ├── notifications/page.tsx        ← Notification preferences
│       ├── integrations/page.tsx         ← Connected apps (Zoom, Slack, Discord)
│       ├── api-keys/page.tsx             ← API keys management
│       ├── team-members/page.tsx         ← Organization team management
│       └── billing/page.tsx              ← Subscription & billing
│
├── judge/                                ← Judge-specific portal
│   ├── page.tsx                          ← Judge dashboard
│   ├── [hackathonId]/
│   │   ├── page.tsx                      ← Assigned submissions
│   │   ├── [submissionId]/page.tsx       ← Judging rubric & scoring
│   │   └── results/page.tsx             ← Final rankings
│   └── history/page.tsx                  ← Past judging history
│
├── mentor/                               ← Mentor-specific portal
│   ├── page.tsx                          ← Mentor dashboard
│   ├── availability/page.tsx             ← Set availability slots
│   ├── sessions/page.tsx                 ← Upcoming & past sessions
│   └── [hackathonId]/page.tsx           ← Hackathon-specific mentoring
│
├── profile/[username]/page.tsx           ← Public user profile
│
├── calendar/[calendarSlug]/              ← Public community calendar
│   ├── page.tsx                          ← Calendar view with events
│   └── subscribe/page.tsx               ← Subscribe to calendar
│
├── admin/                                ← Platform admin (superadmin)
│   ├── page.tsx                          ← Admin dashboard
│   ├── users/page.tsx                    ← User management
│   ├── events/page.tsx                   ← All events moderation
│   ├── hackathons/page.tsx               ← Hackathon moderation
│   ├── reports/page.tsx                  ← Reported content
│   ├── analytics/page.tsx                ← Platform-wide analytics
│   ├── featured/page.tsx                 ← Featured events curation
│   └── settings/page.tsx                 ← Platform settings
│
└── api/                                  ← API route stubs
    ├── auth/[...nextauth]/route.ts
    ├── events/route.ts
    ├── hackathons/route.ts
    ├── upload/route.ts
    └── webhooks/stripe/route.ts
```

---

## 📄 Page-by-Page Specifications

### 1. LANDING PAGE (`/`)
**Goal:** Convert visitors into users with a stunning hero section.

```
Layout:
- Sticky transparent navbar that turns solid on scroll (blur backdrop)
- Hero section:
  - Large animated headline with gradient text: "Where Ideas Compete & Communities Thrive"
  - Subtitle with typewriter effect cycling through: "Hackathons • Events • Meetups • Workshops"
  - Two CTAs: "Explore Events" (primary) and "Host an Event" (secondary/outline)
  - Background: subtle animated mesh gradient or particle field (lightweight CSS/SVG)
  - Social proof row: "Trusted by 10,000+ organizers" + logo cloud (dummy logos)
- Bento grid feature showcase (4-6 cards with icons + micro-animations on hover):
  - Beautiful Event Pages
  - Hackathon Management
  - Team Formation
  - Ticketing & Payments
  - Live Streaming
  - Analytics & Insights
- "Upcoming Events" carousel (horizontal scroll, event cards)
- "Active Hackathons" section with countdown timers
- Testimonial slider with avatar + quote cards
- Pricing preview (3 tiers)
- Final CTA banner with email capture
- Footer: sitemap links, social icons, newsletter subscribe, language selector
```

### 2. AUTH PAGES (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`)
```
Design:
- Split layout: left = branded panel with illustration/gradient, right = form
- Social login buttons (Google, GitHub, Discord) at top
- Divider "or continue with email"
- Form fields with floating labels + inline validation
- Password strength meter on register
- "Remember me" toggle
- Magic link option as alternative
- Smooth transition between login/register (shared layout, animated form swap)

Register additional fields:
- Full name, email, password
- Role selector chips: "Attendee", "Organizer", "Both"
- Accept terms checkbox

Onboarding (post-register):
- 3-step wizard with progress bar:
  1. Profile photo upload + bio
  2. Interests/skills tag selector (searchable multi-select)
  3. Follow suggested communities / calendars
- Skip option on each step
```

### 3. EXPLORE / DISCOVER (`/explore`)
```
Layout:
- Full-width header with search bar (command-K style, with filters)
- Category pills horizontally scrollable: "Tech", "AI/ML", "Web3", "Design", "Health", "Music", "Business", etc.
- Toggle: "Events" | "Hackathons" | "All"
- Location filter with map toggle
- Date range picker
- Price filter: "Free", "Paid", "All"
- Sort: "Trending", "Newest", "Upcoming", "Most Popular"
- Grid/List view toggle

Event Cards:
- Cover image with gradient overlay
- Event title, date, location (or "Online")
- Organizer avatar + name
- Attendee count with stacked avatar group
- Price badge ("Free" or "$XX")
- Bookmark icon (top right)
- Hover: slight lift + show "Register" button overlay

Hackathon Cards:
- Similar but with: prize pool badge, countdown timer, participant count, tech stack tags
```

### 4. PUBLIC EVENT PAGE (`/events/[eventId]`)
```
Layout:
- Full-width cover image/video with parallax scroll
- Floating action bar (sticky on scroll): Event title + "Register" / "Get Tickets" button
- Event info section:
  - Title (large, bold)
  - Date/time with timezone auto-detect
  - Location with embedded map (or "Online" with platform badge)
  - Organizer card (avatar, name, follower count, "Follow" button)
  - Price / ticket types preview
  - "Share" button (copy link, Twitter, LinkedIn, WhatsApp)
  - "Add to Calendar" dropdown (Google, Apple, Outlook)
- Rich text description (rendered markdown with images)
- Speakers section (avatar grid with name + title, click → modal with full bio)
- Schedule/Agenda timeline (vertical timeline, collapsible sessions)
- Venue section (map + address + directions link)
- Related events carousel
- "Hosted by" community card
- FAQ accordion
- Guest list preview ("X people going" + avatar stack)
- Comments/discussion section

Registration Dialog (modal):
- Ticket type selector (radio cards)
- Quantity selector
- Registration form fields (name, email, custom questions)
- Payment section (Stripe card element mock)
- Order summary sidebar
- Success state with confetti animation + calendar add buttons
```

### 5. PUBLIC HACKATHON PAGE (`/hackathons/[hackathonId]`)
```
Layout:
- Cinematic hero: background video/image, hackathon logo overlay, countdown timer (large, animated flip clock style)
- Status badge: "Registration Open" / "Hacking in Progress" / "Judging" / "Completed"
- Key stats bar: Prize Pool | Participants | Teams | Days Left
- Tab navigation (sticky):
  - Overview | Tracks | Schedule | Teams | Submissions | Mentors | Sponsors | Resources | FAQ
  
Overview Tab:
- About section (rich text)
- Timeline visual (horizontal stepper: Registration → Kickoff → Hacking → Submission → Judging → Winners)
- Prize breakdown (tier cards: 1st, 2nd, 3rd + special prizes with trophy icons)
- Eligibility requirements
- Rules section

Tracks Tab:
- Track cards: icon, title, description, sponsor logo, track-specific prizes
- Each card expandable for full details

Teams Tab:
- "Find a Team" / "Create Team" / "Go Solo" CTAs
- Team cards: team name, members (avatars), looking for roles (tags), "Request to Join" button
- Team creation dialog: name, description, max size, required skills tags
- "Looking for Teammates" board: individual profiles seeking teams

Submissions Tab:
- Project gallery (masonry grid)
- Each card: project thumbnail, title, team name, tech stack tags, like/upvote count
- Filter by track, sort by votes/recent
- Click → full project page

Leaderboard Tab:
- Sortable table: Rank | Team | Project | Score | Track
- Animated rank changes
- Top 3 highlighted with medals

Mentors Tab:
- Mentor cards: photo, name, company, expertise tags, availability indicator
- "Book a Session" button → time slot picker modal

Resources Tab:
- Categorized resource cards: Documentation, API Keys, Starter Kits, Videos
- Download/link buttons

Sponsors Tab:
- Tiered sponsor showcase: Platinum → Gold → Silver → Community
- Logo grid with company info on hover
```

### 6. CREATE EVENT (`/events/create`)
```
Multi-step form with progress indicator:

Step 1 — Basics:
- Event type selector: "In-Person" | "Online" | "Hybrid"
- Cover image upload (drag & drop with crop tool)
- Event name
- Description (Tiptap rich text editor)
- Category selector
- Tags (multi-select with autocomplete)

Step 2 — Date & Location:
- Start date/time + End date/time (linked pickers)
- Timezone selector
- Recurring event toggle → recurrence pattern config
- Location:
  - In-person: address autocomplete (Mapbox) + map pin preview
  - Online: platform selector (Zoom, Meet, Teams, Custom URL)
  - Hybrid: both fields

Step 3 — Tickets & Registration:
- Ticket type builder (add/remove types):
  - Name, description, price (or free), quantity limit
  - Early bird pricing toggle
  - Group discount option
- Registration questions builder (drag & drop custom fields)
- Approval required toggle
- Waitlist toggle
- Capacity limit

Step 4 — Additional:
- Speaker management (add speakers with photo, name, title, bio)
- Schedule builder (add sessions with time, title, speaker, room)
- Sponsor logos upload
- FAQ builder
- Custom theme selector (color accent picker, font choice)

Step 5 — Review & Publish:
- Full preview of event page
- Visibility selector: Public / Private / Unlisted
- Publish / Save Draft buttons

The entire form auto-saves to localStorage on change.
```

### 7. CREATE HACKATHON (`/hackathons/create`)
```
Wizard with sidebar navigation:

Section 1 — Basic Info:
- Hackathon name, tagline
- Cover image/video upload
- Description (rich text)
- Category & tags

Section 2 — Timeline:
- Registration open/close dates
- Hackathon start/end dates
- Submission deadline
- Judging period
- Winners announcement date
- Visual timeline preview

Section 3 — Tracks & Challenges:
- Add multiple tracks
- Each track: name, description, sponsor, specific prizes, judging criteria
- Suggested technologies per track

Section 4 — Prizes:
- Overall prizes (1st, 2nd, 3rd)
- Track-specific prizes
- Special category prizes (Best UI, Most Innovative, etc.)
- Prize type: Cash / Credits / Swag / Incubation

Section 5 — Rules & Eligibility:
- Rich text rules editor
- Eligibility checklist builder
- Team size limits (min/max)
- Submission requirements checklist

Section 6 — Team Settings:
- Allow solo participants toggle
- Max team size
- Team formation enabled/disabled
- Auto-match feature toggle

Section 7 — Judging:
- Judging criteria builder (criteria name + weight percentage, must sum to 100%)
- Judge invitation (email list)
- Judging type: Panel / Community Vote / Hybrid

Section 8 — Mentors & Resources:
- Mentor invitation
- Resource links
- Starter template repos
- API key distribution setup

Section 9 — Sponsors:
- Sponsor tier builder (tier name, benefits)
- Sponsor entry: logo, name, tier, website

Section 10 — Review & Publish
```

### 8. DASHBOARD — HOME (`/dashboard`)
```
Layout:
- Welcome header: "Good morning, [Name]" with date
- Quick action buttons: "Create Event", "Create Hackathon", "Browse Events"
- Stats cards row: "Events Hosted", "Hackathons Joined", "Total Attendees", "Prize Money Won"
- Two-column layout:
  Left:
  - "Upcoming Events" list (next 5, with quick actions)
  - "Active Hackathons" with status badges and countdown
  Right:
  - Notification feed (last 10)
  - "Your Teams" cards with status
- Activity feed timeline (recent registrations, submissions, etc.)
```

### 9. EVENT MANAGEMENT PAGES (`/dashboard/events/[eventId]/*`)
```
Sidebar navigation within event management:

Overview:
- Key metrics: registrations, check-ins, revenue, page views
- Line chart: registrations over time
- Pie chart: ticket type distribution
- Recent activity log

Guests:
- Searchable, filterable TanStack Table
- Columns: Name, Email, Ticket Type, Status (Registered/Checked-in/Cancelled), Date
- Bulk actions: Email, Export CSV, Approve, Reject
- Add guest manually dialog
- Import from CSV dialog

Tickets:
- Ticket type cards with edit/delete
- Sales summary per type
- Promo code management (create, usage stats, expiry)
- Refund dialog

Check-in:
- Large QR scanner view (camera-based)
- Manual search check-in
- Real-time check-in counter
- Check-in list with timestamps

Emails:
- Email template selector
- Rich text composer
- Recipient filter (all guests, checked-in only, etc.)
- Schedule send option
- Sent emails history

Analytics:
- Registration funnel chart
- Traffic sources
- Geographic distribution map
- Revenue breakdown
- Comparison to previous events

Settings:
- Edit event details
- Transfer ownership
- Duplicate event
- Cancel event (with confirmation dialog + refund option)
- Delete event (destructive action dialog)
```

### 10. HACKATHON MANAGEMENT PAGES (`/dashboard/hackathons/[hackathonId]/*`)
```
Same sidebar pattern as event management, plus:

Participants:
- Table with: Name, Email, Team, Track, Status, Joined Date
- Bulk actions: Approve, Reject, Send Email, Export
- Pending approvals queue

Teams:
- Team cards: name, members (with roles), project name, track
- Merge/split team actions
- Orphan participants list (not in a team)

Submissions:
- Submission cards/table: Project Name, Team, Track, Submitted At, Status, Score
- Click → full submission review with scoring
- Export all submissions

Judging:
- Criteria management
- Judge assignment matrix (judge × submission)
- Scoring progress tracker
- Auto-calculate final rankings
- "Publish Results" action with confirmation

Mentors:
- Mentor list with availability calendar
- Session log
- Add/remove mentors

Sponsors:
- Sponsor management with tier assignment
- Logo upload and ordering
- Sponsor analytics (visibility, clicks)

Prizes:
- Prize allocation to winning teams
- Prize distribution status tracker

Announcements:
- Compose announcement (push to all participants)
- Schedule announcements
- Announcement history
```

### 11. SUBMISSION PAGES (`/dashboard/submissions/*`)
```
New Submission Form:
- Project name
- Tagline (one-liner)
- Description (rich text with image embedding)
- Cover image / demo video upload
- GitHub repo URL
- Demo URL (live link)
- Tech stack multi-select tags
- Track selector (from hackathon)
- Team member roles assignment
- README editor (Monaco code editor with live preview)
- Screenshots gallery upload (drag & drop reorderable with dnd-kit)
- "Submit" with confirmation dialog (can't edit after submission deadline)

Submission Detail Page:
- Hero with cover image/video
- Project name + tagline
- Team members with avatars and roles
- Tech stack badges
- Description (rendered markdown)
- Screenshot carousel
- GitHub + Demo links
- Like/Upvote button with count
- Comment thread
- Judge scores (visible after judging period, if enabled)
```

### 12. JUDGE PORTAL (`/judge/*`)
```
Judge Dashboard:
- Assigned hackathons with status
- Pending reviews count badge
- Completion progress bar

Scoring Interface:
- Split view: Left = submission details (scrollable), Right = scoring form
- Criteria sliders (0-10) with labels
- Written feedback textarea per criteria
- Overall comments
- "Flag for review" option
- Navigation: "Previous" / "Next" submission
- Progress: "3 of 12 reviewed"
- Auto-save scores
```

### 13. MENTOR PORTAL (`/mentor/*`)
```
Mentor Dashboard:
- Active hackathons
- Upcoming sessions
- Past sessions

Availability:
- Weekly calendar grid for setting available slots
- Duration setting (15/30/45/60 min)
- Platform preference (Zoom, Meet, Discord)

Session Booking (participant-facing):
- Mentor card → available time slots
- Book with description of problem/question
- Confirmation + calendar invite
```

### 14. PUBLIC PROFILE (`/profile/[username]`)
```
Layout:
- Cover image + avatar (large)
- Name, headline, location, socials (GitHub, Twitter, LinkedIn, website)
- Bio
- Stats: Events Attended | Hackathons | Projects | Wins
- Tab navigation:
  - Events (registered/hosted)
  - Hackathons (participated/organized)
  - Projects (submission portfolio)
  - Certificates (verifiable achievement cards)
  - Activity (public activity feed)
```

### 15. COMMUNITY CALENDAR (`/calendar/[calendarSlug]`)
```
Layout:
- Community header: logo, name, description, member count, "Subscribe" button
- View toggle: Calendar (month/week/day via FullCalendar) | List view
- Event cards within calendar
- "Upcoming" sidebar with next 5 events
- Newsletter subscribe form
- Community member preview (avatar stack)
- Tags/categories filter
```

### 16. ADMIN PANEL (`/admin/*`)
```
Dashboard:
- Platform stats: Total Users, Events, Hackathons, Revenue
- Charts: growth over time, active users, popular categories
- Recent signups table
- Flagged content alerts

Users:
- Full user table with search/filter
- Actions: View profile, Suspend, Ban, Make Admin, Reset Password
- User detail drawer

Events/Hackathons Moderation:
- Queue of reported/flagged items
- Approve/reject/feature toggle
- Content preview

Featured:
- Drag & drop ordering of featured events/hackathons
- City-based featuring
- Category-based featuring

Analytics:
- Platform-wide charts: DAU/MAU, retention, conversion funnels
- Revenue dashboard
- Geographic distribution
```

### 17. SETTINGS (`/dashboard/settings/*`)
```
General:
- Language selector
- Timezone
- Theme preference (light/dark/system)
- Display name vs username

Notifications:
- Toggle matrix: Email | Push | In-App for each type:
  - Event reminders
  - Hackathon updates
  - Team messages
  - Submission feedback
  - Marketing emails

Integrations:
- Connected apps cards: Zoom, Google Meet, Slack, Discord, GitHub, Notion, Zapier
- Connect/Disconnect buttons
- OAuth flow mock

API Keys:
- Generated keys table
- Create new key dialog (name, scope permissions checkboxes)
- Revoke key action

Team Members (Organization):
- Invite by email
- Role selector: Owner / Admin / Editor / Viewer
- Pending invitations list
- Remove member confirmation

Billing:
- Current plan card
- Usage metrics
- Payment method (Stripe card element mock)
- Invoice history table
- Upgrade/downgrade plan dialog
```

### 18. MESSAGES (`/dashboard/messages`)
```
Layout:
- Split pane: conversation list (left), message thread (right)
- Search conversations
- New message dialog (user search)
- Group chat support
- Message types: text, image, link preview
- Read receipts
- Online status indicators
- Empty state: "No messages yet"
```

### 19. PRICING PAGE (`/pricing`)
```
Layout:
- Toggle: Monthly / Annual (with savings badge)
- 3 tier cards:
  - Free: Basic features, 1 event/month, 50 attendees
  - Pro ($XX/mo): Unlimited events, custom branding, analytics, 500 attendees
  - Enterprise (Contact Us): SSO, API access, dedicated support, unlimited everything
- Feature comparison table below
- FAQ section
- "Start free trial" CTA
```

### 20. BLOG (`/blog`)
```
Layout:
- Featured post hero (large card)
- Category filter tabs
- Post grid (3 columns)
- Post card: cover image, title, excerpt, author avatar, date, read time
- Post page: full markdown render with TOC sidebar, author bio, related posts, comments
```

---

## 🔲 Required Dialogs & Modals (create ALL as reusable components)

```
Dialogs to implement (even if dummy/placeholder):

1.  ConfirmDialog            — Generic confirm/cancel with destructive variant
2.  RegisterEventDialog      — Event registration form
3.  TicketCheckoutDialog     — Ticket selection + payment
4.  CreateTeamDialog         — Team creation form
5.  JoinTeamDialog           — Request to join with message
6.  InviteTeamMemberDialog   — Email invite to team
7.  SubmitProjectDialog      — Quick submission form
8.  BookMentorDialog         — Time slot picker + message
9.  ShareDialog              — Copy link, social share buttons, embed code
10. AddToCalendarDialog      — Google/Apple/Outlook options
11. InviteGuestDialog        — Invite via email/SMS
12. ImportCSVDialog          — File upload + column mapping preview
13. ExportDataDialog         — Format selector (CSV/JSON/PDF) + filter
14. PromoCodeDialog          — Create/edit promo code form
15. RefundDialog             — Refund amount + reason
16. CancelEventDialog        — Cancellation with refund options
17. DeleteConfirmDialog      — Type-to-confirm destructive action
18. EditProfileDialog        — Quick profile edit
19. ChangePasswordDialog     — Current + new password
20. AddSpeakerDialog         — Speaker info form
21. AddSessionDialog         — Schedule session form
22. AddSponsorDialog         — Sponsor details + logo upload
23. AddPrizeDialog           — Prize details form
24. AddTrackDialog           — Track creation form
25. JudgingCriteriaDialog    — Criteria name + weight
26. AnnouncementDialog       — Compose broadcast
27. FeedbackDialog           — Rating + comment form
28. ReportContentDialog      — Report reason selector + details
29. QRCheckInDialog          — Camera QR scanner + manual lookup
30. ImageCropDialog          — Image upload + crop interface
31. EmbedCodeDialog          — Copyable embed code for external sites
32. APIKeyDialog             — Create/view API key
33. ConnectIntegrationDialog — OAuth flow mock
34. NewsletterComposeDialog  — Rich text email builder
35. CertificatePreviewDialog — Certificate viewer with download
36. CommandPalette           — Cmd+K search/navigation overlay
37. NotificationPanel        — Slide-over notification list
38. UserProfileDrawer        — Slide-over user profile preview
39. FilterDrawer             — Mobile filter panel (bottom sheet)
40. MediaGalleryDialog       — Lightbox image/video gallery
```

---

## 🧩 Reusable Component Library (build in `/components/`)

```
components/
├── ui/                          ← shadcn/ui components (install all)
├── layout/
│   ├── Navbar.tsx               ← Main navigation with mega menu
│   ├── DashboardSidebar.tsx     ← Collapsible sidebar with icons
│   ├── Footer.tsx               ← Full footer with links
│   ├── PageHeader.tsx           ← Breadcrumb + title + actions bar
│   └── MobileBottomNav.tsx      ← Bottom tab bar for mobile
│
├── cards/
│   ├── EventCard.tsx            ← Event preview card
│   ├── HackathonCard.tsx        ← Hackathon preview card
│   ├── ProjectCard.tsx          ← Submission/project card
│   ├── TeamCard.tsx             ← Team preview card
│   ├── MentorCard.tsx           ← Mentor profile card
│   ├── SpeakerCard.tsx          ← Speaker profile card
│   ├── SponsorCard.tsx          ← Sponsor logo card
│   ├── PrizeCard.tsx            ← Prize tier card
│   ├── NotificationCard.tsx     ← Notification item
│   ├── StatCard.tsx             ← Metric card with icon
│   ├── PricingCard.tsx          ← Pricing tier card
│   └── TestimonialCard.tsx      ← Quote card with avatar
│
├── forms/
│   ├── FormField.tsx            ← Wrapper with label, error, description
│   ├── ImageUpload.tsx          ← Drag & drop with preview
│   ├── RichTextEditor.tsx       ← Tiptap wrapper
│   ├── TagSelector.tsx          ← Multi-select with autocomplete
│   ├── DateTimePicker.tsx       ← Combined date+time picker
│   ├── LocationPicker.tsx       ← Address autocomplete + map
│   ├── PasswordInput.tsx        ← Show/hide toggle + strength meter
│   └── StepWizard.tsx           ← Multi-step form container
│
├── data/
│   ├── DataTable.tsx            ← TanStack Table wrapper
│   ├── Kanban.tsx               ← Drag & drop kanban board
│   ├── Timeline.tsx             ← Vertical timeline component
│   ├── CountdownTimer.tsx       ← Animated countdown
│   ├── ProgressBar.tsx          ← Animated progress
│   ├── EmptyState.tsx           ← Illustrated empty state
│   ├── SkeletonLoader.tsx       ← Shimmer skeleton variants
│   └── InfiniteScroll.tsx       ← Scroll-based pagination
│
├── feedback/
│   ├── StatusBadge.tsx          ← Color-coded status pills
│   ├── AvatarGroup.tsx          ← Stacked avatar component
│   ├── Rating.tsx               ← Star rating input/display
│   └── StepIndicator.tsx        ← Horizontal step progress
│
└── special/
    ├── CommandPalette.tsx       ← Cmd+K search overlay
    ├── ConfettiEffect.tsx       ← Success celebration
    ├── QRScanner.tsx            ← Camera-based QR reader
    ├── LiveIndicator.tsx        ← Pulsing "Live" badge
    ├── ThemeToggle.tsx          ← Light/Dark mode switch
    ├── ShareButton.tsx          ← Share with options dropdown
    └── CalendarEmbed.tsx        ← FullCalendar wrapper
```

---

## 📊 Mock Data

Create a `/lib/mock-data.ts` file with comprehensive typed mock data:

```typescript
// Include at minimum:
- 20 mock events (variety: tech, social, workshop, conference, meetup)
- 10 mock hackathons (various statuses: upcoming, active, judging, completed)
- 50 mock users (with avatars from ui-avatars.com or dicebear.com)
- 15 mock teams
- 30 mock project submissions
- 10 mock sponsors (with real-ish tech company names)
- 8 mock mentors
- 5 mock judges
- 20 mock notifications
- 10 mock blog posts
- Pricing tiers
- Categories & tags list
- All with full TypeScript interfaces in /lib/types.ts
```

---

## ⚡ Performance & UX Requirements

1. **Route transitions**: Framer Motion `AnimatePresence` on page mounts
2. **Skeleton screens**: Every data-dependent component shows skeletons first
3. **Optimistic updates**: Bookmark, RSVP, upvote actions update UI instantly
4. **Virtualized lists**: TanStack Virtual for lists > 50 items
5. **Image optimization**: Next/Image with blur placeholder for all images
6. **Command palette**: `Cmd+K` opens global search/navigation anywhere
7. **Keyboard shortcuts**: `Escape` closes modals, arrow keys navigate lists
8. **Toast notifications**: Sonner for all user actions (success/error/info)
9. **Form persistence**: Auto-save long forms to localStorage with recovery
10. **Responsive dialogs**: Modal on desktop → Bottom sheet on mobile
11. **Error boundaries**: Per-section error boundaries with retry
12. **404 and 500 pages**: Custom designed error pages with illustrations

---

## 🔐 Auth Context (Mock)

```typescript
// Create an AuthProvider with mock user data
// Support: login, register, logout, isAuthenticated, user object
// Persist to localStorage
// Wrap protected routes in auth guard
// Role-based access: attendee, organizer, judge, mentor, admin
```

---

## 🎬 Animation Guidelines

```
Page enter:        fade-in + slide-up (200ms, ease-out)
Page exit:         fade-out (150ms)
Card hover:        translateY(-2px) + shadow increase (150ms)
Button press:      scale(0.98) (100ms)
Modal open:        backdrop fade + modal slide-up with spring
Modal close:       reverse of open
List items:        staggered fade-in (50ms delay between items)
Tab switch:        cross-fade with layout animation
Skeleton:          shimmer pulse (1.5s infinite)
Success:           confetti burst (1.5s)
Notification:      slide-in from right (300ms)
Counter:           number roll animation
Progress bar:      smooth width transition (300ms ease)
```

---

## 📝 Implementation Order

Build in this sequence for maximum reusability:

```
Phase 1 — Foundation:
  1. Design system (tailwind config, shadcn setup, theme)
  2. Layout components (Navbar, Sidebar, Footer)
  3. Auth pages + mock auth context
  4. Command palette

Phase 2 — Public Pages:
  5. Landing page
  6. Explore/Discover page
  7. Public event page
  8. Public hackathon page
  9. Public profile page

Phase 3 — Dashboard Core:
  10. Dashboard home
  11. Event management pages
  12. Hackathon management pages
  13. Settings pages

Phase 4 — Interactive Features:
  14. Create event wizard
  15. Create hackathon wizard
  16. Submission flow
  17. Team management

Phase 5 — Portals:
  18. Judge portal
  19. Mentor portal
  20. Admin panel

Phase 6 — Extras:
  21. Blog
  22. Pricing
  23. Messages
  24. All remaining dialogs
  25. Marketing pages
```

---

## 🚨 Critical Rules

1. **Every page must be functional** — even if data is mocked, all interactions, clicks, form submissions, and navigation must work
2. **Every dialog in the list must exist** — even if the form inside is a placeholder, the dialog itself must open/close with proper animation
3. **No `// TODO` or `// Coming soon`** — implement at least a dummy version of everything
4. **Type everything** — no `any` types, full TypeScript interfaces for all data
5. **No page should be blank** — empty states with illustrations, loading skeletons, or placeholder content
6. **Test on mobile viewport** — every page must be usable at 375px width
7. **Dark mode must work** — every component must respect the theme
8. **Consistent patterns** — same data table component everywhere, same card patterns, same form patterns
```
