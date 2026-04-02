import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Layers, Upload, X, ExternalLink, Check, Image as ImageIcon,
  FileText, MessageCircle, GripVertical, Maximize2, Minimize2, Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface AssetItem {
  type: 'image' | 'icon' | 'svg' | 'block';
  url: string;
  name: string;
  blockKind?: 'text' | 'chat';
  author?: string;
  authorUrl?: string;
  source?: string;
}

interface CanvasBlockEntry {
  id: string;
  name: string;
  kind: 'text' | 'chat';
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
}

const ICONIFY_SEARCH = 'https://api.iconify.design/search';
const ICONIFY_SVG_URL = (prefix: string, name: string, color = '%230F2A1D') =>
  `https://api.iconify.design/${prefix}/${name}.svg?color=${color}`;
const ICONIFY_SVG_RAW = (prefix: string, name: string) =>
  `https://api.iconify.design/${prefix}/${name}.svg`;

const UNSPLASH_SEARCH = 'https://api.unsplash.com/search/photos';
const UNSPLASH_KEY_STORAGE = 'assets_sidebar_unsplash_key';

function SkeletonGrid({ cols, count }: { cols: number; count: number }) {
  return (
    <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export function AssetsSidebar({ isOpen, editorType = 'rich', onInsert, isExpanded, onExpandToggle, canvasBlocks = [], onScrollToBlock, onDeleteBlock }: AssetsSidebarProps) {
  const isCanvas = editorType === 'canvas';
  const [activeTab, setActiveTab] = useState<'images' | 'icons' | 'svg' | 'upload' | 'blocks'>(
    isCanvas ? 'blocks' : 'images'
  );
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [iconResults, setIconResults] = useState<string[]>([]);
  const [imageResults, setImageResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unsplashKey, setUnsplashKey] = useState(() => localStorage.getItem(UNSPLASH_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [insertedId, setInsertedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce query
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Reset results when switching tabs
  useEffect(() => {
    setQuery('');
    setIconResults([]);
    setImageResults([]);
  }, [activeTab]);

  // Search icons via Iconify
  useEffect(() => {
    if ((activeTab !== 'icons' && activeTab !== 'svg') || !debouncedQuery.trim()) {
      setIconResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`${ICONIFY_SEARCH}?query=${encodeURIComponent(debouncedQuery)}&limit=48`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        setIconResults(data.icons || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery, activeTab]);

  // Search images via Unsplash
  useEffect(() => {
    if (activeTab !== 'images' || !debouncedQuery.trim() || !unsplashKey) {
      setImageResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`${UNSPLASH_SEARCH}?query=${encodeURIComponent(debouncedQuery)}&per_page=20`, {
      headers: { Authorization: `Client-ID ${unsplashKey}` },
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        setImageResults(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery, activeTab, unsplashKey]);

  const flashInserted = useCallback((id: string) => {
    setInsertedId(id);
    setTimeout(() => setInsertedId(null), 1400);
  }, []);

  const handleIconInsert = useCallback((iconId: string) => {
    const [prefix, name] = iconId.split(':');
    const url = ICONIFY_SVG_RAW(prefix, name);
    onInsert?.({ type: activeTab === 'svg' ? 'svg' : 'icon', url, name: iconId });
    flashInserted(iconId);
  }, [activeTab, onInsert, flashInserted]);

  const handleImageInsert = useCallback((photo: any) => {
    onInsert?.({
      type: 'image',
      url: photo.urls.regular,
      name: photo.alt_description || photo.id,
      author: photo.user?.name,
      authorUrl: photo.user?.links?.html,
      source: 'Unsplash',
    });
    flashInserted(photo.id);
  }, [onInsert, flashInserted]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onInsert?.({ type: 'image', url, name: file.name });
    e.target.value = '';
  }, [onInsert]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      onInsert?.({ type: 'image', url, name: file.name });
    }
  }, [onInsert]);

  const saveUnsplashKey = () => {
    localStorage.setItem(UNSPLASH_KEY_STORAGE, keyInput.trim());
    setUnsplashKey(keyInput.trim());
    setShowKeyConfig(false);
    setKeyInput('');
  };

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 rounded-l-none border border-l-0 bg-card text-card-foreground shadow-sm overflow-hidden',
        isOpen ? 'w-72' : 'w-0 border-0',
      )}
    >
      {isOpen && (
        <>
          {/* Header with sticky search */}
          <div className="p-4 border-b flex-shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Assets</h3>
              {editorType && (
                <span className="ml-auto text-[10px] text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
                  {editorType}
                </span>
              )}
            </div>
            {/* Search or Expand CTA */}
            {isCanvas && activeTab === 'blocks' ? (
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
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={
                    activeTab === 'images'
                      ? 'Search photos…'
                      : activeTab === 'upload'
                      ? 'No search needed'
                      : 'Search icons…'
                  }
                  disabled={activeTab === 'upload'}
                  className="pl-8 h-8 text-sm"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={v => setActiveTab(v as typeof activeTab)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="border-b flex-shrink-0 px-2 pt-1.5">
              {isCanvas ? (
                <TabsList className="h-7 w-full grid grid-cols-5 text-[11px]">
                  <TabsTrigger value="blocks" className="text-[11px] px-0.5">Blocks</TabsTrigger>
                  <TabsTrigger value="images" className="text-[11px] px-0.5">Images</TabsTrigger>
                  <TabsTrigger value="icons" className="text-[11px] px-0.5">Icons</TabsTrigger>
                  <TabsTrigger value="svg" className="text-[11px] px-0.5">SVG</TabsTrigger>
                  <TabsTrigger value="upload" className="text-[11px] px-0.5">Upload</TabsTrigger>
                </TabsList>
              ) : (
                <TabsList className="h-7 w-full grid grid-cols-4 text-[11px]">
                  <TabsTrigger value="images" className="text-[11px] px-1">Images</TabsTrigger>
                  <TabsTrigger value="icons" className="text-[11px] px-1">Icons</TabsTrigger>
                  <TabsTrigger value="svg" className="text-[11px] px-1">SVG</TabsTrigger>
                  <TabsTrigger value="upload" className="text-[11px] px-1">Upload</TabsTrigger>
                </TabsList>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              {/* ── Images ── */}
              <TabsContent value="images" className="m-0 p-3 space-y-3">
                {!unsplashKey && !showKeyConfig ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-medium">Connect Unsplash</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Add a free API key to search millions of photos
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setShowKeyConfig(true)}
                    >
                      Configure API Key
                    </Button>
                  </div>
                ) : showKeyConfig ? (
                  <div className="space-y-2 py-1">
                    <p className="text-xs text-muted-foreground">Unsplash Access Key:</p>
                    <Input
                      value={keyInput}
                      onChange={e => setKeyInput(e.target.value)}
                      placeholder="Paste your access key…"
                      className="h-8 text-xs"
                      onKeyDown={e => e.key === 'Enter' && keyInput.trim() && saveUnsplashKey()}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs flex-1"
                        onClick={saveUnsplashKey}
                        disabled={!keyInput.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setShowKeyConfig(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <a
                      href="https://unsplash.com/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Get a free API key →
                    </a>
                  </div>
                ) : !query.trim() ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Search for photos above</p>
                    <button
                      className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground mt-4"
                      onClick={() => setShowKeyConfig(true)}
                    >
                      Change API key
                    </button>
                  </div>
                ) : loading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : imageResults.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No photos found</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {imageResults.map(photo => (
                        <div
                          key={photo.id}
                          className="group relative aspect-video rounded overflow-hidden cursor-pointer ring-1 ring-transparent hover:ring-primary transition-all"
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData('text/uri-list', photo.urls.regular);
                            e.dataTransfer.setData('text/plain', photo.urls.regular);
                          }}
                          onClick={() => handleImageInsert(photo)}
                          title={photo.alt_description || photo.user?.name || ''}
                        >
                          <img
                            src={photo.urls.thumb}
                            alt={photo.alt_description || ''}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            {insertedId === photo.id ? (
                              <Check className="h-5 w-5 text-white" />
                            ) : (
                              <span className="text-white text-[10px] font-semibold">Insert</span>
                            )}
                          </div>
                          {photo.user?.name && (
                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[9px] text-white/80 px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                              {photo.user.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      Photos from{' '}
                      <a
                        href="https://unsplash.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Unsplash
                      </a>
                    </p>
                  </>
                )}
              </TabsContent>

              {/* ── Icons ── */}
              <TabsContent value="icons" className="m-0 p-3 space-y-3">
                {!query.trim() ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Search 200,000+ icons</p>
                    <p className="text-[11px] mt-1 opacity-50">Powered by Iconify</p>
                  </div>
                ) : loading ? (
                  <SkeletonGrid cols={6} count={24} />
                ) : iconResults.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No icons found</p>
                ) : (
                  <>
                    <div className="grid grid-cols-6 gap-1.5">
                      {iconResults.map(iconId => {
                        const [prefix, name] = iconId.split(':');
                        return (
                          <button
                            key={iconId}
                            title={iconId}
                            className={cn(
                              'aspect-square rounded border flex items-center justify-center transition-all hover:border-primary hover:bg-primary/5 hover:scale-110',
                              insertedId === iconId
                                ? 'border-primary bg-primary/10'
                                : 'border-muted',
                            )}
                            draggable
                            onDragStart={e => {
                              e.dataTransfer.setData('text/uri-list', ICONIFY_SVG_RAW(prefix, name));
                              e.dataTransfer.setData('text/plain', iconId);
                            }}
                            onClick={() => handleIconInsert(iconId)}
                          >
                            {insertedId === iconId ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <img
                                src={ICONIFY_SVG_URL(prefix, name)}
                                alt={name}
                                className="w-5 h-5"
                                loading="lazy"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      Icons via{' '}
                      <a
                        href="https://iconify.design"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Iconify
                      </a>
                    </p>
                  </>
                )}
              </TabsContent>

              {/* ── SVG ── */}
              <TabsContent value="svg" className="m-0 p-3 space-y-3">
                {!query.trim() ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Search SVG icons</p>
                    <p className="text-[11px] mt-1 opacity-50">Click to insert · Drag to place</p>
                  </div>
                ) : loading ? (
                  <SkeletonGrid cols={4} count={12} />
                ) : iconResults.length === 0 ? (
                  <p className="text-center py-8 text-xs text-muted-foreground">No SVGs found</p>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {iconResults.map(iconId => {
                        const [prefix, name] = iconId.split(':');
                        const rawUrl = ICONIFY_SVG_RAW(prefix, name);
                        return (
                          <button
                            key={iconId}
                            title={`${iconId}\nClick to insert`}
                            className={cn(
                              'aspect-square rounded border flex flex-col items-center justify-center gap-1 p-1 transition-all hover:border-primary hover:bg-primary/5',
                              insertedId === iconId
                                ? 'border-primary bg-primary/10'
                                : 'border-muted',
                            )}
                            draggable
                            onDragStart={e => {
                              e.dataTransfer.setData('text/uri-list', rawUrl);
                              e.dataTransfer.setData('text/plain', iconId);
                            }}
                            onClick={() => handleIconInsert(iconId)}
                          >
                            {insertedId === iconId ? (
                              <Check className="h-5 w-5 text-primary" />
                            ) : (
                              <>
                                <img
                                  src={ICONIFY_SVG_URL(prefix, name)}
                                  alt={name}
                                  className="w-7 h-7"
                                  loading="lazy"
                                />
                                <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-none">
                                  {name}
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      SVGs via{' '}
                      <a
                        href="https://iconify.design"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        Iconify
                      </a>
                    </p>
                  </>
                )}
              </TabsContent>

              {/* ── Upload ── */}
              <TabsContent value="upload" className="m-0 p-3 space-y-3">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors space-y-2"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleFileDrop}
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-medium">Drop an image here</p>
                  <p className="text-[11px] text-muted-foreground">or click to browse files</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs mt-1 pointer-events-none"
                    type="button"
                  >
                    Choose File
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.svg"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <p className="text-[11px] text-muted-foreground text-center">
                  Supports JPG, PNG, GIF, WebP, SVG
                </p>
              </TabsContent>

              {/* ── Blocks (canvas only) ── */}
              <TabsContent value="blocks" className="m-0 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground pb-1">
                  Click to add · Drag onto canvas to place
                </p>

                {/* Text Block */}
                <div
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-grab hover:border-primary hover:bg-primary/5 transition-colors select-none"
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('block-kind', 'text');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() =>
                    onInsert?.({ type: 'block', url: '', name: 'Text Block', blockKind: 'text' })
                  }
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Text Block</p>
                    <p className="text-[11px] text-muted-foreground">Rich-text content</p>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </div>

                {/* Chat Block */}
                <div
                  className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-grab hover:border-primary hover:bg-primary/5 transition-colors select-none"
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('block-kind', 'chat');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() =>
                    onInsert?.({ type: 'block', url: '', name: 'Chat Block', blockKind: 'chat' })
                  }
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">Chat Block</p>
                    <p className="text-[11px] text-muted-foreground">Conversation-style content</p>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                </div>

                <div className="pt-3 border-t">
                  <p className="text-[11px] text-muted-foreground/70">
                    You can also double-click anywhere on the canvas to add a block inline.
                  </p>
                </div>

                {canvasBlocks.length > 0 && (
                  <div className="pt-3 border-t flex flex-col gap-1">
                    <p className="text-[11px] font-medium text-muted-foreground pb-1">On canvas</p>
                    <div className="max-h-[220px] overflow-y-auto space-y-0.5 pr-1">
                      {canvasBlocks.map((b) => (
                        <div
                          key={b.id}
                          className="group flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-muted transition-colors"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded bg-muted flex items-center justify-center">
                            {b.kind === 'chat'
                              ? <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                              : <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            }
                          </div>
                          <button
                            onClick={() => onScrollToBlock?.(b.id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <span className="text-xs truncate text-foreground block">
                              {b.name || (b.kind === 'chat' ? 'Chat Block' : 'Text Block')}
                            </span>
                          </button>
                          <button
                            onClick={() => onDeleteBlock?.(b.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </>
      )}
    </div>
  );
}

export default AssetsSidebar;
