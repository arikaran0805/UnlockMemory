/**
 * ReadOnlyCodePanel
 * A read-only Monaco code viewer that visually matches the Solve CodeEditor.
 * Used by Predict Output and Eliminate the Wrong Answer workspaces.
 * Includes: language badge, settings popover, copy, collapse/expand, engagement footer.
 */
import { useState, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Braces,
  Copy,
  Check,
  Expand,
  Shrink,
  PanelTopOpen,
  PanelTopClose,
  Settings,
  Maximize,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Flag,
  Bookmark,
} from "lucide-react";
import Editor, { OnMount } from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ShareTooltip from "@/components/ShareTooltip";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";

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
  mysql: "sql",
};

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

const loadSettings = (): EditorSettings => {
  try {
    const saved = localStorage.getItem("readonly-code-panel-settings");
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
};

const saveSettings = (s: EditorSettings) => {
  try {
    localStorage.setItem("readonly-code-panel-settings", JSON.stringify(s));
  } catch {}
};

interface ReadOnlyCodePanelProps {
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

export function ReadOnlyCodePanel({
  code,
  language,
  problemId,
  problemTitle,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  onCommentClick,
}: ReadOnlyCodePanelProps) {
  const { theme } = useTheme();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const editorRef = useRef<any>(null);

  // Engagement state
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied");
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleLike = () => {
    if (liked) { setLiked(false); setLikes((l) => l - 1); }
    else { setLiked(true); setLikes((l) => l + 1); if (disliked) { setDisliked(false); setDislikes((d) => d - 1); } }
  };

  const handleDislike = () => {
    if (disliked) { setDisliked(false); setDislikes((d) => d - 1); }
    else { setDisliked(true); setDislikes((d) => d + 1); if (liked) { setLiked(false); setLikes((l) => l - 1); } }
  };

  const handleSettingChange = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: key === "fontSize" ? (value as number) : settings.fontSize,
        tabSize: key === "tabSize" ? (value as number) : settings.tabSize,
        wordWrap: key === "wordWrap" ? (value ? "on" : "off") : settings.wordWrap ? "on" : "off",
        lineNumbers: key === "lineNumbers" ? (value ? "on" : "off") : settings.lineNumbers ? "on" : "off",
        minimap: { enabled: key === "minimap" ? (value as boolean) : settings.minimap },
      });
    }
  };

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const monacoLanguage = LANGUAGE_MAP[language] || language;

  // Collapsed state: header only
  if (isCollapsed && !isExpanded) {
    return (
      <div className="h-full flex flex-col bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Code</span>
            <Badge variant="outline" className="text-[11px] capitalize h-5 px-2">{language}</Badge>
          </div>
          <div className="flex items-center gap-0.5">
            {onToggleCollapse && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse} title="Expand panel">
                <PanelTopOpen className="h-4 w-4" />
              </Button>
            )}
            {onToggleExpand && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand} title="Fullscreen">
                <Expand className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!code.trim()) {
    return (
      <div className="h-full flex flex-col bg-card">
        <div className="h-11 flex items-center justify-between px-4 border-b border-border/50 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Code</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          No code provided
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col bg-card overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header Row 1 - matches Solve CodeEditor */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Code</span>
          <span className="text-xs text-muted-foreground font-mono">{language}</span>
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

      {/* Header Row 2 - Tools (matches Solve CodeEditor toolbar) */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-background shrink-0">
        <span className="text-xs text-muted-foreground">Read-only</span>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy code">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Editor Settings">
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
                  <Slider value={[settings.fontSize]} onValueChange={([v]) => handleSettingChange("fontSize", v)} min={10} max={24} step={1} className="w-full" />
                </div>
                {/* Tab Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Tab Size</Label>
                    <span className="text-xs text-muted-foreground">{settings.tabSize} spaces</span>
                  </div>
                  <Slider value={[settings.tabSize]} onValueChange={([v]) => handleSettingChange("tabSize", v)} min={2} max={8} step={2} className="w-full" />
                </div>
                {/* Word Wrap */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Word Wrap</Label>
                  <Switch checked={settings.wordWrap} onCheckedChange={(c) => handleSettingChange("wordWrap", c)} />
                </div>
                {/* Line Numbers */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Line Numbers</Label>
                  <Switch checked={settings.lineNumbers} onCheckedChange={(c) => handleSettingChange("lineNumbers", c)} />
                </div>
                {/* Minimap */}
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Minimap</Label>
                  <Switch checked={settings.minimap} onCheckedChange={(c) => handleSettingChange("minimap", c)} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => document.documentElement.requestFullscreen?.()} title="Fullscreen">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Monaco Editor - options match Solve CodeEditor */}
      <div className="flex-1 overflow-hidden" style={{ overscrollBehavior: "contain" }}>
        <Editor
          height="100%"
          language={monacoLanguage}
          value={code}
          theme={monacoTheme}
          onMount={handleEditorMount}
          options={{
            readOnly: true,
            domReadOnly: true,
            fontSize: settings.fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            lineNumbers: settings.lineNumbers ? "on" : "off",
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 16,
            glyphMargin: true,
            folding: true,
            showFoldingControls: "always",
            minimap: { enabled: settings.minimap },
            wordWrap: settings.wordWrap ? "on" : "off",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: settings.tabSize,
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

      {/* Engagement Footer */}
      <div className="shrink-0 border-t border-border/50 px-4 py-1.5 bg-muted/20">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className={cn("h-7 px-2 gap-1.5", liked && "text-primary")} onClick={handleLike}>
                    <ThumbsUp className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                    <span className="text-[11px]">{likes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Like</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className={cn("h-7 px-2 gap-1.5", disliked && "text-destructive")} onClick={handleDislike}>
                    <ThumbsDown className={cn("h-3.5 w-3.5", disliked && "fill-current")} />
                    <span className="text-[11px]">{dislikes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Dislike</p></TooltipContent>
              </Tooltip>
              <div className="w-px h-4 bg-border/60 mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCommentClick}>
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Comments</p></TooltipContent>
              </Tooltip>
              <ShareTooltip title={problemTitle} url={window.location.href}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </ShareTooltip>
            </div>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReportDialogOpen(true)}>
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Report / Feedback</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className={cn("h-7 w-7", saved && "text-primary")} onClick={() => setSaved((s) => !s)}>
                    <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{saved ? "Unsave" : "Save"}</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      <ReportSuggestDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        contentType="problem"
        contentId={problemId}
        contentTitle={problemTitle}
        type="report"
      />
    </div>
  );
}
