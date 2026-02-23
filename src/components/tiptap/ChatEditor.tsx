/**
 * ChatEditor - Markdown-based TipTap Editor for Chat Bubbles
 * 
 * Used for chat-style content creation in the conversational learning format.
 * Stores content as markdown strings for compatibility with existing parsing.
 * 
 * ROLES: Admin, Super Moderator, Senior Moderator, Moderator (assigned only)
 */

import { forwardRef, useImperativeHandle, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Markdown } from 'tiptap-markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Code, List, ListOrdered, Heading2, Quote, Link as LinkIcon, 
  ChevronDown, Check, X, Eye, EyeOff, Columns
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { MonacoCodeBlock } from '@/components/code-block';
import '@/styles/tiptap.css';

// Detect OS for keyboard shortcut display
const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const modKey = isMac ? '⌘' : 'Ctrl';

const CODE_LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash/Shell' },
];

type ViewMode = 'edit' | 'preview' | 'split';

export interface ChatEditorProps {
  /** Initial markdown content */
  value: string;
  /** Change handler - receives markdown string */
  onChange?: (markdown: string) => void;
  /** Save callback (Enter key) */
  onSave?: (markdown: string) => void;
  /** Cancel callback (Escape key) */
  onCancel?: () => void;
  /** Placeholder text */
  placeholder?: string;
  /** Is this a mentor bubble (affects styling) */
  isMentor?: boolean;
  /** Code theme for preview */
  codeTheme?: string;
  /** Custom class */
  className?: string;
  /** Auto focus on mount */
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

// Get extensions for chat editor
const getChatEditorExtensions = (
  placeholder?: string,
  onSaveRef?: React.RefObject<((md: string) => void) | undefined>,
  onCancelRef?: React.RefObject<(() => void) | undefined>,
  getMarkdownRef?: React.RefObject<((ed: Editor) => string) | undefined>
) => {
  // Custom extension for chat-specific keyboard shortcuts
  const ChatKeyboardShortcuts = Extension.create({
    name: 'chatKeyboardShortcuts',
    
    addKeyboardShortcuts() {
      return {
        // Enter saves the message
        'Enter': ({ editor }) => {
          // Save the content
          if (onSaveRef?.current && getMarkdownRef?.current) {
            const md = getMarkdownRef.current(editor);
            onSaveRef.current(md);
          }
          return true; // We handled it
        },
        // Escape cancels
        'Escape': () => {
          if (onCancelRef?.current) {
            onCancelRef.current();
          }
          return true;
        },
      };
    },
  });

  return [
    StarterKit.configure({
      heading: { levels: [2] },
      codeBlock: {
        HTMLAttributes: {
          class: 'tiptap-code-block',
        },
      },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'tiptap-link' },
    }),
    Placeholder.configure({
      placeholder: placeholder || 'Type your message...',
      emptyEditorClass: 'is-editor-empty',
    }),
    CharacterCount,
    Markdown.configure({
      html: false,
      transformCopiedText: true,
      transformPastedText: true,
    }),
    ChatKeyboardShortcuts,
  ];
};

