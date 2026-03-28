/**
 * FullEditor - Platform / Content Manager Content Editor
 * 
 * Full-featured TipTap editor for course, lesson, and post creation.
 * Includes: headings, lists, code blocks, tables, images, split view.
 * 
 * ROLES: Platform Manager, Career Manager, Course Manager, Content Moderator (assigned only)
 */

import { forwardRef, useImperativeHandle, useCallback, useEffect, useState, useMemo } from 'react';
import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Columns, Loader2, Check, AlertCircle } from 'lucide-react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { getFullEditorExtensions, getRenderExtensions } from './editorConfig';
import { FullEditorToolbar } from './FullEditorToolbar';
import { parseContent, serializeContent, tipTapJSONToHTML } from '@/lib/tiptapMigration';
import { useEditorAutosave, type AutosaveStatus } from '@/hooks/useEditorAutosave';
import AnnotationTooltip, { type AnnotationData } from './AnnotationMark/AnnotationTooltip';
import '@/styles/tiptap.css';

type ViewMode = 'edit' | 'preview' | 'split';

export interface FullEditorProps {
  /** Content (JSON or legacy HTML) */
  value: string | JSONContent;
  /** Change handler - receives serialized JSON */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Character limit */
  characterLimit?: number;
  /** Custom class */
  className?: string;
  /** Draft key for autosave */
  draftKey?: string;
  /** Async save callback */
  onSave?: (content: JSONContent) => Promise<void>;
  /** Annotation mode */
  annotationMode?: boolean;
  /** Text selection callback for annotations */
  onTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
    type: 'paragraph' | 'code';
    rect?: DOMRect;
  }) => void;
  /** Stored annotation metadata (used to resolve tooltip content) */
  annotations?: Array<{
    id: string;
    selection_start: number;
    selection_end: number;
    selected_text: string;
    comment?: string;
    status: string;
    author_profile?: { full_name?: string | null } | null;
    created_at?: string;
  }>;
  /** Whether the current user is an admin */
  isAdmin?: boolean;
  /** Whether the current user is a moderator */
  isModerator?: boolean;
  /** Callback when annotation is resolved */
  onAnnotationResolve?: (annotationId: string) => void;
  /** Callback when annotation is dismissed */
  onAnnotationDismiss?: (annotationId: string) => void;
  /** Callback when annotation is deleted */
  onAnnotationDelete?: (annotationId: string) => void;
}

export interface FullEditorRef {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | undefined;
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  save: () => Promise<void>;
}

