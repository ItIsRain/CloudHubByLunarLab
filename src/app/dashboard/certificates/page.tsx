"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Award,
  Trophy,
  Users,
  Shield,
  Star,
  Share2,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
const ShareDialog = dynamic(() => import("@/components/dialogs/share-dialog").then(m => m.ShareDialog), { ssr: false });
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useCertificates } from "@/hooks/use-certificates";
import type { Certificate } from "@/lib/types";
import type { CertificateWithMeta } from "@/lib/supabase/mappers";

const typeConfig: Record<Certificate["type"], { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  participation: { icon: Award, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "Participation" },
  winner: { icon: Trophy, color: "text-amber-500", bgColor: "bg-amber-500/10", label: "Winner" },
  mentor: { icon: Users, color: "text-green-500", bgColor: "bg-green-500/10", label: "Mentor" },
  judge: { icon: Shield, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "Judge" },
  organizer: { icon: Star, color: "text-orange-500", bgColor: "bg-orange-500/10", label: "Organizer" },
};

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "participation", label: "Participation" },
  { value: "winner", label: "Winner" },
  { value: "mentor", label: "Mentor" },
  { value: "judge", label: "Judge" },
  { value: "organizer", label: "Organizer" },
];

export default function CertificatesPage() {
  const user = useAuthStore((state) => state.user);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");
  const [shareUrl, setShareUrl] = React.useState("");

  const filters = typeFilter === "all" ? undefined : { type: typeFilter };
  const { data: certsData, isLoading } = useCertificates(filters);
  const certificates = certsData?.data ?? [];

  const handleShare = (cert: CertificateWithMeta) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    setShareTitle(cert.title);
    setShareUrl(`${siteUrl}/certificates/verify/${cert.verificationCode}`);
    setShareOpen(true);
  };

  const handleVerify = (cert: CertificateWithMeta) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    window.open(
      `${siteUrl}/certificates/verify/${cert.verificationCode}`,
      "_blank"
    );
  };

  const selectClasses =
    "flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary appearance-none";

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h1 className="font-display text-3xl font-bold mb-1">Certificates</h1>
              <p className="text-muted-foreground">
                {isLoading
                  ? "Loading your certificates..."
                  : `${certificates.length} certificate${certificates.length !== 1 ? "s" : ""} earned`}
              </p>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={selectClasses}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </motion.div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shimmer rounded-2xl h-48 w-full" />
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                {typeFilter === "all"
                  ? "No certificates yet"
                  : `No ${typeFilter} certificates`}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {typeFilter === "all"
                  ? "Participate in events and competitions to earn certificates."
                  : "Try a different filter to see other certificates."}
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {certificates.map((cert, i) => {
                const config = typeConfig[cert.type] || typeConfig.participation;
                const Icon = config.icon;

                return (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${config.bgColor}`}>
                            <Icon className={`h-6 w-6 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-xs mb-2">
                              {config.label}
                            </Badge>
                            <h3 className="font-display text-lg font-bold">{cert.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {cert.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                              <span>Issued: {formatDate(cert.issuedAt)}</span>
                              <span className="font-mono">
                                {cert.verificationCode}
                              </span>
                              {cert.eventTitle && (
                                <span>Event: {cert.eventTitle}</span>
                              )}
                              {cert.hackathonName && (
                                <span>Competition: {cert.hackathonName}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleVerify(cert)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Verify
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleShare(cert)}
                          >
                            <Share2 className="h-3.5 w-3.5 mr-1.5" />
                            Share
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={shareTitle}
        url={shareUrl}
      />
    </div>
  );
}