export const ChatEditor = forwardRef<ChatEditorRef, ChatEditorProps>(({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = 'Type your message...',
  isMentor = false,
  codeTheme,
  className,
  autoFocus = true,
}, ref) => {
  // View mode for edit/preview/split
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('chatEditorViewMode');
    return (saved === 'edit' || saved === 'preview' || saved === 'split') ? saved : 'edit';
  });

  // Refs to pass callbacks to extensions (avoids recreating extensions on callback changes)
  const onSaveRef = useRef(onSave);
  const onCancelRef = useRef(onCancel);
  
  // Helper to get markdown from editor
  const getMarkdownFromEditor = useCallback((ed: Editor): string => {
    // tiptap-markdown stores getMarkdown on the editor instance via extension
    const storage = ed.storage as { markdown?: { getMarkdown: () => string } };
    return storage.markdown?.getMarkdown?.() || ed.getText() || '';
  }, []);
  
  const getMarkdownRef = useRef(getMarkdownFromEditor);
  
  // Keep refs updated
  useEffect(() => {
    onSaveRef.current = onSave;
    onCancelRef.current = onCancel;
    getMarkdownRef.current = getMarkdownFromEditor;
  }, [onSave, onCancel, getMarkdownFromEditor]);

  // Extensions - use refs so we don't recreate on callback changes
  const extensions = useMemo(
    () => getChatEditorExtensions(placeholder, onSaveRef, onCancelRef, getMarkdownRef),
    [placeholder]
  );

  // Editor instance
  const editor = useEditor({
    extensions,
    content: value,
    autofocus: autoFocus ? 'end' : false,
    onUpdate: ({ editor: ed }) => {
      const md = getMarkdownFromEditor(ed);
      onChange?.(md);
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (!editor) return;
    const currentMd = getMarkdownFromEditor(editor);
    if (value !== currentMd) {
      editor.commands.setContent(value);
    }
  }, [value, editor, getMarkdownFromEditor]);

  // View mode handler
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('chatEditorViewMode', mode);
  }, []);

  // Insert code block as raw markdown text
  const insertCodeBlock = useCallback((language: string) => {
    if (!editor) return;
    // Insert raw markdown code fence so user can easily edit it
    const codeBlock = `\n\`\`\`${language}\n# Your code here\n\`\`\`\n`;
    editor.chain().focus().insertContent(codeBlock).run();
  }, [editor]);

  // Insert link
  const insertLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  // Expose ref
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getMarkdown: () => editor ? getMarkdownFromEditor(editor) : '',
    getText: () => editor?.getText() || '',
    isEmpty: () => editor?.isEmpty ?? true,
    focus: () => editor?.commands.focus(),
    clear: () => editor?.commands.clearContent(),
  }), [editor, getMarkdownFromEditor]);

  // Render markdown preview
  const renderPreview = useCallback((content: string) => {
    // Parse code blocks
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'code', content: match[2] || '', language: match[1] || 'text' });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    if (parts.length === 0) {
      parts.push({ type: 'text', content });
    }

    // Parse inline markdown
    const parseInline = (text: string): React.ReactNode[] => {
      const nodes: React.ReactNode[] = [];
      const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)/g;
      let lastIdx = 0;
      let m;
      let key = 0;

      while ((m = regex.exec(text)) !== null) {
        if (m.index > lastIdx) {
          nodes.push(<span key={key++}>{text.slice(lastIdx, m.index)}</span>);
        }
        if (m[1]) nodes.push(<strong key={key++}>{m[2]}</strong>);
        else if (m[3]) nodes.push(<em key={key++}>{m[4]}</em>);
        else if (m[5]) nodes.push(<code key={key++} className="px-1.5 py-0.5 rounded text-xs font-mono bg-muted">{m[6]}</code>);
        lastIdx = m.index + m[0].length;
      }

      if (lastIdx < text.length) {
        nodes.push(<span key={key++}>{text.slice(lastIdx)}</span>);
      }

      return nodes.length ? nodes : [text];
    };

    // Parse lines
    const parseLines = (text: string) => {
      return text.split('\n').map((line, idx) => {
        if (line.match(/^##\s+(.+)$/)) {
          return <h2 key={idx} className="text-base font-bold mt-2 mb-1">{parseInline(line.replace(/^##\s+/, ''))}</h2>;
        }
        if (line.match(/^>\s+(.+)$/)) {
          return <blockquote key={idx} className="border-l-2 border-muted-foreground/30 pl-3 my-1 italic">{parseInline(line.replace(/^>\s+/, ''))}</blockquote>;
        }
        if (line.match(/^[•\-]\s+(.+)$/)) {
          return <div key={idx} className="flex items-start gap-2 ml-1"><span>•</span><span>{parseInline(line.replace(/^[•\-]\s+/, ''))}</span></div>;
        }
        if (line.match(/^(\d+)\.\s+(.+)$/)) {
          const m = line.match(/^(\d+)\.\s+(.+)$/);
          return m ? <div key={idx} className="flex items-start gap-2 ml-1"><span className="min-w-[1rem]">{m[1]}.</span><span>{parseInline(m[2])}</span></div> : null;
        }
        if (line.trim()) {
          return <span key={idx}>{parseInline(line)}<br /></span>;
        }
        return <br key={idx} />;
      });
    };

    return parts.map((part, idx) => {
      if (part.type === 'code') {
        return (
          <div key={idx} className="my-2">
            <MonacoCodeBlock
              code={part.content}
              language={part.language}
              showLanguageLabel
            />
          </div>
        );
      }
      return <div key={idx}>{parseLines(part.content)}</div>;
    });
  }, [isMentor, codeTheme]);

  if (!editor) {
    return <div className={cn('min-h-[100px] animate-pulse bg-muted/30 rounded-lg', className)} />;
  }

  const currentMarkdown = getMarkdownFromEditor(editor);

  // Color classes based on mentor/course (using chat-specific colors that exist in the design system)
  const colorClasses = {
    border: isMentor ? 'border-primary/30' : 'border-border',
    bg: isMentor ? 'bg-primary/5' : 'bg-muted/30',
    text: isMentor ? 'text-primary-foreground' : 'text-foreground',
    buttonActive: isMentor ? 'bg-primary/20' : 'bg-primary/10',
    buttonHover: isMentor ? 'hover:bg-primary/15' : 'hover:bg-muted',
    previewBg: isMentor ? 'bg-primary/5' : 'bg-muted/20',
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* View mode toggle */}
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewModeChange('edit')}
          className={cn('h-6 px-2 text-xs gap-1', viewMode === 'edit' && colorClasses.buttonActive, colorClasses.buttonHover)}
        >
          <EyeOff className="w-3 h-3" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewModeChange('split')}
          className={cn('h-6 px-2 text-xs gap-1', viewMode === 'split' && colorClasses.buttonActive, colorClasses.buttonHover)}
        >
          <Columns className="w-3 h-3" />
          Split
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewModeChange('preview')}
          className={cn('h-6 px-2 text-xs gap-1', viewMode === 'preview' && colorClasses.buttonActive, colorClasses.buttonHover)}
        >
          <Eye className="w-3 h-3" />
          Preview
        </Button>
      </div>

      {/* Editor content */}
      {viewMode === 'split' ? (
        <ResizablePanelGroup direction="horizontal" className={cn('min-h-[120px] rounded-lg border', colorClasses.border)}>
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className={cn('h-full overflow-auto', colorClasses.bg)}>
              <EditorContent 
                editor={editor} 
                className={cn('tiptap-chat-editor p-2 text-sm leading-relaxed min-h-[100px]', colorClasses.text)}
              />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className={cn('h-full overflow-auto p-3 text-sm leading-relaxed', colorClasses.previewBg)}>
              {currentMarkdown ? renderPreview(currentMarkdown) : <span className="text-muted-foreground italic">Preview...</span>}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : viewMode === 'preview' ? (
        <div className={cn('min-h-[100px] border rounded-lg p-3 text-sm leading-relaxed', colorClasses.border, colorClasses.bg)}>
          {currentMarkdown ? renderPreview(currentMarkdown) : <span className="text-muted-foreground italic">Nothing to preview...</span>}
        </div>
      ) : (
        <div className={cn('border rounded-lg overflow-hidden', colorClasses.border, colorClasses.bg)}>
          <EditorContent 
            editor={editor} 
            className={cn('tiptap-chat-editor p-2 text-sm leading-relaxed min-h-[100px]', colorClasses.text)}
          />
        </div>
      )}

      {/* Formatting toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-7 px-2 text-xs gap-1', colorClasses.border, colorClasses.buttonHover)}>
              <Bold className="w-3 h-3" />
              Format
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBold().run()} className="cursor-pointer">
              <Bold className="w-4 h-4 mr-2" />
              Bold
              <DropdownMenuShortcut>{modKey}+B</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleItalic().run()} className="cursor-pointer">
              <Italic className="w-4 h-4 mr-2" />
              Italic
              <DropdownMenuShortcut>{modKey}+I</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleCode().run()} className="cursor-pointer">
              <Code className="w-4 h-4 mr-2" />
              Inline Code
              <DropdownMenuShortcut>{modKey}+`</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()} className="cursor-pointer">
              <List className="w-4 h-4 mr-2" />
              Bullet List
              <DropdownMenuShortcut>{modKey}+⇧+U</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()} className="cursor-pointer">
              <ListOrdered className="w-4 h-4 mr-2" />
              Numbered List
              <DropdownMenuShortcut>{modKey}+⇧+O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="cursor-pointer">
              <Heading2 className="w-4 h-4 mr-2" />
              Heading
              <DropdownMenuShortcut>{modKey}+⇧+H</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleBlockquote().run()} className="cursor-pointer">
              <Quote className="w-4 h-4 mr-2" />
              Blockquote
              <DropdownMenuShortcut>{modKey}+⇧+Q</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={insertLink} className="cursor-pointer">
              <LinkIcon className="w-4 h-4 mr-2" />
              Link
              <DropdownMenuShortcut>{modKey}+K</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer">
                <Code className="w-4 h-4 mr-2" />
                Code Block
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {CODE_LANGUAGES.map((lang) => (
                    <DropdownMenuItem key={lang.value} onClick={() => insertCodeBlock(lang.value)} className="cursor-pointer">
                      {lang.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-[10px] text-muted-foreground">
          Enter save • Shift+Enter newline
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} className={cn('h-7 px-2 text-xs', colorClasses.buttonHover)}>
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onSave?.(currentMarkdown)} 
          className={cn('h-7 px-2 text-xs', colorClasses.buttonActive, colorClasses.buttonHover)}
        >
          <Check className="w-3 h-3 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
});

ChatEditor.displayName = 'ChatEditor';

export default ChatEditor;
