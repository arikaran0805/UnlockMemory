import { useMemo, useState } from "react";
import { PostVersion } from "@/hooks/usePostVersions";
import { computeWordDiff, DiffSegment, normalizeDiffContent } from "@/lib/diffUtils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { isChatTranscript, extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { normalizeBubbleContent } from "@/lib/tiptapMigration";
import { Separator } from "@/components/ui/separator";

interface VersionDiffViewerProps {
  currentVersion: PostVersion;
  compareVersion: PostVersion | null;
  currentContent?: string;
  showHighlightToggle?: boolean;
}

const VersionDiffViewer = ({
  currentVersion,
  compareVersion,
  currentContent,
  showHighlightToggle = true,
}: VersionDiffViewerProps) => {
  const [showHighlights, setShowHighlights] = useState(true);

  const diff = useMemo(() => {
    const hasCompareVersion = compareVersion !== null;
    const oldContent = hasCompareVersion ? compareVersion.content : "";
    const newContent = currentVersion.content;
    const normalizedOldContent = normalizeDiffContent(oldContent);
    const normalizedNewContent = normalizeDiffContent(newContent);

    // Extract explanation portions for mixed content
    const oldExplanation = hasCompareVersion ? extractExplanation(oldContent) : null;
    const newExplanation = extractExplanation(newContent);
    const normalizedOldExplanation = oldExplanation ? normalizeDiffContent(oldExplanation) : null;
    const normalizedNewExplanation = newExplanation ? normalizeDiffContent(newExplanation) : null;
    const explanationDiff = (oldExplanation || newExplanation)
      ? computeWordDiff(normalizedOldExplanation || "", normalizedNewExplanation || "")
      : null;

    // If no old content, show all as "added"
    if (!oldContent) {
      if (isChatTranscript(newContent)) {
        const bubbles = extractChatSegments(newContent, { allowSingle: true }).map(b => ({ ...b, content: normalizeBubbleContent(b.content) }));
        return {
          type: "chat" as const,
          data: bubbles.map(bubble => ({ bubble, status: "added" as const })),
          isFirstVersion: true,
          explanationDiff,
          oldExplanation,
          newExplanation
        };
      }
      return { 
        type: "rich" as const, 
        data: [{ type: "added" as const, text: normalizedNewContent }],
        isFirstVersion: true,
        explanationDiff: null,
        oldExplanation: null,
        newExplanation: null
      };
    }

    // Check if it's chat content
    if (isChatTranscript(newContent)) {
      return { 
        type: "chat" as const, 
        data: compareChatBubbles(oldContent, newContent), 
        isFirstVersion: false,
        explanationDiff,
        oldExplanation: normalizedOldExplanation,
        newExplanation: normalizedNewExplanation
      };
    }

    // Rich text diff
    return { 
      type: "rich" as const, 
      data: computeWordDiff(normalizedOldContent, normalizedNewContent), 
      isFirstVersion: false,
      explanationDiff,
      oldExplanation: normalizedOldExplanation,
      newExplanation: normalizedNewExplanation
    };
  }, [currentVersion, compareVersion, currentContent]);

  if (diff.type === "chat") {
    return (
      <ChatDiffView 
        bubbles={diff.data} 
        isFirstVersion={diff.isFirstVersion}
        showHighlights={showHighlights}
        onToggleHighlights={showHighlightToggle ? setShowHighlights : undefined}
        explanationDiff={diff.explanationDiff}
        oldExplanation={diff.oldExplanation}
        newExplanation={diff.newExplanation}
      />
    );
  }

  return (
    <RichTextDiffView 
      segments={diff.data} 
      isFirstVersion={diff.isFirstVersion}
      showHighlights={showHighlights}
      onToggleHighlights={showHighlightToggle ? setShowHighlights : undefined}
    />
  );
};

