import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Check,
  Copy,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  PanelTopClose,
  PanelTopOpen,
  AlertTriangle,
  Timer,
  Terminal,
  Expand,
  Shrink,
  Clock,
  ShieldAlert,
  XCircle,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  FixErrorJudgeResult,
  FixErrorVerdict,
  FixErrorTestResult,
} from "@/hooks/useFixErrorJudge";

interface FixErrorResultPanelProps {
  verdict: FixErrorVerdict;
  result: FixErrorJudgeResult | null;
  successMessage?: string;
  failureMessage?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// ── Error Block ─────────────────────────────────────────────────────────────

function ErrorBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lineCount = content.split("\n").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative rounded-lg bg-red-500/10 p-4">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded hover:bg-red-500/20 transition-colors text-red-400"
        title="Copy error"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <div
        className={cn(
          "font-mono text-sm text-red-500 pr-10 overflow-x-auto",
          !expanded && lineCount > 8 && "max-h-40 overflow-hidden"
        )}
      >
        <pre className="whitespace-pre-wrap break-words">{content}</pre>
      </div>
      {lineCount > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mx-auto mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="h-4 w-4" /> View less</>
          ) : (
            <><ChevronDown className="h-4 w-4" /> View more</>
          )}
        </button>
      )}
    </div>
  );
}

// ── Test Summary Bar ────────────────────────────────────────────────────────

