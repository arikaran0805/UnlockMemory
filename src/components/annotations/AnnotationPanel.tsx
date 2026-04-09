import { useState } from "react";
import { format } from "date-fns";
import { PostAnnotation, AnnotationReply } from "@/hooks/usePostAnnotations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  MessageSquare,
  CheckCircle,
  XCircle,
  Trash2,
  Plus,
  Reply,
  ChevronDown,
  Filter,
  Code,
  FileText,
  MessageCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnotationPanelProps {
  annotations: PostAnnotation[];
  loading: boolean;
  isAdmin: boolean;
  isModerator?: boolean;
  userId?: string;
  onAddAnnotation: (
    selectionStart: number,
    selectionEnd: number,
    selectedText: string,
    comment: string,
    annotationType?: "paragraph" | "code" | "conversation"
  ) => void;
  onUpdateStatus: (annotationId: string, status: "open" | "resolved" | "dismissed") => void;
  onDelete: (annotationId: string) => void;
  onAddReply: (annotationId: string, content: string) => void;
  onDeleteReply: (replyId: string) => void;
  selectedText?: {
    start: number;
    end: number;
    text: string;
    type?: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
  } | null;
  onClearSelection?: () => void;
  onAnnotationClick?: (annotation: PostAnnotation) => void;
  showAnnotationsInline?: boolean;
  onToggleInlineAnnotations?: (show: boolean) => void;
}

type FilterStatus = "all" | "open" | "resolved";
type FilterAuthor = "all" | "admin" | "moderator" | "mine";

