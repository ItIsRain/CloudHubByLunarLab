// =====================================================
// Central API Registry — single source of truth for docs
// =====================================================
// To add a new endpoint, add an entry to the relevant section below.
// The docs page renders dynamically from this registry.

export interface ApiParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

export interface ApiEndpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  description?: string;
  auth: "api_key";
  scope: string;
  rateLimit?: string;
  queryParams?: ApiParam[];
  bodyParams?: ApiParam[];
  responseExample?: string;
  requestExample?: string;
}

export interface ApiSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  endpoints: ApiEndpoint[];
}

// =====================================================
// Registry — Enterprise API Key endpoints only
// =====================================================

export const apiRegistry: ApiSection[] = [
  // ---------------------------------------------------
  // Events
  // ---------------------------------------------------
  {
    id: "events",
    title: "Events",
    description:
      "Create, read, update, and delete events. Supports filtering, pagination, and visibility controls.",
    icon: "Calendar",
    endpoints: [
      {
        method: "GET",
        path: "/api/events",
        summary: "List events",
        description:
          "Fetch a paginated list of events with optional filtering and sorting. Public events are cached for 60 seconds.",
        auth: "api_key",
        scope: "events",
        queryParams: [
          { name: "search", type: "string", required: false, description: "Search in title, tagline, description" },
          { name: "category", type: "string", required: false, description: "Comma-separated category values" },
          { name: "type", type: "string", required: false, description: "Comma-separated: in-person, virtual, hybrid" },
          { name: "status", type: "string", required: false, description: "Filter by status (e.g. published, draft)" },
          { name: "featured", type: "boolean", required: false, description: "Only featured events" },
          { name: "organizerId", type: "uuid", required: false, description: "Filter by organizer user ID" },
          { name: "sortBy", type: "string", required: false, description: '"newest", "date", or "popularity"', default: '"newest"' },
          { name: "page", type: "integer", required: false, description: "Page number", default: "1" },
          { name: "pageSize", type: "integer", required: false, description: "Items per page (1-100)", default: "20" },
          { name: "ids", type: "string", required: false, description: "Comma-separated UUIDs (max 50)" },
        ],
        responseExample: `{
  "data": [
    {
      "id": "c3a1f8e2-...",
      "title": "AI Summit 2026",
      "slug": "ai-summit-2026",
      "tagline": "The future of AI",
      "category": "technology",
      "type": "hybrid",
      "status": "published",
      "visibility": "public",
      "startDate": "2026-04-15T09:00:00Z",
      "endDate": "2026-04-16T18:00:00Z",
      "location": {
        "venue": "ADNEC Centre",
        "city": "Abu Dhabi",
        "country": "UAE"
      },
      "organizer": {
        "id": "uuid",
        "name": "Lunar Limited",
        "avatar": "https://..."
      },
      "registrationCount": 342,
      "capacity": 500,
      "coverImage": "https://...",
      "tags": ["ai", "machine-learning"]
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3,
  "hasMore": true
}`,
      },
      {
        method: "POST",
        path: "/api/events",
        summary: "Create an event",
        description:
          "Create a new event. Requires organizer role and is subject to your plan's monthly event limit.",
        auth: "api_key",
        scope: "events",
        bodyParams: [
          { name: "title", type: "string", required: true, description: "Event title" },
          { name: "tagline", type: "string", required: false, description: "Short tagline" },
          { name: "description", type: "string", required: false, description: "Full description (HTML supported)" },
          { name: "category", type: "string", required: false, description: "Event category (e.g. technology, design, business)" },
          { name: "type", type: "string", required: false, description: '"in-person", "virtual", or "hybrid"' },
          { name: "status", type: "string", required: false, description: '"draft" or "published"', default: '"draft"' },
          { name: "visibility", type: "string", required: false, description: '"public", "unlisted", or "private"', default: '"public"' },
          { name: "start_date", type: "ISO 8601", required: false, description: "Event start date/time" },
          { name: "end_date", type: "ISO 8601", required: false, description: "Event end date/time" },
          { name: "timezone", type: "string", required: false, description: "IANA timezone (e.g. Asia/Dubai)" },
          { name: "location", type: "object", required: false, description: "{ venue, address, city, country, coordinates }" },
          { name: "capacity", type: "integer", required: false, description: "Maximum attendees" },
          { name: "tickets", type: "array", required: false, description: "Ticket tiers: [{ name, price, quantity, description }]" },
          { name: "speakers", type: "array", required: false, description: "Speaker objects" },
          { name: "agenda", type: "array", required: false, description: "Schedule/agenda items" },
          { name: "faq", type: "array", required: false, description: "FAQ entries: [{ question, answer }]" },
          { name: "tags", type: "string[]", required: false, description: "Tags (max 20)" },
        ],
        requestExample: `{
  "title": "AI Summit 2026",
  "tagline": "The future of artificial intelligence",
  "category": "technology",
  "type": "hybrid",
  "status": "draft",
  "start_date": "2026-04-15T09:00:00Z",
  "end_date": "2026-04-16T18:00:00Z",
  "timezone": "Asia/Dubai",
  "location": {
    "venue": "ADNEC Centre",
    "city": "Abu Dhabi",
    "country": "UAE"
  },
  "capacity": 500,
  "tickets": [
    { "name": "General Admission", "price": 0, "quantity": 500 }
  ],
  "tags": ["ai", "machine-learning"]
}`,
        responseExample: `{
  "data": {
    "id": "c3a1f8e2-...",
    "title": "AI Summit 2026",
    "slug": "ai-summit-2026",
    "status": "draft",
    "visibility": "public",
    "createdAt": "2026-03-12T10:00:00Z"
  }
}`,
      },
      {
        method: "GET",
        path: "/api/events/{eventId}",
        summary: "Get a single event",
        description: "Fetch full event details by UUID or slug. Private events require ownership.",
        auth: "api_key",
        scope: "events",
        responseExample: `{
  "data": {
    "id": "c3a1f8e2-...",
    "title": "AI Summit 2026",
    "slug": "ai-summit-2026",
    "description": "<p>Full HTML description...</p>",
    "category": "technology",
    "type": "hybrid",
    "status": "published",
    "startDate": "2026-04-15T09:00:00Z",
    "endDate": "2026-04-16T18:00:00Z",
    "organizer": { "id": "uuid", "name": "Lunar Limited" },
    "tickets": [
      { "name": "General", "price": 0, "quantity": 500, "sold": 342 }
    ],
    "speakers": [...],
    "agenda": [...],
    "faq": [...],
    "registrationCount": 342,
    "capacity": 500
  }
}`,
      },
      {
        method: "PATCH",
        path: "/api/events/{eventId}",
        summary: "Update an event",
        description: "Update any event fields. Only the event organizer can perform this action. Accepts the same fields as POST.",
        auth: "api_key",
        scope: "events",
        requestExample: `{
  "title": "AI Summit 2026 — Updated",
  "status": "published",
  "capacity": 750
}`,
        responseExample: `{
  "data": {
    "id": "c3a1f8e2-...",
    "title": "AI Summit 2026 — Updated",
    "status": "published",
    "capacity": 750
  }
}`,
      },
      {
        method: "DELETE",
        path: "/api/events/{eventId}",
        summary: "Delete an event",
        description: "Permanently delete an event and all associated registrations. Organizer only. This action cannot be undone.",
        auth: "api_key",
        scope: "events",
        responseExample: `{ "message": "Event deleted" }`,
      },
    ],
  },

  // ---------------------------------------------------
  // Hackathons
  // ---------------------------------------------------
  {
    id: "hackathons",
    title: "Hackathons",
    description:
      "Create and manage hackathons with full timeline support including registration, hacking, submission, and judging phases.",
    icon: "Trophy",
    endpoints: [
      {
        method: "GET",
        path: "/api/hackathons",
        summary: "List hackathons",
        description:
          "Paginated list with filtering. The current phase is auto-computed from timeline dates, so the status field always reflects the real-time state.",
        auth: "api_key",
        scope: "hackathons",
        queryParams: [
          { name: "search", type: "string", required: false, description: "Search in name, tagline, description" },
          { name: "category", type: "string", required: false, description: "Comma-separated categories" },
          { name: "status", type: "string", required: false, description: "Comma-separated: draft, published, registration-open, hacking, submission, judging, completed" },
          { name: "featured", type: "boolean", required: false, description: "Only featured hackathons" },
          { name: "organizerId", type: "uuid", required: false, description: "Filter by organizer" },
          { name: "sortBy", type: "string", required: false, description: '"newest", "date", "prize", or "participants"', default: '"newest"' },
          { name: "page", type: "integer", required: false, description: "Page number", default: "1" },
          { name: "pageSize", type: "integer", required: false, description: "Items per page (1-100)", default: "20" },
        ],
        responseExample: `{
  "data": [
    {
      "id": "a7b2c3d4-...",
      "name": "AI Buildathon",
      "slug": "ai-buildathon",
      "tagline": "Build the future with AI",
      "status": "hacking",
      "category": "technology",
      "type": "virtual",
      "totalPrizePool": 10000,
      "participantCount": 256,
      "organizer": { "id": "uuid", "name": "..." },
      "registrationStart": "2026-04-01T00:00:00Z",
      "hackingStart": "2026-04-11T00:00:00Z",
      "hackingEnd": "2026-04-13T23:59:59Z",
      "submissionDeadline": "2026-04-13T23:59:59Z"
    }
  ],
  "total": 15,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1,
  "hasMore": false
}`,
      },
      {
        method: "POST",
        path: "/api/hackathons",
        summary: "Create a hackathon",
        description:
          "Create a new hackathon. Requires organizer role and is subject to your plan's monthly limit.",
        auth: "api_key",
        scope: "hackathons",
        bodyParams: [
          { name: "name", type: "string", required: true, description: "Hackathon name" },
          { name: "tagline", type: "string", required: false, description: "Short tagline" },
          { name: "description", type: "string", required: false, description: "Full description (HTML supported)" },
          { name: "category", type: "string", required: false, description: "Category" },
          { name: "type", type: "string", required: false, description: '"in-person", "virtual", or "hybrid"' },
          { name: "status", type: "string", required: false, description: '"draft" or "published"', default: '"draft"' },
          { name: "visibility", type: "string", required: false, description: '"public", "unlisted", or "private"', default: '"public"' },
          { name: "total_prize_pool", type: "number", required: false, description: "Total prize amount (USD)" },
          { name: "min_team_size", type: "integer", required: false, description: "Minimum team size" },
          { name: "max_team_size", type: "integer", required: false, description: "Maximum team size" },
          { name: "allow_solo", type: "boolean", required: false, description: "Allow solo participants" },
          { name: "registration_start", type: "ISO 8601", required: false, description: "Registration opens" },
          { name: "registration_end", type: "ISO 8601", required: false, description: "Registration closes" },
          { name: "hacking_start", type: "ISO 8601", required: false, description: "Hacking period start" },
          { name: "hacking_end", type: "ISO 8601", required: false, description: "Hacking period end" },
          { name: "submission_deadline", type: "ISO 8601", required: false, description: "Submission deadline" },
          { name: "judging_start", type: "ISO 8601", required: false, description: "Judging start" },
          { name: "judging_end", type: "ISO 8601", required: false, description: "Judging end" },
          { name: "winners_announcement", type: "ISO 8601", required: false, description: "Winners announcement date" },
          { name: "tracks", type: "array", required: false, description: "Hackathon tracks: [{ name, description, prizes }]" },
          { name: "prizes", type: "array", required: false, description: "Prize tiers: [{ place, title, amount, description }]" },
          { name: "rules", type: "string", required: false, description: "Rules (HTML)" },
          { name: "judging_criteria", type: "array", required: false, description: "Criteria: [{ name, weight, description }]" },
          { name: "tags", type: "string[]", required: false, description: "Tags (max 20)" },
        ],
        requestExample: `{
  "name": "AI Buildathon",
  "tagline": "Build the future with AI",
  "category": "technology",
  "type": "virtual",
  "total_prize_pool": 10000,
  "max_team_size": 5,
  "registration_start": "2026-04-01T00:00:00Z",
  "registration_end": "2026-04-10T23:59:59Z",
  "hacking_start": "2026-04-11T00:00:00Z",
  "hacking_end": "2026-04-13T23:59:59Z",
  "submission_deadline": "2026-04-13T23:59:59Z",
  "tracks": [
    { "name": "AI/ML", "description": "Build with AI" },
    { "name": "Web3", "description": "Decentralized apps" }
  ],
  "prizes": [
    { "place": 1, "title": "First Place", "amount": 5000 },
    { "place": 2, "title": "Second Place", "amount": 3000 }
  ]
}`,
        responseExample: `{
  "data": {
    "id": "a7b2c3d4-...",
    "name": "AI Buildathon",
    "slug": "ai-buildathon",
    "status": "draft",
    "createdAt": "2026-03-12T10:00:00Z"
  }
}`,
      },
      {
        method: "GET",
        path: "/api/hackathons/{hackathonId}",
        summary: "Get a single hackathon",
        description: "Fetch full hackathon details by UUID or slug. The status is auto-computed from timeline dates.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{
  "data": {
    "id": "a7b2c3d4-...",
    "name": "AI Buildathon",
    "slug": "ai-buildathon",
    "status": "hacking",
    "totalPrizePool": 10000,
    "participantCount": 256,
    "organizer": { "id": "uuid", "name": "..." },
    "tracks": [
      { "name": "AI/ML", "description": "Build with AI" }
    ],
    "prizes": [
      { "place": 1, "title": "First Place", "amount": 5000 }
    ],
    "judges": [...],
    "judgingCriteria": [...],
    "schedule": [...],
    "rules": "<p>...</p>",
    "registrationStart": "2026-04-01T00:00:00Z",
    "hackingStart": "2026-04-11T00:00:00Z",
    "hackingEnd": "2026-04-13T23:59:59Z"
  }
}`,
      },
      {
        method: "PATCH",
        path: "/api/hackathons/{hackathonId}",
        summary: "Update a hackathon",
        description: "Update hackathon fields. Organizer only. Required dates must be set before publishing.",
        auth: "api_key",
        scope: "hackathons",
        requestExample: `{
  "name": "AI Buildathon 2.0",
  "total_prize_pool": 15000,
  "status": "published"
}`,
        responseExample: `{
  "data": {
    "id": "a7b2c3d4-...",
    "name": "AI Buildathon 2.0",
    "status": "published",
    "totalPrizePool": 15000
  }
}`,
      },
      {
        method: "DELETE",
        path: "/api/hackathons/{hackathonId}",
        summary: "Delete a hackathon",
        description: "Permanently delete a hackathon and all associated data. Organizer only.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{ "message": "Hackathon deleted" }`,
      },
    ],
  },

  // ---------------------------------------------------
  // Users
  // ---------------------------------------------------
  {
    id: "users",
    title: "Users",
    description: "Look up public user profiles by username.",
    icon: "User",
    endpoints: [
      {
        method: "GET",
        path: "/api/users/{username}",
        summary: "Get a public profile",
        description: "Returns public profile data for any user by their username. Cached for 120 seconds.",
        auth: "api_key",
        scope: "users",
        responseExample: `{
  "data": {
    "id": "uuid",
    "name": "Jane Doe",
    "username": "janedoe",
    "avatar": "https://...",
    "bio": "Full-stack developer & AI enthusiast",
    "headline": "Senior Engineer @ Acme",
    "location": "Abu Dhabi, UAE",
    "website": "https://janedoe.dev",
    "skills": ["React", "Node.js", "Python", "TensorFlow"],
    "interests": ["AI", "Web Development"],
    "roles": ["organizer", "judge"],
    "createdAt": "2025-06-15T00:00:00Z"
  }
}`,
      },
    ],
  },

  // ---------------------------------------------------
  // Analytics
  // ---------------------------------------------------
  {
    id: "analytics",
    title: "Analytics",
    description: "Platform-wide statistics for dashboards and integrations.",
    icon: "BarChart3",
    endpoints: [
      {
        method: "GET",
        path: "/api/stats",
        summary: "Get platform statistics",
        description: "Returns aggregate platform metrics. Cached for 5 minutes.",
        auth: "api_key",
        scope: "analytics",
        responseExample: `{
  "data": {
    "eventsHosted": 142,
    "hackathonsHosted": 38,
    "totalAttendees": 12500,
    "totalPrizePool": 250000
  }
}`,
      },
    ],
  },
];

// =====================================================
// Helpers for the docs UI
// =====================================================

export function getMethodColor(method: string): string {
  switch (method) {
    case "GET": return "emerald";
    case "POST": return "blue";
    case "PATCH": return "amber";
    case "DELETE": return "red";
    default: return "zinc";
  }
}

export function getTotalEndpoints(): number {
  return apiRegistry.reduce((acc, s) => acc + s.endpoints.length, 0);
}
