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
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { AddToCalendarDialog } from "@/components/dialogs/add-to-calendar-dialog";
import { BookMentorDialog } from "@/components/dialogs/book-mentor-dialog";
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";
import { EditTeamDialog } from "@/components/dialogs/edit-team-dialog";
import { JoinTeamDialog } from "@/components/dialogs/join-team-dialog";
import { useHackathon } from "@/hooks/use-hackathons";
import { useHackathonSubmissions } from "@/hooks/use-submissions";
import { useHackathonTeams, useCreateTeam } from "@/hooks/use-teams";
import { useHackathonRegistration, useRegisterForHackathon, useCancelHackathonRegistration } from "@/hooks/use-registrations";
import { useBookmarkIds, useToggleBookmark } from "@/hooks/use-bookmarks";
import { useAuthStore } from "@/store/auth-store";
import { cn, formatDate, formatCurrency, getTimeRemaining } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  "draft": { label: "Draft", color: "bg-muted" },
  "published": { label: "Registration Open", color: "bg-green-500" },
  "registration-open": { label: "Registration Open", color: "bg-green-500" },
  "registration-closed": { label: "Registration Closed", color: "bg-yellow-500" },
  "hacking": { label: "Hacking in Progress", color: "bg-primary" },
  "submission": { label: "Submissions Open", color: "bg-orange-500" },
  "judging": { label: "Judging", color: "bg-purple-500" },
  "completed": { label: "Completed", color: "bg-muted" },
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
  const { isAuthenticated, user } = useAuthStore();
  const { data: regData } = useHackathonRegistration(hackathon?.id);
  const isRegistered = regData?.registered ?? false;
  const registerMutation = useRegisterForHackathon();
  const cancelMutation = useCancelHackathonRegistration();

  const { bookmarkIds } = useBookmarkIds("hackathon");
  const toggleBookmark = useToggleBookmark();
  const isBookmarked = hackathon ? bookmarkIds.has(hackathon.id) : false;
  const [shareOpen, setShareOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [mentorDialogOpen, setMentorDialogOpen] = React.useState(false);
  const [selectedMentor, setSelectedMentor] = React.useState<string | null>(null);
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false);
  const [editTeamOpen, setEditTeamOpen] = React.useState(false);
  const [joinTeamOpen, setJoinTeamOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<import("@/lib/types").Team | null>(null);
  const createTeamMutation = useCreateTeam();

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
            <h1 className="font-display text-3xl font-bold mb-2">Hackathon Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The hackathon you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button asChild>
              <Link href="/explore">Browse Hackathons</Link>
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

  const getDeadline = () => {
    if (hackathon.status === "published" || hackathon.status === "registration-open") return hackathon.registrationEnd;
    if (hackathon.status === "hacking" || hackathon.status === "submission") return hackathon.submissionDeadline;
    return null;
  };

  const deadline = getDeadline();

  const tierOrder = ["platinum", "gold", "silver", "bronze", "community"] as const;

  const timeline = [
    { label: "Registration Opens", date: hackathon.registrationStart },
    { label: "Registration Closes", date: hackathon.registrationEnd },
    { label: "Hacking Starts", date: hackathon.hackingStart },
    { label: "Hacking Ends", date: hackathon.hackingEnd },
    { label: "Submission Deadline", date: hackathon.submissionDeadline },
    { label: "Judging", date: hackathon.judgingStart },
    { label: "Winners Announced", date: hackathon.winnersAnnouncement },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />

      {/* Cinematic Hero */}
      <div className="relative h-[500px] overflow-hidden">
        <Image
          src={hackathon.coverImage || "/placeholder-hackathon.jpg"}
          alt={hackathon.name}
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-0 right-0"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className={cn(status.color, "text-white")}>{status.label}</Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-none">{hackathon.category}</Badge>
                </div>
                {hackathon.logo && (
                  <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3 overflow-hidden">
                    <Image src={hackathon.logo} alt="" width={40} height={40} className="object-contain" unoptimized/>
                  </div>
                )}
                <h1 className="font-display text-4xl sm:text-5xl font-bold mb-2">{hackathon.name}</h1>
                {hackathon.tagline && <p className="text-white/80 text-xl">{hackathon.tagline}</p>}

                {/* Key Stats */}
                <div className="flex flex-wrap items-center gap-6 mt-4 text-white/80">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-5 w-5 text-yellow-400" />
                    <span className="font-bold text-white">{formatCurrency(
                      (hackathon.prizes ?? []).reduce((sum, p) => sum + (p.value || 0), 0),
                      hackathon.prizes?.[0]?.currency || "USD"
                    )}</span>
                    <span>in prizes</span>
                  </div>
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
                  {isOrganizer ? (
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/hackathons/${hackathon.id}?tab=edit`}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit Hackathon
                      </Link>
                    </Button>
                  ) : (hackathon.status === "published" || hackathon.status === "registration-open") && (
                    isRegistered ? (
                      <Button size="sm" variant="secondary" onClick={async () => {
                        await cancelMutation.mutateAsync(hackathon.id);
                        toast.success("Registration cancelled");
                      }} disabled={cancelMutation.isPending}>
                        <Check className="h-4 w-4 mr-1" />
                        Registered
                      </Button>
                    ) : (
                      <Button size="sm" onClick={async () => {
                        if (!isAuthenticated) { toast.error("Please sign in to register"); return; }
                        try {
                          await registerMutation.mutateAsync(hackathon.id);
                          toast.success("Successfully registered for the hackathon!");
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : "Registration failed");
                        }
                      }} disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : null}
                        Register Now
                      </Button>
                    )
                  )}
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
            <Tabs defaultValue="overview">
              <TabsList className="flex-wrap">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tracks">Tracks ({hackathon.tracks.length})</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="teams">Teams ({hackTeams.length})</TabsTrigger>
                <TabsTrigger value="submissions">Submissions ({hackSubs.length})</TabsTrigger>
                {hackathon.mentors.length > 0 && <TabsTrigger value="mentors">Mentors</TabsTrigger>}
                <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
                <TabsTrigger value="faq">FAQ</TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-6 mt-6">
                <Card>
                  <CardHeader><CardTitle>About</CardTitle></CardHeader>
                  <CardContent>
                    <div
                      className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1 [&_p:empty]:hidden"
                      dangerouslySetInnerHTML={{ __html: hackathon.description }}
                    />
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timeline.map((item, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <div className={cn("h-3 w-3 rounded-full", new Date(item.date) < new Date() ? "bg-primary" : "bg-muted")} />
                            {i < timeline.length - 1 && <div className="w-0.5 h-8 bg-muted" />}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
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
                          <p className="font-display text-2xl font-bold">{formatCurrency(prize.value, prize.currency)}</p>
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
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:my-1 [&_p:empty]:hidden"
                        dangerouslySetInnerHTML={{ __html: hackathon.rules }}
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium mb-2">Eligibility</p>
                      <ul className="space-y-1">
                        {hackathon.eligibility.map((e, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span
                              className="[&_p]:inline [&_ul]:hidden [&_ol]:hidden"
                              dangerouslySetInnerHTML={{ __html: e }}
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
                                  <span className="font-bold">{formatCurrency(p.value, p.currency)}</span>
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
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {timeline.map((item, i) => (
                        <div key={i} className="flex items-center gap-4 py-3 border-b last:border-0">
                          <div className={cn("h-3 w-3 rounded-full flex-shrink-0", new Date(item.date) < new Date() ? "bg-primary" : "bg-muted")} />
                          <div className="flex-1">
                            <p className="font-medium">{item.label}</p>
                          </div>
                          <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Teams */}
              <TabsContent value="teams" className="mt-6">
                {hackTeams.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-display text-lg font-bold mb-1">No teams yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">Be the first to create a team!</p>
                    <Button onClick={() => {
                      if (!isAuthenticated) { toast.error("Please sign in to create a team"); return; }
                      setCreateTeamOpen(true);
                    }}>Create Team</Button>
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
                                return (
                                  <Button variant="outline" size="sm" className="w-full gap-1.5 mt-3" onClick={() => { setSelectedTeam(team); setEditTeamOpen(true); }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit Team
                                  </Button>
                                );
                              }

                              if (!isMember && team.status === "forming" && team.members.length < team.maxSize) {
                                if (!isRegistered) {
                                  return (
                                    <Button variant="outline" size="sm" className="w-full gap-1.5 mt-3" disabled title="Register for the hackathon to join a team">
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
              </TabsContent>

              {/* Submissions */}
              <TabsContent value="submissions" className="mt-6">
                {hackSubs.length === 0 ? (
                  <div className="text-center py-16">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="font-display text-lg font-bold mb-1">No submissions yet</h3>
                    <p className="text-sm text-muted-foreground">Submissions will appear here once the hacking phase begins.</p>
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
              </TabsContent>

              {/* Mentors */}
              {hackathon.mentors.length > 0 && (
                <TabsContent value="mentors" className="mt-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hackathon.mentors.map((mentor, i) => (
                      <motion.div key={mentor.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6 text-center">
                            <Avatar className="h-20 w-20 mx-auto mb-3">
                              <AvatarImage src={mentor.user.avatar} />
                              <AvatarFallback className="text-xl">{mentor.user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h4 className="font-display text-lg font-bold">{mentor.user.name}</h4>
                            <p className="text-sm text-muted-foreground">{mentor.user.headline}</p>
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
                                setSelectedMentor(mentor.id);
                                setMentorDialogOpen(true);
                              }}
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                              Book Session
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {/* Sponsors */}
              <TabsContent value="sponsors" className="mt-6">
                {tierOrder.map((tier) => {
                  const tierSponsors = hackathon.sponsors.filter((s) => s.tier === tier);
                  if (tierSponsors.length === 0) return null;
                  return (
                    <div key={tier} className="mb-8">
                      <h3 className="font-display text-lg font-bold capitalize mb-4">{tier} Sponsors</h3>
                      <div className={cn(
                        "grid gap-4",
                        tier === "platinum" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                      )}>
                        {tierSponsors.map((sponsor) => (
                          <Card key={sponsor.id} className="hover:shadow-md transition-shadow">
                            <CardContent className={cn("flex flex-col items-center text-center", tier === "platinum" ? "p-8" : "p-4")}>
                              <Image
                                src={sponsor.logo}
                                alt={sponsor.name}
                                width={tier === "platinum" ? 80 : 48}
                                height={tier === "platinum" ? 80 : 48}
                                unoptimized
                                className="rounded-lg mb-3"
                              />
                              <p className="font-medium">{sponsor.name}</p>
                              {sponsor.description && tier === "platinum" && (
                                <p className="text-xs text-muted-foreground mt-1">{sponsor.description}</p>
                              )}
                              {sponsor.website && (
                                <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 flex items-center gap-1">
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

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} title={hackathon.name} url={`https://cloudhub.dev/hackathons/${hackathon.slug}`} />
      <AddToCalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} title={hackathon.name} startDate={hackathon.hackingStart} endDate={hackathon.hackingEnd} location={hackathon.location?.address || "Online"} />
      {hackathon.mentors.length > 0 && (
        <BookMentorDialog
          open={mentorDialogOpen}
          onOpenChange={setMentorDialogOpen}
          mentor={hackathon.mentors.find((m) => m.id === selectedMentor) || hackathon.mentors[0]}
          onBook={() => toast.success("Mentor session booked! (mock)")}
        />
      )}
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
      />
      {selectedTeam && (
        <EditTeamDialog
          open={editTeamOpen}
          onOpenChange={setEditTeamOpen}
          team={selectedTeam}
        />
      )}
    </div>
  );
}
