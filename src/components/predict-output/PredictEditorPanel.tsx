/**
 * PredictEditorPanel
 * Right column for the Predict workspace.
 * Top: "Your Output" — full-bleed textarea, no nested containers.
 * Bottom: "Result" — calm, line-by-line comparison view.
 */
import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Expand,
  Shrink,
  Maximize,
  PanelTopClose,
  PanelTopOpen,
  RotateCcw,
  Terminal,
  BarChart3,
  CheckCircle2,
  CircleX,
  Loader2,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { matchOutput, getLineDiff } from "@/lib/outputMatcher";
import { useSubmitPredictOutputAttempt } from "@/hooks/usePredictOutputAttempts";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";
import type { PredictOutputAttempt } from "@/hooks/usePredictOutputAttempts";

interface PredictEditorPanelProps {
  problem: PredictOutputProblem;
  attempts: PredictOutputAttempt[];
  isExpanded?: boolean;
  onExpandEditor?: () => void;
  onExpandResult?: () => void;
  expandedPanel?: "editor" | "result" | null;
  onTabSwitchToAttempts?: () => void;
  onSubmitExpandDescription?: () => void;
  onRetryCollapseDescription?: () => void;
}

type ViewState = "answering" | "checking" | "correct" | "incorrect";

export function PredictEditorPanel({
  problem,
  attempts,
  isExpanded,
  onExpandEditor,
  onExpandResult,
  expandedPanel,
  onTabSwitchToAttempts,
  onSubmitExpandDescription,
  onRetryCollapseDescription,
}: PredictEditorPanelProps) {
  const [userOutput, setUserOutput] = useState("");
  const [viewState, setViewState] = useState<ViewState>("answering");
  const [revealed, setRevealed] = useState(false);
  const [startTime] = useState(Date.now());
  const [isEditorHovered, setIsEditorHovered] = useState(false);
  const [isResultHovered, setIsResultHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultPanelRef = useRef<ImperativePanelHandle>(null);
  const [isEditorPanelCollapsed, setIsEditorPanelCollapsed] = useState(false);
  const [isResultPanelCollapsed, setIsResultPanelCollapsed] = useState(true);

  const submitMutation = useSubmitPredictOutputAttempt();
  const attemptCount = attempts.length;

  const canReveal = useMemo(() => {
    if (!problem.reveal_allowed) return false;
    if (problem.reveal_timing === "anytime") return true;
    if (problem.reveal_timing === "after_1") return attemptCount >= 1;
    if (problem.reveal_timing === "after_2") return attemptCount >= 2;
    return false;
  }, [problem, attemptCount]);

  const handleSubmit = useCallback(async () => {
    if (!userOutput.trim()) return;

    // Enter checking state
    setViewState("checking");
    resultPanelRef.current?.expand();
    resultPanelRef.current?.resize(50);

    const result = matchOutput(
      userOutput,
      problem.expected_output,
      problem.accepted_outputs,
      problem.match_mode,
      problem.output_type
    );

    const timeTaken = Math.round((Date.now() - startTime) / 1000);
    let score = 0;
    if (result.isCorrect) {
      score = revealed
        ? problem.reveal_penalty === "half_xp"
          ? Math.floor(problem.xp_value / 2)
          : 0
        : problem.xp_value;
    }

    // Brief checking delay for UX feel
    await new Promise((r) => setTimeout(r, 600));

    try {
      await submitMutation.mutateAsync({
        problem_id: problem.id,
        user_output: userOutput,
        is_correct: result.isCorrect,
        revealed,
        attempt_no: attemptCount + 1,
        score_awarded: score,
        time_taken: timeTaken,
      });
    } catch {
      // Continue showing result even if save fails
    }

    setViewState(result.isCorrect ? "correct" : "incorrect");
    onSubmitExpandDescription?.();
  }, [userOutput, problem, revealed, attemptCount, startTime, submitMutation, onSubmitExpandDescription]);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    resultPanelRef.current?.expand();
    resultPanelRef.current?.resize(50);
    submitMutation.mutate({
      problem_id: problem.id,
      user_output: "",
      is_correct: false,
      revealed: true,
      attempt_no: attemptCount + 1,
      score_awarded: 0,
    });
  }, [problem, attemptCount, submitMutation]);

  const handleTryAgain = useCallback(() => {
    setViewState("answering");
    onRetryCollapseDescription?.();
    // Place cursor at end of existing text
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }, 0);
  }, [onRetryCollapseDescription]);

  const lineDiff = useMemo(() => {
    if (viewState !== "incorrect") return null;
    return getLineDiff(userOutput, problem.expected_output);
  }, [viewState, userOutput, problem.expected_output]);

  const handleToggleEditorPanelCollapse = () => {
    if (isEditorPanelCollapsed) {
      editorPanelRef.current?.expand();
    } else {
      editorPanelRef.current?.collapse();
    }
  };

  const handleToggleResultPanelCollapse = () => {
    if (isResultPanelCollapsed) {
      resultPanelRef.current?.expand();
    } else {
      resultPanelRef.current?.collapse();
    }
  };

  /* ─── Shared header builder ─── */
  function renderEditorHeader(opts: { shrinkable?: boolean }) {
    return (
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Your Output</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isEditorHovered ? "opacity-100" : "opacity-0"
          )}
        >

          {!opts.shrinkable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggleEditorPanelCollapse}
              title={isEditorPanelCollapsed ? "Show" : "Hide"}
            >
              {isEditorPanelCollapsed ? (
                <PanelTopOpen className="h-4 w-4" />
              ) : (
                <PanelTopClose className="h-4 w-4" />
              )}
            </Button>
          )}
          {opts.shrinkable && onExpandEditor && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandEditor} title="Collapse panel">
              <Shrink className="h-4 w-4" />
            </Button>
          )}
          {!opts.shrinkable && onExpandEditor && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandEditor} title="Expand">
              <Expand className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Editor body: full-bleed textarea or submitted output ─── */
  function renderEditorBody() {
    if (viewState !== "answering") {
      return (
        <div className="flex-1 min-h-0 flex flex-col">
          <pre className="flex-1 font-mono text-sm p-4 whitespace-pre-wrap text-foreground/90 overflow-auto">
            {userOutput || "(empty)"}
          </pre>
          {renderFooter()}
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <textarea
          ref={textareaRef}
          value={userOutput}
          onChange={(e) => setUserOutput(e.target.value)}
          placeholder={"Type the exact output printed by the program.\nEach print appears on a new line."}
          autoFocus
          className="flex-1 w-full resize-none bg-transparent font-mono text-sm p-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none leading-relaxed"
          spellCheck={false}
        />
        <div className="flex items-center justify-between px-4 py-2 shrink-0 border-t border-border/30">
          <span className="text-[11px] text-muted-foreground/50 tracking-wide font-mono">
            Whitespace and line breaks matter
          </span>
          <div className="flex items-center gap-2">
            {canReveal && !revealed && (
              <Button variant="ghost" size="sm" onClick={handleReveal} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Eye className="h-3.5 w-3.5" />
                Reveal
              </Button>
            )}
            <Button
              size="sm"
              className="h-7 px-4"
              onClick={handleSubmit}
              disabled={!userOutput.trim() || submitMutation.isPending}
            >
              {submitMutation.isPending ? "Checking…" : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Footer for post-submit states ─── */
  function renderFooter() {
    return (
      <div className="flex items-center justify-end px-4 py-2 shrink-0 border-t border-border/30">
        <div className="flex items-center gap-2">
          {canReveal && !revealed && viewState !== "answering" && (
            <Button variant="ghost" size="sm" onClick={handleReveal} className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Eye className="h-3.5 w-3.5" />
              Reveal
            </Button>
          )}
          {viewState !== "answering" && (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleTryAgain}>
              <RotateCcw className="h-3.5 w-3.5" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Result panel header ─── */
  function renderResultHeader(opts: { shrinkable?: boolean }) {
    return (
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Result</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isResultHovered ? "opacity-100" : "opacity-0"
          )}
        >
          {!opts.shrinkable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggleResultPanelCollapse}
              title={isResultPanelCollapsed ? "Show" : "Hide"}
            >
              {isResultPanelCollapsed ? <PanelTopOpen className="h-4 w-4" /> : <PanelTopClose className="h-4 w-4" />}
            </Button>
          )}
          {opts.shrinkable && onExpandResult && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandResult}>
              <Shrink className="h-4 w-4" />
            </Button>
          )}
          {!opts.shrinkable && onExpandResult && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpandResult}>
              <Expand className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ─── Line diff renderer ─── */
  function renderLineDiffRows() {
    if (!lineDiff) return null;
    const maxLen = Math.max(lineDiff.userLines.length, lineDiff.expectedLines.length);

    return Array.from({ length: maxLen }, (_, i) => {
      const userLine = lineDiff.userLines[i] ?? "";
      const expectedLine = lineDiff.expectedLines[i] ?? "";
      const isMismatch = lineDiff.mismatches.includes(i);
      const isMissing = i >= lineDiff.userLines.length;
      const isExtra = i >= lineDiff.expectedLines.length;

      return (
        <div key={i} className="contents">
          {/* Line number */}
          <span className="text-[11px] text-muted-foreground/30 font-mono tabular-nums text-right pr-3 pt-px select-none">
            {i + 1}
          </span>
          {/* Your Output cell */}
          <span
            className={cn(
              "font-mono text-[13px] leading-6 whitespace-pre px-3",
              isMissing && "italic text-muted-foreground/30",
              isExtra && isMismatch && "bg-destructive/8 text-foreground/90",
              !isMissing && !isExtra && isMismatch && "bg-destructive/8 text-foreground/90"
            )}
          >
            {isMissing ? "—" : userLine || "\u00A0"}
          </span>
          {/* Expected cell */}
          <span
            className={cn(
              "font-mono text-[13px] leading-6 whitespace-pre px-3",
              isExtra && "italic text-muted-foreground/30",
              isMissing && isMismatch && "bg-primary/8 text-foreground/90",
              !isMissing && !isExtra && isMismatch && "bg-primary/8 text-foreground/90"
            )}
          >
            {isExtra ? "—" : (revealed || viewState === "correct" ? (expectedLine || "\u00A0") : "•••")}
          </span>
        </div>
      );
    });
  }

  /* ─── Result panel body ─── */
  function renderResultBody() {

    // 1️⃣ EMPTY STATE
    if (viewState === "answering" && !revealed) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground/15" />
          <p className="text-sm text-muted-foreground/35 font-medium">
            Submit your answer to see results
          </p>
        </div>
      );
    }

    // 2️⃣ CHECKING STATE
    if (viewState === "checking") {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 text-muted-foreground/40 animate-spin" />
          <p className="text-sm text-muted-foreground/50 font-medium">
            Checking your output…
          </p>
        </div>
      );
    }

    // 5️⃣ REVEAL STATE (before submit)
    if (revealed && viewState === "answering") {
      const revealLineDiff = userOutput.trim()
        ? getLineDiff(userOutput, problem.expected_output)
        : null;

      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-auto">
          {/* Status bar */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30">
            <Eye className="h-4 w-4 text-amber-500/70" />
            <span className="text-sm font-medium text-amber-600/80 dark:text-amber-400/80">
              Answer revealed
            </span>
            {problem.reveal_penalty === "half_xp" && (
              <Badge variant="outline" className="ml-auto text-[10px] h-5 text-muted-foreground/60 border-border/50">
                ½ XP penalty
              </Badge>
            )}
          </div>
          {/* Output display */}
          {revealLineDiff ? (
            <div className="flex-1 overflow-auto">
              {/* Column labels */}
              <div className="grid grid-cols-[2rem_1fr_1fr] border-b border-border/20 bg-muted/20">
                <span />
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest px-3 py-2">
                  Your Output
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest px-3 py-2 border-l border-border/20">
                  Expected
                </span>
              </div>
              <div className="grid grid-cols-[2rem_1fr_1fr] py-1">
                {Array.from({ length: Math.max(revealLineDiff.userLines.length, revealLineDiff.expectedLines.length) }, (_, i) => {
                  const uLine = revealLineDiff.userLines[i] ?? "";
                  const eLine = revealLineDiff.expectedLines[i] ?? "";
                  const isMismatch = revealLineDiff.mismatches.includes(i);
                  const isMissing = i >= revealLineDiff.userLines.length;
                  const isExtra = i >= revealLineDiff.expectedLines.length;
                  return (
                    <div key={i} className="contents">
                      <span className="text-[11px] text-muted-foreground/30 font-mono tabular-nums text-right pr-3 pt-px select-none">
                        {i + 1}
                      </span>
                      <span className={cn(
                        "font-mono text-[13px] leading-6 whitespace-pre px-3",
                        isMissing && "italic text-muted-foreground/30",
                        isMismatch && !isMissing && "bg-destructive/8"
                      )}>
                        {isMissing ? "—" : uLine || "\u00A0"}
                      </span>
                      <span className={cn(
                        "font-mono text-[13px] leading-6 whitespace-pre px-3 border-l border-border/20",
                        isExtra && "italic text-muted-foreground/30",
                        isMismatch && !isExtra && "bg-primary/8"
                      )}>
                        {isExtra ? "—" : eLine || "\u00A0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <pre className="flex-1 font-mono text-[13px] p-4 whitespace-pre-wrap text-foreground/90 leading-relaxed overflow-auto">
              {problem.expected_output}
            </pre>
          )}
        </div>
      );
    }

    // 4️⃣ CORRECT STATE
    if (viewState === "correct") {
      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-auto">
          {/* Status bar */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30">
            <CheckCircle2 className="h-4 w-4 text-emerald-500/80" />
            <span className="text-sm font-medium text-emerald-600/90 dark:text-emerald-400/80">
              Correct output
            </span>
            {problem.xp_value > 0 && (
              <Badge variant="outline" className="ml-auto text-[10px] h-5 text-muted-foreground/60 border-border/50">
                +{revealed && problem.reveal_penalty === "half_xp" ? Math.floor(problem.xp_value / 2) : problem.xp_value} XP
              </Badge>
            )}
          </div>
          {/* Show submitted output cleanly */}
          <pre className="flex-1 font-mono text-[13px] p-4 whitespace-pre-wrap text-foreground/90 leading-relaxed overflow-auto">
            {userOutput}
          </pre>
        </div>
      );
    }

    // 3️⃣ INCORRECT STATE
    if (viewState === "incorrect") {
      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-auto">
          {/* Status bar */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-border/30">
            <CircleX className="h-4 w-4 text-destructive/60" />
            <span className="text-sm font-medium text-destructive/70">
              Not quite right
            </span>
          </div>
          {lineDiff ? (
            <>
              {/* Column labels */}
              <div className="grid grid-cols-[2rem_1fr_1fr] border-b border-border/20 bg-muted/20">
                <span />
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest px-3 py-2">
                  Your Output
                </span>
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest px-3 py-2 border-l border-border/20">
                  Expected
                </span>
              </div>
              {/* Line-by-line diff grid */}
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-[2rem_1fr_1fr] py-1">
                  {renderLineDiffRows()}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 grid grid-cols-2 divide-x divide-border/30 overflow-auto">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest px-4 pt-3 pb-1.5">
                  Your Output
                </span>
                <pre className="flex-1 font-mono text-[13px] px-4 pb-4 whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {userOutput}
                </pre>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-widest px-4 pt-3 pb-1.5">
                  Expected
                </span>
                <pre className={cn(
                  "flex-1 font-mono text-[13px] px-4 pb-4 whitespace-pre-wrap leading-relaxed",
                  revealed ? "text-foreground/90" : "text-foreground/90 blur-sm select-none"
                )}>
                  {problem.expected_output}
                </pre>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Fallback
    return null;
  }

  /* ─── Expanded: editor only ─── */
  if (expandedPanel === "editor") {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div
          className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
          onMouseEnter={() => setIsEditorHovered(true)}
          onMouseLeave={() => setIsEditorHovered(false)}
        >
          {renderEditorHeader({ shrinkable: true })}
          {renderEditorBody()}
        </div>
      </div>
    );
  }

  /* ─── Expanded: result only ─── */
  if (expandedPanel === "result") {
    return (
      <div className="h-full flex flex-col gap-1.5">
        <div className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden">
          {renderResultHeader({ shrinkable: true })}
          {renderResultBody()}
        </div>
      </div>
    );
  }

  /* ─── Default: two vertical panels ─── */
  return (
    <div className="h-full min-h-0 flex flex-col gap-1.5">
      <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
        {/* Output Textarea Panel */}
        <ResizablePanel
          ref={editorPanelRef}
          defaultSize={92}
          minSize={20}
          collapsible
          collapsedSize={8}
          className="min-h-0"
          onCollapse={() => setIsEditorPanelCollapsed(true)}
          onExpand={() => setIsEditorPanelCollapsed(false)}
        >
          <div
            className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
            onMouseEnter={() => setIsEditorHovered(true)}
            onMouseLeave={() => setIsEditorHovered(false)}
          >
            {renderEditorHeader({ shrinkable: false })}
            {!isEditorPanelCollapsed && renderEditorBody()}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Result Panel */}
        <ResizablePanel
          ref={resultPanelRef}
          defaultSize={8}
          minSize={10}
          collapsible
          collapsedSize={8}
          className="min-h-0"
          onCollapse={() => setIsResultPanelCollapsed(true)}
          onExpand={() => setIsResultPanelCollapsed(false)}
        >
          <div
            className="h-full flex flex-col bg-card rounded-lg border border-border shadow-sm overflow-hidden"
            onMouseEnter={() => setIsResultHovered(true)}
            onMouseLeave={() => setIsResultHovered(false)}
          >
            {renderResultHeader({ shrinkable: false })}
            {!isResultPanelCollapsed && renderResultBody()}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}