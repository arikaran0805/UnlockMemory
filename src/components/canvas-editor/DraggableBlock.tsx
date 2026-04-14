/**
 * DraggableBlock – sortable canvas block
 *
 * - Uses @dnd-kit/sortable (vertical reorder)
 * - Flow layout (no absolute positioning)
 * - Collapsible with content preview in header
 * - Editable variable-style block name
 * - Chat blocks rendered without the explanation section
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Upload, Image as ImageIcon, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CanvasBlock, InlineCheckpointData } from './types';
import CanvasBlockToolbar from './CanvasBlockToolbar';
import { RichTextEditor, type RichTextEditorRef } from '@/components/tiptap';
import { ChatStyleEditor } from '@/components/chat-editor';
import { InlineCheckpointEditor } from './checkpoint';
import TakeawayCanvasEditor from './TakeawayCanvasEditor';
import FreeformCanvasBlock from './FreeformCanvasBlock';
import type { Editor } from '@tiptap/react';

/* ------------------------------------------------------------------ */
/* MediaBlockContent — premium drag-drop / browse / URL upload UI      */
/* ------------------------------------------------------------------ */

const MediaBlockContent = ({
  content,
  onChange,
}: {
  content: string;
  onChange: (url: string) => void;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      onChange(URL.createObjectURL(file));
    },
    [onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const handleUrlSubmit = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    setUrlInput('');
    setShowUrlInput(false);
  }, [urlInput, onChange]);

  /* ── Filled state — image preview with replace overlay ── */
  if (content) {
    return (
      <div className="relative group/media rounded-xl overflow-hidden border border-border bg-muted/30">
        <img
          src={content}
          alt="Media block"
          className="w-full max-h-[480px] object-contain block"
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={() => onChange('')}
            className="flex items-center gap-1.5 text-white text-xs font-semibold bg-white/20 rounded-lg px-4 py-2 hover:bg-white/30 transition-colors backdrop-blur-sm"
          >
            <Upload className="h-3.5 w-3.5" />
            Replace Image
          </button>
        </div>
      </div>
    );
  }

  /* ── Empty state — upload UI ── */
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Drop zone */}
      <div
        className={cn(
          'w-full rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer p-10 flex flex-col items-center gap-3 text-center select-none',
          isDragOver
            ? 'border-primary bg-primary/5 scale-[0.99]'
            : 'border-border/50 hover:border-primary/50 hover:bg-muted/40',
        )}
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200',
          isDragOver ? 'bg-primary/15' : 'bg-muted',
        )}>
          <Upload className={cn(
            'h-6 w-6 transition-colors duration-200',
            isDragOver ? 'text-primary' : 'text-muted-foreground/50',
          )} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground/80">
            {isDragOver ? 'Drop to upload' : 'Drag & drop your image here'}
          </p>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, GIF, WebP, SVG · Max 10 MB
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Action buttons */}
      <div className="flex items-center gap-2 w-full">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border bg-background text-xs font-medium text-foreground/70 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Browse Files
        </button>
        <button
          onClick={() => setShowUrlInput(v => !v)}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-medium transition-all',
            showUrlInput
              ? 'border-primary/40 bg-primary/5 text-primary'
              : 'border-border bg-background text-foreground/70 hover:border-primary/50 hover:text-primary hover:bg-primary/5',
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          Paste URL
        </button>
      </div>

      {/* URL input — expandable */}
      {showUrlInput && (
        <div className="flex gap-2 w-full">
          <input
            type="url"
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
            autoFocus
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim()}
            className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
};

