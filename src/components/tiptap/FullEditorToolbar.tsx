/**
 * FullEditor Toolbar
 * 
 * Complete toolbar for admin/moderator content editing.
 * Includes all formatting options: headings, lists, code blocks, tables, images.
 */

import { type Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code2, Link as LinkIcon,
  Undo, Redo, Heading1, Heading2, Heading3, Minus, Keyboard,
  Table as TableIcon, Image as ImageIcon, Highlighter,
} from 'lucide-react';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useState, useCallback } from 'react';
import { KEYBOARD_SHORTCUTS } from './editorConfig';

interface FullEditorToolbarProps {
  editor: Editor | null;
  className?: string;
}

export function FullEditorToolbar({ editor, className }: FullEditorToolbarProps) {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

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

  const insertImage = useCallback(() => {
    if (!editor || !imageUrl) return;
    const url = imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`;
    editor.chain().focus().setImage({ src: url }).run();
    setImageUrl('');
    setShowImageInput(false);
  }, [editor, imageUrl]);

  const insertTable = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn('tiptap-toolbar rounded-t-lg', className)}>
      {/* Text formatting */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (⌘B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (⌘I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (⌘U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Headings */}
      <div className="tiptap-toolbar-group">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={cn(
              'h-8 px-2 gap-1 text-xs transition-colors',
              editor.isActive('heading')
                ? 'bg-primary/15 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary',
            )}>
              <Heading1 className="w-4 h-4" />
              <span className="hidden sm:inline">Heading</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 className="w-4 h-4 mr-2" /> Heading 1
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="w-4 h-4 mr-2" /> Heading 2
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="w-4 h-4 mr-2" /> Heading 3
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <Minus className="w-4 h-4 mr-2" /> Normal text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Lists */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Block elements */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        
        {/* Code block - inserts immediately with default Python, language selector is inside the block */}
        <ToolbarButton
          onClick={() => {
            // Insert executable code block with default Python language
            // Language selector is rendered INSIDE the NodeView
            editor.chain().focus().setExecutableCodeBlock({ language: 'python', code: '' }).run();
          }}
          isActive={editor.isActive('executableCodeBlock')}
          title="Code Block (⌘⌥C)"
        >
          <Code2 className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Table */}
      <div className="tiptap-toolbar-group">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0 transition-colors', editor.isActive('table') ? 'bg-primary/15 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary')}
              title="Table"
            >
              <TableIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={insertTable}>
              Insert Table (3×3)
            </DropdownMenuItem>
            {editor.isActive('table') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
                  Add Column Before
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  Add Column After
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                  Add Row Before
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                  Add Row After
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="text-destructive"
                >
                  Delete Table
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Link & Image */}
      <div className="tiptap-toolbar-group">
        <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0 transition-colors', editor.isActive('link') ? 'bg-primary/15 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary')}
              onClick={() => {
                setLinkUrl(editor.getAttributes('link').href || '');
                setShowLinkInput(true);
              }}
              title="Insert Link (⌘K)"
            >
              <LinkIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="flex gap-2">
              <Input
                placeholder="Enter URL..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setLink())}
                className="flex-1"
              />
              <Button size="sm" onClick={setLink}>
                {editor.isActive('link') ? 'Update' : 'Add'}
              </Button>
            </div>
            {editor.isActive('link') && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-destructive"
                onClick={() => {
                  editor.chain().focus().unsetLink().run();
                  setShowLinkInput(false);
                }}
              >
                Remove Link
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <Popover open={showImageInput} onOpenChange={setShowImageInput}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 transition-colors text-muted-foreground hover:bg-primary/[0.08] hover:text-primary" title="Insert Image">
              <ImageIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="start">
            <div className="flex gap-2">
              <Input
                placeholder="Image URL..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), insertImage())}
                className="flex-1"
              />
              <Button size="sm" onClick={insertImage}>Insert</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="tiptap-toolbar-divider" />

      {/* Undo/Redo */}
      <div className="tiptap-toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo (⌘Z)"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo (⌘⇧Z)"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      <div className="flex-1" />

      {/* Keyboard shortcuts */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Shortcuts</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0 overflow-hidden shadow-xl" align="end">
          <div className="px-4 py-3 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Keyboard className="w-3.5 h-3.5 text-primary" />
              <h4 className="font-semibold text-sm">Keyboard Shortcuts</h4>
            </div>
          </div>
          <div className="p-3 space-y-0.5 max-h-72 overflow-y-auto">
            {KEYBOARD_SHORTCUTS.full.map((s) => (
              <div key={s.action} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors">
                <span className="text-xs text-muted-foreground">{s.action}</span>
                <kbd className="px-2 py-0.5 bg-muted border border-border/60 rounded-md text-[10px] font-mono text-foreground shadow-sm">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Toolbar button component
function ToolbarButton({ onClick, isActive, disabled, title, children }: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'h-8 w-8 p-0 transition-colors',
        isActive
          ? 'bg-primary/15 text-primary hover:bg-primary/20'
          : 'text-muted-foreground hover:bg-primary/[0.08] hover:text-primary',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {children}
    </Button>
  );
}

export default FullEditorToolbar;
