/**
 * LightEditor - Comment/Reply Editor
 * 
 * Minimal TipTap editor for comments and replies.
 * Limited features: bold, italic, inline code, links only.
 * 
 * ROLES: All users (for comments), Admins/Moderators (for replies)
 * LEARNERS: Can ONLY create comments - no editing after submission
 */

import { forwardRef, useImperativeHandle, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useEditor, EditorContent, type JSONContent, type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bold, Italic, Code, Link as LinkIcon, List, ListOrdered, Heading2, Quote, Image as ImageIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getLightEditorExtensions, CHARACTER_LIMITS } from './editorConfig';
import { parseContent, serializeContent } from '@/lib/tiptapMigration';
import { useEditorAutosave } from '@/hooks/useEditorAutosave';
import '@/styles/tiptap.css';

export interface LightEditorProps {
  /** Content (JSON or string) */
  value: string | JSONContent;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Character limit (default: 2000) */
  characterLimit?: number;
  /** Custom class */
  className?: string;
  /** Draft key for autosave */
  draftKey?: string;
  /** Show character count */
  showCharCount?: boolean;
  /** Disable editing */
  disabled?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Minimum height */
  minHeight?: string;
  /**
   * When set, pressing Enter (without Shift/Meta/Ctrl) fires this callback
   * and prevents the default newline. Shift+Enter still inserts a newline.
   * Useful for chat-style "Enter to send" inputs.
   */
  onEnterSubmit?: () => void;
  /**
   * Show extended toolbar buttons: bullet list, numbered list, heading, blockquote, image.
   * Off by default — only pass true in chat composer, not in annotation popup.
   */
  extendedToolbar?: boolean;
  /**
   * Extra buttons rendered at the very start of the toolbar (before Bold).
   * Use this to inject custom actions (e.g. Undo/Redo) without modifying LightEditor internals.
   */
  startToolbarActions?: React.ReactNode;
}

export interface LightEditorRef {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | undefined;
  getText: () => string;
  isEmpty: () => boolean;
  focus: () => void;
  clear: () => void;
}

