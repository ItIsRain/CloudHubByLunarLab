"use client";

import * as React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Trash2, ExternalLink, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import type { Hackathon, Sponsor } from "@/lib/types";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";

interface SponsorsTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const tierOrder: Record<string, number> = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3,
  community: 4,
};

const tierBadgeVariant: Record<string, "gradient" | "warning" | "muted" | "secondary" | "success"> = {
  platinum: "gradient",
  gold: "warning",
  silver: "muted",
  bronze: "secondary",
  community: "success",
};

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]";

export function SponsorsTab({ hackathon, hackathonId }: SponsorsTabProps) {
  const updateHackathon = useUpdateHackathon();
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    logo: "",
    website: "",
    tier: "silver" as Sponsor["tier"],
    description: "",
  });

  const sponsors: Sponsor[] = hackathon.sponsors ?? [];

  // Group sponsors by tier
  const groupedSponsors = React.useMemo(() => {
    const groups: Record<string, Sponsor[]> = {};
    const sorted = [...sponsors].sort(
      (a, b) => (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99)
    );
    for (const sponsor of sorted) {
      if (!groups[sponsor.tier]) groups[sponsor.tier] = [];
      groups[sponsor.tier].push(sponsor);
    }
    return groups;
  }, [sponsors]);

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Sponsor name is required.");
      return;
    }

    const newSponsor: Sponsor = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      logo: formData.logo.trim(),
      website: formData.website.trim() || undefined,
      tier: formData.tier,
      description: formData.description.trim() || undefined,
    };

    const updatedSponsors = [...sponsors, newSponsor];

    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        sponsors: updatedSponsors,
      });
      toast.success(`${formData.name} added as a sponsor!`);
      setFormData({ name: "", logo: "", website: "", tier: "silver", description: "" });
      setShowForm(false);
    } catch {
      toast.error("Failed to add sponsor.");
    }
  };

  const handleRemoveSponsor = async (sponsorId: string) => {
    const updatedSponsors = sponsors.filter((s) => s.id !== sponsorId);
    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        sponsors: updatedSponsors,
      });
      toast.success("Sponsor removed.");
    } catch {
      toast.error("Failed to remove sponsor.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h2 className="font-display text-2xl font-bold">Sponsors</h2>
          <p className="text-sm text-muted-foreground">
            Manage hackathon sponsors and partnerships
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Sponsor
        </Button>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Handshake className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {sponsors.length}
                </p>
                <p className="text-xs text-muted-foreground">Total Sponsors</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <span className="text-yellow-500 font-bold text-sm">$</span>
              </div>
              <div>
                <p className="text-2xl font-bold font-display">
                  {formatCurrency(
                    (hackathon.prizes ?? []).reduce((sum, p) => sum + (p.value || 0), 0),
                    hackathon.prizes?.[0]?.currency || "USD"
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total Prize Pool
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Sponsor Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Sponsor</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSponsor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Sponsor name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo URL</label>
                    <Input
                      value={formData.logo}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          logo: e.target.value,
                        }))
                      }
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      value={formData.website}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tier</label>
                    <select
                      value={formData.tier}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          tier: e.target.value as Sponsor["tier"],
                        }))
                      }
                      className={selectClasses}
                    >
                      <option value="platinum">Platinum</option>
                      <option value="gold">Gold</option>
                      <option value="silver">Silver</option>
                      <option value="bronze">Bronze</option>
                      <option value="community">Community</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Brief description of the sponsor..."
                    className={textareaClasses}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={updateHackathon.isPending}
                  >
                    {updateHackathon.isPending ? "Adding..." : "Add Sponsor"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Sponsors by Tier */}
      {sponsors.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedSponsors)
            .sort(([a], [b]) => (tierOrder[a] ?? 99) - (tierOrder[b] ?? 99))
            .map(([tier, tierSponsors]) => (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={tierBadgeVariant[tier] ?? "muted"}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {tierSponsors.length} sponsor
                    {tierSponsors.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tierSponsors.map((sponsor, i) => (
                    <motion.div
                      key={sponsor.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="group hover:shadow-md transition-all duration-200">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 overflow-hidden">
                              {sponsor.logo ? (
                                <Image
                                  src={sponsor.logo}
                                  alt={sponsor.name}
                                  width={48}
                                  height={48}
                                  className="object-contain"
                                />
                              ) : (
                                <span className="text-lg font-bold text-muted-foreground">
                                  {sponsor.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium truncate">
                                  {sponsor.name}
                                </h3>
                                <Badge
                                  variant={tierBadgeVariant[sponsor.tier] ?? "muted"}
                                  className="text-[10px] px-1.5 py-0 shrink-0"
                                >
                                  {sponsor.tier}
                                </Badge>
                              </div>
                              {sponsor.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {sponsor.description}
                                </p>
                              )}
                              {sponsor.website && (
                                <a
                                  href={sponsor.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => handleRemoveSponsor(sponsor.id)}
                              disabled={updateHackathon.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
        </div>
      ) : (
        /* Empty State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Handshake className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                No Sponsors Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add sponsors to showcase your hackathon partners and their
                contributions.
              </p>
              <Button
                variant="gradient"
                onClick={() => setShowForm(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Sponsor
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