// Compare chat bubbles and return highlighted version
function compareChatBubbles(oldContent: string, newContent: string) {
  const oldBubbles = extractChatSegments(oldContent, { allowSingle: true }).map(b => ({ ...b, content: normalizeBubbleContent(b.content) }));
  const newBubbles = extractChatSegments(newContent, { allowSingle: true }).map(b => ({ ...b, content: normalizeBubbleContent(b.content) }));

  const result: Array<{
    bubble: any;
    status: "unchanged" | "added" | "removed" | "modified";
    oldBubble?: any;
  }> = [];

  const maxLen = Math.max(oldBubbles.length, newBubbles.length);

  for (let i = 0; i < maxLen; i++) {
    const oldBubble = oldBubbles[i];
    const newBubble = newBubbles[i];

    if (!oldBubble && newBubble) {
      result.push({ bubble: newBubble, status: "added" });
    } else if (oldBubble && !newBubble) {
      result.push({ bubble: oldBubble, status: "removed" });
    } else if (JSON.stringify(oldBubble) !== JSON.stringify(newBubble)) {
      result.push({ bubble: newBubble, status: "modified", oldBubble });
    } else {
      result.push({ bubble: newBubble, status: "unchanged" });
    }
  }

  return result;
}

// Highlight toggle component
const HighlightToggle = ({
  showHighlights,
  onToggle,
}: {
  showHighlights: boolean;
  onToggle?: (value: boolean) => void;
}) => {
  if (!onToggle) return null;
  
  return (
    <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-muted/20 border border-border/40 rounded-lg">
      <Checkbox
        id="inline-highlight-toggle"
        checked={showHighlights}
        onCheckedChange={(checked) => onToggle(checked === true)}
      />
      <Label htmlFor="inline-highlight-toggle" className="text-sm cursor-pointer font-medium">
        Show highlights
      </Label>
      {showHighlights && (
        <div className="flex items-center gap-3 ml-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-400/80 border border-green-500/50" />
            Added
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400/80 border border-red-500/50" />
            Removed
          </span>
        </div>
      )}
    </div>
  );
};

// Render word-level diff for inline view
const renderInlineWordDiff = (oldText: string, newText: string) => {
  const diff = computeWordDiff(oldText, newText);
  
  return diff.map((segment, index) => {
    if (segment.type === "unchanged") {
      return <span key={index}>{segment.text}</span>;
    }
    if (segment.type === "removed") {
      return (
        <span
          key={index}
          className="bg-red-200 dark:bg-red-800/50 line-through text-red-700 dark:text-red-300 px-0.5 rounded"
        >
          {segment.text}
        </span>
      );
    }
    if (segment.type === "added") {
      return (
        <span
          key={index}
          className="bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-0.5 rounded"
        >
          {segment.text}
        </span>
      );
    }
    return <span key={index}>{segment.text}</span>;
  });
};

