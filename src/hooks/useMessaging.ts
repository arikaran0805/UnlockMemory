import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

import type { ResolvedOwner } from "@/hooks/useDoubtSystem";

export type MessagingView = "closed" | "empty" | "list" | "chat" | "collapsed" | "mentor_preview";

export interface TeamConnection {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role_label: string;
  connection_type: string;
  status: string;
  last_message_at: string | null;
}

export interface Conversation {
  id: string;
  connection_id: string;
  lesson_id: string | null;
  conversation_type: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  unread_count_learner: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  message_text: string | null;
  message_type: string;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_size?: number | null;
  is_read: boolean;
  created_at: string;
  delivery_status?: string;
  delivered_at?: string | null;
  seen_at?: string | null;
  voice_duration_seconds?: number | null;
}

export interface ConnectionWithConversation extends TeamConnection {
  conversation?: Conversation;
  resolvedConversations?: Conversation[];
}

export function useMessaging(userId: string | undefined) {
  const [view, setView] = useState<MessagingView>(() => {
    const saved = sessionStorage.getItem("messaging_view") as MessagingView | null;
    return saved && saved !== "closed" ? saved : "closed";
  });
  const [connections, setConnections] = useState<ConnectionWithConversation[]>([]);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(
    () => sessionStorage.getItem("messaging_active_connection")
  );
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [typingChannelId, setTypingChannelId] = useState<string | null>(null);

  // Keep ref in sync so realtime handlers can access current value without re-subscribing
  useEffect(() => { activeThreadIdRef.current = activeThreadId; }, [activeThreadId]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [mentorPreview, setMentorPreview] = useState<{ mentor: ResolvedOwner; context: { source_type: string; source_title: string } } | null>(null);
  const [suggestedMentor, setSuggestedMentor] = useState<{ mentor: ResolvedOwner; context: { source_type: string; source_title: string } } | null>(null);
  const [pastMessages, setPastMessages] = useState<ChatMessage[]>([]);
  const [viewingPastConvoId, setViewingPastConvoId] = useState<string | null>(null);
  const previousView = useRef<MessagingView>("closed");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const hasRestoredSession = useRef(false);
  const activeThreadIdRef = useRef<string | null>(null);

  // Fetch connections with latest conversation data
  const fetchConnections = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data: conns } = await supabase
        .from("team_connections")
        .select("*")
        .eq("learner_id", userId)
        .eq("status", "active")
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (!conns || conns.length === 0) {
        setConnections([]);
        setIsLoading(false);
        return;
      }

      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .eq("learner_id", userId);

      const merged: ConnectionWithConversation[] = (conns || []).map((c) => {
        const allConvos = (convos || []).filter((cv) => cv.connection_id === c.id);
        const activeConvo = allConvos.find((cv) => cv.conversation_type !== "resolved");
        const resolvedConvos = allConvos.filter((cv) => cv.conversation_type === "resolved")
          .sort((a, b) => new Date(b.created_at || b.last_message_at || "").getTime() - new Date(a.created_at || a.last_message_at || "").getTime());
        return { ...c, conversation: activeConvo || undefined, resolvedConversations: resolvedConvos };
      });

      // Auto-stamp any conversation not yet visited so stale DB counts don't ghost the badge
      const now = new Date().toISOString();
      (convos || []).forEach((cv: any) => {
        const key = `convo_viewed_${userId}_${cv.id}`;
        if (!localStorage.getItem(key)) localStorage.setItem(key, now);
      });

      setConnections(merged);
      const unread = (convos || []).reduce((sum, cv: any) => {
        const cursor = localStorage.getItem(`convo_viewed_${userId}_${cv.id}`);
        const effective = cursor && cv.last_message_at && new Date(cv.last_message_at) <= new Date(cursor)
          ? 0
          : (cv.unread_count_learner || 0);
        return sum + effective;
      }, 0);
      setTotalUnread(unread);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch messages for a conversation (load most recent, then display in order)
  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(100);
    // Reverse to show oldest first in UI
    setMessages((data || []).reverse());
  }, []);

  // Open messaging popup
  const openMessaging = useCallback(async (lessonId?: string) => {
    if (!userId) return;
    setIsLoading(true);
    
    // Always fetch fresh from DB to avoid stale state
    const { data: conns } = await supabase
      .from("team_connections")
      .select("*")
      .eq("learner_id", userId)
      .eq("status", "active")
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (conns && conns.length > 0) {
      // Also fetch conversations
      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .eq("learner_id", userId);

      const merged: ConnectionWithConversation[] = conns.map((c) => {
        const allConvos = (convos || []).filter((cv) => cv.connection_id === c.id);
        const activeConvo = allConvos.find((cv) => cv.conversation_type !== "resolved");
        const resolvedConvos = allConvos.filter((cv) => cv.conversation_type === "resolved")
          .sort((a, b) => new Date(b.created_at || b.last_message_at || "").getTime() - new Date(a.created_at || a.last_message_at || "").getTime());
        return { ...c, conversation: activeConvo || undefined, resolvedConversations: resolvedConvos };
      });

      // Auto-stamp any conversation not yet visited so stale DB counts don't ghost the badge
      const now = new Date().toISOString();
      (convos || []).forEach((cv: any) => {
        const key = `convo_viewed_${userId}_${cv.id}`;
        if (!localStorage.getItem(key)) localStorage.setItem(key, now);
      });

      setConnections(merged);
      const unread = (convos || []).reduce((sum, cv: any) => {
        const cursor = localStorage.getItem(`convo_viewed_${userId}_${cv.id}`);
        const effective = cursor && cv.last_message_at && new Date(cv.last_message_at) <= new Date(cursor)
          ? 0
          : (cv.unread_count_learner || 0);
        return sum + effective;
      }, 0);
      setTotalUnread(unread);
      setView("list");
    } else {
      setConnections([]);
      setView("empty");
    }
    setIsLoading(false);
  }, [userId]);

  // Ensure a conversation_thread exists for the moderator inbox
  const ensureThread = useCallback(async (connectionId: string, learnerId: string) => {
    // Check if a thread already exists for this connection
    const { data: connection } = await supabase
      .from("team_connections")
      .select("connected_user_id, role_label")
      .eq("id", connectionId)
      .single();

    if (!connection?.connected_user_id) return null;

    // Check existing thread
    const { data: existingThread } = await supabase
      .from("conversation_threads")
      .select("id")
      .eq("learner_user_id", learnerId)
      .or(`assigned_moderator_user_id.eq.${connection.connected_user_id},assigned_senior_moderator_user_id.eq.${connection.connected_user_id}`)
      .maybeSingle();

    if (existingThread) return existingThread.id;

    // Determine routing based on role
    const isSenior = connection.role_label === "Course Manager" || connection.role_label === "Career Manager" || connection.role_label === "Senior Moderator" || connection.role_label === "Super Moderator";

    const { data: newThread } = await supabase
      .from("conversation_threads")
      .insert({
        learner_user_id: learnerId,
        assigned_moderator_user_id: isSenior ? null : connection.connected_user_id,
        assigned_senior_moderator_user_id: isSenior ? connection.connected_user_id : null,
        current_owner_role: isSenior ? "senior_moderator" : "moderator",
        current_status: "new",
        routing_type: isSenior ? "team_senior_moderator" : "direct_moderator",
      })
      .select("id")
      .single();

    return newThread?.id || null;
  }, []);

  // Emit broadcast so moderator's messages show ✓✓ in their ConversationDetail view
  const emitLearnerSeenAck = useCallback((threadId: string) => {
    const now = new Date().toISOString();
    const ackCh = supabase.channel(`seen-learner-ack-${threadId}`);
    ackCh.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ackCh.send({ type: "broadcast", event: "messages_read", payload: { seen_at: now } })
          .then(() => ackCh.unsubscribe());
      }
    });
  }, []);

  // Open a specific chat
  const openChat = useCallback(async (connectionId: string, lessonId?: string) => {
    if (!userId) return;
    setActiveConnectionId(connectionId);
    setIsLoading(true);

    // Find or create conversation (exclude resolved ones)
    let { data: convo } = await supabase
      .from("conversations")
      .select("*")
      .eq("learner_id", userId)
      .eq("connection_id", connectionId)
      .neq("conversation_type", "resolved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!convo) {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({
          learner_id: userId,
          connection_id: connectionId,
          lesson_id: lessonId || null,
          conversation_type: lessonId ? "lesson" : "direct",
        })
        .select()
        .single();
      convo = newConvo;
    }

    if (convo) {
      setActiveConversation(convo);
      // Stamp localStorage so badge stays gone even if DB update is blocked by RLS
      localStorage.setItem(`convo_viewed_${userId}_${convo.id}`, new Date().toISOString());
      // Clear local unread count immediately so badge disappears without waiting for DB round-trip
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId && c.conversation
            ? { ...c, conversation: { ...c.conversation, unread_count_learner: 0 } }
            : c
        )
      );
      await fetchMessages(convo.id);

      // Upgrade any own messages stuck as "sent" in DB → "delivered"
      // (covers old messages sent before the delivered-update fix, and any race conditions)
      const stuckDeliveredAt = new Date().toISOString();
      const { data: stuckMsgs } = await supabase
        .from("conversation_messages")
        .select("id")
        .eq("conversation_id", convo.id)
        .eq("sender_id", userId)
        .eq("delivery_status", "sent");
      if (stuckMsgs && stuckMsgs.length > 0) {
        const stuckIds = stuckMsgs.map((m: any) => m.id);
        await supabase
          .from("conversation_messages")
          .update({ delivery_status: "delivered", delivered_at: stuckDeliveredAt })
          .in("id", stuckIds);
        setMessages((prev) =>
          prev.map((m) =>
            stuckIds.includes(m.id) ? { ...m, delivery_status: "delivered", delivered_at: stuckDeliveredAt } : m
          )
        );
      }

      // Pre-initialize thread so typing channel is ready immediately
      const threadId = await ensureThread(connectionId, userId);
      setActiveThreadId(threadId || null);

      // Compute deterministic typing channel key: sorted [learnerId, moderatorId]
      const { data: connData } = await supabase
        .from("team_connections")
        .select("connected_user_id")
        .eq("id", connectionId)
        .single();
      if (connData?.connected_user_id) {
        const key = [userId, connData.connected_user_id].sort().join("-");
        setTypingChannelId(key);
      }

      // Notify moderator that learner has seen their messages
      if (threadId) emitLearnerSeenAck(threadId);

      // Mark as read + mark all incoming messages as seen
      if (convo.unread_count_learner > 0) {
        await supabase
          .from("conversations")
          .update({ unread_count_learner: 0 })
          .eq("id", convo.id);
      }

      // Mark all messages from other side as "seen"
      await supabase
        .from("conversation_messages")
        .update({ delivery_status: "seen", seen_at: new Date().toISOString(), is_read: true })
        .eq("conversation_id", convo.id)
        .neq("sender_id", userId)
        .neq("delivery_status", "seen");
    }

    setIsLoading(false);
    setView("chat");
  }, [userId, fetchMessages, ensureThread, emitLearnerSeenAck]);

  // Send message
  const sendMessage = useCallback(async (text: string, attachmentUrl?: string, attachmentName?: string) => {
    if (!userId || !activeConversation) return;
    setIsSending(true);

    const optimisticId = crypto.randomUUID();
    const newMsg: Partial<ChatMessage> = {
      id: optimisticId,
      conversation_id: activeConversation.id,
      sender_type: "learner",
      sender_id: userId,
      message_text: text || null,
      message_type: attachmentUrl ? "attachment" : "text",
      attachment_url: attachmentUrl || null,
      attachment_name: attachmentName || null,
      is_read: false,
      created_at: new Date().toISOString(),
      delivery_status: "sent",
    };

    // Optimistic update
    setMessages((prev) => [...prev, newMsg as ChatMessage]);

    try {
      const { data: inserted, error: insertError } = await supabase.from("conversation_messages").insert({
        conversation_id: activeConversation.id,
        sender_type: "learner",
        sender_id: userId,
        message_text: text || null,
        message_type: attachmentUrl ? "attachment" : "text",
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        delivery_status: "sent",
      }).select().single();

      if (insertError) {
        // Rollback optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        return;
      }

      // Replace optimistic message with real DB record
      if (inserted) {
        setMessages((prev) =>
          prev.map((m) => m.id === optimisticId ? { ...m, id: inserted.id } : m)
        );
      }

      // Update conversation preview
      await supabase
        .from("conversations")
        .update({
          last_message_preview: text ? text.slice(0, 100) : attachmentName || "Attachment",
          last_message_at: new Date().toISOString(),
        })
        .eq("id", activeConversation.id);

      // Update connection last_message_at
      await supabase
        .from("team_connections")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConversation.connection_id);

      // Sync to thread_messages for moderator inbox
      try {
        const threadId = await ensureThread(activeConversation.connection_id, userId);
        if (threadId) {
          await supabase.from("thread_messages").insert({
            thread_id: threadId,
            sender_user_id: userId,
            sender_role: "learner",
            message_content: text || attachmentName || "Attachment",
            message_type: "normal",
            is_visible_to_learner: true,
          });

          // Update thread timestamp and status
          await supabase
            .from("conversation_threads")
            .update({ updated_at: new Date().toISOString(), current_status: "open" })
            .eq("id", threadId);

          // Thread sync succeeded = message is now in moderator's inbox → delivered
          if (inserted) {
            const deliveredAt = new Date().toISOString();
            await supabase
              .from("conversation_messages")
              .update({ delivery_status: "delivered", delivered_at: deliveredAt })
              .eq("id", inserted.id);
            // Update local state after DB confirms
            setMessages((prev) =>
              prev.map((m) =>
                m.id === inserted.id && m.delivery_status === "sent"
                  ? { ...m, delivery_status: "delivered", delivered_at: deliveredAt }
                  : m
              )
            );
          }
        }
      } catch (threadErr) {
        console.error("Failed to sync to thread:", threadErr);
      }
    } finally {
      setIsSending(false);
    }
  }, [userId, activeConversation, ensureThread]);

  // Collapse
  const collapse = useCallback(() => {
    previousView.current = view;
    setView("collapsed");
  }, [view]);

  // Expand from collapsed
  const expand = useCallback(() => {
    const target = previousView.current === "closed" || previousView.current === "collapsed" ? "list" : previousView.current;
    setView(target);
  }, []);

  const loadPastConversation = useCallback(async (conversationId: string) => {
    const { data } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(100);
    setPastMessages((data || []).reverse());
    setViewingPastConvoId(conversationId);
  }, []);

  const clearPastConversation = useCallback(() => {
    setPastMessages([]);
    setViewingPastConvoId(null);
  }, []);

  // Close
  const close = useCallback(() => {
    setView("closed");
    setActiveConnectionId(null);
    setActiveConversation(null);
    setActiveThreadId(null);
    setTypingChannelId(null);
    setMessages([]);
    setPastMessages([]);
    setViewingPastConvoId(null);
  }, []);

  // Back to list from chat
  const backToList = useCallback(() => {
    setActiveConnectionId(null);
    setActiveConversation(null);
    setActiveThreadId(null);
    setTypingChannelId(null);
    setMessages([]);
    setPastMessages([]);
    setViewingPastConvoId(null);
    setView("list");
  }, []);

  // Realtime subscription for new messages, status updates, and deletes
  useEffect(() => {
    if (!activeConversation) return;

    channelRef.current = supabase
      .channel(`messages-${activeConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.sender_id !== userId) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            // Mark as delivered then seen since chat is open
            supabase
              .from("conversation_messages")
              .update({ delivery_status: "seen", delivered_at: new Date().toISOString(), seen_at: new Date().toISOString(), is_read: true })
              .eq("id", newMsg.id)
              .then(() => {
                // Notify moderator that learner has seen this new message
                const tid = activeThreadIdRef.current;
                if (tid) emitLearnerSeenAck(tid);
              });
          } else {
            // Own message from DB — reconcile with optimistic (skip if already present by ID)
            setMessages((prev) => {
              if (prev.find((m) => m.id === newMsg.id)) return prev;
              return prev; // Already replaced via optimistic update
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          console.log("[Realtime] Message UPDATE:", updated.id, "status:", updated.delivery_status);
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== updated.id) return m;
              // Never downgrade from seen — seen is permanent
              if (m.delivery_status === "seen" || m.is_read) return m;
              return { ...m, ...updated };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "conversation_messages",
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          console.log("[Realtime] Message DELETE:", deleted.id);
          if (deleted.id) {
            setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [activeConversation, userId, emitLearnerSeenAck]);

  // Listen for seen-ack broadcast from moderator — updates tick status without needing postgres_changes
  useEffect(() => {
    if (!userId) return;

    const seenChannel = supabase
      .channel(`seen-${userId}`)
      .on("broadcast", { event: "messages_seen" }, (payload) => {
        const { seen_at, conversation_ids } = payload.payload as { seen_at: string; conversation_ids: string[] };

        // Persist to DB from learner's side — mentor-side write may fail due to RLS,
        // so learner writes their own messages to ensure blue ticks survive refresh
        if (conversation_ids?.length > 0) {
          supabase
            .from("conversation_messages")
            .update({ delivery_status: "seen", seen_at, is_read: true })
            .eq("sender_id", userId)
            .in("conversation_id", conversation_ids)
            .neq("delivery_status", "seen")
            .then(() => {});
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === userId && m.delivery_status !== "seen"
              ? { ...m, delivery_status: "seen", seen_at }
              : m
          )
        );
      })
      .subscribe();

    return () => { seenChannel.unsubscribe(); };
  }, [userId]);

  // Live unread count via broadcast — fires when any mentor sends a message to this learner
  useEffect(() => {
    if (!userId) return;
    const notifChannel = supabase
      .channel(`notif-${userId}`)
      .on("broadcast", { event: "new_unread" }, (payload) => {
        const { conversation_id, unread_count } = payload.payload as { conversation_id: string; unread_count: number };
        setConnections((prev) => {
          const next = prev.map((c) =>
            c.conversation?.id === conversation_id
              ? { ...c, conversation: { ...c.conversation!, unread_count_learner: unread_count } }
              : c
          );
          const total = next.reduce((sum, c) => sum + (c.conversation?.unread_count_learner || 0), 0);
          setTotalUnread(total);
          return next;
        });
      })
      .subscribe();
    return () => { notifChannel.unsubscribe(); };
  }, [userId]);

  // Live unread count: subscribe to conversations table so badge updates when mentor sends a message
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`conversations-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `learner_id=eq.${userId}` },
        (payload) => {
          const updated = payload.new as Conversation;
          setConnections((prev) => {
            const next = prev.map((c) =>
              c.conversation?.id === updated.id
                ? { ...c, conversation: { ...c.conversation!, ...updated } }
                : c
            );
            const total = next.reduce((sum, c) => sum + (c.conversation?.unread_count_learner || 0), 0);
            setTotalUnread(total);
            return next;
          });
        }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [userId]);

  // Session persistence
  useEffect(() => {
    if (view !== "closed") {
      sessionStorage.setItem("messaging_view", view);
      if (activeConnectionId) {
        sessionStorage.setItem("messaging_active_connection", activeConnectionId);
      }
    } else {
      sessionStorage.removeItem("messaging_view");
      sessionStorage.removeItem("messaging_active_connection");
    }
  }, [view, activeConnectionId]);

  // Restore session on mount — rehydrate chat if it was open before refresh
  useEffect(() => {
    if (hasRestoredSession.current || !userId) return;
    hasRestoredSession.current = true;

    const savedView = sessionStorage.getItem("messaging_view") as MessagingView | null;
    const savedConnectionId = sessionStorage.getItem("messaging_active_connection");

    if (!savedView || savedView === "closed") return;

    const restore = async () => {
      if (savedView === "chat" && savedConnectionId) {
        await fetchConnections();
        openChat(savedConnectionId);
      } else if (savedView === "list" || savedView === "empty") {
        openMessaging();
      } else if (savedView === "collapsed") {
        fetchConnections();
        setView("collapsed");
      }
    };
    restore();
  }, [userId, openChat, openMessaging, fetchConnections]);

  const activeConnection = connections.find((c) => c.id === activeConnectionId) || null;

  // Edit a message
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!userId || !newText.trim()) return;
    const { error } = await supabase
      .from("conversation_messages")
      .update({ message_text: newText.trim() })
      .eq("id", messageId)
      .eq("sender_id", userId);
    if (!error) {
      setMessages((prev) =>
        prev.map((m) => m.id === messageId ? { ...m, message_text: newText.trim() } : m)
      );
    }
  }, [userId]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("conversation_messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", userId);
    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }, [userId]);

  const deleteConnection = useCallback(async (connectionId: string) => {
    if (!userId) return;

    const { data: convos, error: convoLookupError } = await supabase
      .from("conversations")
      .select("id")
      .eq("connection_id", connectionId)
      .eq("learner_id", userId);

    if (convoLookupError) {
      console.error("Failed to look up conversations for deletion:", convoLookupError);
      return;
    }

    if (convos && convos.length > 0) {
      const convoIds = convos.map((c) => c.id);

      const { error: messagesDeleteError } = await supabase
        .from("conversation_messages")
        .delete()
        .in("conversation_id", convoIds);

      if (messagesDeleteError) {
        console.error("Failed to delete conversation messages:", messagesDeleteError);
        return;
      }

      const { error: conversationsDeleteError } = await supabase
        .from("conversations")
        .delete()
        .eq("connection_id", connectionId)
        .eq("learner_id", userId);

      if (conversationsDeleteError) {
        console.error("Failed to delete conversations:", conversationsDeleteError);
        return;
      }
    }

    const { error: connectionDeleteError } = await supabase
      .from("team_connections")
      .delete()
      .eq("id", connectionId)
      .eq("learner_id", userId);

    if (connectionDeleteError) {
      console.error("Failed to delete connection:", connectionDeleteError);
      return;
    }

    if (activeConnectionId === connectionId) {
      setActiveConnectionId(null);
      setActiveConversation(null);
      setMessages([]);
      setView("list");
    }

    await fetchConnections();
  }, [userId, activeConnectionId, fetchConnections]);

  // Send voice message
  const sendVoiceMessage = useCallback(async (blob: Blob, duration: number) => {
    if (!userId || !activeConversation) return;
    setIsSending(true);

    const fileName = `${userId}/${Date.now()}_voice.webm`;
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, blob, { contentType: blob.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(uploadData.path);
      const voiceUrl = urlData.publicUrl;

      const optimisticId = crypto.randomUUID();
      const optimisticMsg: ChatMessage = {
        id: optimisticId,
        conversation_id: activeConversation.id,
        sender_type: "learner",
        sender_id: userId,
        message_text: null,
        message_type: "voice",
        attachment_url: voiceUrl,
        attachment_name: "Voice message",
        is_read: false,
        created_at: new Date().toISOString(),
        delivery_status: "sent",
        voice_duration_seconds: duration,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const { data: insertedVoice } = await supabase.from("conversation_messages").insert({
        conversation_id: activeConversation.id,
        sender_type: "learner",
        sender_id: userId,
        message_text: null,
        message_type: "voice",
        attachment_url: voiceUrl,
        attachment_name: "Voice message",
        delivery_status: "sent",
      }).select().single();

      if (insertedVoice) {
        setMessages((prev) =>
          prev.map((m) => m.id === optimisticId ? { ...m, id: insertedVoice.id } : m)
        );
      }

      const now = new Date().toISOString();
      await supabase.from("conversations").update({
        last_message_preview: "🎤 Voice message",
        last_message_at: now,
      }).eq("id", activeConversation.id);

      await supabase.from("team_connections").update({ last_message_at: now }).eq("id", activeConversation.connection_id);

      // Sync to thread
      try {
        const threadId = await ensureThread(activeConversation.connection_id, userId);
        if (threadId) {
          await supabase.from("thread_messages").insert({
            thread_id: threadId,
            sender_user_id: userId,
            sender_role: "learner",
            message_content: "🎤 Voice message",
            message_type: "normal",
            is_visible_to_learner: true,
          });
          await supabase.from("conversation_threads").update({ updated_at: now, current_status: "open" }).eq("id", threadId);

          if (insertedVoice) {
            const deliveredAt = new Date().toISOString();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === insertedVoice.id && m.delivery_status === "sent"
                  ? { ...m, delivery_status: "delivered", delivered_at: deliveredAt }
                  : m
              )
            );
            await supabase.from("conversation_messages").update({ delivery_status: "delivered", delivered_at: deliveredAt }).eq("id", insertedVoice.id);
          }
        }
      } catch (e) {
        console.error("Thread sync error:", e);
      }
    } catch (err) {
      console.error("Voice upload failed:", err);
    } finally {
      setIsSending(false);
    }
  }, [userId, activeConversation, ensureThread]);

  // Send attachment/file
  const sendAttachment = useCallback(async (file: File) => {
    if (!userId || !activeConversation) return;
    setIsSending(true);

    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const isImage = file.type.startsWith("image/");

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(uploadData.path);
      const fileUrl = urlData.publicUrl;
      const msgType = isImage ? "image" : "file";

      const optimisticFileId = crypto.randomUUID();
      const optimisticMsg: ChatMessage = {
        id: optimisticFileId,
        conversation_id: activeConversation.id,
        sender_type: "learner",
        sender_id: userId,
        message_text: null,
        message_type: msgType,
        attachment_url: fileUrl,
        attachment_name: file.name,
        attachment_size: file.size,
        is_read: false,
        created_at: new Date().toISOString(),
        delivery_status: "sent",
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const { data: insertedFile } = await supabase.from("conversation_messages").insert({
        conversation_id: activeConversation.id,
        sender_type: "learner",
        sender_id: userId,
        message_text: null,
        message_type: msgType,
        attachment_url: fileUrl,
        attachment_name: file.name,
        attachment_size: file.size,
        delivery_status: "sent",
      }).select().single();

      if (insertedFile) {
        setMessages((prev) =>
          prev.map((m) => m.id === optimisticFileId ? { ...m, id: insertedFile.id } : m)
        );
      }

      const now = new Date().toISOString();
      const preview = isImage ? "📷 Photo" : `📎 ${file.name}`;
      await supabase.from("conversations").update({
        last_message_preview: preview,
        last_message_at: now,
      }).eq("id", activeConversation.id);

      await supabase.from("team_connections").update({ last_message_at: now }).eq("id", activeConversation.connection_id);

      // Sync to thread
      try {
        const threadId = await ensureThread(activeConversation.connection_id, userId);
        if (threadId) {
          await supabase.from("thread_messages").insert({
            thread_id: threadId,
            sender_user_id: userId,
            sender_role: "learner",
            message_content: preview,
            message_type: "normal",
            is_visible_to_learner: true,
          });
          await supabase.from("conversation_threads").update({ updated_at: now, current_status: "open" }).eq("id", threadId);

          if (insertedFile) {
            const deliveredAt = new Date().toISOString();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === insertedFile.id && m.delivery_status === "sent"
                  ? { ...m, delivery_status: "delivered", delivered_at: deliveredAt }
                  : m
              )
            );
            await supabase.from("conversation_messages").update({ delivery_status: "delivered", delivered_at: deliveredAt }).eq("id", insertedFile.id);
          }
        }
      } catch (e) {
        console.error("Thread sync error:", e);
      }
    } catch (err) {
      console.error("Attachment upload failed:", err);
    } finally {
      setIsSending(false);
    }
  }, [userId, activeConversation, ensureThread]);

  // Show mentor preview inside popup
  const showMentorPreview = useCallback((mentor: ResolvedOwner, context: { source_type: string; source_title: string }) => {
    setMentorPreview({ mentor, context });
    setView("mentor_preview");
    sessionStorage.setItem("messaging_view", "mentor_preview");
  }, []);

  // Reopen a resolved conversation (learner side)
  const reopenConversation = useCallback(async () => {
    if (!userId || !activeConversation) return;

    const reopenContent = "Restarted by Learner";

    // Optimistic UI: add system message immediately
    const optimisticId = crypto.randomUUID();
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      conversation_id: activeConversation.id,
      sender_type: "learner",
      sender_id: userId,
      message_text: reopenContent,
      message_type: "system",
      attachment_url: null,
      attachment_name: null,
      attachment_size: null,
      is_read: false,
      created_at: new Date().toISOString(),
      delivery_status: "sent",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    // Insert into conversation_messages (learner side)
    const { data: insertedMsg } = await supabase.from("conversation_messages").insert({
      conversation_id: activeConversation.id,
      sender_type: "learner",
      sender_id: userId,
      message_text: reopenContent,
      message_type: "system",
      delivery_status: "sent",
    }).select().single();

    if (insertedMsg) {
      setMessages((prev) => prev.map((m) => m.id === optimisticId ? { ...m, id: insertedMsg.id } : m));
    }

    // Look up thread ID via reverse cache or DB query
    const cachedThreadId = localStorage.getItem(`conv_thread_${activeConversation.id}`);
    let threadId: string | null = cachedThreadId;

    if (!threadId) {
      const { data: thread } = await supabase
        .from("conversation_threads")
        .select("id")
        .eq("learner_user_id", userId)
        .eq("current_status", "resolved")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();
      threadId = thread?.id ?? null;
    }

    if (threadId) {
      // Reopen the thread
      await supabase.from("conversation_threads")
        .update({ current_status: "open", updated_at: new Date().toISOString() })
        .eq("id", threadId);

      // Insert system_event in thread_messages visible to both
      await supabase.from("thread_messages").insert({
        thread_id: threadId,
        sender_user_id: userId,
        sender_role: "learner",
        message_content: reopenContent,
        message_type: "system_event",
        is_visible_to_learner: true,
      });
    }
  }, [userId, activeConversation]);

  return {
    view,
    connections,
    activeConnection,
    activeConversation,
    activeConversationId: activeConversation?.id || null,
    activeThreadId,
    typingChannelId,
    messages,
    isLoading,
    isSending,
    totalUnread,
    mentorPreview,
    suggestedMentor,
    openMessaging,
    openChat,
    sendMessage,
    sendVoiceMessage,
    sendAttachment,
    editMessage,
    deleteMessage,
    collapse,
    expand,
    close,
    backToList,
    setView,
    fetchConnections,
    deleteConnection,
    showMentorPreview,
    setSuggestedMentor,
    pastMessages,
    viewingPastConvoId,
    loadPastConversation,
    clearPastConversation,
    reopenConversation,
  };
}
