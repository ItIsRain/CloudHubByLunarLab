"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  ExternalLink,
  Handshake,
  Eye,
  Building2,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mockHackathons, mockSponsors } from "@/lib/mock-data";
import { toast } from "sonner";

const tierOrder: Record<string, number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3,
  community: 4,
};

const tierConfig: Record<string, { label: string; variant: "gradient" | "warning" | "secondary" | "muted" | "outline"; color: string }> = {
  platinum: { label: "Platinum", variant: "gradient", color: "from-indigo-500 to-purple-500" },
  gold: { label: "Gold", variant: "warning", color: "from-yellow-400 to-orange-400" },
  silver: { label: "Silver", variant: "secondary", color: "from-gray-400 to-gray-500" },
  bronze: { label: "Bronze", variant: "muted", color: "from-orange-600 to-orange-700" },
  community: { label: "Community", variant: "outline", color: "from-green-400 to-teal-400" },
};

export default function SponsorsManagementPage() {
  const params = useParams();
  const hackathonId = params.hackathonId as string;
  const hackathon = mockHackathons.find((h) => h.id === hackathonId);

  if (!hackathon) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h2 className="font-display text-2xl font-bold mb-2">Hackathon Not Found</h2>
            <Link href="/dashboard/hackathons">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </main>
      </>
    );
  }

  const sponsors = mockSponsors;
  const grouped = sponsors.reduce(
    (acc, s) => {
      if (!acc[s.tier]) acc[s.tier] = [];
      acc[s.tier].push(s);
      return acc;
    },
    {} as Record<string, typeof mockSponsors>
  );

  const sortedTiers = Object.keys(grouped).sort(
    (a, b) => (tierOrder[a] ?? 99) - (tierOrder[b] ?? 99)
  );

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
            href={`/dashboard/hackathons/${hackathonId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="font-display text-3xl font-bold">Sponsors</h1>
            <p className="text-muted-foreground mt-1">
              Manage hackathon sponsors and partnerships
            </p>
          </div>
          <Button
            variant="gradient"
            onClick={() => toast.success("Sponsor invitation sent!")}
          >
            <Plus className="h-4 w-4" />
            Add Sponsor
          </Button>
        </motion.div>

        {/* Analytics Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">
                    {sponsors.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Sponsors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">~125K</p>
                  <p className="text-xs text-muted-foreground">
                    Estimated Visibility
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sponsors by Tier */}
        {sortedTiers.map((tier, tierIdx) => {
          const tierConf = tierConfig[tier] || {
            label: tier,
            variant: "muted" as const,
            color: "from-gray-400 to-gray-500",
          };
          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + tierIdx * 0.1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-display text-xl font-bold capitalize">
                  {tierConf.label}
                </h2>
                <Badge variant={tierConf.variant}>
                  {grouped[tier].length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[tier].map((sponsor, i) => (
                  <motion.div
                    key={sponsor.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.15 + tierIdx * 0.1 + i * 0.05,
                    }}
                  >
                    <Card hover className="h-full">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                            <Image
                              src={sponsor.logo}
                              alt={sponsor.name}
                              width={32}
                              height={32}
                              unoptimized
                              className="rounded"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-display font-bold truncate">
                              {sponsor.name}
                            </h3>
                            <Badge
                              variant={tierConf.variant}
                              className="text-xs mt-1"
                            >
                              {tierConf.label}
                            </Badge>
                          </div>
                        </div>
                        {sponsor.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {sponsor.description}
                          </p>
                        )}
                        {sponsor.website && (
                          <a
                            href={sponsor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </main>
    </>
  );
}
