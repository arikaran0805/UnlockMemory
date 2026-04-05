import { useState } from "react";
import { PostVersion } from "@/hooks/usePostVersions";
import { computeWordDiff, normalizeDiffContent } from "@/lib/diffUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { isChatTranscript, extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { format } from "date-fns";
import { User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface SideBySideComparisonProps {
  oldVersion: PostVersion;
  newVersion: PostVersion;
}

const SideBySideComparison = ({
  oldVersion,
  newVersion,
}: SideBySideComparisonProps) => {
  const [showHighlights, setShowHighlights] = useState(true);

  const isChatContent = isChatTranscript(newVersion.content);

  if (isChatContent) {
    return (
      <ChatSideBySide
        oldVersion={oldVersion}
        newVersion={newVersion}
        showHighlights={showHighlights}
        onToggleHighlights={setShowHighlights}
      />
    );
  }

  return (
    <RichTextSideBySide
      oldVersion={oldVersion}
      newVersion={newVersion}
      showHighlights={showHighlights}
      onToggleHighlights={setShowHighlights}
    />
  );
};

interface SideBySideProps {
  oldVersion: PostVersion;
  newVersion: PostVersion;
  showHighlights: boolean;
  onToggleHighlights: (value: boolean) => void;
}

const VersionHeader = ({ version, label }: { version: PostVersion; label: string }) => (
  <div className="p-3 bg-muted/50 border-b">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{label}</span>
        <Badge variant="secondary">v{version.version_number}</Badge>
        {version.editor_role === "admin" ? (
          <Badge className="bg-primary text-primary-foreground gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            Moderator
          </Badge>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {format(new Date(version.created_at), "MMM d, yyyy h:mm a")}
      </span>
    </div>
    <div className="text-xs text-muted-foreground mt-1">
      By: {version.editor_profile?.full_name || version.editor_profile?.email || "Unknown"}
    </div>
  </div>
);

const HighlightToggle = ({
  showHighlights,
  onToggle,
}: {
  showHighlights: boolean;
  onToggle: (value: boolean) => void;
}) => (
  <div className="flex items-center gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
    <Switch
      id="highlight-toggle"
      checked={showHighlights}
      onCheckedChange={onToggle}
    />
    <Label htmlFor="highlight-toggle" className="text-sm cursor-pointer">
      Show change highlights
    </Label>
    {showHighlights && (
      <div className="flex items-center gap-4 ml-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-600" />
          <span>Modified</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-300 dark:bg-green-700" />
          <span>Added</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-300 dark:bg-red-700" />
          <span>Removed</span>
        </div>
      </div>
    )}
  </div>
);

const RichTextSideBySide = ({
  oldVersion,
  newVersion,
  showHighlights,
  onToggleHighlights,
}: SideBySideProps) => {
  const oldText = normalizeDiffContent(oldVersion.content);
  const newText = normalizeDiffContent(newVersion.content);
  const diff = computeWordDiff(oldText, newText);

  // Separate segments into old and new views
  const renderOldContent = () => {
    if (!showHighlights) {
      return <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{oldText}</div>;
    }

    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
        {diff.map((segment, index) => {
          if (segment.type === "added") {
            return null; // Don't show added content in old view
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
          return <span key={index}>{segment.text}</span>;
        })}
      </div>
    );
  };

  const renderNewContent = () => {
    if (!showHighlights) {
      return <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">{newText}</div>;
    }

    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
        {diff.map((segment, index) => {
          if (segment.type === "removed") {
            return null; // Don't show removed content in new view
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
          // Check if this unchanged segment is adjacent to changes
          const prevSegment = diff[index - 1];
          const nextSegment = diff[index + 1];
          const isNearChange = prevSegment?.type !== "unchanged" || nextSegment?.type !== "unchanged";
          
          if (isNearChange && prevSegment?.type === "removed" && nextSegment?.type === "added") {
            return (
              <span
                key={index}
                className="bg-amber-100 dark:bg-amber-800/30 px-0.5 rounded"
              >
                {segment.text}
              </span>
            );
          }
          return <span key={index}>{segment.text}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg overflow-hidden">
          <VersionHeader version={oldVersion} label="Previous Version" />
          <ScrollArea className="h-[600px]">
            <div className="p-4">{renderOldContent()}</div>
          </ScrollArea>
        </div>
        
        <div className="border rounded-lg overflow-hidden border-primary/50">
          <VersionHeader version={newVersion} label="Updated Version" />
          <ScrollArea className="h-[600px]">
            <div className="p-4">{renderNewContent()}</div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

// Chat bubble styled like public post view with word-level diff support
const ChatBubble = ({
  bubble,
  showHighlight,
  highlightClass,
  isStrikethrough,
  diffContent,
}: {
  bubble: { speaker: string; content: string };
  showHighlight?: boolean;
  highlightClass?: string;
  isStrikethrough?: boolean;
  diffContent?: React.ReactNode;
}) => {
  const isMentor = bubble.speaker?.toLowerCase() === "karan";
  
  return (
    <div
      className={cn(
        "flex items-end gap-2.5",
        isMentor ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm",
          "shadow-md",
          isMentor
            ? "bg-gradient-to-br from-blue-400 to-blue-600"
            : "bg-gradient-to-br from-muted to-muted/80"
        )}
      >
        {isMentor ? "👨‍💻" : "🤖"}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "relative max-w-[85%] px-4 py-2.5 rounded-2xl shadow-sm",
          isMentor
            ? "bg-gradient-to-br from-[hsl(210,100%,52%)] to-[hsl(210,100%,45%)] text-white rounded-br-md"
            : "bg-muted/80 text-foreground rounded-bl-md border border-border/30",
          showHighlight && highlightClass
        )}
      >
        {/* Speaker indicator */}
        <div
          className={cn(
            "text-[10px] font-semibold mb-1 tracking-wide uppercase",
            isMentor ? "text-blue-100/80" : "text-primary"
          )}
        >
          {bubble.speaker || "Assistant"}
        </div>

        {/* Content with word-level diff */}
        <div className={cn("text-sm leading-relaxed", isStrikethrough && "line-through opacity-60")}>
          {diffContent || bubble.content}
        </div>
      </div>
    </div>
  );
};

// Render word-level diff content
const renderWordDiff = (oldText: string, newText: string, showAdded: boolean) => {
  const diff = computeWordDiff(oldText, newText);
  
  return diff.map((segment, index) => {
    if (segment.type === "unchanged") {
      return <span key={index}>{segment.text}</span>;
    }
    if (segment.type === "removed") {
      if (!showAdded) {
        return (
          <span
            key={index}
            className="bg-red-300/50 dark:bg-red-700/50 line-through px-0.5 rounded"
          >
            {segment.text}
          </span>
        );
      }
      return null;
    }
    if (segment.type === "added") {
      if (showAdded) {
        return (
          <span
            key={index}
            className="bg-green-300/50 dark:bg-green-700/50 px-0.5 rounded"
          >
            {segment.text}
          </span>
        );
      }
      return null;
    }
    return <span key={index}>{segment.text}</span>;
  });
};

const ChatSideBySide = ({
  oldVersion,
  newVersion,
  showHighlights,
  onToggleHighlights,
}: SideBySideProps) => {
  const oldBubbles = extractChatSegments(oldVersion.content, { allowSingle: true });
  const newBubbles = extractChatSegments(newVersion.content, { allowSingle: true });
  
  // Extract explanation portions (rich text after ---)
  const oldExplanation = extractExplanation(oldVersion.content);
  const newExplanation = extractExplanation(newVersion.content);
  const explanationDiff = oldExplanation || newExplanation 
    ? computeWordDiff(oldExplanation || "", newExplanation || "")
    : null;

  // Compare bubbles
  const maxLen = Math.max(oldBubbles.length, newBubbles.length);
  const bubbleComparisons: Array<{
    oldBubble: any;
    newBubble: any;
    status: "unchanged" | "added" | "removed" | "modified";
  }> = [];

  for (let i = 0; i < maxLen; i++) {
    const oldBubble = oldBubbles[i];
    const newBubble = newBubbles[i];

    if (!oldBubble && newBubble) {
      bubbleComparisons.push({ oldBubble: null, newBubble, status: "added" });
    } else if (oldBubble && !newBubble) {
      bubbleComparisons.push({ oldBubble, newBubble: null, status: "removed" });
    } else if (JSON.stringify(oldBubble) !== JSON.stringify(newBubble)) {
      bubbleComparisons.push({ oldBubble, newBubble, status: "modified" });
    } else {
      bubbleComparisons.push({ oldBubble, newBubble, status: "unchanged" });
    }
  }

  // Render explanation section with diff highlighting
  const renderOldExplanation = () => {
    if (!oldExplanation && !newExplanation) return null;
    
    return (
      <>
        <Separator className="my-4" />
        <div className="p-4 bg-muted/20 rounded-lg">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Explanation</h4>
          <div className="prose dark:prose-invert max-w-none text-sm">
            {!showHighlights || !explanationDiff ? (
              <div dangerouslySetInnerHTML={{ __html: oldExplanation || "" }} />
            ) : (
              explanationDiff.map((segment, index) => {
                if (segment.type === "added") return null;
                if (segment.type === "removed") {
                  return (
                    <span
                      key={index}
                      className="bg-red-200 dark:bg-red-800/50 line-through text-red-700 dark:text-red-300 px-0.5 rounded"
                      dangerouslySetInnerHTML={{ __html: segment.text }}
                    />
                  );
                }
                return <span key={index} dangerouslySetInnerHTML={{ __html: segment.text }} />;
              })
            )}
          </div>
        </div>
      </>
    );
  };

  const renderNewExplanation = () => {
    if (!oldExplanation && !newExplanation) return null;
    
    return (
      <>
        <Separator className="my-4" />
        <div className="p-4 bg-muted/20 rounded-lg">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Explanation</h4>
          <div className="prose dark:prose-invert max-w-none text-sm">
            {!showHighlights || !explanationDiff ? (
              <div dangerouslySetInnerHTML={{ __html: newExplanation || "" }} />
            ) : (
              explanationDiff.map((segment, index) => {
                if (segment.type === "removed") return null;
                if (segment.type === "added") {
                  return (
                    <span
                      key={index}
                      className="bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-0.5 rounded"
                      dangerouslySetInnerHTML={{ __html: segment.text }}
                    />
                  );
                }
                return <span key={index} dangerouslySetInnerHTML={{ __html: segment.text }} />;
              })
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <HighlightToggle showHighlights={showHighlights} onToggle={onToggleHighlights} />
      
      <div className="grid grid-cols-2 gap-4">
        {/* Old Version Panel */}
        <div className="border rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-lg">
          <VersionHeader version={oldVersion} label="Previous Version" />
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-4">
              {bubbleComparisons.map((comp, index) => {
                if (!comp.oldBubble) {
                  return showHighlights ? (
                    <div key={index} className="h-14 border-2 border-dashed border-muted-foreground/30 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                      New message added
                    </div>
                  ) : null;
                }
                
                const highlightClass = showHighlights && comp.status === "removed" 
                  ? "ring-2 ring-red-400 dark:ring-red-600" 
                  : showHighlights && comp.status === "modified"
                  ? "ring-2 ring-amber-400 dark:ring-amber-600"
                  : "";
                
                // For modified bubbles, show word-level diff
                const diffContent = comp.status === "modified" && showHighlights && comp.newBubble
                  ? renderWordDiff(comp.oldBubble.content || "", comp.newBubble.content || "", false)
                  : undefined;
                
                return (
                  <ChatBubble
                    key={index}
                    bubble={comp.oldBubble}
                    showHighlight={showHighlights}
                    highlightClass={highlightClass}
                    isStrikethrough={comp.status === "removed" && showHighlights}
                    diffContent={diffContent}
                  />
                );
              })}
              
              {renderOldExplanation()}
            </div>
          </ScrollArea>
        </div>
        
        {/* New Version Panel */}
        <div className="border border-primary/50 rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-lg">
          <VersionHeader version={newVersion} label="Updated Version" />
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-4">
              {bubbleComparisons.map((comp, index) => {
                if (!comp.newBubble) {
                  return showHighlights ? (
                    <div key={index} className="h-14 border-2 border-dashed border-red-300 dark:border-red-700 rounded-xl flex items-center justify-center text-xs text-red-500">
                      Message removed
                    </div>
                  ) : null;
                }
                
                const highlightClass = showHighlights && comp.status === "added" 
                  ? "ring-2 ring-green-400 dark:ring-green-600" 
                  : showHighlights && comp.status === "modified"
                  ? "ring-2 ring-amber-400 dark:ring-amber-600"
                  : "";
                
                // For modified bubbles, show word-level diff
                const diffContent = comp.status === "modified" && showHighlights && comp.oldBubble
                  ? renderWordDiff(comp.oldBubble.content || "", comp.newBubble.content || "", true)
                  : undefined;
                
                return (
                  <ChatBubble
                    key={index}
                    bubble={comp.newBubble}
                    showHighlight={showHighlights}
                    highlightClass={highlightClass}
                    diffContent={diffContent}
                  />
                );
              })}
              
              {renderNewExplanation()}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default SideBySideComparison;