/** Extract a short plain-text preview from block content */
function getContentPreview(content: string): string {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    // TipTap doc JSON
    if (parsed?.type === 'doc' && Array.isArray(parsed.content)) {
      for (const node of parsed.content) {
        const text = node?.content?.[0]?.text;
        if (text) return text.slice(0, 80);
      }
    }
    // Takeaway JSON { title, icon, body }
    if (parsed && typeof parsed === 'object' && ('title' in parsed || 'body' in parsed)) {
      const preview = (parsed.title || parsed.body || '').trim();
      return preview.slice(0, 80);
    }
  } catch {
    const first = content
      .split('\n')
      .map((l: string) => l.replace(/[#*_`[\]()>]/g, '').trim())
      .find((l: string) => l.length > 0);
    if (first) return first.slice(0, 80);
  }
  return '';
}

interface DraggableBlockProps {
  block: CanvasBlock;
  onUpdate: (id: string, updates: Partial<CanvasBlock>) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRegisterRef: (id: string, el: HTMLElement | null) => void;
  onRegisterEditor?: (id: string, editor: Editor | null) => void;
  lessonLabel?: string;
  isCollapsed: boolean;
  onToggleCollapse: (id: string) => void;
  annotationMode?: boolean;
  onTextSelect?: (type: "paragraph" | "code" | "conversation", bubbleIndex?: number) => void;
}

const DraggableBlock = ({
  block,
  onUpdate,
  onDuplicate,
  onDelete,
  isSelected,
  onSelect,
  onRegisterEditor,
  onRegisterRef,
  lessonLabel,
  isCollapsed,
  onToggleCollapse,
  annotationMode,
  onTextSelect,
}: DraggableBlockProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const richEditorRef = useRef<RichTextEditorRef>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Register DOM node for auto-scroll from parent
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    onRegisterRef(block.id, node);
  }, [setNodeRef, onRegisterRef, block.id]);

  const handleContentChange = useCallback((content: string) => {
    onUpdate(block.id, { content });
  }, [block.id, onUpdate]);

  const handleNameChange = useCallback((name: string) => {
    onUpdate(block.id, { name });
  }, [block.id, onUpdate]);

  const handleFocus = () => {
    setIsFocused(true);
    onSelect(block.id);
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return;
    setIsFocused(false);
  };

  // Track height changes for canvas sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height;
        if (Math.abs(h - block.h) > 10) onUpdate(block.id, { h });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [block.id, block.h, onUpdate]);

  // Register inner TipTap editor with parent for image insertion
  useEffect(() => {
    if (block.kind !== 'text' || !onRegisterEditor) return;
    const editor = richEditorRef.current?.getEditor() ?? null;
    onRegisterEditor(block.id, editor);
    return () => onRegisterEditor(block.id, null);
  });

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        'group rounded-xl border border-l-[3px] bg-white dark:bg-card transition-colors duration-150',
        'border-l-primary/50',
        isDragging && 'opacity-20 scale-[0.98]',
        isFocused || isSelected
          ? 'border-primary/60 ring-1 ring-primary/20'
          : 'border-primary/15 hover:border-primary/35',
      )}
      onClick={(e) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('.ProseMirror, input, textarea, select, [contenteditable="true"]')) {
          return;
        }
        onSelect(block.id);
      }}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* Header toolbar – always visible */}
      <CanvasBlockToolbar
        kind={block.kind}
        name={block.name}
        onNameChange={handleNameChange}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => onToggleCollapse(block.id)}
        onDuplicate={() => onDuplicate(block.id)}
        onDelete={() => onDelete(block.id)}
        dragHandleProps={{ ...listeners, ...attributes }}
        contentPreview={getContentPreview(block.content)}
        annotationMode={annotationMode}
      />

      {/* Content – hidden when collapsed */}
      {!isCollapsed && (
        <div className="p-4">
          {block.kind === 'text' ? (
            <RichTextEditor
              ref={richEditorRef}
              value={block.content}
              onChange={handleContentChange}
              placeholder="Write your content here…"
              className="min-h-[450px]"
              annotationMode={annotationMode}
              onTextSelect={annotationMode && onTextSelect
                ? (_sel) => onTextSelect("paragraph")
                : undefined
              }
            />
          ) : block.kind === 'checkpoint' ? (
            <InlineCheckpointEditor
              data={block.data!}
              onChange={(updatedData: InlineCheckpointData) =>
                onUpdate(block.id, { data: updatedData })
              }
            />
          ) : block.kind === 'takeaway' ? (
            <TakeawayCanvasEditor
              content={block.content}
              onChange={handleContentChange}
            />
          ) : block.kind === 'media' ? (
            <MediaBlockContent
              content={block.content}
              onChange={handleContentChange}
            />
          ) : block.kind === 'freeform' ? (
            <FreeformCanvasBlock
              content={block.content}
              onChange={handleContentChange}
            />
          ) : (
            <ChatStyleEditor
              value={block.content}
              onChange={handleContentChange}
              placeholder="Start a conversation…"
              courseType={lessonLabel || "python"}
              showExplanation={false}
              lessonLabel={lessonLabel}
              annotationMode={annotationMode}
              onTextSelect={(sel) => onTextSelect?.("conversation", sel.bubbleIndex)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DraggableBlock;
