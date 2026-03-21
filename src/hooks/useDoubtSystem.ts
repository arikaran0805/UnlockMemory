import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DoubtSourceContext {
  source_type: "lesson" | "post" | "quiz" | "practice" | "bookmark" | "course";
  source_id: string;
  source_title: string;
  source_url?: string;
  course_id?: string;
  lesson_id?: string;
  post_id?: string;
  quiz_id?: string;
  practice_id?: string;
}

export interface DoubtThread {
  id: string;
  conversation_thread_id: string | null;
  learner_user_id: string;
  source_type: string;
  source_id: string | null;
  source_title: string | null;
  source_url: string | null;
  course_id: string | null;
  lesson_id: string | null;
  post_id: string | null;
  routed_mode: string;
  assigned_user_id: string | null;
  assigned_team_id: string | null;
  current_owner_role: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_user_name?: string;
  learner_name?: string;
  source_course_name?: string;
}

interface ResolvedOwner {
  user_id: string;
  user_name: string;
  role: "moderator" | "senior_moderator" | "super_moderator";
  team_id?: string;
  routed_mode: string;
}

/**
 * Resolves the owner for a doubt based on source context.
 * Follows hierarchy: direct owner → senior moderator → super moderator → fallback
 */
async function resolveOwner(context: DoubtSourceContext): Promise<ResolvedOwner | null> {
  const { course_id, post_id, source_type } = context;

  // 1. Try course-level assignment (direct owner)
  if (course_id) {
    // Check default_senior_moderator on the course
    const { data: course } = await supabase
      .from("courses")
      .select("assigned_to, default_senior_moderator, author_id")
      .eq("id", course_id)
      .maybeSingle();

    if (course) {
      // Try assigned_to first (direct moderator)
      if (course.assigned_to) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", course.assigned_to)
          .maybeSingle();
        if (profile) {
          return {
            user_id: profile.id,
            user_name: profile.full_name || "Moderator",
            role: "moderator",
            routed_mode: "direct_owner",
          };
        }
      }

      // Try default_senior_moderator
      if (course.default_senior_moderator) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", course.default_senior_moderator)
          .maybeSingle();
        if (profile) {
          return {
            user_id: profile.id,
            user_name: profile.full_name || "Senior Moderator",
            role: "senior_moderator",
            routed_mode: "team_queue",
          };
        }
      }

      // Try author_id
      if (course.author_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", course.author_id)
          .maybeSingle();
        if (profile) {
          return {
            user_id: profile.id,
            user_name: profile.full_name || "Author",
            role: "moderator",
            routed_mode: "direct_owner",
          };
        }
      }
    }
  }

  // 2. Try post-level assignment
  if (post_id || source_type === "post") {
    const pid = post_id || context.source_id;
    const { data: post } = await supabase
      .from("posts")
      .select("author_id, category_id")
      .eq("id", pid)
      .maybeSingle();

    if (post?.author_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", post.author_id)
        .maybeSingle();
      if (profile) {
        return {
          user_id: profile.id,
          user_name: profile.full_name || "Author",
          role: "moderator",
          routed_mode: "direct_owner",
        };
      }
    }

    // If post has a category_id (course), try that course's owner
    if (post?.category_id && !course_id) {
      const resolved = await resolveOwner({ ...context, course_id: post.category_id });
      if (resolved) return resolved;
    }
  }

  // 3. Fallback: find any super moderator
  const { data: superMods } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "super_moderator")
    .limit(1);

  if (superMods && superMods.length > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", superMods[0].user_id)
      .maybeSingle();
    if (profile) {
      return {
        user_id: profile.id,
        user_name: profile.full_name || "Super Moderator",
        role: "super_moderator",
        routed_mode: "fallback_queue",
      };
    }
  }

  // 4. Fallback: find any admin
  const { data: admins } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1);

  if (admins && admins.length > 0) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", admins[0].user_id)
      .maybeSingle();
    if (profile) {
      return {
        user_id: profile.id,
        user_name: profile.full_name || "Admin",
        role: "senior_moderator",
        routed_mode: "fallback_queue",
      };
    }
  }

  return null;
}

