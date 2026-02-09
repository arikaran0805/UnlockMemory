/**
 * EliminateWrongCodePanel
 * Read-only code viewer for the Eliminate workspace — delegates to shared ReadOnlyCodePanel.
 */
import { ReadOnlyCodePanel } from "@/components/practice/ReadOnlyCodePanel";

interface Props {
  code: string;
  language: string;
  problemId: string;
  problemTitle: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCommentClick?: () => void;
}

export function EliminateWrongCodePanel({
  code,
  language,
  problemId,
  problemTitle,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
  onCommentClick,
}: Props) {
  return (
    <ReadOnlyCodePanel
      code={code}
      language={language}
      problemId={problemId}
      problemTitle={problemTitle}
      problemType="eliminate"
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onCommentClick={onCommentClick}
      hideMaximize
    />
  );
}
