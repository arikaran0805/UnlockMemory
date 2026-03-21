import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, MessageCircle, Minus, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionEmptyState } from "./ConnectionEmptyState";
import { ConnectionList } from "./ConnectionList";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";
import { MessagingCollapsedBar } from "./MessagingCollapsedBar";
import { NewConnectionContent } from "./NewConnectionModal";
import { MentorPreviewContent } from "./MentorPreviewContent";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import type { MessagingView, ConnectionWithConversation, ChatMessage } from "@/hooks/useMessaging";
import type { ResolvedOwner } from "@/hooks/useDoubtSystem";

interface MessagingPopupProps {
  view: MessagingView;
  connections: ConnectionWithConversation[];
  activeConnection: ConnectionWithConversation | null;
  activeConversationId?: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  totalUnread: number;
  userId: string;
  lessonId?: string;
  courseId?: string;
  onOpenChat: (connectionId: string, lessonId?: string) => void;
  onSendMessage: (text: string) => void;
  onSendVoice?: (blob: Blob, duration: number) => void;
  onSendAttachment?: (file: File) => void;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onClose: () => void;
  onBackToList: () => void;
  onSetView: (view: MessagingView) => void;
  onFetchConnections: () => void;
  onDeleteConnection?: (connectionId: string) => void;
  mentorPreview?: { mentor: ResolvedOwner; context: { source_type: string; source_title: string } } | null;
  onStartMentorChat?: () => void;
}

