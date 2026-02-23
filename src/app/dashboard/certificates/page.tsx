"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Award,
  Trophy,
  Users,
  Shield,
  Star,
  Download,
  Share2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareDialog } from "@/components/dialogs/share-dialog";
import { getCertificatesForUser } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { Certificate } from "@/lib/types";

const typeConfig: Record<Certificate["type"], { icon: React.ElementType; color: string; bgColor: string }> = {
  participation: { icon: Award, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  winner: { icon: Trophy, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  mentor: { icon: Users, color: "text-green-500", bgColor: "bg-green-500/10" },
  judge: { icon: Shield, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  organizer: { icon: Star, color: "text-orange-500", bgColor: "bg-orange-500/10" },
};

export default function CertificatesPage() {
  const user = useAuthStore((state) => state.user);
  const certificates = getCertificatesForUser(user?.id ?? "");
  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareTitle, setShareTitle] = React.useState("");

  const handleShare = (cert: Certificate) => {
    setShareTitle(cert.title);
    setShareOpen(true);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold mb-1">Certificates</h1>
            <p className="text-muted-foreground">{certificates.length} certificates earned</p>
          </motion.div>

          {certificates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-display text-lg font-bold mb-1">No certificates yet</h3>
              <p className="text-sm text-muted-foreground">
                Participate in events and hackathons to earn certificates.
              </p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {certificates.map((cert, i) => {
                const config = typeConfig[cert.type];
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
                            <Badge variant="outline" className="text-xs mb-2">{cert.type}</Badge>
                            <h3 className="font-display text-lg font-bold">{cert.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{cert.description}</p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              <span>Issued: {formatDate(cert.issuedAt)}</span>
                              <span className="font-mono">{cert.verificationCode}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => toast.success("Certificate downloaded! (mock)")}
                          >
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            Download
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
        url={`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify/${shareTitle}`}
      />
    </div>
  );
}
