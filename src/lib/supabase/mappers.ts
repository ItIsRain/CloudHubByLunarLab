import type { User, UserRole, SubscriptionTier, Event, Hackathon, Notification, NotificationType, Team, TeamMember, TeamStatus, Track, Submission, Score, SubmissionStatus, Testimonial, EntityInvitation, EntityVisibility, Conversation, ConversationParticipant, Message, MessageReaction, Community, CommunityMember, BlogPost, MentorAvailability, MentorSession, MentorSessionStatus, MentorSessionPlatform, Report, ReportType, ReportStatus, CompetitionForm, CompetitionFormStatus, CompetitionType, CompetitionApplication, ApplicationStatus, ApplicationFile, ScreeningRule, ScreeningRuleType, ScreeningOperator, ScreeningResult, ScreeningFlag, ScreeningFlagType, CampusQuota, FormField, FormSection } from "@/lib/types";

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
    status: (profile.status as "active" | "suspended" | "banned") || "active",
    subscriptionTier: (profile.subscription_tier as SubscriptionTier) || "free",
    createdAt: (profile.created_at as string) || new Date().toISOString(),
    updatedAt: (profile.updated_at as string) || new Date().toISOString(),
  };
}

/** Public-safe variant — strips email to prevent exposure in public API responses */
export function profileToPublicUser(profile: Record<string, unknown>): User {
  const user = profileToUser(profile);
  return { ...user, email: "" };
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
    visibility: (row.visibility as EntityVisibility) || "public",
    location: (row.location as Event["location"]) || { type: row.type as Event["type"] },
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    timezone: (row.timezone as string) || "America/Los_Angeles",
    tickets: (row.tickets as Event["tickets"]) || [],
    speakers: (row.speakers as Event["speakers"]) || [],
    agenda: (row.agenda as Event["agenda"]) || [],
    faq: (row.faq as Event["faq"]) || [],
    organizer: org ? (profileToPublicUser(org) as User) : ({} as User),
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
    visibility: (row.visibility as EntityVisibility) || "public",
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
    teamsEnabled: (row.teams_enabled as boolean) ?? true,
    submissionsEnabled: (row.submissions_enabled as boolean) ?? true,
    registrationFields: (row.registration_fields as Hackathon["registrationFields"]) || [],
    registrationSections: (row.registration_sections as Hackathon["registrationSections"]) || [],
    submissionFields: (row.submission_fields as Hackathon["submissionFields"]) || [],
    submissionSections: (row.submission_sections as Hackathon["submissionSections"]) || [],
    screeningRules: (row.screening_rules as Hackathon["screeningRules"]) || [],
    screeningConfig: (row.screening_config as Hackathon["screeningConfig"]) || {},
    organizer: org ? (profileToPublicUser(org) as User) : ({} as User),
    organizerId: row.organizer_id as string,
    participantCount: (row.participant_count as number) || 0,
    teamCount: liveTeamCount ?? ((row.team_count as number) || 0),
    submissionCount: liveSubmissionCount ?? ((row.submission_count as number) || 0),
    totalPrizePool: (row.total_prize_pool as number) || 0,
    rsvpDeadline: (row.rsvp_deadline as string) || undefined,
    registrationEditableUntil: (row.registration_editable_until as string) || undefined,
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
    user: userProfile ? profileToPublicUser(userProfile) : ({} as User),
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
    joinPassword: row.join_password ? "••••••" : null,
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
    user: userProfile ? profileToPublicUser(userProfile) : ({} as User),
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
    visibility?: string;
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
    visibility: form.visibility || "public",
    timezone: form.timezone || "America/Los_Angeles",
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    location: {
      type: form.locationType || "in-person",
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      platform: form.platform || null,
      meetingUrl: form.meetingUrl || null,
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
    judge: judgeProfile ? profileToPublicUser(judgeProfile) : ({} as User),
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
    team: rawTeam ? dbRowToTeam(rawTeam) : ({ id: "", name: "Unknown Team", description: "", avatar: "", hackathonId: "", track: undefined, lookingForRoles: [], members: [], maxSize: 4, status: "forming", createdAt: "", updatedAt: "" } as unknown as Team),
    track: (row.track as Track) || ({ id: "general", name: "General", description: "General track", prizes: [] } as Track),
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
    formData: (row.form_data as Record<string, unknown>) || undefined,
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
  // Strict allowlist: only these fields can be set by clients.
  // Fields like average_score, upvotes, rank are server-managed.
  const keyMap: Record<string, string> = {
    hackathonId: "hackathon_id",
    hackathon_id: "hackathon_id",
    teamId: "team_id",
    team_id: "team_id",
    projectName: "project_name",
    project_name: "project_name",
    description: "description",
    coverImage: "cover_image",
    cover_image: "cover_image",
    demoVideo: "demo_video",
    demo_video: "demo_video",
    githubUrl: "github_url",
    github_url: "github_url",
    demoUrl: "demo_url",
    demo_url: "demo_url",
    tagline: "tagline",
    techStack: "tech_stack",
    tech_stack: "tech_stack",
    screenshots: "screenshots",
    readme: "readme",
    track: "track",
    status: "status",
    submittedAt: "submitted_at",
    submitted_at: "submitted_at",
    formData: "form_data",
    form_data: "form_data",
  };

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form)) {
    if (key in keyMap) {
      result[keyMap[key]] = value;
    }
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
    teamsEnabled?: boolean;
    submissionsEnabled?: boolean;
    visibility?: string;
    registrationFields?: unknown[];
    submissionFields?: unknown[];
    submissionSections?: unknown[];
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
    visibility: form.visibility || "public",
    rules: form.rules || "",
    eligibility: form.eligibility,
    min_team_size: form.minTeamSize,
    max_team_size: form.maxTeamSize,
    allow_solo: form.allowSolo,
    teams_enabled: form.teamsEnabled ?? true,
    submissions_enabled: form.submissionsEnabled ?? true,
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
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      platform: form.platform || null,
      meetingUrl: form.meetingUrl || null,
    },
    tracks: form.tracks,
    prizes: form.prizes,
    sponsors: form.sponsors,
    judging_criteria: form.judgingCriteria,
    registration_fields: form.registrationFields || [],
    ...(form.submissionFields !== undefined && { submission_fields: form.submissionFields }),
    ...(form.submissionSections !== undefined && { submission_sections: form.submissionSections }),
  };
}

