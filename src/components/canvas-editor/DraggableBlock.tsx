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
import { cn } from '@/lib/utils';
import { CanvasBlock, InlineCheckpointData } from './types';
import CanvasBlockToolbar from './CanvasBlockToolbar';
import { RichTextEditor, type RichTextEditorRef } from '@/components/tiptap';
import { ChatStyleEditor } from '@/components/chat-editor';
import { InlineCheckpointEditor } from './checkpoint';
import type { Editor } from '@tiptap/react';

/** Extract a short plain-text preview from block content */
function getContentPreview(content: string): string {
  if (!content) return '';
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === 'doc' && Array.isArray(parsed.content)) {
      for (const node of parsed.content) {
        const text = node?.content?.[0]?.text;
        if (text) return text.slice(0, 80);
      }
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
        'group rounded-lg border bg-background transition-shadow duration-150',
        isDragging && 'opacity-30 shadow-2xl',
        isFocused || isSelected
          ? 'border-primary shadow-md ring-1 ring-primary/20'
          : 'border-border/50 hover:border-border',
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
            />
          ) : block.kind === 'checkpoint' ? (
            <InlineCheckpointEditor
              data={block.data!}
              onChange={(updatedData: InlineCheckpointData) =>
                onUpdate(block.id, { data: updatedData })
              }
            />
          ) : (
            <ChatStyleEditor
              value={block.content}
              onChange={handleContentChange}
              placeholder="Start a conversation…"
              courseType={lessonLabel || "python"}
              showExplanation={false}
              lessonLabel={lessonLabel}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default DraggableBlock;
