import { useState } from "react";
import { PostVersion } from "@/hooks/usePostVersions";
import { computeWordDiff, normalizeDiffContent } from "@/lib/diffUtils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { isChatTranscript, extractChatSegments, extractExplanation } from "@/lib/chatContent";
import { normalizeBubbleContent } from "@/lib/tiptapMigration";
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
  const isChatContent = isChatTranscript(newVersion.content);

  if (isChatContent) {
    return <ChatSideBySide oldVersion={oldVersion} newVersion={newVersion} />;
  }

  return <RichTextSideBySide oldVersion={oldVersion} newVersion={newVersion} />;
};

interface SideBySideProps {
  oldVersion: PostVersion;
  newVersion: PostVersion;
}

// ─── Shared sub-components ────────────────────────────────────────────────────

const VersionHeader = ({ version, label }: { version: PostVersion; label: string }) => (
  <div className="sticky top-0 z-10 px-4 py-3 bg-muted/80 backdrop-blur-sm border-b border-border/50">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <Badge variant="secondary" className="text-xs">v{version.version_number}</Badge>
        {version.editor_role === "admin" ? (
          <Badge className="bg-primary text-primary-foreground gap-1 text-xs py-0">
            <Shield className="h-2.5 w-2.5" />
            Admin
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-xs py-0">
            <User className="h-2.5 w-2.5" />
            Moderator
          </Badge>
        )}
      </div>
      <div className="text-right">
        <div className="text-[11px] text-muted-foreground">
          {version.editor_profile?.full_name || version.editor_profile?.email || "Unknown"}
        </div>
        <div className="text-[11px] text-muted-foreground/70">
          {format(new Date(version.created_at), "MMM d, yyyy · h:mm a")}
        </div>
      </div>
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
  <div className="flex items-center gap-3 mb-4 px-3 py-2.5 bg-muted/20 border border-border/40 rounded-lg">
    <Checkbox
      id="sbs-highlight-toggle"
      checked={showHighlights}
      onCheckedChange={(checked) => onToggle(checked === true)}
    />
    <Label htmlFor="sbs-highlight-toggle" className="text-sm cursor-pointer font-medium">
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
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400/80 border border-amber-500/50" />
          Modified
        </span>
      </div>
    )}
  </div>
);

const ChangeSummary = ({
  added,
  removed,
  modified,
}: {
  added: number;
  removed: number;
  modified?: number;
}) => {
  if (added === 0 && removed === 0 && (!modified || modified === 0)) return null;
  return (
    <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-muted/10 border border-border/30 rounded-lg text-xs">
      <span className="text-muted-foreground font-medium">Changes:</span>
      {added > 0 && (
        <span className="text-green-600 dark:text-green-400 font-semibold">+{added} added</span>
      )}
      {removed > 0 && (
        <span className="text-red-600 dark:text-red-400 font-semibold">−{removed} removed</span>
      )}
      {modified !== undefined && modified > 0 && (
        <span className="text-amber-600 dark:text-amber-400 font-semibold">{modified} modified</span>
      )}
    </div>
  );
};

// ─── Rich Text Side-by-Side ───────────────────────────────────────────────────

