import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RotateCcw, Settings, Maximize2, AlignLeft, Loader2 } from "lucide-react";
import { ProblemDetail } from "./problemDetailData";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { formatCode, registerMonacoFormatters, supportsFormatting } from "@/lib/formatters/codeFormatter";
import { toast } from "sonner";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

// LeetCode-style error location for Monaco highlighting
export interface ErrorLocation {
  /** Line number in user code (1-indexed) */
  line: number;
  /** Start column (1-indexed, optional) */
  startColumn?: number;
  /** End column (1-indexed, optional) */
  endColumn?: number;
  /** Error type for gutter hover (e.g., "TypeError", "SyntaxError") */
  errorType?: string;
}

interface CodeEditorProps {
  problem: ProblemDetail;
  supportedLanguages?: string[];
  onRun: (code: string, language: string) => void;
  onSubmit: (code: string, language: string) => void;
  readOnly?: boolean;
  /** @deprecated Use errorLocation instead */
  errorLine?: number;
  /** LeetCode-style error location with optional column info */
  errorLocation?: ErrorLocation | null;
  onCodeChange?: (code: string, language: string) => void;
}

export interface CodeEditorRef {
  getCode: () => string;
  getLanguage: () => string;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  getLineCount: () => number;
  /** @deprecated Use highlightError instead */
  highlightErrorLine: (line: number) => void;
  /** Highlight error with full location info */
  highlightError: (location: ErrorLocation) => void;
  clearErrorHighlight: () => void;
}

const languageLabels: Record<string, string> = {
  python: "Python 3",
  javascript: "JavaScript",
  typescript: "TypeScript",
  java: "Java",
  cpp: "C++",
  sql: "SQL",
  mysql: "MySQL",
};

// Map our language names to Monaco language identifiers
const monacoLanguageMap: Record<string, string> = {
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  java: "java",
  cpp: "cpp",
  sql: "sql",
  mysql: "sql",
};

// Editor settings interface
interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
};

// Load settings from localStorage
const loadSettings = (): EditorSettings => {
  try {
    const saved = localStorage.getItem('code-editor-settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load editor settings:', e);
  }
  return DEFAULT_SETTINGS;
};

