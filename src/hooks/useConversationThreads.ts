import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThreadStatus = "new" | "open" | "assigned" | "replied" | "resolved";
export type RoutingType = "direct_moderator" | "team_senior_moderator";
export type SenderRole = "learner" | "moderator" | "senior_moderator";
export type MessageType = "normal" | "system_event" | "internal_note";

export interface ConversationThread {
  id: string;
  learner_user_id: string;
  post_id: string | null;
  team_id: string | null;
  assigned_senior_moderator_user_id: string | null;
  assigned_moderator_user_id: string | null;
  current_owner_role: string;
  current_status: ThreadStatus;
  routing_type: RoutingType;
  created_at: string;
  updated_at: string;
  // Joined data
  learner_name?: string;
  learner_email?: string;
  post_title?: string;
  team_name?: string;
  assigned_moderator_name?: string;
  latest_message?: string;
  unread_count?: number;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_role: SenderRole;
  message_content: string;
  message_type: MessageType;
  is_visible_to_learner: boolean;
  is_read: boolean;
  created_at: string;
  // Joined
  sender_name?: string;
}

export interface ThreadAssignment {
  id: string;
  thread_id: string;
  assigned_by_user_id: string;
  assigned_to_user_id: string;
  assigned_to_role: string;
  from_role: string | null;
  assignment_note: string | null;
  created_at: string;
  assigned_by_name?: string;
  assigned_to_name?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: string;
  user_name?: string;
}

type StatusFilter = "all" | ThreadStatus | "unassigned";

export function useConversationThreads(
  userId: string | undefined,
  role: "moderator" | "senior_moderator",
  statusFilter: StatusFilter = "all"
) {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchThreads = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from("conversation_threads")
        .select("*")
        .order("updated_at", { ascending: false });

      if (role === "moderator") {
        query = query.or(`assigned_moderator_user_id.eq.${userId}`);
      } else {
        query = query.or(`assigned_senior_moderator_user_id.eq.${userId}`);
      }

      if (statusFilter !== "all") {
        if (statusFilter === "unassigned") {
          query = query.is("assigned_moderator_user_id", null);
        } else {
          query = query.eq("current_status", statusFilter);
        }
      }

      const { data: rawThreads } = await query;
      if (!rawThreads || rawThreads.length === 0) {
        setThreads([]);
        setIsLoading(false);
        return;
      }

      // Fetch learner profiles
      const learnerIds = [...new Set(rawThreads.map((t: any) => t.learner_user_id))];
      const modIds = [...new Set(rawThreads.map((t: any) => t.assigned_moderator_user_id).filter(Boolean))];
      const allUserIds = [...new Set([...learnerIds, ...modIds])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", allUserIds);

      // Fetch post titles
      const postIds = [...new Set(rawThreads.map((t: any) => t.post_id).filter(Boolean))];
      const { data: posts } = postIds.length > 0
        ? await supabase.from("posts").select("id, title").in("id", postIds)
        : { data: [] };

      // Fetch team names
      const teamIds = [...new Set(rawThreads.map((t: any) => t.team_id).filter(Boolean))];
      const { data: teams } = teamIds.length > 0
        ? await supabase.from("teams").select("id, name").in("id", teamIds)
        : { data: [] };

      // Fetch latest message per thread
      const threadIds = rawThreads.map((t: any) => t.id);
      const { data: latestMessages } = await supabase
        .from("thread_messages")
        .select("thread_id, message_content, is_read, sender_user_id")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      // Compute unread counts
      const unreadMap: Record<string, number> = {};
      const latestMap: Record<string, string> = {};
      (latestMessages || []).forEach((msg: any) => {
        if (!latestMap[msg.thread_id]) {
          latestMap[msg.thread_id] = msg.message_content;
        }
        if (!msg.is_read && msg.sender_user_id !== userId) {
          unreadMap[msg.thread_id] = (unreadMap[msg.thread_id] || 0) + 1;
        }
      });

      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      const postMap = Object.fromEntries((posts || []).map((p: any) => [p.id, p]));
      const teamMap = Object.fromEntries((teams || []).map((t: any) => [t.id, t]));

      const enriched: ConversationThread[] = rawThreads.map((t: any) => ({
        ...t,
        learner_name: profileMap[t.learner_user_id]?.full_name || profileMap[t.learner_user_id]?.email || "Unknown",
        learner_email: profileMap[t.learner_user_id]?.email,
        post_title: t.post_id ? postMap[t.post_id]?.title : undefined,
        team_name: t.team_id ? teamMap[t.team_id]?.name : undefined,
        assigned_moderator_name: t.assigned_moderator_user_id
          ? profileMap[t.assigned_moderator_user_id]?.full_name || profileMap[t.assigned_moderator_user_id]?.email
          : undefined,
        latest_message: latestMap[t.id],
        unread_count: unreadMap[t.id] || 0,
      }));

      setThreads(enriched);
    } finally {
      setIsLoading(false);
    }
  }, [userId, role, statusFilter]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return { threads, isLoading, refetch: fetchThreads };
}

