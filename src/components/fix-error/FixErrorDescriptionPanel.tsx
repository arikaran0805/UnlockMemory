import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Lightbulb, ChevronDown, ChevronUp, Bug, Expand, Shrink,
  PanelLeftClose, FileText, ThumbsUp, ThumbsDown, Share2,
  Flag, Bookmark, Monitor, BookOpen, MessageSquare, History,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ShareTooltip from "@/components/ShareTooltip";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import type { FixErrorProblem } from "@/hooks/useFixErrorProblems";
import { useProblemReactions } from "@/hooks/useProblemReactions";
import { useProblemBookmarks } from "@/hooks/useProblemBookmarks";
import { useProblemComments } from "@/hooks/useProblemComments";
import { ProblemCommentsSection } from "@/components/practice/ProblemCommentsSection";

const difficultyColors: Record<string, string> = {
  Easy: "bg-green-500/10 text-green-600 dark:text-green-500 border-green-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20",
};

interface FixErrorDescriptionPanelProps {
  problem: FixErrorProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function FixErrorDescriptionPanel({
  problem,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  activeTab: controlledActiveTab,
  onTabChange,
}: FixErrorDescriptionPanelProps) {
  const [showHints, setShowHints] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [internalActiveTab, setInternalActiveTab] = useState("description");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;

  // Real DB hooks
  const { likes, dislikes, userReaction, react, isAuthenticated: reactionsAuth } = useProblemReactions(problem.id, "fix");
  const { isBookmarked, toggleBookmark, isAuthenticated: bookmarksAuth } = useProblemBookmarks("fix");
  const { commentCount } = useProblemComments(problem.id);
  const saved = isBookmarked(problem.id);
  const liked = userReaction === "like";
  const disliked = userReaction === "dislike";

  // Derive sample output from available data
  const sampleOutput = useMemo(() => {
    if ((problem as any).sample_output) return (problem as any).sample_output as string;
    if (problem.expected_output) return problem.expected_output;
    if (problem.test_cases.length > 0) {
      const first = problem.test_cases[0] as any;
      return first?.expected_output || null;
    }
    return null;
  }, [problem]);

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

  const handleComment = useCallback(() => {
    setActiveTab("discuss");
  }, [setActiveTab]);

  const handleSave = useCallback(async () => {
    if (!bookmarksAuth) {
      toast.error("Please sign in to save problems");
      return;
    }
    try {
      await toggleBookmark(problem.id);
    } catch {
      toast.error("Failed to save problem");
    }
  }, [toggleBookmark, problem.id, bookmarksAuth]);

  const handleFeedback = useCallback(() => {
    setReportDialogOpen(true);
  }, []);

  // Collapsed state: vertical icon sidebar
  if (isCollapsed && !isExpanded) {
    return (
      <div
        className="h-full w-7 flex flex-col bg-card group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 flex flex-col py-1">
          <button
            onClick={() => { setActiveTab("description"); onToggleCollapse?.(); }}
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
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Description
            </span>
          </button>

          <button
            onClick={() => { setActiveTab("editorial"); onToggleCollapse?.(); }}
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
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Editorial
            </span>
          </button>

          <button
            onClick={() => { setActiveTab("discuss"); onToggleCollapse?.(); }}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2",
              activeTab === "discuss"
                ? "border-primary text-foreground bg-muted/50"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span
              className="font-medium text-xs"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
                Comments
            </span>
          </button>

          <button
            onClick={() => { setActiveTab("submissions"); onToggleCollapse?.(); }}
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
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Submissions
            </span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleExpand} title="Fullscreen">
              <Expand className="h-3 w-3" />
            </Button>
          )}
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse} title="Expand panel">
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
                Comments
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

          {/* Collapse & Expand Buttons */}
          <div className="flex items-center gap-0.5 shrink-0">
            {onToggleCollapse && !isExpanded && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleCollapse}
                title={isCollapsed ? "Show panel" : "Hide panel"}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
            {onToggleExpand && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}
                title={isExpanded ? "Exit fullscreen" : "Fullscreen"}>
                {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1 min-h-0">
        {activeTab === "description" && (
          <div className="p-5 space-y-5">
            {/* Title + Difficulty + Tags */}
            <div>
              <h1 className="text-lg font-semibold text-foreground mb-2.5">{problem.title}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-xs font-medium", difficultyColors[problem.difficulty] || "")}
                >
                  {problem.difficulty}
                </Badge>
                <Badge variant="outline" className="text-xs font-mono">
                  {problem.language}
                </Badge>
                {problem.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Description */}
            {problem.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {problem.description.split("\n").map((line, i) => {
                  if (!line.trim()) return <br key={i} />;
                  if (line.startsWith("- ")) {
                    return (
                      <li key={i} className="text-sm text-foreground/90">
                        {line.slice(2)}
                      </li>
                    );
                  }
                  if (line.includes("`")) {
                    const parts = line.split(/(`[^`]+`)/g);
                    return (
                      <p key={i} className="text-sm text-foreground/90 mb-2">
                        {parts.map((part, j) =>
                          part.startsWith("`") ? (
                            <code key={j} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                              {part.slice(1, -1)}
                            </code>
                          ) : (
                            part
                          )
                        )}
                      </p>
                    );
                  }
                  return (
                    <p key={i} className="text-sm text-foreground/90 mb-2">
                      {line}
                    </p>
                  );
                })}
              </div>
            )}

            {/* Sample Output */}
            {sampleOutput && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">Sample Output</h3>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm border border-border/30">
                  <pre className="whitespace-pre-wrap">{sampleOutput}</pre>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 italic">
                  This is the expected output for the sample input. Hidden tests may use different inputs.
                </p>
              </div>
            )}

            {/* Hints */}
            {problem.hints.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowHints(!showHints)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                    showHints
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Lightbulb className={cn("h-4 w-4", showHints && "text-amber-500")} />
                  {showHints ? "Hide" : "Show"} Hints ({problem.hints.length})
                  {showHints ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showHints && (
                  <div className="space-y-2">
                    {problem.hints.map((hint, i) => (
                      <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                        <p className="text-sm text-foreground/80">
                          <span className="font-medium text-amber-600 dark:text-amber-500">
                            Hint {i + 1}:{" "}
                          </span>
                          {hint}
                        </p>
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

        {activeTab === "discuss" && (
          <ProblemCommentsSection problemId={problem.id} />
        )}

        {activeTab === "submissions" && (
          <div className="p-4">
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No submissions yet</p>
              <p className="text-xs mt-1">Submit your solution to see history</p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Engagement Footer */}
      <div className="shrink-0 border-t border-border/50 px-4 py-2 bg-muted/20">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className={cn("h-8 px-2 gap-1.5", liked && "text-primary")}
                    onClick={handleLike}
                  >
                    <ThumbsUp className={cn("h-4 w-4", liked && "fill-current")} />
                    <span className="text-xs">{likes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Like</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className={cn("h-8 px-2 gap-1.5", disliked && "text-destructive")}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className={cn("h-4 w-4", disliked && "fill-current")} />
                    <span className="text-xs">{dislikes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Dislike</p></TooltipContent>
              </Tooltip>
              <div className="w-px h-5 bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleComment}>
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Comments</p></TooltipContent>
              </Tooltip>
              <ShareTooltip title={problem.title} url={window.location.href} problemId={problem.id} problemType="fix">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Share2 className="h-4 w-4" />
                </Button>
              </ShareTooltip>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleFeedback}>
                    <Flag className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Report / Feedback</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="icon"
                    className={cn("h-8 w-8", saved && "text-primary")}
                    onClick={handleSave}
                  >
                    <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{saved ? "Unsave" : "Save"}</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      <ReportSuggestDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        contentType="problem"
        contentId={problem.id}
        contentTitle={problem.title}
        type="report"
      />
    </div>
  );
}
