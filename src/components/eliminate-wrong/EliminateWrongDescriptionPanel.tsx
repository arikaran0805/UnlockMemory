/**
 * EliminateWrongDescriptionPanel
 * Left panel for the Eliminate workspace — matches PredictDescriptionPanel style.
 * Shows: Description, Explanation, Comments, Attempts tabs.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  BookOpen,
  History,
  Expand,
  Shrink,
  PanelTopClose,
  PanelTopOpen,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProblemCommentsSection } from "@/components/practice/ProblemCommentsSection";
import { useProblemComments } from "@/hooks/useProblemComments";
import type { EliminateWrongProblem, EliminateWrongAttempt } from "@/hooks/useEliminateWrongProblems";

interface Props {
  problem: EliminateWrongProblem;
  attempts: EliminateWrongAttempt[];
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const difficultyColors: Record<string, string> = {
  easy: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  hard: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

const tabTriggerClass =
  "h-11 px-0 pb-3 pt-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground flex items-center gap-1.5";

export function EliminateWrongDescriptionPanel({
  problem,
  attempts,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  activeTab: controlledActiveTab,
  onTabChange,
}: Props) {
  const [internalActiveTab, setInternalActiveTab] = useState("description");
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const setActiveTab = onTabChange ?? setInternalActiveTab;
  const [isHovered, setIsHovered] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);

  const { commentCount } = useProblemComments(problem.id || undefined);
  const alreadySolved = attempts.some((a) => a.is_correct);

  // Handle tab click in collapsed state — expand and switch tab
  const handleCollapsedTabClick = (tab: string) => {
    setActiveTab(tab);
    onToggleCollapse?.();
  };

  // Collapsed state: show all tabs in a header-only bar
  if (isCollapsed && !isExpanded) {
    return (
      <div
        className="h-full flex flex-col bg-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleCollapsedTabClick("description")}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                activeTab === "description" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <FileText className="h-4 w-4" />
              Description
            </button>
            <button
              onClick={() => handleCollapsedTabClick("explanation")}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                activeTab === "explanation" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BookOpen className="h-4 w-4" />
              Explanation
            </button>
            <button
              onClick={() => handleCollapsedTabClick("discuss")}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                activeTab === "discuss" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Comments
              {commentCount > 0 && (
                <span className="text-xs text-muted-foreground">({commentCount})</span>
              )}
            </button>
            <button
              onClick={() => handleCollapsedTabClick("attempts")}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                activeTab === "attempts" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <History className="h-4 w-4" />
              Attempts
              {attempts.length > 0 && (
                <span className="text-xs text-muted-foreground">({attempts.length})</span>
              )}
            </button>
          </div>
          <div className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            {onToggleCollapse && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="Expand panel">
                <PanelTopOpen className="h-4 w-4" />
              </Button>
            )}
            {onToggleExpand && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand} title="Fullscreen">
                <Expand className="h-4 w-4" />
              </Button>
            )}
          </div>
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
              <TabsTrigger value="description" className={tabTriggerClass}>
                <FileText className="h-4 w-4" />
                Description
              </TabsTrigger>
              <TabsTrigger value="explanation" className={tabTriggerClass}>
                <BookOpen className="h-4 w-4" />
                Explanation
              </TabsTrigger>
              <TabsTrigger value="discuss" className={tabTriggerClass}>
                <MessageSquare className="h-4 w-4" />
                Comments
                {commentCount > 0 && (
                  <span className="text-xs text-muted-foreground">({commentCount})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="attempts" className={tabTriggerClass}>
                <History className="h-4 w-4" />
                Attempts
                {attempts.length > 0 && (
                  <span className="text-xs text-muted-foreground">({attempts.length})</span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div
            className={cn(
              "flex items-center gap-0.5 shrink-0 transition-opacity",
              isHovered || isExpanded || isCollapsed ? "opacity-100" : "opacity-0"
            )}
          >
            {onToggleCollapse && !isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onToggleCollapse}
                title={isCollapsed ? "Show panel" : "Hide panel"}
              >
                <PanelTopClose className="h-4 w-4" />
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
                {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <ScrollArea className="flex-1">
        {activeTab === "description" && (
          <div className="p-5 space-y-5">
            {/* Title and Difficulty */}
            <div className="space-y-2.5">
              <h1 className="text-lg font-semibold leading-snug tracking-tight">{problem.title}</h1>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize font-medium text-[11px] h-5 px-2",
                    difficultyColors[problem.difficulty?.toLowerCase()] || difficultyColors.medium
                  )}
                >
                  {problem.difficulty}
                </Badge>
                <Badge variant="outline" className="text-[11px] capitalize h-5 px-2">
                  {problem.language}
                </Badge>
                {problem.selection_mode === "multiple" && (
                  <Badge variant="secondary" className="text-[11px] h-5 px-2">Multi-select</Badge>
                )}
                {problem.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[11px] font-normal h-5 px-2">
                    {tag}
                  </Badge>
                ))}
                {problem.tags.length > 3 && (
                  <Badge variant="secondary" className="text-[11px] font-normal h-5 px-2">
                    +{problem.tags.length - 3}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {problem.description && (
              <p className="text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
                {problem.description}
              </p>
            )}

            {/* Multi-select hint */}
            {problem.selection_mode === "multiple" && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground">
                  💡 Select <strong>all</strong> correct answers. There may be more than one.
                </p>
              </div>
            )}

            {/* Hints section */}
            {problem.hints.length > 0 && (
              <div className="space-y-2 pt-1">
                {problem.hints.slice(0, hintsShown).map((hint, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-[13px] leading-relaxed text-amber-900 dark:text-amber-200">{hint}</p>
                  </div>
                ))}
                {hintsShown < problem.hints.length && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHintsShown((h) => h + 1)}
                    className="text-amber-600 gap-1.5 h-7 text-xs"
                  >
                    <Lightbulb className="h-3.5 w-3.5" />
                    Show hint ({hintsShown + 1}/{problem.hints.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "explanation" && (
          <div className="p-5 space-y-5">
            {!alreadySolved ? (
              <div className="py-16 text-center">
                <BookOpen className="h-7 w-7 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground/70">
                  Solve the problem to view the explanation.
                </p>
              </div>
            ) : (
              <>
                {problem.explanation ? (
                  <div className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Explanation</h3>
                    <p className="text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
                      {problem.explanation}
                    </p>
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-sm text-muted-foreground/70">
                      No explanation available for this problem.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "discuss" && (
          <div className="p-5">
            <ProblemCommentsSection problemId={problem.id} />
          </div>
        )}

        {activeTab === "attempts" && (
          <div className="p-5 space-y-2.5">
            {attempts.length === 0 ? (
              <div className="py-16 text-center">
                <History className="h-7 w-7 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground/70">No attempts yet.</p>
              </div>
            ) : (
              attempts
                .slice()
                .reverse()
                .map((attempt, idx) => (
                  <div
                    key={attempt.id}
                    className={cn(
                      "rounded-md border p-3 space-y-1",
                      attempt.is_correct
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-red-500/20 bg-red-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          attempt.is_correct
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {attempt.is_correct ? "✓ Correct" : "✗ Incorrect"}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">
                        #{attempts.length - idx}
                      </span>
                    </div>
                    {attempt.score > 0 && attempt.score < 1 && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400">
                        Partial score: {Math.round(attempt.score * 100)}%
                      </span>
                    )}
                    {attempt.score === 1 && (
                      <span className="text-[11px] text-green-600 dark:text-green-400">
                        Full score
                      </span>
                    )}
                  </div>
                ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
