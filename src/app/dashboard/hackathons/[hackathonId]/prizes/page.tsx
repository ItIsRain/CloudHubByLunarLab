"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trophy,
  Medal,
  Award,
  Star,
  DollarSign,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { mockHackathons } from "@/lib/mock-data";
import { toast } from "sonner";

const mainPrizes = [
  {
    place: "1st Place",
    amount: 20000,
    icon: Trophy,
    color: "text-yellow-500",
    bgColor: "bg-gradient-to-br from-yellow-500/20 to-orange-500/10",
    borderColor: "border-yellow-500/30",
    team: "TBD",
  },
  {
    place: "2nd Place",
    amount: 10000,
    icon: Medal,
    color: "text-gray-400",
    bgColor: "bg-gradient-to-br from-gray-400/20 to-gray-500/10",
    borderColor: "border-gray-400/30",
    team: "TBD",
  },
  {
    place: "3rd Place",
    amount: 5000,
    icon: Award,
    color: "text-orange-600",
    bgColor: "bg-gradient-to-br from-orange-600/20 to-orange-700/10",
    borderColor: "border-orange-600/30",
    team: "TBD",
  },
];

const specialPrizes = [
  {
    name: "Best UI/UX",
    amount: 2000,
    icon: Star,
    team: "TBD",
  },
  {
    name: "Most Innovative",
    amount: 3000,
    icon: Star,
    team: "TBD",
  },
];

export default function PrizesManagementPage() {
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

  const totalPool = mainPrizes.reduce((sum, p) => sum + p.amount, 0) +
    specialPrizes.reduce((sum, p) => sum + p.amount, 0);

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
            <h1 className="font-display text-3xl font-bold">Prizes</h1>
            <p className="text-muted-foreground mt-1">
              Configure prizes and awards for winners
            </p>
          </div>
          <Button
            variant="gradient"
            onClick={() => toast.success("Prize added successfully!")}
          >
            <Plus className="h-4 w-4" />
            Add Prize
          </Button>
        </motion.div>

        {/* Total Prize Pool */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                  <DollarSign className="h-7 w-7 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Prize Pool
                  </p>
                  <p className="text-4xl font-bold font-display">
                    {formatCurrency(totalPool)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Prizes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="font-display text-xl font-bold mb-4">Main Prizes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {mainPrizes.map((prize, i) => (
              <motion.div
                key={prize.place}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <Card
                  className={cn(
                    "h-full border-2 text-center",
                    prize.borderColor
                  )}
                >
                  <CardContent className="p-6">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center",
                        prize.bgColor
                      )}
                    >
                      <prize.icon
                        className={cn("h-8 w-8", prize.color)}
                      />
                    </div>
                    <h3 className="font-display font-bold text-lg mb-1">
                      {prize.place}
                    </h3>
                    <p className="text-3xl font-bold font-display mb-3">
                      {formatCurrency(prize.amount)}
                    </p>
                    <Badge variant="muted">
                      {prize.team}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Special Prizes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-xl font-bold mb-4">
            Special Prizes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {specialPrizes.map((prize, i) => (
              <motion.div
                key={prize.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
              >
                <Card className="h-full">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <prize.icon className="h-6 w-6 text-accent" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold">
                          {prize.name}
                        </h3>
                        <p className="text-xl font-bold font-display">
                          {formatCurrency(prize.amount)}
                        </p>
                      </div>
                      <Badge variant="muted">{prize.team}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </>
  );
}
