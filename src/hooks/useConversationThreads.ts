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

async function syncThreadReplyToLearnerConversation(params: {
  thread: ConversationThread;
  senderUserId: string;
  senderRole: SenderRole;
  content: string;
  messageType: MessageType;
  attachment?: { url: string; name: string; size?: number; msgType: "image" | "file" | "voice" };
  markAsResolved?: boolean;
}) {
  const { thread, senderUserId, senderRole, content, messageType, attachment } = params;

  if (senderRole === "learner") return;
  if (!attachment && !content.trim()) return;

  const candidateUserIds = [
    senderUserId,
    thread.assigned_moderator_user_id,
    thread.assigned_senior_moderator_user_id,
  ].filter(Boolean) as string[];

  // Try to read team_connections — RLS may block this for moderators.
  // We cache the connection id in localStorage so future syncs succeed even when RLS blocks the read.
  const { data: connection } = await supabase
    .from("team_connections")
    .select("id")
    .eq("learner_id", thread.learner_user_id)
    .in("connected_user_id", candidateUserIds)
    .eq("status", "active")
    .maybeSingle();

  if (connection) {
    // Cache so future calls survive RLS blocking this read
    localStorage.setItem(`tc_conn_${thread.learner_user_id}`, connection.id);
  }

  // Resolve connection id: live result or cached fallback
  const connectionId = connection?.id ?? localStorage.getItem(`tc_conn_${thread.learner_user_id}`);
  if (!connectionId) return;

  // Fast path: use cached conversation_id so we always land on the same conversation
  // the learner is subscribed to, even when multiple non-resolved conversations exist.
  const cachedConvId = localStorage.getItem(`thread_conversation_${thread.id}`);

  let conversation: { id: string; unread_count_learner: number | null; conversation_type?: string } | null = null;

  if (cachedConvId) {
    // Verify the cached conversation still exists and is accessible
    const { data: cachedConv } = await supabase
      .from("conversations")
      .select("id, unread_count_learner, conversation_type")
      .eq("id", cachedConvId)
      .maybeSingle();
    if (cachedConv) {
      conversation = cachedConv;
      // If it was marked resolved, reset to direct so the learner can receive messages
      if (cachedConv.conversation_type === "resolved") {
        await supabase.from("conversations").update({ conversation_type: "direct" }).eq("id", cachedConvId);
      }
    }
  }

  if (!conversation) {
    // No cache hit — find the most recently updated non-resolved conversation.
    // Use order+limit to avoid maybeSingle() returning null on multiple rows.
    const { data: activeConv } = await supabase
      .from("conversations")
      .select("id, unread_count_learner")
      .eq("learner_id", thread.learner_user_id)
      .eq("connection_id", connectionId)
      .neq("conversation_type", "resolved")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeConv) {
      conversation = activeConv;
    } else {
      // No active conversation — find the most recently resolved one and reset it to "direct".
      // This uses UPDATE instead of INSERT, which RLS allows for moderators.
      const { data: resolvedConvo } = await supabase
        .from("conversations")
        .select("id, unread_count_learner")
        .eq("learner_id", thread.learner_user_id)
        .eq("connection_id", connectionId)
        .eq("conversation_type", "resolved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resolvedConvo) {
        await supabase
          .from("conversations")
          .update({ conversation_type: "direct" })
          .eq("id", resolvedConvo.id);
        conversation = { id: resolvedConvo.id, unread_count_learner: 0 };
      } else {
        // Last resort: try INSERT (may fail if RLS only allows learners to create)
        const { data: createdConversation } = await supabase
          .from("conversations")
          .insert({
            learner_id: thread.learner_user_id,
            connection_id: connectionId,
            conversation_type: "direct",
          })
          .select("id, unread_count_learner")
          .single();
        conversation = createdConversation;
      }
    }
  }

  if (!conversation) return;

  // Cache conversation_id so fetchThread can query conversation_messages directly on refresh
  // (avoids a team_connections → conversations join that RLS may block for moderators)
  localStorage.setItem(`thread_conversation_${thread.id}`, conversation.id);
  // Reverse cache: lets learner side look up thread id from conversation id (for reopen)
  localStorage.setItem(`conv_thread_${conversation.id}`, thread.id);

  const now = new Date().toISOString();
  const normalizedType = attachment?.msgType || (messageType === "system_event" ? "system" : "text");
  const preview = attachment
    ? (attachment.msgType === "image" ? "📷 Photo" : `📎 ${attachment.name}`)
    : content.slice(0, 100);

  await supabase.from("conversation_messages").insert({
    conversation_id: conversation.id,
    sender_type: senderRole,
    sender_id: senderUserId,
    message_text: attachment ? null : content,
    message_type: normalizedType,
    attachment_url: attachment?.url || null,
    attachment_name: attachment?.name || null,
    attachment_size: attachment?.size || null,
    delivery_status: "sent",
  });

  await supabase
    .from("conversations")
    .update({
      last_message_preview: preview,
      last_message_at: now,
      unread_count_learner: (conversation.unread_count_learner || 0) + 1,
    })
    .eq("id", conversation.id);

  await supabase
    .from("team_connections")
    .update({ last_message_at: now })
    .eq("id", connectionId);

  if (params.markAsResolved) {
    await supabase
      .from("conversations")
      .update({ conversation_type: "resolved" })
      .eq("id", conversation.id);
  }

  // Broadcast new-message notification directly to learner via ephemeral channel
  // so their unread badge updates live even without postgres_changes on conversations
  const notifCh = supabase.channel(`notif-${thread.learner_user_id}`);
  notifCh.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      notifCh.send({
        type: "broadcast",
        event: "new_unread",
        payload: {
          conversation_id: conversation.id,
          unread_count: (conversation.unread_count_learner || 0) + 1,
        },
      }).then(() => notifCh.unsubscribe());
    }
  });
}

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
        .select("thread_id, message_content, is_read, sender_user_id, created_at")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false });

      // Auto-stamp localStorage for any thread not previously viewed in this browser.
      // This ensures all currently-existing messages are treated as "read from now",
      // so stale is_read=false rows in DB don't ghost the badge after a page refresh.
      const now = new Date().toISOString();
      threadIds.forEach((tid: string) => {
        const key = `thread_viewed_${userId}_${tid}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, now);
        }
      });

      // Compute unread counts
      const unreadMap: Record<string, number> = {};
      const latestMap: Record<string, string> = {};
      (latestMessages || []).forEach((msg: any) => {
        if (!latestMap[msg.thread_id]) {
          latestMap[msg.thread_id] = msg.message_content;
        }
        if (msg.sender_user_id !== userId) {
          // Use localStorage cursor so badge clears instantly when thread is opened,
          // without needing to update thread_messages.is_read (which RLS may block)
          const lastViewed = localStorage.getItem(`thread_viewed_${userId}_${msg.thread_id}`);
          const isUnread = lastViewed
            ? new Date(msg.created_at) > new Date(lastViewed)
            : !msg.is_read;
          if (isUnread) {
            unreadMap[msg.thread_id] = (unreadMap[msg.thread_id] || 0) + 1;
          }
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

  // Realtime: increment unread count when a new learner message arrives in any assigned thread
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`thread-list-inserts-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "thread_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_user_id === userId) return; // own message
          setThreads((prev) =>
            prev.map((t) => {
              if (t.id !== msg.thread_id) return t;
              const lastViewed = localStorage.getItem(`thread_viewed_${userId}_${t.id}`);
              const isUnread = !lastViewed || new Date(msg.created_at) > new Date(lastViewed);
              if (!isUnread) return t;
              return { ...t, unread_count: (t.unread_count || 0) + 1, latest_message: msg.message_content };
            })
          );
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [userId]);

  const markThreadRead = useCallback((threadId: string) => {
    if (!userId) return;
    // Stamp cursor so unread calc respects it immediately on next fetchThreads
    localStorage.setItem(`thread_viewed_${userId}_${threadId}`, new Date().toISOString());
    // Zero the badge in-memory instantly — no refetch needed
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unread_count: 0 } : t));
    // Persist to DB so badge stays gone after a page refresh (fire-and-forget)
    supabase
      .from("thread_messages")
      .update({ is_read: true })
      .eq("thread_id", threadId)
      .neq("sender_user_id", userId)
      .eq("is_read", false)
      .then(() => {});
  }, [userId]);

  return { threads, isLoading, refetch: fetchThreads, markThreadRead };
}

