import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Lightbulb, ChevronDown, ChevronUp, Bug, Expand, Shrink,
  PanelLeftClose, FileText, ThumbsUp, ThumbsDown, Share2,
  Flag, Bookmark, Monitor,
} from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ShareTooltip from "@/components/ShareTooltip";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import type { FixErrorProblem } from "@/hooks/useFixErrorProblems";
import { useProblemReactions } from "@/hooks/useProblemReactions";
import { useProblemBookmarks } from "@/hooks/useProblemBookmarks";

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
}

export function FixErrorDescriptionPanel({
  problem,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: FixErrorDescriptionPanelProps) {
  const [showHints, setShowHints] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Real DB hooks
  const { likes, dislikes, userReaction, react } = useProblemReactions(problem.id, "fix");
  const { isBookmarked, toggleBookmark } = useProblemBookmarks("fix");
  const saved = isBookmarked(problem.id);

  // Derive sample output from available data
  const sampleOutput = useMemo(() => {
    // Priority: explicit sample_output > expected_output > first visible test case
    if ((problem as any).sample_output) return (problem as any).sample_output as string;
    if (problem.expected_output) return problem.expected_output;
    if (problem.test_cases.length > 0) {
      const first = problem.test_cases[0] as any;
      return first?.expected_output || null;
    }
    return null;
  }, [problem]);

  const handleSave = useCallback(async () => {
    try {
      await toggleBookmark(problem.id);
    } catch {
      toast.error("Login required to save");
    }
  }, [toggleBookmark, problem.id]);

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
            onClick={onToggleCollapse}
            className="flex flex-col items-center gap-1 py-2.5 transition-colors border-l-2 border-primary text-foreground bg-muted/50"
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span
              className="font-medium text-xs"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              Problem
            </span>
          </button>
        </div>
        <div className="flex flex-col items-center gap-0.5 py-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleCollapse} title="Expand panel">
              <PanelLeftClose className="h-3 w-3" />
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onToggleExpand} title="Fullscreen">
              <Expand className="h-3 w-3" />
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Bug className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">Problem</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered || isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="Collapse panel">
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}
              title={isExpanded ? "Exit fullscreen" : "Fullscreen"}>
              {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
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
                    className={cn("h-8 px-2 gap-1.5", userReaction === "like" && "text-primary")}
                    onClick={() => react("like")}
                  >
                    <ThumbsUp className={cn("h-4 w-4", userReaction === "like" && "fill-current")} />
                    <span className="text-xs">{likes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Like</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className={cn("h-8 px-2 gap-1.5", userReaction === "dislike" && "text-destructive")}
                    onClick={() => react("dislike")}
                  >
                    <ThumbsDown className={cn("h-4 w-4", userReaction === "dislike" && "fill-current")} />
                    <span className="text-xs">{dislikes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Dislike</p></TooltipContent>
              </Tooltip>
              <div className="w-px h-5 bg-border mx-1" />
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