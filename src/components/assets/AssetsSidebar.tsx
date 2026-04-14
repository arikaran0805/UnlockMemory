import { useState, useRef, useCallback } from 'react';
import {
  Layers, Upload, Check, Image as ImageIcon,
  FileText, MessageCircle, CheckCircle2, GripVertical, Maximize2, Minimize2, Trash2, Pencil,
  Loader2, AlertCircle, Lightbulb, PenTool,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { MediaItem } from '@/hooks/useMediaLibrary';

export interface AssetItem {
  type: 'image' | 'icon' | 'svg' | 'block';
  url: string;
  name: string;
  blockKind?: 'text' | 'chat' | 'checkpoint' | 'takeaway' | 'freeform' | 'media';
  author?: string;
  authorUrl?: string;
  source?: string;
}

interface CanvasBlockEntry {
  id: string;
  name: string;
  kind: 'text' | 'chat' | 'checkpoint' | 'takeaway' | 'freeform' | 'media';
}

interface MediaLibraryState {
  mediaItems: MediaItem[];
  isLoading: boolean;
  isUploading: boolean;
  uploadError: string | null;
  uploadMedia: (file: File) => Promise<MediaItem | null>;
  deleteMedia: (item: MediaItem) => Promise<boolean>;
}

interface AssetsSidebarProps {
  isOpen: boolean;
  editorType?: 'rich' | 'chat' | 'canvas';
  onInsert?: (asset: AssetItem) => void;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
  canvasBlocks?: CanvasBlockEntry[];
  onScrollToBlock?: (id: string) => void;
  onDeleteBlock?: (id: string) => void;
  onRenameBlock?: (id: string, newName: string) => void;
  mediaLibrary?: MediaLibraryState;
}

export function AssetsSidebar({
  isOpen, editorType = 'rich', onInsert, isExpanded, onExpandToggle,
  canvasBlocks = [], onScrollToBlock, onDeleteBlock, onRenameBlock,
  mediaLibrary,
}: AssetsSidebarProps) {
  const isCanvas = editorType === 'canvas';
  const [activeTab, setActiveTab] = useState<'blocks' | 'canvas' | 'media'>(
    isCanvas ? 'blocks' : 'media'
  );

  const [insertedId, setInsertedId] = useState<string | null>(null);

  // Inline rename state
  const [renamingBlockId, setRenamingBlockId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flashInserted = useCallback((id: string) => {
    setInsertedId(id);
    setTimeout(() => setInsertedId(null), 1400);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (mediaLibrary) {
      const result = await mediaLibrary.uploadMedia(file);
      if (result) {
        onInsert?.({ type: 'image', url: result.fileUrl, name: result.fileName });
        flashInserted(result.id);
      }
    } else {
      const url = URL.createObjectURL(file);
      onInsert?.({ type: 'image', url, name: file.name });
    }
  }, [onInsert, flashInserted, mediaLibrary]);

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    if (mediaLibrary) {
      const result = await mediaLibrary.uploadMedia(file);
      if (result) {
        onInsert?.({ type: 'image', url: result.fileUrl, name: result.fileName });
        flashInserted(result.id);
      }
    } else {
      const url = URL.createObjectURL(file);
      onInsert?.({ type: 'image', url, name: file.name });
    }
  }, [onInsert, flashInserted, mediaLibrary]);

  const handleLibraryItemClick = useCallback((item: MediaItem) => {
    onInsert?.({ type: 'image', url: item.fileUrl, name: item.fileName });
    flashInserted(item.id);
  }, [onInsert, flashInserted]);

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 rounded-l-none border border-l-0 bg-card text-card-foreground shadow-sm overflow-hidden',
        isOpen ? 'w-72' : 'w-0 border-0',
      )}
    >
      {isOpen && (
        <>
          {/* Header */}
          <div className="px-4 py-3 border-b flex-shrink-0">
            <div className="flex items-center">
              <h3 className="font-semibold text-sm whitespace-nowrap">Assets</h3>
              {editorType && (
                <span className="ml-auto text-[10px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
                  {editorType}
                </span>
              )}
            </div>
          </div>

          {/* Expand CTA for blocks/canvas tabs */}
          {isCanvas && (activeTab === 'blocks' || activeTab === 'canvas') ? (
            <div className="p-3 flex-shrink-0">
              <button
                onClick={onExpandToggle}
                className={cn(
                  'w-full flex items-center justify-center gap-2 h-8 rounded-md border text-xs font-medium transition-colors',
                  isExpanded
                    ? 'border-primary/40 bg-primary/5 text-primary hover:bg-primary/10'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    Exit Focus Mode
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expand Canvas
                  </>
                )}
              </button>
            </div>
          ) : null}

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as typeof activeTab)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="border-b flex-shrink-0 px-3 pt-1.5">
              {isCanvas ? (
                <TabsList className="h-8 w-full grid grid-cols-2">
                  <TabsTrigger value="blocks" className="text-xs gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Blocks
                  </TabsTrigger>
                  <TabsTrigger value="canvas" className="text-xs gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Canvas
                  </TabsTrigger>
                </TabsList>
              ) : (
                <TabsList className="h-8 w-full grid grid-cols-1">
                  <TabsTrigger value="media" className="text-xs gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" />
                    Media
                  </TabsTrigger>
                </TabsList>
              )}
            </div>

            {/* ── Media Tab ── */}
            {activeTab === 'media' && (
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-3 space-y-3">
                  {/* ─── Section 1: Upload Zone ─── */}
                  <div
                    className={cn(
                      'border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all space-y-1',
                      mediaLibrary?.isUploading
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5',
                    )}
                    onClick={() => !mediaLibrary?.isUploading && fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                    onDragLeave={e => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                    onDrop={e => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); handleFileDrop(e); }}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload image"
                    onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                  >
                    {mediaLibrary?.isUploading ? (
                      <>
                        <Loader2 className="h-5 w-5 mx-auto text-primary animate-spin" />
                        <p className="text-xs font-medium text-primary">Uploading…</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mx-auto text-muted-foreground/50" />
                        <p className="text-xs font-medium">Drag & drop or click to upload</p>
                        <p className="text-[10px] text-muted-foreground">JPG, PNG, GIF, WebP, SVG · Max 10MB</p>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.svg"
                    className="hidden"
                    onChange={handleFileUpload}
                    aria-label="Choose image file"
                  />

                  {/* Upload error */}
                  {mediaLibrary?.uploadError && (
                    <div className="flex items-start gap-1.5 text-destructive text-[11px] bg-destructive/10 rounded-md px-2.5 py-2">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>{mediaLibrary.uploadError}</span>
                    </div>
                  )}

                  {/* ─── Section 2: Media Library ─── */}
                  <div>
                    <div className="flex items-center gap-2 pb-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Library
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>

                    {mediaLibrary?.isLoading ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="aspect-square rounded-md bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : !mediaLibrary || mediaLibrary.mediaItems.length === 0 ? (
                      <div className="text-center py-5 text-muted-foreground">
                        <ImageIcon className="h-6 w-6 mx-auto mb-1.5 opacity-30" />
                        <p className="text-[11px]">No images yet</p>
                        <p className="text-[10px] opacity-60 mt-0.5">Upload images to build your library</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {mediaLibrary.mediaItems.map(item => (
                          <div key={item.id} className="space-y-0.5">
                            <div
                              className={cn(
                                'group relative aspect-square rounded-md overflow-hidden cursor-pointer transition-all ring-1 focus-within:ring-2 focus-within:ring-primary',
                                insertedId === item.id
                                  ? 'ring-primary ring-2'
                                  : item.isNew
                                  ? 'ring-primary/40'
                                  : 'ring-border hover:ring-primary/60',
                              )}
                              style={{
                                backgroundImage: 'linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)',
                                backgroundSize: '12px 12px',
                                backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
                              }}
                            >
                              <img
                                src={item.fileUrl}
                                alt={item.fileName}
                                className="w-full h-full object-cover relative"
                                loading="lazy"
                              />
                              {/* Hover overlay with Insert + Delete */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleLibraryItemClick(item); }}
                                  className="text-white text-[9px] font-semibold bg-white/20 rounded px-2 py-0.5 hover:bg-white/30 transition-colors"
                                  aria-label={`Insert ${item.fileName}`}
                                >
                                  {insertedId === item.id ? (
                                    <Check className="h-3 w-3 inline" />
                                  ) : 'Insert'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    mediaLibrary.deleteMedia(item);
                                  }}
                                  className="text-red-300 text-[9px] font-medium bg-red-500/20 rounded px-2 py-0.5 hover:bg-red-500/40 transition-colors"
                                  aria-label={`Delete ${item.fileName}`}
                                >
                                  <Trash2 className="h-2.5 w-2.5 inline" />
                                </button>
                              </div>
                              {/* New badge */}
                              {item.isNew && insertedId !== item.id && (
                                <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </div>
                            {/* Filename */}
                            <p className="text-[9px] text-muted-foreground truncate px-0.5" title={item.fileName}>
                              {item.fileName}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>


                </div>
              </ScrollArea>
            )}

            {/* ── Blocks Tab (canvas only) — pinned top + scrollable list ── */}
            {activeTab === 'blocks' && (
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Pinned: block templates + hint */}
                <div className="p-3 space-y-2 flex-shrink-0">
                  <p className="text-[11px] text-muted-foreground pb-1">
                    Click to add · Drag onto canvas to place
                  </p>

                  {/* Chat Block */}
                  <div
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/40 cursor-grab hover:border-primary/30 hover:bg-muted/70 transition-colors select-none"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('block-kind', 'chat');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() =>
                      onInsert?.({ type: 'block', url: '', name: 'Chat Block', blockKind: 'chat' })
                    }
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Chat Block</p>
                      <p className="text-[11px] text-muted-foreground">Conversation-style content</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                  </div>

                  {/* Text Block */}
                  <div
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/40 cursor-grab hover:border-primary/30 hover:bg-muted/70 transition-colors select-none"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('block-kind', 'text');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() =>
                      onInsert?.({ type: 'block', url: '', name: 'Text Block', blockKind: 'text' })
                    }
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Text Block</p>
                      <p className="text-[11px] text-muted-foreground">Rich-text content</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                  </div>

                  {/* Checkpoint Block */}
                  <div
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/40 cursor-grab hover:border-primary/30 hover:bg-muted/70 transition-colors select-none"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('block-kind', 'checkpoint');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() =>
                      onInsert?.({ type: 'block', url: '', name: 'Checkpoint Block', blockKind: 'checkpoint' })
                    }
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Checkpoint Block</p>
                      <p className="text-[11px] text-muted-foreground">Knowledge-check content</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                  </div>

                  {/* Takeaway Block */}
                  <div
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/40 cursor-grab hover:border-primary/30 hover:bg-muted/70 transition-colors select-none"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('block-kind', 'takeaway');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() =>
                      onInsert?.({ type: 'block', url: '', name: 'Takeaway Block', blockKind: 'takeaway' })
                    }
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Lightbulb className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Takeaway Block</p>
                      <p className="text-[11px] text-muted-foreground">Highlight a key learner insight</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                  </div>

                  {/* Freeform Canvas */}
                  <div
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/40 cursor-grab hover:border-primary/30 hover:bg-muted/70 transition-colors select-none"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('block-kind', 'freeform');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() =>
                      onInsert?.({ type: 'block', url: '', name: 'Freeform Canvas', blockKind: 'freeform' })
                    }
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <PenTool className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Freeform Canvas</p>
                      <p className="text-[11px] text-muted-foreground">Sketchable visual canvas</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                  </div>

                  {/* Media Block */}
                  <div
                    className="group flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/40 cursor-grab hover:border-primary/30 hover:bg-muted/70 transition-colors select-none"
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('block-kind', 'media');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() =>
                      onInsert?.({ type: 'block', url: '', name: 'Media Block', blockKind: 'media' })
                    }
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Media Block</p>
                      <p className="text-[11px] text-muted-foreground">Images via upload or URL</p>
                    </div>
                    <GripVertical className="h-4 w-4 text-primary/30 group-hover:text-primary/60 transition-colors flex-shrink-0" />
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-[11px] text-muted-foreground/70">
                      You can also double-click anywhere on the canvas to add a block inline.
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* ── Canvas Tab — On canvas block list ── */}
            {activeTab === 'canvas' && (
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-3">
                  {canvasBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                        <Layers className="h-5 w-5 text-muted-foreground/40" />
                      </div>
                      <p className="text-[11px] font-medium text-foreground/60">No blocks yet</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Add blocks from the Blocks tab
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {canvasBlocks.map((b) => (
                        <div
                          key={b.id}
                          className="group flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-muted transition-colors"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded bg-muted flex items-center justify-center">
                            {b.kind === 'chat' ? (
                              <MessageCircle className="h-3.5 w-3.5 text-primary" />
                            ) : b.kind === 'checkpoint' ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            ) : b.kind === 'takeaway' ? (
                              <Lightbulb className="h-3.5 w-3.5 text-primary" />
                            ) : b.kind === 'freeform' ? (
                              <PenTool className="h-3.5 w-3.5 text-primary" />
                            ) : b.kind === 'media' ? (
                              <ImageIcon className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          {renamingBlockId === b.id ? (
                            <input
                              ref={renameInputRef}
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => {
                                const trimmed = renameValue.trim();
                                if (trimmed && trimmed !== b.name) {
                                  onRenameBlock?.(b.id, trimmed);
                                }
                                setRenamingBlockId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setRenamingBlockId(null);
                                }
                              }}
                              className="flex-1 min-w-0 text-xs bg-background border border-primary/40 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => onScrollToBlock?.(b.id)}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setRenamingBlockId(b.id);
                                setRenameValue(
                                  b.name || (
                                    b.kind === 'chat' ? 'Chat Block'
                                    : b.kind === 'checkpoint' ? 'Checkpoint Block'
                                    : b.kind === 'takeaway' ? 'Takeaway Block'
                                    : b.kind === 'freeform' ? 'Freeform Canvas'
                                    : b.kind === 'media' ? 'Media Block'
                                    : 'Text Block'
                                  )
                                );
                                setTimeout(() => renameInputRef.current?.select(), 0);
                              }}
                              className="flex-1 min-w-0 text-left"
                              title="Click to scroll · Double-click to rename"
                            >
                              <span className="text-xs truncate text-foreground block">
                                {b.name || (
                                  b.kind === 'chat' ? 'Chat Block'
                                  : b.kind === 'checkpoint' ? 'Checkpoint Block'
                                  : b.kind === 'takeaway' ? 'Takeaway Block'
                                  : b.kind === 'freeform' ? 'Freeform Canvas'
                                  : b.kind === 'media' ? 'Media Block'
                                  : 'Text Block'
                                )}
                              </span>
                            </button>
                          )}
                          {renamingBlockId !== b.id && (
                            <div className="flex flex-shrink-0 items-center gap-1 rounded-xl border border-primary/10 bg-muted/80 px-1 py-0.5 shadow-sm opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 group-hover:pointer-events-auto">
                              <button
                                onClick={() => {
                                  setRenamingBlockId(b.id);
                                  setRenameValue(
                                    b.name || (
                                      b.kind === 'chat' ? 'Chat Block'
                                      : b.kind === 'checkpoint' ? 'Checkpoint Block'
                                      : b.kind === 'takeaway' ? 'Takeaway Block'
                                      : b.kind === 'freeform' ? 'Freeform Canvas'
                                      : b.kind === 'media' ? 'Media Block'
                                      : 'Text Block'
                                    )
                                  );
                                  setTimeout(() => renameInputRef.current?.select(), 0);
                                }}
                                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-background/70"
                                title="Rename block"
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                onClick={() => onDeleteBlock?.(b.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-destructive/12"
                                title="Delete block"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}

export default AssetsSidebar;