// Save settings to localStorage
const saveSettings = (settings: EditorSettings) => {
  try {
    localStorage.setItem('code-editor-settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save editor settings:', e);
  }
};

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(function CodeEditor(
  { problem, supportedLanguages, onRun, onSubmit, readOnly = false, errorLine, errorLocation, onCodeChange },
  ref
) {
  const { theme } = useTheme();
  const { settings: platformSettings } = usePlatformSettings();
  const availableLanguages = supportedLanguages && supportedLanguages.length > 0 
    ? supportedLanguages 
    : Object.keys(problem.starterCode);
  const [language, setLanguage] = useState(availableLanguages[0] || "python");
  const [code, setCode] = useState(problem.starterCode[availableLanguages[0]] || "");
  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const editorRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
  const monacoRef = useRef<Monaco | null>(null);
  const tabWidthRef = useRef(settings.tabSize);
  
  // Use refs for callbacks to avoid stale closures
  const codeRef = useRef(code);
  const languageRef = useRef(language);
  const onRunRef = useRef(onRun);
  
  // Keep refs in sync
  useEffect(() => {
    codeRef.current = code;
  }, [code]);
  
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  
  useEffect(() => {
    onRunRef.current = onRun;
  }, [onRun]);

  useEffect(() => {
    tabWidthRef.current = settings.tabSize;
  }, [settings.tabSize]);

  /**
   * Apply Monaco decoration for error highlighting.
   * LeetCode-style: red gutter marker + subtle line/column highlight.
   */
  const applyErrorDecoration = useCallback((location: ErrorLocation) => {
    if (!editorRef.current || !monacoRef.current) return;
    if (!platformSettings.advanced.highlightErrorLines) return;
    
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    const model = editor.getModel();
    
    if (!model) return;
    
    const { line, startColumn, endColumn, errorType } = location;
    
    // Validate line number
    const lineCount = model.getLineCount();
    if (line < 1 || line > lineCount) return;
    
    // Determine highlight range
    let rangeStartCol = 1;
    let rangeEndCol = model.getLineMaxColumn(line);
    let isFullLine = true;
    
    // If we have specific column info, use it
    if (startColumn !== undefined && startColumn > 0) {
      rangeStartCol = startColumn;
      rangeEndCol = endColumn !== undefined && endColumn > 0 ? endColumn : startColumn + 1;
      isFullLine = false;
    }
    
    const decorations: any[] = [];
    
    // Full line background highlight (subtle red)
    decorations.push({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: 'error-line-highlight',
        // Gutter marker with hover text showing error type
        glyphMarginClassName: 'error-line-glyph',
        glyphMarginHoverMessage: errorType ? { value: errorType } : undefined,
      },
    });
    
    // If we have column info, add inline decoration (optional squiggle/underline)
    // LeetCode doesn't use underlines, so we keep this minimal
    if (!isFullLine) {
      decorations.push({
        range: new monaco.Range(line, rangeStartCol, line, rangeEndCol),
        options: {
          className: 'error-column-highlight',
          // No inline message - LeetCode style is minimal
        },
      });
    }
    
    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decorations);
    
    // Scroll to error line (centered, not aggressive)
    editor.revealLineInCenter(line);
  }, [platformSettings.advanced.highlightErrorLines]);

  /**
   * Clear all error decorations.
   */
  const clearDecorations = useCallback(() => {
    if (editorRef.current) {
      decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
    }
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    getCode: () => code,
    getLanguage: () => language,
    setCode: (newCode: string) => setCode(newCode),
    setLanguage: (newLang: string) => {
      setLanguage(newLang);
      setCode(problem.starterCode[newLang] || '');
    },
    getLineCount: () => code.split('\n').length,
    // Legacy support
    highlightErrorLine: (line: number) => {
      applyErrorDecoration({ line });
    },
    // New enhanced method
    highlightError: (location: ErrorLocation) => {
      applyErrorDecoration(location);
    },
    clearErrorHighlight: clearDecorations,
  }), [code, language, problem.starterCode, applyErrorDecoration, clearDecorations]);

  // Handle errorLocation prop changes
  useEffect(() => {
    if (!platformSettings.advanced.highlightErrorLines) {
      clearDecorations();
      return;
    }
    
    if (errorLocation) {
      applyErrorDecoration(errorLocation);
    } else if (errorLine) {
      // Legacy support for errorLine prop
      applyErrorDecoration({ line: errorLine });
    } else {
      clearDecorations();
    }
  }, [errorLocation, errorLine, applyErrorDecoration, clearDecorations, platformSettings.advanced.highlightErrorLines]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const newCode = problem.starterCode[newLang] || '';
    setCode(newCode);
    onCodeChange?.(newCode, newLang);
  };

  const handleReset = () => {
    const resetCode = problem.starterCode[language] || '';
    setCode(resetCode);
    onCodeChange?.(resetCode, language);
  };

  const handleFormatCode = useCallback(async () => {
    if (!code.trim() || isFormatting) return;
    
    // Check if language supports formatting
    if (!supportsFormatting(language)) {
      toast.info("Formatting not available for this language");
      return;
    }

    setIsFormatting(true);
    const startTime = performance.now();

    try {
      const result = await formatCode(code, language, settings.tabSize);
      const elapsed = performance.now() - startTime;
      
      if (result.success && result.formattedCode !== undefined) {
        // Check if code actually changed
        if (result.formattedCode !== code) {
          setCode(result.formattedCode);
          onCodeChange?.(result.formattedCode, language);
          toast.success("✨ Code formatted successfully", {
            duration: 2000,
          });
        } else {
          toast.info("Code is already formatted", {
            duration: 2000,
          });
        }
        
        // Log performance for debugging
        if (elapsed > 200) {
          console.log(`Formatting took ${elapsed.toFixed(0)}ms`);
        }
      } else {
        toast.error(`❌ ${result.error || "Unable to format code"}`, {
          duration: 4000,
        });
      }
    } catch (error) {
      toast.error("❌ Unable to format due to syntax errors. Fix errors and try again.", {
        duration: 4000,
      });
    } finally {
      setIsFormatting(false);
    }
  }, [code, language, settings.tabSize, isFormatting, onCodeChange]);

  const handleSettingChange = <K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
    
    // Apply settings immediately to the editor if it exists
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.updateOptions({
        fontSize: key === 'fontSize' ? value as number : settings.fontSize,
        tabSize: key === 'tabSize' ? value as number : settings.tabSize,
        wordWrap: key === 'wordWrap' ? (value ? 'on' : 'off') : (settings.wordWrap ? 'on' : 'off'),
        lineNumbers: key === 'lineNumbers' ? (value ? 'on' : 'off') : (settings.lineNumbers ? 'on' : 'off'),
        minimap: { enabled: key === 'minimap' ? value as boolean : settings.minimap },
      });
    }
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    onCodeChange?.(newCode, language);
    // Clear error highlighting when user edits code
    clearDecorations();
  }, [language, onCodeChange, clearDecorations]);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register all language formatters for Monaco's built-in Format Document action
    registerMonacoFormatters(monaco, () => tabWidthRef.current);
    
    // Add Ctrl+Enter keybinding to run code - uses refs to avoid stale closures
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current(codeRef.current, languageRef.current);
    });
  }, []);

  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';
  const monacoLanguage = monacoLanguageMap[language] || 'plaintext';

  return (
    <div className="h-full flex flex-col bg-card border-l border-border/50">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {languageLabels[lang] || lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={handleFormatCode}
            disabled={isFormatting || !supportsFormatting(language)}
            title={supportsFormatting(language) ? "Format Code" : "Formatting not available for this language"}
          >
            {isFormatting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <AlignLeft className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset Code">
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Editor Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Editor Settings</h4>
                
                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Font Size</Label>
                    <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
                  </div>
                  <Slider
                    value={[settings.fontSize]}
                    onValueChange={([value]) => handleSettingChange('fontSize', value)}
                    min={10}
                    max={24}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Tab Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Tab Size</Label>
                    <span className="text-xs text-muted-foreground">{settings.tabSize} spaces</span>
                  </div>
                  <Slider
                    value={[settings.tabSize]}
                    onValueChange={([value]) => handleSettingChange('tabSize', value)}
                    min={2}
                    max={8}
                    step={2}
                    className="w-full"
                  />
                </div>

                {/* Word Wrap */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Word Wrap</Label>
                  <Switch
                    checked={settings.wordWrap}
                    onCheckedChange={(checked) => handleSettingChange('wordWrap', checked)}
                  />
                </div>

                {/* Line Numbers */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Line Numbers</Label>
                  <Switch
                    checked={settings.lineNumbers}
                    onCheckedChange={(checked) => handleSettingChange('lineNumbers', checked)}
                  />
                </div>

                {/* Minimap */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Minimap</Label>
                  <Switch
                    checked={settings.minimap}
                    onCheckedChange={(checked) => handleSettingChange('minimap', checked)}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Maximize">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Code Area - Monaco Editor */}
      <div className="flex-1 overflow-hidden bg-background">
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          theme={monacoTheme}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            fontSize: settings.fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: settings.lineNumbers ? "on" : "off",
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 16,
            glyphMargin: true,
            folding: true,
            minimap: { enabled: settings.minimap },
            wordWrap: settings.wordWrap ? "on" : "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: settings.tabSize,
            insertSpaces: true,
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
            renderLineHighlight: "line",
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

      {/* Editor Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/30">
        <div className="text-xs text-muted-foreground">
          Press Ctrl+Enter to run
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onRun(code, language)}
          >
            Run
          </Button>
          <Button 
            size="sm" 
            onClick={() => onSubmit(code, language)}
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
});
