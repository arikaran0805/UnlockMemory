/**
 * TipTap RichTextEditor
 * 
 * Secure rich text editor using TipTap (ProseMirror-based).
 * - JSON output format (no raw HTML storage)
 * - XSS-safe by design
 * - ExecutableCodeBlock for interactive code editing
 * - Annotation mark support with stable tooltip
 * - Uses shared tiptap.css - NO inline styles
 */

import { useCallback, useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { FullEditorToolbar } from './FullEditorToolbar';
import { parseContent, serializeContent, tipTapJSONToHTML } from '@/lib/tiptapMigration';
import { getFullEditorExtensions } from './editorConfig';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Columns } from 'lucide-react';
import AnnotationTooltip, { type AnnotationData } from './AnnotationMark/AnnotationTooltip';
import '@/styles/tiptap.css';

type ViewMode = 'edit' | 'preview' | 'split';

export interface RichTextEditorProps {
  value: string | JSONContent;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  showCodeBlock?: boolean;
  characterLimit?: number;
  className?: string;
  annotationMode?: boolean;
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
  isAdmin?: boolean;
  isModerator?: boolean;
  onAnnotationClick?: (annotation: any) => void;
  onAnnotationResolve?: (annotationId: string) => void;
  onAnnotationDismiss?: (annotationId: string) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
    type: 'paragraph' | 'code';
    rect?: { top: number; left: number; width: number; height: number; bottom: number };
  }) => void;
}

