import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // List all users, paginate through them
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
    let deletedCount = 0;
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data: { users }, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error("Error listing users:", error.message);
        break;
      }

      if (!users || users.length === 0) break;

      for (const user of users) {
        // Skip confirmed users
        if (user.email_confirmed_at) continue;

        // Check if created more than 24 hours ago
        if (user.created_at && user.created_at < cutoff) {
          console.log(`Deleting unverified account: ${user.id} (created ${user.created_at})`);

          // Clean up profile data first
          await adminClient.from("profiles").delete().eq("id", user.id);

          // Delete the auth user
          const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.error(`Failed to delete user ${user.id}:`, deleteError.message);
          } else {
            deletedCount++;
          }
        }
      }

      if (users.length < perPage) break;
      page++;
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} unverified accounts.`);

    return new Response(
      JSON.stringify({ success: true, deleted: deletedCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
