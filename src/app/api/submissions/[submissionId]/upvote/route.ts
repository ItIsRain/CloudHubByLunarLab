import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify submission exists
    const { data: submission } = await supabase
      .from("submissions")
      .select("id, status")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Only allow upvoting submitted (public) submissions
    if (submission.status !== "submitted") {
      return NextResponse.json(
        { error: "Can only upvote submitted projects" },
        { status: 400 }
      );
    }

    // Check if already upvoted
    const { data: existing } = await supabase
      .from("submission_upvotes")
      .select("id")
      .eq("submission_id", submissionId)
      .eq("user_id", auth.userId)
      .maybeSingle();

    let upvoted: boolean;

    if (existing) {
      // Remove upvote
      const { error } = await supabase
        .from("submission_upvotes")
        .delete()
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: "Failed to remove upvote" }, { status: 400 });
      }
      upvoted = false;
    } else {
      // Add upvote
      const { error } = await supabase
        .from("submission_upvotes")
        .insert({
          submission_id: submissionId,
          user_id: auth.userId,
        });

      if (error) {
        // Handle race condition: unique constraint violation means already upvoted
        if (error.code === "23505") {
          return NextResponse.json({ data: { upvoted: true, upvotes: 0 } });
        }
        return NextResponse.json({ error: "Failed to upvote" }, { status: 400 });
      }
      upvoted = true;
    }

    // Recalculate upvote count from source of truth
    const { count } = await supabase
      .from("submission_upvotes")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", submissionId);

    const upvoteCount = count || 0;

    // Update the denormalized counter on the submission
    await supabase
      .from("submissions")
      .update({ upvotes: upvoteCount })
      .eq("id", submissionId);

    return NextResponse.json({
      data: { upvoted, upvotes: upvoteCount },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;

    // Dual auth: session cookies OR API key (also allows unauthenticated)
    const auth = await authenticateRequest(request);

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Get upvote count
    const { count } = await supabase
      .from("submission_upvotes")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", submissionId);

    // Check if the authenticated user has upvoted
    let isUpvoted = false;
    if (auth.type !== "unauthenticated") {
      const { data: existing } = await supabase
        .from("submission_upvotes")
        .select("id")
        .eq("submission_id", submissionId)
        .eq("user_id", auth.userId)
        .maybeSingle();
      isUpvoted = !!existing;
    }

    return NextResponse.json({
      data: { upvoted: isUpvoted, upvotes: count || 0 },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
