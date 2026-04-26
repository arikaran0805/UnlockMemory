/**
 * MonacoCodeBlock - Interactive code block with Monaco Editor
 * 
 * Features:
 * - Monaco Editor with syntax highlighting and line numbers
 * - Read-only by default, toggle to edit mode
 * - Code execution for supported languages
 * - Collapsible output panel
 * - Copy code functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Copy, Check, Play, Pencil, Loader2, X, 
  ChevronUp, ChevronDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  text: 'plaintext',
};

export interface MonacoCodeBlockProps {
  code: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  editable?: boolean;
  showLanguageLabel?: boolean;
  className?: string;
  minHeight?: number;
}

const MonacoCodeBlock = ({
  code,
  language = 'python',
  onCodeChange,
  editable = true,
  showLanguageLabel = true,
  className,
  minHeight = 80,
}: MonacoCodeBlockProps) => {
  const [currentCode, setCurrentCode] = useState(code);
  const [originalCode, setOriginalCode] = useState(code); // Store original for cancel
  const [isEditMode, setIsEditMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputError, setOutputError] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Normalize language for Monaco
  const normalizedLang = MONACO_LANGUAGE_MAP[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  const canExecute = EXECUTABLE_LANGUAGES.includes(normalizedLang);
  
  // Calculate editor height based on line count
  const lineCount = currentCode.split('\n').length;
  const editorHeight = Math.max(minHeight, lineCount * 19 + 16); // 19px per line + padding

  // Sync code when prop changes externally (but never overwrite originalCode while editing)
  useEffect(() => {
    setCurrentCode(code);
    if (!isEditMode) {
      setOriginalCode(code);
    }
  }, [code]); // isEditMode intentionally omitted — we only care about code changes

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Sage-tinted theme — VS syntax colors on a soft green background
    monaco.editor.defineTheme('codeblock-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#f4fbf7',
        'editor.foreground': '#374151',
        'editor.lineHighlightBackground': '#edf7f1',
        'editorLineNumber.foreground': '#a8c5b5',
        'editorLineNumber.activeForeground': '#6ea88a',
        'editor.selectionBackground': '#c8e8d8',
        'editorCursor.foreground': '#374151',
      },
    });
    
    monaco.editor.setTheme('codeblock-light');
    
    // Configure editor options
    editor.updateOptions({
      readOnly: !isEditMode,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
              lineNumbers: 'off',
      lineNumbersMinChars: 2,
      lineDecorationsWidth: 8,
      folding: true,
      showFoldingControls: 'always',
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
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      padding: { top: 12, bottom: 12 },
      wordWrap: 'on',
      automaticLayout: true,
    });
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCurrentCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  const handleEditToggle = () => {
    if (!isEditMode) {
      // Enter edit mode - store current code as original for potential cancel
      setOriginalCode(currentCode);
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
      // Exit edit mode - revert to original code
      setCurrentCode(originalCode);
      setIsEditMode(false);
      if (editorRef.current) {
        editorRef.current.updateOptions({ 
          readOnly: true,
          renderLineHighlight: 'none',
        });
        // Update editor content to original
        editorRef.current.setValue(originalCode);
      }
      onCodeChange?.(originalCode);
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
        // Try to extract the actual error message from the response body
        let msg = error.message || 'Execution failed';
        try {
          if (error.context instanceof Response) {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          }
        } catch { /* ignore parse failure */ }
        setOutput(msg);
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
    // Don't reset output, just hide it
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Main code container - white background like VS Code */}
      <div
        className={cn(
          "overflow-hidden shadow-sm",
          showOutput ? "rounded-t-xl rounded-b-none" : "rounded-xl"
        )}
        style={{ background: '#ffffff', border: '1px solid #c8e8d8' }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          {/* Language label */}
          {showLanguageLabel && (
            <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
              {language}
            </span>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center gap-0.5 ml-auto">
            {editable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEditToggle}
                className="h-7 w-7 text-muted-foreground/60 hover:text-foreground hover:bg-transparent"
                title={isEditMode ? "Exit edit mode" : "Edit code"}
              >
                {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </Button>
            )}

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
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            options={{
              readOnly: !isEditMode,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'off',
              lineNumbersMinChars: 2,
              lineDecorationsWidth: 8,
              folding: true,
              showFoldingControls: 'always',
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
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              padding: { top: 12, bottom: 12 },
              wordWrap: 'on',
              automaticLayout: true,
            }}
            theme="codeblock-light"
            loading={
              <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                Loading editor...
              </div>
            }
          />
        </div>
      </div>

      {/* Output panel - collapsible */}
      {showOutput && (
        <div className="border border-t-0 border-border/40 bg-muted/40 overflow-hidden rounded-t-none rounded-b-xl">
          {/* Output header */}
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

          {/* Output content - collapsible */}
          <div className={cn(
            "grid transition-all duration-200 ease-out",
            outputExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <div className="px-4 pb-3">
                <div className="rounded-lg border border-border/40 bg-background px-4 py-3">
                  <pre className={cn(
                    "text-sm font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto m-0",
                    outputError ? "text-destructive" : "text-foreground",
                    !output && "text-muted-foreground"
                  )}>
                    {output || 'No output'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copied toast */}
      {copied && (
        <div className="fixed top-4 right-4 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 z-50">
          Copied!
        </div>
      )}
    </div>
  );
};

export default MonacoCodeBlock;