export const FullEditor = forwardRef<FullEditorRef, FullEditorProps>(({
  value,
  onChange,
  placeholder = 'Write your content here...',
  characterLimit,
  className,
  draftKey,
  onSave,
  annotationMode = false,
  onTextSelect,
  annotations = [],
  isAdmin = false,
  isModerator = false,
  onAnnotationResolve,
  onAnnotationDismiss,
  onAnnotationDelete,
}, ref) => {
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('tiptap_view_mode');
    return (saved === 'edit' || saved === 'preview' || saved === 'split') ? saved : 'edit';
  });

  // Autosave
  const autosave = useEditorAutosave({
    draftKey: draftKey || 'full_editor_default',
    onSave,
    enableLocalDraft: !!draftKey,
    warnOnUnsavedChanges: true,
  });

  // Convert stored annotations -> tooltip format
  const annotationData: AnnotationData[] = useMemo(() => {
    return annotations.map(a => ({
      id: a.id,
      status: (a.status as 'open' | 'resolved' | 'dismissed') || 'open',
      comment: a.comment || '',
      selectedText: a.selected_text,
      authorName: a.author_profile?.full_name || undefined,
      createdAt: a.created_at,
    }));
  }, [annotations]);

  // Extensions
  const extensions = useMemo(() => 
    getFullEditorExtensions({ placeholder, characterLimit, annotations }), 
    [placeholder, characterLimit, annotations]
  );

  // Parse initial content
  const initialContent = useMemo(() => {
    // Check for draft first
    if (draftKey) {
      const draft = autosave.loadDraft();
      if (draft) return draft;
    }
    return parseContent(value);
  }, []);

  // Editor instance
  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !annotationMode,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(serializeContent(json));
      if (draftKey) {
        autosave.debouncedSave(json);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (annotationMode && onTextSelect) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ');
          if (text.trim().length >= 2) {
            const coords = editor.view.coordsAtPos(from);
            const endCoords = editor.view.coordsAtPos(to);
            const isCode = editor.isActive('codeBlock');
            
            onTextSelect({
              start: from,
              end: to,
              text: text.trim(),
              type: isCode ? 'code' : 'paragraph',
              rect: {
                top: coords.top,
                left: coords.left,
                right: endCoords.right,
                bottom: coords.bottom,
                width: endCoords.left - coords.left,
                height: coords.bottom - coords.top,
                x: coords.left,
                y: coords.top,
                toJSON: () => ({}),
              },
            });
          }
        }
      }
    },
  });

  // Sync editable state
  useEffect(() => {
    editor?.setEditable(!annotationMode);
  }, [editor, annotationMode]);

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    const newContent = parseContent(value);
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(newContent);
    if (current !== incoming) {
      editor.commands.setContent(newContent);
    }
  }, [value, editor]);

  // Generate preview HTML
  const previewHTML = useMemo(() => {
    if (!editor) return '';
    return tipTapJSONToHTML(editor.getJSON());
  }, [editor?.getJSON()]);

  // View mode handler
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('tiptap_view_mode', mode);
  }, []);

  // Expose ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getJSON: () => editor?.getJSON(),
    getHTML: () => editor ? tipTapJSONToHTML(editor.getJSON()) : '',
    getText: () => editor?.getText() || '',
    isEmpty: () => editor?.isEmpty ?? true,
    focus: () => editor?.commands.focus(),
    save: async () => {
      if (editor && onSave) {
        await autosave.saveNow(editor.getJSON());
      }
    },
  }));

  if (!editor) {
    return <div className={cn('border rounded-lg bg-background min-h-[300px] animate-pulse', className)} />;
  }

  return (
    <div className={cn('tiptap-editor border border-border rounded-lg overflow-hidden bg-background', className)}>
      {/* Header with view mode and autosave status */}
      {!annotationMode && (
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/30">
          {/* Autosave indicator */}
          <AutosaveIndicator status={autosave.status} isDirty={autosave.isDirty} />
          
          {/* View mode toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('edit')}
              className={cn('h-7 px-2 text-xs gap-1', viewMode === 'edit' && 'bg-primary/10 text-primary')}
            >
              <EyeOff className="w-3 h-3" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('split')}
              className={cn('h-7 px-2 text-xs gap-1', viewMode === 'split' && 'bg-primary/10 text-primary')}
            >
              <Columns className="w-3 h-3" />
              Split
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('preview')}
              className={cn('h-7 px-2 text-xs gap-1', viewMode === 'preview' && 'bg-primary/10 text-primary')}
            >
              <Eye className="w-3 h-3" />
              Preview
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {viewMode !== 'preview' && !annotationMode && (
        <FullEditorToolbar editor={editor} />
      )}

      {/* Editor content */}
      {viewMode === 'split' ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[300px]">
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="h-full overflow-auto">
              <EditorContent editor={editor} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div 
              className="h-full overflow-auto p-4 tiptap-content bg-muted/30"
              dangerouslySetInnerHTML={{ __html: previewHTML || '<p class="text-muted-foreground italic">Preview...</p>' }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : viewMode === 'preview' ? (
        <div 
          className="min-h-[300px] p-4 tiptap-content bg-muted/30"
          dangerouslySetInnerHTML={{ __html: previewHTML || '<p class="text-muted-foreground italic">Nothing to preview...</p>' }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      {/* Annotation tooltip - renders via portal */}
      {annotationData.length > 0 && (
        <AnnotationTooltip
          editor={editor}
          annotations={annotationData}
          isAdmin={isAdmin}
          isModerator={isModerator}
          onResolve={onAnnotationResolve}
          onDismiss={onAnnotationDismiss}
          onDelete={onAnnotationDelete}
        />
      )}

      {/* Character count */}
      {characterLimit && editor && (
        <div className={cn(
          'tiptap-char-count border-t border-border',
          editor.storage.characterCount?.characters() > characterLimit * 0.9 && 'warning',
          editor.storage.characterCount?.characters() >= characterLimit && 'error'
        )}>
          {editor.storage.characterCount?.characters()} / {characterLimit}
        </div>
      )}
    </div>
  );
});

FullEditor.displayName = 'FullEditor';

// Autosave indicator component
function AutosaveIndicator({ status, isDirty }: { status: AutosaveStatus; isDirty: boolean }) {
  if (status === 'idle' && !isDirty) return null;

  return (
    <div className={cn('tiptap-autosave-indicator', status)}>
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>Save failed</span>
        </>
      )}
      {status === 'idle' && isDirty && (
        <span className="text-muted-foreground">Unsaved changes</span>
      )}
    </div>
  );
}

export default FullEditor;
