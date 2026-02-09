import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, ChevronDown, ChevronUp, FileText, BookOpen, History, ThumbsUp, ThumbsDown, Share2, MessageSquare, Flag, Bookmark, Expand, Shrink, PanelLeftClose, Check, X, Clock } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import ShareTooltip from "@/components/ShareTooltip";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import { useProblemReactions } from "@/hooks/useProblemReactions";
import { useProblemBookmarks } from "@/hooks/useProblemBookmarks";
import { useProblemComments } from "@/hooks/useProblemComments";
import { ProblemCommentsSection } from "./ProblemCommentsSection";
import { RichTextRenderer } from "@/components/tiptap/RichTextRenderer";

interface Example {
  id: number;
  input: string;
  output: string;
  explanation?: string;
}

interface Submission {
  id: string;
  code: string;
  language: string;
  status: "accepted" | "wrong_answer" | "runtime_error" | "time_limit_exceeded" | "compilation_error";
  passed_count: number;
  total_count: number;
  runtime_ms: number;
  submitted_at: string;
}

interface ProblemDescriptionPanelProps {
  title: string;
  difficulty: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: Example[];
  constraints: string[];
  hints?: string[];
  tags?: string[];
  problemId?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  submissions?: Submission[];
  onViewSubmission?: (submission: Submission) => void;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  hard: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export function ProblemDescriptionPanel({
  title,
  difficulty,
  description,
  inputFormat,
  outputFormat,
  examples,
  constraints,
  hints = [],
  tags = [],
  problemId = "",
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  activeTab: controlledActiveTab,
  onTabChange,
  submissions = [],
  onViewSubmission,
}: ProblemDescriptionPanelProps) {
  const [hintsExpanded, setHintsExpanded] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState("description");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;
  const [isHovered, setIsHovered] = useState(false);

  // Dialog states
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Database-backed reactions, bookmarks, and comments
  const { likes, dislikes, userReaction, react, isAuthenticated: reactionsAuth } = useProblemReactions(problemId || undefined);
  const { isBookmarked, toggleBookmark, isAuthenticated: bookmarksAuth } = useProblemBookmarks();
  const { commentCount } = useProblemComments(problemId || undefined);

  const saved = problemId ? isBookmarked(problemId) : false;
  const liked = userReaction === "like";
  const disliked = userReaction === "dislike";

  // Handlers - must be defined before early return
  const handleLike = useCallback(() => {
    if (!reactionsAuth) {
      toast.error("Please sign in to react");
      return;
    }
    react("like");
    if (!liked) toast.success("Thanks for the feedback!");
  }, [react, liked, reactionsAuth]);

  const handleDislike = useCallback(() => {
    if (!reactionsAuth) {
      toast.error("Please sign in to react");
      return;
    }
    react("dislike");
    if (!disliked) toast.success("Thanks for the feedback!");
  }, [react, disliked, reactionsAuth]);

  // Share is handled by ShareTooltip directly

  const handleComment = useCallback(() => {
    setActiveTab("discuss");
  }, [setActiveTab]);

  const handleFeedback = useCallback(() => {
    setReportDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!problemId) {
      toast.error("Cannot save - no problem ID");
      return;
    }
    if (!bookmarksAuth) {
      toast.error("Please sign in to save problems");
      return;
    }
    try {
      const newSaved = await toggleBookmark(problemId);
      toast.success(newSaved ? "Saved to your collection" : "Removed from saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save problem");
    }
  }, [problemId, toggleBookmark, bookmarksAuth]);

