"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Trophy,
  Users,
  Clock,
  MapPin,
  Globe,
  Bookmark,
  BookmarkCheck,
  Share2,
  CalendarPlus,
  Zap,
  Award,
  BookOpen,
  MessageSquare,
  Star,
  ChevronRight,
  ExternalLink,
  Check,
  Loader2,
  Pencil,
  UserPlus,
  Lock,
  Gavel,
  GraduationCap,
  HelpCircle,
  EyeOff,
  LogOut,
  XCircle,
  CheckCircle,
  ThumbsDown,
  FileEdit,
  MoreVertical,
  ArrowRightLeft,
  Trash2,
  Crown,
} from "lucide-react";
import { toast } from "sonner";
import { SafeHtml } from "@/components/ui/safe-html";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import dynamic from "next/dynamic";
const ShareDialog = dynamic(() => import("@/components/dialogs/share-dialog").then(m => m.ShareDialog), { ssr: false });
const AddToCalendarDialog = dynamic(() => import("@/components/dialogs/add-to-calendar-dialog").then(m => m.AddToCalendarDialog), { ssr: false });
const MentorSessionBookingDialog = dynamic(() => import("@/components/dialogs/mentor-session-booking-dialog").then(m => m.MentorSessionBookingDialog), { ssr: false });
const CreateTeamDialog = dynamic(() => import("@/components/dialogs/create-team-dialog").then(m => m.CreateTeamDialog), { ssr: false });
const EditTeamDialog = dynamic(() => import("@/components/dialogs/edit-team-dialog").then(m => m.EditTeamDialog), { ssr: false });
const JoinTeamDialog = dynamic(() => import("@/components/dialogs/join-team-dialog").then(m => m.JoinTeamDialog), { ssr: false });
const TeamMembersDialog = dynamic(() => import("@/components/dialogs/team-members-dialog").then(m => m.TeamMembersDialog), { ssr: false });
const HackathonRegistrationDialog = dynamic(() => import("@/components/dialogs/hackathon-registration-dialog").then(m => m.HackathonRegistrationDialog), { ssr: false });
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import {
  useHackathonTeams,
  useCreateTeam,
  useDeleteTeam,
  useTransferLeadership,
} from "@/hooks/use-teams";
import { useHackathonRegistration, useRegisterForHackathon, useCancelHackathonRegistration, useSaveHackathonDraft, useEditHackathonRegistration, useRespondRsvp } from "@/hooks/use-registrations";
import { useBookmarkIds, useToggleBookmark } from "@/hooks/use-bookmarks";
import { usePhases } from "@/hooks/use-phases";
import { getCurrentSubmissionTarget, type SubmissionTarget } from "@/lib/submission-window";
import { usePublicWinners, type PublicWinner } from "@/hooks/use-winners";
import { useMyReviewerPhases } from "@/hooks/use-phase-scoring";
import { useMyMentorships, useHackathonMentors } from "@/hooks/use-mentorship";
import { useAuthStore } from "@/store/auth-store";
import { cn, formatDate, formatDateTime, formatCurrency, formatPrizeValue, getTimeRemaining, safeHref, getInitials } from "@/lib/utils";
import {
  distinctSponsorTiers,
  normalizeSponsorTier,
  sponsorTierHeading,
} from "@/lib/sponsor-tiers";
import { categoryLabel, getHackathonCategories } from "@/lib/hackathon-categories";

const statusConfig: Record<string, { label: string; color: string }> = {
  "draft": { label: "Draft", color: "bg-muted" },
  "published": { label: "Registration Open", color: "bg-green-500" },
  "registration-open": { label: "Registration Open", color: "bg-green-500" },
  "registration-closed": { label: "Registration Closed", color: "bg-yellow-500" },
  "hacking": { label: "Competing in Progress", color: "bg-primary" },
  "submission": { label: "Submissions Open", color: "bg-orange-500" },
  "judging": { label: "Judging", color: "bg-purple-500" },
  "completed": { label: "Completed", color: "bg-green-600" },
};