function TestSummaryBar({
  passed,
  total,
  isPassed,
}: {
  passed: number;
  total: number;
  isPassed: boolean;
}) {
  const percentage = total > 0 ? (passed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground font-medium">Test Results</span>
        <span className={cn("font-semibold", isPassed ? "text-green-600 dark:text-green-500" : "text-foreground")}>
          {passed} / {total} passed
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isPassed
              ? "bg-green-500"
              : percentage > 0
                ? "bg-amber-500"
                : "bg-red-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ── Visible Test Diff ───────────────────────────────────────────────────────

function VisibleTestDiff({ testResult }: { testResult: FixErrorTestResult }) {
  if (testResult.passed || !testResult.is_visible) return null;

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground">
          Test Case {testResult.id + 1}
        </span>
      </div>
      {testResult.error ? (
        <div className="p-3">
          <p className="text-sm font-mono text-red-500">{testResult.error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-border/50">
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Expected</p>
            <pre className="text-sm font-mono text-green-600 dark:text-green-500 whitespace-pre-wrap break-words">
              {testResult.expected}
            </pre>
          </div>
          <div className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Actual</p>
            <pre className="text-sm font-mono text-red-500 whitespace-pre-wrap break-words">
              {testResult.actual || "(no output)"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Hidden Stage Hint ───────────────────────────────────────────────────────

function HiddenStageHint({ hintCategory }: { hintCategory?: string }) {
  const hintMessages: Record<string, string> = {
    "empty input": "Consider what happens when the input is empty.",
    "boundary values": "Think about boundary conditions and extreme values.",
    "duplicates": "Does your solution handle duplicate values correctly?",
    "overflow": "Watch out for integer overflow or very large numbers.",
    "negative": "Have you considered negative numbers?",
    "single element": "What happens with a single element?",
    "sorted": "Does your solution work for already sorted input?",
    "reverse sorted": "What about reverse-sorted input?",
  };

  const message = hintCategory
    ? hintMessages[hintCategory] || `Hint: Think about ${hintCategory} cases.`
    : "Review your logic for edge cases and boundary conditions.";

  return (
    <div className="flex items-start gap-2.5 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
      <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-foreground mb-1">Almost there!</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────────

export function FixErrorResultPanel({
  verdict,
  result,
  successMessage,
  failureMessage,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
}: FixErrorResultPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  const isPassed = result?.status === "PASS";
  const hasFailed = result?.status === "FAIL";
  const hasResult = verdict === "completed" && result !== null;

  // Verdict display config
  const verdictConfig: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    PASS: {
      label: "Accepted ✅",
      color: "text-green-600 dark:text-green-500",
      bg: "bg-green-500/10",
      icon: <CheckCircle2 className="h-6 w-6" />,
    },
    COMPILE_ERROR: {
      label: "Compilation Error",
      color: "text-red-500",
      bg: "bg-red-500/10",
      icon: <AlertTriangle className="h-6 w-6" />,
    },
    RUNTIME_ERROR: {
      label: "Runtime Error",
      color: "text-red-500",
      bg: "bg-red-500/10",
      icon: <XCircle className="h-6 w-6" />,
    },
    TIMEOUT: {
      label: "Time Limit Exceeded",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      icon: <Timer className="h-6 w-6" />,
    },
    WRONG_ANSWER: {
      label: result?.failedStage === "hidden" ? "Wrong Answer (Edge Cases)" : "Tests Failed",
      color: result?.failedStage === "hidden" ? "text-amber-500" : "text-red-500",
      bg: result?.failedStage === "hidden" ? "bg-amber-500/10" : "bg-red-500/10",
      icon: result?.failedStage === "hidden" ? <AlertTriangle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />,
    },
    VALIDATOR_ERROR: {
      label: "Validation Error",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      icon: <AlertTriangle className="h-6 w-6" />,
    },
    LOCKED_REGION_MODIFIED: {
      label: "Locked Code Modified",
      color: "text-red-500",
      bg: "bg-red-500/10",
      icon: <ShieldAlert className="h-6 w-6" />,
    },
  };

  const config = isPassed
    ? verdictConfig.PASS
    : result?.failureType
      ? verdictConfig[result.failureType] ?? verdictConfig.WRONG_ANSWER
      : null;

  // Status dot for header
  const statusDot = hasResult
    ? isPassed
      ? "bg-green-500"
      : "bg-red-500"
    : null;

  // Get first failed visible test for diff display
  const firstFailedVisibleTest = result?.testResults?.find(
    (t) => !t.passed && t.is_visible
  );

  return (
    <div
      className="h-full flex flex-col bg-card overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Result</span>
          {statusDot && <span className={cn("w-2 h-2 rounded-full", statusDot)} />}
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered || isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}
              title={isCollapsed ? "Show result" : "Hide result"}>
              {isCollapsed ? <PanelTopOpen className="h-4 w-4" /> : <PanelTopClose className="h-4 w-4" />}
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
      {!isCollapsed && (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Idle state */}
            {verdict === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Terminal className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">Fix the code and click Run to test your solution.</p>
              </div>
            )}

            {/* Running state */}
            {verdict === "running" && (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-muted-foreground text-sm">Running tests...</span>
              </div>
            )}

            {/* Completed with result */}
            {hasResult && config && (
              <>
                {/* Verdict banner */}
                <div className={cn("p-5 rounded-lg", config.bg)}>
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className={config.color}>{config.icon}</div>
                    <span className={cn("text-lg font-semibold", config.color)}>
                      {config.label}
                    </span>
                    {result.runtime_ms > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {result.runtime_ms}ms
                      </span>
                    )}
                  </div>
                </div>

                {/* Test summary bar - show for test-based results */}
                {result.total_count > 0 &&
                  result.failureType !== "COMPILE_ERROR" &&
                  result.failureType !== "TIMEOUT" &&
                  result.failureType !== "LOCKED_REGION_MODIFIED" && (
                  <TestSummaryBar
                    passed={result.passed_count}
                    total={result.total_count}
                    isPassed={isPassed}
                  />
                )}

                {/* Success message */}
                {isPassed && successMessage && (
                  <div className="flex items-start gap-2.5 p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/90">{successMessage}</p>
                  </div>
                )}

                {/* Failure feedback */}
                {hasFailed && (
                  <div className="space-y-3">
                    {/* Error output (stderr) - only for compilation/runtime errors */}
                    {result.stderr && (
                      result.failureType === "COMPILE_ERROR" ||
                      result.failureType === "RUNTIME_ERROR"
                    ) && (
                      <ErrorBlock content={result.stderr} />
                    )}

                    {/* Stage-aware feedback for WRONG_ANSWER */}
                    {result.failureType === "WRONG_ANSWER" && result.failedStage === "sample" && (
                      <>
                        {/* Show Expected vs Actual diff for the first failed visible test */}
                        {firstFailedVisibleTest && (
                          <VisibleTestDiff testResult={firstFailedVisibleTest} />
                        )}
                        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                          <p className="text-sm text-muted-foreground">
                            {failureMessage || "Your fix didn't produce the expected output. Review your changes and try again."}
                          </p>
                        </div>
                      </>
                    )}

                    {result.failureType === "WRONG_ANSWER" && result.failedStage === "hidden" && (
                      <HiddenStageHint hintCategory={result.hintCategory} />
                    )}

                    {/* Fallback for WRONG_ANSWER without stage (output_comparison mode) */}
                    {result.failureType === "WRONG_ANSWER" && !result.failedStage && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-sm text-muted-foreground">
                          {result.passed_count > 0
                            ? "Some test cases failed. Review your logic for edge cases and boundary conditions."
                            : failureMessage || "Your fix didn't produce the expected output. Review your changes and try again."
                          }
                        </p>
                      </div>
                    )}

                    {result.failureType === "TIMEOUT" && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-sm text-muted-foreground">
                          Your code took too long to execute. Check for infinite loops or inefficient operations.
                        </p>
                      </div>
                    )}

                    {result.failureType === "LOCKED_REGION_MODIFIED" && (
                      <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                        <div className="flex items-start gap-2.5">
                          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-foreground mb-1">Locked code was modified</p>
                            <p className="text-sm text-muted-foreground">
                              You can only edit code within the highlighted editable region. Reset your code and try again.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.failureType === "VALIDATOR_ERROR" && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-sm text-muted-foreground">
                          An internal validation error occurred. Please report this problem.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
