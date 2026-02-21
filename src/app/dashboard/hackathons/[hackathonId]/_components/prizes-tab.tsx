"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Trophy, DollarSign, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn, formatCurrency } from "@/lib/utils";
import type { Hackathon, Prize } from "@/lib/types";
import { useUpdateHackathon } from "@/hooks/use-hackathons";
import { toast } from "sonner";

interface PrizesTabProps {
  hackathon: Hackathon;
  hackathonId: string;
}

const selectClasses =
  "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none";

const textareaClasses =
  "flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]";

function getPlaceLabel(place: number | "special"): string {
  if (place === "special") return "Special Prize";
  if (place === 1) return "1st Place";
  if (place === 2) return "2nd Place";
  if (place === 3) return "3rd Place";
  return `${place}th Place`;
}

function getPlaceBorderColor(place: number | "special"): string {
  if (place === 1) return "border-yellow-500/50";
  if (place === 2) return "border-zinc-400/50";
  if (place === 3) return "border-amber-700/50";
  return "border-border";
}

function getPlaceIconBg(place: number | "special"): string {
  if (place === 1) return "bg-gradient-to-br from-yellow-400 to-yellow-600";
  if (place === 2) return "bg-gradient-to-br from-zinc-300 to-zinc-500";
  if (place === 3) return "bg-gradient-to-br from-amber-600 to-amber-800";
  return "bg-gradient-to-br from-primary/80 to-primary";
}

export function PrizesTab({ hackathon, hackathonId }: PrizesTabProps) {
  const updateHackathon = useUpdateHackathon();
  const [showForm, setShowForm] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    place: "" as string,
    value: "",
    currency: "USD",
    type: "cash" as Prize["type"],
    description: "",
  });

  const prizes: Prize[] = hackathon.prizes ?? [];
  const mainPrizes = prizes.filter((p) => typeof p.place === "number");
  const specialPrizes = prizes.filter((p) => p.place === "special");

  const computedTotal = prizes.reduce((sum, p) => sum + (p.value || 0), 0);
  const prizeCurrency = prizes[0]?.currency || "USD";

  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Prize name is required.");
      return;
    }

    const place: number | "special" =
      formData.place === "special" ? "special" : Number(formData.place) || 1;

    const newPrize: Prize = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      place,
      value: Number(formData.value) || 0,
      currency: formData.currency || "USD",
      type: formData.type,
      description: formData.description.trim() || undefined,
    };

    const updatedPrizes = [...prizes, newPrize];
    const newTotal = updatedPrizes.reduce((sum, p) => sum + (p.value || 0), 0);

    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        prizes: updatedPrizes,
        totalPrizePool: newTotal,
      });
      toast.success(`Prize "${formData.name}" added!`);
      setFormData({
        name: "",
        place: "",
        value: "",
        currency: "USD",
        type: "cash",
        description: "",
      });
      setShowForm(false);
    } catch {
      toast.error("Failed to add prize.");
    }
  };

  const handleRemovePrize = async (prizeId: string) => {
    const updatedPrizes = prizes.filter((p) => p.id !== prizeId);
    const newTotal = updatedPrizes.reduce((sum, p) => sum + (p.value || 0), 0);
    try {
      await updateHackathon.mutateAsync({
        id: hackathonId,
        prizes: updatedPrizes,
        totalPrizePool: newTotal,
      });
      toast.success("Prize removed.");
    } catch {
      toast.error("Failed to remove prize.");
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
          <h2 className="font-display text-2xl font-bold">Prizes</h2>
          <p className="text-sm text-muted-foreground">
            Manage hackathon prizes and rewards
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Prize
        </Button>
      </motion.div>

      {/* Total Prize Pool Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Prize Pool</p>
              <p className="text-3xl font-bold font-display">
                {formatCurrency(computedTotal, prizeCurrency)}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Prize Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Prize</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPrize} className="space-y-4">
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
                      placeholder="Grand Prize, Best UI, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Place (number or &quot;special&quot;)
                    </label>
                    <Input
                      value={formData.place}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          place: e.target.value,
                        }))
                      }
                      placeholder='1, 2, 3 or "special"'
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Value</label>
                    <Input
                      type="number"
                      value={formData.value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                      placeholder="5000"
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <Input
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      placeholder="USD"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          type: e.target.value as Prize["type"],
                        }))
                      }
                      className={selectClasses}
                    >
                      <option value="cash">Cash</option>
                      <option value="credits">Credits</option>
                      <option value="swag">Swag</option>
                      <option value="incubation">Incubation</option>
                      <option value="other">Other</option>
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
                    placeholder="Details about this prize..."
                    className={textareaClasses}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={updateHackathon.isPending}
                  >
                    {updateHackathon.isPending ? "Adding..." : "Add Prize"}
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

      {/* Prizes Grid */}
      {prizes.length > 0 ? (
        <div className="space-y-8">
          {/* Main Prizes */}
          {mainPrizes.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold">
                Main Prizes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mainPrizes
                  .sort((a, b) => (a.place as number) - (b.place as number))
                  .map((prize, i) => (
                    <motion.div
                      key={prize.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card
                        className={cn(
                          "group hover:shadow-md transition-all duration-200 border-2",
                          getPlaceBorderColor(prize.place)
                        )}
                      >
                        <CardContent className="p-5 text-center">
                          <div className="flex justify-end mb-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemovePrize(prize.id)}
                              disabled={updateHackathon.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                          <div
                            className={cn(
                              "w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center",
                              getPlaceIconBg(prize.place)
                            )}
                          >
                            <Trophy className="h-6 w-6 text-white" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">
                            {getPlaceLabel(prize.place)}
                          </p>
                          <h3 className="font-display font-bold text-lg mb-1">
                            {prize.name}
                          </h3>
                          <p className="text-2xl font-bold font-display text-primary mb-2">
                            {formatCurrency(prize.value, prize.currency)}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {prize.type}
                          </Badge>
                          {prize.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {prize.description}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Special Prizes */}
          {specialPrizes.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Special Prizes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specialPrizes.map((prize, i) => (
                  <motion.div
                    key={prize.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className="group hover:shadow-md transition-all duration-200">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Gift className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {prize.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-sm font-bold text-primary">
                                {formatCurrency(prize.value, prize.currency)}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {prize.type}
                              </Badge>
                            </div>
                            {prize.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {prize.description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => handleRemovePrize(prize.id)}
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
            </div>
          )}
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
                <Trophy className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">
                No Prizes Yet
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Add prizes to motivate participants and reward outstanding
                submissions.
              </p>
              <Button
                variant="gradient"
                onClick={() => setShowForm(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Prize
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