function CountdownDisplay({ deadline }: { deadline: string }) {
  const [time, setTime] = React.useState(getTimeRemaining(deadline));
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setTime(getTimeRemaining(deadline)), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!mounted || time.total <= 0) return null;

  return (
    <div className="flex items-center gap-3 text-white">
      {[
        { value: time.days, label: "Days" },
        { value: time.hours, label: "Hours" },
        { value: time.minutes, label: "Min" },
        { value: time.seconds, label: "Sec" },
      ].map((unit) => (
        <div key={unit.label} className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 font-mono text-2xl font-bold">
            {String(unit.value).padStart(2, "0")}
          </div>
          <div className="text-xs text-white/60 mt-1">{unit.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function HackathonDetailPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;

  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { data: teamsData } = useHackathonTeams(hackathon?.id);
  const { data: submissionsData } = useHackathonSubmissions(hackathon?.id);
  const { data: phasesData } = usePhases(hackathon?.id);
  const { data: winnersData } = usePublicWinners(hackathon?.id);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { data: regData } = useHackathonRegistration(hackathon?.id);
  // Reviewer assignments across all hackathons for this user. Used to decide
  // whether to show the "Judge" header button below. MUST be called
  // unconditionally before any early return — moving it inside the body
  // breaks Rules of Hooks.
  const { data: reviewerPhasesData } = useMyReviewerPhases();
  // Mentorships across all hackathons for this user — decides whether to show
  // the "Manage Mentorship" header button. Called unconditionally (Rules of Hooks).
  const { data: myMentorshipsData } = useMyMentorships();
  // Accepted mentors for this hackathon (the new roster) — shown in the
  // Mentors tab with real booking. Supersedes the legacy hackathon.mentors blob.
  // Use the resolved UUID (hackathon.id), not the URL param, which may be a
  // slug — the mentors API only accepts a UUID.
  const { data: rosterMentorsData } = useHackathonMentors(hackathon?.id);
  // Public tab shows ACCEPTED mentors only (the API returns all statuses to the
  // organizer, so filter client-side for a consistent public view).
  const acceptedMentors = (rosterMentorsData?.data ?? []).filter(
    (m) => m.status === "accepted"
  );
  // Controlled tab state so the mobile <select> dropdown and the desktop
  // TabsList drive the same value. Initial value defers to "winners" if the
  // hackathon is finished with announced winners, otherwise "overview".
  const [currentTab, setCurrentTab] = React.useState<string>(() => {
    const winnersData = hackathonData?.data;
    if (
      winnersData &&
      winnersData.status === "completed" &&
      winnersData.winnersAnnouncement &&
      new Date(winnersData.winnersAnnouncement).getTime() <= Date.now()
    ) {
      return "winners";
    }
    return "overview";
  });
  const isRegistered = regData?.registered ?? false;
  const isRejected = regData?.rejected ?? false;
  const registrationStatus = regData?.registration?.status;
  const rsvpStatus = regData?.registration?.rsvp_status;
  const registerMutation = useRegisterForHackathon();
  const cancelMutation = useCancelHackathonRegistration();
  const saveDraftMutation = useSaveHackathonDraft();
  const editMutation = useEditHackathonRegistration();
  const rsvpMutation = useRespondRsvp();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

  // Determine if registration is a draft
  const isDraft = regData?.registration?.status === "draft";
  const existingFormData = regData?.registration?.form_data;

  const { bookmarkIds } = useBookmarkIds("hackathon");
  const toggleBookmark = useToggleBookmark();
  const isBookmarked = hackathon ? bookmarkIds.has(hackathon.id) : false;
  const [shareOpen, setShareOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [mentorDialogOpen, setMentorDialogOpen] = React.useState(false);
  const [selectedMentor, setSelectedMentor] = React.useState<import("@/lib/types").HackathonMentor | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false);
  const [editTeamOpen, setEditTeamOpen] = React.useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = React.useState(false);
  const [registrationDialogOpen, setRegistrationDialogOpen] = React.useState(false);
  const [consentDialogOpen, setConsentDialogOpen] = React.useState(false);
  const [directConsent, setDirectConsent] = React.useState({ dataProcessing: false, marketing: false, thirdParty: false });
  const [selectedTeam, setSelectedTeam] = React.useState<import("@/lib/types").Team | null>(null);
  const [deleteTeamOpen, setDeleteTeamOpen] = React.useState(false);
  const [transferTeamOpen, setTransferTeamOpen] = React.useState(false);
  const [viewTeamOpen, setViewTeamOpen] = React.useState(false);
  const [transferTargetId, setTransferTargetId] = React.useState<string | null>(null);
  const createTeamMutation = useCreateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const transferLeadershipMutation = useTransferLeadership();

  // Derived winners state — must be before early returns (Rules of Hooks)
  const winnersAnnounced = winnersData?.announced ?? false;
  const publicWinners = winnersData?.data ?? [];
  const winnersByTrack = React.useMemo(() => {
    const groups: { trackName: string; trackDescription: string | null; winners: PublicWinner[] }[] = [];
    const trackMap = new Map<string, { trackName: string; trackDescription: string | null; winners: PublicWinner[] }>();

    for (const w of publicWinners) {
      const key = w.track?.id ?? "__general__";
      const existing = trackMap.get(key);
      if (existing) {
        existing.winners.push(w);
      } else {
        const group = {
          trackName: w.track?.name ?? "General Awards",
          trackDescription: w.track?.description ?? null,
          winners: [w],
        };
        trackMap.set(key, group);
        groups.push(group);
      }
    }

    for (const g of groups) {
      g.winners.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    }
    return groups;
  }, [publicWinners]);

  // Current user's team in this hackathon, used to short-circuit join
  // attempts on other teams with the "you're already on a team" dialog.
  // Declared before early returns to keep hook order stable.
  const myCurrentTeam = React.useMemo(() => {
    if (!user) return null;
    const teams = teamsData?.data ?? [];
    const found = teams.find((t) =>
      t.members.some((m) => m.user.id === user.id)
    );
    return found ? { id: found.id, name: found.name } : null;
  }, [teamsData, user]);

  // Active submission window — phase-aware. Drives the Submissions tab
  // banner and CTA. Returns kind: "none" when this hackathon doesn't
  // accept submissions at all.
  const submissionTarget = React.useMemo<SubmissionTarget | null>(() => {
    if (!hackathon) return null;
    return getCurrentSubmissionTarget(hackathon, phasesData?.data ?? []);
  }, [hackathon, phasesData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navbar />
        <main className="pt-24 pb-16 text-center">
          <div className="mx-auto max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h1 className="font-display text-3xl font-bold mb-2">Competition Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/explore">Browse Competitions</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const status = statusConfig[hackathon.status] || statusConfig["draft"];
  const hackTeams = teamsData?.data || [];
  const hackSubs = submissionsData?.data || [];
  const isOrganizer = user?.id === hackathon.organizerId;
  // isJudgeOnThis + showJudgeButton are derived below from
  // reviewerPhasesData/hackathon (the hook call lives near the top of the
  // component to respect Rules of Hooks).
  const winnersAnnouncedTs = hackathon.winnersAnnouncement
    ? new Date(hackathon.winnersAnnouncement).getTime()
    : null;
  const isJudgeOnThis =
    !!user &&
    !!reviewerPhasesData?.data?.length &&
    reviewerPhasesData.data.some((p) => p.hackathonId === hackathon.id);
  const showJudgeButton =
    isJudgeOnThis &&
    !isOrganizer &&
    (!winnersAnnouncedTs || winnersAnnouncedTs > Date.now());
  // An accepted mentor for THIS hackathon sees a "Manage Mentorship" button.
  const showMentorButton =
    !!user &&
    !!myMentorshipsData?.data?.some(
      (m) => m.hackathonId === hackathon.id && m.status === "accepted"
    );
  // Submissions tab/listing is hidden from the public until winners_announcement
  // has passed. Organizers always see it (so they can preview), and team members
  // implicitly see their own submission via the API even before then.
  const submissionsPubliclyVisible =
    !!hackathon.winnersAnnouncement &&
    new Date(hackathon.winnersAnnouncement).getTime() <= Date.now();
  const canSeeSubmissionsTab =
    submissionsPubliclyVisible || isOrganizer || hackSubs.length > 0;
  const canEditApplication = (registrationStatus === "pending" || registrationStatus === "draft" || registrationStatus === "confirmed") && !isOrganizer;

  const getDeadline = () => {
    if (hackathon.status === "published" || hackathon.status === "registration-open") return hackathon.registrationEnd;
    if (hackathon.status === "hacking" || hackathon.status === "submission") return hackathon.submissionDeadline;
    return null;
  };

  const deadline = getDeadline();

  // Distinct sponsor tier keys actually present on this hackathon, sorted so
  // presets come first (platinum → community) and any custom tiers trail
  // alphabetically after them.
  const sponsorTiersPresent = distinctSponsorTiers(hackathon.sponsors ?? []);

  const competitionPhases = phasesData?.data ?? [];

  const timeline: {
    label: string;
    date: string;
    isPhase: boolean;
    endDate?: string | null;
    campusFilter?: string | null;
    phaseType?: string | null;
  }[] = [
    { label: "Registration Opens", date: hackathon.registrationStart, isPhase: false },
    { label: "Registration Closes", date: hackathon.registrationEnd, isPhase: false },
    { label: "Competing Starts", date: hackathon.hackingStart, isPhase: false },
    { label: "Competing Ends", date: hackathon.hackingEnd, isPhase: false },
    { label: "Submission Deadline", date: hackathon.submissionDeadline, isPhase: false },
    { label: "Judging", date: hackathon.judgingStart, isPhase: false },
    { label: "Winners Announced", date: hackathon.winnersAnnouncement, isPhase: false },
    ...competitionPhases
      .filter((p) => p.startDate)
      .map((p) => ({
        label: p.name,
        date: p.startDate!,
        isPhase: true as const,
        endDate: p.endDate,
        campusFilter: p.campusFilter,
        phaseType: p.phaseType,
      })),
    // Add submission windows for submission-mode phases
    ...competitionPhases
      .filter((p) => p.evaluationMode === "submission" && p.submissionStart)
      .flatMap((p) => {
        const entries: typeof timeline = [];
        if (p.submissionStart) {
          entries.push({
            label: `${p.name}: Submissions Open`,
            date: p.submissionStart,
            isPhase: false,
          });
        }
        if (p.submissionEnd) {
          entries.push({
            label: `${p.name}: Submissions Close`,
            date: p.submissionEnd,
            isPhase: false,
          });
        }
        return entries;
      }),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      {/* Cinematic Hero — image lives behind via absolute inset-0 + gradient,
          content sits in normal flow so the hero grows to fit it. Padding-top
          of pt-28 (~112px) reserves space for the fixed navbar so the title
          can never slide under it. */}
      <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[500px] overflow-hidden">
        <Image
          src={hackathon.coverImage || "/placeholder-hackathon.jpg"}
          alt={hackathon.name}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative pt-28 sm:pt-32 pb-8 flex flex-col justify-end min-h-[420px] sm:min-h-[480px] lg:min-h-[500px]"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="text-white">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className={cn(status.color, "text-white")}>{status.label}</Badge>
                  {getHackathonCategories(hackathon).map((cat) => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="bg-white/20 text-white border-none"
                    >
                      {categoryLabel(cat)}
                    </Badge>
                  ))}
                  {isOrganizer && hackathon.visibility === "private" && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-none gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                  {isOrganizer && hackathon.visibility === "unlisted" && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-none gap-1">
                      <EyeOff className="h-3 w-3" />
                      Unlisted
                    </Badge>
                  )}
                </div>
                {hackathon.logo && (
                  <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 overflow-hidden">
                    <Image src={hackathon.logo} alt="" width={40} height={40} className="object-contain" />
                  </div>
                )}
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-2 leading-tight">{hackathon.name}</h1>
                {hackathon.tagline && <p className="text-white/80 text-base sm:text-lg md:text-xl">{hackathon.tagline}</p>}

                {/* Key Stats */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-6 mt-4 text-sm sm:text-base text-white/80">
                  {(() => {
                    const totalValue = (hackathon.prizes ?? []).reduce((sum, p) => sum + (p.value || 0), 0);
                    const prizeTypes = [...new Set((hackathon.prizes ?? []).map((p) => p.type))];
                    return (
                      <div className="flex items-center gap-1.5">
                        <Trophy className="h-5 w-5 text-yellow-400" />
                        {totalValue > 0 ? (
                          <>
                            <span className="font-bold text-white">
                              {formatCurrency(totalValue, hackathon.prizes?.[0]?.currency || "USD")}
                            </span>
                            <span>in prizes</span>
                          </>
                        ) : (
                          <span className="font-bold text-white">
                            {prizeTypes.length === 1 && prizeTypes[0] !== "cash"
                              ? formatPrizeValue(0, "USD", prizeTypes[0])
                              : `${(hackathon.prizes ?? []).length} prizes`}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-1.5">
                    <Users className="h-5 w-5" />
                    <span>{hackathon.participantCount} participants</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-5 w-5" />
                    <span>{hackTeams.length} teams</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start lg:items-end gap-4">
                {deadline && <CountdownDisplay deadline={deadline} />}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => { if (hackathon) toggleBookmark.mutate({ entityType: "hackathon", entityId: hackathon.id }); }}
                  >
                    {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setShareOpen(true)}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setCalendarOpen(true)}>
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                  {showMentorButton && (
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/hackathons/${hackathon.id}/manage-mentorship`}>
                        <GraduationCap className="h-4 w-4 mr-1" />
                        Manage Mentorship
                      </Link>
                    </Button>
                  )}
                  {isOrganizer ? (
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/hackathons/${hackathon.id}?tab=edit`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit Hackathon
                      </Link>
                    </Button>
                  ) : showJudgeButton ? (
                    <Button size="sm" asChild>
                      <Link href={`/judge/${hackathon.id}`}>
                        <Gavel className="h-4 w-4 mr-1" />
                        Manage Judging
                      </Link>
                    </Button>
                  ) : isRejected ? (
                    <Badge variant="destructive" className="w-full justify-center whitespace-nowrap px-4 py-2 text-sm">
                      Application {registrationStatus === "ineligible" ? "Ineligible" : registrationStatus === "declined" ? "Declined" : "Rejected"}
                    </Badge>
                  ) : isDraft && (hackathon.status === "published" || hackathon.status === "registration-open") ? (
                      <Button size="sm" onClick={() => {
                        if (hackathon.registrationFields && hackathon.registrationFields.length > 0) {
                          setRegistrationDialogOpen(true);
                        }
                      }}>
                        <FileEdit className="h-4 w-4 mr-1" />
                        Resume Draft
                      </Button>
                    ) : isRegistered ? (
                      <div className="flex items-center gap-2 flex-nowrap">
                        {(registrationStatus === "accepted" || registrationStatus === "approved") && (
                          <Badge variant="success" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Registered
                          </Badge>
                        )}
                        {registrationStatus === "eligible" && (
                          <Badge variant="success" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Eligible
                          </Badge>
                        )}
                        {registrationStatus === "pending" && (
                          <Badge variant="warning" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Pending
                          </Badge>
                        )}
                        {registrationStatus === "under_review" && (
                          <Badge variant="warning" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Under Review
                          </Badge>
                        )}
                        {registrationStatus === "waitlisted" && (
                          <Badge variant="warning" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Waitlisted
                          </Badge>
                        )}
                        {registrationStatus === "confirmed" && (
                          <Badge variant="success" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Registered
                          </Badge>
                        )}
                        {/* RSVP buttons for accepted users who haven't responded yet */}
                        {(registrationStatus === "accepted" || registrationStatus === "approved") && (!rsvpStatus || rsvpStatus === "pending") && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-green-500/20 border-green-400/50 text-green-200 hover:bg-green-500/30 h-8 px-3 text-xs"
                              onClick={() => rsvpMutation.mutate({ hackathonId: hackathon.id, response: "confirmed" }, {
                                onSuccess: () => toast.success("RSVP confirmed! See you there!"),
                                onError: (err) => toast.error(err.message),
                              })}
                              disabled={rsvpMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              RSVP
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-white/10 border-white/30 text-white hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-200 h-8 px-3 text-xs"
                              onClick={() => rsvpMutation.mutate({ hackathonId: hackathon.id, response: "declined" }, {
                                onSuccess: () => toast.success("RSVP declined. Your spot will be given to the next person on the waitlist."),
                                onError: (err) => toast.error(err.message),
                              })}
                              disabled={rsvpMutation.isPending}
                            >
                              <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                        {/* Show RSVP status badge if already responded */}
                        {(registrationStatus === "accepted" || registrationStatus === "approved") && rsvpStatus === "confirmed" && (
                          <Badge variant="success" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            RSVP Confirmed
                          </Badge>
                        )}
                        {(registrationStatus === "accepted" || registrationStatus === "approved") && rsvpStatus === "declined" && (
                          <Badge variant="destructive" className="justify-center whitespace-nowrap px-3 py-1.5 text-xs">
                            <ThumbsDown className="h-3.5 w-3.5 mr-1" />
                            RSVP Declined
                          </Badge>
                        )}
                        {/* Edit Application button */}
                        {canEditApplication && hackathon.registrationFields?.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-8 px-3 text-xs"
                            onClick={() => setEditDialogOpen(true)}
                          >
                            <FileEdit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        )}
                        {/* Cancel / Leave button */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/10 border-white/30 text-white hover:bg-red-500/20 hover:border-red-400/50 hover:text-red-200 h-8 px-3 text-xs"
                          onClick={() => setCancelDialogOpen(true)}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (registrationStatus === "accepted" || registrationStatus === "approved") ? (
                            <>
                              <LogOut className="h-3.5 w-3.5 mr-1" />
                              Leave
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (hackathon.status === "published" || hackathon.status === "registration-open") ? (
                      <Button size="sm" onClick={() => {
                        if (!isAuthenticated) { toast.error("Please sign in to register"); return; }
                        // If hackathon has custom registration fields, open the form dialog
                        if (hackathon.registrationFields && hackathon.registrationFields.length > 0) {
                          setRegistrationDialogOpen(true);
                          return;
                        }
                        // Otherwise, show consent dialog before direct registration
                        setDirectConsent({ dataProcessing: false, marketing: false, thirdParty: false });
                        setConsentDialogOpen(true);
                      }} disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : null}
                        Register Now
                      </Button>
                    ) : null}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <main className="pt-8 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Tabs
              value={currentTab}
              onValueChange={setCurrentTab}
            >
              {/* Mobile: dropdown selector (compact, no swiping, full label
                  always visible). Desktop: classic tab bar that wraps. */}
              <div className="sm:hidden">
                <select
                  aria-label="Select section"
                  value={currentTab}
                  onChange={(e) => setCurrentTab(e.target.value)}
                  className="w-full h-11 rounded-lg border border-input bg-background px-4 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring appearance-none bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22currentColor%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpolyline%20points=%226%209%2012%2015%2018%209%22/%3E%3C/svg%3E')] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                >
                  <option value="overview">Overview</option>
                  <option value="tracks">Tracks ({hackathon.tracks.length})</option>
                  <option value="schedule">Schedule</option>
                  {hackathon.teamsEnabled !== false && (
                    <option value="teams">Teams ({hackTeams.length})</option>
                  )}
                  {hackathon.submissionsEnabled !== false && canSeeSubmissionsTab && (
                    <option value="submissions">Submissions ({hackSubs.length})</option>
                  )}
                  {winnersAnnounced && publicWinners.length > 0 && (
                    <option value="winners">🏆 Winners ({publicWinners.length})</option>
                  )}
                  {acceptedMentors.length > 0 && (
                    <option value="mentors">Mentors</option>
                  )}
                  <option value="sponsors">Sponsors</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
              <TabsList className="hidden sm:flex flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tracks">Tracks ({hackathon.tracks.length})</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                {hackathon.teamsEnabled !== false && <TabsTrigger value="teams">Teams ({hackTeams.length})</TabsTrigger>}
                {hackathon.submissionsEnabled !== false && canSeeSubmissionsTab && <TabsTrigger value="submissions">Submissions ({hackSubs.length})</TabsTrigger>}
                {winnersAnnounced && publicWinners.length > 0 && (
                  <TabsTrigger value="winners">
                    <Trophy className="h-3.5 w-3.5 mr-1.5" />
                    Winners ({publicWinners.length})
                  </TabsTrigger>
                )}
                {acceptedMentors.length > 0 && <TabsTrigger value="mentors">Mentors</TabsTrigger>}
                <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card>
                  <CardHeader><CardTitle>About</CardTitle></CardHeader>
                  <CardContent>
                    <SafeHtml
                      content={hackathon.description}
                      className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1 [&_p:empty]:hidden"
                    />
                  </CardContent>
                </Card>

                {/* Winners Highlight (when announced) */}
                {winnersAnnounced && publicWinners.length > 0 && (
                  <Card className="overflow-hidden border-amber-500/30">
                    <CardHeader className="bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent">
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-amber-500" />
                        Winners
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="flex flex-wrap gap-3">
                        {publicWinners
                          .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                          .slice(0, 6)
                          .map((w) => {
                            const rankLabel: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };
                            return (
                              <div key={w.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                                {w.rank != null ? (
                                  <span className={cn(
                                    "font-display text-sm font-bold",
                                    w.rank === 1 ? "text-amber-500" : w.rank === 2 ? "text-gray-400" : "text-orange-600"
                                  )}>
                                    {rankLabel[w.rank] ?? `#${w.rank}`}
                                  </span>
                                ) : (
                                  <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                                )}
                                {w.participant && (
                                  <Avatar className="h-6 w-6">
                                    <AvatarImage src={w.participant.avatar ?? undefined} />
                                    <AvatarFallback className="text-[9px]">
                                      {(w.participant.name ?? "?").charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{w.participant?.name ?? "Anonymous"}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{w.awardLabel}</p>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      {publicWinners.length > 6 && (
                        <p className="text-xs text-muted-foreground mt-3">
                          +{publicWinners.length - 6} more — see Winners tab for all results
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Timeline */}
                <Card>
                  <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timeline.map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              "rounded-full shrink-0",
                              item.isPhase ? "h-4 w-4 border-2 border-accent bg-accent/20" : "h-3 w-3",
                              !item.isPhase && (new Date(item.date) < new Date() ? "bg-primary" : "bg-muted")
                            )} />
                            {i < timeline.length - 1 && <div className="w-0.5 h-8 bg-muted" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className={cn("text-sm font-medium", item.isPhase && "text-accent")}>{item.label}</p>
                              {item.isPhase && item.phaseType && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                  {item.phaseType}
                                </Badge>
                              )}
                              {item.isPhase && item.campusFilter && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                  {item.campusFilter}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.date)}
                              {item.isPhase && item.endDate && ` — ${formatDate(item.endDate)}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Prizes */}
                <Card>
                  <CardHeader><CardTitle>Prizes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {hackathon.prizes.map((prize, i) => (
                        <motion.div
                          key={prize.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={cn(
                            "p-4 rounded-lg border text-center",
                            prize.place === 1 && "border-amber-500 bg-amber-500/5",
                            prize.place === 2 && "border-gray-400 bg-gray-400/5",
                            prize.place === 3 && "border-orange-600 bg-orange-600/5"
                          )}
                        >
                          <Trophy className={cn(
                            "h-8 w-8 mx-auto mb-2",
                            prize.place === 1 ? "text-amber-500" :
                            prize.place === 2 ? "text-gray-400" :
                            prize.place === 3 ? "text-orange-600" : "text-primary"
                          )} />
                          <p className="font-display text-2xl font-bold">{formatPrizeValue(prize.value, prize.currency, prize.type)}</p>
                          <p className="text-sm font-medium mt-1">{prize.name}</p>
                          {prize.description && <p className="text-xs text-muted-foreground mt-1">{prize.description}</p>}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Rules */}
                <Card>
                  <CardHeader><CardTitle>Rules & Eligibility</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {hackathon.rules && (
                      <SafeHtml
                        content={hackathon.rules}
                        className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1 [&_p:empty]:hidden"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium mb-2">Eligibility</p>
                      <ul className="space-y-1">
                        {hackathon.eligibility.map((e, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <SafeHtml
                              content={e}
                              className="[&_p]:inline [&_ul]:hidden [&_ol]:hidden inline"
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>Team size: {hackathon.minTeamSize}—{hackathon.maxTeamSize}</span>
                      {hackathon.allowSolo && <Badge variant="outline">Solo allowed</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tracks */}
              <TabsContent value="tracks" className="mt-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  {hackathon.tracks.map((track, i) => (
                    <motion.div key={track.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="h-full">
                        <CardContent className="p-6">
                          <h3 className="font-display text-xl font-bold mb-2">{track.name}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{track.description}</p>
                          {track.sponsor && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-xs text-muted-foreground">Sponsored by</span>
                              <Badge variant="outline">{track.sponsor.name}</Badge>
                            </div>
                          )}
                          {track.prizes.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {track.prizes.map((p) => (
                                <div key={p.id} className="flex items-center justify-between text-sm">
                                  <span>{p.name}</span>
                                  <span className="font-bold">{formatPrizeValue(p.value, p.currency, p.type)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {track.suggestedTech && (
                            <div className="flex flex-wrap gap-1">
                              {track.suggestedTech.map((t) => (
                                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              {/* Schedule */}
              <TabsContent value="schedule" className="mt-6">
                <Card>
                  <CardContent className="p-4 sm:p-6">
                    <div className="space-y-4">
                      {timeline.map((item, i) => (
                        <div
                          key={i}
                          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 py-3 border-b last:border-0"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={cn(
                              "rounded-full flex-shrink-0 mt-1.5 sm:mt-0",
                              item.isPhase ? "h-4 w-4 border-2 border-accent bg-accent/20" : "h-3 w-3",
                              !item.isPhase && (new Date(item.date) < new Date() ? "bg-primary" : "bg-muted")
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={cn("font-medium break-words", item.isPhase && "text-accent")}>
                                  {item.label}
                                </p>
                                {item.isPhase && item.phaseType && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 capitalize">
                                    {item.phaseType}
                                  </Badge>
                                )}
                                {item.isPhase && item.campusFilter && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                    {item.campusFilter}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs sm:text-sm text-muted-foreground pl-6 sm:pl-0 sm:shrink-0 sm:whitespace-nowrap">
                            {formatDate(item.date)}
                            {item.isPhase && item.endDate && ` — ${formatDate(item.endDate)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Teams */}
              {hackathon.teamsEnabled !== false && <TabsContent value="teams" className="mt-6">
                {(() => {
                  // Compute once: is the current user already on any team in
                  // this hackathon? You can't be on two teams in one event,
                  // so if they're on one we hide the "Create Team" CTA.
                  const isOnATeam =
                    !!user &&
                    hackTeams.some((t) =>
                      t.members.some((m) => m.user.id === user.id)
                    );
                  // teamsEnabled is already guaranteed true at this point
                  // (outer JSX guard at the start of the TabsContent).
                  const canCreateTeam = !isOrganizer && !isOnATeam;
                  return canCreateTeam && hackTeams.length > 0 ? (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-display text-lg font-bold">Teams</h3>
                        <p className="text-sm text-muted-foreground">
                          Looking for teammates? Create your own team or join one
                          below.
                        </p>
                      </div>
                      <Button
                        className="w-full sm:w-auto"
                        onClick={() => {
                          if (!isAuthenticated) {
                            toast.error("Please sign in to create a team");
                            return;
                          }
                          if (!isRegistered) {
                            toast.error(
                              "Register for the competition before creating a team"
                            );
                            return;
                          }
                          setCreateTeamOpen(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Create Team
                      </Button>
                    </div>
                  ) : null;
                })()}
                {hackTeams.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-display text-lg font-bold mb-1">No teams yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Be the first to create a team!</p>
                    <Button onClick={() => {
                      if (!isAuthenticated) { toast.error("Please sign in to create a team"); return; }
                      if (!isRegistered) { toast.error("Register for the competition before creating a team"); return; }
                      setCreateTeamOpen(true);
                    }}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      Create Team
                    </Button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {hackTeams.map((team, i) => (
                      <motion.div key={team.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar>
                                <AvatarImage src={team.avatar} />
                                <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{team.name}</h4>
                                <p className="text-xs text-muted-foreground">{team.members.length}/{team.maxSize} members</p>
                              </div>
                              <Badge variant="outline">{team.status}</Badge>
                            </div>
                            <div className="flex -space-x-1.5">
                              {team.members.map((m) => (
                                <Avatar key={m.id} className="h-7 w-7 border-2 border-background">
                                  <AvatarImage src={m.user.avatar} />
                                  <AvatarFallback className="text-[10px]">{m.user.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            {team.lookingForRoles && team.lookingForRoles.length > 0 && (
                              <div className="mt-2 flex items-center gap-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">Looking for:</span>
                                {team.lookingForRoles.map((r) => (
                                  <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                                ))}
                              </div>
                            )}
                            {/* Action buttons */}
                            {(() => {
                              if (isOrganizer) {
                                return (
                                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-3" asChild>
                                    <Link href={`/dashboard/hackathons/${hackathon.id}?tab=teams`}>
                                      <Users className="h-3.5 w-3.5" />
                                      View Team
                                    </Link>
                                  </Button>
                                );
                              }

                              const isLeader = user && team.members.some((m) => m.user.id === user.id && m.isLeader);
                              const isMember = user && team.members.some((m) => m.user.id === user.id);

                              if (isLeader) {
                                const otherMembers = team.members.filter((m) => m.user.id !== user?.id);
                                return (
                                  <div className="flex gap-1.5 mt-3">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 gap-1.5"
                                      onClick={() => { setSelectedTeam(team); setEditTeamOpen(true); }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit Team
                                    </Button>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          aria-label="More team actions"
                                          className="px-2"
                                        >
                                          <MoreVertical className="h-3.5 w-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onSelect={() => {
                                            setSelectedTeam(team);
                                            setViewTeamOpen(true);
                                          }}
                                        >
                                          <Users className="h-4 w-4 mr-2" />
                                          View Team
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          disabled={otherMembers.length === 0}
                                          onSelect={() => {
                                            setSelectedTeam(team);
                                            setTransferTargetId(null);
                                            setTransferTeamOpen(true);
                                          }}
                                        >
                                          <ArrowRightLeft className="h-4 w-4 mr-2" />
                                          Transfer Leadership
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onSelect={() => {
                                            setSelectedTeam(team);
                                            setDeleteTeamOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Team
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                );
                              }

                              if (isMember) {
                                return (
                                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-3" asChild>
                                    <Link href={`/dashboard/team/${team.id}`}>
                                      <Users className="h-3.5 w-3.5" />
                                      View Members
                                    </Link>
                                  </Button>
                                );
                              }

                              if (!isMember && team.status === "forming" && team.members.length < team.maxSize) {
                                if (!isRegistered) {
                                  return (
                                    <Button variant="outline" size="sm" className="w-full gap-1.5 mt-3" disabled title="Register for the competition to join a team">
                                      <Lock className="h-3.5 w-3.5" />
                                      Register to Join
                                    </Button>
                                  );
                                }
                                return (
                                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-3" onClick={() => { setSelectedTeam(team); setJoinTeamOpen(true); }}>
                                    <UserPlus className="h-3.5 w-3.5" />
                                    {team.joinPassword ? <><Lock className="h-3 w-3" /> Join Team</> : "Join Team"}
                                  </Button>
                                );
                              }

                              return null;
                            })()}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>}

              {/* Submissions */}
              {hackathon.submissionsEnabled !== false && canSeeSubmissionsTab && <TabsContent value="submissions" className="mt-6">
                {/* Current submission target banner */}
                {submissionTarget && submissionTarget.kind !== "none" && (
                  <SubmissionTargetBanner
                    target={submissionTarget}
                    hackathonId={hackathon.id}
                    myTeamId={myCurrentTeam?.id ?? null}
                    submissions={hackSubs}
                  />
                )}
                {!submissionsPubliclyVisible && (
                  <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                    Submissions are hidden from the public until winners are
                    announced. You can see them because you organize this
                    competition or have submitted to it.
                  </div>
                )}

                {hackSubs.length === 0 ? (
                  <div className="text-center py-16">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-display text-lg font-bold mb-1">No submissions yet</h3>
                    <p className="text-sm text-muted-foreground">Submissions will appear here once the competing phase begins.</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hackSubs.map((sub, i) => (
                      <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={sub.status === "winner" ? "default" : "outline"} className="text-xs">
                                {sub.status === "winner" && <Trophy className="h-3 w-3 mr-1" />}
                                {sub.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{sub.upvotes} votes</span>
                            </div>
                            <h4 className="font-medium">{sub.projectName}</h4>
                            <p className="text-sm text-muted-foreground">{sub.tagline}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {sub.techStack.slice(0, 3).map((t) => (
                                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>}

              {/* Winners */}
              {winnersAnnounced && publicWinners.length > 0 && (
                <TabsContent value="winners" className="mt-6">
                  {/* Winners banner */}
                  <Card className="mb-6 overflow-hidden border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-orange-500/5">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Trophy className="h-6 w-6 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold">Winners Announced</h3>
                        <p className="text-sm text-muted-foreground">
                          Congratulations to all participants and winners of {hackathon.name}!
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {winnersByTrack.map((group, gi) => (
                    <motion.div
                      key={gi}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: gi * 0.1 }}
                      className="mb-8 last:mb-0"
                    >
                      <div className="mb-4">
                        <h3 className="font-display text-lg font-bold">{group.trackName}</h3>
                        {group.trackDescription && (
                          <p className="text-sm text-muted-foreground">{group.trackDescription}</p>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.winners.map((winner, wi) => {
                          const rankColors: Record<number, string> = {
                            1: "border-amber-500 bg-amber-500/5",
                            2: "border-gray-400 bg-gray-400/5",
                            3: "border-orange-600 bg-orange-600/5",
                          };
                          const rankIcons: Record<number, string> = {
                            1: "text-amber-500",
                            2: "text-gray-400",
                            3: "text-orange-600",
                          };
                          const rankClass = winner.rank ? rankColors[winner.rank] ?? "" : "";
                          const iconClass = winner.rank ? rankIcons[winner.rank] ?? "text-primary" : "text-primary";

                          return (
                            <motion.div
                              key={winner.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: gi * 0.1 + wi * 0.05 }}
                            >
                              <Card className={cn("hover:shadow-md transition-shadow", rankClass)}>
                                <CardContent className="p-5">
                                  <div className="flex items-start gap-3">
                                    {/* Rank badge */}
                                    <div className={cn(
                                      "flex items-center justify-center h-10 w-10 rounded-full shrink-0",
                                      winner.rank && winner.rank <= 3
                                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                                        : "bg-muted"
                                    )}>
                                      {winner.rank ? (
                                        <span className={cn("font-display text-lg font-bold", iconClass)}>
                                          #{winner.rank}
                                        </span>
                                      ) : (
                                        <Trophy className={cn("h-5 w-5", iconClass)} />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {/* Award label */}
                                      <Badge
                                        variant={winner.rank === 1 ? "default" : "outline"}
                                        className={cn(
                                          "mb-2 text-xs",
                                          winner.rank === 1 && "bg-amber-500 hover:bg-amber-600"
                                        )}
                                      >
                                        <Award className="h-3 w-3 mr-1" />
                                        {winner.awardLabel}
                                      </Badge>
                                      {/* Participant */}
                                      {winner.participant && (
                                        <div className="flex items-center gap-2 mt-1">
                                          <Avatar className="h-7 w-7">
                                            <AvatarImage src={winner.participant.avatar ?? undefined} />
                                            <AvatarFallback className="text-[10px]">
                                              {(winner.participant.name ?? "?").charAt(0)}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
                                              {winner.participant.name ?? "Anonymous"}
                                            </p>
                                            {winner.participant.username && (
                                              <Link
                                                href={`/profile/${winner.participant.username}`}
                                                className="text-xs text-primary hover:underline"
                                              >
                                                @{winner.participant.username}
                                              </Link>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {/* Score */}
                                      {winner.finalScore != null && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                          <Star className="h-3 w-3" />
                                          Score: {winner.finalScore.toFixed(1)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </TabsContent>
              )}

              {/* Mentors (accepted roster — real booking) */}
              {acceptedMentors.length > 0 && (
                <TabsContent value="mentors" className="mt-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {acceptedMentors.map((mentor, i) => {
                      const mentorName = mentor.user?.name || mentor.name;
                      return (
                        <motion.div key={mentor.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <Card className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6 text-center">
                              <Avatar className="h-20 w-20 mx-auto mb-3">
                                <AvatarImage src={mentor.user?.avatar} />
                                <AvatarFallback className="text-xl">{mentorName.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <h4 className="font-display text-lg font-bold">{mentorName}</h4>
                              {mentor.user?.headline && <p className="text-sm text-muted-foreground">{mentor.user.headline}</p>}
                              {mentor.bio && <p className="text-xs text-muted-foreground mt-2">{mentor.bio}</p>}
                              <div className="flex flex-wrap gap-1 justify-center mt-3">
                                {mentor.expertise.map((e) => (
                                  <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                                ))}
                              </div>
                              <Button
                                size="sm"
                                className="mt-4"
                                onClick={() => {
                                  if (!isAuthenticated) { toast.error("Please sign in to book a mentoring session."); return; }
                                  setSelectedMentor(mentor);
                                  setMentorDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                Book a Session
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </TabsContent>
              )}

              {/* Sponsors */}
              <TabsContent value="sponsors" className="mt-6">
                {sponsorTiersPresent.map((tier) => {
                  const tierSponsors = hackathon.sponsors.filter(
                    (s) => normalizeSponsorTier(s.tier) === tier
                  );
                  if (tierSponsors.length === 0) return null;
                  const isPlatinum = tier === "platinum";
                  const logoSize = isPlatinum ? 80 : 48;
                  return (
                    <div key={tier} className="mb-8">
                      <h3 className="font-display text-lg font-bold mb-4">
                        {sponsorTierHeading(tier)}
                      </h3>
                      <div className={cn(
                        "grid gap-4",
                        isPlatinum ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                      )}>
                        {tierSponsors.map((sponsor) => (
                          <Card key={sponsor.id} className="hover:shadow-md transition-shadow">
                            <CardContent className={cn("flex flex-col items-center text-center", isPlatinum ? "p-8" : "p-4")}>
                              {sponsor.logo ? (
                                <Image
                                  src={sponsor.logo}
                                  alt={sponsor.name}
                                  width={logoSize}
                                  height={logoSize}
                                  className="rounded-lg mb-3"
                                />
                              ) : (
                                <div
                                  className="rounded-lg mb-3 flex items-center justify-center bg-muted font-display font-bold text-muted-foreground"
                                  style={{
                                    width: logoSize,
                                    height: logoSize,
                                    fontSize: Math.round(logoSize / 2.5),
                                  }}
                                  aria-hidden="true"
                                >
                                  {sponsor.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <p className="font-medium">{sponsor.name}</p>
                              {sponsor.description && isPlatinum && (
                                <p className="text-xs text-muted-foreground mt-1">{sponsor.description}</p>
                              )}
                              {sponsor.website && (
                                <a href={safeHref(sponsor.website)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">
                                  Visit <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              {/* FAQ */}
              <TabsContent value="faq" className="mt-6">
                {(hackathon.faqs ?? []).length > 0 ? (
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      {(hackathon.faqs ?? []).map((faq) => (
                        <div key={faq.id} className="pb-4 border-b last:border-0 last:pb-0">
                          <p className="font-medium mb-1">{faq.question}</p>
                          <p className="text-sm text-muted-foreground">{faq.answer}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <HelpCircle className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground text-sm">No FAQs have been added yet.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} title={hackathon.name} url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/hackathons/${hackathon.slug}`} />
      <AddToCalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} title={hackathon.name} startDate={hackathon.hackingStart} endDate={hackathon.hackingEnd} location={hackathon.location?.address || "Online"} />
      <MentorSessionBookingDialog
        open={mentorDialogOpen}
        onOpenChange={(o) => {
          setMentorDialogOpen(o);
          if (!o) setSelectedMentor(null);
        }}
        hackathonId={hackathon.id}
        mentor={selectedMentor}
      />
      <CreateTeamDialog
        open={createTeamOpen}
        onOpenChange={setCreateTeamOpen}
        maxTeamSize={hackathon.maxTeamSize}
        onSubmit={async (data) => {
          try {
            await createTeamMutation.mutateAsync({
              hackathon_id: hackathon.id,
              name: data.name,
              description: data.description,
              max_size: data.maxSize,
              looking_for_roles: data.lookingForRoles,
              join_password: data.joinPassword || undefined,
            });
            toast.success(`Team "${data.name}" created successfully!`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create team");
          }
        }}
      />
      <JoinTeamDialog
        open={joinTeamOpen}
        onOpenChange={setJoinTeamOpen}
        team={selectedTeam}
        currentTeam={myCurrentTeam}
      />
      {selectedTeam && (
        <EditTeamDialog
          open={editTeamOpen}
          onOpenChange={setEditTeamOpen}
          team={selectedTeam}
        />
      )}

      <TeamMembersDialog
        open={viewTeamOpen}
        onOpenChange={setViewTeamOpen}
        team={selectedTeam}
      />

      <Dialog open={deleteTeamOpen} onOpenChange={setDeleteTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedTeam ? selectedTeam.name : "team"}?</DialogTitle>
            <DialogDescription>
              This permanently removes the team and all its members
              {selectedTeam && selectedTeam.members.length > 1
                ? ` (${selectedTeam.members.length} people will be affected)`
                : ""}
              . This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTeamOpen(false)}
              disabled={deleteTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTeamMutation.isPending || !selectedTeam}
              onClick={async () => {
                if (!selectedTeam) return;
                try {
                  await deleteTeamMutation.mutateAsync(selectedTeam.id);
                  toast.success(`Team "${selectedTeam.name}" deleted`);
                  setDeleteTeamOpen(false);
                  setSelectedTeam(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to delete team");
                }
              }}
            >
              {deleteTeamMutation.isPending ? "Deleting..." : "Delete Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={transferTeamOpen}
        onOpenChange={(open) => {
          setTransferTeamOpen(open);
          if (!open) setTransferTargetId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer leadership</DialogTitle>
            <DialogDescription>
              Hand the team over to another member. They&apos;ll gain the
              ability to edit, invite, and delete the team. You will become a
              regular member.
            </DialogDescription>
          </DialogHeader>
          {selectedTeam && (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {selectedTeam.members
                .filter((m) => m.user.id !== user?.id)
                .map((m) => {
                  const selected = transferTargetId === m.user.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setTransferTargetId(m.user.id)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-xl p-3 border text-left transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Avatar size="sm">
                        <AvatarImage src={m.user.avatar} alt={m.user.name} />
                        <AvatarFallback>{getInitials(m.user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{m.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{m.role}</p>
                      </div>
                      {selected && <Crown className="h-4 w-4 text-warning shrink-0" />}
                    </button>
                  );
                })}
              {selectedTeam.members.filter((m) => m.user.id !== user?.id).length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  You&apos;re the only member. Invite someone else first.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setTransferTeamOpen(false)}
              disabled={transferLeadershipMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={!transferTargetId || transferLeadershipMutation.isPending || !selectedTeam}
              onClick={async () => {
                if (!selectedTeam || !transferTargetId) return;
                try {
                  await transferLeadershipMutation.mutateAsync({
                    teamId: selectedTeam.id,
                    to_user_id: transferTargetId,
                  });
                  const newLeader = selectedTeam.members.find((m) => m.user.id === transferTargetId);
                  toast.success(`Leadership transferred${newLeader ? ` to ${newLeader.user.name}` : ""}`);
                  setTransferTeamOpen(false);
                  setTransferTargetId(null);
                  setSelectedTeam(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to transfer leadership");
                }
              }}
            >
              {transferLeadershipMutation.isPending ? "Transferring..." : "Transfer Leadership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {hackathon.registrationFields && hackathon.registrationFields.length > 0 && (
        <HackathonRegistrationDialog
          open={registrationDialogOpen}
          onOpenChange={setRegistrationDialogOpen}
          hackathonId={hackathon.id}
          hackathonName={hackathon.name}
          registrationFields={hackathon.registrationFields}
          registrationSections={hackathon.registrationSections}
          isSubmitting={registerMutation.isPending}
          mode={isDraft ? "draft" : "new"}
          initialFormData={isDraft ? (existingFormData ?? undefined) : undefined}
          onSaveDraft={(formData) => {
            saveDraftMutation.mutate({ hackathonId: hackathon.id, formData }, {
              onSuccess: () => toast.success("Draft saved!"),
              onError: (err) => toast.error(err.message),
            });
          }}
          isSavingDraft={saveDraftMutation.isPending}
          onSubmit={async (formData, consent) => {
            try {
              if (isDraft) {
                // Submitting a draft → use PATCH to finalize
                await editMutation.mutateAsync({ hackathonId: hackathon.id, formData });
              } else {
                await registerMutation.mutateAsync({ hackathonId: hackathon.id, formData, consent });
              }
              setRegistrationDialogOpen(false);
              toast.success("Application submitted! You'll be notified once it's reviewed.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Registration failed");
            }
          }}
        />
      )}

      {/* Edit Application Dialog */}
      {hackathon.registrationFields && hackathon.registrationFields.length > 0 && (
        <HackathonRegistrationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          hackathonId={hackathon.id}
          hackathonName={hackathon.name}
          registrationFields={hackathon.registrationFields}
          registrationSections={hackathon.registrationSections}
          isSubmitting={editMutation.isPending}
          mode="edit"
          initialFormData={existingFormData ?? undefined}
          onSubmit={async (formData, consent) => {
            try {
              await editMutation.mutateAsync({ hackathonId: hackathon.id, formData });
              setEditDialogOpen(false);
              toast.success("Application updated successfully!");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed to update application");
            }
          }}
        />
      )}

      {/* Direct Registration Consent Dialog (for hackathons with no form fields) */}
      <Dialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data Consent</DialogTitle>
            <DialogDescription>
              Please review and accept the data processing consent before registering.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={directConsent.dataProcessing}
                onChange={(e) => setDirectConsent((prev) => ({ ...prev, dataProcessing: e.target.checked }))}
                className="h-4 w-4 rounded border-input mt-0.5 shrink-0"
              />
              <span className="text-sm">
                I consent to the processing of my personal data for this competition.{" "}
                <span className="text-destructive">*</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={directConsent.marketing}
                onChange={(e) => setDirectConsent((prev) => ({ ...prev, marketing: e.target.checked }))}
                className="h-4 w-4 rounded border-input mt-0.5 shrink-0"
              />
              <span className="text-sm text-muted-foreground">
                I agree to receive marketing communications.
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={directConsent.thirdParty}
                onChange={(e) => setDirectConsent((prev) => ({ ...prev, thirdParty: e.target.checked }))}
                className="h-4 w-4 rounded border-input mt-0.5 shrink-0"
              />
              <span className="text-sm text-muted-foreground">
                I consent to sharing my data with competition partners.
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              View our{" "}
              <Link href="/legal/privacy" target="_blank" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              for details on how your data is processed.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConsentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!directConsent.dataProcessing || registerMutation.isPending}
              onClick={async () => {
                try {
                  await registerMutation.mutateAsync({
                    hackathonId: hackathon.id,
                    consent: directConsent,
                  });
                  setConsentDialogOpen(false);
                  toast.success("Successfully registered for the competition!");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Registration failed");
                }
              }}
            >
              {registerMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Register
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Registration / Leave Hackathon Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {(registrationStatus === "accepted" || registrationStatus === "approved")
                ? "Leave Competition"
                : "Cancel Registration"}
            </DialogTitle>
            <DialogDescription>
              {(registrationStatus === "accepted" || registrationStatus === "approved")
                ? "You are currently accepted as a participant. Leaving will give up your spot and the next person on the waitlist will be promoted. This action cannot be undone."
                : "Are you sure you want to cancel your registration? You can re-register later if spots are still available."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Registration
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => {
                cancelMutation.mutate(hackathon.id, {
                  onSuccess: () => {
                    setCancelDialogOpen(false);
                    toast.success(
                      (registrationStatus === "accepted" || registrationStatus === "approved")
                        ? "You have left the competition. Your spot has been released."
                        : "Registration cancelled successfully."
                    );
                  },
                  onError: (err) => {
                    toast.error(err instanceof Error ? err.message : "Failed to cancel registration");
                  },
                });
              }}
            >
              {cancelMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {(registrationStatus === "accepted" || registrationStatus === "approved")
                ? "Leave Competition"
                : "Cancel Registration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// Submission target banner
// =====================================================

function SubmissionTargetBanner({
  target,
  hackathonId,
  myTeamId,
  submissions,
}: {
  target: SubmissionTarget;
  hackathonId: string;
  myTeamId: string | null;
  submissions: import("@/lib/types").Submission[];
}) {
  if (target.kind === "none") return null;

  const deadline = target.deadline;
  const opensAt = target.opensAt;
  const isPhase = target.kind === "phase";
  const phaseName = isPhase ? target.phase.name : null;

  const mySubmission = myTeamId
    ? submissions.find(
        (s) =>
          s.teamId === myTeamId &&
          (target.kind === "phase"
            ? s.phaseId === target.phaseId
            : !s.phaseId)
      )
    : null;

  const headlineColor =
    target.status === "active"
      ? "border-success/30 bg-success/5"
      : target.status === "upcoming"
      ? "border-primary/30 bg-primary/5"
      : "border-border bg-muted/30";

  // Tag teams clearly so they know what they're submitting for.
  const kindBadge = isPhase ? "Phase submission" : "Overall hackathon submission";
  const kindBadgeVariant: "outline" | "secondary" = isPhase ? "secondary" : "outline";

  // Date + time strings (e.g. "Tue, Jun 9, 2026 at 8:00 AM").
  const opensAtLabel = opensAt ? formatDateTime(opensAt) : null;
  const closesAtLabel = deadline ? formatDateTime(deadline) : null;

  let statusLine: string;
  if (target.status === "active") {
    statusLine = closesAtLabel
      ? `Submissions close on ${closesAtLabel}`
      : "Submissions are open";
  } else if (target.status === "upcoming") {
    statusLine = opensAtLabel
      ? `Submissions open on ${opensAtLabel}`
      : "Submissions open soon";
  } else {
    statusLine = closesAtLabel
      ? `Closed on ${closesAtLabel}`
      : "Submissions closed";
  }

  return (
    <Card className={cn("mb-6 overflow-hidden", headlineColor)}>
      <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={kindBadgeVariant} className="text-xs">
              {kindBadge}
            </Badge>
            <span className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {target.status === "active"
                ? "Now open"
                : target.status === "upcoming"
                ? "Upcoming"
                : "Closed"}
            </span>
          </div>
          <h3 className="font-display text-lg font-bold truncate">
            {phaseName ?? "Project submission"}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{statusLine}</p>
          {/* When upcoming, also show the closing time so teams plan ahead. */}
          {target.status === "upcoming" && closesAtLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Closes on {closesAtLabel}
            </p>
          )}
          {/* When active, also show when the window opened for context. */}
          {target.status === "active" && opensAtLabel && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Opened on {opensAtLabel}
            </p>
          )}
        </div>
        {myTeamId && target.status === "active" && (
          <Button asChild className="shrink-0">
            <Link
              href={
                mySubmission
                  ? `/dashboard/submissions/${mySubmission.id}/edit`
                  : `/dashboard/submissions/new?hackathonId=${hackathonId}&teamId=${myTeamId}${
                      isPhase ? `&phaseId=${target.phaseId}` : ""
                    }`
              }
            >
              {mySubmission ? "Edit submission" : "Submit your project"}
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
