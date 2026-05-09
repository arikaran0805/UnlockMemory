/**
 * LessonNotesCard - Quick Notes (Scratchpad)
 *
 * Behavior:
 *  - Always opens with a fresh/empty editor — it is an ephemeral scratchpad.
 *  - On collapse (blur / close), non-empty content is APPENDED to the deep note
 *    via the `appendContent` prop. The editor is then cleared.
 *  - Re-opening always gives a blank slate.
 *  - The collapsed preview shows the accumulated deep-notes content so the user
 *    can see their history and knows they're adding to it.
 *  - On unmount while expanded (page navigation), any pending scratch is flushed.
 *
 * NOTES LEAK FIX (production-grade):
 *
 * Root cause: `appendContentRef.current` and `updateContentRef.current` are updated
 * synchronously on every render. When the lesson changes, the parent re-renders and
 * these refs immediately point to the NEW lesson's callbacks — before the old editor
 * content is cleared. Any subsequent flush (unmount, blur) would then write old-lesson
 * scratch content into the new lesson's note.
 *
 * Fix: `scratchLessonIdRef` tracks which lessonId this scratchpad was opened for.
 * Every flush path checks it against the current `lessonId` prop. If they differ,
 * the content belongs to a different lesson — it is discarded, not written anywhere.
 * A dedicated `useEffect` on `lessonId` proactively clears the editor and resets
 * `isExpanded` the moment the lesson changes, so stale content never lingers.
 */

import { useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StickyNote, Loader2, Check, ExternalLink, Bold, Italic, Link2, Code } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { getTextPreview, serializeContent } from "@/lib/tiptapMigration";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "@/styles/tiptap.css";

interface LessonNotesCardProps {
  /** Accumulated deep-notes content — used only for collapsed preview + save status */
  content: string;
  /** Direct setter — kept as fallback if appendContent is not provided */
  updateContent: (content: string) => void;
  /** Append-only updater: called with the scratch JSON when Quick Notes closes */
  appendContent?: (newContent: string) => void;
  isSaving: boolean;
  isSyncing?: boolean;
  lastSavedText: string | null;
  isLoading: boolean;
  courseId?: string;
  lessonId?: string;
  careerId?: string;
  onOpenDeepNotes?: () => void;
}

const lowlight = createLowlight(common);

const getQuickNotesExtensions = () => [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
  }),
  Placeholder.configure({
    placeholder: "Jot down a quick note…",
    emptyEditorClass: "is-editor-empty",
  }),
  Link.configure({
    openOnClick: true,
    HTMLAttributes: {
      class: "text-primary underline underline-offset-2",
      rel: "noopener noreferrer",
      target: "_blank",
    },
  }),
  CodeBlockLowlight.configure({
    lowlight,
    HTMLAttributes: {
      class: "quick-notes-code-block bg-muted/30 rounded-md p-2 my-2 text-xs font-mono",
    },
  }),
];

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] } as const;

