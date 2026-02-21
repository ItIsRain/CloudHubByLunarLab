import type { User, UserRole, SubscriptionTier, SubscriptionStatus, Event, Hackathon, Notification, NotificationType, Team, TeamMember, TeamStatus, Track, Submission, Score, SubmissionStatus, Testimonial } from "@/lib/types";

// =====================================================
// Profile ↔ User mappers
// =====================================================

export function profileToUser(profile: Record<string, unknown>): User {
  return {
    id: profile.id as string,
    email: profile.email as string,
    name: (profile.name as string) || "",
    username: (profile.username as string) || "",
    avatar: profile.avatar as string | undefined,
    bio: profile.bio as string | undefined,
    headline: profile.headline as string | undefined,
    location: profile.location as string | undefined,
    website: profile.website as string | undefined,
    github: profile.github as string | undefined,
    twitter: profile.twitter as string | undefined,
    linkedin: profile.linkedin as string | undefined,
    skills: (profile.skills as string[]) || [],
    interests: (profile.interests as string[]) || [],
    roles: (profile.roles as UserRole[]) || ["attendee"],
    eventsAttended: (profile.events_attended as number) || 0,
    hackathonsParticipated: (profile.hackathons_participated as number) || 0,
    projectsSubmitted: (profile.projects_submitted as number) || 0,
    wins: (profile.wins as number) || 0,
    subscriptionTier: (profile.subscription_tier as SubscriptionTier) || "free",
    stripeCustomerId: (profile.stripe_customer_id as string) || undefined,
    subscriptionStatus: (profile.subscription_status as SubscriptionStatus) || "inactive",
    currentPeriodEnd: (profile.current_period_end as string) || undefined,
    createdAt: (profile.created_at as string) || new Date().toISOString(),
    updatedAt: (profile.updated_at as string) || new Date().toISOString(),
  };
}

// =====================================================
// DB row → Event
// =====================================================

export function dbRowToEvent(
  row: Record<string, unknown>,
  organizer?: Record<string, unknown>
): Event {
  const org = organizer ?? (row.organizer as Record<string, unknown>);

  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    tagline: (row.tagline as string) || undefined,
    description: (row.description as string) || "",
    coverImage: (row.cover_image as string) || undefined,
    category: row.category as Event["category"],
    tags: (row.tags as string[]) || [],
    type: row.type as Event["type"],
    status: row.status as Event["status"],
    location: (row.location as Event["location"]) || { type: row.type as Event["type"] },
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    timezone: (row.timezone as string) || "America/Los_Angeles",
    tickets: (row.tickets as Event["tickets"]) || [],
    speakers: (row.speakers as Event["speakers"]) || [],
    agenda: (row.agenda as Event["agenda"]) || [],
    faq: (row.faq as Event["faq"]) || [],
    organizer: org ? profileToUser(org) : ({} as User),
    organizerId: row.organizer_id as string,
    communityId: (row.community_id as string) || undefined,
    capacity: (row.capacity as number) || undefined,
    registrationCount: (row.registration_count as number) || 0,
    isFeatured: (row.is_featured as boolean) || false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =====================================================
// DB row → Hackathon
// =====================================================

export function dbRowToHackathon(
  row: Record<string, unknown>,
  organizer?: Record<string, unknown>
): Hackathon {
  const org = organizer ?? (row.organizer as Record<string, unknown>);

  // Supabase aggregated count joins return [{ count: N }]
  const teamsAgg = row.teams as { count: number }[] | undefined;
  const submissionsAgg = row.submissions as { count: number }[] | undefined;
  const liveTeamCount = teamsAgg?.[0]?.count;
  const liveSubmissionCount = submissionsAgg?.[0]?.count;

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    tagline: (row.tagline as string) || undefined,
    description: (row.description as string) || "",
    coverImage: (row.cover_image as string) || undefined,
    logo: (row.logo as string) || undefined,
    category: row.category as Hackathon["category"],
    tags: (row.tags as string[]) || [],
    status: row.status as Hackathon["status"],
    type: row.type as Hackathon["type"],
    location: (row.location as Hackathon["location"]) || undefined,
    registrationStart: row.registration_start as string,
    registrationEnd: row.registration_end as string,
    hackingStart: row.hacking_start as string,
    hackingEnd: row.hacking_end as string,
    submissionDeadline: row.submission_deadline as string,
    judgingStart: row.judging_start as string,
    judgingEnd: row.judging_end as string,
    winnersAnnouncement: row.winners_announcement as string,
    tracks: (row.tracks as Hackathon["tracks"]) || [],
    prizes: (row.prizes as Hackathon["prizes"]) || [],
    sponsors: (row.sponsors as Hackathon["sponsors"]) || [],
    mentors: (row.mentors as Hackathon["mentors"]) || [],
    judges: (row.judges as Hackathon["judges"]) || [],
    judgingCriteria: (row.judging_criteria as Hackathon["judgingCriteria"]) || [],
    faqs: (row.faqs as Hackathon["faqs"]) || [],
    rules: (row.rules as string) || "",
    eligibility: (row.eligibility as string[]) || [],
    minTeamSize: (row.min_team_size as number) || 1,
    maxTeamSize: (row.max_team_size as number) || 4,
    allowSolo: (row.allow_solo as boolean) ?? true,
    organizer: org ? profileToUser(org) : ({} as User),
    organizerId: row.organizer_id as string,
    participantCount: (row.participant_count as number) || 0,
    teamCount: liveTeamCount ?? ((row.team_count as number) || 0),
    submissionCount: liveSubmissionCount ?? ((row.submission_count as number) || 0),
    totalPrizePool: (row.total_prize_pool as number) || 0,
    isFeatured: (row.is_featured as boolean) || false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =====================================================
// DB row → Notification
// =====================================================

export function dbRowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    message: row.message as string,
    link: (row.link as string) || undefined,
    isRead: (row.is_read as boolean) || false,
    createdAt: row.created_at as string,
  };
}

