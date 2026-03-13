"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  ExternalLink,
  Shield,
  Loader2,
  Trophy,
  Users,
  Star,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { useVerifyCertificate } from "@/hooks/use-certificates";

const typeLabels: Record<string, string> = {
  participation: "Participation",
  winner: "Winner",
  mentor: "Mentor",
  judge: "Judge",
  organizer: "Organizer",
};

const typeColors: Record<string, string> = {
  winner: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  participation: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  mentor: "bg-green-500/10 text-green-500 border-green-500/30",
  judge: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  organizer: "bg-orange-500/10 text-orange-500 border-orange-500/30",
};

const typeIcons: Record<string, React.ElementType> = {
  participation: Award,
  winner: Trophy,
  mentor: Users,
  judge: Shield,
  organizer: Star,
};

export default function CertificateVerifyClient() {
  const params = useParams();
  const code = params.code as string;

  const { data, isLoading, error } = useVerifyCertificate(code);

  const cert = data?.data;
  const isVerified = data?.verified === true;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 pt-24 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold font-display">Certificate Verification</h1>
          <p className="text-muted-foreground mt-2">
            Verify the authenticity of a CloudHub certificate
          </p>
        </motion.div>

        {isLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-12"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verifying certificate...</p>
          </motion.div>
        ) : error || !cert ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-red-500/20 bg-red-500/5">
              <CardContent className="p-8 text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Certificate Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The verification code &ldquo;{code}&rdquo; does not match any certificate
                  in our records. Please double-check the code and try again.
                </p>
                <Button asChild>
                  <Link href="/">Return Home</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Verified Banner */}
            {isVerified && (
              <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-500">
                  This certificate is verified and authentic
                </span>
              </div>
            )}

            {/* Certificate Card */}
            <Card className="overflow-hidden">
              {/* Decorative header */}
              <div className="h-2 bg-gradient-to-r from-primary via-accent to-primary" />

              <CardContent className="p-8">
                {/* Certificate icon and type */}
                <div className="text-center mb-6">
                  {(() => {
                    const Icon = typeIcons[cert.type] || Award;
                    return (
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                        <Icon className="h-10 w-10 text-primary" />
                      </div>
                    );
                  })()}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm px-3 py-1",
                      typeColors[cert.type] || "bg-muted"
                    )}
                  >
                    {typeLabels[cert.type] || cert.type}
                  </Badge>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center mb-2 font-display">
                  {cert.title}
                </h2>
                {cert.description && (
                  <p className="text-center text-muted-foreground mb-6">
                    {cert.description}
                  </p>
                )}

                {/* Divider */}
                <div className="border-t border-border my-6" />

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <User className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Awarded To</p>
                      <p className="font-medium">{cert.userName || "Unknown"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Issued On</p>
                      <p className="font-medium">{formatDate(cert.issuedAt)}</p>
                    </div>
                  </div>

                  {(cert.eventTitle || cert.hackathonName) && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 sm:col-span-2">
                      <ExternalLink className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {cert.eventTitle ? "Event" : "Hackathon"}
                        </p>
                        <p className="font-medium truncate">
                          {cert.eventTitle || cert.hackathonName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Verification Code */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Verification Code</p>
                  <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded-lg">
                    {cert.verificationCode}
                  </code>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
