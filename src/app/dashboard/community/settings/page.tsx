"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Upload,
  Globe,
  Shield,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockCommunities } from "@/lib/mock-data";

const community = mockCommunities[0];

export default function CommunitySettingsPage() {
  const [name, setName] = React.useState(community.name);
  const [description, setDescription] = React.useState(community.description);
  const [website, setWebsite] = React.useState(community.website || "");
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Community name is required.");
      return;
    }
    setSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success("Community settings saved successfully!");
  };

  const handleDelete = () => {
    toast.error("This action is not available in the demo.");
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              href="/dashboard/community"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Community
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <h1 className="font-display text-3xl font-bold">Community Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your community profile and preferences
            </p>
          </motion.div>

          <div className="space-y-6">
            {/* Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Community Name
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter community name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your community..."
                      rows={4}
                      className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      <Globe className="h-4 w-4 inline mr-1" />
                      Website URL
                    </label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://your-community.com"
                      type="url"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Branding */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Branding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Upload */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Community Logo
                    </label>
                    <div
                      className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        toast.info("File upload is not available in the demo.")
                      }
                    >
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">
                        Click to upload logo
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG or SVG. Max 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Cover Image Upload */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Cover Image
                    </label>
                    <div
                      className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() =>
                        toast.info("File upload is not available in the demo.")
                      }
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">
                        Click to upload cover image
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: 1200x400px. PNG or JPG. Max 5MB.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Visibility */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Visibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <label
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                        visibility === "public"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={visibility === "public"}
                        onChange={() => setVisibility("public")}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">Public</p>
                        <p className="text-sm text-muted-foreground">
                          Anyone can discover and join your community. Events are
                          visible on the explore page.
                        </p>
                      </div>
                    </label>
                    <label
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                        visibility === "private"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="radio"
                        name="visibility"
                        value="private"
                        checked={visibility === "private"}
                        onChange={() => setVisibility("private")}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium">Private</p>
                        <p className="text-sm text-muted-foreground">
                          Only invited members can access the community. Hidden
                          from explore page.
                        </p>
                      </div>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Save Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex justify-end"
            >
              <Button size="lg" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </motion.div>

            {/* Danger Zone */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete a community, there is no going back. This
                    will permanently delete your community, all events, and
                    member data.
                  </p>
                  <Button variant="destructive" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Community
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}
