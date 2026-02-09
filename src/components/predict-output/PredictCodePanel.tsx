/**
 * PredictCodePanel
 * Read-only code viewer for the Predict workspace — delegates to shared ReadOnlyCodePanel.
 */
import { ReadOnlyCodePanel } from "@/components/practice/ReadOnlyCodePanel";
import type { PredictOutputProblem } from "@/hooks/usePredictOutputProblems";

interface PredictCodePanelProps {
  problem: PredictOutputProblem;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCommentClick?: () => void;
}

export function PredictCodePanel({
  problem,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
  onCommentClick,
}: PredictCodePanelProps) {
  return (
    <ReadOnlyCodePanel
      code={problem.code}
      language={problem.language}
      problemId={problem.id}
      problemTitle={problem.title}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onCommentClick={onCommentClick}
    />
  );
}