export const LightEditor = forwardRef<LightEditorRef, LightEditorProps>(({
  value,
  onChange,
  placeholder = 'Write a comment...',
  characterLimit = CHARACTER_LIMITS.comment,
  className,
  draftKey,
  showCharCount = true,
  disabled = false,
  autoFocus = false,
  minHeight = '80px',
  onEnterSubmit,
  extendedToolbar = false,
  startToolbarActions,
}, ref) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  // Keep a stable ref to the submit callback to avoid stale closures in TipTap's editorProps
  const onEnterSubmitRef = useRef(onEnterSubmit);
  useEffect(() => { onEnterSubmitRef.current = onEnterSubmit; }, [onEnterSubmit]);

  // Autosave for drafts
  const autosave = useEditorAutosave({
    draftKey: draftKey || '',
    enableLocalDraft: !!draftKey,
    warnOnUnsavedChanges: false,
  });

  // Extensions
  const extensions = useMemo(() =>
    getLightEditorExtensions({ placeholder, characterLimit }),
    [placeholder, characterLimit]
  );

  // Parse initial content - only use draft if parent value is empty
  const initialContent = useMemo(() => {
    // If the parent passes a non-empty value, always use it (don't load draft)
    const parsedValue = parseContent(value);
    const isValueEmpty = !value ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'object' && JSON.stringify(value) === JSON.stringify({ type: 'doc', content: [] }));

    // Only load draft if draftKey is set AND parent value is empty
    if (draftKey && isValueEmpty) {
      const draft = autosave.loadDraft();
      if (draft) return draft;
    }

    return parsedValue;
  }, []);

  // Track the last content we sent to parent to prevent feedback loops
  const lastSentContentRef = useRef<string>('');

  // Editor instance
  const editor = useEditor({
    extensions,
    content: initialContent,
    editable: !disabled,
    autofocus: autoFocus,
    editorProps: {
      handleKeyDown: (view, event) => {
        // Enter without Shift/Meta/Ctrl → call submit handler (chat-style send)
        if (
          onEnterSubmitRef.current &&
          event.key === 'Enter' &&
          !event.shiftKey &&
          !event.metaKey &&
          !event.ctrlKey
        ) {
          // Don't intercept Enter inside a list item — TipTap must handle it
          // so it creates the next bullet/numbered item (or exits the list on empty).
          const { $from } = view.state.selection;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name === 'listItem') return false;
          }
          event.preventDefault();
          onEnterSubmitRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const serialized = serializeContent(json);
      // Store what we're sending to parent
      lastSentContentRef.current = serialized;
      onChange(serialized);
      if (draftKey) {
        autosave.debouncedSave(json);
      }
    },
  });

  // Sync editable state
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  // Sync external value - only when change is from parent (not from typing)
  useEffect(() => {
    if (!editor) return;

    // Get the serialized incoming value
    const incomingValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Skip if this is the same content we just sent to parent (prevents feedback loop)
    if (incomingValue === lastSentContentRef.current) {
      return;
    }

    const newContent = parseContent(value);
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(newContent);

    // Check if parent is explicitly passing empty value
    const isValueEmpty = !value ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'object' && JSON.stringify(value) === JSON.stringify({ type: 'doc', content: [] }));

    if (isValueEmpty && current !== incoming) {
      // Parent is resetting to empty - clear editor AND draft
      lastSentContentRef.current = ''; // Reset the ref too
      editor.commands.setContent(newContent);
      if (draftKey) {
        autosave.clearDraft();
      }
    } else if (current !== incoming) {
      editor.commands.setContent(newContent);
    }
  }, [value, editor, draftKey, autosave]);

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
    clear: () => {
      editor?.commands.clearContent();
      if (draftKey) autosave.clearDraft();
    },
  }));

  const charCount = editor?.storage.characterCount?.characters() || 0;
  const isOverLimit = charCount >= characterLimit;
  const isNearLimit = charCount > characterLimit * 0.9;

  if (!editor) {
    return <div className={cn('border rounded-lg bg-background animate-pulse', className)} style={{ minHeight }} />;
  }

  return (
    <div
      className={cn(
        'tiptap-light-editor border border-border rounded-lg overflow-hidden bg-background transition-all',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
    >
      {/* Editor content */}
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>

      {/* Light toolbar - appears on focus/hover */}
      <div className="tiptap-light-toolbar">
        <TooltipProvider delayDuration={300}>
          {startToolbarActions && (
            <>
              {startToolbarActions}
              <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-primary/10 text-primary')}
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={disabled}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold (⌘B)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-primary/10 text-primary')}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={disabled}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic (⌘I)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', editor.isActive('code') && 'bg-primary/10 text-primary')}
                onClick={() => editor.chain().focus().toggleCode().run()}
                disabled={disabled}
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Inline Code (⌘`)</TooltipContent>
          </Tooltip>

          <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', editor.isActive('link') && 'bg-primary/10 text-primary')}
                onClick={() => {
                  setLinkUrl(editor.getAttributes('link').href || '');
                  setShowLinkInput(true);
                }}
                disabled={disabled}
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

          {/* Extended toolbar — only in chat composer */}
          {extendedToolbar && (
            <>
              <div className="w-px h-4 bg-border mx-0.5 flex-shrink-0" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn('h-7 w-7 p-0', editor.isActive('bulletList') && 'bg-primary/10 text-primary')}
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    disabled={disabled}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn('h-7 w-7 p-0', editor.isActive('orderedList') && 'bg-primary/10 text-primary')}
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    disabled={disabled}
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn('h-7 w-7 p-0', editor.isActive('heading', { level: 2 }) && 'bg-primary/10 text-primary')}
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    disabled={disabled}
                  >
                    <Heading2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Heading</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn('h-7 w-7 p-0', editor.isActive('blockquote') && 'bg-primary/10 text-primary')}
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    disabled={disabled}
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Blockquote</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      const url = window.prompt('Image URL');
                      if (url) editor.chain().focus().setImage({ src: url }).run();
                    }}
                    disabled={disabled}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Image</TooltipContent>
              </Tooltip>
            </>
          )}
        </TooltipProvider>

        {/* Character count */}
        {showCharCount && (
          <div className={cn(
            'ml-auto text-xs',
            isOverLimit && 'text-destructive font-medium',
            isNearLimit && !isOverLimit && 'text-amber-600 dark:text-amber-400'
          )}>
            {charCount}/{characterLimit}
          </div>
        )}
      </div>
    </div>
  );
});

LightEditor.displayName = 'LightEditor';

export default LightEditor;