export function useDoubtSystem(userId: string | undefined) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myDoubts, setMyDoubts] = useState<DoubtThread[]>([]);
  const [isLoadingDoubts, setIsLoadingDoubts] = useState(false);

  /**
   * Submit a doubt: auto-route, create thread, link to messaging, return connection info
   */
  const submitDoubt = useCallback(async (
    context: DoubtSourceContext,
    messageText: string
  ): Promise<{ connectionId: string; doubtThreadId: string } | null> => {
    if (!userId || !messageText.trim()) return null;
    setIsSubmitting(true);

    try {
      // 1. Check for existing open doubt on same source
      const { data: existingDoubt } = await supabase
        .from("doubt_threads")
        .select("id, conversation_thread_id")
        .eq("learner_user_id", userId)
        .eq("source_type", context.source_type)
        .eq("source_id", context.source_id)
        .in("status", ["open", "assigned", "in_progress", "awaiting_assignment"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingDoubt) {
        // Reuse existing thread - find the connection and add message
        const connectionId = await findConnectionForDoubt(existingDoubt.id, userId);
        if (connectionId) {
          toast.info("Continuing your existing doubt thread");
          return { connectionId, doubtThreadId: existingDoubt.id };
        }
      }

      // 2. Resolve owner
      const owner = await resolveOwner(context);
      if (!owner) {
        toast.error("Could not find a mentor to route your doubt to. Please try again.");
        return null;
      }

      // 3. Ensure team_connection exists between learner and owner
      let { data: connection } = await supabase
        .from("team_connections")
        .select("id")
        .eq("learner_id", userId)
        .eq("connected_user_id", owner.user_id)
        .eq("status", "active")
        .maybeSingle();

      if (!connection) {
        // Determine role label
        const roleLabel = owner.role === "senior_moderator" ? "Senior Moderator"
          : owner.role === "super_moderator" ? "Super Moderator"
          : "Moderator";

        const { data: newConn } = await supabase
          .from("team_connections")
          .insert({
            learner_id: userId,
            connected_user_id: owner.user_id,
            display_name: owner.user_name,
            role_label: roleLabel,
            connection_type: "doubt_auto",
            status: "active",
          })
          .select("id")
          .single();
        connection = newConn;
      }

      if (!connection) {
        toast.error("Failed to create connection");
        return null;
      }

      // 4. Ensure conversation exists
      let { data: convo } = await supabase
        .from("conversations")
        .select("id")
        .eq("learner_id", userId)
        .eq("connection_id", connection.id)
        .maybeSingle();

      if (!convo) {
        const { data: newConvo } = await supabase
          .from("conversations")
          .insert({
            learner_id: userId,
            connection_id: connection.id,
            conversation_type: "doubt",
          })
          .select("id")
          .single();
        convo = newConvo;
      }

      if (!convo) {
        toast.error("Failed to create conversation");
        return null;
      }

      // 5. Ensure conversation_thread exists for staff side
      const isSenior = owner.role === "senior_moderator" || owner.role === "super_moderator";
      
      let { data: convThread } = await supabase
        .from("conversation_threads")
        .select("id")
        .eq("learner_user_id", userId)
        .or(`assigned_moderator_user_id.eq.${owner.user_id},assigned_senior_moderator_user_id.eq.${owner.user_id}`)
        .maybeSingle();

      if (!convThread) {
        const { data: newThread } = await supabase
          .from("conversation_threads")
          .insert({
            learner_user_id: userId,
            assigned_moderator_user_id: isSenior ? null : owner.user_id,
            assigned_senior_moderator_user_id: isSenior ? owner.user_id : null,
            current_owner_role: isSenior ? "senior_moderator" : "moderator",
            current_status: "new",
            routing_type: isSenior ? "team_senior_moderator" : "direct_moderator",
            post_id: context.post_id || null,
            team_id: owner.team_id || null,
          })
          .select("id")
          .single();
        convThread = newThread;
      }

      // 6. Create doubt_thread
      const { data: doubtThread } = await supabase
        .from("doubt_threads")
        .insert({
          conversation_thread_id: convThread?.id || null,
          learner_user_id: userId,
          source_type: context.source_type,
          source_id: context.source_id,
          source_title: context.source_title,
          source_url: context.source_url || window.location.pathname,
          course_id: context.course_id || null,
          lesson_id: context.lesson_id || null,
          post_id: context.post_id || null,
          quiz_id: context.quiz_id || null,
          practice_id: context.practice_id || null,
          routed_mode: owner.routed_mode,
          assigned_user_id: owner.user_id,
          current_owner_role: owner.role,
          status: "open",
          priority: "medium",
        })
        .select("id")
        .single();

      if (!doubtThread) {
        toast.error("Failed to create doubt thread");
        return null;
      }

      // 7. Create doubt assignment record
      await supabase.from("doubt_assignments").insert({
        doubt_thread_id: doubtThread.id,
        to_user_id: owner.user_id,
        to_role: owner.role,
        assignment_type: "initial",
        note: `Auto-routed via ${owner.routed_mode}`,
        created_by: userId,
      });

      // 8. Create doubt event
      await supabase.from("doubt_events").insert({
        doubt_thread_id: doubtThread.id,
        event_type: "created",
        actor_id: userId,
        metadata: {
          source_type: context.source_type,
          source_title: context.source_title,
          routed_to: owner.user_name,
          routed_mode: owner.routed_mode,
        },
      });

      // 9. Send the actual message in conversation_messages
      const contextPrefix = `📚 *Doubt from ${context.source_type}: ${context.source_title}*\n\n`;
      const fullMessage = contextPrefix + messageText;

      await supabase.from("conversation_messages").insert({
        conversation_id: convo.id,
        sender_type: "learner",
        sender_id: userId,
        message_text: fullMessage,
        message_type: "text",
        delivery_status: "sent",
      });

      // Update conversation preview
      const now = new Date().toISOString();
      await supabase.from("conversations").update({
        last_message_preview: messageText.slice(0, 100),
        last_message_at: now,
      }).eq("id", convo.id);

      await supabase.from("team_connections").update({
        last_message_at: now,
      }).eq("id", connection.id);

      // 10. Sync to thread_messages for moderator inbox
      if (convThread) {
        await supabase.from("thread_messages").insert({
          thread_id: convThread.id,
          sender_user_id: userId,
          sender_role: "learner",
          message_content: fullMessage,
          message_type: "normal",
          is_visible_to_learner: true,
        });

        await supabase.from("conversation_threads").update({
          updated_at: now,
          current_status: "open",
        }).eq("id", convThread.id);
      }

      toast.success("Your doubt has been sent to " + owner.user_name);

      return { connectionId: connection.id, doubtThreadId: doubtThread.id };
    } catch (err) {
      console.error("Doubt submission error:", err);
      toast.error("Something went wrong. Please try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  /**
   * Fetch learner's doubt threads
   */
  const fetchMyDoubts = useCallback(async (statusFilter?: string) => {
    if (!userId) return;
    setIsLoadingDoubts(true);

    try {
      let query = supabase
        .from("doubt_threads")
        .select("*")
        .eq("learner_user_id", userId)
        .order("updated_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        // Fetch assigned user names
        const userIds = [...new Set(data.map((d: any) => d.assigned_user_id).filter(Boolean))];
        const { data: profiles } = userIds.length > 0
          ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
          : { data: [] };

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

        setMyDoubts(data.map((d: any) => ({
          ...d,
          assigned_user_name: profileMap.get(d.assigned_user_id) || undefined,
        })));
      } else {
        setMyDoubts([]);
      }
    } finally {
      setIsLoadingDoubts(false);
    }
  }, [userId]);

  /**
   * Route a doubt without sending a message - just create connection and open chat
   */
  const routeDoubt = useCallback(async (
    context: DoubtSourceContext
  ): Promise<{ connectionId: string } | null> => {
    if (!userId) return null;
    setIsSubmitting(true);

    try {
      // 1. Resolve owner
      const owner = await resolveOwner(context);
      if (!owner) {
        toast.error("Could not find a mentor to route your doubt to.");
        return null;
      }

      // 2. Ensure team_connection exists
      let { data: connection } = await supabase
        .from("team_connections")
        .select("id")
        .eq("learner_id", userId)
        .eq("connected_user_id", owner.user_id)
        .eq("status", "active")
        .maybeSingle();

      if (!connection) {
        const roleLabel = owner.role === "senior_moderator" ? "Senior Moderator"
          : owner.role === "super_moderator" ? "Super Moderator"
          : "Moderator";

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", owner.user_id)
          .maybeSingle();

        const { data: newConn } = await supabase
          .from("team_connections")
          .insert({
            learner_id: userId,
            connected_user_id: owner.user_id,
            display_name: owner.user_name,
            avatar_url: profile?.avatar_url || null,
            role_label: roleLabel,
            connection_type: "doubt_auto",
            status: "active",
          })
          .select("id")
          .single();
        connection = newConn;
      }

      if (!connection) {
        toast.error("Failed to create connection");
        return null;
      }

      return { connectionId: connection.id };
    } catch (err) {
      console.error("Route doubt error:", err);
      toast.error("Something went wrong. Please try again.");
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [userId]);

  return {
    isSubmitting,
    myDoubts,
    isLoadingDoubts,
    submitDoubt,
    routeDoubt,
    fetchMyDoubts,
  };
}

async function findConnectionForDoubt(doubtThreadId: string, learnerId: string): Promise<string | null> {
  const { data: doubt } = await supabase
    .from("doubt_threads")
    .select("assigned_user_id")
    .eq("id", doubtThreadId)
    .single();

  if (!doubt?.assigned_user_id) return null;

  const { data: conn } = await supabase
    .from("team_connections")
    .select("id")
    .eq("learner_id", learnerId)
    .eq("connected_user_id", doubt.assigned_user_id)
    .eq("status", "active")
    .maybeSingle();

  return conn?.id || null;
}
