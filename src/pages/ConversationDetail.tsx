import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useThreadDetail } from "@/hooks/useConversationThreads";
import { ThreadStatusBadge, RoutingBadge } from "@/components/messaging/ThreadStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  ArrowUpRight,
  UserPlus,
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
} from "lucide-react";
import type { SenderRole, MessageType, ThreadMessage } from "@/hooks/useConversationThreads";

const ConversationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, activeRole } = useAuth();

  const isSeniorMod = location.pathname.startsWith("/senior-moderator");
  const senderRole: SenderRole = isSeniorMod ? "senior_moderator" : "moderator";
  const backPath = isSeniorMod ? "/senior-moderator/message-requests" : "/moderator/message-requests";

  const {
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
    refetch,
  } = useThreadDetail(id, userId);

  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [showInternalNote, setShowInternalNote] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    setReplyText("");
    await sendMessage(text, senderRole, "normal", true);
  };

  const handleSendInternalNote = async () => {
    if (!internalNote.trim()) return;
    await sendMessage(internalNote, senderRole, "internal_note", false);
    setInternalNote("");
    setShowInternalNote(false);
  };

  const handleAssign = async () => {
    if (!selectedModerator) return;
    await assignToModerator(selectedModerator, assignNote || undefined);
    setSelectedModerator("");
    setAssignNote("");
    setShowAssignPanel(false);
  };

  const handleEditMessage = useCallback(async (messageId: string, newText: string) => {
    if (!userId || !newText.trim()) return;
    const { error } = await supabase
      .from("thread_messages")
      .update({ message_content: newText.trim() })
      .eq("id", messageId)
      .eq("sender_user_id", userId);
    if (!error) {
      await refetch();
    }
  }, [userId, refetch]);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!userId) return;
    await supabase
      .from("thread_messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_user_id", userId);
    await refetch();
  }, [userId, refetch]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
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
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(backPath)} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">
            {thread.learner_name}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <ThreadStatusBadge status={thread.current_status} />
            <RoutingBadge type={thread.routing_type} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        {/* Main Thread */}
        <div className="space-y-4">
          {/* Post Info */}
          {thread.post_title && (
            <Card className="border-border/30 bg-muted/20">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Related post</p>
                  <p className="text-sm font-medium text-foreground truncate">{thread.post_title}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Messages */}
          <Card className="border-border/30">
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    currentUserId={userId!}
                  />
                ))}
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Composer */}
              {!isResolved && (
                <div className="border-t border-border/30 p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply..."
                      className="min-h-[60px] resize-none bg-muted/30 border-border/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || isSending}
                      size="icon"
                      className="flex-shrink-0 self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send · Shift+Enter for new line</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Internal Note */}
          {showInternalNote && !isResolved && (
            <Card className="border-amber-200/50 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-950/10">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-600" />
                  Internal Note
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <Textarea
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Add an internal note (not visible to learner)..."
                  className="min-h-[60px] resize-none mb-2 bg-background/50 border-border/30"
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
                  <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
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
          {!isResolved && (
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

                {/* Senior Mod: assign */}
                {isSeniorMod && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-sm"
                    onClick={() => setShowAssignPanel(!showAssignPanel)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-2 text-purple-600" />
                    Assign to Moderator
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assignment Panel */}
          {showAssignPanel && isSeniorMod && !isResolved && (
            <Card className="border-purple-200/50 bg-purple-50/20 dark:border-purple-800/30 dark:bg-purple-950/10">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-purple-600" />
                  Assign to Moderator
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-3">
                <Select value={selectedModerator} onValueChange={setSelectedModerator}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Select moderator..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.user_name}
                      </SelectItem>
                    ))}
                    {teamMembers.length === 0 && (
                      <SelectItem value="none" disabled>
                        No team members found
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Textarea
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="Assignment note (optional)..."
                  className="min-h-[50px] resize-none bg-background/50"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAssign} disabled={!selectedModerator}>
                    Assign
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAssignPanel(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignment History */}
          {assignments.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Assignment History</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                {assignments.map((a) => (
                  <div key={a.id} className="text-xs text-muted-foreground border-l-2 border-border/50 pl-3 py-1">
                    <p>
                      <span className="font-medium text-foreground">{a.assigned_by_name}</span> assigned to{" "}
                      <span className="font-medium text-foreground">{a.assigned_to_name}</span>
                    </p>
                    {a.assignment_note && <p className="italic mt-0.5">{a.assignment_note}</p>}
                    <p className="text-[10px] mt-0.5">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

function MessageBubble({ message, currentUserId, onEdit, onDelete }: { message: ThreadMessage; currentUserId: string; onEdit?: (id: string, text: string) => void; onDelete?: (id: string) => void }) {
  const isOwn = message.sender_user_id === currentUserId;
  const isSystem = message.message_type === "system_event";
  const isInternal = message.message_type === "internal_note";
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message_content);
  const [showActions, setShowActions] = useState(false);

  if (isSystem) {
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
      className={cn("flex group", isOwn ? "justify-end" : "justify-start")}
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
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-2.5",
        isOwn
          ? "bg-primary text-primary-foreground rounded-br-md"
          : message.sender_role === "learner"
            ? "bg-muted/60 text-foreground rounded-bl-md"
            : "bg-blue-50 dark:bg-blue-950/20 text-foreground border border-blue-100/50 dark:border-blue-800/20 rounded-bl-md"
      )}>
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={cn(
            "text-[10px] font-semibold",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {isOwn ? "You" : message.sender_name} · {roleLabel}
          </span>
        </div>
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
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.message_content}</p>
        )}
        <p className={cn(
          "text-[10px] mt-1",
          isOwn ? "text-primary-foreground/50" : "text-muted-foreground/60"
        )}>
          {format(new Date(message.created_at), "HH:mm")}
        </p>
      </div>
    </div>
  );
}

export default ConversationDetail;
