/**
 * CanvasEditor – Block-based canvas workspace
 *
 * Layout:   Vertical sortable list (no horizontal scroll)
 * Drag:     @dnd-kit/sortable  – drag to reorder; other blocks shift automatically
 * Name:     Each block has an editable variable-style name
 * Scroll:   Auto-scrolls to newly added / dropped blocks
 * Drop:     Accepts "block-kind" from the Assets sidebar via HTML5 drag
 */

import {
  useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle,
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, FileText, MessageSquare, CheckCircle2, Lightbulb, PenTool } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CanvasBlock, CanvasData, BlockKind, ContextMenuPosition,
  createEmptyBlock, parseCanvasContent, serializeCanvasContent,
  InlineCheckpointData,
} from './types';
import DraggableBlock from './DraggableBlock';
import CanvasContextMenu from './CanvasContextMenu';

export interface CanvasEditorRef {
  addBlock: (kind: BlockKind) => void;
  scrollToBlock: (id: string) => void;
  getBlocks: () => { id: string; name: string; kind: BlockKind }[];
  deleteBlock: (id: string) => void;
  renameBlock: (id: string, newName: string) => void;
  insertImageIntoBlock: (blockId: string, imageUrl: string, alt?: string) => boolean;
  getSelectedBlockId: () => string | null;
}

interface CanvasEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  lessonLabel?: string;
  annotationMode?: boolean;
  onTextSelect?: (type: "paragraph" | "code" | "conversation", bubbleIndex?: number) => void;
}

const CANVAS_PADDING = 60;
const GRID_SIZE = 20;
const snapToGrid = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

/** Auto-generate a variable-style name for a new block */
const autoName = (kind: BlockKind, blocks: CanvasBlock[]): string => {
  const count = blocks.filter(b => b.kind === kind).length + 1;
  return `${kind}_block_${count}`;
};

const TAKEAWAY_STARTER_CONTENT =
  "TAKEAWAY: [TAKEAWAY:🧠:One-Line Takeaway for Learners]: Enter your takeaway content here...";

const FREEFORM_STARTER_CONTENT = "FREEFORM: [FREEFORM_CANVAS]:{}";

