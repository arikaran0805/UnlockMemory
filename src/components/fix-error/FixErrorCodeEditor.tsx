import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Braces, RotateCcw, Settings, Maximize, Play, Send,
  Expand, Shrink, AlignLeft, PanelTopClose, PanelTopOpen, Lock,
} from "lucide-react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PlatformSettingsModal } from "@/components/practice/PlatformSettingsModal";
import { formatPython, registerMonacoPythonFormatter } from "@/lib/formatters/pythonFormatter";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
};

interface FixErrorCodeEditorProps {
  initialCode: string;
  language: string;
  onRun: (code: string) => void;
  onSubmit: (code: string) => void;
  isRunning: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /** 1-indexed line where the editable region starts. If null/undefined, entire code is editable. */
  editableStartLine?: number | null;
  /** 1-indexed line where the editable region ends. If null/undefined, entire code is editable. */
  editableEndLine?: number | null;
}

export function FixErrorCodeEditor({
  initialCode,
  language,
  onRun,
  onSubmit,
  isRunning,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  editableStartLine,
  editableEndLine,
}: FixErrorCodeEditorProps) {
  const { theme } = useTheme();
  const { settings, monacoOptions } = usePlatformSettings();
  const [code, setCode] = useState(initialCode);
  const [isHovered, setIsHovered] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<any>(null);
  const codeRef = useRef(code);
  const tabWidthRef = useRef(settings.codeEditor.tabSize);
  const lockedLinesSnapshotRef = useRef<string[]>([]);

  const hasLockedRegions = editableStartLine != null && editableEndLine != null;

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    tabWidthRef.current = settings.codeEditor.tabSize;
  }, [settings.codeEditor.tabSize]);

  // Reset code when problem changes
  useEffect(() => {
    setCode(initialCode);
    // Snapshot locked lines for validation
    if (hasLockedRegions) {
      const lines = initialCode.split("\n");
      const locked: string[] = [];
      lines.forEach((line, i) => {
        const lineNum = i + 1;
        if (lineNum < editableStartLine! || lineNum > editableEndLine!) {
          locked.push(line);
        }
      });
      lockedLinesSnapshotRef.current = locked;
    }
  }, [initialCode, editableStartLine, editableEndLine, hasLockedRegions]);

  // Apply locked region decorations
  const applyLockedDecorations = useCallback(
    (editor: any, monaco: Monaco) => {
      if (!hasLockedRegions) return;

      const model = editor.getModel?.();
      if (!model) return;

      const totalLines = model.getLineCount();
      const ranges: any[] = [];

      // Before editable region
      if (editableStartLine! > 1) {
        ranges.push({
          range: new monaco.Range(1, 1, editableStartLine! - 1, 1000),
          options: {
            isWholeLine: true,
            className: "fix-error-locked-line",
            glyphMarginClassName: "fix-error-locked-glyph",
            stickiness: 1,
          },
        });
      }

      // After editable region
      if (editableEndLine! < totalLines) {
        ranges.push({
          range: new monaco.Range(editableEndLine! + 1, 1, totalLines, 1000),
          options: {
            isWholeLine: true,
            className: "fix-error-locked-line",
            glyphMarginClassName: "fix-error-locked-glyph",
            stickiness: 1,
          },
        });
      }

      if (decorationsRef.current) {
        decorationsRef.current.clear();
      }
      decorationsRef.current = editor.createDecorationsCollection(ranges);
    },
    [hasLockedRegions, editableStartLine, editableEndLine]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      if (!value) return;

      // If locked regions are defined, validate locked lines haven't changed
      if (hasLockedRegions) {
        const newLines = value.split("\n");
        const originalLines = initialCode.split("\n");
        let lockedModified = false;

        // Check lines before editable region
        for (let i = 0; i < editableStartLine! - 1; i++) {
          if (newLines[i] !== originalLines[i]) {
            lockedModified = true;
            break;
          }
        }

        // Check lines after editable region (count from end to handle inserted/deleted lines)
        if (!lockedModified) {
          const originalLockedAfter = originalLines.length - editableEndLine!;
          const newLockedAfter = newLines.length - editableEndLine!;
          
          // If total line count changed in locked regions, something was modified
          if (newLockedAfter !== originalLockedAfter) {
            lockedModified = true;
          } else {
            for (let i = 0; i < originalLockedAfter; i++) {
              const origIdx = originalLines.length - 1 - i;
              const newIdx = newLines.length - 1 - i;
              if (newLines[newIdx] !== originalLines[origIdx]) {
                lockedModified = true;
                break;
              }
            }
          }
        }

        if (lockedModified) {
          // Revert the change
          const editor = editorRef.current;
          if (editor) {
            const model = editor.getModel?.();
            if (model) {
              // Restore the locked lines while preserving the editable region
              const currentLines = value.split("\n");
              const editableContent = currentLines
                .slice(editableStartLine! - 1, editableEndLine!)
                .join("\n");
              
              const beforeEditable = originalLines.slice(0, editableStartLine! - 1).join("\n");
              const afterEditable = originalLines.slice(editableEndLine!).join("\n");
              
              const restored = [
                beforeEditable,
                editableContent,
                afterEditable,
              ].filter(Boolean).join("\n");

              setCode(restored);
              toast.error("Locked lines cannot be modified", { id: "locked-region" });
              return;
            }
          }
          return;
        }
      }

      setCode(value);
    },
    [hasLockedRegions, editableStartLine, editableEndLine, initialCode]
  );

  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      registerMonacoPythonFormatter(monaco, () => tabWidthRef.current);

      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        () => {
          onRun(codeRef.current);
        }
      );

      // Apply locked region decorations
      applyLockedDecorations(editor, monaco);

      // Re-apply decorations when content changes
      editor.onDidChangeModelContent(() => {
        applyLockedDecorations(editor, monaco);
      });
    },
    [onRun, applyLockedDecorations]
  );

  // Apply editor settings changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.updateOptions(monacoOptions);
    const model = editor.getModel?.();
    model?.updateOptions?.({
      tabSize: settings.codeEditor.tabSize,
      insertSpaces: settings.codeEditor.indentationType === "spaces",
    });
  }, [monacoOptions, settings.codeEditor.tabSize, settings.codeEditor.indentationType]);

  const handleReset = () => {
    setCode(initialCode);
    if (editorRef.current && decorationsRef.current) {
      decorationsRef.current.clear();
    }
    // Re-apply locked decorations
    if (editorRef.current && monacoRef.current) {
      applyLockedDecorations(editorRef.current, monacoRef.current);
    }
  };

  const handleFormatCode = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const action = editor.getAction?.("editor.action.formatDocument");
    const isSupported =
      !!action && (typeof action.isSupported !== "function" || action.isSupported());

    if (!isSupported && language === "python") {
      try {
        const model = editor.getModel?.();
        if (!model) return;
        const formatted = await formatPython(model.getValue(), {
          tabWidth: settings.codeEditor.tabSize,
        });
        model.pushEditOperations(
          [],
          [{ range: model.getFullModelRange(), text: formatted }],
          () => null
        );
        toast.success("Formatted");
      } catch {
        toast.error("Couldn't format this code.");
      }
      return;
    }

    if (!isSupported) {
      toast.info("Formatting isn't available for this language yet.");
      return;
    }

    try {
      await action.run();
      toast.success("Formatted");
    } catch {
      toast.error("Couldn't format this code.");
    }
  }, [language, settings.codeEditor.tabSize]);

  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  const monacoLanguage = monacoLanguageMap[language] || "plaintext";

  return (
    <>
      <div
        className="h-full flex flex-col bg-card overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header Row 1 */}
        <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Code</span>
            <span className="text-xs text-muted-foreground font-mono">{language}</span>
            {hasLockedRegions && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Lines {editableStartLine}–{editableEndLine} editable</span>
              </span>
            )}
          </div>
          <div
            className={cn(
              "flex items-center gap-0.5 transition-opacity",
              isHovered || isExpanded ? "opacity-100" : "opacity-0"
            )}
          >
            {onToggleCollapse && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}
                title={isCollapsed ? "Show editor" : "Hide editor"}>
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

        {!isCollapsed && (
          <>
            {/* Header Row 2 - Tools */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background shrink-0">
              <span className="text-xs text-muted-foreground">
                {hasLockedRegions
                  ? "Edit only the highlighted region to fix the bug"
                  : "Fix the buggy code below"
                }
              </span>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Format code" onClick={handleFormatCode}>
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Reset to buggy code">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsModalOpen(true)} title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => document.documentElement.requestFullscreen?.()} title="Fullscreen">
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 overflow-hidden" style={{ overscrollBehavior: 'contain' }}>
              <Editor
                height="100%"
                language={monacoLanguage}
                value={code}
                theme={monacoTheme}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                options={{
                  ...monacoOptions,
                  fontFamily:
                    monacoOptions.fontFamily ||
                    "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                  lineNumbersMinChars: 3,
                  lineDecorationsWidth: 16,
                  glyphMargin: true,
                  folding: true,
                  showFoldingControls: "always",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderIndentGuides: true,
                  padding: { top: 16, bottom: 16 },
                  scrollbar: {
                    vertical: "auto",
                    horizontal: "auto",
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10,
                  },
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  overviewRulerLanes: 0,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  smoothScrolling: true,
                  contextmenu: true,
                  bracketPairColorization: { enabled: true },
                  guides: {
                    indentation: true,
                    bracketPairs: true,
                  },
                }}
              />
            </div>

            {/* Footer with Run/Submit */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/40 shrink-0">
              <span className="text-xs text-muted-foreground">
                Press{" "}
                <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">Ctrl</kbd>
                {" "}+{" "}
                <kbd className="px-1 py-0.5 text-[10px] rounded bg-muted border border-border">Enter</kbd>
                {" "}to run
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5"
                  onClick={() => onRun(code)} disabled={isRunning}>
                  <Play className="h-3.5 w-3.5" />
                  Run
                </Button>
                <Button size="sm" className="h-8 gap-1.5"
                  onClick={() => onSubmit(code)} disabled={isRunning}>
                  <Send className="h-3.5 w-3.5" />
                  Submit
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <PlatformSettingsModal open={settingsModalOpen} onOpenChange={setSettingsModalOpen} />

      {/* Locked region styles */}
      <style>{`
        .fix-error-locked-line {
          background-color: hsl(var(--muted) / 0.5) !important;
          opacity: 0.7;
        }
        .fix-error-locked-glyph {
          background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='11' x='3' y='11' rx='2' ry='2'/%3E%3Cpath d='M7 11V7a5 5 0 0 1 10 0v4'/%3E%3C/svg%3E") center center no-repeat;
          background-size: 10px 10px;
        }
      `}</style>
    </>
  );
}