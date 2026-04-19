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
          { name: "cover_image", type: "string", required: false, description: "Cover image URL" },
          { name: "category", type: "string", required: false, description: "Event category (e.g. tech, ai-ml, design, business)" },
          { name: "type", type: "string", required: false, description: '"in-person", "virtual", or "hybrid"' },
          { name: "status", type: "string", required: false, description: '"draft" or "published"', default: '"draft"' },
          { name: "visibility", type: "string", required: false, description: '"public", "unlisted", or "private"', default: '"public"' },
          { name: "start_date", type: "ISO 8601", required: false, description: "Event start date/time (must be before end_date)" },
          { name: "end_date", type: "ISO 8601", required: false, description: "Event end date/time (must be after start_date)" },
          { name: "timezone", type: "string", required: false, description: "IANA timezone (e.g. Asia/Dubai)" },
          { name: "location", type: "object", required: false, description: "{ venue, address, city, country, coordinates }" },
          { name: "capacity", type: "integer", required: false, description: "Maximum attendees (must be positive)" },
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
      {
        method: "GET",
        path: "/api/events/{eventId}/guests",
        summary: "List event guests",
        description: "Paginated list of event registrations with user profiles. Organizer only. Supports search by name/email and status filtering.",
        auth: "api_key",
        scope: "events",
        queryParams: [
          { name: "status", type: "string", required: false, description: 'Filter by status: "pending", "confirmed", "checked-in", "cancelled", or "all"' },
          { name: "search", type: "string", required: false, description: "Search by guest name or email" },
          { name: "page", type: "integer", required: false, description: "Page number", default: "1" },
          { name: "pageSize", type: "integer", required: false, description: "Items per page (1-100)", default: "50" },
        ],
        responseExample: `{
  "data": [
    {
      "id": "reg-uuid",
      "user": { "id": "uuid", "name": "Jane Doe", "avatar": "..." },
      "ticketType": { "name": "General" },
      "status": "confirmed",
      "checkedInAt": null,
      "createdAt": "2026-03-10T08:00:00Z"
    }
  ],
  "total": 342,
  "page": 1,
  "pageSize": 50,
  "totalPages": 7,
  "hasMore": true
}`,
      },
      {
        method: "PATCH",
        path: "/api/events/{eventId}/guests",
        summary: "Update guest status",
        description: "Update a guest's registration status (e.g. confirm, check-in, cancel). Organizer only. Sends a notification to the guest.",
        auth: "api_key",
        scope: "events",
        bodyParams: [
          { name: "registrationId", type: "string", required: true, description: "Registration UUID to update" },
          { name: "status", type: "string", required: true, description: '"pending", "confirmed", "checked-in", or "cancelled"' },
        ],
        requestExample: `{
  "registrationId": "reg-uuid",
  "status": "checked-in"
}`,
      },
      {
        method: "GET",
        path: "/api/events/{eventId}/emails",
        summary: "List sent emails",
        description: "List emails sent to event registrants. Organizer only. Returns up to 100 most recent.",
        auth: "api_key",
        scope: "events",
      },
      {
        method: "POST",
        path: "/api/events/{eventId}/emails",
        summary: "Send email to guests",
        description: "Send an email to event registrants. Supports filtering by registration status. Rate-limited to 10 emails per hour.",
        auth: "api_key",
        scope: "events",
        rateLimit: "10 per hour",
        bodyParams: [
          { name: "subject", type: "string", required: true, description: "Email subject (max 200 chars)" },
          { name: "body", type: "string", required: true, description: "Email body text (max 10,000 chars)" },
          { name: "recipientFilter", type: "string", required: false, description: '"all", "confirmed", "pending", or "cancelled"', default: '"all"' },
        ],
        requestExample: `{
  "subject": "Event Reminder",
  "body": "Don't forget — the event starts tomorrow!",
  "recipientFilter": "confirmed"
}`,
        responseExample: `{ "sent": 250 }`,
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
      "Create and manage competitions with full timeline support including registration, competing, submission, and judging phases.",
    icon: "Trophy",
    endpoints: [
      {
        method: "GET",
        path: "/api/hackathons",
        summary: "List competitions",
        description:
          "Paginated list with filtering. The current phase is auto-computed from timeline dates, so the status field always reflects the real-time state.",
        auth: "api_key",
        scope: "hackathons",
        queryParams: [
          { name: "search", type: "string", required: false, description: "Search in name, tagline, description" },
          { name: "category", type: "string", required: false, description: "Comma-separated categories" },
          { name: "status", type: "string", required: false, description: "Comma-separated: draft, published, registration-open, competing, submission, judging, completed" },
          { name: "featured", type: "boolean", required: false, description: "Only featured competitions" },
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
        summary: "Create a competition",
        description:
          "Create a new competition. Requires organizer role and is subject to your plan's monthly limit.",
        auth: "api_key",
        scope: "hackathons",
        bodyParams: [
          { name: "name", type: "string", required: true, description: "Competition name" },
          { name: "tagline", type: "string", required: false, description: "Short tagline" },
          { name: "description", type: "string", required: false, description: "Full description (HTML supported)" },
          { name: "cover_image", type: "string", required: false, description: "Cover image URL" },
          { name: "logo", type: "string", required: false, description: "Logo image URL" },
          { name: "category", type: "string", required: false, description: "Category (e.g. tech, ai-ml, web3, design)" },
          { name: "type", type: "string", required: false, description: '"in-person", "virtual", or "hybrid"' },
          { name: "status", type: "string", required: false, description: '"draft" or "published" (publishing requires timeline dates)', default: '"draft"' },
          { name: "visibility", type: "string", required: false, description: '"public", "unlisted", or "private"', default: '"public"' },
          { name: "location", type: "object", required: false, description: "{ address, city, country, platform, meetingUrl }" },
          { name: "total_prize_pool", type: "number", required: false, description: "Total prize amount (must be non-negative)" },
          { name: "min_team_size", type: "integer", required: false, description: "Minimum team size (must be positive)" },
          { name: "max_team_size", type: "integer", required: false, description: "Maximum team size (must be >= min_team_size)" },
          { name: "allow_solo", type: "boolean", required: false, description: "Allow solo participants" },
          { name: "registration_start", type: "ISO 8601", required: false, description: "Registration opens (must be before registration_end)" },
          { name: "registration_end", type: "ISO 8601", required: false, description: "Registration closes" },
          { name: "hacking_start", type: "ISO 8601", required: false, description: "Competing period start (required before publishing)" },
          { name: "hacking_end", type: "ISO 8601", required: false, description: "Competing period end (required before publishing)" },
          { name: "submission_deadline", type: "ISO 8601", required: false, description: "Submission deadline (required before publishing, must be >= hacking_end)" },
          { name: "judging_start", type: "ISO 8601", required: false, description: "Judging start" },
          { name: "judging_end", type: "ISO 8601", required: false, description: "Judging end" },
          { name: "winners_announcement", type: "ISO 8601", required: false, description: "Winners announcement date" },
          { name: "tracks", type: "array", required: false, description: "Competition tracks: [{ name, description, icon, requirements, suggestedTech }]" },
          { name: "prizes", type: "array", required: false, description: "Prize tiers: [{ name, place, type, value, currency, description }]" },
          { name: "rules", type: "string", required: false, description: "Rules (HTML)" },
          { name: "eligibility", type: "string[]", required: false, description: "Eligibility requirements (e.g. ['Must be 18+'])" },
          { name: "judging_criteria", type: "array", required: false, description: "Criteria: [{ name, description, weight, maxScore }]" },
          { name: "sponsors", type: "array", required: false, description: "Sponsors: [{ name, logo, website, tier, description }]" },
          { name: "judges", type: "array", required: false, description: "Initial judges (use /judges/invite endpoint to send email invitations)" },
          { name: "mentors", type: "array", required: false, description: "Mentor objects" },
          { name: "schedule", type: "array", required: false, description: "Event schedule items" },
          { name: "faqs", type: "array", required: false, description: "FAQ entries: [{ question, answer }]" },
          { name: "resources", type: "array", required: false, description: "Resource links and materials" },
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
        summary: "Get a single competition",
        description: "Fetch full competition details by UUID or slug. The status is auto-computed from timeline dates.",
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
        summary: "Update a competition",
        description: "Update competition fields. Organizer only. Required dates must be set before publishing.",
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
        summary: "Delete a competition",
        description: "Permanently delete a competition and all associated data. Organizer only.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{ "message": "Competition deleted" }`,
      },
      {
        method: "POST",
        path: "/api/hackathons/{hackathonId}/judges/invite",
        summary: "Invite a judge",
        description: "Send an email invitation to a judge. The invitee receives a unique token link to accept. Rate-limited to 10 invitations per 15 minutes.",
        auth: "api_key",
        scope: "hackathons",
        rateLimit: "10 per 15 minutes",
        bodyParams: [
          { name: "email", type: "string", required: true, description: "Judge's email address" },
          { name: "name", type: "string", required: true, description: "Judge's display name" },
        ],
        requestExample: `{
  "email": "judge@example.com",
  "name": "Dr. Sarah Chen"
}`,
        responseExample: `{
  "success": true,
  "message": "Invitation sent to judge@example.com"
}`,
      },
      {
        method: "GET",
        path: "/api/hackathons/{hackathonId}/participants",
        summary: "List participants",
        description: "Paginated list of competition registrations with user profiles and team assignments. Organizer only. Supports status filtering and name/email search.",
        auth: "api_key",
        scope: "hackathons",
        queryParams: [
          { name: "status", type: "string", required: false, description: 'Filter: "confirmed", "approved", "rejected", "cancelled"' },
          { name: "search", type: "string", required: false, description: "Search by participant name or email" },
          { name: "page", type: "integer", required: false, description: "Page number", default: "1" },
          { name: "pageSize", type: "integer", required: false, description: "Items per page (1-100)", default: "50" },
        ],
        responseExample: `{
  "data": [
    {
      "id": "reg-uuid",
      "userId": "user-uuid",
      "status": "confirmed",
      "user": { "id": "uuid", "name": "Alex Dev", "avatar": "..." },
      "teamName": "Team Alpha",
      "createdAt": "2026-04-02T10:00:00Z"
    }
  ],
  "total": 256,
  "page": 1,
  "pageSize": 50,
  "totalPages": 6,
  "hasMore": true
}`,
      },
      {
        method: "PATCH",
        path: "/api/hackathons/{hackathonId}/participants",
        summary: "Update participant status",
        description: "Approve, reject, or cancel a participant's registration. Organizer only. Sends a notification to the participant.",
        auth: "api_key",
        scope: "hackathons",
        bodyParams: [
          { name: "registrationId", type: "string", required: true, description: "Registration UUID to update" },
          { name: "status", type: "string", required: true, description: '"approved", "rejected", "confirmed", or "cancelled"' },
        ],
        requestExample: `{
  "registrationId": "reg-uuid",
  "status": "approved"
}`,
      },
      {
        method: "GET",
        path: "/api/hackathons/{hackathonId}/announcements",
        summary: "List announcements",
        description: "List competition announcements. Organizer only via API key.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{
  "data": [
    {
      "id": "ann-uuid",
      "title": "Competing Starts Now!",
      "message": "Good luck to all teams...",
      "sentBy": { "id": "uuid", "name": "Organizer" },
      "recipientCount": 256,
      "sentAt": "2026-04-11T00:00:00Z"
    }
  ]
}`,
      },
      {
        method: "POST",
        path: "/api/hackathons/{hackathonId}/announcements",
        summary: "Send announcement",
        description: "Send an announcement email to all registered participants. Organizer only. Rate-limited to 10 per hour.",
        auth: "api_key",
        scope: "hackathons",
        rateLimit: "10 per hour",
        bodyParams: [
          { name: "title", type: "string", required: true, description: "Announcement title (max 200 chars)" },
          { name: "message", type: "string", required: true, description: "Announcement body (max 10,000 chars)" },
        ],
        requestExample: `{
  "title": "Submission Deadline Extended",
  "message": "We've extended the deadline by 2 hours..."
}`,
        responseExample: `{
  "data": {
    "id": "ann-uuid",
    "title": "Submission Deadline Extended",
    "recipientCount": 256,
    "sentAt": "2026-04-13T22:00:00Z"
  },
  "emailsSent": 248
}`,
      },
      {
        method: "GET",
        path: "/api/hackathons/{hackathonId}/analytics",
        summary: "Get competition analytics",
        description: "Detailed analytics for a competition including registration timeline, team count, submission count, track distribution, and scoring progress. Organizer only.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{
  "data": {
    "registrationsByStatus": {
      "confirmed": 200,
      "approved": 50,
      "cancelled": 6
    },
    "registrationTimeline": [
      { "date": "2026-04-01", "count": 45 },
      { "date": "2026-04-02", "count": 62 }
    ],
    "teamCount": 64,
    "submissionCount": 58,
    "trackDistribution": [
      { "track": "AI/ML", "count": 30 },
      { "track": "Web3", "count": 28 }
    ],
    "scoringProgress": { "scored": 42, "total": 58 }
  }
}`,
      },
    ],
  },

  // ---------------------------------------------------
  // Submissions
  // ---------------------------------------------------
  {
    id: "submissions",
    title: "Submissions",
    description:
      "Manage competition submissions — create, update, delete, and score. Submissions belong to teams within a competition.",
    icon: "FileCode",
    endpoints: [
      {
        method: "GET",
        path: "/api/submissions",
        summary: "List submissions",
        description:
          "Paginated list of submissions with filtering and sorting. Unauthenticated users can only see submitted (public) submissions. Supports filtering by competition, team, user, and status.",
        auth: "api_key",
        scope: "hackathons",
        queryParams: [
          { name: "hackathonId", type: "uuid", required: false, description: "Filter by competition" },
          { name: "teamId", type: "uuid", required: false, description: "Filter by team" },
          { name: "userId", type: "uuid", required: false, description: "Filter by user (returns submissions from all teams the user belongs to)" },
          { name: "status", type: "string", required: false, description: '"draft" or "submitted"' },
          { name: "sortBy", type: "string", required: false, description: '"recent", "votes", or "score"', default: '"recent"' },
          { name: "page", type: "integer", required: false, description: "Page number", default: "1" },
          { name: "pageSize", type: "integer", required: false, description: "Items per page (1-100)", default: "50" },
        ],
        responseExample: `{
  "data": [
    {
      "id": "sub-uuid",
      "title": "AI Weather Predictor",
      "description": "A machine learning model that...",
      "status": "submitted",
      "hackathonId": "hack-uuid",
      "team": {
        "id": "team-uuid",
        "name": "Team Alpha",
        "members": [...]
      },
      "demoUrl": "https://demo.example.com",
      "repoUrl": "https://github.com/...",
      "upvotes": 42,
      "averageScore": 87.5,
      "createdAt": "2026-04-13T20:00:00Z"
    }
  ],
  "total": 58,
  "page": 1,
  "pageSize": 50,
  "totalPages": 2,
  "hasMore": true
}`,
      },
      {
        method: "POST",
        path: "/api/submissions",
        summary: "Create a submission",
        description:
          "Create a new submission for a competition. The authenticated user must be a member of the specified team. Enforces the submission deadline.",
        auth: "api_key",
        scope: "hackathons",
        bodyParams: [
          { name: "hackathonId", type: "uuid", required: true, description: "Competition UUID" },
          { name: "teamId", type: "uuid", required: true, description: "Team UUID" },
          { name: "title", type: "string", required: false, description: "Submission title" },
          { name: "description", type: "string", required: false, description: "Project description" },
          { name: "demoUrl", type: "string", required: false, description: "Live demo URL" },
          { name: "repoUrl", type: "string", required: false, description: "Source code repository URL" },
          { name: "videoUrl", type: "string", required: false, description: "Demo video URL" },
          { name: "thumbnailUrl", type: "string", required: false, description: "Thumbnail image URL" },
          { name: "techStack", type: "string[]", required: false, description: "Technologies used" },
          { name: "trackId", type: "string", required: false, description: "Competition track" },
          { name: "status", type: "string", required: false, description: '"draft" or "submitted"', default: '"draft"' },
        ],
        requestExample: `{
  "hackathonId": "hack-uuid",
  "teamId": "team-uuid",
  "title": "AI Weather Predictor",
  "description": "A machine learning model that predicts weather patterns...",
  "demoUrl": "https://demo.example.com",
  "repoUrl": "https://github.com/team/project",
  "techStack": ["Python", "TensorFlow", "Next.js"],
  "status": "draft"
}`,
        responseExample: `{
  "data": {
    "id": "sub-uuid",
    "title": "AI Weather Predictor",
    "status": "draft",
    "createdAt": "2026-04-13T20:00:00Z"
  }
}`,
      },
      {
        method: "GET",
        path: "/api/submissions/{submissionId}",
        summary: "Get a single submission",
        description:
          "Fetch full submission details including team and scores. Scores are only visible to the competition organizer and judges. Private competition submissions require authorization.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{
  "data": {
    "id": "sub-uuid",
    "title": "AI Weather Predictor",
    "description": "A machine learning model...",
    "status": "submitted",
    "team": { "id": "team-uuid", "name": "Team Alpha", "members": [...] },
    "scores": [
      {
        "judgeId": "judge-uuid",
        "totalScore": 87,
        "criteria": [...],
        "overallFeedback": "Great project!",
        "scoredAt": "2026-04-14T10:00:00Z"
      }
    ],
    "averageScore": 87.5,
    "upvotes": 42
  }
}`,
      },
      {
        method: "PATCH",
        path: "/api/submissions/{submissionId}",
        summary: "Update a submission",
        description:
          "Update submission fields. Only team members or the competition organizer can update. Setting status to 'submitted' enforces the submission deadline.",
        auth: "api_key",
        scope: "hackathons",
        requestExample: `{
  "title": "AI Weather Predictor v2",
  "status": "submitted",
  "demoUrl": "https://demo-v2.example.com"
}`,
        responseExample: `{
  "data": {
    "id": "sub-uuid",
    "title": "AI Weather Predictor v2",
    "status": "submitted",
    "submittedAt": "2026-04-13T23:30:00Z"
  }
}`,
      },
      {
        method: "DELETE",
        path: "/api/submissions/{submissionId}",
        summary: "Delete a submission",
        description: "Permanently delete a submission. Only the team leader or competition organizer can delete.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{ "message": "Submission deleted" }`,
      },
      {
        method: "POST",
        path: "/api/submissions/{submissionId}/score",
        summary: "Score a submission",
        description:
          "Submit a score for a submission. Only assigned judges can score, and only during the judging window. Automatically recalculates the submission's average score.",
        auth: "api_key",
        scope: "hackathons",
        bodyParams: [
          { name: "totalScore", type: "number", required: true, description: "Overall score (0-100)" },
          { name: "criteria", type: "array", required: false, description: "Detailed criteria scores: [{ name, score, maxScore, feedback }]" },
          { name: "overallFeedback", type: "string", required: false, description: "Written feedback for the team" },
          { name: "flagged", type: "boolean", required: false, description: "Flag submission for review", default: "false" },
        ],
        requestExample: `{
  "totalScore": 87,
  "criteria": [
    { "name": "Innovation", "score": 9, "maxScore": 10 },
    { "name": "Technical Complexity", "score": 8, "maxScore": 10 },
    { "name": "Design", "score": 9, "maxScore": 10 }
  ],
  "overallFeedback": "Excellent use of AI for a practical problem."
}`,
        responseExample: `{
  "data": {
    "id": "score-uuid",
    "submissionId": "sub-uuid",
    "judgeId": "judge-uuid",
    "totalScore": 87,
    "criteria": [...],
    "scoredAt": "2026-04-14T10:00:00Z"
  }
}`,
      },
      {
        method: "GET",
        path: "/api/submissions/{submissionId}/upvote",
        summary: "Get upvote status",
        description:
          "Check whether the authenticated user has upvoted a submission, and get the total upvote count.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{
  "data": {
    "upvoted": true,
    "upvotes": 42
  }
}`,
      },
      {
        method: "POST",
        path: "/api/submissions/{submissionId}/upvote",
        summary: "Toggle upvote",
        description:
          "Toggle an upvote on a submission. If the user has already upvoted, the upvote is removed. Only submitted (public) projects can be upvoted. Updates the denormalized upvote counter.",
        auth: "api_key",
        scope: "hackathons",
        responseExample: `{
  "data": {
    "upvoted": true,
    "upvotes": 43
  }
}`,
      },
      {
        method: "PATCH",
        path: "/api/submissions/{submissionId}/score",
        summary: "Update a score",
        description:
          "Update an existing score. The judge can only update their own score, and only during the judging window.",
        auth: "api_key",
        scope: "hackathons",
        bodyParams: [
          { name: "totalScore", type: "number", required: false, description: "Updated overall score (0-100)" },
          { name: "criteria", type: "array", required: false, description: "Updated criteria scores" },
          { name: "overallFeedback", type: "string", required: false, description: "Updated feedback" },
          { name: "flagged", type: "boolean", required: false, description: "Update flag status" },
        ],
        requestExample: `{
  "totalScore": 90,
  "overallFeedback": "Updated: Even better after re-review."
}`,
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
  // Webhooks
  // ---------------------------------------------------
  {
    id: "webhooks",
    title: "Webhooks",
    description:
      "Configure outbound webhooks to receive real-time notifications when events occur on CloudHub. Integrate with Zoho, Airtable, Zapier, or any HTTP endpoint.",
    icon: "Webhook",
    endpoints: [
      {
        method: "GET",
        path: "/api/webhooks",
        summary: "List webhooks",
        description: "List all webhooks configured for the authenticated user.",
        auth: "api_key",
        scope: "webhooks",
        responseExample: `{
  "data": [
    {
      "id": "wh-uuid",
      "url": "https://hooks.zapier.com/hooks/catch/123/abc",
      "description": "Zapier registration sync",
      "events": ["event.registration.created", "competition.registration.created"],
      "status": "active",
      "failureCount": 0,
      "lastTriggeredAt": "2026-03-12T14:30:00Z",
      "createdAt": "2026-03-01T10:00:00Z"
    }
  ]
}`,
      },
      {
        method: "POST",
        path: "/api/webhooks",
        summary: "Create a webhook",
        description:
          "Create a new webhook endpoint. Returns the signing secret — store it securely, as it will not be shown again. Use the secret to verify payload authenticity via HMAC-SHA256.",
        auth: "api_key",
        scope: "webhooks",
        bodyParams: [
          { name: "url", type: "string", required: true, description: "HTTPS endpoint URL (max 2048 chars)" },
          { name: "events", type: "string[]", required: true, description: "Event types to subscribe to (see list below)" },
          { name: "description", type: "string", required: false, description: "Optional label (max 200 chars)" },
        ],
        requestExample: `{
  "url": "https://hooks.zapier.com/hooks/catch/123/abc",
  "events": [
    "event.registration.created",
    "competition.registration.created",
    "submission.submitted"
  ],
  "description": "Zapier registration sync"
}`,
        responseExample: `{
  "data": {
    "id": "wh-uuid",
    "url": "https://hooks.zapier.com/hooks/catch/123/abc",
    "events": ["event.registration.created", "competition.registration.created", "submission.submitted"],
    "status": "active",
    "secret": "whsec_a1b2c3d4e5f6...",
    "createdAt": "2026-03-12T10:00:00Z"
  }
}`,
      },
      {
        method: "GET",
        path: "/api/webhooks/{webhookId}",
        summary: "Get webhook details",
        description: "Fetch webhook details including the last 50 delivery attempts for debugging.",
        auth: "api_key",
        scope: "webhooks",
        responseExample: `{
  "data": {
    "id": "wh-uuid",
    "url": "https://hooks.zapier.com/hooks/catch/123/abc",
    "events": ["event.registration.created"],
    "status": "active",
    "failureCount": 0,
    "recentDeliveries": [
      {
        "id": "del-uuid",
        "eventType": "event.registration.created",
        "responseStatus": 200,
        "success": true,
        "durationMs": 342,
        "createdAt": "2026-03-12T14:30:00Z"
      }
    ]
  }
}`,
      },
      {
        method: "PATCH",
        path: "/api/webhooks/{webhookId}",
        summary: "Update a webhook",
        description: "Update webhook URL, subscribed events, status, or description. Reactivating a paused webhook resets the failure counter.",
        auth: "api_key",
        scope: "webhooks",
        bodyParams: [
          { name: "url", type: "string", required: false, description: "New endpoint URL" },
          { name: "events", type: "string[]", required: false, description: "Updated event subscriptions" },
          { name: "status", type: "string", required: false, description: '"active" or "paused"' },
          { name: "description", type: "string", required: false, description: "Updated label" },
        ],
        requestExample: `{
  "status": "active",
  "events": ["event.registration.created", "submission.submitted"]
}`,
      },
      {
        method: "DELETE",
        path: "/api/webhooks/{webhookId}",
        summary: "Delete a webhook",
        description: "Permanently delete a webhook and all its delivery logs.",
        auth: "api_key",
        scope: "webhooks",
        responseExample: `{ "message": "Webhook deleted" }`,
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
