// =====================================================
// Core Types for CloudHub by Lunar Limited Platform
// =====================================================

// Subscription Types
export type SubscriptionTier = "free" | "enterprise";

export interface PlanLimits {
  eventsPerMonth: number;
  hackathonsPerMonth: number;
  attendeesPerEvent: number;
  paidTicketing: boolean;
  customBranding: boolean;
  analytics: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

// User & Auth Types
export type UserRole = "attendee" | "organizer" | "judge" | "mentor" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  headline?: string;
  location?: string;
  website?: string;
  github?: string;
  twitter?: string;
  linkedin?: string;
  skills: string[];
  interests: string[];
  roles: UserRole[];
  eventsAttended: number;
  hackathonsParticipated: number;
  projectsSubmitted: number;
  wins: number;
  status: "active" | "suspended" | "banned";
  subscriptionTier: SubscriptionTier;
  createdAt: string;
  updatedAt: string;
}

// Report Types
export type ReportType = "event" | "hackathon" | "user" | "comment";
export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

export interface Report {
  id: string;
  reporterId: string;
  reporter?: User;
  type: ReportType;
  entityId: string;
  entityTitle: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Event Types
export type EventType = "in-person" | "online" | "hybrid";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type EntityVisibility = "public" | "private" | "unlisted";
export type EventCategory =
  | "tech"
  | "ai-ml"
  | "web3"
  | "design"
  | "business"
  | "health"
  | "music"
  | "social"
  | "workshop"
  | "conference"
  | "meetup"
  | "networking";

export interface EventLocation {
  type: EventType;
  address?: string;
  city?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
  platform?: string;
  meetingUrl?: string;
}

export interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  quantity: number;
  sold: number;
  maxPerOrder: number;
  salesStart?: string;
  salesEnd?: string;
}

export interface Speaker {
  id: string;
  name: string;
  title: string;
  company?: string;
  bio?: string;
  avatar?: string;
  twitter?: string;
  linkedin?: string;
}

export interface AgendaSession {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  room?: string;
  speakers: Speaker[];
  type: "talk" | "workshop" | "break" | "networking" | "panel" | "keynote";
}

export interface Event {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  description: string;
  coverImage?: string;
  category: EventCategory;
  tags: string[];
  type: EventType;
  status: EventStatus;
  visibility: EntityVisibility;
  location: EventLocation;
  startDate: string;
  endDate: string;
  timezone: string;
  tickets: TicketType[];
  speakers: Speaker[];
  agenda: AgendaSession[];
  faq: { question: string; answer: string }[];
  organizer: User;
  organizerId: string;
  communityId?: string;
  capacity?: number;
  registrationCount: number;
  isBookmarked?: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Hackathon Types
export type HackathonStatus =
  | "draft"
  | "published"
  | "registration-open"
  | "registration-closed"
  | "hacking"
  | "submission"
  | "judging"
  | "completed";

export interface Track {
  id: string;
  name: string;
  description: string;
  icon?: string;
  sponsor?: Sponsor;
  prizes: Prize[];
  requirements?: string[];
  suggestedTech?: string[];
}

export interface Prize {
  id: string;
  name: string;
  place: number | "special";
  value: number;
  currency: string;
  type: "cash" | "credits" | "swag" | "incubation" | "other";
  description?: string;
  sponsor?: Sponsor;
}

export interface Sponsor {
  id: string;
  name: string;
  logo: string;
  website?: string;
  tier: "platinum" | "gold" | "silver" | "bronze" | "community";
  description?: string;
}

export interface JudgingCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
}

export interface Mentor {
  id: string;
  user: User;
  expertise: string[];
  availability: AvailabilitySlot[];
  bio?: string;
}

export interface AvailabilitySlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  bookedBy?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface HackathonScreeningConfig {
  quotaFieldId?: string;
  quotaEnforcement?: "screening" | "registration";
  quotas?: { campus: string; quota: number; rejected?: boolean; rejectionMessage?: string; softFlagged?: boolean; softFlagMessage?: string }[];
  detectDuplicates?: boolean;
}

