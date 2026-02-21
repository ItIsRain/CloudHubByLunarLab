// =====================================================
// Core Types for CloudHub by Lunar Labs Platform
// =====================================================

// Subscription Types
export type SubscriptionTier = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "inactive" | "active" | "past_due" | "canceled" | "trialing";

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
  subscriptionTier: SubscriptionTier;
  stripeCustomerId?: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd?: string;
  createdAt: string;
  updatedAt: string;
}

// Event Types
export type EventType = "in-person" | "online" | "hybrid";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
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
  organizer: User;
  organizerId: string;
  participantCount: number;
  teamCount: number;
  submissionCount: number;
  totalPrizePool: number;
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
  status: "pending" | "confirmed" | "approved" | "rejected" | "cancelled";
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
  description: string;
  logo?: string;
  coverImage?: string;
  website?: string;
  memberCount: number;
  eventCount: number;
  organizer: User;
  createdAt: string;
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
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string;
  author: User;
  category: string;
  tags: string[];
  readTime: number;
  publishedAt: string;
  createdAt: string;
}

// Message Types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: User;
  content: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
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
