/**
 * EliminateWrongCodePanel
 * Displays read-only context code with syntax highlighting.
 */
import { Expand, Shrink, PanelTopClose, PanelTopOpen, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  code: string;
  language: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  c: "c",
  cpp: "cpp",
  sql: "sql",
  r: "r",
  csharp: "csharp",
};

export function EliminateWrongCodePanel({
  code,
  language,
  isExpanded,
  onToggleExpand,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  const { resolvedTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  if (isCollapsed) {
    return (
      <div className="h-full flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Context Code</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="Show code">
          <PanelTopOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (!code.trim()) {
    return (
      <div className="h-full flex flex-col">
        <div className="h-11 flex items-center justify-between px-4 border-b border-border/50 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Context Code</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No context code provided
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
      <div className="h-11 flex items-center justify-between px-4 border-b border-border/50 shrink-0 bg-muted/40">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Context Code</span>
          <span className="text-xs text-muted-foreground capitalize">({language})</span>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered || isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="Hide code">
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

      {/* Monaco Read-only */}
      <div className="flex-1 overflow-hidden" style={{ overscrollBehavior: "contain" }}>
        <Editor
          height="100%"
          language={LANGUAGE_MAP[language] || language}
          value={code}
          theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: "on",
            renderLineHighlight: "none",
            domReadOnly: true,
            contextmenu: false,
            folding: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