  // Collapsed state: vertical tabs layout like LeetCode
  if (isCollapsed && !isExpanded) {
    return (
      <div 
        className="h-full w-7 flex flex-col bg-card group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Vertical tabs */}
        <div className="flex-1 flex flex-col py-1">
          <button
            onClick={() => setActiveTab("description")}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2",
              activeTab === "description" 
                ? "border-primary text-foreground bg-muted/50" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span 
              className="font-medium text-xs"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Description
            </span>
          </button>

          <button
            onClick={() => setActiveTab("editorial")}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2",
              activeTab === "editorial" 
                ? "border-primary text-foreground bg-muted/50" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span 
              className="font-medium text-xs"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Editorial
            </span>
          </button>

          <button
            onClick={() => setActiveTab("submissions")}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2",
              activeTab === "submissions" 
                ? "border-primary text-foreground bg-muted/50" 
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <History className="h-4 w-4 shrink-0" />
            <span 
              className="font-medium text-xs"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Submissions
            </span>
          </button>
        </div>

        {/* Bottom buttons - Show on hover only */}
        <div className="flex flex-col items-center gap-0.5 py-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleExpand}
              title="Fullscreen"
            >
              <Expand className="h-3 w-3" />
            </Button>
          )}
          
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onToggleCollapse}
              title="Expand panel"
            >
              <PanelLeftClose className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full flex flex-col bg-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tab Header */}
      <div className="border-b border-border/50 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="h-11 bg-transparent p-0 gap-4">
              <TabsTrigger 
                value="description" 
                className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
              >
                <FileText className="h-4 w-4" />
                Description
              </TabsTrigger>
              <TabsTrigger 
                value="editorial" 
                className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
              >
                <BookOpen className="h-4 w-4" />
                Editorial
              </TabsTrigger>
              <TabsTrigger 
                value="discuss" 
                className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                Discuss
                {commentCount > 0 && (
                  <span className="text-xs text-muted-foreground">({commentCount})</span>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="submissions" 
                className="h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5"
              >
                <History className="h-4 w-4" />
                Submissions
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Collapse & Expand Buttons - Show on hover */}
          <div className={cn(
            "flex items-center gap-0.5 shrink-0 transition-opacity",
            isHovered || isExpanded || isCollapsed ? "opacity-100" : "opacity-0"
          )}>
              {onToggleCollapse && !isExpanded && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleCollapse}
                  title={isCollapsed ? "Show panel" : "Hide panel"}
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              )}
              {onToggleExpand && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleExpand}
                  title={isExpanded ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isExpanded ? (
                    <Shrink className="h-4 w-4" />
                  ) : (
                    <Expand className="h-4 w-4" />
                  )}
                </Button>
              )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        {activeTab === "description" && (
          <div className="p-4 space-y-6">
            {/* Title and Difficulty */}
            <div className="space-y-3">
              <h1 className="text-xl font-semibold">{title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "capitalize font-medium",
                    difficultyColors[difficulty?.toLowerCase()] || difficultyColors.medium
                  )}
                >
                  {difficulty}
                </Badge>
                {tags.map((tag, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="text-xs font-normal"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <RichTextRenderer 
                content={description} 
                emptyPlaceholder=""
              />
            </div>

            {/* Input Format */}
            {inputFormat && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Input Format:</h3>
                <div className="bg-muted/30 rounded-lg p-3 prose prose-sm dark:prose-invert max-w-none">
                  <RichTextRenderer content={inputFormat} emptyPlaceholder="" />
                </div>
              </div>
            )}

            {/* Output Format */}
            {outputFormat && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Output Format:</h3>
                <div className="bg-muted/30 rounded-lg p-3 prose prose-sm dark:prose-invert max-w-none">
                  <RichTextRenderer content={outputFormat} emptyPlaceholder="" />
                </div>
              </div>
            )}

            {/* Examples */}
            {examples.length > 0 && (
              <div className="space-y-4">
                {examples.map((example) => (
                  <div key={example.id} className="space-y-2">
                    <h3 className="text-sm font-medium">Example {example.id}:</h3>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2 font-mono text-sm">
                      <div>
                        <span className="text-muted-foreground">Input: </span>
                        <span className="text-foreground">{example.input}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Output: </span>
                        <span className="text-foreground">{example.output}</span>
                      </div>
                      {example.explanation && (
                        <div className="pt-2 border-t border-border/50">
                          <span className="text-muted-foreground">Explanation: </span>
                          <span className="text-foreground/80 font-sans">{example.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Constraints */}
            {constraints.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Constraints:</h3>
                <ul className="space-y-1.5">
                  {constraints.map((constraint, i) => (
                    <li 
                      key={i} 
                      className="text-sm text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-foreground/50 mt-0.5">•</span>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {constraint}
                      </code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hints */}
            {hints.length > 0 && (
              <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg overflow-hidden">
                <button
                  onClick={() => setHintsExpanded(!hintsExpanded)}
                  className="w-full flex items-center justify-between p-3 hover:bg-amber-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Lightbulb className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {hints.length} Hint{hints.length > 1 ? 's' : ''} Available
                    </span>
                  </div>
                  {hintsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  )}
                </button>
                {hintsExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {hints.map((hint, i) => (
                      <div 
                        key={i}
                        className="p-3 bg-amber-500/10 rounded-md text-sm text-foreground/80"
                      >
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          Hint {i + 1}:
                        </span>{' '}
                        {hint}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "editorial" && (
          <div className="p-4">
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Editorial coming soon</p>
            </div>
          </div>
        )}

        {activeTab === "discuss" && problemId && (
          <ProblemCommentsSection problemId={problemId} />
        )}

        {activeTab === "discuss" && !problemId && (
          <div className="p-4">
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Comments unavailable</p>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="p-0">
            {submissions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No submissions yet</p>
                <p className="text-xs mt-1">Submit your solution to see history</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_100px_90px_140px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                  <span></span>
                  <span>Status</span>
                  <span>Language</span>
                  <span>Runtime</span>
                  <span>Date & Time</span>
                </div>
                {/* Rows */}
                {submissions.map((submission, index) => {
                  const isAccepted = submission.status === "accepted";
                  const statusColors = {
                    accepted: "text-green-600 dark:text-green-500",
                    wrong_answer: "text-red-600 dark:text-red-500",
                    runtime_error: "text-red-600 dark:text-red-500",
                    time_limit_exceeded: "text-amber-600 dark:text-amber-500",
                    compilation_error: "text-red-600 dark:text-red-500",
                  };
                  const statusLabels = {
                    accepted: "Accepted",
                    wrong_answer: "Wrong Answer",
                    runtime_error: "Runtime Error",
                    time_limit_exceeded: "Time Limit Exceeded",
                    compilation_error: "Compilation Error",
                  };
                  
                  // Format the date
                  const submittedDate = new Date(submission.submitted_at);

                  // Language display name mapping
                  const languageLabels: Record<string, string> = {
                    python: "Python",
                    javascript: "JavaScript",
                    typescript: "TypeScript",
                    java: "Java",
                    cpp: "C++",
                    c: "C",
                    go: "Go",
                    rust: "Rust",
                  };
                  
                  return (
                    <button
                      key={submission.id}
                      onClick={() => onViewSubmission?.(submission)}
                      className="w-full text-left grid grid-cols-[40px_1fr_100px_90px_140px] gap-2 px-4 py-3 hover:bg-muted/50 transition-colors items-center"
                    >
                      {/* Row number */}
                      <span className="text-sm text-muted-foreground">
                        {submissions.length - index}
                      </span>
                      
                      {/* Status */}
                      <div className="flex flex-col gap-0.5">
                        <span className={cn("text-sm font-medium", statusColors[submission.status])}>
                          {statusLabels[submission.status]}
                        </span>
                      </div>
                      
                      {/* Language badge */}
                      <div>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {languageLabels[submission.language] || submission.language}
                        </Badge>
                      </div>
                      
                      {/* Runtime */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{submission.runtime_ms} ms</span>
                      </div>
                      
                      {/* Date & Time */}
                      <div className="text-xs text-muted-foreground">
                        <div>{format(submittedDate, "MMM d, yyyy")}</div>
                        <div>{format(submittedDate, "h:mm a")}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Engagement Footer */}
      <div className="shrink-0 border-t border-border/50 px-4 py-2 bg-muted/20">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* Like */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 gap-1.5",
                      liked && "text-primary"
                    )}
                    onClick={handleLike}
                  >
                    <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
                    <span className="text-xs">{likes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Like</p>
                </TooltipContent>
              </Tooltip>

              {/* Dislike */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-2 gap-1.5",
                      disliked && "text-destructive"
                    )}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className={cn("h-4 w-4", disliked && "fill-current")} />
                    <span className="text-xs">{dislikes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Dislike</p>
                </TooltipContent>
              </Tooltip>

              <div className="w-px h-5 bg-border mx-1" />

              {/* Comment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleComment}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Comments</p>
                </TooltipContent>
              </Tooltip>

              {/* Share - with ShareTooltip */}
              <ShareTooltip
                title={title}
                url={window.location.href}
                problemId={problemId}
                problemType="solve"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </ShareTooltip>
            </div>

            <div className="flex items-center gap-1">
              {/* Feedback */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleFeedback}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Report / Feedback</p>
                </TooltipContent>
              </Tooltip>

              {/* Save */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8",
                      saved && "text-primary"
                    )}
                    onClick={handleSave}
                  >
                    <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{saved ? "Unsave" : "Save"}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Report Dialog */}
      <ReportSuggestDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        contentType="problem"
        contentId={problemId}
        contentTitle={title}
        type="report"
      />
    </div>
  );
}
