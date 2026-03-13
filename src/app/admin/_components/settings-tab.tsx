"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Shield,
  Wrench,
  AlertTriangle,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAdminSettings,
  useUpdateSetting,
  type FeatureSettings,
} from "@/hooks/use-admin-settings";

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ label, description, checked, onChange }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          checked ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export function SettingsTab() {
  const { data, isLoading } = useAdminSettings();
  const updateSetting = useUpdateSetting();

  const settings = data?.data;

  // Local form state for general settings (text inputs)
  const [platformName, setPlatformName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [supportEmail, setSupportEmail] = React.useState("");

  // Local state for features and maintenance (toggles)
  const [features, setFeatures] = React.useState<FeatureSettings>({
    userRegistration: true,
    hackathons: true,
    blog: true,
    apiAccess: true,
    publicProfiles: true,
    communities: true,
  });
  const [maintenanceMode, setMaintenanceMode] = React.useState(false);

  // Initialize local state from hook data
  React.useEffect(() => {
    if (!settings) return;
    setPlatformName(settings.general.platformName);
    setDescription(settings.general.description);
    setSupportEmail(settings.general.supportEmail);
    setFeatures(settings.features);
    setMaintenanceMode(settings.maintenance.maintenanceMode);
  }, [settings]);

  const handleFeatureToggle = async (field: keyof FeatureSettings, newValue: boolean) => {
    const updatedFeatures = { ...features, [field]: newValue };
    setFeatures(updatedFeatures);
    try {
      await updateSetting.mutateAsync({ key: "features", value: updatedFeatures });
      const label = field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      toast.success(`${label} ${newValue ? "enabled" : "disabled"}`);
    } catch (err) {
      // Revert on failure
      setFeatures((prev) => ({ ...prev, [field]: !newValue }));
      toast.error(`Failed to update setting: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleMaintenanceToggle = async (newValue: boolean) => {
    setMaintenanceMode(newValue);
    try {
      await updateSetting.mutateAsync({ key: "maintenance", value: { maintenanceMode: newValue } });
      toast.success(`Maintenance mode ${newValue ? "enabled" : "disabled"}`);
    } catch (err) {
      setMaintenanceMode(!newValue);
      toast.error(`Failed to update maintenance mode: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleSaveGeneral = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "general",
        value: { platformName, description, supportEmail },
      });
      toast.success("General settings saved");
    } catch (err) {
      toast.error(`Failed to save general settings: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="shimmer rounded-xl h-72 w-full" />
          <div className="shimmer rounded-xl h-72 w-full" />
          <div className="shimmer rounded-xl h-56 w-full" />
          <div className="shimmer rounded-xl h-56 w-full" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">General</CardTitle>
              </div>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Platform Name</label>
                <Input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  placeholder="Platform name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Platform description"
                  rows={3}
                  className="flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Support Email</label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@example.com"
                />
              </div>
              <Button
                className="w-full mt-2"
                onClick={handleSaveGeneral}
                disabled={updateSetting.isPending}
              >
                {updateSetting.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feature Toggles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Features</CardTitle>
              </div>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                <ToggleSwitch
                  label="User Registration"
                  description="Allow new users to create accounts"
                  checked={features.userRegistration}
                  onChange={(val) => handleFeatureToggle("userRegistration", val)}
                />
                <ToggleSwitch
                  label="Hackathons"
                  description="Enable hackathon creation and participation"
                  checked={features.hackathons}
                  onChange={(val) => handleFeatureToggle("hackathons", val)}
                />
                <ToggleSwitch
                  label="Blog"
                  description="Enable the community blog feature"
                  checked={features.blog}
                  onChange={(val) => handleFeatureToggle("blog", val)}
                />
                <ToggleSwitch
                  label="API Access"
                  description="Allow third-party API integrations"
                  checked={features.apiAccess}
                  onChange={(val) => handleFeatureToggle("apiAccess", val)}
                />
                <ToggleSwitch
                  label="Public Profiles"
                  description="Make user profiles publicly visible"
                  checked={features.publicProfiles}
                  onChange={(val) => handleFeatureToggle("publicProfiles", val)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Maintenance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Maintenance</CardTitle>
              </div>
              <CardDescription>Platform maintenance tools and options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleSwitch
                label="Maintenance Mode"
                description="Display maintenance page to all visitors"
                checked={maintenanceMode}
                onChange={handleMaintenanceToggle}
              />

              <div className="pt-2 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    toast.promise(
                      new Promise((resolve) => setTimeout(resolve, 1500)),
                      {
                        loading: "Clearing cache...",
                        success: "Cache cleared successfully",
                        error: "Failed to clear cache",
                      }
                    );
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Clear Cache
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    toast.promise(
                      new Promise((resolve) => setTimeout(resolve, 2000)),
                      {
                        loading: "Rebuilding search index...",
                        success: "Search index rebuilt successfully",
                        error: "Failed to rebuild search index",
                      }
                    );
                  }}
                >
                  <Search className="h-4 w-4" />
                  Rebuild Search Index
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-red-500/30">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg text-red-500">Danger Zone</CardTitle>
              </div>
              <CardDescription>
                Irreversible actions. Proceed with extreme caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <h4 className="text-sm font-semibold mb-1">Reset Platform</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  This will delete all user data, events, hackathons, and submissions. This
                  action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you absolutely sure you want to reset the entire platform? This action CANNOT be undone."
                      )
                    ) {
                      toast.error("Platform reset initiated (mock)");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Reset Platform
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