export function MessagingPopup({
  view,
  connections,
  activeConnection,
  activeConversationId,
  messages,
  isLoading,
  isSending,
  totalUnread,
  userId,
  lessonId,
  courseId,
  onOpenChat,
  onSendMessage,
  onSendVoice,
  onSendAttachment,
  onEditMessage,
  onDeleteMessage,
  onCollapse,
  onExpand,
  onClose,
  onBackToList,
  onSetView,
  onFetchConnections,
  onDeleteConnection,
  mentorPreview,
  onStartMentorChat,
}: MessagingPopupProps) {
  const [showNewConnection, setShowNewConnection] = useState(false);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);

  // Typing indicator
  const { isOtherTyping, emitTyping, stopTyping } = useTypingIndicator(
    activeConversationId || null,
    userId
  );

  // Mark incoming messages as seen when chat is open and new messages arrive
  useEffect(() => {
    if (view !== "chat" || !activeConversationId || !userId) return;
    const unreadMessages = messages.filter(
      (m) => m.sender_id !== userId && m.delivery_status !== "seen"
    );
    if (unreadMessages.length === 0) return;

    const ids = unreadMessages.map((m) => m.id);
    supabase
      .from("conversation_messages")
      .update({ delivery_status: "seen", seen_at: new Date().toISOString(), is_read: true })
      .in("id", ids)
      .then(() => {});
  }, [view, activeConversationId, messages, userId]);

  if (view === "closed") return null;

  if (view === "collapsed") {
    return <MessagingCollapsedBar unreadCount={totalUnread} onExpand={onExpand} />;
  }

  const handleAutoConnect = async () => {
    if (!courseId) {
      setShowNewConnection(true);
      return;
    }

    setIsAutoConnecting(true);
    try {
      // Find the course with author, assigned_to, and default_senior_moderator
      const { data: course } = await supabase
        .from("courses")
        .select("author_id, assigned_to, default_senior_moderator, name")
        .eq("id", courseId)
        .single();

      if (!course) {
        setShowNewConnection(true);
        return;
      }

      let targetUserId = course.default_senior_moderator || course.assigned_to || course.author_id;

      if (!targetUserId) {
        const { data: teamAssignment } = await supabase
          .from("course_assignments")
          .select("team_id")
          .eq("course_id", courseId)
          .not("team_id", "is", null)
          .limit(1)
          .maybeSingle();

        if (teamAssignment?.team_id) {
          const { data: team } = await supabase
            .from("teams")
            .select("senior_moderator_user_id")
            .eq("id", teamAssignment.team_id)
            .single();
          targetUserId = team?.senior_moderator_user_id || null;
        }
      }

      if (!targetUserId) {
        setShowNewConnection(true);
        return;
      }

      const { data: existing } = await supabase
        .from("team_connections")
        .select("id")
        .eq("learner_id", userId)
        .eq("connected_user_id", targetUserId)
        .eq("status", "active")
        .maybeSingle();

      if (existing) {
        onFetchConnections();
        onOpenChat(existing.id, lessonId);
        return;
      }

      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", targetUserId).single(),
        supabase.from("user_roles").select("role").eq("user_id", targetUserId),
      ]);

      const profile = profileRes.data;
      const roleList = (rolesRes.data || []).map((r) => r.role);
      const roleLabel = roleList.includes("senior_moderator")
        ? "Senior Moderator"
        : roleList.includes("moderator")
          ? "Moderator"
          : "Instructor";

      const { data: newConn } = await supabase
        .from("team_connections")
        .insert({
          learner_id: userId,
          connected_user_id: targetUserId,
          connection_type: "instructor",
          display_name: profile?.full_name || "Course Instructor",
          avatar_url: profile?.avatar_url || null,
          role_label: roleLabel,
          status: "active",
        })
        .select()
        .single();

      onFetchConnections();

      if (newConn) {
        onOpenChat(newConn.id, lessonId);
      } else {
        onSetView("list");
      }
    } catch (err) {
      console.error("Auto-connect failed:", err);
      setShowNewConnection(true);
    } finally {
      setIsAutoConnecting(false);
    }
  };

  const handleNewConnection = async (type: string, name: string) => {
    await supabase.from("team_connections").insert({
      learner_id: userId,
      connection_type: type,
      display_name: name,
      role_label:
        type === "support"
          ? "Support"
          : type === "mentor"
            ? "Mentor"
            : type === "instructor"
              ? "Instructor"
              : "Team",
      status: "active",
    });
    setShowNewConnection(false);
    onFetchConnections();
    onSetView("list");
  };

  const showStandardHeader = view === "empty" || view === "list" || view === "mentor_preview" || showNewConnection;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[60]",
        "w-[360px] bg-card",
        "border border-border rounded-[22px]",
        "shadow-[0_4px_24px_hsl(var(--foreground)/0.06),0_1px_8px_hsl(var(--foreground)/0.03)]",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        view === "chat" ? "h-[520px]" : "h-[440px]"
      )}
    >
      {showStandardHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/20">
          <div className="flex items-center gap-2.5 min-w-0">
            {showNewConnection || view === "mentor_preview" ? (
              <button
                onClick={() => { setShowNewConnection(false); if (view === "mentor_preview") onSetView("list"); }}
                className="p-1.5 -ml-1 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {showNewConnection ? "New Connection" : view === "mentor_preview" ? "Ask a Doubt" : "Messaging"}
              </h3>
              {showNewConnection && (
                <p className="text-xs text-muted-foreground truncate">Choose who you'd like to connect</p>
              )}
            </div>
            {!showNewConnection && totalUnread > 0 && (
              <div className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {totalUnread}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={onCollapse}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {view === "chat" && activeConnection && !showNewConnection && (
        <ChatHeader
          connection={activeConnection}
          onBack={onBackToList}
          onCollapse={onCollapse}
          onClose={onClose}
          isOtherTyping={isOtherTyping}
        />
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {showNewConnection ? (
          <div className="flex-1 overflow-y-auto">
            <NewConnectionContent
              onConnect={handleNewConnection}
              courseId={courseId}
              userId={userId}
              onDirectConnect={async (connectionId: string) => {
                onOpenChat(connectionId, lessonId);
                setShowNewConnection(false);
                onFetchConnections();
              }}
            />
          </div>
        ) : (
          <>
            {view === "empty" && (
              <ConnectionEmptyState
                onConnectTeam={handleAutoConnect}
                isConnecting={isAutoConnecting}
              />
            )}

            {view === "list" && (
              <ConnectionList
                connections={connections}
                isLoading={isLoading}
                onSelectConnection={(id) => onOpenChat(id, lessonId)}
                onNewConnection={() => setShowNewConnection(true)}
                onDeleteConnection={onDeleteConnection}
              />
            )}

            {view === "mentor_preview" && mentorPreview && (
              <MentorPreviewContent
                mentor={mentorPreview.mentor}
                context={mentorPreview.context}
                isConnecting={isAutoConnecting}
                onStartConversation={() => onStartMentorChat?.()}
              />
            )}

            {view === "chat" && (
              <>
                <ChatMessageList
                  messages={messages}
                  currentUserId={userId}
                  isLoading={isLoading}
                  onEditMessage={onEditMessage}
                  onDeleteMessage={onDeleteMessage}
                  isOtherTyping={isOtherTyping}
                />
                <ChatComposer
                  onSend={onSendMessage}
                  onSendVoice={onSendVoice}
                  onSendAttachment={onSendAttachment}
                  isSending={isSending}
                  placeholder="Ask about this lesson..."
                  onTyping={emitTyping}
                  onStopTyping={stopTyping}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