// =====================================================
// Competition Form & Application mappers
// =====================================================

export function dbRowToCompetitionForm(row: Record<string, unknown>): CompetitionForm {
  const organizer = row.organizer ? profileToPublicUser(row.organizer as Record<string, unknown>) : undefined;
  return {
    id: row.id as string,
    organizerId: row.organizer_id as string,
    organizer,
    title: row.title as string,
    slug: row.slug as string,
    description: (row.description as string) || undefined,
    coverImage: (row.cover_image as string) || undefined,
    logo: (row.logo as string) || undefined,
    competitionName: row.competition_name as string,
    competitionType: row.competition_type as CompetitionType,
    fields: (row.fields as FormField[]) || [],
    sections: (row.sections as FormSection[]) || [],
    status: row.status as CompetitionFormStatus,
    opensAt: (row.opens_at as string) || undefined,
    closesAt: (row.closes_at as string) || undefined,
    maxApplications: (row.max_applications as number) || undefined,
    allowEditAfterSubmit: (row.allow_edit_after_submit as boolean) || false,
    confirmationEmailTemplate: (row.confirmation_email_template as string) || undefined,
    primaryColor: (row.primary_color as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function dbRowToApplication(row: Record<string, unknown>): CompetitionApplication {
  const applicant = row.applicant ? profileToUser(row.applicant as Record<string, unknown>) : undefined;
  const form = row.form ? dbRowToCompetitionForm(row.form as Record<string, unknown>) : undefined;
  const files = Array.isArray(row.application_files)
    ? (row.application_files as Record<string, unknown>[]).map(dbRowToApplicationFile)
    : undefined;
  const screeningResults = Array.isArray(row.screening_results)
    ? (row.screening_results as Record<string, unknown>[]).map(dbRowToScreeningResult)
    : undefined;
  const flags = Array.isArray(row.screening_flags)
    ? (row.screening_flags as Record<string, unknown>[]).map(dbRowToScreeningFlag)
    : undefined;

  return {
    id: row.id as string,
    formId: row.form_id as string,
    form,
    applicantId: (row.applicant_id as string) || undefined,
    applicant,
    data: (row.data as Record<string, unknown>) || {},
    applicantName: row.applicant_name as string,
    applicantEmail: row.applicant_email as string,
    applicantPhone: (row.applicant_phone as string) || undefined,
    startupName: (row.startup_name as string) || undefined,
    campus: (row.campus as string) || undefined,
    sector: (row.sector as string) || undefined,
    status: row.status as ApplicationStatus,
    completenessScore: Number(row.completeness_score) || 0,
    eligibilityPassed: row.eligibility_passed as boolean | undefined,
    screeningCompletedAt: (row.screening_completed_at as string) || undefined,
    screeningNotes: (row.screening_notes as string) || undefined,
    internalNotes: (row.internal_notes as string) || undefined,
    reviewedBy: (row.reviewed_by as string) || undefined,
    reviewedAt: (row.reviewed_at as string) || undefined,
    submittedAt: (row.submitted_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    files,
    screeningResults,
    flags,
  };
}

export function dbRowToApplicationFile(row: Record<string, unknown>): ApplicationFile {
  return {
    id: row.id as string,
    applicationId: row.application_id as string,
    fieldId: row.field_id as string,
    fileName: row.file_name as string,
    fileType: row.file_type as string,
    fileSize: row.file_size as number,
    storagePath: row.storage_path as string,
    createdAt: row.created_at as string,
  };
}

export function dbRowToScreeningRule(row: Record<string, unknown>): ScreeningRule {
  return {
    id: row.id as string,
    formId: row.form_id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    ruleType: row.rule_type as ScreeningRuleType,
    fieldId: row.field_id as string,
    operator: row.operator as ScreeningOperator,
    value: row.value,
    sortOrder: row.sort_order as number,
    enabled: row.enabled as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function dbRowToScreeningResult(row: Record<string, unknown>): ScreeningResult {
  const rule = row.screening_rules ? dbRowToScreeningRule(row.screening_rules as Record<string, unknown>) : (row.rule ? dbRowToScreeningRule(row.rule as Record<string, unknown>) : undefined);
  return {
    id: row.id as string,
    applicationId: row.application_id as string,
    ruleId: row.rule_id as string,
    rule,
    passed: row.passed as boolean,
    actualValue: row.actual_value,
    reason: (row.reason as string) || undefined,
    createdAt: row.created_at as string,
  };
}

export function dbRowToScreeningFlag(row: Record<string, unknown>): ScreeningFlag {
  return {
    id: row.id as string,
    applicationId: row.application_id as string,
    flagType: row.flag_type as ScreeningFlagType,
    severity: row.severity as "info" | "warning" | "critical",
    message: row.message as string,
    relatedApplicationId: (row.related_application_id as string) || undefined,
    resolved: row.resolved as boolean,
    resolvedBy: (row.resolved_by as string) || undefined,
    resolvedAt: (row.resolved_at as string) || undefined,
    resolutionNote: (row.resolution_note as string) || undefined,
    createdAt: row.created_at as string,
  };
}

export function dbRowToCampusQuota(row: Record<string, unknown>): CampusQuota {
  return {
    id: row.id as string,
    formId: row.form_id as string,
    campus: row.campus as string,
    quota: row.quota as number,
  };
}

// =====================================================
// DB row → Certificate
// =====================================================

export interface CertificateWithMeta {
  id: string;
  userId: string;
  eventId?: string;
  hackathonId?: string;
  type: "participation" | "winner" | "mentor" | "judge" | "organizer";
  title: string;
  description: string;
  issuedAt: string;
  verificationCode: string;
  userName?: string;
  eventTitle?: string;
  hackathonName?: string;
}

export function dbRowToCertificate(row: Record<string, unknown>): CertificateWithMeta {
  const userProfile = row.user as Record<string, unknown> | undefined;
  const eventRow = row.event as Record<string, unknown> | undefined;
  const hackathonRow = row.hackathon as Record<string, unknown> | undefined;

  return {
    id: row.id as string,
    userId: row.user_id as string,
    eventId: (row.event_id as string) || undefined,
    hackathonId: (row.hackathon_id as string) || undefined,
    type: row.type as CertificateWithMeta["type"],
    title: row.title as string,
    description: (row.description as string) || "",
    issuedAt: row.issued_at as string,
    verificationCode: row.verification_code as string,
    userName: userProfile ? (userProfile.name as string) : undefined,
    eventTitle: eventRow ? (eventRow.title as string) : undefined,
    hackathonName: hackathonRow ? (hackathonRow.name as string) : undefined,
  };
}

// =====================================================
// DB row → EntityInvitation
// =====================================================

export function dbRowToEntityInvitation(row: Record<string, unknown>): EntityInvitation {
  return {
    id: row.id as string,
    entityType: row.entity_type as "event" | "hackathon",
    entityId: row.entity_id as string,
    email: row.email as string,
    name: row.name as string,
    token: row.token as string,
    status: (row.status as EntityInvitation["status"]) || "pending",
    invitedBy: row.invited_by as string,
    acceptedBy: (row.accepted_by as string) || undefined,
    createdAt: row.created_at as string,
  };
}

// =====================================================
// DB row → MessageReaction
// =====================================================

export function dbRowToMessageReaction(row: Record<string, unknown>): MessageReaction {
  return {
    id: row.id as string,
    messageId: row.message_id as string,
    userId: row.user_id as string,
    emoji: row.emoji as string,
    createdAt: row.created_at as string,
  };
}

// =====================================================
// DB row → Message
// =====================================================

export function dbRowToMessage(row: Record<string, unknown>): Message {
  const senderProfile = row.sender as Record<string, unknown> | undefined;
  const rawReactions = (row.message_reactions as Record<string, unknown>[]) || [];

  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    content: (row.content as string) || "",
    type: (row.type as Message["type"]) || "text",
    attachments: (row.attachments as Record<string, unknown>[]) || undefined,
    editedAt: (row.edited_at as string) || undefined,
    deletedAt: (row.deleted_at as string) || undefined,
    createdAt: row.created_at as string,
    sender: senderProfile ? profileToPublicUser(senderProfile) : undefined,
    reactions: rawReactions.length > 0 ? rawReactions.map(dbRowToMessageReaction) : undefined,
  };
}

// =====================================================
// DB row → ConversationParticipant
// =====================================================

export function dbRowToConversationParticipant(row: Record<string, unknown>): ConversationParticipant {
  const userProfile = row.user as Record<string, unknown> | undefined;

  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    userId: row.user_id as string,
    role: (row.role as ConversationParticipant["role"]) || "member",
    isMuted: (row.is_muted as boolean) || false,
    unreadCount: (row.unread_count as number) || 0,
    lastReadAt: (row.last_read_at as string) || undefined,
    joinedAt: row.joined_at as string,
    user: userProfile ? profileToPublicUser(userProfile) : undefined,
  };
}

// =====================================================
// DB row → Conversation
// =====================================================

export function dbRowToConversation(
  row: Record<string, unknown>,
  currentUserId?: string
): Conversation {
  const rawParticipants = (row.conversation_participants as Record<string, unknown>[]) || [];
  const participants = rawParticipants.map(dbRowToConversationParticipant);

  // Find the "other" participant for direct conversations
  let otherParticipant: User | undefined;
  let unreadCount: number | undefined;

  if (currentUserId) {
    const otherPart = participants.find((p) => p.userId !== currentUserId);
    otherParticipant = otherPart?.user;

    const myParticipant = participants.find((p) => p.userId === currentUserId);
    unreadCount = myParticipant?.unreadCount ?? 0;
  }

  return {
    id: row.id as string,
    type: (row.type as Conversation["type"]) || "direct",
    name: (row.name as string) || undefined,
    hackathonId: (row.hackathon_id as string) || undefined,
    teamId: (row.team_id as string) || undefined,
    createdBy: row.created_by as string,
    lastMessageAt: (row.last_message_at as string) || undefined,
    lastMessagePreview: (row.last_message_preview as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    participants,
    otherParticipant,
    unreadCount,
  };
}

// =====================================================
// DB row → Community
// =====================================================

export function dbRowToCommunity(
  row: Record<string, unknown>,
  organizer?: Record<string, unknown>
): Community {
  const org = organizer ?? (row.organizer as Record<string, unknown>);

  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    logo: (row.logo as string) || undefined,
    coverImage: (row.cover_image as string) || undefined,
    website: (row.website as string) || undefined,
    organizerId: row.organizer_id as string,
    organizer: org ? profileToPublicUser(org) : undefined,
    status: (row.status as Community["status"]) || "active",
    memberCount: (row.member_count as number) || 0,
    eventCount: (row.event_count as number) || 0,
    visibility: (row.visibility as Community["visibility"]) || "public",
    tags: (row.tags as string[]) || [],
    socials: (row.socials as Record<string, string>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =====================================================
// DB row → CommunityMember
// =====================================================

export function dbRowToCommunityMember(row: Record<string, unknown>): CommunityMember {
  const userProfile = row.user as Record<string, unknown> | undefined;

  return {
    id: row.id as string,
    communityId: row.community_id as string,
    userId: row.user_id as string,
    role: (row.role as CommunityMember["role"]) || "member",
    joinedAt: row.joined_at as string,
    user: userProfile ? profileToPublicUser(userProfile) : undefined,
  };
}

// =====================================================
// DB row → BlogPost
// =====================================================

export function dbRowToBlogPost(
  row: Record<string, unknown>,
  author?: Record<string, unknown>
): BlogPost {
  const auth = author ?? (row.author as Record<string, unknown>);

  return {
    id: row.id as string,
    slug: row.slug as string,
    authorId: row.author_id as string,
    author: auth ? profileToPublicUser(auth) : undefined,
    title: row.title as string,
    excerpt: (row.excerpt as string) || "",
    content: (row.content as string) || "",
    coverImage: (row.cover_image as string) || undefined,
    category: (row.category as string) || "",
    tags: (row.tags as string[]) || [],
    readTime: (row.read_time as number) || 1,
    status: (row.status as BlogPost["status"]) || "draft",
    viewCount: (row.view_count as number) || 0,
    publishedAt: (row.published_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =====================================================
// DB row → MentorAvailability
// =====================================================

export function dbRowToMentorAvailability(row: Record<string, unknown>): MentorAvailability {
  return {
    id: row.id as string,
    mentorId: row.mentor_id as string,
    hackathonId: (row.hackathon_id as string) || undefined,
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    timezone: (row.timezone as string) || "UTC",
    isActive: (row.is_active as boolean) ?? true,
    createdAt: row.created_at as string,
  };
}

// =====================================================
// DB row → MentorSession
// =====================================================

export function dbRowToMentorSession(row: Record<string, unknown>): MentorSession {
  const mentorProfile = row.mentor as Record<string, unknown> | undefined;
  const menteeProfile = row.mentee as Record<string, unknown> | undefined;

  return {
    id: row.id as string,
    mentorId: row.mentor_id as string,
    menteeId: row.mentee_id as string,
    hackathonId: (row.hackathon_id as string) || undefined,
    teamId: (row.team_id as string) || undefined,
    title: (row.title as string) || "",
    description: (row.description as string) || undefined,
    status: (row.status as MentorSessionStatus) || "pending",
    sessionDate: row.session_date as string,
    durationMinutes: (row.duration_minutes as number) || 30,
    meetingUrl: (row.meeting_url as string) || undefined,
    platform: (row.platform as MentorSessionPlatform) || undefined,
    notes: (row.notes as string) || undefined,
    mentorFeedbackRating: (row.mentor_feedback_rating as number) || undefined,
    mentorFeedbackComment: (row.mentor_feedback_comment as string) || undefined,
    menteeFeedbackRating: (row.mentee_feedback_rating as number) || undefined,
    menteeFeedbackComment: (row.mentee_feedback_comment as string) || undefined,
    cancelledBy: (row.cancelled_by as string) || undefined,
    cancellationReason: (row.cancellation_reason as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    mentor: mentorProfile ? profileToPublicUser(mentorProfile) : undefined,
    mentee: menteeProfile ? profileToPublicUser(menteeProfile) : undefined,
  };
}

// =====================================================
// DB row → Report
// =====================================================

export function dbRowToReport(
  row: Record<string, unknown>,
  reporter?: Record<string, unknown>
): Report {
  const rep = reporter ?? (row.reporter as Record<string, unknown>);
  return {
    id: row.id as string,
    reporterId: row.reporter_id as string,
    reporter: rep ? profileToPublicUser(rep) : undefined,
    type: row.type as ReportType,
    entityId: row.entity_id as string,
    entityTitle: row.entity_title as string,
    reason: row.reason as string,
    details: (row.details as string) || undefined,
    status: row.status as ReportStatus,
    resolutionNote: (row.resolution_note as string) || undefined,
    resolvedBy: (row.resolved_by as string) || undefined,
    resolvedAt: (row.resolved_at as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Competition Phase Mappers ─────────────────────────────

import type {
  CompetitionPhase,
  PhaseReviewer,
  PhaseScore,
  PhaseDecision,
  PhaseScoringCriteria,
  PhaseType,
  PhaseStatus,
  PhaseReviewerStatus,
  PhaseRecommendation,
  PhaseDecisionType,
} from "@/lib/types";

export function dbRowToCompetitionPhase(row: Record<string, unknown>): CompetitionPhase {
  return {
    id: row.id as string,
    hackathonId: row.hackathon_id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    phaseType: (row.phase_type as PhaseType) || "bootcamp",
    evaluationMode: (row.evaluation_mode as CompetitionPhase["evaluationMode"]) || "application",
    campusFilter: (row.campus_filter as string) || null,
    scoringCriteria: (row.scoring_criteria as PhaseScoringCriteria[]) || [],
    scoringScaleMax: (row.scoring_scale_max as number) || 3,
    requireRecommendation: row.require_recommendation !== false,
    reviewerCount: (row.reviewer_count as number) || 3,
    isWeighted: !!row.is_weighted,
    blindReview: row.blind_review !== false,
    startDate: (row.start_date as string) || null,
    endDate: (row.end_date as string) || null,
    submissionStart: (row.submission_start as string) || null,
    submissionEnd: (row.submission_end as string) || null,
    location: (row.location as string) || null,
    sortOrder: (row.sort_order as number) || 0,
    status: (row.status as PhaseStatus) || "draft",
    awardCategories: (row.award_categories as CompetitionPhase["awardCategories"]) || [],
    sourcePhaseIds: (row.source_phase_ids as string[]) || [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function dbRowToPhaseReviewer(row: Record<string, unknown>): PhaseReviewer {
  return {
    id: row.id as string,
    phaseId: row.phase_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    email: row.email as string,
    status: (row.status as PhaseReviewerStatus) || "invited",
    invitedAt: row.invited_at as string,
    acceptedAt: (row.accepted_at as string) || null,
  };
}

export function dbRowToPhaseScore(row: Record<string, unknown>): PhaseScore {
  return {
    id: row.id as string,
    phaseId: row.phase_id as string,
    reviewerId: row.reviewer_id as string,
    registrationId: row.registration_id as string,
    criteriaScores: (row.criteria_scores as PhaseScore["criteriaScores"]) || [],
    totalScore: Number(row.total_score) || 0,
    recommendation: (row.recommendation as PhaseRecommendation) || null,
    overallFeedback: (row.overall_feedback as string) || null,
    flagged: !!row.flagged,
    submittedAt: row.submitted_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function dbRowToPhaseDecision(row: Record<string, unknown>): PhaseDecision {
  return {
    id: row.id as string,
    phaseId: row.phase_id as string,
    registrationId: row.registration_id as string,
    decision: row.decision as PhaseDecisionType,
    recommendationCount: (row.recommendation_count as number) || 0,
    totalReviewers: (row.total_reviewers as number) || 0,
    averageScore: row.average_score != null ? Number(row.average_score) : null,
    decidedBy: (row.decided_by as string) || null,
    rationale: (row.rationale as string) || null,
    isOverride: !!row.is_override,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function phaseFormToDbRow(phase: Partial<CompetitionPhase>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (phase.name !== undefined) row.name = phase.name;
  if (phase.description !== undefined) row.description = phase.description;
  if (phase.phaseType !== undefined) row.phase_type = phase.phaseType;
  if (phase.evaluationMode !== undefined) row.evaluation_mode = phase.evaluationMode;
  if (phase.campusFilter !== undefined) row.campus_filter = phase.campusFilter;
  if (phase.scoringCriteria !== undefined) row.scoring_criteria = phase.scoringCriteria;
  if (phase.scoringScaleMax !== undefined) row.scoring_scale_max = phase.scoringScaleMax;
  if (phase.requireRecommendation !== undefined) row.require_recommendation = phase.requireRecommendation;
  if (phase.reviewerCount !== undefined) row.reviewer_count = phase.reviewerCount;
  if (phase.isWeighted !== undefined) row.is_weighted = phase.isWeighted;
  if (phase.blindReview !== undefined) row.blind_review = phase.blindReview;
  if (phase.startDate !== undefined) row.start_date = phase.startDate;
  if (phase.endDate !== undefined) row.end_date = phase.endDate;
  if (phase.submissionStart !== undefined) row.submission_start = phase.submissionStart;
  if (phase.submissionEnd !== undefined) row.submission_end = phase.submissionEnd;
  if (phase.location !== undefined) row.location = phase.location;
  if (phase.sortOrder !== undefined) row.sort_order = phase.sortOrder;
  if (phase.status !== undefined) row.status = phase.status;
  if (phase.awardCategories !== undefined) row.award_categories = phase.awardCategories;
  if (phase.sourcePhaseIds !== undefined) row.source_phase_ids = phase.sourcePhaseIds;
  return row;
}
