/**
 * TakeawayCanvasEditor
 *
 * Premium WYSIWYG inline editor for Takeaway canvas blocks.
 * Uses the site's primary green palette.
 *
 * Storage format (in block.content):  JSON { title, icon, body }
 * Legacy format handled:              "TAKEAWAY: [TAKEAWAY:icon:title]: body"
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Lightbulb, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TAKEAWAY_ICONS } from '@/components/chat-editor/types';

/* ------------------------------------------------------------------ */
/* Data helpers                                                         */
/* ------------------------------------------------------------------ */

interface TakeawayData {
  title: string;
  icon: string;
  body: string;
}

// Matches: "TAKEAWAY: [TAKEAWAY:icon:title]: body"
const LEGACY_RE = /^TAKEAWAY:\s*\[TAKEAWAY(?::([^:\]]*?))?(?::([^\]]*?))?\]:\s*([\s\S]*)$/;

// Default placeholder strings inserted by the old editor — strip them
const STALE_PLACEHOLDERS = [
  'Enter your takeaway content here...',
  'Enter your takeaway content here…',
  'Enter your key takeaway...',
  'Enter your key takeaway…',
];
const isStale = (s: string) => STALE_PLACEHOLDERS.includes(s.trim());

export function parseTakeawayContent(content: string): TakeawayData {
  const empty: TakeawayData = { title: '', icon: '🧠', body: '' };
  if (!content?.trim()) return empty;

  // 1 — New JSON format { title, icon, body }
  try {
    const p = JSON.parse(content);
    if (p && typeof p === 'object' && ('body' in p || 'title' in p)) {
      return {
        title: p.title ?? '',
        icon:  p.icon  ?? '🧠',
        body:  isStale(p.body ?? '') ? '' : (p.body ?? ''),
      };
    }
    // Any other JSON (old chat messages array, etc.) → reset
    if (typeof p === 'object') return empty;
  } catch { /* not JSON */ }

  // 2 — Legacy "TAKEAWAY: [TAKEAWAY:🧠:Title]: body" format
  const m = content.match(LEGACY_RE);
  if (m) {
    const body = m[3]?.trim() || '';
    return { icon: m[1]?.trim() || '🧠', title: m[2]?.trim() || '', body: isStale(body) ? '' : body };
  }

  // 3 — Plain string → use as body (unless it's a stale placeholder)
  return { title: '', icon: '🧠', body: isStale(content) ? '' : content };
}

export function serializeTakeawayContent(d: TakeawayData): string {
  return JSON.stringify(d);
}

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

interface TakeawayCanvasEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const TakeawayCanvasEditor = ({ content, onChange }: TakeawayCanvasEditorProps) => {
  const initial = useMemo(() => parseTakeawayContent(content), []);
  const [title, setTitle] = useState(initial.title);
  const [icon, setIcon]   = useState(initial.icon);
  const [body, setBody]   = useState(initial.body);
  const [iconOpen, setIconOpen] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Auto-size textarea
  useEffect(() => {
    const ta = bodyRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [body]);

  const flush = useCallback(
    (patch: Partial<TakeawayData>) =>
      onChange(serializeTakeawayContent({
        title: patch.title ?? title,
        icon:  patch.icon  ?? icon,
        body:  patch.body  ?? body,
      })),
    [title, icon, body, onChange],
  );

  const onTitle = (v: string) => { setTitle(v); flush({ title: v }); };
  const onIcon  = (v: string) => { setIcon(v);  setIconOpen(false); flush({ icon: v }); };
  const onBody  = (v: string) => { setBody(v);  flush({ body: v }); };

  return (
    <div
      className={cn(
        'relative rounded-2xl overflow-hidden',
        // border
        'border border-primary/20 dark:border-primary/30',
        // background — very light green tint
        'bg-gradient-to-b from-primary/[0.05] via-primary/[0.03] to-primary/[0.01]',
        'dark:from-primary/[0.08] dark:via-primary/[0.05] dark:to-primary/[0.02]',
        // shadow
        'shadow-[0_4px_24px_hsl(142_70%_45%/0.07),0_1px_4px_hsl(142_70%_45%/0.04)]',
        'dark:shadow-[0_4px_24px_hsl(142_70%_55%/0.12)]',
      )}
    >
      {/* ── Top accent bar ── */}
      <div className="h-[3px] bg-gradient-to-r from-primary via-accent to-primary/50" />

      <div className="p-6 space-y-5">

        {/* ── Header row ── */}
        <div className="flex items-start gap-4">

          {/* Icon picker */}
          <Popover open={iconOpen} onOpenChange={setIconOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Change icon"
                className={cn(
                  'relative flex-shrink-0 w-[52px] h-[52px] rounded-2xl',
                  'bg-primary/10 dark:bg-primary/15',
                  'ring-1 ring-primary/20 dark:ring-primary/30',
                  'flex items-center justify-center text-[26px]',
                  'transition-all duration-200 focus:outline-none',
                  'hover:bg-primary/15 hover:ring-primary/35 hover:scale-105',
                  'group/icon',
                )}
              >
                <span className="drop-shadow-sm">{icon}</span>
                {/* Pencil hint */}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border/70 flex items-center justify-center text-[9px] leading-none opacity-0 group-hover/icon:opacity-100 transition-opacity shadow-sm">
                  ✏️
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3 shadow-xl" align="start" side="right" sideOffset={10}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                Choose Icon
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {TAKEAWAY_ICONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => onIcon(opt.value)}
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center text-[18px]',
                      'border transition-all hover:scale-110 duration-150',
                      icon === opt.value
                        ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/25 shadow-sm'
                        : 'border-transparent hover:bg-primary/8 hover:border-primary/20',
                    )}
                  >
                    {opt.value}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Badge + title */}
          <div className="flex-1 space-y-2.5 pt-0.5">
            {/* Badge row */}
            <div className="flex items-center gap-2 select-none">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-[5px] rounded-full bg-primary/10 dark:bg-primary/15">
                <Lightbulb className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.08em]">
                  Key Takeaway
                </span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-primary/30" />
            </div>

            {/* Title — editable inline */}
            <input
              type="text"
              value={title}
              onChange={e => onTitle(e.target.value)}
              placeholder="One-Line Takeaway for Learners"
              className={cn(
                'w-full bg-transparent border-none outline-none ring-0',
                'text-[1.15rem] font-bold leading-snug tracking-[-0.01em]',
                'text-foreground placeholder:text-foreground/22',
              )}
            />
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-primary/15 via-primary/8 to-transparent dark:from-primary/25 dark:via-primary/12" />

        {/* ── Body ── */}
        <div className="flex gap-3.5">
          {/* Left accent bar */}
          <div className="flex-shrink-0 w-[3px] self-stretch min-h-[3rem] rounded-full bg-gradient-to-b from-primary/50 via-primary/30 to-primary/10" />

          {/* Textarea */}
          <textarea
            ref={bodyRef}
            value={body}
            onChange={e => onBody(e.target.value)}
            placeholder="Write your takeaway here…"
            rows={3}
            className={cn(
              'flex-1 bg-transparent border-none outline-none resize-none ring-0',
              'text-[0.9375rem] leading-relaxed text-foreground/80',
              'placeholder:text-foreground/22 min-h-[3.5rem]',
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default TakeawayCanvasEditor;