const AnnotationPanel = ({
  annotations,
  loading,
  isAdmin,
  isModerator = false,
  userId,
  onAddAnnotation,
  onUpdateStatus,
  onDelete,
  onAddReply,
  onDeleteReply,
  selectedText,
  onClearSelection,
  onAnnotationClick,
  showAnnotationsInline = true,
  onToggleInlineAnnotations,
}: AnnotationPanelProps) => {
  const [newComment, setNewComment] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterAuthor, setFilterAuthor] = useState<FilterAuthor>("all");
  const [showFilters, setShowFilters] = useState(false);

  const canAnnotateSelection = () => {
    if (isAdmin) return true;
    if (!isModerator) return false;
    if (!selectedText) return false;
    return true;
  };

  const handleAddAnnotation = () => {
    if (!selectedText || !newComment.trim()) return;
    if (!canAnnotateSelection()) return;
    onAddAnnotation(
      selectedText.start,
      selectedText.end,
      selectedText.text,
      newComment.trim(),
      selectedText.type
    );
    setNewComment("");
    onClearSelection?.();
  };

  const filteredAnnotations = annotations.filter(a => {
    if (filterStatus === "open" && a.status !== "open") return false;
    if (filterStatus === "resolved" && a.status === "open") return false;
    if (filterAuthor === "mine" && a.author_id !== userId) return false;
    return true;
  });

  const openAnnotations = filteredAnnotations.filter(a => a.status === "open");
  const resolvedAnnotations = filteredAnnotations.filter(a => a.status !== "open");
  const totalOpen = annotations.filter(a => a.status === "open").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800";
      case "resolved":
        return "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800";
      case "dismissed":
        return "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700";
      default:
        return "";
    }
  };

  const getTypeIcon = (editorType: string, bubbleIndex: number | null) => {
    if (bubbleIndex !== null || editorType === "chat") {
      return <MessageCircle className="h-3 w-3" />;
    }
    return <FileText className="h-3 w-3" />;
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Annotations
          {totalOpen > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-[11px]">
              {totalOpen}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[440px] sm:w-[480px] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b bg-background">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle className="flex items-center gap-2.5 text-[17px]">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-violet-600" />
              </div>
              Annotations & Feedback
            </SheetTitle>
            <SheetDescription className="text-[13px] text-muted-foreground">
              Review comments and suggestions on this post
            </SheetDescription>
          </SheetHeader>

          {/* Toggle inline */}
          {onToggleInlineAnnotations && (
            <div className="flex items-center gap-3 mt-4 py-3 px-3.5 rounded-lg bg-muted/50 border">
              <Switch
                id="inline-annotations"
                checked={showAnnotationsInline}
                onCheckedChange={onToggleInlineAnnotations}
                className="data-[state=checked]:bg-violet-600"
              />
              <Label htmlFor="inline-annotations" className="text-sm cursor-pointer text-foreground/80 font-medium">
                Show highlights in content
              </Label>
            </div>
          )}

          {/* Filters */}
          <div className="mt-4">
            <button
              className={cn(
                "flex items-center gap-2 text-[13px] font-medium px-3 py-1.5 rounded-md transition-all",
                showFilters
                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", showFilters ? "rotate-0" : "-rotate-90")} />
            </button>

            {showFilters && (
              <div className="grid grid-cols-2 gap-3 mt-3 p-3 rounded-lg border bg-muted/30">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="open">Open only</SelectItem>
                      <SelectItem value="resolved">Resolved only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Author</Label>
                  <Select value={filterAuthor} onValueChange={(v) => setFilterAuthor(v as FilterAuthor)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All authors</SelectItem>
                      <SelectItem value="mine">My annotations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add annotation section */}
        {selectedText && (isAdmin || (isModerator && canAnnotateSelection())) && (
          <div className="px-6 py-4 border-b bg-violet-50/40 dark:bg-violet-950/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                  <Plus className="h-3 w-3 text-white" />
                </div>
                <p className="text-sm font-semibold text-foreground">Add annotation</p>
                {selectedText.type && (
                  <Badge variant="outline" className="text-[11px] gap-1 h-5 px-1.5 font-medium">
                    {selectedText.type === "conversation" && <MessageCircle className="h-2.5 w-2.5" />}
                    {selectedText.type === "code" && <Code className="h-2.5 w-2.5" />}
                    {selectedText.type === "paragraph" && <FileText className="h-2.5 w-2.5" />}
                    {selectedText.type}
                  </Badge>
                )}
              </div>
              <div className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/20 border-l-[3px] border-emerald-400 rounded-r-md text-[13px] italic text-muted-foreground line-clamp-3 font-medium">
                "{selectedText.text}"
              </div>
              <Textarea
                placeholder="Enter your feedback or suggestion..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="text-sm resize-none bg-background"
                rows={3}
                disabled={!canAnnotateSelection()}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddAnnotation}
                  disabled={!newComment.trim() || !canAnnotateSelection()}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Comment
                </Button>
                <Button size="sm" variant="outline" onClick={onClearSelection}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Annotations list */}
        <ScrollArea className="flex-1">
          <div className="px-5 py-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-xl animate-pulse bg-muted/30">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-muted" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-10 bg-muted rounded-md mb-3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : filteredAnnotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <MessageSquare className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-semibold text-foreground/70">No annotations yet</p>
                {(isAdmin || isModerator) && (
                  <p className="text-[13px] text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">
                    Select text in the content to add an annotation
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Open annotations */}
                {openAnnotations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide">
                        Open ({openAnnotations.length})
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-3">
                      {openAnnotations.map((annotation) => (
                        <AnnotationCard
                          key={annotation.id}
                          annotation={annotation}
                          isAdmin={isAdmin}
                          isModerator={isModerator}
                          userId={userId}
                          onUpdateStatus={onUpdateStatus}
                          onDelete={onDelete}
                          onAddReply={onAddReply}
                          onDeleteReply={onDeleteReply}
                          getStatusColor={getStatusColor}
                          getTypeIcon={getTypeIcon}
                          onClick={() => onAnnotationClick?.(annotation)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolved/dismissed annotations */}
                {resolvedAnnotations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide">
                        Resolved ({resolvedAnnotations.length})
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <div className="space-y-3 opacity-75">
                      {resolvedAnnotations.map((annotation) => (
                        <AnnotationCard
                          key={annotation.id}
                          annotation={annotation}
                          isAdmin={isAdmin}
                          isModerator={isModerator}
                          userId={userId}
                          onUpdateStatus={onUpdateStatus}
                          onDelete={onDelete}
                          onAddReply={onAddReply}
                          onDeleteReply={onDeleteReply}
                          getStatusColor={getStatusColor}
                          getTypeIcon={getTypeIcon}
                          onClick={() => onAnnotationClick?.(annotation)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

interface AnnotationCardProps {
  annotation: PostAnnotation;
  isAdmin: boolean;
  isModerator: boolean;
  userId?: string;
  onUpdateStatus: (id: string, status: "open" | "resolved" | "dismissed") => void;
  onDelete: (id: string) => void;
  onAddReply: (annotationId: string, content: string) => void;
  onDeleteReply: (replyId: string) => void;
  getStatusColor: (status: string) => string;
  getTypeIcon: (editorType: string, bubbleIndex: number | null) => React.ReactNode;
  onClick?: () => void;
}

const AnnotationCard = ({
  annotation,
  isAdmin,
  isModerator,
  userId,
  onUpdateStatus,
  onDelete,
  onAddReply,
  onDeleteReply,
  getStatusColor,
  getTypeIcon,
  onClick,
}: AnnotationCardProps) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [repliesExpanded, setRepliesExpanded] = useState(true);

  const handleAddReply = () => {
    if (!replyContent.trim()) return;
    onAddReply(annotation.id, replyContent.trim());
    setReplyContent("");
    setShowReplyInput(false);
  };

  const replyCount = annotation.replies?.length || 0;
  const isOwnAnnotation = annotation.author_id === userId;
  const canResolve = isAdmin;
  const canDelete = isAdmin;
  const canReply = isAdmin || isModerator;

  const authorName = annotation.author_profile?.full_name || annotation.author_profile?.email || "Admin";
  const initials = authorName.substring(0, 1).toUpperCase();

  const borderColor =
    annotation.status === "open"
      ? "border-l-amber-400"
      : annotation.status === "resolved"
      ? "border-l-emerald-400"
      : "border-l-slate-300";

  return (
    <div
      className={cn(
        "border border-border/70 bg-card rounded-xl transition-all duration-150 cursor-pointer",
        "hover:border-border hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]",
        "border-l-[3px]",
        borderColor,
        annotation.status === "resolved" && "bg-emerald-50/20 dark:bg-emerald-950/5",
        annotation.status === "dismissed" && "bg-muted/20"
      )}
      onClick={onClick}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-700 dark:text-violet-400 font-bold text-[14px] shrink-0 select-none">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[14px] text-foreground leading-none truncate">{authorName}</span>
              {isOwnAnnotation && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 leading-none shrink-0">
                  You
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[12px] text-muted-foreground">
              <span className="opacity-60">{getTypeIcon(annotation.editor_type, annotation.bubble_index)}</span>
              <span>{format(new Date(annotation.created_at), "MMM d, h:mm a")}</span>
            </div>
          </div>
          {/* Status badge — shrink-0 prevents clipping */}
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 ml-1 rounded-full px-2.5 h-6 text-[11px] font-bold capitalize border",
              getStatusColor(annotation.status)
            )}
          >
            {annotation.status}
          </Badge>
        </div>

        {/* Selected text quote */}
        <div
          className="mt-3 py-2 px-3 bg-[#f4fbf5] dark:bg-emerald-950/20 border-l-[3px] border-[#6fbf73] rounded-r-lg text-[13px] italic text-[#4a5568] dark:text-slate-300 line-clamp-3 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          "{annotation.selected_text}"
        </div>

        {/* Comment body */}
        <p className="mt-3 text-[14px] text-foreground leading-relaxed">{annotation.comment}</p>

        {/* Replies collapsible */}
        {replyCount > 0 && (
          <Collapsible open={repliesExpanded} onOpenChange={setRepliesExpanded} className="mt-4">
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-150 select-none",
                  "text-muted-foreground hover:text-foreground",
                  repliesExpanded
                    ? "bg-muted/60 hover:bg-muted"
                    : "hover:bg-muted/50"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform duration-200",
                    !repliesExpanded && "-rotate-90"
                  )}
                />
                {replyCount} {replyCount === 1 ? "reply" : "replies"}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent
              className="mt-2 space-y-1"
              onClick={(e) => e.stopPropagation()}
            >
              {annotation.replies?.map((reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  isAdmin={isAdmin}
                  userId={userId}
                  onDelete={onDeleteReply}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Reply input */}
        {showReplyInput && (
          <div
            className="mt-4 p-3 bg-muted/30 border rounded-lg space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              className="text-sm bg-background resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddReply}
                disabled={!replyContent.trim()}
                className="h-7 text-xs px-3"
              >
                Reply
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-3"
                onClick={() => {
                  setShowReplyInput(false);
                  setReplyContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions bar */}
      <div
        className="flex items-center gap-1 px-4 py-2.5 border-t border-border/60 bg-muted/20 rounded-b-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {canReply && !showReplyInput && (
          <ActionButton
            icon={<Reply className="h-3.5 w-3.5" />}
            label="Reply"
            onClick={() => setShowReplyInput(true)}
          />
        )}
        {canResolve && annotation.status === "open" && (
          <>
            <ActionButton
              icon={<CheckCircle className="h-3.5 w-3.5" />}
              label="Resolve"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
              onClick={() => onUpdateStatus(annotation.id, "resolved")}
            />
            <ActionButton
              icon={<XCircle className="h-3.5 w-3.5" />}
              label="Dismiss"
              onClick={() => onUpdateStatus(annotation.id, "dismissed")}
            />
          </>
        )}
        {canResolve && annotation.status !== "open" && (
          <ActionButton
            icon={<RotateCcw className="h-3.5 w-3.5" />}
            label="Reopen"
            onClick={() => onUpdateStatus(annotation.id, "open")}
          />
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(annotation.id)}
            className="ml-auto flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150"
            title="Delete annotation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

const ActionButton = ({
  icon,
  label,
  onClick,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-150",
      "text-muted-foreground hover:text-foreground hover:bg-muted",
      className
    )}
  >
    {icon}
    {label}
  </button>
);

interface ReplyCardProps {
  reply: AnnotationReply;
  isAdmin: boolean;
  userId?: string;
  onDelete: (replyId: string) => void;
}

const ReplyCard = ({ reply, isAdmin, userId, onDelete }: ReplyCardProps) => {
  const isOwnReply = reply.author_id === userId;
  const authorName = reply.author_profile?.full_name || reply.author_profile?.email || "Learner";
  const initials = authorName.substring(0, 1).toUpperCase();

  return (
    <div className="flex items-start gap-2.5 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors duration-150 group">
      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-[10px] shrink-0 mt-0.5">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground leading-relaxed">{reply.content}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] font-semibold text-muted-foreground">{authorName}</span>
          {isOwnReply && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-border text-muted-foreground leading-none">
              You
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/50">·</span>
          <span className="text-[11px] text-muted-foreground/70">
            {format(new Date(reply.created_at), "MMM d, h:mm a")}
          </span>
        </div>
      </div>
      {isAdmin && (
        <button
          onClick={() => onDelete(reply.id)}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150 shrink-0 mt-0.5"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default AnnotationPanel;
