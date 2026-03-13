"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Globe,
  Lock,
  ArrowRight,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials, formatNumber } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import {
  useCommunities,
  useJoinCommunity,
} from "@/hooks/use-communities";
import type { Community } from "@/lib/types";

export default function CommunitiesPage() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useCommunities({
    search: debouncedSearch || undefined,
    page,
    pageSize: 12,
  });

  const joinMutation = useJoinCommunity();

  const communities = data?.data || [];
  const totalPages = data?.totalPages || 0;

  const handleJoin = async (communityId: string) => {
    if (!user) {
      toast.error("Please log in to join a community");
      return;
    }
    try {
      await joinMutation.mutateAsync(communityId);
      toast.success("Successfully joined community!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join community");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="pt-24 pb-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <Badge variant="gradient" className="mb-4">
              <Users className="mr-1.5 h-3 w-3" />
              Communities
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4">
              Find Your <span className="gradient-text">Community</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
              Connect with like-minded builders, designers, and innovators.
              Join communities that share your passions.
            </p>
          </motion.div>

          {/* Search & Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-3 mb-8"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search communities..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-input bg-background px-10 py-2.5 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {user && (
              <Button asChild>
                <Link href="/dashboard/community">
                  <Plus className="h-4 w-4 mr-2" />
                  My Community
                </Link>
              </Button>
            )}
          </motion.div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Communities Grid */}
          {!isLoading && communities.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {communities.map((community, i) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  index={i}
                  onJoin={handleJoin}
                  isJoining={joinMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && communities.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">
                No communities found
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {search
                  ? "Try adjusting your search terms."
                  : "Be the first to create a community!"}
              </p>
            </motion.div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2 mt-10"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function CommunityCard({
  community,
  index,
  onJoin,
  isJoining,
}: {
  community: Community;
  index: number;
  onJoin: (id: string) => void;
  isJoining: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Card hover className="group h-full overflow-hidden">
        {/* Cover */}
        <div className="relative h-32 bg-gradient-to-r from-primary/20 to-accent/20 overflow-hidden">
          {community.coverImage ? (
            <Image
              src={community.coverImage}
              alt={community.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 grid-bg opacity-40" />
          )}
          <div className="absolute top-3 right-3">
            <Badge
              variant={community.visibility === "public" ? "secondary" : "outline"}
              className="backdrop-blur-sm text-xs"
            >
              {community.visibility === "public" ? (
                <Globe className="h-3 w-3 mr-1" />
              ) : (
                <Lock className="h-3 w-3 mr-1" />
              )}
              {community.visibility}
            </Badge>
          </div>
        </div>

        <CardContent className="p-5">
          {/* Logo + Name */}
          <div className="flex items-start gap-3 -mt-10 mb-3">
            <div className="h-14 w-14 rounded-xl bg-card border-2 border-card shadow-lg flex items-center justify-center shrink-0 overflow-hidden">
              {community.logo ? (
                <Image
                  src={community.logo}
                  alt={community.name}
                  width={56}
                  height={56}
                  className="object-cover"
                />
              ) : (
                <span className="font-display text-xl font-bold text-primary">
                  {community.name.charAt(0)}
                </span>
              )}
            </div>
          </div>

          <Link href={`/communities/${community.slug}`}>
            <h3 className="font-display text-lg font-bold leading-tight line-clamp-1 hover:text-primary transition-colors">
              {community.name}
            </h3>
          </Link>

          {community.description && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {community.description}
            </p>
          )}

          {/* Tags */}
          {community.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {community.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="muted" className="text-[10px] px-1.5">
                  {tag}
                </Badge>
              ))}
              {community.tags.length > 3 && (
                <Badge variant="muted" className="text-[10px] px-1.5">
                  +{community.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {formatNumber(community.memberCount)}
              </span>
              {community.eventCount > 0 && (
                <span>{community.eventCount} events</span>
              )}
            </div>

            {community.organizer && (
              <Avatar size="xs">
                <AvatarImage
                  src={community.organizer.avatar}
                  alt={community.organizer.name}
                />
                <AvatarFallback>
                  {getInitials(community.organizer.name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>

          {/* Join button */}
          <div className="mt-4">
            {community.isMember ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/communities/${community.slug}`}>
                  View Community <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full"
                onClick={() => onJoin(community.id)}
                disabled={isJoining}
              >
                {isJoining ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3 w-3 mr-1" />
                )}
                Join Community
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
