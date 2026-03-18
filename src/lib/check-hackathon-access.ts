import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type HackathonRole = "owner" | "admin" | "editor" | "viewer";

interface AccessResult {
  hasAccess: boolean;
  role: HackathonRole | null;
}

/**
 * Returns true if the role can edit (owner, admin, or editor).
 */
export function canEdit(role: HackathonRole | null): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

/**
 * Returns true if the role can manage (owner or admin only).
 */
export function canManage(role: HackathonRole | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check whether a user has access to a hackathon.
 *
 * - Owner (organizer_id) always has full access.
 * - Collaborators are checked against the `hackathon_collaborators` table
 *   using the admin client (to bypass RLS). Only collaborators with
 *   `accepted_at` set are considered active.
 * - If `requiredRoles` is provided, the collaborator's role must be in that list.
 *
 * @param supabase - A supabase client used to fetch the hackathon's organizer_id.
 * @param hackathonId - The hackathon UUID.
 * @param userId - The authenticated user's ID.
 * @param requiredRoles - Optional list of roles that grant access.
 */
export async function checkHackathonAccess(
  supabase: SupabaseClient,
  hackathonId: string,
  userId: string,
  requiredRoles?: HackathonRole[]
): Promise<AccessResult> {
  // Check if owner
  const { data: hackathon } = await supabase
    .from("hackathons")
    .select("organizer_id")
    .eq("id", hackathonId)
    .single();

  if (!hackathon) return { hasAccess: false, role: null };

  if (hackathon.organizer_id === userId) {
    return { hasAccess: true, role: "owner" };
  }

  // Check collaborators table using admin client to bypass RLS
  const adminSb = getSupabaseAdminClient();
  const { data: collab } = await adminSb
    .from("hackathon_collaborators")
    .select("role, accepted_at")
    .eq("hackathon_id", hackathonId)
    .eq("user_id", userId)
    .not("accepted_at", "is", null)
    .single();

  if (!collab) return { hasAccess: false, role: null };

  const role = collab.role as HackathonRole;

  if (requiredRoles && !requiredRoles.includes(role)) {
    return { hasAccess: false, role };
  }

  return { hasAccess: true, role };
}
