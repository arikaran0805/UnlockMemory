/**
 * EliminateWrongCodePanel
 * Read-only Monaco code viewer panel — matches PredictCodePanel style.
 * Includes engagement footer (Like, Dislike, Comment, Share, Report, Save).
 */
import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Flag,
  Bookmark,
} from "lucide-react";
import Editor from "@monaco-editor/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ShareTooltip from "@/components/ShareTooltip";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";

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
  problemId,
  problemTitle,
  isExpanded = false,
  onToggleExpand,
  isCollapsed = false,
  onToggleCollapse,
  onCommentClick,
}: Props) {
  const { theme } = useTheme();
  const monacoTheme = theme === "dark" ? "vs-dark" : "vs";
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
    if (liked) {
      setLiked(false);
      setLikes((l) => l - 1);
    } else {
      setLiked(true);
      setLikes((l) => l + 1);
      if (disliked) {
        setDisliked(false);
        setDislikes((d) => d - 1);
      }
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDisliked(false);
      setDislikes((d) => d - 1);
    } else {
      setDisliked(true);
      setDislikes((d) => d + 1);
      if (liked) {
        setLiked(false);
        setLikes((l) => l - 1);
      }
    }
  };

  // Collapsed state: show header only
  if (isCollapsed && !isExpanded) {
    return (
      <div className="h-full flex flex-col bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
          <div className="flex items-center gap-2">
            <Braces className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Code</span>
            <Badge variant="outline" className="text-[11px] capitalize h-5 px-2">
              {language}
            </Badge>
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
      className="h-full flex flex-col bg-card overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-11 border-b border-border/50 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          <Braces className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Code</span>
          <Badge variant="outline" className="text-[11px] capitalize h-5 px-2">
            {language}
          </Badge>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}
        >
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy} title="Copy code">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
              <PanelTopClose className="h-4 w-4" />
            </Button>
          )}
          {onToggleExpand && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
              {isExpanded ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0" style={{ overscrollBehavior: "contain" }}>
        <Editor
          height="100%"
          language={LANGUAGE_MAP[language] || language}
          value={code}
          theme={monacoTheme}
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: "on",
            lineNumbersMinChars: 2,
            lineDecorationsWidth: 12,
            glyphMargin: false,
            renderLineHighlight: "none",
            folding: false,
            contextmenu: false,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            padding: { top: 12, bottom: 12 },
            scrollbar: { vertical: "auto", horizontal: "auto", verticalScrollbarSize: 6 },
            wordWrap: "on",
            dragAndDrop: false,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            cursorStyle: "line-thin",
            cursorBlinking: "solid",
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: false },
            smoothScrolling: true,
            renderWhitespace: "none",
          }}
        />
      </div>

      {/* Engagement Footer */}
      <div className="shrink-0 border-t border-border/50 px-4 py-1.5 bg-muted/20">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-0.5">
              {/* Like */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-7 px-2 gap-1.5", liked && "text-primary")}
                    onClick={handleLike}
                  >
                    <ThumbsUp className={cn("h-3.5 w-3.5", liked && "fill-current")} />
                    <span className="text-[11px]">{likes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Like</p></TooltipContent>
              </Tooltip>

              {/* Dislike */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn("h-7 px-2 gap-1.5", disliked && "text-destructive")}
                    onClick={handleDislike}
                  >
                    <ThumbsDown className={cn("h-3.5 w-3.5", disliked && "fill-current")} />
                    <span className="text-[11px]">{dislikes}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Dislike</p></TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-border/60 mx-1" />

              {/* Comment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onCommentClick}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Comments</p></TooltipContent>
              </Tooltip>

              {/* Share */}
              <ShareTooltip title={problemTitle} url={window.location.href}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
              </ShareTooltip>
            </div>

            <div className="flex items-center gap-0.5">
              {/* Feedback */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setReportDialogOpen(true)}
                  >
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Report / Feedback</p></TooltipContent>
              </Tooltip>

              {/* Save */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-7 w-7", saved && "text-primary")}
                    onClick={() => setSaved((s) => !s)}
                  >
                    <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{saved ? "Unsave" : "Save"}</p></TooltipContent>
              </Tooltip>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Report Dialog */}
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