const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ value, onChange, className, lessonLabel, annotationMode, onTextSelect }, ref) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const blockElRefs = useRef<Map<string, HTMLElement>>(new Map());
    const blockEditorRefs = useRef<Map<string, Editor>>(new Map());

    const [canvasData, setCanvasData] = useState<CanvasData>(() => parseCanvasContent(value));
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [hoveredGap, setHoveredGap] = useState<number | null>(null);
    const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);

    // dnd-kit sensors — disabled entirely in annotation mode so pointer events
    // are never intercepted and native scroll works inside nested containers.
    const editSensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
      useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    );
    const sensors = annotationMode ? [] : editSensors;

    // Sync external value changes
    useEffect(() => {
      const parsed = parseCanvasContent(value);
      if (JSON.stringify(parsed) !== JSON.stringify(canvasData)) setCanvasData(parsed);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateAndNotify = useCallback((newData: CanvasData) => {
      setCanvasData(newData);
      onChange(serializeCanvasContent(newData));
    }, [onChange]);

    // ── Block ref registration (for auto-scroll) ──────────────────────────────
    const registerBlockRef = useCallback((id: string, el: HTMLElement | null) => {
      if (el) blockElRefs.current.set(id, el);
      else blockElRefs.current.delete(id);
    }, []);

    const registerBlockEditor = useCallback((id: string, editor: Editor | null) => {
      if (editor) blockEditorRefs.current.set(id, editor);
      else blockEditorRefs.current.delete(id);
    }, []);

    const scrollToBlock = useCallback((id: string) => {
      // Uncollapse the block first so it's visible and full-height
      setCollapsedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      // Double rAF: first frame lets React re-render the expanded block,
      // second frame lets the browser compute the new layout before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = blockElRefs.current.get(id);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }, []);

    // Publish canvas viewport height as CSS variable so ChatStyleEditor
    // can size itself to exactly fit within the canvas without scrolling.
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const publish = () =>
        el.style.setProperty('--canvas-scroll-height', `${el.clientHeight}px`);
      publish();
      const obs = new ResizeObserver(publish);
      obs.observe(el);
      return () => obs.disconnect();
    }, []);


    // ── Block management ──────────────────────────────────────────────────────
    const createBlock = useCallback((kind: BlockKind, existingBlocks: CanvasBlock[]) => {
      const name = autoName(kind, existingBlocks);
      const block = createEmptyBlock(kind, CANVAS_PADDING, snapToGrid(existingBlocks.length * 60), name);
      if (kind === 'checkpoint') {
        const defaultData: InlineCheckpointData = {
          question: '',
          options: [],
          correctOptionId: '',
          explanation: '',
          allowRetry: true,
          showExplanation: true,
        };
        block.data = defaultData;
      } else if (kind === 'takeaway') {
        block.content = TAKEAWAY_STARTER_CONTENT;
      } else if (kind === 'freeform') {
        block.content = FREEFORM_STARTER_CONTENT;
      }
      return block;
    }, []);

    const addBlockInternal = useCallback((kind: BlockKind, atIndex?: number) => {
      const newBlock = createBlock(kind, canvasData.blocks);
      let newBlocks: CanvasBlock[];
      if (atIndex !== undefined) {
        newBlocks = [
          ...canvasData.blocks.slice(0, atIndex + 1),
          newBlock,
          ...canvasData.blocks.slice(atIndex + 1),
        ];
      } else {
        newBlocks = [...canvasData.blocks, newBlock];
      }
      const newData = { ...canvasData, blocks: newBlocks };
      updateAndNotify(newData);
      setSelectedBlockId(newBlock.id);
      // Collapse all existing blocks when a new one is added
      setCollapsedIds(new Set(canvasData.blocks.map(b => b.id)));
      scrollToBlock(newBlock.id);
      return newBlock;
    }, [canvasData, createBlock, updateAndNotify, scrollToBlock]);

    // Exposed via ref – appends to end
    const addBlock = useCallback((kind: BlockKind) => addBlockInternal(kind),
      [addBlockInternal]);

    const handleUpdateBlock = useCallback((id: string, updates: Partial<CanvasBlock>) => {
      updateAndNotify({
        ...canvasData,
        blocks: canvasData.blocks.map(b => b.id === id ? { ...b, ...updates } : b),
      });
    }, [canvasData, updateAndNotify]);

    const handleDuplicateBlock = useCallback((id: string) => {
      const block = canvasData.blocks.find(b => b.id === id);
      if (!block) return;
      const idx = canvasData.blocks.indexOf(block);
      const newBlock: CanvasBlock = {
        ...block,
        id: crypto.randomUUID(),
        name: block.name ? `${block.name}_copy` : '',
      };
      const newBlocks = [
        ...canvasData.blocks.slice(0, idx + 1),
        newBlock,
        ...canvasData.blocks.slice(idx + 1),
      ];
      updateAndNotify({ ...canvasData, blocks: newBlocks });
      setSelectedBlockId(newBlock.id);
      scrollToBlock(newBlock.id);
    }, [canvasData, updateAndNotify, scrollToBlock]);

    const handleDeleteBlock = useCallback((id: string) => {
      updateAndNotify({ ...canvasData, blocks: canvasData.blocks.filter(b => b.id !== id) });
      if (selectedBlockId === id) setSelectedBlockId(null);
    }, [canvasData, selectedBlockId, updateAndNotify]);

    const handleRenameBlock = useCallback((id: string, newName: string) => {
      handleUpdateBlock(id, { name: newName });
    }, [handleUpdateBlock]);

    const insertImageIntoBlock = useCallback((blockId: string, imageUrl: string, alt?: string): boolean => {
      const editor = blockEditorRefs.current.get(blockId);
      if (!editor) return false;
      // Insert image at the end of the document
      editor.chain().focus('end').setImage({ src: imageUrl, alt: alt || '' }).run();
      return true;
    }, []);

    useImperativeHandle(ref, () => ({
      addBlock,
      scrollToBlock,
      getBlocks: () => canvasData.blocks.map(b => ({ id: b.id, name: b.name, kind: b.kind })),
      deleteBlock: handleDeleteBlock,
      renameBlock: handleRenameBlock,
      insertImageIntoBlock,
      getSelectedBlockId: () => selectedBlockId,
    }), [addBlock, scrollToBlock, canvasData.blocks, handleDeleteBlock, handleRenameBlock, insertImageIntoBlock, selectedBlockId]);

    // ── Sortable drag (reorder blocks) ────────────────────────────────────────
    const handleDragStart = useCallback((event: DragStartEvent) => {
      setActiveDragId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragId(null);
      if (!over || active.id === over.id) return;
      const oldIdx = canvasData.blocks.findIndex(b => b.id === active.id);
      const newIdx = canvasData.blocks.findIndex(b => b.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      updateAndNotify({ ...canvasData, blocks: arrayMove(canvasData.blocks, oldIdx, newIdx) });
    }, [canvasData, updateAndNotify]);

    // ── Double-click / double-tap → context menu ──────────────────────────────
    // Clamp position so the popup stays inside the canvas container (not off-screen)
    const clampMenuPosition = (clientX: number, clientY: number) => {
      const MENU_W = 196; // min-w-[180px] + 16px padding safety
      const MENU_H = 260; // 6 items × ~36px + header ~28px
      const container = scrollContainerRef.current;
      if (!container) return { x: clientX, y: clientY };
      const rect = container.getBoundingClientRect();
      const x = Math.min(Math.max(clientX, rect.left + 8), rect.right - MENU_W - 8);
      const y = Math.min(Math.max(clientY, rect.top + 8), rect.bottom - MENU_H - 8);
      return { x, y };
    };

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
      if (annotationMode) return;
      if ((e.target as HTMLElement).closest('.canvas-block')) return;
      const { x, y } = clampMenuPosition(e.clientX, e.clientY);
      setContextMenu({ x, y, canvasX: 0, canvasY: 0 });
    }, [annotationMode]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      if ((e.target as HTMLElement).closest('.canvas-block')) return;
      const touch = e.changedTouches[0];
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && now - last.time < 300 &&
          Math.abs(touch.clientX - last.x) < 30 &&
          Math.abs(touch.clientY - last.y) < 30) {
        const { x, y } = clampMenuPosition(touch.clientX, touch.clientY);
        setContextMenu({ x, y, canvasX: 0, canvasY: 0 });
        lastTapRef.current = null;
        return;
      }
      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    }, []);

    const handleAddFromContextMenu = useCallback((kind: BlockKind) => {
      addBlockInternal(kind);
      setContextMenu(null);
    }, [addBlockInternal]);

    // ── HTML5 drop from Assets sidebar ────────────────────────────────────────
    const handleDragOver = useCallback((e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('block-kind')) return;
      e.preventDefault();
      setIsDragOver(true);

      // Determine which gap index to insert at based on cursor Y position
      const blocks = canvasData.blocks;
      if (blocks.length === 0) { setDragOverIndex(null); return; }

      let insertIdx = blocks.length - 1; // default: after last block
      for (let i = 0; i < blocks.length; i++) {
        const el = blockElRefs.current.get(blocks[i].id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          insertIdx = i - 1; // before this block = after (i-1)
          break;
        }
      }
      setDragOverIndex(insertIdx);
    }, [canvasData.blocks]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      if (!scrollContainerRef.current?.contains(e.relatedTarget as Node)) {
        setIsDragOver(false);
        setDragOverIndex(null);
      }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (annotationMode) return;
      const kind = e.dataTransfer.getData('block-kind') as BlockKind;
      if (!kind) return;
      addBlockInternal(kind, dragOverIndex ?? undefined);
      setDragOverIndex(null);
    }, [annotationMode, addBlockInternal, dragOverIndex]);

    // ── Active drag block (for overlay) ──────────────────────────────────────
    const activeDragBlock = activeDragId
      ? canvasData.blocks.find(b => b.id === activeDragId)
      : null;

    return (
      <div className={cn('relative flex flex-col', className)}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Scrollable canvas */}
          <div
            ref={scrollContainerRef}
            className={cn(
              'relative overflow-y-auto overflow-x-hidden rounded-xl border transition-colors',
              'flex-1 min-h-[300px]',
              isDragOver ? 'border-primary/40 bg-primary/[0.03]' : 'border-border/60 bg-slate-50/60 dark:bg-muted/10',
            )}
            onDoubleClick={handleDoubleClick}
            onTouchEnd={handleTouchEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Dot-grid background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.45]"
              style={{
                backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.4) 1px, transparent 1px)`,
                backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              }}
            />

            {/* Sortable block list */}
            <div className="relative flex flex-col gap-3 p-10">
              <SortableContext
                items={canvasData.blocks.map(b => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {canvasData.blocks.map((block, index) => (
                  <div key={block.id}>
                    {/* Insert zone above each block — hidden in annotation mode */}
                    {!annotationMode && (
                      <div
                        className="relative h-4 -my-0.5 group/gap flex items-center justify-center"
                        onMouseEnter={() => setHoveredGap(index - 1)}
                        onMouseLeave={() => setHoveredGap(null)}
                      >
                        {dragOverIndex === index - 1 && (
                          <div className="absolute inset-x-0 flex items-center gap-2 pointer-events-none">
                            <div className="flex-1 h-0.5 bg-primary rounded-full" />
                            <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">Drop here</span>
                            <div className="flex-1 h-0.5 bg-primary rounded-full" />
                          </div>
                        )}
                        {hoveredGap === index - 1 && dragOverIndex === null && (
                          <div className="absolute z-10 flex items-center gap-1 animate-fade-in">
                            <div className="h-px flex-1 w-8 bg-primary/40" />
                            <button
                              onClick={() => addBlockInternal('text', index - 1)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-primary/40 text-xs text-primary hover:bg-primary/10 transition-colors shadow-sm"
                            >
                              <FileText className="h-3 w-3" />
                              Text
                            </button>
                            <button
                              onClick={() => addBlockInternal('chat', index - 1)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-primary/40 text-xs text-primary hover:bg-primary/10 transition-colors shadow-sm"
                            >
                              <MessageSquare className="h-3 w-3" />
                              Chat
                            </button>
                            <div className="h-px flex-1 w-8 bg-primary/40" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="canvas-block">
                      <DraggableBlock
                        block={block}
                        onUpdate={handleUpdateBlock}
                        onDuplicate={handleDuplicateBlock}
                        onDelete={handleDeleteBlock}
                        isSelected={selectedBlockId === block.id}
                        onSelect={setSelectedBlockId}
                        onRegisterRef={registerBlockRef}
                        onRegisterEditor={registerBlockEditor}
                        lessonLabel={lessonLabel}
                        isCollapsed={collapsedIds.has(block.id)}
                        onToggleCollapse={(id) =>
                          setCollapsedIds(prev => {
                            const next = new Set(prev);
                            next.has(id) ? next.delete(id) : next.add(id);
                            return next;
                          })
                        }
                        annotationMode={annotationMode}
                        onTextSelect={onTextSelect}
                      />
                    </div>
                  </div>
                ))}
                {/* Insert zone after the last block — hidden in annotation mode */}
                {canvasData.blocks.length > 0 && !annotationMode && (
                  <div
                    className="relative h-4 -my-0.5 flex items-center justify-center"
                    onMouseEnter={() => setHoveredGap(canvasData.blocks.length - 1)}
                    onMouseLeave={() => setHoveredGap(null)}
                  >
                    {dragOverIndex === canvasData.blocks.length - 1 && (
                      <div className="absolute inset-x-0 flex items-center gap-2 pointer-events-none">
                        <div className="flex-1 h-0.5 bg-primary rounded-full" />
                        <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded">Drop here</span>
                        <div className="flex-1 h-0.5 bg-primary rounded-full" />
                      </div>
                    )}
                    {hoveredGap === canvasData.blocks.length - 1 && dragOverIndex === null && (
                      <div className="absolute z-10 flex items-center gap-1 animate-fade-in">
                        <div className="h-px w-8 bg-primary/40" />
                        <button
                          onClick={() => addBlockInternal('text', canvasData.blocks.length - 1)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-primary/40 text-xs text-primary hover:bg-primary/10 transition-colors shadow-sm"
                        >
                          <FileText className="h-3 w-3" />
                          Text
                        </button>
                        <button
                          onClick={() => addBlockInternal('chat', canvasData.blocks.length - 1)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-background border border-primary/40 text-xs text-primary hover:bg-primary/10 transition-colors shadow-sm"
                        >
                          <MessageSquare className="h-3 w-3" />
                          Chat
                        </button>
                        <div className="h-px w-8 bg-primary/40" />
                      </div>
                    )}
                  </div>
                )}
              </SortableContext>

            </div>

            {/* Empty state — positioned relative to the scroll container so it truly centers */}
            {canvasData.blocks.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none select-none">
                <Plus className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Double-click to add a block</p>
                <p className="text-xs opacity-60 mt-1">or drag a block from the Assets panel →</p>
              </div>
            )}
          </div>

          {/* Drag overlay – ghost of the block being sorted */}
          <DragOverlay>
            {activeDragBlock && (() => {
              const overlayConfig: Record<string, { Icon: typeof FileText }> = {
                text: { Icon: FileText },
                chat: { Icon: MessageSquare },
                checkpoint: { Icon: CheckCircle2 },
                takeaway: { Icon: Lightbulb },
                freeform: { Icon: PenTool },
              };
              const c = overlayConfig[activeDragBlock.kind];
              return (
                <div className="rounded-xl border border-l-[3px] border-primary/50 border-l-primary/70 bg-white dark:bg-card px-4 py-3 opacity-95 flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 bg-primary/10">
                    <c.Icon className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-[11.5px] font-mono font-semibold text-foreground/80 tracking-tight">
                    {activeDragBlock.name || `${activeDragBlock.kind}_block`}
                  </span>
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>

        {/* Context menu (double-click) */}
        {contextMenu && (
          <CanvasContextMenu
            position={contextMenu}
            onAddBlock={handleAddFromContextMenu}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    );
  }
);

CanvasEditor.displayName = 'CanvasEditor';

export default CanvasEditor;