export interface Hackathon {
  id: string;
  slug: string;
  name: string;
  tagline?: string;
  description: string;
  coverImage?: string;
  logo?: string;
  category: EventCategory;
  tags: string[];
  status: HackathonStatus;
  visibility: EntityVisibility;
  type: EventType;
  location?: EventLocation;
  registrationStart: string;
  registrationEnd: string;
  hackingStart: string;
  hackingEnd: string;
  submissionDeadline: string;
  judgingStart: string;
  judgingEnd: string;
  winnersAnnouncement: string;
  tracks: Track[];
  prizes: Prize[];
  sponsors: Sponsor[];
  mentors: Mentor[];
  judges: User[];
  judgingCriteria: JudgingCriteria[];
  faqs?: FAQItem[];
  rules: string;
  eligibility: string[];
  minTeamSize: number;
  maxTeamSize: number;
  allowSolo: boolean;
  teamsEnabled: boolean;
  submissionsEnabled: boolean;
  registrationFields: FormField[];
  registrationSections: FormSection[];
  submissionFields: FormField[];
  submissionSections: FormSection[];
  screeningRules: ScreeningRule[];
  screeningConfig: HackathonScreeningConfig;
  organizer: User;
  organizerId: string;
  participantCount: number;
  teamCount: number;
  submissionCount: number;
  totalPrizePool: number;
  rsvpDeadline?: string;
  registrationEditableUntil?: string;
  isBookmarked?: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Team Types
export type TeamStatus = "forming" | "complete" | "submitted";

export interface TeamMember {
  id: string;
  user: User;
  role: string;
  isLeader: boolean;
  joinedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  hackathonId: string;
  track?: Track;
  members: TeamMember[];
  lookingForRoles?: string[];
  maxSize: number;
  status: TeamStatus;
  joinPassword?: string | null;
  submission?: Submission;
  createdAt: string;
  updatedAt: string;
}

// Submission Types
export type SubmissionStatus = "draft" | "submitted" | "under-review" | "scored" | "winner";

export interface Submission {
  id: string;
  hackathonId: string;
  teamId: string;
  team: Team;
  track: Track;
  projectName: string;
  tagline: string;
  description: string;
  coverImage?: string;
  demoVideo?: string;
  screenshots: string[];
  githubUrl?: string;
  demoUrl?: string;
  techStack: string[];
  readme?: string;
  formData?: Record<string, unknown>;
  status: SubmissionStatus;
  scores: Score[];
  averageScore?: number;
  rank?: number;
  upvotes: number;
  isUpvoted?: boolean;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Score {
  id: string;
  submissionId: string;
  judgeId: string;
  judge: User;
  criteria: { criteriaId: string; score: number; feedback?: string }[];
  totalScore: number;
  overallFeedback?: string;
  scoredAt: string;
}

// Hackathon Announcement Types
export interface HackathonAnnouncement {
  id: string;
  hackathonId: string;
  title: string;
  message: string;
  audience: string;
  sentBy: User;
  recipientCount: number;
  sentAt: string;
}

// Hackathon Participant Types
export interface HackathonParticipant {
  id: string;
  userId: string;
  user: User;
  hackathonId: string;
  status: "pending" | "confirmed" | "under_review" | "eligible" | "ineligible" | "accepted" | "waitlisted" | "approved" | "rejected" | "cancelled" | "declined";
  teamName?: string;
  trackName?: string;
  createdAt: string;
}

// Registration Types
export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  user: User;
  ticketType: TicketType;
  status: "pending" | "confirmed" | "checked-in" | "cancelled";
  checkedInAt?: string;
  qrCode: string;
  customFields?: Record<string, string>;
  createdAt: string;
}

// Event Guest Types (for dashboard)
export interface EventGuest {
  id: string;
  user: User;
  ticketType: TicketType | null;
  status: "pending" | "confirmed" | "checked-in" | "cancelled";
  qrCode: string | null;
  checkedInAt: string | null;
  createdAt: string;
}

// Event Email Types
export interface EventEmail {
  id: string;
  eventId: string;
  subject: string;
  body: string;
  recipientFilter: string;
  recipientCount: number;
  createdAt: string;
}

// Community Types
export interface Community {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  organizerId: string;
  organizer?: User;
  status: "active" | "archived";
  memberCount: number;
  eventCount: number;
  visibility: "public" | "private";
  tags: string[];
  socials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  isMember?: boolean;
  memberRole?: "admin" | "moderator" | "member";
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  role: "admin" | "moderator" | "member";
  joinedAt: string;
  user?: User;
}

// Notification Types
export type NotificationType =
  | "event-reminder"
  | "hackathon-update"
  | "team-invite"
  | "team-message"
  | "submission-feedback"
  | "winner-announcement"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// Blog Types
export interface BlogPost {
  id: string;
  slug: string;
  authorId: string;
  author?: User;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  category: string;
  tags: string[];
  readTime: number;
  status: "draft" | "published" | "archived";
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Messaging Types
export interface Conversation {
  id: string;
  type: "direct" | "group" | "team";
  name?: string;
  hackathonId?: string;
  teamId?: string;
  createdBy: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  participants?: ConversationParticipant[];
  otherParticipant?: User;
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: "admin" | "member";
  isMuted: boolean;
  unreadCount: number;
  lastReadAt?: string;
  joinedAt: string;
  user?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "file" | "system";
  attachments?: Record<string, unknown>[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  sender?: User;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

// Certificate Types
export interface Certificate {
  id: string;
  userId: string;
  eventId?: string;
  hackathonId?: string;
  type: "participation" | "winner" | "mentor" | "judge" | "organizer";
  title: string;
  description: string;
  issuedAt: string;
  verificationCode: string;
}

// Pricing Types
export interface PricingTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: "monthly" | "yearly";
  features: string[];
  limits: {
    eventsPerMonth: number;
    attendeesPerEvent: number;
    customBranding: boolean;
    analytics: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
  isPopular: boolean;
}

// Testimonial Types
export interface Testimonial {
  id: string;
  userId: string;
  user: User;
  quote: string;
  role: string;
  company: string;
  highlightStat?: string;
  rating: number;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
}

// Platform Stats Types
export interface PlatformStats {
  eventsHosted: number;
  totalAttendees: number;
  hackathonsHosted: number;
  totalPrizePool: number;
}

// =====================================================
// Competition Application Types
// =====================================================

export type CompetitionFormStatus = "draft" | "published" | "closed" | "archived";
export type CompetitionType = "startup" | "hackathon" | "pitch" | "innovation" | "other";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "eligible"
  | "ineligible"
  | "accepted"
  | "waitlisted"
  | "rejected"
  | "confirmed"
  | "declined"
  | "withdrawn";

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "url"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "radio"
  | "checkbox"
  | "file"
  | "heading"
  | "paragraph";

export interface FormFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  maxFileSize?: number; // bytes
  allowedFileTypes?: string[];
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  options?: FormFieldOption[];
  validation?: FormFieldValidation;
  sectionId?: string;
  order: number;
  /** @deprecated Used by competitions only. Hackathon form builder no longer sets this. */
  mappingKey?: "applicant_name" | "applicant_email" | "applicant_phone" | "startup_name" | "sector" | "campus";
  conditionalOn?: {
    fieldId: string;
    operator: "equals" | "not_equals" | "contains" | "is_not_empty";
    value?: string;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface CompetitionForm {
  id: string;
  organizerId: string;
  organizer?: User;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  logo?: string;
  competitionName: string;
  competitionType: CompetitionType;
  fields: FormField[];
  sections: FormSection[];
  status: CompetitionFormStatus;
  opensAt?: string;
  closesAt?: string;
  maxApplications?: number;
  allowEditAfterSubmit: boolean;
  confirmationEmailTemplate?: string;
  primaryColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitionApplication {
  id: string;
  formId: string;
  form?: CompetitionForm;
  applicantId?: string;
  applicant?: User;
  data: Record<string, unknown>;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  startupName?: string;
  campus?: string;
  sector?: string;
  status: ApplicationStatus;
  completenessScore: number;
  eligibilityPassed?: boolean;
  screeningCompletedAt?: string;
  screeningNotes?: string;
  internalNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  files?: ApplicationFile[];
  screeningResults?: ScreeningResult[];
  flags?: ScreeningFlag[];
}

export interface ApplicationFile {
  id: string;
  applicationId: string;
  fieldId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  createdAt: string;
}

export type ScreeningRuleType = "hard" | "soft";
export type ScreeningOperator =
  | "equals" | "not_equals"
  | "contains" | "not_contains"
  | "greater_than" | "less_than" | "greater_equal" | "less_equal"
  | "in" | "not_in"
  | "is_empty" | "is_not_empty"
  | "is_true" | "is_false";

export interface ScreeningRule {
  id: string;
  formId: string;
  name: string;
  description?: string;
  ruleType: ScreeningRuleType;
  fieldId: string;
  operator: ScreeningOperator;
  value?: unknown;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningResult {
  id: string;
  applicationId: string;
  ruleId: string;
  rule?: ScreeningRule;
  passed: boolean;
  actualValue?: unknown;
  reason?: string;
  createdAt: string;
}

export type ScreeningFlagType =
  | "duplicate_email"
  | "duplicate_phone"
  | "duplicate_linkedin"
  | "duplicate_startup"
  | "soft_warning"
  | "manual";

export interface ScreeningFlag {
  id: string;
  applicationId: string;
  flagType: ScreeningFlagType;
  severity: "info" | "warning" | "critical";
  message: string;
  relatedApplicationId?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}

export interface CampusQuota {
  id: string;
  formId: string;
  campus: string;
  quota: number;
}

export interface CampusSummary {
  formId: string;
  campus: string;
  totalSubmitted: number;
  pendingReview: number;
  eligible: number;
  ineligible: number;
  accepted: number;
  waitlisted: number;
  rejected: number;
  confirmed: number;
  declined: number;
  incomplete: number;
}

// Entity Invitation Types
export interface EntityInvitation {
  id: string;
  entityType: "event" | "hackathon";
  entityId: string;
  email: string;
  name: string;
  token: string;
  status: "pending" | "accepted" | "declined";
  invitedBy: string;
  acceptedBy?: string;
  createdAt: string;
}

// API Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Filter Types
export interface EventFilters {
  search?: string;
  category?: EventCategory[];
  type?: EventType[];
  dateRange?: { start: string; end: string };
  priceRange?: { min: number; max: number };
  location?: string;
  isFree?: boolean;
  sortBy?: "date" | "popularity" | "newest";
}

export interface HackathonFilters {
  search?: string;
  category?: EventCategory[];
  status?: HackathonStatus[];
  prizeRange?: { min: number; max: number };
  sortBy?: "date" | "prize" | "participants" | "newest";
}

// Mentor Availability Types
export interface MentorAvailability {
  id: string;
  mentorId: string;
  hackathonId?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

// Mentor Session Types
export type MentorSessionStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type MentorSessionPlatform = "zoom" | "google_meet" | "teams" | "discord" | "in_person" | "other";

export interface MentorSession {
  id: string;
  mentorId: string;
  menteeId: string;
  hackathonId?: string;
  teamId?: string;
  title: string;
  description?: string;
  status: MentorSessionStatus;
  sessionDate: string;
  durationMinutes: number;
  meetingUrl?: string;
  platform?: MentorSessionPlatform;
  notes?: string;
  mentorFeedbackRating?: number;
  mentorFeedbackComment?: string;
  menteeFeedbackRating?: number;
  menteeFeedbackComment?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
  mentor?: User;
  mentee?: User;
}

// Team Suggestion Types
export interface TeamSuggestion {
  user: User;
  compatibilityScore: number;
  sharedSkills: string[];
  complementarySkills: string[];
  sharedInterests: string[];
}

// ── Competition Phase Types ───────────────────────────────

export type PhaseType = "bootcamp" | "final" | "custom";
export type PhaseStatus = "draft" | "active" | "scoring" | "calibration" | "completed";
export type PhaseReviewerStatus = "invited" | "accepted" | "declined";
export type PhaseRecommendation = "recommend" | "do_not_recommend";
export type PhaseDecisionType = "advance" | "do_not_advance" | "borderline";

export type CriteriaEvaluationType = "stars" | "scale" | "rubric";

export interface PhaseScoringCriteria {
  id: string;
  name: string;
  description?: string;
  evaluationType: CriteriaEvaluationType;
  maxScore: number;
  weight: number; // percentage weight of total grade (all criteria weights should sum to 100)
}

export interface CompetitionPhase {
  id: string;
  hackathonId: string;
  name: string;
  description?: string;
  phaseType: PhaseType;
  evaluationMode: 'application' | 'submission';
  campusFilter?: string | null;
  scoringCriteria: PhaseScoringCriteria[];
  scoringScaleMax: number;
  requireRecommendation: boolean;
  reviewerCount: number;
  isWeighted: boolean;
  blindReview: boolean;
  startDate?: string | null;
  endDate?: string | null;
  submissionStart?: string | null;
  submissionEnd?: string | null;
  location?: string | null;
  sortOrder: number;
  status: PhaseStatus;
  awardCategories?: AwardCategory[];
  sourcePhaseIds?: string[];
  createdAt: string;
  updatedAt: string;
  // Populated on fetch (aggregate counts from API)
  reviewers?: PhaseReviewer[];
  reviewerCount_agg?: number;
  reviewerAcceptedCount?: number;
  reviewerInvitedCount?: number;
  scoreCount?: number;
  assignmentCount?: number;
  applicantCount?: number;
}

export interface AwardCategory {
  id: string;
  name: string;
  type: "sector" | "special";
  description?: string;
}

export interface PhaseFinalist {
  id: string;
  phaseId: string;
  registrationId: string;
  sourcePhaseId?: string | null;
  sourceScore?: number | null;
  rank?: number | null;
  awardCategoryId?: string | null;
  awardLabel?: string | null;
  selectedAt: string;
  selectedBy?: string | null;
  // Populated on fetch
  applicantName?: string;
  applicantEmail?: string;
  teamName?: string;
}

export interface PhaseReviewer {
  id: string;
  phaseId: string;
  userId: string;
  name: string;
  email: string;
  status: PhaseReviewerStatus;
  invitedAt: string;
  acceptedAt?: string | null;
}

export interface ReviewerAssignment {
  id: string;
  phaseId: string;
  reviewerId: string;
  registrationId: string;
  assignedAt: string;
  // Populated on fetch
  reviewer?: PhaseReviewer;
  applicantName?: string;
  applicantEmail?: string;
}

export interface PhaseScore {
  id: string;
  phaseId: string;
  reviewerId: string;
  registrationId: string;
  criteriaScores: { criteriaId: string; score: number; feedback?: string }[];
  totalScore: number;
  recommendation?: PhaseRecommendation | null;
  overallFeedback?: string | null;
  flagged: boolean;
  submittedAt: string;
  updatedAt: string;
  // Populated on fetch
  reviewerName?: string;
  applicantName?: string;
}

export interface PhaseDecision {
  id: string;
  phaseId: string;
  registrationId: string;
  decision: PhaseDecisionType;
  recommendationCount: number;
  totalReviewers: number;
  averageScore?: number | null;
  decidedBy?: string | null;
  rationale?: string | null;
  isOverride: boolean;
  createdAt: string;
  updatedAt: string;
  // Populated on fetch
  applicantName?: string;
  applicantEmail?: string;
}
