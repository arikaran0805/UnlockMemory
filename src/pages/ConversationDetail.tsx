import { useEffect, useLayoutEffect, useCallback, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useThreadDetail } from "@/hooks/useConversationThreads";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { ThreadStatusBadge, RoutingBadge } from "@/components/messaging/ThreadStatusBadge";
import { ChatComposer } from "@/components/messaging/ChatComposer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UMLoader from "@/components/UMLoader";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  ArrowUpRight,
  StickyNote,
  User,
  Clock,
  FileText,
  Users,
  MessageCircle,
  Pencil,
  Trash2,
  X,
  Check,
  CheckCheck,
} from "lucide-react";
import type { SenderRole, ThreadMessage } from "@/hooks/useConversationThreads";

const ConversationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId } = useAuth();

  const isSeniorMod = location.pathname.startsWith("/senior-moderator");
  const senderRole: SenderRole = isSeniorMod ? "senior_moderator" : "moderator";
  const backPath = isSeniorMod ? "/senior-moderator/message-requests" : "/moderator/message-requests";

  const {
    thread,
    messages,
    isLoading,
    isSending,
    learnerSeenAt,
    sendMessage,
    escalateToSenior,
    markResolved,
    markUnresolved,
  } = useThreadDetail(id, userId);

  const [internalNote, setInternalNote] = useState("");
  const [showInternalNote, setShowInternalNote] = useState(false);
  const [doubtContext, setDoubtContext] = useState<{ lessonTitle?: string; courseName?: string; careerName?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const prevMsgCount = useRef(0);
  const isAtBottomRef = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Deterministic channel key: sorted [learnerId, moderatorId] — matches learner's MessagingPopup
  const typingChannelId = useMemo(() => {
    if (!thread?.learner_user_id || !userId) return null;
    return [thread.learner_user_id, userId].sort().join("-");
  }, [thread?.learner_user_id, userId]);

  const { isOtherTyping, emitTyping, stopTyping } = useTypingIndicator(typingChannelId, userId);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setPendingCount(0);
  }, []);

  // Track scroll position — depends on isLoading so the listener attaches after the container renders
  useEffect(() => {
    if (isLoading) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 80;
      isAtBottomRef.current = atBottom;
      setShowScrollDown(!atBottom);
      if (atBottom) setPendingCount(0);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  // Smart scroll: initial instant jump, then smart on new messages
  useLayoutEffect(() => {
    if (isLoading) {
      hasInitialScrolled.current = false;
      prevMsgCount.current = 0;
      return;
    }
    if (messages.length === 0) return;

    if (!hasInitialScrolled.current) {
      scrollToBottom("instant" as ScrollBehavior);
      hasInitialScrolled.current = true;
      prevMsgCount.current = messages.length;
      return;
    }

    if (messages.length <= prevMsgCount.current) return;
    const newCount = messages.length - prevMsgCount.current;
    prevMsgCount.current = messages.length;

    const lastMsg = messages[messages.length - 1];
    const isOwn = lastMsg?.sender_user_id === userId;

    if (isAtBottomRef.current || isOwn) {
      scrollToBottom("smooth");
    } else {
      setPendingCount((prev) => prev + newCount);
    }
  }, [isLoading, messages.length, userId, scrollToBottom]);

  // Keep typing indicator in view if already at bottom
  useEffect(() => {
    if (isOtherTyping && isAtBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [isOtherTyping, scrollToBottom]);

  // Fetch course/lesson/career context from the thread's post
  useEffect(() => {
    if (!thread?.post_id) return;
    const fetchContext = async () => {
      const { data: post } = await supabase
        .from("posts")
        .select("lesson_id")
        .eq("id", thread.post_id!)
        .single();
      if (!post?.lesson_id) return;

      const { data: lesson } = await supabase
        .from("course_lessons")
        .select("title, course_id")
        .eq("id", post.lesson_id)
        .single();
      if (!lesson) return;

      const ctx: { lessonTitle?: string; courseName?: string; careerName?: string } = {
        lessonTitle: lesson.title,
      };

      if (lesson.course_id) {
        const { data: course } = await supabase
          .from("courses")
          .select("name")
          .eq("id", lesson.course_id)
          .single();
        if (course) ctx.courseName = course.name;

        const { data: careerLink } = await supabase
          .from("career_courses")
          .select("career_id")
          .eq("course_id", lesson.course_id)
          .maybeSingle();
        if (careerLink?.career_id) {
          const { data: career } = await supabase
            .from("careers")
            .select("name")
            .eq("id", careerLink.career_id)
            .single();
          if (career) ctx.careerName = career.name;
        }
      }
      setDoubtContext(ctx);
    };
    fetchContext();
  }, [thread?.post_id]);

  const handleSendReply = useCallback(async (text: string) => {
    if (!text.trim()) return;
    stopTyping();
    await sendMessage(text.trim(), senderRole, "normal", true);
  }, [stopTyping, sendMessage, senderRole]);

  const handleSendAttachment = useCallback(async (file: File) => {
    if (!userId) return;
    const isImage = file.type.startsWith("image/");
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { data: uploadData, error } = await supabase.storage
      .from("chat-attachments")
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) { console.error("Upload failed:", error); return; }
    const { data: urlData } = supabase.storage.from("chat-attachments").getPublicUrl(uploadData.path);
    stopTyping();
    await sendMessage(
      "",
      senderRole,
      "normal",
      true,
      { url: urlData.publicUrl, name: file.name, size: file.size, msgType: isImage ? "image" : "file" }
    );
  }, [userId, senderRole, sendMessage, stopTyping]);

  const handleSendInternalNote = async () => {
    if (!internalNote.trim()) return;
    await sendMessage(internalNote, senderRole, "internal_note", false);
    setInternalNote("");
    setShowInternalNote(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <UMLoader size={56} dark label="Loading…" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-muted-foreground">Conversation not found</p>
        <Button variant="outline" onClick={() => navigate(backPath)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to inbox
        </Button>
      </div>
    );
  }

  const isResolved = thread.current_status === "resolved";

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conversation Detail</h1>
          <p className="text-muted-foreground">Manage direct messages and support threads with learners</p>
        </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        {/* Main Thread */}
        <div className="space-y-4">
          {/* Messages */}
          <Card className="border-border/30">
            <CardContent className="p-0">
              {/* Chat header — WhatsApp style */}
              <div className="flex items-center gap-3 px-3 py-2.5 border-b border-border/30">
                <button
                  onClick={() => navigate(backPath)}
                  className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
                  {thread.learner_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">{thread.learner_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <ThreadStatusBadge status={thread.current_status} />
                    <RoutingBadge type={thread.routing_type} />
                  </div>
                </div>
              </div>

              {/* Doubt context banner — shows mentor what this doubt is about */}
              {(doubtContext || thread.post_title) && (
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/20 flex-wrap">
                  {thread.post_title && (
                    <>
                      <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-[11px] text-muted-foreground font-medium">{thread.post_title}</span>
                    </>
                  )}
                </div>
              )}
              {doubtContext && (
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-muted/20 flex-wrap">
                  {doubtContext.careerName && (
                    <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{doubtContext.careerName}</span>
                  )}
                  {doubtContext.careerName && doubtContext.courseName && (
                    <span className="text-[11px] text-muted-foreground/40">›</span>
                  )}
                  {doubtContext.courseName && (
                    <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{doubtContext.courseName}</span>
                  )}
                  {doubtContext.courseName && doubtContext.lessonTitle && (
                    <span className="text-[11px] text-muted-foreground/40">›</span>
                  )}
                  {doubtContext.lessonTitle && (
                    <span className="text-[11px] text-foreground/70 font-medium bg-primary/8 px-2 py-0.5 rounded-full">{doubtContext.lessonTitle}</span>
                  )}
                </div>
              )}
              <div className="relative">
                <div ref={messagesContainerRef} className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && !isResolved && (
                    <div className="text-center py-8">
                      <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                    </div>
                  )}
                  {messages.map((msg, idx) => {
                    const messagesAfter = messages.slice(idx + 1);
                    const isSystemResolved = msg.message_type === "system_event" &&
                      msg.message_content === "Conversation marked as resolved";

                    let showReopen = false;
                    let hideMessage = false;

                    if (isSystemResolved) {
                      // Show reopen button ONLY if no messages come after it (it's the very latest message)
                      showReopen = messagesAfter.length === 0;
                      
                      // Hide the resolved break line entirely if there's a subsequent "reopened" message
                      const hasReopenedAfter = messagesAfter.some(m =>
                        m.message_type === "system_event" &&
                        m.message_content.includes("Restarted")
                      );
                      if (hasReopenedAfter) {
                        hideMessage = true;
                      }
                    }

                    if (hideMessage) return null;

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        currentUserId={userId!}
                        learnerSeenAt={learnerSeenAt}
                        onReopen={showReopen ? () => markUnresolved(senderRole) : undefined}
                      />
                    );
                  })}
                  {isOtherTyping && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                      </div>
                      <span>Learner is typing…</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Smart scroll FAB */}
                {(showScrollDown || pendingCount > 0) && (
                  <button
                    onClick={() => scrollToBottom("smooth")}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card border border-border/50 shadow-md flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 z-10"
                    aria-label="Scroll to bottom"
                  >
                    {isOtherTyping ? (
                      <div className="flex gap-0.5 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                      </div>
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-bold text-primary leading-none">
                        {pendingCount > 99 ? "99+" : pendingCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Reply Composer */}
              <ChatComposer
                onSend={handleSendReply}
                onSendAttachment={handleSendAttachment}
                isSending={isSending}
                placeholder="Type your reply..."
                onTyping={emitTyping}
                onStopTyping={stopTyping}
              />
            </CardContent>
          </Card>

          {/* Internal Note */}
          {showInternalNote && (
            <Card className="border-amber-200/50 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-950/10">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-600" />
                  Internal Note
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <textarea
                  value={internalNote}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInternalNote(e.target.value)}
                  placeholder="Add an internal note (not visible to learner)..."
                  className="w-full min-h-[60px] resize-none mb-2 bg-background/50 border border-border/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSendInternalNote} disabled={!internalNote.trim()}>
                    Add Note
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowInternalNote(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Thread Info */}
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Learner:</span>
                <span className="font-medium text-foreground">{thread.learner_name}</span>
              </div>
              {thread.team_name && (
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Team:</span>
                  <span className="font-medium text-foreground">{thread.team_name}</span>
                </div>
              )}
              {thread.assigned_moderator_name && (
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned:</span>
                  <span className="font-medium text-foreground">{thread.assigned_moderator_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="text-foreground">{format(new Date(thread.created_at), "MMM d, HH:mm")}</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card className="border-border/30">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-sm"
                onClick={() => markResolved(senderRole)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-green-600" />
                Mark as Resolved
              </Button>

              {!showInternalNote && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => setShowInternalNote(true)}
                >
                  <StickyNote className="h-3.5 w-3.5 mr-2 text-amber-600" />
                  Add Internal Note
                </Button>
              )}

              {/* Moderator: escalate */}
              {!isSeniorMod && thread.routing_type === "team_senior_moderator" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={escalateToSenior}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 mr-2 text-amber-600" />
                  Forward to Senior Moderator
                </Button>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

function MessageBubble({ message, currentUserId, learnerSeenAt, onEdit, onDelete, onReopen }: { message: ThreadMessage; currentUserId: string; learnerSeenAt?: string | null; onEdit?: (id: string, text: string) => void; onDelete?: (id: string) => void; onReopen?: () => void }) {
  const isOwn = message.sender_user_id === currentUserId;
  const isSystem = message.message_type === "system_event";
  const isInternal = message.message_type === "internal_note";
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message_content);
  const [showActions, setShowActions] = useState(false);

  if (isSystem) {
    const isResolvedEvent = message.message_content === "Conversation marked as resolved";
    const isRestartedEvent = message.message_content.includes("Restarted");
    if (isResolvedEvent) {
      return (
        <div className="flex flex-col items-center py-4">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-800/40" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 flex-shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                Resolved by {message.sender_name} · {format(new Date(message.created_at), "MMM d, HH:mm")}
              </span>
            </div>
            <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-800/40" />
          </div>
          {onReopen && (
            <div className="mt-3">
              <button
                onClick={onReopen}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
              >
                <ArrowUpRight className="h-3 w-3" />
                Add past doubt tips; else start new.
              </button>
            </div>
          )}
        </div>
      );
    }
    if (isRestartedEvent) {
      return (
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/40" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 flex-shrink-0">
            <ArrowUpRight className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
              {message.message_content}
            </span>
          </div>
          <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/40" />
        </div>
      );
    }
    return (
      <div className="flex justify-center py-1">
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
          {message.message_content}
        </span>
      </div>
    );
  }

  if (isInternal) {
    return (
      <div className="flex justify-center py-1">
        <div className="max-w-[85%] bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/30 dark:border-amber-800/20 rounded-lg px-3 py-2">
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mb-0.5">
            <StickyNote className="h-3 w-3" />
            Internal Note — {message.sender_name}
          </p>
          <p className="text-xs text-foreground">{message.message_content}</p>
        </div>
      </div>
    );
  }

  const roleLabel = message.sender_role === "learner"
    ? "Learner"
    : message.sender_role === "senior_moderator"
      ? "Senior Moderator"
      : "Moderator";

  return (
    <div
      className={cn("flex mb-2 group relative", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!isEditing) setShowActions(false); }}
    >
      {/* Action buttons for own messages */}
      {isOwn && showActions && !isEditing && (
        <div className="flex items-center gap-0.5 mr-1 self-center">
          {onEdit && (
            <button
              onClick={() => { setIsEditing(true); setEditText(message.message_content); }}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-0.5 max-w-[80%]">
        <div className={cn(
          "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed transition-shadow duration-200",
          isOwn
            ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-gray-900 dark:text-gray-100 rounded-br-lg"
            : "bg-muted/50 text-foreground rounded-bl-lg border border-border/20"
        )}>
          {!isOwn && (
            <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">
              {message.sender_name} · {roleLabel}
            </p>
          )}
          {isEditing ? (
            <div className="space-y-1.5">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-background/80 text-foreground text-sm rounded-lg px-2 py-1.5 border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                rows={2}
                autoFocus
              />
              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (editText.trim() && onEdit) {
                      onEdit(message.id, editText.trim());
                      setIsEditing(false);
                    }
                  }}
                  className="p-1 rounded-md hover:bg-primary/20 text-primary"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.message_content}</p>
          )}
          <div className={cn(
            "flex items-center justify-end gap-1 mt-1",
            isOwn ? "text-gray-500 dark:text-gray-400" : "text-muted-foreground"
          )}>
            <span className="text-[10px]">{format(new Date(message.created_at), "HH:mm")}</span>
            {isOwn && (() => {
              const seenByLearner = learnerSeenAt
                ? new Date(message.created_at) <= new Date(learnerSeenAt)
                : false;
              return seenByLearner
                ? <CheckCheck className="h-3 w-3 text-[#34B7F1]" />
                : <CheckCheck className="h-3 w-3 text-gray-400" />;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationDetail;
