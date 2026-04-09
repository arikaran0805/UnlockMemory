import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    const { data: roleData, error: roleError } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Access denied. Admin privileges required.");
    }

    const { userId }: DeleteUserRequest = await req.json();
    if (!userId) {
      throw new Error("User ID is required");
    }

    if (userId === requestingUser.id) {
      throw new Error("You cannot delete your own account");
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Fetch user details first so we can use their email to clean up string-based references (like invitations)
    const { data: userToDelete, error: fetchError } = await adminClient.auth.admin.getUserById(userId);
    if (fetchError || !userToDelete.user) {
      throw new Error(`Could not fetch details for user ${userId}`);
    }
    const userEmail = userToDelete.user.email;

    if (userEmail) {
      try {
        const { error } = await adminClient
          .from("invitations")
          .delete()
          .eq("email", userEmail);
        if (error) {
          console.log(`Note: Could not clean invitations for ${userEmail}: ${error.message}`);
        } else {
          console.log(`Cleaned up any outstanding invitations for ${userEmail}`);
        }
      } catch (e) {
        console.log(`Note: Invitations table might not exist, skipping`);
      }
    }

    // Manually clean up all user data before deleting auth user
    // This avoids FK constraint issues
    const tablesToClean = [
      { table: "session_invalidations", column: "user_id" },
      { table: "session_invalidations", column: "created_by" },
      { table: "notification_preferences", column: "user_id" },
      { table: "moderator_notifications", column: "user_id" },
      { table: "admin_notifications", column: "admin_id" },
      { table: "admin_badge_reads", column: "user_id" },
      { table: "user_roles", column: "user_id" },
      { table: "course_assignments", column: "user_id" },
      { table: "career_assignments", column: "user_id" },
      { table: "course_enrollments", column: "user_id" },
      { table: "course_reviews", column: "user_id" },
      { table: "course_annotations", column: "author_id" },
      { table: "course_annotation_replies", column: "author_id" },
      { table: "bookmarks", column: "user_id" },
      { table: "achievements", column: "user_id" },
      { table: "certificates", column: "user_id" },
      { table: "cart_items", column: "user_id" },
      { table: "career_welcome_views", column: "user_id" },
      { table: "comment_reactions", column: "user_id" },
      { table: "comments", column: "user_id" },
      { table: "post_annotations", column: "author_id" },
      { table: "annotation_replies", column: "author_id" },
      { table: "problem_comments", column: "user_id" },
      { table: "problem_bookmarks", column: "user_id" },
      { table: "problem_reactions", column: "user_id" },
      { table: "learner_problem_progress", column: "user_id" },
      { table: "problem_submissions", column: "user_id" },
      { table: "problem_code_saves", column: "user_id" },
      { table: "predict_output_attempts", column: "user_id" },
      { table: "eliminate_wrong_attempts", column: "user_id" },
      { table: "fix_error_attempts", column: "user_id" },
      { table: "content_reports", column: "reporter_id" },
      { table: "analytics", column: "user_id" },
      { table: "lesson_time_tracking", column: "user_id" },
      { table: "course_progress", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    console.log(`Starting cleanup for user ${userId}`);

    for (const { table, column } of tablesToClean) {
      try {
        const { error } = await adminClient
          .from(table)
          .delete()
          .eq(column, userId);
        if (error) {
          console.log(`Note: Could not clean ${table}.${column}: ${error.message}`);
        }
      } catch (e) {
        console.log(`Note: Table ${table} might not exist, skipping`);
      }
    }

    // Set nullable FK references to null instead of deleting
    const columnsToNullify = [
      { table: "tags", column: "author_id" },
      { table: "posts", column: "author_id" },
      { table: "posts", column: "assigned_to" },
      { table: "posts", column: "approved_by" },
      { table: "courses", column: "author_id" },
      { table: "courses", column: "assigned_to" },
      { table: "courses", column: "default_senior_moderator" },
      { table: "careers", column: "author_id" },
      { table: "course_lessons", column: "created_by" },
      { table: "course_versions", column: "edited_by" },
      { table: "post_versions", column: "edited_by" },
      { table: "practice_problems", column: "created_by" },
      { table: "practice_skills", column: "created_by" },
      { table: "problem_mappings", column: "created_by" },
      { table: "sub_topics", column: "created_by" },
      { table: "teams", column: "created_by" },
      { table: "delete_requests", column: "requested_by" },
      { table: "delete_requests", column: "reviewed_by" },
      { table: "approval_history", column: "performed_by" },
      { table: "certificates", column: "approved_by" },
      { table: "career_assignments", column: "assigned_by" },
      { table: "course_assignments", column: "assigned_by" },
      { table: "invitations", column: "invited_by" },
    ];

    for (const { table, column } of columnsToNullify) {
      try {
        const { error } = await adminClient
          .from(table)
          .update({ [column]: null })
          .eq(column, userId);
        if (error) {
          console.log(`Note: Could not nullify ${table}.${column}: ${error.message}`);
        }
      } catch (e) {
        console.log(`Note: Table ${table} might not exist, skipping`);
      }
    }

    console.log(`Cleanup complete, now deleting auth user ${userId}`);

    // Now delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error("Auth delete error:", deleteError);
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "User deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" ? 401 : 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