export interface RichTextEditorRef {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | undefined;
  getHTML: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  applyAnnotation: (annotationId: string, from: number, to: number, status?: 'open' | 'resolved' | 'dismissed') => void;
  updateAnnotationStatus: (annotationId: string, status: 'open' | 'resolved' | 'dismissed') => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  value,
  onChange,
  placeholder = 'Write your content here...',
  readOnly = false,
  showCodeBlock = true,
  characterLimit,
  className,
  annotationMode = false,
  annotations = [],
  isAdmin = false,
  isModerator = false,
  onAnnotationClick,
  onAnnotationResolve,
  onAnnotationDismiss,
  onAnnotationDelete,
  onTextSelect,
}, ref) => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('tiptapEditorViewMode');
    return (saved === 'edit' || saved === 'preview' || saved === 'split') ? saved : 'edit';
  });

  const initialContent = parseContent(value);

  // Use shared config with ExecutableCodeBlock and AnnotationMark
  const extensions = useMemo(() => 
    getFullEditorExtensions({ 
      placeholder, 
      characterLimit
    }), 
    [placeholder, characterLimit]
  );

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !readOnly && !annotationMode,
    editorProps: {
      handleDOMEvents: {
        keydown: (_view, event) => {
          // Keep global/document shortcuts from hijacking editor typing/paste shortcuts.
          event.stopPropagation();
          return false;
        },
        paste: (_view, event) => {
          // Allow TipTap default paste, but isolate it from parent/global handlers.
          event.stopPropagation();
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(serializeContent(json));
    },
    onSelectionUpdate: ({ editor }) => {
      if (annotationMode && onTextSelect) {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, ' ');
          if (text.trim().length >= 2) {
            const coords = editor.view.coordsAtPos(from);
            const endCoords = editor.view.coordsAtPos(to);
            const isCodeBlock = editor.isActive('executableCodeBlock') || editor.isActive('codeBlock');
            
            onTextSelect({
              start: from,
              end: to,
              text: text.trim(),
              type: isCodeBlock ? 'code' : 'paragraph',
              rect: {
                top: coords.top,
                left: coords.left,
                width: endCoords.left - coords.left,
                height: coords.bottom - coords.top,
                bottom: coords.bottom,
              },
            });
          }
        }
      }
    },
  });

  // Convert annotations prop to tooltip-compatible format
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

  // Apply annotation marks to editor when annotations change
  useEffect(() => {
    if (!editor || !annotations.length) return;

    // Apply annotation marks for each annotation
    annotations.forEach(annotation => {
      const { selection_start, selection_end, id, status } = annotation;
      
      // Check if mark already exists
      let exists = false;
      editor.state.doc.descendants((node, pos) => {
        if (!node.isText) return;
        const marks = node.marks.filter(m => 
          m.type.name === 'annotation' && m.attrs.annotationId === id
        );
        if (marks.length > 0) exists = true;
      });

      // Only apply if not already present
      if (!exists && selection_start && selection_end) {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: selection_start, to: selection_end })
          .setAnnotation({ 
            annotationId: id, 
            status: (status as 'open' | 'resolved' | 'dismissed') || 'open' 
          })
          .run();
      }
    });
  }, [editor, annotations]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly && !annotationMode);
    }
  }, [editor, readOnly, annotationMode]);

  useEffect(() => {
    if (!editor) return;
    
    const newContent = parseContent(value);
    const currentContent = editor.getJSON();
    
    if (JSON.stringify(newContent) !== JSON.stringify(currentContent)) {
      editor.commands.setContent(newContent);
    }
  }, [value, editor]);

  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getJSON: () => editor?.getJSON(),
    getHTML: () => editor ? tipTapJSONToHTML(editor.getJSON()) : '',
    getText: () => editor?.getText() || '',
    isEmpty: () => editor?.isEmpty ?? true,
    focus: () => editor?.commands.focus(),
    applyAnnotation: (annotationId: string, from: number, to: number, status = 'open') => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to })
        .setAnnotation({ annotationId, status })
        .run();
    },
    updateAnnotationStatus: (annotationId: string, status: 'open' | 'resolved' | 'dismissed') => {
      if (!editor) return;
      editor.commands.updateAnnotationStatus(annotationId, status);
    },
  }));

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('tiptapEditorViewMode', mode);
  }, []);

  const handleResolve = useCallback((annotationId: string) => {
    if (editor) {
      editor.commands.updateAnnotationStatus(annotationId, 'resolved');
    }
    onAnnotationResolve?.(annotationId);
  }, [editor, onAnnotationResolve]);

  const handleDismiss = useCallback((annotationId: string) => {
    if (editor) {
      editor.commands.updateAnnotationStatus(annotationId, 'dismissed');
    }
    onAnnotationDismiss?.(annotationId);
  }, [editor, onAnnotationDismiss]);

  const previewHTML = editor ? tipTapJSONToHTML(editor.getJSON()) : '';

  if (!editor) {
    return (
      <div className={cn('border rounded-lg bg-background min-h-[300px] animate-pulse', className)} />
    );
  }

  return (
    <div className={cn('tiptap-editor-wrapper border rounded-lg overflow-hidden', className)}>
      {/* Annotation tooltip - rendered in portal */}
      {(annotationMode || annotations.length > 0) && (
        <AnnotationTooltip
          editor={editor}
          annotations={annotationData}
          isAdmin={isAdmin}
          isModerator={isModerator}
          onResolve={handleResolve}
          onDismiss={handleDismiss}
          onDelete={onAnnotationDelete}
          onAnnotationClick={onAnnotationClick}
        />
      )}

      {/* View mode toggle */}
      {!annotationMode && !readOnly && (
        <div className="flex items-center justify-end p-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('edit')}
              className={cn(
                'h-7 px-2 text-xs gap-1',
                viewMode === 'edit' && 'bg-primary/10 text-primary'
              )}
            >
              <EyeOff className="w-3 h-3" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('split')}
              className={cn(
                'h-7 px-2 text-xs gap-1',
                viewMode === 'split' && 'bg-primary/10 text-primary'
              )}
            >
              <Columns className="w-3 h-3" />
              Split
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('preview')}
              className={cn(
                'h-7 px-2 text-xs gap-1',
                viewMode === 'preview' && 'bg-primary/10 text-primary'
              )}
            >
              <Eye className="w-3 h-3" />
              Preview
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar - uses FullEditorToolbar for ExecutableCodeBlock support */}
      {viewMode !== 'preview' && !readOnly && !annotationMode && (
        <FullEditorToolbar editor={editor} />
      )}

      {/* Editor content based on view mode */}
      {viewMode === 'split' ? (
        <ResizablePanelGroup direction="horizontal" className="min-h-[300px]">
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="h-full overflow-auto">
              <EditorContent
                editor={editor}
                className="tiptap-editor h-full"
              />
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
        <EditorContent
          editor={editor}
          className="tiptap-editor min-h-[300px]"
        />
      )}

      {/* Character count */}
      {characterLimit && editor && (
        <div className="flex justify-end px-3 py-1 border-t border-border text-xs text-muted-foreground">
          {editor.storage.characterCount.characters()} / {characterLimit} characters
        </div>
      )}
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;
