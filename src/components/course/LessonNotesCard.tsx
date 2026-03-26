/**
 * LessonNotesCard - Quick Notes (Inline)
 * 
 * A lightweight, inline note-taking card for lessons.
 * Uses a minimal rich-text editor for proper formatting.
 * Content is stored as TipTap JSON, never shown raw to users.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { StickyNote, Loader2, Check, ExternalLink, Bold, Italic, Link2, Code } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { getTextPreview, parseContent, serializeContent } from "@/lib/tiptapMigration";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotesTabOpener } from "@/hooks/useNotesTabManager";
import "@/styles/tiptap.css";

interface LessonNotesCardProps {
  content: string;
  updateContent: (content: string) => void;
  isSaving: boolean;
  isSyncing?: boolean;
  lastSavedText: string | null;
  isLoading: boolean;
  courseId?: string;
  /** The current lesson ID - needed for Deep Notes context switching */
  lessonId?: string;
  /** Career slug - needed so Deep Notes "Back to course" goes to the right page */
  careerId?: string;
}

// Create lowlight instance for syntax highlighting
const lowlight = createLowlight(common);

// Quick notes extensions with code block support
const getQuickNotesExtensions = () => [
  StarterKit.configure({
    heading: false,
    codeBlock: false, // Disable default, use CodeBlockLowlight instead
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

export function LessonNotesCard({
  content,
  updateContent,
  isSaving,
  isSyncing = false,
  lastSavedText,
  isLoading,
  courseId,
  lessonId,
  careerId,
}: LessonNotesCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  // Prevent programmatic hydration from triggering updateContent (and therefore autosave)
  const applyingExternalValueRef = useRef(false);

  // Use tab manager to prevent duplicate notes tabs
  const { openNotesTab } = useNotesTabOpener(courseId, careerId);

  // Parse content for preview
  const textPreview = useMemo(() => {
    if (!content) return "";
    return getTextPreview(content, 100);
  }, [content]);

  const hasContent = textPreview.trim().length > 0;

  // Initialize editor
  const editor = useEditor({
    extensions: getQuickNotesExtensions(),
    content: parseContent(content),
    editable: true,
    autofocus: false,
    onUpdate: ({ editor }) => {
      if (applyingExternalValueRef.current) return;
      const json = editor.getJSON();
      updateContent(serializeContent(json));
    },
    editorProps: {
      attributes: {
        class: "quick-notes-editor outline-none text-sm leading-relaxed min-h-[80px] max-h-[200px] overflow-y-auto",
      },
    },
  });

  // Sync content when it changes externally - MUST handle empty content
  useEffect(() => {
    if (!editor) return;
    
    const currentContent = serializeContent(editor.getJSON());
    // Handle both empty and non-empty content to prevent stale data
    if (currentContent !== content) {
      const parsed = parseContent(content);
      // CRITICAL: Do not emit an update during hydration/sync, otherwise the parent
      // may interpret the intermediate empty doc as user input and auto-save it.
      applyingExternalValueRef.current = true;
      // TipTap supports setContent(content, { emitUpdate: false })
      editor.commands.setContent(parsed, { emitUpdate: false });
      // Use microtask (Promise) instead of macrotask (setTimeout) so the flag
      // clears AFTER TipTap's synchronous onUpdate callbacks but BEFORE the
      // next React render cycle that could fire updateContent.
      Promise.resolve().then(() => {
        applyingExternalValueRef.current = false;
      });
    }
  }, [content, editor]);

  // Focus editor when expanded
  useEffect(() => {
    if (isExpanded && editor) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        editor.commands.focus("end");
      }, 50);
    }
  }, [isExpanded, editor]);

  const handleExpand = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  }, [isExpanded]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Check if focus is moving to another element within the card
    if (cardRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsExpanded(false);
  }, []);

  // Open Deep Notes in new tab (uses tab manager to prevent duplicates)
  // Passes lessonId for context switching
  const handleOpenDeepNotes = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openNotesTab({
      lessonId,
      entityType: lessonId ? 'lesson' : undefined,
    });
  }, [openNotesTab, lessonId]);

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
            {/* Save status */}
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
            {courseId && isExpanded && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onMouseDown={(e) => {
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
          // Expanded: Rich text editor
          <div 
            ref={editorContainerRef}
            className="rounded-md border border-border/50 bg-background/50 p-2 transition-all duration-200"
          >
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
                  if (url) {
                    editor?.chain().focus().setLink({ href: url }).run();
                  }
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
        ) : hasContent ? (
          // Collapsed with content: preview (plain text, no JSON)
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {textPreview}
          </p>
        ) : (
          // Collapsed empty: placeholder
          <p className="text-sm text-muted-foreground/60 italic">
            Jot down a quick note…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default LessonNotesCard;
