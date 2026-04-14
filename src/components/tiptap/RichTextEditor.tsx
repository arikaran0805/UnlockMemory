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

import { useCallback, useEffect, useState, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { FullEditorToolbar } from './FullEditorToolbar';
import RichTextRenderer from './RichTextRenderer';
import { parseContent, serializeContent, tipTapJSONToHTML } from '@/lib/tiptapMigration';
import { getFullEditorExtensions } from './editorConfig';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import {
  Eye, EyeOff, Columns, Bold, Italic, Code,
  Underline as UnderlineIcon, Strikethrough, Highlighter,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code2,
  Link as LinkIcon, Plus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import AnnotationTooltip, { type AnnotationData } from './AnnotationMark/AnnotationTooltip';
import '@/styles/tiptap.css';

type ViewMode = 'edit' | 'preview' | 'split';

const CODE_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash/Shell' },
  { value: 'r', label: 'R' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
];

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
  const [bubbleLinkUrl, setBubbleLinkUrl] = useState('');
  const [showBubbleLink, setShowBubbleLink] = useState(false);
  const [codePopoverOpen, setCodePopoverOpen] = useState(false);
  // Viewport-fixed position for the floating + button
  const [floatingPlusPos, setFloatingPlusPos] = useState<{ top: number; left: number } | null>(null);
  // Stable ref so event-listener closures always see the latest value without re-subscribing
  const codePopoverOpenRef = useRef(false);
  useEffect(() => { codePopoverOpenRef.current = codePopoverOpen; }, [codePopoverOpen]);

  // Force z-index on the BubbleMenu outer container — TipTap 3 uses @floating-ui/dom
  // not Tippy, so className only reaches the inner div, not the positioned element
  const bubbleMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bubbleMenuRef.current) {
      bubbleMenuRef.current.style.zIndex = '9999';
    }
  }, []);

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

  // Drive the floating + button via editor events.
  // Uses coordsAtPos → position: fixed so it works inside scroll containers.
  useEffect(() => {
    if (!editor) return;

    const check = () => {
      if (readOnly || annotationMode) { setFloatingPlusPos(null); return; }
      const { selection } = editor.state;
      const { $from, empty } = selection;
      if (
        empty &&
        editor.isFocused &&
        $from.node().type.name === 'paragraph' &&
        $from.node().content.size === 0
      ) {
        const coords = editor.view.coordsAtPos($from.pos);
        // Center vertically on the line; shift left of cursor
        setFloatingPlusPos({
          top: Math.round((coords.top + coords.bottom) / 2),
          left: Math.round(coords.left),
        });
      } else {
        // Keep visible if popover is currently open so user can pick language
        if (!codePopoverOpenRef.current) setFloatingPlusPos(null);
      }
    };

    const hide = () => {
      if (!codePopoverOpenRef.current) setFloatingPlusPos(null);
    };

    editor.on('selectionUpdate', check);
    editor.on('focus', check);
    editor.on('blur', hide);
    return () => {
      editor.off('selectionUpdate', check);
      editor.off('focus', check);
      editor.off('blur', hide);
    };
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

      {/* Floating format toolbar — only in edit mode, not annotation mode */}
      {!annotationMode && !readOnly && (viewMode === 'edit' || viewMode === 'split') && (
        <BubbleMenu
          ref={bubbleMenuRef}
          editor={editor}
          appendTo={() => document.body}
          options={{ strategy: 'fixed', placement: 'top', offset: 8 }}
          shouldShow={({ editor: ed, state }) => {
            const { selection } = state;
            const { empty } = selection;
            // Only show when there is an actual non-empty text selection
            if (empty) return false;
            const { from, to } = selection;
            const text = state.doc.textBetween(from, to, ' ');
            if (!text.trim()) return false;
            // Don't show inside code blocks — they have their own UI
            if (ed.isActive('executableCodeBlock') || ed.isActive('codeBlock')) return false;
            return true;
          }}
          className="flex items-center gap-0 bg-popover border border-border rounded-lg shadow-xl p-1 flex-wrap"
        >
          {/* Text formatting group */}
          {([
            { title: 'Bold', mark: 'bold', Icon: Bold, action: () => editor.chain().focus().toggleBold().run() },
            { title: 'Italic', mark: 'italic', Icon: Italic, action: () => editor.chain().focus().toggleItalic().run() },
            { title: 'Underline', mark: 'underline', Icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run() },
            { title: 'Strikethrough', mark: 'strike', Icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run() },
            { title: 'Highlight', mark: 'highlight', Icon: Highlighter, action: () => editor.chain().focus().toggleHighlight().run() },
          ] as const).map(({ title, mark, Icon, action }) => (
            <button
              key={title}
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={action}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
                editor.isActive(mark)
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />

          {/* Heading group — H1 H2 H3 individual buttons */}
          {([
            { title: 'Heading 1', level: 1, Icon: Heading1 },
            { title: 'Heading 2', level: 2, Icon: Heading2 },
            { title: 'Heading 3', level: 3, Icon: Heading3 },
          ] as const).map(({ title, level, Icon }) => (
            <button
              key={title}
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
                editor.isActive('heading', { level })
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />

          {/* Block formatting group */}
          {([
            { title: 'Bullet List', mark: 'bulletList', Icon: List, action: () => editor.chain().focus().toggleBulletList().run() },
            { title: 'Numbered List', mark: 'orderedList', Icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run() },
            { title: 'Blockquote', mark: 'blockquote', Icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run() },
            { title: 'Code Block', mark: 'executableCodeBlock', Icon: Code2, action: () => editor.chain().focus().setExecutableCodeBlock({ language: 'python', code: '' }).run() },
            { title: 'Inline Code', mark: 'code', Icon: Code, action: () => editor.chain().focus().toggleCode().run() },
          ] as const).map(({ title, mark, Icon, action }) => (
            <button
              key={title}
              title={title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={action}
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
                editor.isActive(mark)
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-4 bg-border mx-1 flex-shrink-0" />

          {/* Link */}
          <Popover open={showBubbleLink} onOpenChange={setShowBubbleLink}>
            <PopoverTrigger asChild>
              <button
                title="Link"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setBubbleLinkUrl(editor.getAttributes('link').href || '');
                  setShowBubbleLink(true);
                }}
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-md transition-colors',
                  editor.isActive('link')
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary',
                )}
              >
                <LinkIcon className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="flex gap-2">
                <Input
                  placeholder="URL..."
                  value={bubbleLinkUrl}
                  onChange={(e) => setBubbleLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const url = bubbleLinkUrl.startsWith('http') ? bubbleLinkUrl : `https://${bubbleLinkUrl}`;
                      if (bubbleLinkUrl) {
                        editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
                      } else {
                        editor.chain().focus().extendMarkRange('link').unsetLink().run();
                      }
                      setBubbleLinkUrl('');
                      setShowBubbleLink(false);
                    }
                  }}
                  className="flex-1 h-8 text-sm"
                />
                <button
                  className="h-8 px-3 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  onClick={() => {
                    const url = bubbleLinkUrl.startsWith('http') ? bubbleLinkUrl : `https://${bubbleLinkUrl}`;
                    if (bubbleLinkUrl) {
                      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
                    } else {
                      editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    }
                    setBubbleLinkUrl('');
                    setShowBubbleLink(false);
                  }}
                >
                  {editor.isActive('link') ? 'Update' : 'Add'}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </BubbleMenu>
      )}

      {/* Floating + button — portal-rendered at body level with position:fixed
          so it works inside overflow:hidden panels and across stacking contexts */}
      {floatingPlusPos && !readOnly && !annotationMode && (viewMode === 'edit' || viewMode === 'split') &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: floatingPlusPos.top,
              left: floatingPlusPos.left - 36,
              transform: 'translateY(-50%)',
              zIndex: 9998,
            }}
          >
            <Popover open={codePopoverOpen} onOpenChange={(open) => {
              setCodePopoverOpen(open);
              // When closing the popover, hide the + button too
              if (!open) setFloatingPlusPos(null);
            }}>
              <PopoverTrigger asChild>
                <button
                  title="Insert code block"
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center justify-center w-6 h-6 rounded-full border border-border bg-background text-muted-foreground hover:bg-primary/[0.08] hover:text-primary hover:border-primary/30 transition-colors shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3" align="start" side="right">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 px-0.5">
                  Insert Code Block
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CODE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      className="flex items-center justify-center px-2 py-2 text-xs font-medium rounded-lg border border-border/60 bg-muted/30 hover:bg-primary/[0.06] hover:border-primary/30 hover:text-primary transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        editor.chain().focus().setExecutableCodeBlock({ language: lang.value, code: '' }).run();
                        setCodePopoverOpen(false);
                        setFloatingPlusPos(null);
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>,
          document.body
        )}

      {/* View mode toggle */}
      {!annotationMode && !readOnly && (
        <div className="flex items-center justify-end px-3 py-2 border-b border-border/60 bg-muted/20">
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/50 gap-0.5">
            {(
              [
                { mode: 'edit' as const,    Icon: EyeOff,   label: 'Edit'    },
                { mode: 'split' as const,   Icon: Columns,  label: 'Split'   },
                { mode: 'preview' as const, Icon: Eye,      label: 'Preview' },
              ] as const
            ).map(({ mode, Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleViewModeChange(mode)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium transition-all duration-150',
                  viewMode === mode
                    ? 'bg-background text-primary shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
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
            <div className="h-full overflow-auto p-4 border-l border-border/50">
              <RichTextRenderer
                content={editor.getJSON()}
                emptyPlaceholder="Preview..."
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : viewMode === 'preview' ? (
        <div className="min-h-[300px] p-4">
          <RichTextRenderer
            content={editor.getJSON()}
            emptyPlaceholder="Nothing to preview..."
          />
        </div>
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