// =====================================================
// DB row → TeamMember
// =====================================================

export function dbRowToTeamMember(row: Record<string, unknown>): TeamMember {
  const userProfile = row.user as Record<string, unknown>;
  return {
    id: row.id as string,
    user: userProfile ? profileToUser(userProfile) : ({} as User),
    role: (row.role as string) || "Developer",
    isLeader: (row.is_leader as boolean) || false,
    joinedAt: row.joined_at as string,
  };
}

// =====================================================
// DB row → Team
// =====================================================

export function dbRowToTeam(row: Record<string, unknown>): Team {
  const rawMembers = (row.team_members as Record<string, unknown>[]) || [];
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    avatar: (row.avatar as string) || undefined,
    hackathonId: row.hackathon_id as string,
    track: (row.track as Track) || undefined,
    members: rawMembers.map(dbRowToTeamMember),
    lookingForRoles: (row.looking_for_roles as string[]) || undefined,
    maxSize: (row.max_size as number) || 4,
    status: (row.status as TeamStatus) || "forming",
    joinPassword: (row.join_password as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =====================================================
// DB row → Testimonial
// =====================================================

export function dbRowToTestimonial(row: Record<string, unknown>): Testimonial {
  const userProfile = row.user as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    user: userProfile ? profileToUser(userProfile) : ({} as User),
    quote: row.quote as string,
    role: row.role as string,
    company: row.company as string,
    highlightStat: (row.highlight_stat as string) || undefined,
    rating: (row.rating as number) || 5,
    isApproved: (row.is_approved as boolean) || false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =====================================================
// Event form store → DB insert payload
// =====================================================

export function eventFormToDbRow(
  form: {
    title: string;
    tagline: string;
    description: string;
    coverImage: string;
    category: string;
    tags: string[];
    startDate: string;
    endDate: string;
    timezone: string;
    locationType: string;
    address: string;
    city: string;
    country: string;
    platform: string;
    meetingUrl: string;
    tickets: unknown[];
    speakers: unknown[];
    agenda: unknown[];
    faq: unknown[];
  },
  organizerId: string,
  slug: string
): Record<string, unknown> {
  return {
    slug,
    title: form.title,
    tagline: form.tagline || null,
    description: form.description || "",
    cover_image: form.coverImage || null,
    category: form.category || "tech",
    tags: form.tags,
    type: form.locationType || "in-person",
    status: "published",
    timezone: form.timezone || "America/Los_Angeles",
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    location: {
      type: form.locationType || "in-person",
      address: form.address || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      platform: form.platform || undefined,
      meetingUrl: form.meetingUrl || undefined,
    },
    tickets: form.tickets,
    speakers: form.speakers,
    agenda: form.agenda,
    faq: form.faq,
    organizer_id: organizerId,
  };
}

// =====================================================
// DB row → Score
// =====================================================

export function dbRowToScore(row: Record<string, unknown>): Score {
  const judgeProfile = row.judge as Record<string, unknown> | undefined;
  return {
    id: row.id as string,
    submissionId: row.submission_id as string,
    judgeId: row.judge_id as string,
    judge: judgeProfile ? profileToUser(judgeProfile) : ({} as User),
    criteria: (row.criteria as Score["criteria"]) || [],
    totalScore: (row.total_score as number) || 0,
    overallFeedback: (row.overall_feedback as string) || undefined,
    scoredAt: row.scored_at as string,
  };
}

// =====================================================
// DB row → Submission
// =====================================================

export function dbRowToSubmission(row: Record<string, unknown>): Submission {
  const rawTeam = row.team as Record<string, unknown> | undefined;
  const rawScores = (row.scores as Record<string, unknown>[]) || [];

  return {
    id: row.id as string,
    hackathonId: row.hackathon_id as string,
    teamId: row.team_id as string,
    team: rawTeam ? dbRowToTeam(rawTeam) : ({} as Team),
    track: (row.track as Track) || ({} as Track),
    projectName: row.project_name as string,
    tagline: (row.tagline as string) || "",
    description: (row.description as string) || "",
    coverImage: (row.cover_image as string) || undefined,
    demoVideo: (row.demo_video as string) || undefined,
    screenshots: (row.screenshots as string[]) || [],
    githubUrl: (row.github_url as string) || undefined,
    demoUrl: (row.demo_url as string) || undefined,
    techStack: (row.tech_stack as string[]) || [],
    readme: (row.readme as string) || undefined,
    status: (row.status as SubmissionStatus) || "draft",
    scores: rawScores.map(dbRowToScore),
    averageScore: (row.average_score as number) || undefined,
    rank: (row.rank as number) || undefined,
    upvotes: (row.upvotes as number) || 0,
    submittedAt: (row.submitted_at as string) || "",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =====================================================
// Submission form → DB insert payload
// =====================================================

export function submissionFormToDbRow(form: Record<string, unknown>): Record<string, unknown> {
  const keyMap: Record<string, string> = {
    hackathonId: "hackathon_id",
    teamId: "team_id",
    projectName: "project_name",
    coverImage: "cover_image",
    demoVideo: "demo_video",
    githubUrl: "github_url",
    demoUrl: "demo_url",
    techStack: "tech_stack",
    averageScore: "average_score",
    submittedAt: "submitted_at",
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form)) {
    if (key === "id" || key === "created_at" || key === "updated_at" || key === "team" || key === "scores") continue;
    result[keyMap[key] || key] = value;
  }
  return result;
}

// =====================================================
// Hackathon form store → DB insert payload
// =====================================================

export function hackathonFormToDbRow(
  form: {
    name: string;
    tagline: string;
    description: string;
    coverImage: string;
    logo: string;
    category: string;
    tags: string[];
    type: string;
    address: string;
    city: string;
    country: string;
    platform: string;
    meetingUrl: string;
    registrationStart: string;
    registrationEnd: string;
    hackingStart: string;
    hackingEnd: string;
    submissionDeadline: string;
    judgingStart: string;
    judgingEnd: string;
    winnersAnnouncement: string;
    tracks: unknown[];
    prizes: { value: number }[];
    sponsors: unknown[];
    judgingCriteria: unknown[];
    rules: string;
    eligibility: string[];
    minTeamSize: number;
    maxTeamSize: number;
    allowSolo: boolean;
  },
  organizerId: string,
  slug: string
): Record<string, unknown> {
  const totalPrizePool = form.prizes.reduce((sum, p) => sum + (p.value || 0), 0);

  return {
    slug,
    name: form.name,
    tagline: form.tagline || null,
    description: form.description || "",
    cover_image: form.coverImage || null,
    logo: form.logo || null,
    category: form.category || "tech",
    tags: form.tags,
    type: form.type || "online",
    status: "published",
    rules: form.rules || "",
    eligibility: form.eligibility,
    min_team_size: form.minTeamSize,
    max_team_size: form.maxTeamSize,
    allow_solo: form.allowSolo,
    organizer_id: organizerId,
    total_prize_pool: totalPrizePool,
    registration_start: form.registrationStart || null,
    registration_end: form.registrationEnd || null,
    hacking_start: form.hackingStart || null,
    hacking_end: form.hackingEnd || null,
    submission_deadline: form.submissionDeadline || null,
    judging_start: form.judgingStart || null,
    judging_end: form.judgingEnd || null,
    winners_announcement: form.winnersAnnouncement || null,
    location: {
      type: form.type || "online",
      address: form.address || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      platform: form.platform || undefined,
      meetingUrl: form.meetingUrl || undefined,
    },
    tracks: form.tracks,
    prizes: form.prizes,
    sponsors: form.sponsors,
    judging_criteria: form.judgingCriteria,
  };
}
