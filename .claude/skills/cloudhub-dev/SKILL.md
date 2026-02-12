---
name: cloudhub-dev
description: >
  CloudHub development skill for the event and hackathon management platform.
  Activate when writing components, pages, API routes, forms, or any code
  for CloudHub. Covers TypeScript strictness, security, accessibility,
  performance, testing, and component architecture standards.
---

# CloudHub Platform Builder — Claude Code SKILL

> **Lunar Corporation** — Next-Gen Event & Hackathon Management Platform
> Built with Next.js 15 (App Router), TypeScript (strict), Tailwind CSS 4, shadcn/ui, Framer Motion 12

---

## Table of Contents

1. [Project Bootstrap](#1-project-bootstrap)
2. [Code Quality Hooks](#2-code-quality-hooks)
3. [Security Hooks](#3-security-hooks)
4. [Logic & Runtime Safety Hooks](#4-logic--runtime-safety-hooks)
5. [TypeScript Strictness Hooks](#5-typescript-strictness-hooks)
6. [Accessibility Hooks](#6-accessibility-hooks)
7. [Performance Hooks](#7-performance-hooks)
8. [Component Architecture Rules](#8-component-architecture-rules)
9. [Testing Hooks](#9-testing-hooks)
10. [Git Hooks & CI Gates](#10-git-hooks--ci-gates)
11. [File-by-File Validation Checklist](#11-file-by-file-validation-checklist)
12. [Implementation Phases](#12-implementation-phases)
13. [Mock Data & Type Safety](#13-mock-data--type-safety)
14. [Error Handling Standards](#14-error-handling-standards)
15. [Environment & Config Safety](#15-environment--config-safety)

---

## 1. Project Bootstrap

### Initial Setup Commands

```bash
# Create project
npx create-next-app@latest cloudhub --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd cloudhub

# Core dependencies
npm install framer-motion@^12 zustand @tanstack/react-query@^5 @tanstack/react-table@^8 \
  react-hook-form @hookform/resolvers zod sonner date-fns react-day-picker \
  recharts @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities react-dropzone \
  react-markdown rehype-highlight lucide-react @phosphor-icons/react \
  @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder \
  @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid \
  @monaco-editor/react clsx tailwind-merge class-variance-authority

# shadcn/ui — install ALL components
npx shadcn@latest init
npx shadcn@latest add --all

# Dev dependencies — linting, formatting, security, testing
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint-plugin-security eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
  eslint-plugin-import eslint-plugin-no-secrets eslint-plugin-sonarjs \
  prettier prettier-plugin-tailwindcss \
  husky lint-staged commitlint @commitlint/config-conventional \
  vitest @testing-library/react @testing-library/jest-dom \
  @vitejs/plugin-react jsdom \
  typescript-eslint depcheck \
  eslint-plugin-unicorn
```

### tsconfig.json — Strict Mode (NON-NEGOTIABLE)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": false,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "isolatedModules": true,
    "moduleResolution": "bundler",
    "module": "esnext",
    "target": "es2022",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] },
    "baseUrl": ".",
    "skipLibCheck": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 2. Code Quality Hooks

### ESLint Configuration (`.eslintrc.json`)

Every file MUST pass this config with zero warnings:

```json
{
  "root": true,
  "extends": [
    "next/core-web-vitals",
    "next/typescript",
    "plugin:@typescript-eslint/strict-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:security/recommended-legacy",
    "plugin:jsx-a11y/strict",
    "plugin:sonarjs/recommended-legacy",
    "plugin:unicorn/recommended"
  ],
  "plugins": [
    "@typescript-eslint",
    "security",
    "jsx-a11y",
    "sonarjs",
    "no-secrets",
    "unicorn"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json",
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "rules": {
    // --- Security ---
    "no-secrets/no-secrets": "error",
    "security/detect-object-injection": "warn",
    "security/detect-non-literal-regexp": "error",
    "security/detect-unsafe-regex": "error",
    "security/detect-buffer-noassert": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "security/detect-possible-timing-attacks": "error",

    // --- Logic Safety ---
    "sonarjs/no-duplicate-string": ["warn", { "threshold": 3 }],
    "sonarjs/no-identical-functions": "error",
    "sonarjs/no-collapsible-if": "error",
    "sonarjs/no-collection-size-mischeck": "error",
    "sonarjs/no-redundant-boolean": "error",
    "sonarjs/no-unused-collection": "error",
    "sonarjs/prefer-immediate-return": "error",
    "sonarjs/no-inverted-boolean-check": "error",

    // --- TypeScript Strictness ---
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-unnecessary-condition": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/strict-boolean-expressions": "warn",
    "@typescript-eslint/switch-exhaustiveness-check": "error",
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/no-unnecessary-type-assertion": "error",

    // --- React ---
    "react-hooks/exhaustive-deps": "error",
    "react-hooks/rules-of-hooks": "error",

    // --- Accessibility ---
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/no-static-element-interactions": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/label-has-associated-control": "error",

    // --- Import Hygiene ---
    "import/no-duplicates": "error",
    "import/no-cycle": "error",
    "import/no-self-import": "error",

    // --- Unicorn (best practices) ---
    "unicorn/prevent-abbreviations": "off",
    "unicorn/filename-case": ["error", { "case": "kebabCase", "ignore": ["^\\[.*\\]$"] }],
    "unicorn/no-null": "off",
    "unicorn/prefer-module": "off",
    "unicorn/no-array-reduce": "off"
  },
  "overrides": [
    {
      "files": ["*.test.ts", "*.test.tsx", "*.spec.ts"],
      "rules": {
        "@typescript-eslint/no-unsafe-assignment": "off",
        "sonarjs/no-duplicate-string": "off"
      }
    }
  ]
}
```

### Prettier Configuration (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["cn", "clsx", "cva"]
}
```

---

## 3. Security Hooks

### HOOK: Pre-Write Security Checklist

Before writing ANY file, Claude Code MUST verify:

```
□ No hardcoded secrets, API keys, tokens, or passwords
□ No use of eval(), Function(), or innerHTML with dynamic content
□ No dangerouslySetInnerHTML without DOMPurify sanitization
□ All user input is validated via Zod schemas BEFORE processing
□ All URL parameters are validated and sanitized
□ No direct object property access from user input (bracket notation with validation)
□ All external URLs are validated against allowlists
□ No sensitive data in localStorage (tokens go in httpOnly cookies)
□ CSRF protection on all mutation endpoints
□ Rate limiting consideration noted for API routes
□ No prototype pollution vectors (Object.create(null) for dictionaries)
□ Content-Security-Policy headers configured
□ No open redirects (validate redirect URLs)
```

### HOOK: API Route Security Template

Every API route MUST follow this pattern:

```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 1. Define strict input schema
const requestSchema = z.object({
  // ... fields with strict validation
});

// 2. Rate limiting check (mock for now)
function checkRateLimit(_request: NextRequest): boolean {
  return true; // Implement with upstash/ratelimit in production
}

// 3. Auth check
function getAuthUser(_request: NextRequest) {
  // Extract and validate session token
  // Return user or null
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Step 1: Rate limit
    if (!checkRateLimit(request)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // Step 2: Auth
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 3: Parse & validate input
    const body: unknown = await request.json();
    const result = requestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 },
      );
    }

    // Step 4: Business logic with validated data
    const validatedData = result.data;

    // Step 5: Return response
    return NextResponse.json({ success: true, data: validatedData });
  } catch (error) {
    // Never leak internal errors
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### HOOK: XSS Prevention for Rich Text

```typescript
// Whenever rendering user-generated HTML/markdown:
// 1. ALWAYS use react-markdown with rehype-sanitize
// 2. NEVER use dangerouslySetInnerHTML without sanitization
// 3. For Tiptap output, sanitize before storage AND before render

import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';

// CORRECT:
<ReactMarkdown rehypePlugins={[rehypeSanitize, rehypeHighlight]}>
  {userContent}
</ReactMarkdown>

// NEVER:
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

---

## 4. Logic & Runtime Safety Hooks

### HOOK: Exhaustive Pattern Matching

```typescript
// Every switch/union type MUST be exhaustive
// Use this helper:

function assertNever(value: never): never {
  throw new Error(`Unhandled discriminated union member: ${JSON.stringify(value)}`);
}

// Example:
type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

function getStatusColor(status: EventStatus): string {
  switch (status) {
    case 'draft': return 'text-yellow-600';
    case 'published': return 'text-green-600';
    case 'cancelled': return 'text-red-600';
    case 'completed': return 'text-blue-600';
    default: return assertNever(status); // Compile error if case missed
  }
}
```

### HOOK: Safe Array/Object Access

```typescript
// NEVER access arrays without bounds checking
// NEVER access objects without existence checking

// BAD:
const item = items[index]; // Could be undefined with noUncheckedIndexedAccess

// GOOD:
const item = items[index];
if (item === undefined) {
  throw new Error(`Item at index ${index} not found`);
}

// For objects from external data:
// BAD:
const value = data.nested.deep.value;

// GOOD:
const value = data?.nested?.deep?.value;
if (value === undefined) {
  // Handle missing data
}
```

### HOOK: Date/Time Safety

```typescript
// ALWAYS use date-fns, NEVER raw Date manipulation
// ALWAYS handle timezone explicitly
// ALWAYS validate date inputs

import { parseISO, isValid, formatInTimeZone } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

function safeParseDate(input: string): Date {
  const parsed = parseISO(input);
  if (!isValid(parsed)) {
    throw new Error(`Invalid date: ${input}`);
  }
  return parsed;
}

// Display dates with user's timezone
function displayDate(utcDate: Date, userTimezone: string): string {
  return formatInTimeZone(utcDate, userTimezone, 'PPpp');
}
```

### HOOK: State Management Safety

```typescript
// Zustand stores MUST:
// 1. Use immer middleware for immutable updates
// 2. Have typed selectors
// 3. Never expose raw setters

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface EventStore {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  // Actions are explicit, not raw setters
  addEvent: (event: Event) => void;
  removeEvent: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const useEventStore = create<EventStore>()(
  immer((set) => ({
    events: [],
    isLoading: false,
    error: null,
    addEvent: (event) =>
      set((state) => {
        state.events.push(event);
      }),
    removeEvent: (id) =>
      set((state) => {
        state.events = state.events.filter((e) => e.id !== id);
      }),
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),
    setError: (error) =>
      set((state) => {
        state.error = error;
      }),
  })),
);
```

### HOOK: Form Validation Safety

```typescript
// ALL forms MUST:
// 1. Use react-hook-form + zod
// 2. Validate on client AND server
// 3. Handle all error states
// 4. Show inline field-level errors

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema is the single source of truth
const eventSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().min(10).max(5000),
  startDate: z.string().datetime('Invalid date format'),
  endDate: z.string().datetime('Invalid date format'),
  maxAttendees: z.number().int().positive().max(100_000),
  ticketPrice: z.number().nonnegative().multipleOf(0.01).optional(),
  // URL validation
  website: z.string().url().optional().or(z.literal('')),
  // Email validation
  contactEmail: z.string().email(),
}).refine(
  (data) => new Date(data.endDate) > new Date(data.startDate),
  { message: 'End date must be after start date', path: ['endDate'] },
);

type EventFormData = z.infer<typeof eventSchema>;

// In component:
const form = useForm<EventFormData>({
  resolver: zodResolver(eventSchema),
  defaultValues: { /* ... */ },
});
```

---

## 5. TypeScript Strictness Hooks

### HOOK: Type Definition Standards

```typescript
// ALL types go in src/lib/types.ts or domain-specific type files
// NEVER use `any` — use `unknown` and narrow
// NEVER use type assertions (`as`) without runtime validation
// PREFER interfaces for object shapes, types for unions/utilities

// ✅ CORRECT: Discriminated unions for status
interface BaseEvent {
  id: string;
  name: string;
  createdAt: string;
}

interface DraftEvent extends BaseEvent {
  status: 'draft';
}

interface PublishedEvent extends BaseEvent {
  status: 'published';
  publishedAt: string;
  slug: string;
}

interface CancelledEvent extends BaseEvent {
  status: 'cancelled';
  cancelledAt: string;
  cancelReason: string;
}

type Event = DraftEvent | PublishedEvent | CancelledEvent;

// ✅ CORRECT: Branded types for IDs
type EventId = string & { readonly __brand: 'EventId' };
type UserId = string & { readonly __brand: 'UserId' };
type TeamId = string & { readonly __brand: 'TeamId' };

function createEventId(id: string): EventId {
  // Validate format
  if (!/^evt_[a-z0-9]{12}$/.test(id)) {
    throw new Error(`Invalid event ID format: ${id}`);
  }
  return id as EventId;
}

// ✅ CORRECT: Utility types
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

type NonEmptyArray<T> = [T, ...T[]];

// ✅ CORRECT: API response types
interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

### HOOK: Component Prop Types

```typescript
// ALL components MUST have explicit prop interfaces
// NEVER use React.FC (it's deprecated in pattern)
// ALWAYS separate container/presentation concerns

// ✅ CORRECT:
interface EventCardProps {
  readonly event: Event;
  readonly variant?: 'default' | 'compact' | 'featured';
  readonly onBookmark?: (eventId: string) => void;
  readonly className?: string;
}

function EventCard({ event, variant = 'default', onBookmark, className }: EventCardProps) {
  // ...
}

// For components with children:
interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly actions?: React.ReactNode;
  readonly children?: React.ReactNode;
}
```

---

## 6. Accessibility Hooks

### HOOK: Component A11y Checklist

Every component MUST satisfy:

```
□ All interactive elements are focusable (tabIndex where needed)
□ All images have meaningful alt text (or alt="" for decorative)
□ All form inputs have associated labels (htmlFor + id)
□ Color is never the ONLY indicator (icons/text alongside)
□ Contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for large text
□ Focus indicators are visible (never outline-none without replacement)
□ Modals trap focus and return focus on close
□ aria-label on icon-only buttons
□ aria-live regions for dynamic content updates
□ Keyboard navigation works (Enter/Space for buttons, Escape for modals)
□ Skip navigation link at top of page
□ Heading hierarchy is logical (h1 → h2 → h3, no skipping)
□ Role attributes where HTML semantics are insufficient
```

### HOOK: Focus Management Pattern

```typescript
// Modal focus trap (shadcn Dialog handles this, but for custom components):
import { useEffect, useRef } from 'react';

function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    firstElement?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return containerRef;
}
```

### HOOK: Announce Dynamic Changes

```typescript
// For live updates (notifications, counters, search results):
function AriaLiveRegion({ message, priority = 'polite' }: {
  message: string;
  priority?: 'polite' | 'assertive';
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}
```

---

## 7. Performance Hooks

### HOOK: Component Performance Rules

```
□ Lists > 20 items use virtualization (@tanstack/react-virtual)
□ Images use next/image with width, height, and blurDataURL
□ Heavy components are lazy loaded: const Editor = dynamic(() => import(...), { ssr: false })
□ Memoize expensive computations with useMemo (with measured need)
□ Memoize callbacks passed to child lists with useCallback
□ No inline object/array creation in JSX props (causes re-renders)
□ Event handlers in lists use data attributes, not closures per item
□ Debounce search inputs (300ms) and resize handlers (150ms)
□ Skeleton loaders match exact layout of loaded content
□ Prefetch critical routes with next/link prefetch
□ Bundle analysis: no single page JS > 200KB gzipped
```

### HOOK: Image Optimization

```typescript
// EVERY image must use next/image
// NEVER use raw <img> tags

import Image from 'next/image';

// With blur placeholder:
<Image
  src={event.coverImage}
  alt={event.name}
  width={800}
  height={400}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDA..."
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  priority={isAboveFold}
/>
```

### HOOK: Data Fetching Pattern

```typescript
// Use TanStack Query for ALL server state
// NEVER fetch in useEffect directly

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query keys are typed and centralized
const queryKeys = {
  events: {
    all: ['events'] as const,
    list: (filters: EventFilters) => ['events', 'list', filters] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
  },
  hackathons: {
    all: ['hackathons'] as const,
    detail: (id: string) => ['hackathons', 'detail', id] as const,
  },
} as const;

// Queries with proper error/loading handling
function useEvent(id: string) {
  return useQuery({
    queryKey: queryKeys.events.detail(id),
    queryFn: () => fetchEvent(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Mutations with optimistic updates
function useBookmarkEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => toggleBookmark(eventId),
    onMutate: async (eventId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.events.detail(eventId) });
      // Snapshot
      const previous = queryClient.getQueryData(queryKeys.events.detail(eventId));
      // Optimistic update
      queryClient.setQueryData(queryKeys.events.detail(eventId), (old: Event | undefined) =>
        old ? { ...old, isBookmarked: !old.isBookmarked } : old,
      );
      return { previous };
    },
    onError: (_err, eventId, context) => {
      // Rollback
      queryClient.setQueryData(queryKeys.events.detail(eventId), context?.previous);
    },
    onSettled: (_data, _err, eventId) => {
      // Refetch
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
  });
}
```

---

## 8. Component Architecture Rules

### HOOK: File Naming & Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── ui/                 # shadcn/ui primitives (auto-generated)
│   ├── layout/             # Navbar, Sidebar, Footer, PageHeader
│   ├── cards/              # EventCard, HackathonCard, etc.
│   ├── forms/              # Form-specific components
│   ├── data/               # DataTable, Charts, Timeline
│   ├── feedback/           # StatusBadge, Rating, Empty states
│   ├── dialogs/            # All 40 dialog components
│   └── special/            # CommandPalette, Confetti, QR, etc.
├── hooks/                  # Custom hooks (useDebounce, useMediaQuery, etc.)
├── lib/
│   ├── types.ts            # All TypeScript interfaces/types
│   ├── constants.ts        # App-wide constants (no magic strings)
│   ├── utils.ts            # cn(), formatters, helpers
│   ├── validations.ts      # Zod schemas (shared client/server)
│   ├── mock-data.ts        # Comprehensive mock data
│   ├── query-keys.ts       # TanStack Query key factory
│   └── api.ts              # API client functions
├── providers/
│   ├── auth-provider.tsx   # Mock auth context
│   ├── query-provider.tsx  # TanStack Query provider
│   └── theme-provider.tsx  # next-themes provider
└── styles/
    └── globals.css         # Tailwind base + custom CSS variables
```

### HOOK: Component Composition Rules

```typescript
// 1. EVERY component file exports exactly ONE component (+ subcomponents via dot notation)
// 2. Components are PURE — no side effects outside hooks
// 3. Server Components by default, "use client" only when needed
// 4. Separate data fetching from presentation

// ✅ CORRECT Pattern — Server Component with Client Island:
// app/events/[eventId]/page.tsx (Server Component)
import { EventHero } from '@/components/events/event-hero';
import { EventDetails } from '@/components/events/event-details';
import { RegisterButton } from '@/components/events/register-button'; // Client

async function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEvent(eventId); // Server-side data fetch

  return (
    <main>
      <EventHero event={event} />
      <EventDetails event={event} />
      <RegisterButton eventId={event.id} /> {/* Client component island */}
    </main>
  );
}

// 3. NEVER put "use client" on pages unless absolutely necessary
// 4. Lift client interactivity to smallest possible components
```

### HOOK: Consistent Utility Function

```typescript
// src/lib/utils.ts — EVERY project must have this:
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format helpers (NEVER use raw toLocaleString):
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

export function formatRelativeTime(date: Date): string {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = date.getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));

  if (Math.abs(days) < 1) {
    const hours = Math.round(diff / (1000 * 60 * 60));
    return rtf.format(hours, 'hour');
  }
  if (Math.abs(days) < 30) return rtf.format(days, 'day');
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month');
  return rtf.format(Math.round(days / 365), 'year');
}

// Slugify (safe, no regex injection):
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

---

## 9. Testing Hooks

### HOOK: Test Requirements

```
□ Every utility function in lib/ has unit tests
□ Every Zod schema has validation tests (valid + invalid cases)
□ Every custom hook has tests using renderHook
□ Critical user flows have integration tests
□ Components render without errors (smoke tests)
□ Accessibility tests via jest-axe on key components
```

### HOOK: Test Template

```typescript
// src/lib/__tests__/validations.test.ts
import { describe, it, expect } from 'vitest';
import { eventSchema } from '../validations';

describe('eventSchema', () => {
  it('accepts valid event data', () => {
    const valid = {
      name: 'Tech Meetup',
      description: 'A great event for developers',
      startDate: '2025-06-15T10:00:00Z',
      endDate: '2025-06-15T18:00:00Z',
      maxAttendees: 100,
      contactEmail: 'host@example.com',
    };
    expect(eventSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects end date before start date', () => {
    const invalid = {
      name: 'Tech Meetup',
      description: 'A great event',
      startDate: '2025-06-15T18:00:00Z',
      endDate: '2025-06-15T10:00:00Z', // Before start
      maxAttendees: 100,
      contactEmail: 'host@example.com',
    };
    const result = eventSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects negative attendee count', () => {
    const result = eventSchema.safeParse({
      name: 'Test',
      description: 'Test description',
      startDate: '2025-06-15T10:00:00Z',
      endDate: '2025-06-15T18:00:00Z',
      maxAttendees: -5,
      contactEmail: 'host@example.com',
    });
    expect(result.success).toBe(false);
  });
});
```

### Vitest Configuration (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', 'src/components/ui/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

---

## 10. Git Hooks & CI Gates

### Husky + lint-staged Setup

```bash
npx husky init
```

### `.husky/pre-commit`

```bash
#!/bin/sh
npx lint-staged
```

### `.husky/commit-msg`

```bash
#!/bin/sh
npx commitlint --edit "$1"
```

### `lint-staged.config.mjs`

```javascript
export default {
  // TypeScript/JavaScript files
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
    () => 'tsc --noEmit',  // Type check entire project
  ],
  // Styles
  '*.css': ['prettier --write'],
  // JSON/MD
  '*.{json,md}': ['prettier --write'],
};
```

### `commitlint.config.ts`

```typescript
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, missing semicolons
        'refactor', // Code restructure without behavior change
        'perf',     // Performance improvement
        'test',     // Adding/updating tests
        'build',    // Build system changes
        'ci',       // CI config changes
        'chore',    // Maintenance
        'revert',   // Revert previous commit
      ],
    ],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
};
```

### HOOK: Pre-Push Validation Script

Create `scripts/validate.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Running full validation suite..."

echo "📝 Step 1: TypeScript type checking..."
npx tsc --noEmit

echo "🔒 Step 2: ESLint (security + quality)..."
npx eslint src/ --max-warnings 0

echo "🎨 Step 3: Prettier formatting..."
npx prettier --check "src/**/*.{ts,tsx,css,json}"

echo "🧪 Step 4: Running tests..."
npx vitest run

echo "📦 Step 5: Build check..."
npm run build

echo "🔎 Step 6: Checking for unused dependencies..."
npx depcheck --ignores="@types/*,autoprefixer,postcss"

echo "🛡️ Step 7: Checking for known vulnerabilities..."
npm audit --audit-level=high

echo "✅ All validation checks passed!"
```

---

## 11. File-by-File Validation Checklist

### HOOK: Before Saving ANY File

Claude Code MUST mentally run this checklist on every file before considering it complete:

```
═══════════════════════════════════════════════════
  FILE VALIDATION GATE — MUST PASS ALL CHECKS
═══════════════════════════════════════════════════

📁 FILE: [filename]

STRUCTURE
  □ File is in correct directory per project structure
  □ File name follows kebab-case convention
  □ Single responsibility — one component/function per file
  □ Imports are organized: external → internal → types → styles

TYPESCRIPT
  □ No `any` types anywhere
  □ No type assertions (`as`) without validation
  □ All function parameters are typed
  □ All return types are explicit for exported functions
  □ Generics are constrained where possible
  □ No `@ts-ignore` or `@ts-expect-error` without comment

SECURITY
  □ No hardcoded secrets or credentials
  □ User input is validated before use
  □ No eval(), innerHTML, or dangerouslySetInnerHTML
  □ URLs are validated
  □ No prototype pollution vectors

LOGIC
  □ No unreachable code
  □ All switch cases handled (exhaustive)
  □ No array out-of-bounds access
  □ Null/undefined handled for optional data
  □ Error cases handled (try/catch where needed)
  □ No infinite loops or recursive calls without base case
  □ Async operations have error handling

REACT SPECIFIC
  □ Hooks follow rules (not conditional, not in loops)
  □ useEffect has correct dependency array
  □ No memory leaks (cleanup in useEffect)
  □ Keys in lists are stable and unique (not array index)
  □ Event handlers don't recreate on every render (when passed to lists)
  □ "use client" only where actually needed

ACCESSIBILITY
  □ All images have alt text
  □ Interactive elements are keyboard accessible
  □ Form inputs have labels
  □ Color is not the only differentiator
  □ ARIA attributes are correct

PERFORMANCE
  □ No unnecessary re-renders caused
  □ Large lists are virtualized
  □ Images use next/image
  □ Heavy imports are dynamic/lazy
  □ No blocking operations in render path

STYLE
  □ Uses cn() utility for conditional classes
  □ Tailwind classes are ordered (via prettier plugin)
  □ Responsive classes present (mobile-first)
  □ Dark mode classes present where needed
  □ No hardcoded colors — uses design tokens/CSS variables

═══════════════════════════════════════════════════
```

---

## 12. Implementation Phases

### Phase 1 — Foundation (Days 1-2)

```
Priority: Get the skeleton running with zero errors

1. Project init + all dependencies installed
2. Tailwind config with design tokens (colors, fonts, spacing)
3. Global CSS with CSS variables for theming
4. Layout components: Navbar, DashboardSidebar, Footer, MobileBottomNav
5. Auth mock context (login/register/logout/roles)
6. Theme provider (light/dark/system)
7. TanStack Query provider
8. All types in lib/types.ts
9. All mock data in lib/mock-data.ts
10. Utility functions in lib/utils.ts
11. Command palette (Cmd+K)

VALIDATION GATE: `npm run build` passes with 0 errors + 0 warnings
```

### Phase 2 — Public Pages (Days 3-5)

```
1. Landing page with hero, features bento, testimonials
2. Explore/discover with filters, search, grid/list toggle
3. Public event page with all sections
4. Public hackathon page with all tabs
5. Public user profile
6. Auth pages (login, register, forgot password, onboarding)

VALIDATION GATE: All pages render, navigation works, responsive at 375px
```

### Phase 3 — Dashboard (Days 6-8)

```
1. Dashboard home with stats, upcoming, activity
2. Event management (all sub-pages)
3. Hackathon management (all sub-pages)
4. Settings pages
5. Messages page
6. Notifications page

VALIDATION GATE: Sidebar nav works, all dashboard pages populated
```

### Phase 4 — Interactive Features (Days 9-11)

```
1. Create event multi-step wizard
2. Create hackathon wizard
3. Submission flow (new, edit, view)
4. Team management (create, join, invite)
5. All 40 dialogs implemented

VALIDATION GATE: All forms validate, all dialogs open/close, form data persists
```

### Phase 5 — Portals & Extras (Days 12-14)

```
1. Judge portal with scoring interface
2. Mentor portal with availability
3. Admin panel
4. Blog pages
5. Pricing page
6. Community calendar
7. Certificates page

VALIDATION GATE: Full validation script passes
```

---

## 13. Mock Data & Type Safety

### HOOK: Type Definitions Must Cover

```typescript
// src/lib/types.ts — MINIMUM required types:

// Core entities
export interface User { /* ... */ }
export interface Event { /* ... */ }
export interface Hackathon { /* ... */ }
export interface Team { /* ... */ }
export interface Submission { /* ... */ }
export interface Sponsor { /* ... */ }
export interface Mentor { /* ... */ }
export interface Judge { /* ... */ }
export interface Ticket { /* ... */ }
export interface Track { /* ... */ }
export interface Prize { /* ... */ }
export interface Notification { /* ... */ }
export interface BlogPost { /* ... */ }
export interface Comment { /* ... */ }
export interface Certificate { /* ... */ }
export interface Community { /* ... */ }
export interface Message { /* ... */ }

// Enums as const objects (not TS enums)
export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;
export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const HACKATHON_STATUS = {
  UPCOMING: 'upcoming',
  REGISTRATION_OPEN: 'registration_open',
  IN_PROGRESS: 'in_progress',
  JUDGING: 'judging',
  COMPLETED: 'completed',
} as const;
export type HackathonStatus = (typeof HACKATHON_STATUS)[keyof typeof HACKATHON_STATUS];

export const USER_ROLE = {
  ATTENDEE: 'attendee',
  ORGANIZER: 'organizer',
  JUDGE: 'judge',
  MENTOR: 'mentor',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// Form schemas (shared between client validation and API)
// These live in src/lib/validations.ts
```

### HOOK: Mock Data Requirements

```typescript
// src/lib/mock-data.ts MUST include:
// - 20 events with varied statuses, dates, locations
// - 10 hackathons across all statuses
// - 50 users with avatars (use https://api.dicebear.com/7.x/avataaars/svg?seed=NAME)
// - 15 teams with members
// - 30 submissions with screenshots, tech stacks
// - 10 sponsors with logos
// - 8 mentors with expertise areas
// - 5 judges
// - 20 notifications of different types
// - 10 blog posts
// - All data uses the exact TypeScript interfaces
// - All dates are realistic (some past, some future)
// - All IDs follow consistent format (evt_xxx, hkt_xxx, usr_xxx, etc.)
```

---

## 14. Error Handling Standards

### HOOK: Error Boundary Pattern

```typescript
// src/components/error-boundary.tsx
'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
    // Log to error reporting service in production
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
```

### HOOK: Custom Error Pages

```
□ src/app/not-found.tsx — 404 page with illustration and search
□ src/app/error.tsx — 500 page with retry button
□ src/app/global-error.tsx — Root error boundary
□ Each has: illustration, clear message, helpful actions, consistent branding
```

---

## 15. Environment & Config Safety

### HOOK: Environment Variables

```typescript
// src/lib/env.ts — Validated environment config
import { z } from 'zod';

const envSchema = z.object({
  // Public (exposed to browser)
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('CloudHub'),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),

  // Server only (NEVER prefix with NEXT_PUBLIC_)
  DATABASE_URL: z.string().url().optional(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
  AUTH_SECRET: z.string().min(32).optional(),
});

// Validate at build time
export const env = envSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
  NEXT_PUBLIC_APP_NAME: process.env['NEXT_PUBLIC_APP_NAME'],
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env['NEXT_PUBLIC_MAPBOX_TOKEN'],
  DATABASE_URL: process.env['DATABASE_URL'],
  STRIPE_SECRET_KEY: process.env['STRIPE_SECRET_KEY'],
  AUTH_SECRET: process.env['AUTH_SECRET'],
});

// Type-safe env access — use env.VARIABLE instead of process.env.VARIABLE
```

### `.env.example` (committed to repo)

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CloudHub

# Maps (optional)
NEXT_PUBLIC_MAPBOX_TOKEN=

# Database (server only)
DATABASE_URL=

# Auth (server only)
AUTH_SECRET=

# Payments (server only)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## FINAL: Master Validation Command

After every significant implementation session, run:

```bash
#!/bin/bash
echo "🏗️  CloudHub Full Validation"
echo "=========================="

# 1. Types
echo "1/7 TypeScript..." && npx tsc --noEmit && echo "✅ Types OK"

# 2. Lint
echo "2/7 ESLint..." && npx eslint src/ --max-warnings 0 && echo "✅ Lint OK"

# 3. Format
echo "3/7 Prettier..." && npx prettier --check "src/**/*.{ts,tsx}" && echo "✅ Format OK"

# 4. Tests
echo "4/7 Tests..." && npx vitest run && echo "✅ Tests OK"

# 5. Build
echo "5/7 Build..." && npm run build && echo "✅ Build OK"

# 6. Audit
echo "6/7 Security..." && npm audit --audit-level=high && echo "✅ Security OK"

# 7. Bundle size
echo "7/7 Bundle analysis..." && npx next-bundle-analyzer && echo "✅ Bundle OK"

echo "=========================="
echo "🎉 All checks passed!"
```

---

## Quick Reference: Do's and Don'ts

| ✅ DO | ❌ DON'T |
|-------|----------|
| Use Zod for ALL validation | Use `any` type |
| Use `cn()` for class merging | Use string concatenation for classes |
| Use next/image for images | Use raw `<img>` tags |
| Use TanStack Query for data | Fetch in useEffect |
| Use date-fns for dates | Use raw Date methods |
| Use constants for magic strings | Hardcode strings inline |
| Handle loading + error + empty | Show blank screens |
| Add aria labels to icon buttons | Rely on color alone |
| Use Server Components by default | Add "use client" everywhere |
| Validate env vars with Zod | Use process.env directly |
| Use branded types for IDs | Use plain strings for IDs |
| Write exhaustive switches | Leave default cases empty |
| Debounce user input | Fire requests on every keystroke |
| Use skeleton loaders | Use spinner loading states |
| Auto-save long forms | Lose user data on navigation |
