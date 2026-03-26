/**
 * NotionStyleEditor - A distraction-free, Notion-inspired TipTap editor
 * 
 * Features:
 * - Large, comfortable typography
 * - Selection-based floating toolbar
 * - Markdown shortcuts
 * - Clean, minimal design
 * - Code blocks with syntax highlighting
 */

import { forwardRef, useImperativeHandle, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parseContent, serializeContent } from '@/lib/tiptapMigration';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import '@/styles/tiptap.css';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

export interface NotionStyleEditorProps {
  /** Content (string or JSON) */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Custom class */
  className?: string;
  /** Disable editing */
  disabled?: boolean;
}

export interface NotionStyleEditorRef {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | undefined;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
}

// Create extensions for the notion-style editor
const getNotionExtensions = (placeholder: string) => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
    },
    codeBlock: false, // We use CodeBlockLowlight instead
  }),
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'javascript',
    HTMLAttributes: {
      class: 'hljs rounded-lg bg-muted/50 p-4 my-2 overflow-x-auto text-sm font-mono',
    },
  }),
  Placeholder.configure({
    placeholder,
    emptyEditorClass: 'is-editor-empty',
  }),
  CharacterCount,
  Underline,
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'text-primary underline underline-offset-2 hover:text-primary/80 transition-colors',
      rel: 'noopener noreferrer',
      target: '_blank',
    },
  }),
];

