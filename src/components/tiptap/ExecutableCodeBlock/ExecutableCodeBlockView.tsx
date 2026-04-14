/**
 * ExecutableCodeBlockView - TipTap NodeView for interactive code blocks
 * 
 * Uses Monaco Editor for syntax highlighting, line numbers, and editing.
 * Supports code execution for Python, JavaScript, TypeScript.
 */

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Copy, Check, Play, Loader2, X, Pencil,
  ChevronUp, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCodeEdit } from '@/contexts/CodeEditContext';

// Supported languages for execution
const EXECUTABLE_LANGUAGES = ['python', 'javascript', 'typescript'];

// Monaco language mapping
const MONACO_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  bash: 'shell',
  sh: 'shell',
  plaintext: 'plaintext',
  cpp: 'cpp',
};

const ExecutableCodeBlockView = ({ 
  node, 
  updateAttributes, 
  editor,
  deleteNode,
}: NodeViewProps) => {
  const { language = 'python', code = '' } = node.attrs;
  
  // Generate stable ID for this code block instance
  const instanceId = useId();
  
  // Get code edit context (may be undefined if not wrapped in provider)
  let codeEditContext: ReturnType<typeof useCodeEdit> | null = null;
  try {
    codeEditContext = useCodeEdit();
  } catch {
    // Context not available
  }
  
  const [currentCode, setCurrentCode] = useState(code);
  const [isEditMode, setIsEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  
  // Store original code for tracking
  const [originalCode] = useState(code);
  
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  const normalizedLang = MONACO_LANGUAGE_MAP[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);
  const isEditable = editor?.isEditable ?? true;
  
  // Calculate editor height based on line count
  const lineCount = currentCode.split('\n').length;
  const editorHeight = Math.max(60, lineCount * 19 + 20);

  // Sync code when node attrs change externally
  useEffect(() => {
    setCurrentCode(code);
  }, [code]);
  
  // Report code edits to context
  useEffect(() => {
    if (codeEditContext) {
      codeEditContext.reportCodeEdit(instanceId, currentCode, originalCode, language);
    }
  }, [currentCode, originalCode, language, instanceId, codeEditContext]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
    
    // Configure Monaco theme for a clean light look
    monaco.editor.defineTheme('codeblock-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: 'C67F00' },
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'function', foreground: '795E26' },
        { token: 'variable', foreground: '001080' },
        { token: 'type', foreground: '267F99' },
      ],
      colors: {
        'editor.background': '#FAFAFA',
        'editor.foreground': '#1F2937',
        'editor.lineHighlightBackground': '#F3F4F6',
        'editorLineNumber.foreground': '#9CA3AF',
        'editorLineNumber.activeForeground': '#6B7280',
        'editor.selectionBackground': '#BFDBFE',
        'editorCursor.foreground': '#3B82F6',
      },
    });
    
    monaco.editor.setTheme('codeblock-light');
  };

  const handleCodeChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCurrentCode(newCode);
    updateAttributes({ code: newCode });
  }, [updateAttributes]);

  const handleEditToggle = () => {
    if (!isEditMode) {
      // Enter edit mode
      setIsEditMode(true);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.updateOptions({ 
            readOnly: false,
            renderLineHighlight: 'line',
          });
          editorRef.current.focus();
          // Move cursor to end
          const model = editorRef.current.getModel();
          if (model) {
            const lastLine = model.getLineCount();
            const lastCol = model.getLineMaxColumn(lastLine);
            editorRef.current.setPosition({ lineNumber: lastLine, column: lastCol });
          }
        }
      }, 0);
    } else {
      // Exit edit mode - keep edited code (no rollback per spec)
      setIsEditMode(false);
      if (editorRef.current) {
        editorRef.current.updateOptions({ 
          readOnly: true,
          renderLineHighlight: 'none',
        });
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleRun = async () => {
    if (!canExecute) return;
    
    setIsRunning(true);
    setOutput(null);
    setOutputError(false);
    setShowOutput(true);
    setOutputExpanded(true);

    try {
      const { data, error } = await supabase.functions.invoke('execute-code', {
        body: { code: currentCode, language: normalizedLang },
      });

      if (error) {
        setOutput(error.message || 'Execution failed');
        setOutputError(true);
      } else if (data?.error) {
        setOutput(data.error);
        setOutputError(true);
      } else {
        setOutput(data?.output || 'No output');
        setOutputError(false);
      }
    } catch (err: any) {
      setOutput(err.message || 'Failed to execute code');
      setOutputError(true);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCloseOutput = () => {
    setShowOutput(false);
  };

  return (
    <NodeViewWrapper className="executable-code-block-wrapper my-4" data-type="executableCodeBlock">
      {/* px-4 insets horizontally without overflowing — mx-4 on a w-full block adds 32px total width */}
      <div className="group relative w-full px-4">
        {/* Close button - floating top-right corner, only in edit mode */}
        {isEditable && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteNode()}
            className="absolute -top-1.5 right-2.5 z-10 h-5 w-5 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove code block"
          >
            <X className="w-2.5 h-2.5" />
          </Button>
        )}

        {/* Main container */}
        <div className="rounded-xl border border-border/40 bg-[#FAFAFA] overflow-hidden">
          {/* Header row */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            {/* Language label — static, no dropdown */}
            <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground/70">
              {language}
            </span>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditToggle}
                className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                title={isEditMode ? "Exit edit mode" : "Edit code"}
              >
                {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </Button>

              {canExecute && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="h-7 w-7 text-muted-foreground/60 hover:text-primary hover:bg-transparent"
                  title="Run code"
                >
                  {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                title="Copy code"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="px-1">
            <Editor
              height={editorHeight}
              language={normalizedLang}
              value={currentCode}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              options={{
                readOnly: !isEditMode,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                lineNumbersMinChars: 2,
                lineDecorationsWidth: 8,
                folding: false,
                glyphMargin: false,
                renderLineHighlight: isEditMode ? 'line' : 'none',
                scrollbar: {
                  vertical: 'hidden',
                  horizontal: 'auto',
                  horizontalScrollbarSize: 6,
                },
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                contextmenu: false,
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace",
                padding: { top: 8, bottom: 8 },
                wordWrap: 'on',
                automaticLayout: true,
              }}
              theme="codeblock-light"
              loading={
                <div className="flex items-center justify-center h-16 text-muted-foreground text-sm">
                  Loading...
                </div>
              }
            />
          </div>
        </div>

        {/* Output panel */}
        {showOutput && (
          <div className="mt-0.5 rounded-xl border border-border/40 overflow-hidden">
            {/* Header */}
            <button
              onClick={() => setOutputExpanded(!outputExpanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-black/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-black/5">
                  {outputExpanded ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  outputError ? "text-destructive" : "text-foreground"
                )}>
                  {outputError ? 'Error' : 'Output'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseOutput();
                }}
                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-transparent"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </button>

            {/* Content */}
            <div className={cn(
              "grid transition-all duration-200 ease-out",
              outputExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="px-4 pb-3">
                  <pre className={cn(
                    "output-pre text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto m-0",
                    outputError ? "text-destructive" : "text-foreground",
                    !output && "text-muted-foreground"
                  )}>
                    {output || 'No output'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Copied toast */}
        {copied && (
          <div className="absolute top-0 right-16 px-1.5 py-0.5 text-[10px] bg-primary text-primary-foreground rounded shadow-sm animate-in fade-in-0 zoom-in-95 z-10">
            Copied!
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default ExecutableCodeBlockView;
