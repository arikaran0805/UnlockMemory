/**
 * ChatEditor - Inline bubble editor, styled identically to LightEditor
 *
 * Uses the same outer wrapper + tiptap-light-toolbar CSS classes as LightEditor
 * so the UI is pixel-perfect match. Backend stays tiptap-markdown for correct
 * markdown in/out (code blocks as triple-backtick text, not Monaco widgets).
 *
 * Enter → save  •  Shift+Enter → newline  •  Escape → cancel
 */

import {
  forwardRef,
  useImperativeHandle,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import CodeBlock from '@tiptap/extension-code-block';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Markdown } from 'tiptap-markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold,
  Italic,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import '@/styles/tiptap.css';

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

export interface ChatEditorProps {
  value: string;
  onChange?: (markdown: string) => void;
  onSave?: (markdown: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  isMentor?: boolean;
  /** Unused — kept for API compat */
  codeTheme?: string;
  className?: string;
  autoFocus?: boolean;
}

export interface ChatEditorRef {
  getEditor: () => Editor | null;
  getMarkdown: () => string;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  clear: () => void;
}

/* ------------------------------------------------------------------ */
/* Code-fence NodeView — renders as raw ``` markers (no styled box)    */
/* ------------------------------------------------------------------ */

const CodeFenceView = ({ node }: { node: any }) => {
  const language = (node.attrs as { language?: string }).language || '';
  return (
    <NodeViewWrapper>
      <div className="font-mono text-sm leading-relaxed my-0.5">
        <div contentEditable={false} className="select-none opacity-60">{`\`\`\`${language}`}</div>
        <NodeViewContent as="div" style={{ whiteSpace: 'pre-wrap' }} />
        <div contentEditable={false} className="select-none opacity-60">{'```'}</div>
      </div>
    </NodeViewWrapper>
  );
};

const FlatCodeBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeFenceView);
  },
});

/* ------------------------------------------------------------------ */
/* Extensions                                                           */
/* ------------------------------------------------------------------ */