const RichTextSideBySide = ({ oldVersion, newVersion }: SideBySideProps) => {
  const [showHighlights, setShowHighlights] = useState(true);

  const oldText = normalizeDiffContent(oldVersion.content);
  const newText = normalizeDiffContent(newVersion.content);
  const diff = computeWordDiff(oldText, newText);

  const addedCount = diff.filter((s) => s.type === "added").length;
  const removedCount = diff.filter((s) => s.type === "removed").length;

  const renderOldContent = () => {
    if (!showHighlights) {
      return (
        <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
          {oldText}
        </div>
      );
    }
    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
        {diff.map((segment, index) => {
          if (segment.type === "added") return null;
          if (segment.type === "removed") {
            return (
              <span
                key={index}
                className="bg-red-100 dark:bg-red-900/40 line-through text-red-700 dark:text-red-300 px-0.5 rounded border-l-2 border-red-400/70"
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
      return (
        <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
          {newText}
        </div>
      );
    }
    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-foreground">
        {diff.map((segment, index) => {
          if (segment.type === "removed") return null;
          if (segment.type === "added") {
            return (
              <span
                key={index}
                className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-0.5 rounded border-l-2 border-green-400/70"
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
    <div className="space-y-3">
      <HighlightToggle showHighlights={showHighlights} onToggle={setShowHighlights} />
      {showHighlights && <ChangeSummary added={addedCount} removed={removedCount} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl overflow-hidden shadow-sm">
          <VersionHeader version={oldVersion} label="Previous" />
          <ScrollArea className="h-[580px]">
            <div className="p-4">{renderOldContent()}</div>
          </ScrollArea>
        </div>

        <div className="border rounded-xl overflow-hidden shadow-sm border-primary/30">
          <VersionHeader version={newVersion} label="Updated" />
          <ScrollArea className="h-[580px]">
            <div className="p-4">{renderNewContent()}</div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

// ─── Chat bubble ──────────────────────────────────────────────────────────────

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
    <div className={cn("flex items-end gap-2.5", isMentor ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md",
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
        <div
          className={cn(
            "text-[10px] font-semibold mb-1 tracking-wide uppercase",
            isMentor ? "text-blue-100/80" : "text-primary"
          )}
        >
          {bubble.speaker || "Assistant"}
        </div>
        <div className={cn("text-sm leading-relaxed", isStrikethrough && "line-through opacity-60")}>
          {diffContent || bubble.content}
        </div>
      </div>
    </div>
  );
};

// Render word-level diff within a bubble
const renderWordDiff = (oldText: string, newText: string, showAdded: boolean) => {
  const diff = computeWordDiff(oldText, newText);
  return diff.map((segment, index) => {
    if (segment.type === "unchanged") return <span key={index}>{segment.text}</span>;
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

// ─── Chat Side-by-Side ────────────────────────────────────────────────────────

const ChatSideBySide = ({ oldVersion, newVersion }: SideBySideProps) => {
  const [showHighlights, setShowHighlights] = useState(true);

  const oldBubbles = extractChatSegments(oldVersion.content, { allowSingle: true }).map(b => ({ ...b, content: normalizeBubbleContent(b.content) }));
  const newBubbles = extractChatSegments(newVersion.content, { allowSingle: true }).map(b => ({ ...b, content: normalizeBubbleContent(b.content) }));

  const oldExplanation = extractExplanation(oldVersion.content);
  const newExplanation = extractExplanation(newVersion.content);
  const explanationDiff =
    oldExplanation || newExplanation
      ? computeWordDiff(oldExplanation || "", newExplanation || "")
      : null;

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

  const addedCount = bubbleComparisons.filter((c) => c.status === "added").length;
  const removedCount = bubbleComparisons.filter((c) => c.status === "removed").length;
  const modifiedCount = bubbleComparisons.filter((c) => c.status === "modified").length;

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
                      className="bg-red-100 dark:bg-red-900/40 line-through text-red-700 dark:text-red-300 px-0.5 rounded"
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
                      className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-0.5 rounded"
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
    <div className="space-y-3">
      <HighlightToggle showHighlights={showHighlights} onToggle={setShowHighlights} />
      {showHighlights && (
        <ChangeSummary added={addedCount} removed={removedCount} modified={modifiedCount} />
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Old Version Panel */}
        <div className="border rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-sm">
          <VersionHeader version={oldVersion} label="Previous" />
          <ScrollArea className="h-[580px]">
            <div className="p-4 space-y-4">
              {bubbleComparisons.map((comp, index) => {
                if (!comp.oldBubble) {
                  return showHighlights ? (
                    <div
                      key={index}
                      className="h-12 border-2 border-dashed border-muted-foreground/25 rounded-xl flex items-center justify-center text-xs text-muted-foreground/60"
                    >
                      New message added
                    </div>
                  ) : null;
                }

                const highlightClass =
                  showHighlights && comp.status === "removed"
                    ? "ring-2 ring-red-400 dark:ring-red-600"
                    : showHighlights && comp.status === "modified"
                    ? "ring-2 ring-amber-400 dark:ring-amber-600"
                    : "";

                const diffContent =
                  comp.status === "modified" && showHighlights && comp.newBubble
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
        <div className="border border-primary/30 rounded-2xl overflow-hidden bg-gradient-to-b from-background via-background to-muted/30 shadow-sm">
          <VersionHeader version={newVersion} label="Updated" />
          <ScrollArea className="h-[580px]">
            <div className="p-4 space-y-4">
              {bubbleComparisons.map((comp, index) => {
                if (!comp.newBubble) {
                  return showHighlights ? (
                    <div
                      key={index}
                      className="h-12 border-2 border-dashed border-red-300/50 dark:border-red-700/50 rounded-xl flex items-center justify-center text-xs text-red-500/70"
                    >
                      Message removed
                    </div>
                  ) : null;
                }

                const highlightClass =
                  showHighlights && comp.status === "added"
                    ? "ring-2 ring-green-400 dark:ring-green-600"
                    : showHighlights && comp.status === "modified"
                    ? "ring-2 ring-amber-400 dark:ring-amber-600"
                    : "";

                const diffContent =
                  comp.status === "modified" && showHighlights && comp.oldBubble
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