// Chat bubble for inline diff view
const InlineChatBubble = ({
  bubble,
  status,
  oldBubble,
  showHighlights,
}: {
  bubble: any;
  status: string;
  oldBubble?: any;
  showHighlights: boolean;
}) => {
  const isMentor = bubble?.speaker?.toLowerCase() === "karan";
  
  const getStatusRing = () => {
    if (!showHighlights) return "";
    switch (status) {
      case "added":
        return "ring-2 ring-green-400 dark:ring-green-600";
      case "removed":
        return "ring-2 ring-red-400 dark:ring-red-600";
      case "modified":
        return "ring-2 ring-amber-400 dark:ring-amber-600";
      default:
        return "";
    }
  };

  const getStatusBadge = () => {
    if (!showHighlights) return null;
    switch (status) {
      case "added":
        return <Badge className="bg-green-500 text-white text-xs">Added</Badge>;
      case "removed":
        return <Badge className="bg-red-500 text-white text-xs">Removed</Badge>;
      case "modified":
        return <Badge className="bg-amber-500 text-white text-xs">Modified</Badge>;
      default:
        return null;
    }
  };

  // Render word-level diff content for modified bubbles
  const renderContent = () => {
    if (status === "modified" && oldBubble && showHighlights) {
      return renderInlineWordDiff(oldBubble.content || "", bubble?.content || "");
    }
    return bubble?.content;
  };
  
  return (
    <div className="relative">
      {/* Status badge */}
      <div className="absolute -top-2 right-2 z-10">
        {getStatusBadge()}
      </div>
      
      <div
        className={`flex items-end gap-2.5 ${isMentor ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md ${
            isMentor
              ? "bg-gradient-to-br from-blue-400 to-blue-600"
              : "bg-gradient-to-br from-muted to-muted/80"
          }`}
        >
          {isMentor ? "👨‍💻" : "🤖"}
        </div>

        {/* Bubble */}
        <div
          className={`relative max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm ${
            isMentor
              ? "bg-gradient-to-br from-[hsl(210,100%,52%)] to-[hsl(210,100%,45%)] text-white rounded-br-md"
              : "bg-muted/80 text-foreground rounded-bl-md border border-border/30"
          } ${getStatusRing()} ${status === "removed" && showHighlights ? "opacity-60" : ""}`}
        >
          {/* Speaker indicator */}
          <div
            className={`text-[10px] font-semibold mb-1 tracking-wide uppercase ${
              isMentor ? "text-blue-100/80" : "text-primary"
            }`}
          >
            {bubble?.speaker || "Assistant"}
          </div>

          {/* Content with word-level diff */}
          <div className={`text-sm leading-relaxed ${status === "removed" && showHighlights ? "line-through" : ""}`}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Render chat diff view
const ChatDiffView = ({
  bubbles,
  isFirstVersion,
  showHighlights,
  onToggleHighlights,
  explanationDiff,
  oldExplanation,
  newExplanation,
}: {
  bubbles: Array<{
    bubble: any;
    status: "unchanged" | "added" | "removed" | "modified";
    oldBubble?: any;
  }>;
  isFirstVersion?: boolean;
  showHighlights: boolean;
  onToggleHighlights?: (value: boolean) => void;
  explanationDiff?: DiffSegment[] | null;
  oldExplanation?: string | null;
  newExplanation?: string | null;
}) => {
  const hasExplanation = oldExplanation || newExplanation;

  return (
    <div>
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      <div className="border rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center text-xs shadow">
              🤖
            </div>
            <span className="text-sm font-medium">Inline Diff View</span>
          </div>
        </div>
        <ScrollArea className="h-[600px]">
          <div className="p-4 space-y-4">
            {bubbles.map((item, index) => (
              <InlineChatBubble
                key={index}
                bubble={item.bubble}
                status={item.status}
                oldBubble={item.oldBubble}
                showHighlights={showHighlights}
              />
            ))}

            {bubbles.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No differences to display
              </div>
            )}

            {/* Explanation section (rich text after ---) */}
            {hasExplanation && (
              <>
                <Separator className="my-4" />
                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Explanation</h4>
                  <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
                    {!showHighlights || !explanationDiff ? (
                      <div>{newExplanation || oldExplanation || ""}</div>
                    ) : (
                      explanationDiff.map((segment, index) => {
                        if (segment.type === "removed") {
                          return (
                            <span
                              key={index}
                              className="bg-red-200 dark:bg-red-800/50 line-through text-red-700 dark:text-red-300 px-0.5 rounded"
                            >
                              {segment.text}
                            </span>
                          );
                        }
                        if (segment.type === "added") {
                          return (
                            <span
                              key={index}
                              className="bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-0.5 rounded"
                            >
                              {segment.text}
                            </span>
                          );
                        }
                        return <span key={index}>{segment.text}</span>;
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

// Render rich text diff view with proper highlighting
const RichTextDiffView = ({ 
  segments, 
  isFirstVersion,
  showHighlights,
  onToggleHighlights,
}: { 
  segments: DiffSegment[]; 
  isFirstVersion?: boolean;
  showHighlights: boolean;
  onToggleHighlights?: (value: boolean) => void;
}) => {
  return (
    <div>
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      <div className="border rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
          <span className="text-sm font-medium">Inline Diff View</span>
        </div>
        <ScrollArea className="h-[600px]">
          <div className="whitespace-pre-wrap break-words p-4 text-sm leading-7 text-foreground">
            {segments.map((segment, index) => {
              if (!showHighlights) {
                if (segment.type === "removed") return null;
                return <span key={index}>{segment.text}</span>;
              }
              
              switch (segment.type) {
                case "added":
                  return (
                    <span
                      key={index}
                      className="bg-green-200 dark:bg-green-800/50 text-green-900 dark:text-green-100 px-0.5 rounded"
                      title="Added"
                    >
                      {segment.text}
                    </span>
                  );
                case "removed":
                  return (
                    <span
                      key={index}
                      className="bg-red-200 dark:bg-red-800/50 line-through px-0.5 rounded text-red-700 dark:text-red-300"
                      title="Removed"
                    >
                      {segment.text}
                    </span>
                  );
                default:
                  return <span key={index}>{segment.text}</span>;
              }
            })}

            {segments.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No content to display
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default VersionDiffViewer;
