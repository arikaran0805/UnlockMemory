/**
 * EliminateWrongOptionsPanel
 * Option cards for selection, result feedback, and submit.
 */
import { useState, useMemo, useCallback } from "react";
import {
  Expand, Shrink, PanelTopClose, PanelTopOpen, PanelLeftOpen,
  Check, X, Send, RotateCcw, Loader2, Info, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EliminateWrongOption, EliminateWrongProblem } from "@/hooks/useEliminateWrongProblems";

interface Props {
  problem: EliminateWrongProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSubmit: (selectedIds: string[], isCorrect: boolean, score: number) => void;
  isSubmitting?: boolean;
  pastAttempts?: { is_correct: boolean }[];
  /** "left" = vertical sidebar style collapse (default for horizontal layout) */
  collapseDirection?: "top" | "left";
}

type Phase = "selecting" | "submitted";

const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function EliminateWrongOptionsPanel({
  problem,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
  onSubmit,
  isSubmitting,
  pastAttempts = [],
  collapseDirection = "top",
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>("selecting");
  const [result, setResult] = useState<{ isCorrect: boolean; score: number } | null>(null);

  // Shuffle options deterministically per problem (seed from problem id)
  const displayOptions = useMemo(() => {
    const opts = [...problem.options];
    if (problem.shuffle_options) {
      // Simple seeded shuffle using problem ID
      const seed = problem.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      for (let i = opts.length - 1; i > 0; i--) {
        const j = (seed * (i + 1) + 7) % (i + 1);
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
    }
    return opts;
  }, [problem.options, problem.shuffle_options, problem.id]);

  const correctIds = useMemo(
    () => new Set(problem.options.filter((o) => o.is_correct).map((o) => o.id)),
    [problem.options]
  );

  const toggleOption = useCallback((optionId: string) => {
    if (phase !== "selecting") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (problem.selection_mode === "single") {
        // Radio behavior
        if (next.has(optionId)) {
          next.delete(optionId);
        } else {
          next.clear();
          next.add(optionId);
        }
      } else {
        // Checkbox behavior
        if (next.has(optionId)) next.delete(optionId);
        else next.add(optionId);
      }
      return next;
    });
  }, [phase, problem.selection_mode]);

  const handleSubmit = () => {
    if (selectedIds.size === 0) return;

    const selectedArr = Array.from(selectedIds);
    const allCorrectSelected = [...correctIds].every((id) => selectedIds.has(id));
    const noWrongSelected = selectedArr.every((id) => correctIds.has(id));
    const isExactMatch = allCorrectSelected && noWrongSelected;

    let score = 0;
    if (isExactMatch) {
      score = 1;
    } else if (problem.allow_partial_credit) {
      const correctSelected = selectedArr.filter((id) => correctIds.has(id)).length;
      const wrongSelected = selectedArr.filter((id) => !correctIds.has(id)).length;
      score = Math.max(0, (correctSelected - wrongSelected) / correctIds.size);
    }

    setResult({ isCorrect: isExactMatch, score });
    setPhase("submitted");
    onSubmit(selectedArr, isExactMatch, score);
  };

  const handleRetry = () => {
    if (!problem.allow_retry) return;
    setSelectedIds(new Set());
    setResult(null);
    setPhase("selecting");
  };

  const alreadySolved = pastAttempts.some((a) => a.is_correct);
  const [isHovered, setIsHovered] = useState(false);

  if (isCollapsed) {
    // Vertical sidebar-style collapse (left direction)
    if (collapseDirection === "left") {
      return (
        <div className="h-full w-full flex flex-col items-center py-4 gap-3">
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onToggleCollapse} title="Show options">
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <div className="flex-1 flex items-center justify-center">
            <span
              className="text-sm font-medium text-muted-foreground whitespace-nowrap"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {problem.selection_mode === "single" ? "Select One" : "Select All Correct"}
              {alreadySolved ? " · Solved" : ""}
            </span>
          </div>
          <ListChecks className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      );
    }

    // Top-style collapse (horizontal header only)
    return (
      <div className="h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Answer Options</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="Show options">
          <PanelTopOpen className="h-4 w-4" />
        </Button>
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
          <ListChecks className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {problem.selection_mode === "single" ? "Select One" : "Select All Correct"}
          </span>
          {alreadySolved && (
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
              Solved
            </Badge>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered || isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="Hide options">
              <PanelTopClose className="h-4 w-4" />
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

      {/* Options */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {displayOptions.map((option, idx) => {
            const isSelected = selectedIds.has(option.id);
            const isSubmitted = phase === "submitted";
            const isCorrectOption = correctIds.has(option.id);
            const wasSelectedWrong = isSubmitted && isSelected && !isCorrectOption;
            const wasSelectedCorrect = isSubmitted && isSelected && isCorrectOption;
            const missedCorrect = isSubmitted && !isSelected && isCorrectOption;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleOption(option.id)}
                disabled={phase === "submitted"}
                className={cn(
                  "w-full text-left rounded-xl border-2 p-4 transition-all",
                  // Default
                  !isSelected && !isSubmitted && "border-border/60 hover:border-primary/40 hover:bg-muted/30",
                  // Selected during choosing
                  isSelected && !isSubmitted && "border-primary bg-primary/5 shadow-sm",
                  // Correct selected
                  wasSelectedCorrect && "border-emerald-500 bg-emerald-500/5",
                  // Wrong selected
                  wasSelectedWrong && "border-destructive bg-destructive/5",
                  // Missed correct
                  missedCorrect && "border-emerald-500/50 bg-emerald-500/5 opacity-80",
                  // Submitted but not relevant
                  isSubmitted && !isSelected && !isCorrectOption && "opacity-50",
                  phase === "submitted" && "cursor-default"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Label circle */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0",
                      !isSubmitted && isSelected && "bg-primary text-primary-foreground",
                      !isSubmitted && !isSelected && "bg-muted text-muted-foreground",
                      wasSelectedCorrect && "bg-emerald-500 text-white",
                      wasSelectedWrong && "bg-destructive text-destructive-foreground",
                      missedCorrect && "bg-emerald-500/20 text-emerald-600",
                      isSubmitted && !isSelected && !isCorrectOption && "bg-muted/50 text-muted-foreground/50"
                    )}
                  >
                    {isSubmitted ? (
                      wasSelectedCorrect || missedCorrect ? (
                        <Check className="h-4 w-4" />
                      ) : wasSelectedWrong ? (
                        <X className="h-4 w-4" />
                      ) : (
                        OPTION_LABELS[idx]
                      )
                    ) : (
                      OPTION_LABELS[idx]
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {option.content_type === "code" || option.content_type === "output" ? (
                      <pre className="text-sm font-mono bg-muted/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                        {option.content}
                      </pre>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed">{option.content}</p>
                    )}

                    {/* Explanation (shown after submit) */}
                    {isSubmitted && option.explanation && (isSelected || isCorrectOption) && (
                      <div
                        className={cn(
                          "flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed",
                          isCorrectOption
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{option.explanation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Overall explanation after submit */}
          {phase === "submitted" && problem.explanation && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-muted/30 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Explanation</h4>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {problem.explanation}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer: Submit / Result */}
      <div className="border-t border-border/50 p-4 shrink-0">
        {phase === "selecting" ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || isSubmitting}
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Submit Answer
          </Button>
        ) : (
          <div className="space-y-3">
            {/* Result banner */}
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg",
                result?.isCorrect
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {result?.isCorrect ? (
                <Check className="h-5 w-5" />
              ) : (
                <X className="h-5 w-5" />
              )}
              <div>
                <p className="font-semibold text-sm">
                  {result?.isCorrect ? "Correct!" : "Not quite right"}
                </p>
                {!result?.isCorrect && problem.allow_partial_credit && result && result.score > 0 && (
                  <p className="text-xs mt-0.5">
                    Partial score: {Math.round(result.score * 100)}%
                  </p>
                )}
              </div>
            </div>

            {/* Retry */}
            {problem.allow_retry && !result?.isCorrect && (
              <Button variant="outline" onClick={handleRetry} className="w-full gap-2">
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
