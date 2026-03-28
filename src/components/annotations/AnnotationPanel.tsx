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
  ChevronRight,
  Filter,
  User,
  Shield,
  Code,
  FileText,
  MessageCircle
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

  // Check if user can annotate the selected type
  const canAnnotateSelection = () => {
    if (isAdmin) return true;
    if (!isModerator) return false;
    if (!selectedText) return false;
    
    // Moderators can annotate paragraphs, code blocks, and chat bubbles
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

  // Filter annotations
  const filteredAnnotations = annotations.filter(a => {
    // Status filter
    if (filterStatus === "open" && a.status !== "open") return false;
    if (filterStatus === "resolved" && a.status === "open") return false;
    
    // Author filter - would need author role info
    if (filterAuthor === "mine" && a.author_id !== userId) return false;
    
    return true;
  });

  const openAnnotations = filteredAnnotations.filter(a => a.status === "open");
  const resolvedAnnotations = filteredAnnotations.filter(a => a.status !== "open");
  const totalOpen = annotations.filter(a => a.status === "open").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "resolved":
        return "bg-green-500/10 text-green-600 border-green-500/30";
      case "dismissed":
        return "bg-gray-500/10 text-gray-600 border-gray-500/30";
      default:
        return "";
    }
  };

  const getTypeIcon = (editorType: string, bubbleIndex: number | null) => {
    if (bubbleIndex !== null) {
      return <MessageCircle className="h-3 w-3" />;
    }
    if (editorType === "chat") {
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
            <Badge variant="destructive" className="ml-1">
              {totalOpen}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] sm:w-[560px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Annotations & Feedback
          </SheetTitle>
          <SheetDescription>
            Review comments and suggestions on this post
          </SheetDescription>
        </SheetHeader>

        {/* Toggle inline annotations */}
        {onToggleInlineAnnotations && (
          <div className="flex items-center gap-2 py-3 border-b">
            <Switch
              id="inline-annotations"
              checked={showAnnotationsInline}
              onCheckedChange={onToggleInlineAnnotations}
            />
            <Label htmlFor="inline-annotations" className="text-sm cursor-pointer">
              Show highlights in content
            </Label>
          </div>
        )}

        {/* Filters */}
        <div className="py-3 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 mb-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </Button>
          
          {showFilters && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Created by</Label>
                <Select value={filterAuthor} onValueChange={(v) => setFilterAuthor(v as FilterAuthor)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="mine">My annotations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Add annotation section */}
        {selectedText && (isAdmin || (isModerator && canAnnotateSelection())) && (
          <div className="py-4 border-b">
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Add annotation</p>
                {selectedText.type && (
                  <Badge variant="outline" className="text-xs gap-1">
                    {selectedText.type === "conversation" && <MessageCircle className="h-3 w-3" />}
                    {selectedText.type === "code" && <Code className="h-3 w-3" />}
                    {selectedText.type === "paragraph" && <FileText className="h-3 w-3" />}
                    {selectedText.type}
                  </Badge>
                )}
              </div>
              
              
              <div className="p-2 bg-primary/10 border-l-4 border-primary rounded text-sm mb-3 line-clamp-3">
                "{selectedText.text}"
              </div>
              
              <Textarea
                placeholder="Enter your feedback or suggestion..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="mb-2"
                rows={3}
                disabled={!canAnnotateSelection()}
              />
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleAddAnnotation} 
                  disabled={!newComment.trim() || !canAnnotateSelection()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Comment
                </Button>
                <Button size="sm" variant="outline" onClick={onClearSelection}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border rounded-lg animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No annotations found</p>
              {(isAdmin || isModerator) && (
                <p className="text-sm mt-2">
                  Select text in the content to add an annotation
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Open annotations */}
              {openAnnotations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    Open ({openAnnotations.length})
                  </h4>
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
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Resolved ({resolvedAnnotations.length})
                  </h4>
                  <div className="space-y-3 opacity-70">
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
  
  // Only admins can resolve/dismiss and delete
  const canResolve = isAdmin;
  const canDelete = isAdmin;
  // Everyone can reply
  const canReply = isAdmin || isModerator;

  return (
    <div 
      className={cn(
        "p-4 border rounded-lg transition-all hover:shadow-md cursor-pointer",
        annotation.status === "resolved" && "bg-muted/30"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(annotation.status)} variant="outline">
            {annotation.status}
          </Badge>
          <span className="text-muted-foreground">
            {getTypeIcon(annotation.editor_type, annotation.bubble_index)}
          </span>
          {annotation.bubble_index !== null && (
            <Badge variant="secondary" className="text-xs">
              Bubble #{annotation.bubble_index + 1}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(annotation.created_at), "MMM d, h:mm a")}
        </span>
      </div>

      {/* Selected text highlight */}
      <div 
        className="p-2 bg-primary/10 border-l-4 border-primary rounded text-sm mb-3 line-clamp-2"
        onClick={(e) => e.stopPropagation()}
      >
        "{annotation.selected_text}"
      </div>

      {/* Comment */}
      <p className="text-sm mb-3">{annotation.comment}</p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Shield className="h-3 w-3" />
        {annotation.author_profile?.full_name || annotation.author_profile?.email || "Admin"}
        {isOwnAnnotation && (
          <Badge variant="outline" className="text-xs py-0">You</Badge>
        )}
      </div>

      {/* Replies section */}
      {replyCount > 0 && (
        <Collapsible open={repliesExpanded} onOpenChange={setRepliesExpanded} className="mb-3">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-1 p-0 h-auto text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {repliesExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span className="text-xs">{replyCount} {replyCount === 1 ? 'reply' : 'replies'}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
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
        <div className="mb-3 p-3 bg-muted/50 rounded-lg space-y-2" onClick={(e) => e.stopPropagation()}>
          <Textarea
            placeholder="Write a reply..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddReply} disabled={!replyContent.trim()}>
              Reply
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setShowReplyInput(false);
              setReplyContent("");
            }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {canReply && !showReplyInput && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowReplyInput(true)}
            className="gap-1"
          >
            <Reply className="h-3 w-3" />
            Reply
          </Button>
        )}
        {canResolve && annotation.status === "open" && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(annotation.id, "resolved")}
              className="gap-1"
            >
              <CheckCircle className="h-3 w-3" />
              Resolve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(annotation.id, "dismissed")}
              className="gap-1"
            >
              <XCircle className="h-3 w-3" />
              Dismiss
            </Button>
          </>
        )}
        {canResolve && annotation.status !== "open" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateStatus(annotation.id, "open")}
          >
            Reopen
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(annotation.id)}
            className="text-destructive hover:text-destructive ml-auto"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

interface ReplyCardProps {
  reply: AnnotationReply;
  isAdmin: boolean;
  userId?: string;
  onDelete: (replyId: string) => void;
}

const ReplyCard = ({ reply, isAdmin, userId, onDelete }: ReplyCardProps) => {
  const isOwnReply = reply.author_id === userId;
  
  return (
    <div className="pl-3 border-l-2 border-primary/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm">{reply.content}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {reply.author_profile?.full_name || reply.author_profile?.email || "Learner"}
            </span>
            {isOwnReply && (
              <Badge variant="outline" className="text-xs py-0">You</Badge>
            )}
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(reply.created_at), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(reply.id)}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AnnotationPanel;