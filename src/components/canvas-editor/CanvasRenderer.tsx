/**
 * CanvasRenderer - Read-only renderer for canvas content
 *
 * Renders blocks in their stored array order (which reflects the user's
 * visual ordering from the editor, including any drag-to-reorder changes).
 *
 * Block routing:
 *   text       → RichTextRenderer
 *   checkpoint → InlineCheckpointRenderer
 *   chat       → ChatConversationView          (the ONLY block that goes here)
 *   takeaway   → TakeawayBlockCard             (parses JSON { title, icon, body })
 *   freeform   → FreeformCanvasViewer          (parses FreeformCanvasData JSON)
 *   media      → MediaBlock                    (renders URL as <img> / <video>)
 */

import { useMemo, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import {
  parseCanvasContent,
  isCanvasContent,
} from './types';
import { RichTextRenderer } from '@/components/tiptap';
import { ChatConversationView } from '@/components/chat-editor';
import { InlineCheckpointRenderer } from './checkpoint';
import { parseTakeawayContent } from './TakeawayCanvasEditor';
import { Loader2 } from 'lucide-react';
import InContentAd from '@/components/ads/InContentAd';

// ─── Lazy-load fabric.js-backed viewer ───────────────────────────────────────
const FreeformCanvasViewer = lazy(() =>
  import('@/components/chat-editor/freeform/FreeformCanvasViewer').then(m => ({
    default: m.FreeformCanvasViewer,
  }))
);

// ─── Shared loading fallback ──────────────────────────────────────────────────
const CanvasLoadingFallback = ({ className }: { className?: string }) => (
  <div
    className={cn(
      'flex items-center justify-center rounded-xl border border-border bg-muted/30 min-h-[200px]',
      className
    )}
  >
    <div className="text-center text-muted-foreground">
      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin opacity-40" />
      <p className="text-xs">Loading…</p>
    </div>
  </div>
);

// ─── TakeawayBlockCard ────────────────────────────────────────────────────────
// Styled to match InlineCheckpointRenderer: green left border, muted bg, green label.
const TakeawayBlockCard = ({ content }: { content: string }) => {
  const data = parseTakeawayContent(content);
  if (!data.body && !data.title) return null;

  return (
    <div className="border-l-[3px] border-primary bg-muted/[0.35] pl-5 pr-4 py-4 my-1">
      <p className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-primary mb-2 select-none">
        {data.title || 'One-Line Takeaway'}
      </p>
      <p className="text-[14.5px] font-medium text-foreground/90 leading-relaxed whitespace-pre-wrap">
        {data.body || data.title}
      </p>
    </div>
  );
};

// ─── FreeformBlock ────────────────────────────────────────────────────────────
// Renders a standalone `freeform` canvas block.
// block.content is JSON { canvasJson, width, height, version }.
const FreeformBlock = ({ content }: { content: string }) => {
  const data = useMemo(() => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && 'canvasJson' in parsed) {
        return parsed;
      }
    } catch { /* not JSON */ }
    return null;
  }, [content]);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[120px] rounded-xl border border-dashed border-border bg-muted/20">
        <p className="text-sm text-muted-foreground/50">Visual unavailable</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<CanvasLoadingFallback />}>
      <FreeformCanvasViewer
        data={data}
        className="min-h-[200px] max-h-[600px] rounded-xl"
      />
    </Suspense>
  );
};

// ─── MediaBlock ───────────────────────────────────────────────────────────────
// Renders a standalone `media` canvas block.
// block.content is a URL (image or video).
const MediaBlock = ({ content }: { content: string }) => {
  if (!content?.trim()) return null;

  const isVideo = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(content);

  if (isVideo) {
    return (
      <div className="rounded-xl overflow-hidden border border-border/60 bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video src={content} controls className="w-full max-h-[480px]" />
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border/60 bg-muted/20">
      <img
        src={content}
        alt="Lesson media"
        className="w-full h-auto max-h-[480px] object-contain"
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = 'none';
        }}
      />
    </div>
  );
};

// ─── Main renderer ────────────────────────────────────────────────────────────

interface CanvasRendererProps {
  content: string;
  className?: string;
  courseType?: string;
  codeTheme?: string;
  /** When true, one InContentAd is injected at the midpoint between blocks. */
  showAd?: boolean;
  /** AdSense publisher ID (ca-pub-…). Passed from the page so no extra DB fetch. */
  googleAdClient?: string;
  /** AdSense in-content slot ID. Passed from the page so no extra DB fetch. */
  inContentSlot?: string;
}

const CanvasRenderer = ({
  content,
  className,
  courseType,
  codeTheme,
  showAd = false,
  googleAdClient,
  inContentSlot,
}: CanvasRendererProps) => {
  const blocks = useMemo(() => {
    if (!isCanvasContent(content)) return [];
    return parseCanvasContent(content).blocks;
  }, [content]);

  // Only CHAT blocks show the conversation header (not takeaway/freeform)
  const firstChatBlockId = useMemo(
    () => blocks.find((block) => block.kind === 'chat')?.id ?? null,
    [blocks]
  );

  // Index of the block AFTER which the ad is injected.
  // Formula: floor((n - 1) / 2) places the ad at the true midpoint:
  //   1 block  → after index 0 (below the only block)
  //   2 blocks → after index 0 (between blocks)
  //   3 blocks → after index 1 (between blocks 1 and 2)
  //   4 blocks → after index 1
  //   5 blocks → after index 2
  const adAfterIndex = useMemo(
    () => (blocks.length > 0 ? Math.floor((blocks.length - 1) / 2) : -1),
    [blocks.length]
  );

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn('canvas-renderer-root space-y-6', className)}>
      {blocks.map((block, index) => (
        <div key={block.id}>
          <div
            className={cn(
              'canvas-rendered-block',
              block.kind === 'text'
                ? 'canvas-rendered-block-text'
                : block.kind === 'checkpoint'
                  ? 'canvas-rendered-block-checkpoint py-4'
                  : block.kind === 'chat'
                    ? 'canvas-rendered-block-chat'
                    : ''
            )}
          >
            {/* ── text ── */}
            {block.kind === 'text' && (
              <RichTextRenderer content={block.content} />
            )}

            {/* ── checkpoint ── */}
            {block.kind === 'checkpoint' && block.data && (
              <InlineCheckpointRenderer data={block.data} blockId={block.id} />
            )}

            {/* ── chat — disableInternalAd prevents a second in-content ad
                   from ChatConversationView when CanvasRenderer is handling it ── */}
            {block.kind === 'chat' && (
              <ChatConversationView
                content={block.content}
                courseType={courseType}
                codeTheme={codeTheme}
                showHeader={block.id === firstChatBlockId}
                allowSingleSpeaker
                disableInternalAd
              />
            )}

            {/* ── takeaway ── */}
            {block.kind === 'takeaway' && (
              <TakeawayBlockCard content={block.content} />
            )}

            {/* ── freeform canvas ── */}
            {block.kind === 'freeform' && (
              <FreeformBlock content={block.content} />
            )}

            {/* ── media (image / video) ── */}
            {block.kind === 'media' && (
              <MediaBlock content={block.content} />
            )}
          </div>

          {/* ── In-content ad — injected after the midpoint block ── */}
          {showAd && index === adAfterIndex && (
            <InContentAd
              googleAdClient={googleAdClient}
              googleAdSlot={inContentSlot}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CanvasRenderer;
