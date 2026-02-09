/**
 * EliminateWrongDescriptionPanel
 * Shows the problem prompt/question with constraints.
 */
import { Expand, Shrink, PanelLeftClose, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { EliminateWrongProblem } from "@/hooks/useEliminateWrongProblems";

interface Props {
  problem: EliminateWrongProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const difficultyColors: Record<string, string> = {
  Easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export function EliminateWrongDescriptionPanel({
  problem,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  // Collapsed state: vertical icon sidebar (matches other workspaces)
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
      className="h-full flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="h-11 flex items-center justify-between px-4 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Description</span>
          <Badge variant="outline" className={cn("text-xs", difficultyColors[problem.difficulty])}>
            {problem.difficulty}
          </Badge>
          {problem.selection_mode === "multiple" && (
            <Badge variant="secondary" className="text-xs">Multi-select</Badge>
          )}
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
      <ScrollArea className="flex-1">
        <div className="p-5 space-y-4">
          <h2 className="text-lg font-bold text-foreground">{problem.title}</h2>
          
          {problem.description && (
            <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {problem.description}
            </div>
          )}

          {problem.selection_mode === "multiple" && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="text-xs font-medium text-muted-foreground">
                💡 Select <strong>all</strong> correct answers. There may be more than one.
              </p>
            </div>
          )}

          {problem.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {problem.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
