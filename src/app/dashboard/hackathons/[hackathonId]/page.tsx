"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  LayoutDashboard,
  Edit,
  UserCheck,
  UsersRound,
  Inbox,
  Scale,
  GraduationCap,
  Handshake,
  Gift,
  Trophy,
  Megaphone,
  Mail,
  BarChart3,
  Columns3,
  Settings,
  FileText,
  HelpCircle,
  ClipboardList,
  Shield,
  Layers,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useHackathon } from "@/hooks/use-hackathons";
import { useCollaborators } from "@/hooks/use-collaborators";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

import { OverviewTab } from "./_components/overview-tab";
import { EditTab } from "./_components/edit-tab";
import { ParticipantsTab } from "./_components/participants-tab";
import { TeamsTab } from "./_components/teams-tab";
import { SubmissionsTab } from "./_components/submissions-tab";
import { JudgingTab } from "./_components/judging-tab";
import { MentorsTab } from "./_components/mentors-tab";
import { SponsorsTab } from "./_components/sponsors-tab";
import { PrizesTab } from "./_components/prizes-tab";
import { AnnouncementsTab } from "./_components/announcements-tab";
import dynamic from "next/dynamic";
const AnalyticsTab = dynamic(() => import("./_components/analytics-tab").then(m => m.AnalyticsTab), { loading: () => <div className="shimmer rounded-xl h-96" /> });
import { SettingsTab } from "./_components/settings-tab";
import { FAQTab } from "./_components/faq-tab";

const ApplicationsTab = dynamic(() => import("./_components/applications-tab").then(m => m.ApplicationsTab), { loading: () => <div className="shimmer rounded-xl h-96" /> });
const ScreeningTab = dynamic(() => import("./_components/screening-tab").then(m => m.ScreeningTab), { loading: () => <div className="shimmer rounded-xl h-96" /> });
const FormBuilderTab = dynamic(() => import("./_components/form-builder-tab"), { loading: () => <div className="shimmer rounded-xl h-96" /> });
const PhasesTab = dynamic(() => import("./_components/phases-tab").then(m => m.PhasesTab), { loading: () => <div className="shimmer rounded-xl h-96" /> });
const EmailTemplatesTab = dynamic(() => import("./_components/email-templates-tab").then(m => m.EmailTemplatesTab), { loading: () => <div className="shimmer rounded-xl h-96" /> });
const WinnersTab = dynamic(() => import("./_components/winners-tab").then(m => m.WinnersTab), { loading: () => <div className="shimmer rounded-xl h-96" /> });
const ScoreReviewTab = dynamic(() => import("./_components/score-review-tab").then(m => m.ScoreReviewTab), { loading: () => <div className="shimmer rounded-xl h-96" /> });

const statusConfig: Record<
  string,
  { label: string; variant: "muted" | "success" | "warning" | "gradient" | "secondary" }
> = {
  draft: { label: "Draft", variant: "muted" },
  published: { label: "Published", variant: "success" },
  "registration-open": { label: "Registration Open", variant: "success" },
  "registration-closed": { label: "Registration Closed", variant: "warning" },
  hacking: { label: "Competing in Progress", variant: "gradient" },
  submission: { label: "Submissions Open", variant: "warning" },
  judging: { label: "Judging", variant: "secondary" },
  completed: { label: "Completed", variant: "muted" },
};

const tabs = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "edit", label: "Edit", icon: Edit },
  { value: "form-builder", label: "Form Builder", icon: FileText },
  { value: "applications", label: "Applications", icon: ClipboardList },
  { value: "screening", label: "Screening", icon: Shield },
  { value: "phases", label: "Phases", icon: Layers },
  { value: "participants", label: "Participants", icon: UserCheck },
  { value: "teams", label: "Teams", icon: UsersRound },
  { value: "submissions", label: "Submissions", icon: Inbox },
  { value: "judging", label: "Judging", icon: Scale },
  { value: "score-review", label: "Score Review", icon: Columns3 },
  { value: "mentors", label: "Mentors", icon: GraduationCap },
  { value: "sponsors", label: "Sponsors", icon: Handshake },
  { value: "prizes", label: "Prizes", icon: Gift },
  { value: "winners", label: "Winners", icon: Trophy },
  { value: "faq", label: "FAQ", icon: HelpCircle },
  { value: "announcements", label: "Announcements", icon: Megaphone },
  { value: "emails", label: "Emails", icon: Mail },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "settings", label: "Settings", icon: Settings },
];

function HackathonDashboardContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hackathonId = params.hackathonId as string;
  const { data: hackathonData, isLoading } = useHackathon(hackathonId);
  const hackathon = hackathonData?.data;
  const { user, isLoading: authLoading } = useAuthStore();

  const { data: collabData } = useCollaborators(hackathonId);
  const collaborators = collabData?.data ?? [];
  const myCollab = collaborators.find((c) => c.userId === user?.id);
  const isCollaborator = !!myCollab;
  const collaboratorRole = myCollab?.role ?? null;

  const isOwner = hackathon && user && hackathon.organizerId === user.id;
  const isAdmin = user?.roles?.includes("admin");
  const hasAccess = isOwner || isAdmin || isCollaborator;

  // Redirect unauthorized users
  React.useEffect(() => {
    if (!isLoading && !authLoading && hackathon && user && !hasAccess) {
      toast.error("You don't have permission to manage this competition.");
      router.replace("/dashboard/hackathons");
    }
  }, [isLoading, authLoading, hackathon, user, hasAccess, router]);

  const currentTab = searchParams.get("tab") || "overview";

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    if (value === "overview") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", value);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  };

  if (isLoading || authLoading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="space-y-4">
            <div className="shimmer rounded-xl h-12 w-64" />
            <div className="shimmer rounded-xl h-8 w-96" />
            <div className="shimmer rounded-xl h-12 w-full" />
            <div className="shimmer rounded-xl h-96 w-full" />
          </div>
        </main>
      </>
    );
  }

  if (hackathon && !hasAccess) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              Access Denied
            </h2>
            <p className="text-muted-foreground mb-6">
              You don&apos;t have permission to manage this hackathon.
            </p>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to My Hackathons
              </Button>
            </Link>
          </motion.div>
        </main>
      </>
    );
  }

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              Hackathon Not Found
            </h2>
            <p className="text-muted-foreground mb-6">
              The hackathon you are looking for does not exist.
            </p>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back to My Hackathons
              </Button>
            </Link>
          </motion.div>
        </main>
      </>
    );
  }

  const status = statusConfig[hackathon.status] || {
    label: hackathon.status,
    variant: "muted" as const,
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Back link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href="/dashboard/hackathons"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Hackathons
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl font-bold">
                {hackathon.name}
              </h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            {hackathon.tagline && (
              <p className="text-muted-foreground">{hackathon.tagline}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/hackathons/${hackathon.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
                View Public Page
              </Button>
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/hackathons/${hackathon.slug}`
                );
                toast.success("Link copied to clipboard!");
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </motion.div>

        {/* Tabbed Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="flex flex-wrap h-auto w-full gap-1 bg-muted/50 p-1.5 rounded-xl mb-6">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5 px-3 py-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="edit">
              <EditTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="form-builder">
              <FormBuilderTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="applications">
              <ApplicationsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="screening">
              <ScreeningTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="phases">
              <PhasesTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="participants">
              <ParticipantsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="teams">
              <TeamsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="submissions">
              <SubmissionsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="judging">
              <JudgingTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="score-review">
              <ScoreReviewTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="mentors">
              <MentorsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="sponsors">
              <SponsorsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="prizes">
              <PrizesTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="winners">
              <WinnersTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="faq">
              <FAQTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="announcements">
              <AnnouncementsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="emails">
              <EmailTemplatesTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="analytics">
              <AnalyticsTab hackathon={hackathon} hackathonId={hackathonId} />
            </TabsContent>
            <TabsContent value="settings">
              <SettingsTab
                hackathon={hackathon}
                hackathonId={hackathonId}
                isOwner={!!isOwner}
                collaboratorRole={collaboratorRole}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </>
  );
}

export default function HackathonManagementPage() {
  return (
    <React.Suspense
      fallback={
        <>
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
            <div className="space-y-4">
              <div className="shimmer rounded-xl h-12 w-64" />
              <div className="shimmer rounded-xl h-8 w-96" />
              <div className="shimmer rounded-xl h-12 w-full" />
              <div className="shimmer rounded-xl h-96 w-full" />
            </div>
          </main>
        </>
      }
    >
      <HackathonDashboardContent />
    </React.Suspense>
  );
}
