/**
 * FloatingAnnotationPopup - TipTap-integrated annotation creation
 * 
 * Uses LightEditor for annotation comments.
 * ONLY for Admins/Moderators - never for learners.
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, X, Send, Code, FileText, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { LightEditor, type LightEditorRef } from "@/components/tiptap";
import { extractPlainText, parseContent } from "@/lib/tiptapMigration";

interface FloatingAnnotationPopupProps {
  selectedText: {
    start: number;
    end: number;
    text: string;
    type?: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
    rect?: { top: number; left: number; width: number; height: number; bottom: number };
  } | null;
  onAddAnnotation: (
    selectionStart: number,
    selectionEnd: number,
    selectedText: string,
    comment: string,
    annotationType?: "paragraph" | "code" | "conversation"
  ) => void;
  onClose: () => void;
  isAdmin: boolean;
  isModerator: boolean;
}

// ── CSS Custom Highlight helpers ──────────────────────────────────────────
// When the LightEditor inside the popup gets focus the browser clears the
// native selection.  We use the CSS Custom Highlight API (Chrome 105+,
// Safari 17.2+) to keep a visible highlight on the original text range.
// The ::highlight(annotation-pending) rule in index.css colours it.

const HIGHLIGHT_NAME = "annotation-pending";

function paintCssHighlight(range: Range | null) {
  if (!range) return;
  try {
    const hl = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
    if (hl) hl.set(HIGHLIGHT_NAME, new (window as unknown as { Highlight: new (...r: Range[]) => unknown }).Highlight(range));
  } catch { /* browser doesn't support CSS Custom Highlight API — silent fallback */ }
}

function clearCssHighlight() {
  try {
    const hl = (CSS as unknown as { highlights: Map<string, unknown> }).highlights;
    if (hl) hl.delete(HIGHLIGHT_NAME);
  } catch { /* silent */ }
}
// ─────────────────────────────────────────────────────────────────────────

const FloatingAnnotationPopup = ({
  selectedText,
  onAddAnnotation,
  onClose,
  isAdmin,
  isModerator,
}: FloatingAnnotationPopupProps) => {
  const [comment, setComment] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [isExpanded, setIsExpanded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<LightEditorRef>(null);
  // Cloned Range — stays valid even after the browser clears the selection
  const rangeRef = useRef<Range | null>(null);

  // Capture range immediately when selectedText is set.
  // Clear the CSS highlight when selection is dismissed.
  useEffect(() => {
    if (!selectedText) {
      rangeRef.current = null;
      clearCssHighlight();
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      rangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, [selectedText]);

  // When the popup expands the LightEditor steals focus and the browser
  // drops the native selection. Paint our CSS highlight so the user can
  // still see which text they're annotating.
  useEffect(() => {
    if (isExpanded) {
      paintCssHighlight(rangeRef.current);
    } else {
      clearCssHighlight();
    }
  }, [isExpanded]);

  // Position calculation — re-runs on scroll/resize using the stored Range
  useEffect(() => {
    if (!selectedText) {
      setPosition(null);
      setIsExpanded(false);
      setComment("");
      setPlacement("top");
      return;
    }

    const computePosition = () => {
      let rect: DOMRect | null = null;

      // Primary: query the cloned Range (always has current viewport coords)
      if (rangeRef.current) {
        const r = rangeRef.current.getBoundingClientRect();
        if (r.width !== 0 || r.height !== 0) rect = r;
      }

      // Fallback: snapshot rect passed in (e.g. from TipTap coordsAtPos)
      if (!rect && selectedText.rect && (selectedText.rect.width > 0 || selectedText.rect.height > 0)) {
        rect = selectedText.rect as DOMRect;
      }

      if (!rect) { setPosition(null); return; }

      const padding = 12;
      const minHalfWidth = 150;
      const popupHeight = isExpanded ? 280 : 50;

      let top = rect.top - popupHeight - 12;
      let nextPlacement: "top" | "bottom" = "top";

      if (top < padding) {
        top = rect.bottom + 12;
        nextPlacement = "bottom";
      }

      const rawLeft = rect.left + rect.width / 2;
      const left = Math.max(
        padding + minHalfWidth,
        Math.min(window.innerWidth - padding - minHalfWidth, rawLeft),
      );

      setPlacement(nextPlacement);
      setPosition({ top, left });
    };

    let rafId: number;
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(computePosition);
    };

    scheduleUpdate();

    // Re-anchor on every scroll (capture phase catches nested scrollable panels)
    // and on resize. The cloned Range gives fresh getBoundingClientRect() each time.
    window.addEventListener("scroll", scheduleUpdate, { passive: true, capture: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleUpdate, { capture: true });
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [selectedText, isExpanded]);

  // Focus editor when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => editorRef.current?.focus(), 50);
    }
  }, [isExpanded]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        const text = editorRef.current?.getText() || '';
        if (isExpanded && text.trim()) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose, isExpanded]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSubmit = () => {
    if (!selectedText) return;
    
    // Extract plain text from JSON content
    const plainText = extractPlainText(parseContent(comment));
    if (!plainText.trim()) return;

    onAddAnnotation(
      selectedText.start,
      selectedText.end,
      selectedText.text,
      plainText.trim(),
      selectedText.type
    );

    setComment("");
    setIsExpanded(false);
    clearCssHighlight();
    onClose();
  };

  const getTypeIcon = () => {
    switch (selectedText?.type) {
      case "code":
        return <Code className="h-3 w-3" />;
      case "conversation":
        return <MessageCircle className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getTypeLabel = () => {
    switch (selectedText?.type) {
      case "code":
        return "Code";
      case "conversation":
        return "Chat";
      default:
        return "Text";
    }
  };

  // CRITICAL: Only admins/moderators can see this popup
  if (!selectedText || !position || (!isAdmin && !isModerator)) {
    return null;
  }

  return (
    <div
      ref={popupRef}
      className={cn(
        "fixed z-[9999] transform -translate-x-1/2",
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {/* Arrow pointing to selection */}
      {placement === "top" ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-popover drop-shadow-sm" />
        </div>
      ) : (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-popover drop-shadow-sm" />
        </div>
      )}

      <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[280px] max-w-[400px]">
        {!isExpanded ? (
          <div className="flex items-center gap-2 p-2">
            <Button
              size="sm"
              variant="ghost"
              className="gap-2 flex-1 justify-start"
              onMouseDown={e => e.preventDefault()}
              onClick={() => setIsExpanded(true)}
            >
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              <span>Add annotation</span>
            </Button>
            <Badge variant="secondary" className="gap-1 text-xs">
              {getTypeIcon()}
              {getTypeLabel()}
            </Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Add annotation</span>
                <Badge variant="secondary" className="gap-1 text-xs">
                  {getTypeIcon()}
                  {getTypeLabel()}
                </Badge>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Selected text preview */}
            <div className="p-2 bg-primary/10 border-l-4 border-primary rounded text-xs line-clamp-2 text-muted-foreground">
              "{selectedText.text}"
            </div>

            {/* Comment input - LightEditor */}
            <LightEditor
              ref={editorRef}
              value={comment}
              onChange={setComment}
              placeholder="Enter your feedback or suggestion..."
              characterLimit={500}
              minHeight="80px"
              showCharCount
              autoFocus
            />

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                ⌘/Ctrl + Enter to submit
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  className="gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FloatingAnnotationPopup;