export function useThreadDetail(threadId: string | undefined, userId: string | undefined) {
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [assignments, setAssignments] = useState<ThreadAssignment[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [learnerSeenAt, setLearnerSeenAt] = useState<string | null>(null);

  const fetchThread = useCallback(async () => {
    if (!threadId || !userId) return;
    setIsLoading(true);
    // Stamp "viewed now" so thread list clears unread badge without needing DB is_read update
    localStorage.setItem(`thread_viewed_${userId}_${threadId}`, new Date().toISOString());

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

      // 1. Fast path: read from localStorage (written when live broadcast fires)
      let initialLearnerSeenAt: string | null =
        localStorage.getItem(`thread_learner_seen_${threadId}`) || null;

      if (!initialLearnerSeenAt) {
        // 2. Cached conversation_id (stored when mentor first syncs a reply to this thread)
        const cachedConvoId = localStorage.getItem(`thread_conversation_${threadId}`);
        const convoIdsToCheck: string[] = cachedConvoId ? [cachedConvoId] : [];

        // 3. If no cached convo id, look up all conversations for this learner.
        //    Moderators can read conversations by learner_id (same query used in markLearnerMessagesSeen).
        if (convoIdsToCheck.length === 0) {
          const { data: learnerConvos } = await supabase
            .from("conversations")
            .select("id")
            .eq("learner_id", threadData.learner_user_id);
          (learnerConvos || []).forEach((c: any) => convoIdsToCheck.push(c.id));
        }

        if (convoIdsToCheck.length > 0) {
          const { data: latestSeen } = await supabase
            .from("conversation_messages")
            .select("seen_at")
            .in("conversation_id", convoIdsToCheck)
            .eq("sender_id", userId)
            .not("seen_at", "is", null)
            .order("seen_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestSeen?.seen_at) {
            initialLearnerSeenAt = latestSeen.seen_at;
            // Back-fill localStorage so future refreshes skip the DB query
            localStorage.setItem(`thread_learner_seen_${threadId}`, latestSeen.seen_at);
          }
        }
      }

      // Set thread and learnerSeenAt in the same synchronous block → React batches into one render
      setThread({
        ...threadData,
        learner_name: profileMap[threadData.learner_user_id]?.full_name || profileMap[threadData.learner_user_id]?.email,
        post_title: postTitle,
        team_name: teamName,
        assigned_moderator_name: threadData.assigned_moderator_user_id
          ? profileMap[threadData.assigned_moderator_user_id]?.full_name
          : undefined,
      } as ConversationThread);
      if (initialLearnerSeenAt) setLearnerSeenAt(initialLearnerSeenAt);

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

  // Mark learner's conversation_messages as "seen" and broadcast directly to learner
  const markLearnerMessagesSeen = useCallback(async (learnerUserId: string) => {
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("learner_id", learnerUserId);

    if (!conversations || conversations.length === 0) return;

    const conversationIds = conversations.map((c) => c.id);
    const now = new Date().toISOString();

    await supabase
      .from("conversation_messages")
      .update({ delivery_status: "seen", seen_at: now, delivered_at: now, is_read: true })
      .in("conversation_id", conversationIds)
      .eq("sender_type", "learner")
      .neq("delivery_status", "seen");

    await supabase
      .from("conversations")
      .update({ unread_count_team: 0 })
      .in("id", conversationIds);

    // Broadcast seen-ack directly to learner — bypasses need for postgres_changes on conversation_messages
    const ackChannel = supabase.channel(`seen-${learnerUserId}`);
    ackChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ackChannel.send({
          type: "broadcast",
          event: "messages_seen",
          payload: { seen_at: now, conversation_ids: conversationIds },
        }).then(() => ackChannel.unsubscribe());
      }
    });
  }, []);

  useEffect(() => {
    if (!thread || !userId) return;
    markLearnerMessagesSeen(thread.learner_user_id);
  }, [thread?.id, userId, markLearnerMessagesSeen]);

  // Subscribe to learner-seen ack broadcast — learner emits this when they read moderator messages
  useEffect(() => {
    if (!threadId) return;
    const ackChannel = supabase
      .channel(`seen-learner-ack-${threadId}`)
      .on("broadcast", { event: "messages_read" }, (payload) => {
        const { seen_at } = payload.payload as { seen_at: string };
        // Persist so it survives a refresh — fetchThread reads this back on mount
        localStorage.setItem(`thread_learner_seen_${threadId}`, seen_at);
        setLearnerSeenAt(seen_at);
      })
      .subscribe();
    return () => { ackChannel.unsubscribe(); };
  }, [threadId]);

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
            // Mark new learner messages as seen immediately since moderator is viewing
            if (newMsg.sender_role === "learner") {
              markLearnerMessagesSeen(newMsg.sender_user_id);
            }
          }
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [threadId, userId, markLearnerMessagesSeen]);

  // Mark all unread thread messages from others as read when viewing thread
  useEffect(() => {
    if (!thread?.id || !userId) return;
    supabase
      .from("thread_messages")
      .update({ is_read: true })
      .eq("thread_id", thread.id)
      .neq("sender_user_id", userId)
      .eq("is_read", false)
      .then(() => {});
  }, [thread?.id, userId]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    senderRole: SenderRole,
    messageType: MessageType = "normal",
    isVisibleToLearner: boolean = true,
    attachment?: { url: string; name: string; size?: number; msgType: "image" | "file" | "voice" }
  ) => {
    if (!threadId || !userId) return;
    if (!content.trim() && !attachment) return;
    setIsSending(true);

    const displayContent = attachment
      ? (attachment.msgType === "image" ? "📷 Photo" : `📎 ${attachment.name}`)
      : content.trim();

    try {
      const newMsg = {
        thread_id: threadId,
        sender_user_id: userId,
        sender_role: senderRole,
        message_content: displayContent,
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

      if (thread && senderRole !== "learner" && isVisibleToLearner) {
        await syncThreadReplyToLearnerConversation({
          thread,
          senderUserId: userId,
          senderRole,
          content: content.trim(),
          messageType,
          attachment,
        });
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

    // Sync the divider message to learner's conversation so they see it too.
    // No markAsResolved — conversation stays active so both sides can keep chatting.
    await syncThreadReplyToLearnerConversation({
      thread,
      senderUserId: userId,
      senderRole: resolverRole,
      content: "✓ Doubt Cleared",
      messageType: "system_event",
    });

    await fetchThread();
  }, [threadId, userId, thread, fetchThread]);

  // Create a fresh new thread for the same learner (used when mentor sends after resolve)
  const startNewThread = useCallback(async (senderRole: SenderRole, firstMessage: string): Promise<string | null> => {
    if (!userId || !thread) return null;

    const { data: newThread, error: threadError } = await supabase
      .from("conversation_threads")
      .insert({
        learner_user_id: thread.learner_user_id,
        assigned_moderator_user_id: senderRole === "moderator" ? userId : null,
        assigned_senior_moderator_user_id: senderRole === "senior_moderator" ? userId : null,
        current_owner_role: senderRole === "senior_moderator" ? "senior_moderator" : "moderator",
        current_status: "replied",
        routing_type: thread.routing_type,
        team_id: thread.team_id,
      })
      .select("id, learner_user_id, assigned_moderator_user_id, assigned_senior_moderator_user_id, routing_type, team_id, current_status, current_owner_role, post_id, created_at, updated_at")
      .single();

    if (threadError) { console.error("startNewThread insert error:", threadError); return null; }
    if (!newThread) return null;

    await supabase.from("thread_messages").insert({
      thread_id: (newThread as any).id,
      sender_user_id: userId,
      sender_role: senderRole,
      message_content: firstMessage,
      message_type: "normal",
      is_visible_to_learner: true,
    });

    // Sync to learner's conversation_messages
    await syncThreadReplyToLearnerConversation({
      thread: { ...thread, id: (newThread as any).id },
      senderUserId: userId,
      senderRole,
      content: firstMessage,
      messageType: "normal",
    });

    return (newThread as any).id;
  }, [userId, thread]);

  // Reopen a resolved thread
  const markUnresolved = useCallback(async (reopenerRole: SenderRole) => {
    if (!threadId || !userId || !thread) return;

    const roleLabel = reopenerRole === "learner" ? "Learner" : "Mentor";
    const reopenContent = `Restarted by ${roleLabel}`;

    await supabase
      .from("conversation_threads")
      .update({ current_status: "open", updated_at: new Date().toISOString() })
      .eq("id", threadId);

    await supabase.from("thread_messages").insert({
      thread_id: threadId,
      sender_user_id: userId,
      sender_role: reopenerRole,
      message_content: reopenContent,
      message_type: "system_event",
      is_visible_to_learner: true,
    });

    await supabase.from("conversation_status_logs").insert({
      thread_id: threadId,
      old_status: "resolved",
      new_status: "open",
      changed_by_user_id: userId,
      changed_by_role: reopenerRole,
    });

    // Sync the reopen intimation to learner's conversation_messages
    await syncThreadReplyToLearnerConversation({
      thread,
      senderUserId: userId,
      senderRole: reopenerRole,
      content: reopenContent,
      messageType: "system_event",
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
    learnerSeenAt,
    sendMessage,
    assignToModerator,
    escalateToSenior,
    markResolved,
    markUnresolved,
    startNewThread,
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