export function useThreadDetail(threadId: string | undefined, userId: string | undefined) {
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [assignments, setAssignments] = useState<ThreadAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchThread = useCallback(async () => {
    if (!threadId || !userId) return;
    setIsLoading(true);

    try {
      // Fetch thread
      const { data: threadData } = await supabase
        .from("conversation_threads")
        .select("*")
        .eq("id", threadId)
        .single();

      if (!threadData) {
        setIsLoading(false);
        return;
      }

      // Fetch profiles for enrichment
      const userIds = [
        threadData.learner_user_id,
        threadData.assigned_moderator_user_id,
        threadData.assigned_senior_moderator_user_id,
      ].filter(Boolean);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));

      // Fetch post title
      let postTitle: string | undefined;
      if (threadData.post_id) {
        const { data: post } = await supabase
          .from("posts")
          .select("title")
          .eq("id", threadData.post_id)
          .single();
        postTitle = post?.title;
      }

      // Fetch team name
      let teamName: string | undefined;
      if (threadData.team_id) {
        const { data: team } = await supabase
          .from("teams")
          .select("name")
          .eq("id", threadData.team_id)
          .single();
        teamName = team?.name;
      }

      setThread({
        ...threadData,
        learner_name: profileMap[threadData.learner_user_id]?.full_name || profileMap[threadData.learner_user_id]?.email,
        post_title: postTitle,
        team_name: teamName,
        assigned_moderator_name: threadData.assigned_moderator_user_id
          ? profileMap[threadData.assigned_moderator_user_id]?.full_name
          : undefined,
      } as ConversationThread);

      // Fetch messages
      const { data: msgs } = await supabase
        .from("thread_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      // Enrich messages with sender names
      const msgUserIds = [...new Set((msgs || []).map((m: any) => m.sender_user_id))];
      const { data: msgProfiles } = msgUserIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", msgUserIds)
        : { data: [] };
      const msgProfileMap = Object.fromEntries((msgProfiles || []).map((p: any) => [p.id, p]));

      setMessages((msgs || []).map((m: any) => ({
        ...m,
        sender_name: msgProfileMap[m.sender_user_id]?.full_name || msgProfileMap[m.sender_user_id]?.email || "Unknown",
      })));

      // Fetch assignments
      const { data: assignmentData } = await supabase
        .from("conversation_assignments")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      const assignUserIds = [...new Set((assignmentData || []).flatMap((a: any) => [a.assigned_by_user_id, a.assigned_to_user_id]))];
      const { data: assignProfiles } = assignUserIds.length > 0
        ? await supabase.from("profiles").select("id, full_name, email").in("id", assignUserIds)
        : { data: [] };
      const assignProfileMap = Object.fromEntries((assignProfiles || []).map((p: any) => [p.id, p]));

      setAssignments((assignmentData || []).map((a: any) => ({
        ...a,
        assigned_by_name: assignProfileMap[a.assigned_by_user_id]?.full_name || "Unknown",
        assigned_to_name: assignProfileMap[a.assigned_to_user_id]?.full_name || "Unknown",
      })));

      // Fetch team members if team thread
      if (threadData.team_id) {
        const { data: members } = await supabase
          .from("team_members")
          .select("*")
          .eq("team_id", threadData.team_id)
          .eq("role_in_team", "moderator");

        const memberUserIds = (members || []).map((m: any) => m.user_id);
        const { data: memberProfiles } = memberUserIds.length > 0
          ? await supabase.from("profiles").select("id, full_name, email").in("id", memberUserIds)
          : { data: [] };
        const memberProfileMap = Object.fromEntries((memberProfiles || []).map((p: any) => [p.id, p]));

        setTeamMembers((members || []).map((m: any) => ({
          ...m,
          user_name: memberProfileMap[m.user_id]?.full_name || memberProfileMap[m.user_id]?.email || "Unknown",
        })));
      }
    } finally {
      setIsLoading(false);
    }
  }, [threadId, userId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "thread_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_user_id !== userId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", newMsg.sender_user_id)
              .single();
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, {
                ...newMsg,
                sender_name: profile?.full_name || profile?.email || "Unknown",
              }];
            });
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [threadId, userId]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    senderRole: SenderRole,
    messageType: MessageType = "normal",
    isVisibleToLearner: boolean = true
  ) => {
    if (!threadId || !userId || !content.trim()) return;
    setIsSending(true);

    try {
      const newMsg = {
        thread_id: threadId,
        sender_user_id: userId,
        sender_role: senderRole,
        message_content: content.trim(),
        message_type: messageType,
        is_visible_to_learner: isVisibleToLearner,
      };

      const { data } = await supabase
        .from("thread_messages")
        .insert(newMsg)
        .select()
        .single();

      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", userId)
          .single();

        setMessages((prev) => [...prev, {
          ...data,
          sender_name: profile?.full_name || profile?.email || "You",
        } as ThreadMessage]);
      }

      // Update thread status
      const newStatus = senderRole === "learner" ? "open" : "replied";
      await supabase
        .from("conversation_threads")
        .update({ current_status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", threadId);

      // Log status change
      if (thread) {
        await supabase.from("conversation_status_logs").insert({
          thread_id: threadId,
          old_status: thread.current_status,
          new_status: newStatus,
          changed_by_user_id: userId,
          changed_by_role: senderRole,
        });
      }
    } finally {
      setIsSending(false);
    }
  }, [threadId, userId, thread]);

  // Assign to moderator
  const assignToModerator = useCallback(async (
    moderatorUserId: string,
    note?: string
  ) => {
    if (!threadId || !userId || !thread) return;

    await supabase.from("conversation_assignments").insert({
      thread_id: threadId,
      assigned_by_user_id: userId,
      assigned_to_user_id: moderatorUserId,
      assigned_to_role: "moderator",
      from_role: thread.current_owner_role,
      assignment_note: note || null,
    });

    await supabase
      .from("conversation_threads")
      .update({
        assigned_moderator_user_id: moderatorUserId,
        current_owner_role: "moderator",
        current_status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    // Add system message
    await supabase.from("thread_messages").insert({
      thread_id: threadId,
      sender_user_id: userId,
      sender_role: "senior_moderator",
      message_content: `Conversation assigned to a moderator${note ? `: ${note}` : ""}`,
      message_type: "system_event",
      is_visible_to_learner: false,
    });

    await supabase.from("conversation_status_logs").insert({
      thread_id: threadId,
      old_status: thread.current_status,
      new_status: "assigned",
      changed_by_user_id: userId,
      changed_by_role: "senior_moderator",
    });

    await fetchThread();
  }, [threadId, userId, thread, fetchThread]);

  // Escalate to senior moderator
  const escalateToSenior = useCallback(async () => {
    if (!threadId || !userId || !thread) return;

    await supabase
      .from("conversation_threads")
      .update({
        current_owner_role: "senior_moderator",
        current_status: "open",
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    await supabase.from("thread_messages").insert({
      thread_id: threadId,
      sender_user_id: userId,
      sender_role: "moderator",
      message_content: "Conversation forwarded to Senior Moderator",
      message_type: "system_event",
      is_visible_to_learner: false,
    });

    await supabase.from("conversation_status_logs").insert({
      thread_id: threadId,
      old_status: thread.current_status,
      new_status: "open",
      changed_by_user_id: userId,
      changed_by_role: "moderator",
    });

    await fetchThread();
  }, [threadId, userId, thread, fetchThread]);

  // Mark as resolved
  const markResolved = useCallback(async (resolverRole: SenderRole) => {
    if (!threadId || !userId || !thread) return;

    await supabase
      .from("conversation_threads")
      .update({
        current_status: "resolved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    await supabase.from("thread_messages").insert({
      thread_id: threadId,
      sender_user_id: userId,
      sender_role: resolverRole,
      message_content: "Conversation marked as resolved",
      message_type: "system_event",
      is_visible_to_learner: true,
    });

    await supabase.from("conversation_status_logs").insert({
      thread_id: threadId,
      old_status: thread.current_status,
      new_status: "resolved",
      changed_by_user_id: userId,
      changed_by_role: resolverRole,
    });

    await fetchThread();
  }, [threadId, userId, thread, fetchThread]);

  return {
    thread,
    messages,
    assignments,
    teamMembers,
    isLoading,
    isSending,
    sendMessage,
    assignToModerator,
    escalateToSenior,
    markResolved,
    refetch: fetchThread,
  };
}

/** Create a new conversation thread when learner asks a question */
export async function createConversationThread(
  learnerId: string,
  postId: string,
  initialMessage: string
): Promise<string | null> {
  // Fetch post to determine routing
  const { data: post } = await supabase
    .from("posts")
    .select("id, author_id, created_by_type, created_by_team_id, related_senior_moderator_user_id")
    .eq("id", postId)
    .single();

  if (!post) return null;

  const isTeamPost = (post as any).created_by_type === "team";
  const teamId = (post as any).created_by_team_id;
  const seniorModId = (post as any).related_senior_moderator_user_id;

  const threadData: any = {
    learner_user_id: learnerId,
    post_id: postId,
    routing_type: isTeamPost ? "team_senior_moderator" : "direct_moderator",
    current_status: "new",
  };

  if (isTeamPost && teamId && seniorModId) {
    threadData.team_id = teamId;
    threadData.assigned_senior_moderator_user_id = seniorModId;
    threadData.current_owner_role = "senior_moderator";
  } else {
    threadData.assigned_moderator_user_id = post.author_id;
    threadData.current_owner_role = "moderator";
  }

  const { data: newThread } = await supabase
    .from("conversation_threads")
    .insert(threadData)
    .select()
    .single();

  if (!newThread) return null;

  // Insert initial message
  await supabase.from("thread_messages").insert({
    thread_id: (newThread as any).id,
    sender_user_id: learnerId,
    sender_role: "learner",
    message_content: initialMessage,
    message_type: "normal",
    is_visible_to_learner: true,
  });

  // Log status
  await supabase.from("conversation_status_logs").insert({
    thread_id: (newThread as any).id,
    old_status: null,
    new_status: "new",
    changed_by_user_id: learnerId,
    changed_by_role: "learner",
  });

  return (newThread as any).id;
}