export const NotionStyleEditor = forwardRef<NotionStyleEditorRef, NotionStyleEditorProps>(({
  value,
  onChange,
  placeholder = 'Start writing...',
  autoFocus = true,
  className,
  disabled = false,
}, ref) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0, placement: 'above' as 'above' | 'below' });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Toolbar dimensions for collision detection
  const TOOLBAR_HEIGHT = 40;
  const TOOLBAR_OFFSET = 10;

  // Extensions
  const extensions = useMemo(() => getNotionExtensions(placeholder), [placeholder]);

  // Parse initial content
  const initialContent = useMemo(() => parseContent(value), [value]);

  // Prevent programmatic hydration from triggering onChange (critical to avoid empty overwrites)
  const applyingExternalValueRef = useRef(false);

  // Track if formatting was just applied via toolbar
  const justFormattedRef = useRef(false);

  // Editor instance
  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !disabled,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor }) => {
      if (applyingExternalValueRef.current) return;
      onChange(serializeContent(editor.getJSON()));
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;
      
      if (hasSelection && !editor.state.selection.empty) {
        const { view } = editor;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        
        const containerRect = editorContainerRef.current?.getBoundingClientRect();
        if (containerRect) {
          // Calculate horizontal center of selection
          const left = (start.left + end.left) / 2 - containerRect.left;
          
          // Calculate space available above and below selection
          const spaceAbove = start.top - containerRect.top;
          const spaceNeededAbove = TOOLBAR_HEIGHT + TOOLBAR_OFFSET;
          
          let placement: 'above' | 'below' = 'above';
          let top: number;
          
          if (spaceAbove >= spaceNeededAbove) {
            // Enough space above - position toolbar above selection
            placement = 'above';
            top = start.top - containerRect.top - TOOLBAR_HEIGHT - TOOLBAR_OFFSET;
          } else {
            // Not enough space above - position toolbar below selection
            placement = 'below';
            top = end.bottom - containerRect.top + TOOLBAR_OFFSET;
          }
          
          setToolbarPosition({ 
            top: Math.max(0, top), 
            left: Math.max(10, Math.min(left, containerRect.width - 10)),
            placement 
          });
        }
        setShowToolbar(true);
      } else {
        setShowToolbar(false);
        
        // Reset justFormatted flag when selection collapses
        if (!hasSelection) {
          justFormattedRef.current = false;
        }
      }
    },
    editorProps: {
      attributes: {
        class: 'notion-editor-content',
      },
      // Handle keydown to reset formatting after space/enter
      handleKeyDown: (view, event) => {
        // If space or enter is pressed after formatting was applied, unset marks
        if ((event.key === ' ' || event.key === 'Enter') && justFormattedRef.current) {
          justFormattedRef.current = false;
          
          // Use setTimeout to let the character be inserted first, then unset marks
          setTimeout(() => {
            const currentEditor = editor;
            if (currentEditor && currentEditor.state.selection.empty) {
              // Unset inline formatting marks for next typed text
              currentEditor.chain()
                .unsetBold()
                .unsetItalic()
                .unsetUnderline()
                .unsetStrike()
                .unsetCode()
                .run();
            }
          }, 0);
        }
        return false; // Let TipTap handle the key normally
      },
    },
  });

  // Sync editable state
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    const newContent = parseContent(value);
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(newContent);
    if (current !== incoming) {
      // CRITICAL: Do not emit an update during hydration/sync, otherwise the parent
      // may interpret the intermediate empty doc as user input and auto-save it.
      applyingExternalValueRef.current = true;
      editor.commands.setContent(newContent, { emitUpdate: false });
      Promise.resolve().then(() => {
        applyingExternalValueRef.current = false;
      });
    }
  }, [value, editor]);

  // Link handler
  const setLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange('link')
        .setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  }, [editor, linkUrl]);

  // Expose ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getJSON: () => editor?.getJSON(),
    getText: () => editor?.getText() || '',
    isEmpty: () => editor?.isEmpty ?? true,
    focus: () => editor?.commands.focus(),
  }));

  if (!editor) {
    return (
      <div className={cn('animate-pulse bg-muted/20 rounded-lg', className)} style={{ minHeight: '200px' }} />
    );
  }

  return (
    <div 
      ref={editorContainerRef}
      className={cn(
        'notion-style-editor relative',
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {/* Selection-based floating toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className={cn(
            "absolute z-50 flex items-center gap-0.5 p-1 bg-popover border border-border rounded-lg shadow-lg",
            "animate-in fade-in-0 zoom-in-95 duration-100",
            toolbarPosition.placement === 'above' ? "origin-bottom" : "origin-top"
          )}
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${toolbarPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur
        >
          {/* Text formatting */}
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().toggleBold().run();
              justFormattedRef.current = true;
            }}
            isActive={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().toggleItalic().run();
              justFormattedRef.current = true;
            }}
            isActive={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().toggleUnderline().run();
              justFormattedRef.current = true;
            }}
            isActive={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => {
              editor.chain().focus().toggleStrike().run();
              justFormattedRef.current = true;
            }}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Code Block - inserts a syntax-highlighted code block */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editor.chain().focus().toggleCodeBlock().run();
            }}
            className={cn(
              'p-1.5 rounded-md hover:bg-muted transition-colors',
              editor.isActive('codeBlock') && 'bg-primary/10 text-primary'
            )}
            title="Code Block"
          >
            <Code className="h-4 w-4" />
          </button>

          {/* Link */}
          <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'p-1.5 rounded-md hover:bg-muted transition-colors',
                  editor.isActive('link') && 'bg-primary/10 text-primary'
                )}
                onClick={() => {
                  setLinkUrl(editor.getAttributes('link').href || '');
                  setShowLinkInput(true);
                }}
                title="Link"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste link..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setLink())}
                  className="flex-1 h-8 text-sm"
                  autoFocus
                />
                <Button size="sm" className="h-8" onClick={setLink}>
                  {editor.isActive('link') ? 'Update' : 'Add'}
                </Button>
              </div>
              {editor.isActive('link') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-destructive hover:text-destructive"
                  onClick={() => {
                    editor.chain().focus().unsetLink().run();
                    setShowLinkInput(false);
                  }}
                >
                  Remove link
                </Button>
              )}
            </PopoverContent>
          </Popover>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Lists */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          {/* Quote */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>

          {/* Horizontal Rule - inserts a divider line between sections */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule (Divider)"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
});

NotionStyleEditor.displayName = 'NotionStyleEditor';

// Toolbar button component
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md hover:bg-muted transition-colors',
        isActive && 'bg-primary/10 text-primary'
      )}
    >
      {children}
    </button>
  );
}

export default NotionStyleEditor;