const buildExtensions = (
  placeholder: string,
  onSaveRef: React.RefObject<((md: string) => void) | undefined>,
  onCancelRef: React.RefObject<(() => void) | undefined>,
  getMarkdownRef: React.RefObject<((ed: Editor) => string) | undefined>,
) => {
  const ChatKeys = Extension.create({
    name: 'chatKeyboardShortcuts',
    addKeyboardShortcuts() {
      return {
        Enter: ({ editor }) => {
          if (editor.isActive('codeBlock')) {
            // Mirror ProseMirror's newlineInCode exactly: insertText('\n') + scrollIntoView.
            // scrollIntoView is what moves the visual cursor to the new line — without it
            // the transaction applies but the caret stays at the old position.
            return editor.commands.command(({ tr, dispatch }) => {
              if (dispatch) dispatch(tr.insertText('\n').scrollIntoView());
              return true;
            });
          }
          // Inside a list item: let TipTap handle Enter so it creates the next
          // numbered/bullet item (or exits the list on an empty item).
          if (editor.isActive('listItem')) return false;
          if (onSaveRef.current && getMarkdownRef.current) {
            onSaveRef.current(getMarkdownRef.current(editor));
          }
          return true;
        },
        'Shift-Enter': ({ editor }) => {
          if (editor.isActive('codeBlock')) {
            return editor.commands.command(({ tr, dispatch }) => {
              if (dispatch) dispatch(tr.insertText('\n').scrollIntoView());
              return true;
            });
          }
          return false;
        },
        Escape: () => {
          onCancelRef.current?.();
          return true;
        },
      };
    },
  });

  return [
    StarterKit.configure({
      heading: { levels: [2] },
      codeBlock: false, // replaced by FlatCodeBlock (renders raw ``` markers)
    }),
    FlatCodeBlock,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'tiptap-link' },
    }),
    Placeholder.configure({ placeholder, emptyEditorClass: 'is-editor-empty' }),
    CharacterCount,
    Markdown.configure({
      html: false,
      transformCopiedText: true,
      transformPastedText: true,
    }),
    ChatKeys,
  ];
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export const ChatEditor = forwardRef<ChatEditorRef, ChatEditorProps>(
  (
    {
      value,
      onChange,
      onSave,
      onCancel,
      placeholder = 'Type your message...',
      isMentor = false,
      className,
      autoFocus = true,
    },
    ref,
  ) => {
    const [codePopoverOpen, setCodePopoverOpen] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    const onSaveRef = useRef(onSave);
    const onCancelRef = useRef(onCancel);

    const getMarkdownFromEditor = useCallback((ed: Editor): string => {
      const s = ed.storage as { markdown?: { getMarkdown: () => string } };
      return s.markdown?.getMarkdown?.() ?? ed.getText() ?? '';
    }, []);

    const getMarkdownRef = useRef(getMarkdownFromEditor);

    useEffect(() => {
      onSaveRef.current = onSave;
      onCancelRef.current = onCancel;
      getMarkdownRef.current = getMarkdownFromEditor;
    }, [onSave, onCancel, getMarkdownFromEditor]);

    const extensions = useMemo(
      () => buildExtensions(placeholder, onSaveRef, onCancelRef, getMarkdownRef),
      [placeholder],
    );

    const editor = useEditor({
      extensions,
      // Do NOT pass `content` here — tiptap-markdown must parse via setContent(),
      // not via TipTap's core HTML parser. Passing a markdown string directly to
      // useEditor causes the core HTML parser to run first (before tiptap-markdown
      // intercepts), which throws on code fence content and crashes the component.
      autofocus: autoFocus ? 'end' : false,
      onUpdate: ({ editor: ed }) => {
        onChange?.(getMarkdownFromEditor(ed));
      },
    });

    // Set content once editor is ready, and re-sync when value changes externally.
    // editor.commands.setContent() goes through tiptap-markdown's markdown parser,
    // which correctly converts code fences → codeBlock nodes.
    useEffect(() => {
      if (!editor) return;
      const current = getMarkdownFromEditor(editor);
      if (value !== current) editor.commands.setContent(value);
    }, [value, editor, getMarkdownFromEditor]);

    const insertCodeBlock = useCallback(
      (language: string) => {
        if (!editor) return;
        editor
          .chain()
          .focus()
          .insertContent(`\n\`\`\`${language}\n# Your code here\n\`\`\`\n`)
          .run();
        setCodePopoverOpen(false);
      },
      [editor],
    );

    const setLink = useCallback(() => {
      if (!editor) return;
      if (!linkUrl) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        const href = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
        editor.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank', rel: 'noopener noreferrer' }).run();
      }
      setLinkUrl('');
      setShowLinkInput(false);
    }, [editor, linkUrl]);

    useImperativeHandle(
      ref,
      () => ({
        getEditor: () => editor,
        getMarkdown: () => (editor ? getMarkdownFromEditor(editor) : ''),
        getText: () => editor?.getText() ?? '',
        isEmpty: () => editor?.isEmpty ?? true,
        focus: () => editor?.commands.focus(),
        clear: () => editor?.commands.clearContent(),
      }),
      [editor, getMarkdownFromEditor],
    );

    if (!editor) {
      return <div className={cn('border rounded-lg bg-background animate-pulse', className)} style={{ minHeight: 80 }} />;
    }

    const currentMarkdown = getMarkdownFromEditor(editor);

    return (
      <div
        className={cn(
          'tiptap-light-editor border border-border rounded-lg overflow-hidden bg-background transition-all',
          className,
        )}
      >
        {/* Editor area — tiptap-chat-editor enables .tiptap-chat-editor .ProseMirror pre CSS (code block styling) */}
        <div className="tiptap-chat-editor" style={{ minHeight: 72 }}>
          <EditorContent editor={editor} />
        </div>

        {/* Toolbar — always visible (opacity forced via inline style) */}
        <div className="tiptap-light-toolbar" style={{ opacity: 1 }}>
          <TooltipProvider delayDuration={300}>

            {/* Bold */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="sm"
                  className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-primary/10 text-primary')}
                  onClick={() => editor.chain().focus().toggleBold().run()}
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bold (⌘B)</TooltipContent>
            </Tooltip>

            {/* Italic */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="sm"
                  className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-primary/10 text-primary')}
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Italic (⌘I)</TooltipContent>
            </Tooltip>

            {/* Inline Code */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="sm"
                  className={cn('h-7 w-7 p-0', editor.isActive('code') && 'bg-primary/10 text-primary')}
                  onClick={() => editor.chain().focus().toggleCode().run()}
                >
                  <Code className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Inline Code (⌘`)</TooltipContent>
            </Tooltip>

            {/* Link */}
            <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm"
                  className={cn('h-7 w-7 p-0', editor.isActive('link') && 'bg-primary/10 text-primary')}
                  onClick={() => {
                    setLinkUrl(editor.getAttributes('link').href || '');
                    setShowLinkInput(true);
                  }}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="start">
                <div className="flex gap-2">
                  <Input
                    placeholder="URL..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setLink())}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="sm" className="h-8" onClick={setLink}>
                    {editor.isActive('link') ? 'Update' : 'Add'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Bullet list */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="sm"
                  className={cn('h-7 w-7 p-0', editor.isActive('bulletList') && 'bg-primary/10 text-primary')}
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Bullet List</TooltipContent>
            </Tooltip>

            {/* Numbered list */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="sm"
                  className={cn('h-7 w-7 p-0', editor.isActive('orderedList') && 'bg-primary/10 text-primary')}
                  onClick={() => editor.chain().focus().toggleOrderedList().run()}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Numbered List</TooltipContent>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />

            {/* + Code block */}
            <Popover open={codePopoverOpen} onOpenChange={setCodePopoverOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Insert Code Block</TooltipContent>
              </Tooltip>
              <PopoverContent className="w-64 p-3" align="start" side="top">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 px-0.5">
                  Insert Code Block
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {CODE_LANGUAGES.map((lang) => (
                    <button key={lang.value}
                      className="flex items-center justify-center px-2 py-2 text-xs font-medium rounded-lg border border-border/60 bg-muted/30 hover:bg-muted hover:border-border transition-colors truncate"
                      onClick={() => insertCodeBlock(lang.value)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

          </TooltipProvider>

          {/* Cancel / Save pushed to the right */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 h-7 px-3 text-xs font-semibold rounded-full shadow-sm transition-all',
                isMentor
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
              onClick={() => onSave?.(currentMarkdown)}
            >
              <Check className="h-3 w-3" />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  },
);

ChatEditor.displayName = 'ChatEditor';

export default ChatEditor;
