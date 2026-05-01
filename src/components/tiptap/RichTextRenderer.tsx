/**
 * TipTap Rich Text Renderer
 *
 * Renders TipTap JSON content using a real TipTap editor instance
 * with editable: false for proper custom node/mark rendering.
 *
 * ✅ Uses getRenderExtensions() for schema parity
 * ✅ Supports ExecutableCodeBlock
 * ✅ Supports AnnotationMark with tooltip
 * ❌ No dangerouslySetInnerHTML
 */

import { useMemo, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { getRenderExtensions } from './editorConfig';
import { parseContent, isContentEmpty } from '@/lib/tiptapMigration';
import AnnotationTooltip, { type AnnotationData } from './AnnotationMark/AnnotationTooltip';
import '@/styles/tiptap.css';

interface AnnotationProp {
  id: string;
  selection_start: number;
  selection_end: number;
  selected_text: string;
  comment?: string;
  status: string;
  author_profile?: { full_name?: string | null } | null;
  created_at?: string;
}

interface RichTextRendererProps {
  /**
   * Content to render - accepts HTML string, TipTap JSON, or stringified JSON
   */
  content: string | JSONContent | null | undefined;
  /**
   * Custom class name
   */
  className?: string;
  /**
   * Placeholder text when content is empty
   */
  emptyPlaceholder?: string;
  /**
   * Annotations to display with tooltips
   */
  annotations?: AnnotationProp[];
  /**
   * Whether current user is admin (for tooltip actions)
   */
  isAdmin?: boolean;
  /**
   * Whether current user is moderator (for tooltip actions)
   */
  isModerator?: boolean;
  /**
   * Callback when annotation is resolved
   */
  onAnnotationResolve?: (annotationId: string) => void;
  /**
   * Callback when annotation is dismissed
   */
  onAnnotationDismiss?: (annotationId: string) => void;
  /**
   * Callback when annotation is deleted
   */
  onAnnotationDelete?: (annotationId: string) => void;
  /**
   * Callback when annotation is clicked
   */
  onAnnotationClick?: (annotationId: string) => void;
}

/**
 * Rich Text Renderer using TipTap
 *
 * Uses a real TipTap editor instance with editable: false
 * to properly render custom nodes (ExecutableCodeBlock) and marks (AnnotationMark)
 */
export const RichTextRenderer = ({
  content,
  className,
  emptyPlaceholder = 'No content',
  annotations = [],
  isAdmin = false,
  isModerator = false,
  onAnnotationResolve,
  onAnnotationDismiss,
  onAnnotationDelete,
  onAnnotationClick,
}: RichTextRendererProps) => {
  // Parse content to TipTap JSON format
  const parsedContent = useMemo(() => {
    if (!content) return null;
    const json = parseContent(content);
    if (isContentEmpty(json)) return null;
    return json;
  }, [content]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Create read-only editor with full schema
  const editor = useEditor(
    {
      extensions: getRenderExtensions(),
      content: parsedContent,
      editable: false,
      editorProps: {
        attributes: {
          class: 'tiptap-renderer prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        },
      },
    },
    [parsedContent]
  );

  // Inject data-flow + data-flow-label attributes onto heading elements so
  // useLessonFlowNavigation can discover them as Lesson Flow items.
  useEffect(() => {
    if (!editor || !containerRef.current) return;
    const container = containerRef.current;
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (!headings.length) return;

    const slugCounts: Record<string, number> = {};
    headings.forEach((el) => {
      const text = el.textContent?.trim() || '';
      if (!text) return;
      const baseSlug =
        text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'heading';
      const count = slugCounts[baseSlug] || 0;
      const slug = count > 0 ? `${baseSlug}-${count}` : baseSlug;
      slugCounts[baseSlug] = count + 1;

      const flowId = `h-${slug}`;
      el.setAttribute('data-flow', flowId);
      el.setAttribute('data-flow-label', text);
      el.id = flowId;
    });
  }, [editor]);

  // Apply annotation marks when annotations prop changes
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
          .setTextSelection({ from: selection_start, to: selection_end })
          .setAnnotation({ 
            annotationId: id, 
            status: (status as 'open' | 'resolved' | 'dismissed') || 'open' 
          })
          .run();
      }
    });
  }, [editor, annotations]);

  // Convert annotations to tooltip format
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

  // Show placeholder when no content
  if (!parsedContent) {
    return (
      <div className={cn('text-muted-foreground italic', className)}>
        {emptyPlaceholder}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('tiptap-content', className)}>
      <EditorContent editor={editor} />
      
      {/* Annotation tooltip - works in read-only mode */}
      {annotations.length > 0 && editor && (
        <AnnotationTooltip
          editor={editor}
          annotations={annotationData}
          isAdmin={isAdmin}
          isModerator={isModerator}
          onResolve={onAnnotationResolve}
          onDismiss={onAnnotationDismiss}
          onDelete={onAnnotationDelete}
          onAnnotationClick={onAnnotationClick}
        />
      )}
    </div>
  );
};

export default RichTextRenderer;
