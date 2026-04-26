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

import { useMemo, useState, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import {
  parseCanvasContent,
  isCanvasContent,
} from './types';
import { RichTextRenderer } from '@/components/tiptap';
import { ChatConversationView } from '@/components/chat-editor';
import { InlineCheckpointRenderer } from './checkpoint';
import { parseTakeawayContent } from './TakeawayCanvasEditor';
import { Copy, Check, Loader2 } from 'lucide-react';

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
// Renders a standalone `takeaway` canvas block whose content is JSON { title, icon, body }.
const TakeawayBlockCard = ({ content }: { content: string }) => {
  const data = parseTakeawayContent(content);
  const [copied, setCopied] = useState(false);
  const [copyHovered, setCopyHovered] = useState(false);
  const [cardHovered, setCardHovered] = useState(false);

  if (!data.body && !data.title) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(data.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: '#ffffff',
        border: '1px solid #e2e2e6',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Top accent strip ── */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #C8920A 0%, #D4A843 55%, #EDD07A 100%)' }} />

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Icon badge */}
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: '#FEF3DC',
            border: '1px solid #F2D98C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 19,
            flexShrink: 0,
            userSelect: 'none',
          }}>
            {data.icon || '🧠'}
          </div>

          {/* Label + title stack */}
          <div style={{ paddingTop: 2 }}>
            <p style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: '#A87800',
              margin: 0,
              marginBottom: data.title ? 5 : 0,
            }}>
              Key Takeaway
            </p>
            {data.title && (
              <p style={{ fontSize: 16.5, fontWeight: 700, color: '#111118', lineHeight: 1.4, margin: 0 }}>
                {data.title}
              </p>
            )}
          </div>
        </div>

        {/* Copy button — reveals on card hover */}
        <button
          onClick={handleCopy}
          onMouseEnter={() => setCopyHovered(true)}
          onMouseLeave={() => setCopyHovered(false)}
          aria-label="Copy takeaway"
          style={{
            opacity: cardHovered ? 1 : 0,
            transition: 'opacity 0.15s ease',
            padding: '6px 8px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: copyHovered ? '#F2F2F4' : 'transparent',
            color: copied ? '#5aaa82' : '#9090A0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {copied
            ? <Check style={{ width: 14, height: 14 }} />
            : <Copy style={{ width: 14, height: 14 }} />
          }
        </button>
      </div>

      {/* ── Inset divider ── */}
      {data.body && (
        <div style={{ height: 1, background: '#EAEAEE', margin: '0 22px' }} />
      )}

      {/* ── Body ── */}
      {data.body && (
        <div style={{ display: 'flex', gap: 16, padding: '18px 22px' }}>
          {/* Left accent bar */}
          <div style={{
            width: 3,
            borderRadius: 999,
            background: 'linear-gradient(to bottom, #C8920A, #D4A843)',
            flexShrink: 0,
            alignSelf: 'stretch',
            minHeight: 20,
          }} />
          <p style={{
            fontSize: 15,
            color: '#4B4B56',
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}>
            {data.body}
          </p>
        </div>
      )}
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
    <div className={cn('space-y-6', className)}>
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