export function LessonNotesCard({
  content,
  updateContent,
  appendContent,
  isSaving,
  isSyncing = false,
  lastSavedText,
  isLoading,
  courseId,
  lessonId,
  careerId,
  onOpenDeepNotes,
}: LessonNotesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deepNotesHovered, setDeepNotesHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Always-current callback refs. Updated synchronously on every render, so after a
  // lesson change they already point to the NEW lesson's handlers. This is intentional
  // for the normal same-lesson flush path — the leak guard (scratchLessonIdRef) prevents
  // them from being called with stale content from a different lesson.
  const appendContentRef = useRef(appendContent);
  appendContentRef.current = appendContent;
  const updateContentRef = useRef(updateContent);
  updateContentRef.current = updateContent;

  // ── Lesson ownership tracking ─────────────────────────────────────────────────
  // Records which lessonId this scratchpad session was opened for. Set in
  // handleExpand. Cleared (set to undefined) when the lesson changes.
  // Every flush path checks this before writing content anywhere.
  const scratchLessonIdRef = useRef<string | undefined>(undefined);

  // Used to detect real lessonId changes inside a useEffect without triggering
  // on every render that happens to pass the same lessonId value.
  const prevLessonIdRef = useRef<string | undefined>(lessonId);

  // Always holds the current lessonId — updated synchronously on every render
  // (NOT via useEffect, which would lag one render). Used in the unmount cleanup
  // so the cleanup always compares against the latest lessonId, not the one
  // captured in the effect's closure when it was registered.
  const currentLessonIdRef = useRef<string | undefined>(lessonId);
  currentLessonIdRef.current = lessonId;

  const navigate = useNavigate();

  // Collapsed preview: plain text of the accumulated deep-notes content
  const textPreview = useMemo(() => getTextPreview(content, 100), [content]);
  const hasDeepNotes = textPreview.trim().length > 0;

  // ── TipTap editor ────────────────────────────────────────────────────────────
  // Always initialised EMPTY — the editor is a scratchpad, not a mirror of the DB.
  const editor = useEditor({
    extensions: getQuickNotesExtensions(),
    content: EMPTY_DOC,
    editable: true,
    autofocus: false,
    // onUpdate intentionally omitted — we don't autosave on every keystroke.
    // Content is flushed to deep notes only when the card collapses.
    editorProps: {
      attributes: {
        class:
          "quick-notes-editor outline-none text-sm leading-relaxed min-h-[80px] max-h-[200px] overflow-y-auto",
      },
    },
  });

  // ── CORE FIX: Clear scratchpad on lesson change ───────────────────────────────
  // When lessonId changes the editor content belongs to the OLD lesson. We must NOT
  // flush it — that would corrupt the new lesson's note. Instead: discard silently,
  // collapse the card, and invalidate scratch ownership so every flush guard fires.
  //
  // This runs synchronously in React's effect queue, before any unmount cleanup that
  // might fire in the same batch (e.g. popover closing on the same click that caused
  // navigation). The unmount cleanup's own ownership guard is a second line of defence.
  useEffect(() => {
    if (prevLessonIdRef.current === lessonId) return;
    prevLessonIdRef.current = lessonId;

    // Invalidate ownership — all flush guards will now discard
    scratchLessonIdRef.current = undefined;

    // Clear editor content without triggering any save/append
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(EMPTY_DOC, false);
    }

    // Collapse so the new lesson doesn't show an open, blank editor
    setIsExpanded(false);
  }, [lessonId, editor]);

  // ── Safe flush helper ─────────────────────────────────────────────────────────
  // The single source of truth for flushing. Checks ownership before writing.
  // Called by handleBlur (collapse) and the unmount cleanup.
  const flushAndClear = useCallback(() => {
    if (!editor || editor.isDestroyed || editor.isEmpty) return;

    // LEAK GUARD: appendContentRef.current already points to the new lesson's
    // handler after a lesson change. If the scratch belongs to a different lesson,
    // discard it — writing it would corrupt the wrong note.
    if (scratchLessonIdRef.current !== lessonId) {
      editor.commands.setContent(EMPTY_DOC, false);
      return;
    }

    const scratchJson = serializeContent(editor.getJSON());
    if (appendContentRef.current) {
      appendContentRef.current(scratchJson);
    } else {
      updateContentRef.current(scratchJson);
    }
    editor.commands.setContent(EMPTY_DOC, false);
  }, [editor, lessonId]);

  // ── Unmount: flush any unsaved scratch (e.g. real page navigation) ───────────
  // INTENTIONALLY depends only on [editor], NOT on lessonId.
  //
  // Why: if lessonId were in the dep array, React would re-run this cleanup every
  // time the lesson changes — with the OLD lessonId captured in the closure.
  // At that point scratchLessonIdRef.current could still hold the same old lessonId
  // (the clear-on-lesson-change effect hasn't run yet), making the guard pass and
  // flushing old-lesson content through appendContentRef which already points to
  // the new lesson's handler → leak.
  //
  // Instead we compare scratchLessonIdRef against currentLessonIdRef, which is
  // updated synchronously on every render. By the time this cleanup ever runs,
  // currentLessonIdRef.current is always the true current lessonId, so any
  // lesson-change mismatch is caught regardless of effect timing.
  useEffect(() => {
    return () => {
      if (!editor || editor.isDestroyed || editor.isEmpty) return;

      // LEAK GUARD: currentLessonIdRef is always the latest lessonId (updated on
      // every render, not captured in a closure). If the scratch belongs to a
      // different lesson, discard — never write to the wrong note.
      if (scratchLessonIdRef.current !== currentLessonIdRef.current) return;

      const scratchJson = serializeContent(editor.getJSON());
      if (appendContentRef.current) {
        appendContentRef.current(scratchJson);
      } else {
        updateContentRef.current(scratchJson);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]); // lessonId intentionally omitted — see comment above

  // ── Expand: record ownership, clear to fresh state, focus ────────────────────
  const handleExpand = useCallback(() => {
    if (!isExpanded) {
      // Record which lesson this scratchpad session belongs to.
      // All flush paths check this to prevent cross-lesson content leaks.
      scratchLessonIdRef.current = lessonId;

      if (editor && !editor.isDestroyed) {
        editor.commands.setContent(EMPTY_DOC, false);
      }
      setIsExpanded(true);
    }
  }, [isExpanded, editor, lessonId]);

  // Focus after expand animation
  useEffect(() => {
    if (isExpanded && editor) {
      setTimeout(() => editor.commands.focus("end"), 50);
    }
  }, [isExpanded, editor]);

  // ── Collapse: flush scratch then hide editor ──────────────────────────────────
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (cardRef.current?.contains(e.relatedTarget as Node)) return;
      flushAndClear();
      setIsExpanded(false);
    },
    [flushAndClear]
  );

  // ── Deep Notes navigation ────────────────────────────────────────────────────
  const handleOpenDeepNotes = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onOpenDeepNotes) {
        onOpenDeepNotes();
        return;
      }
      if (!courseId) return;
      const params = new URLSearchParams();
      if (careerId) params.set("careerId", careerId);
      if (lessonId) params.set("lessonId", lessonId);
      const query = params.toString();
      navigate(`/courses/${courseId}/notes${query ? `?${query}` : ""}`);
    },
    [onOpenDeepNotes, navigate, courseId, careerId, lessonId]
  );

  return (
    <Card
      ref={cardRef}
      className={cn(
        "border-border/50 bg-card/50 backdrop-blur-sm shadow-sm transition-all duration-200 ease-out overflow-hidden",
        !isExpanded && "cursor-pointer hover:bg-card/70"
      )}
      onClick={handleExpand}
      onBlur={handleBlur}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-primary/60" />
            Quick Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Save status reflects the deep-notes autosave */}
            {isSyncing ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
              </span>
            ) : isSaving ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </span>
            ) : lastSavedText ? (
              <span className="text-xs text-primary/70 flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span className="hidden sm:inline">{lastSavedText}</span>
              </span>
            ) : null}

            {/* Open Deep Notes */}
            {courseId && (
              <Tooltip open={deepNotesHovered}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseEnter={() => setDeepNotesHovered(true)}
                    onMouseLeave={() => setDeepNotesHovered(false)}
                    onMouseDown={(e) => {
                      setDeepNotesHovered(false);
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenDeepNotes(e);
                    }}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Open in Deep Notes
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        {isLoading ? (
          <div className="h-6 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : isExpanded ? (
          // Expanded: fresh scratchpad editor
          <div className="rounded-md border border-border/50 bg-background/50 p-2 transition-all duration-200">
            <EditorContent editor={editor} />

            {/* Formatting toolbar */}
            <div className="mt-2 pt-2 border-t border-border/30 flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  editor?.chain().focus().toggleBold().run();
                }}
                className={cn(
                  "p-1.5 rounded hover:bg-muted transition-colors",
                  editor?.isActive("bold") ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  editor?.chain().focus().toggleItalic().run();
                }}
                className={cn(
                  "p-1.5 rounded hover:bg-muted transition-colors",
                  editor?.isActive("italic") ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = window.prompt("Enter URL:");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                }}
                className={cn(
                  "p-1.5 rounded hover:bg-muted transition-colors",
                  editor?.isActive("link") ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <Link2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  editor?.chain().focus().toggleCodeBlock().run();
                }}
                className={cn(
                  "p-1.5 rounded hover:bg-muted transition-colors",
                  editor?.isActive("codeBlock") ? "bg-muted text-foreground" : "text-muted-foreground"
                )}
              >
                <Code className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : hasDeepNotes ? (
          // Collapsed with accumulated notes: show preview so user sees their history
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {textPreview}
          </p>
        ) : (
          // Collapsed, no notes yet: blank slate prompt
          <p className="text-sm text-muted-foreground/60 italic">
            Jot down a quick note…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default LessonNotesCard;
