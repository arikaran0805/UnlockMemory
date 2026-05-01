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
import { useTheme } from 'next-themes';
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
// Minimal: vertical accent line + "One-Line Takeaway" label + body text only.
const TakeawayBlockCard = ({ content }: { content: string }) => {
  const data = parseTakeawayContent(content);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (!data.body && !data.title) return null;

  return (
    <div style={{ display: 'flex', gap: 12, margin: '4px 0' }}>
      {/* Vertical accent line */}
      <div style={{
        width: 3,
        borderRadius: 999,
        background: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.18)',
        flexShrink: 0,
        alignSelf: 'stretch',
        minHeight: 20,
      }} />

      {/* Label + content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(255, 255, 255, 0.30)' : 'rgba(0, 0, 0, 0.38)',
        }}>
          One-Line Takeaway
        </span>
        <p style={{
          fontFamily: 'Georgia, "Times New Roman", Times, serif',
          fontSize: 18,
          lineHeight: 1.8,
          letterSpacing: '0.2px',
          color: isDark ? '#c8e2d2' : '#242424',
          whiteSpace: 'pre-wrap',
          margin: 0,
        }}>
          {data.body || data.title}
        </p>
      </div>
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
}

const CanvasRenderer = ({ content, className, courseType, codeTheme }: CanvasRendererProps) => {
  const blocks = useMemo(() => {
    if (!isCanvasContent(content)) return [];
    return parseCanvasContent(content).blocks;
  }, [content]);

  // Only CHAT blocks show the conversation header (not takeaway/freeform)
  const firstChatBlockId = useMemo(
    () => blocks.find((block) => block.kind === 'chat')?.id ?? null,
    [blocks]
  );

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn('canvas-renderer-root space-y-6', className)}>
      {blocks.map((block) => (
        <div
          key={block.id}
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

          {/* ── chat (the only block type that goes through ChatConversationView) ── */}
          {block.kind === 'chat' && (
            <ChatConversationView
              content={block.content}
              courseType={courseType}
              codeTheme={codeTheme}
              showHeader={block.id === firstChatBlockId}
              allowSingleSpeaker
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
      ))}
    </div>
  );
};

export default CanvasRenderer;
