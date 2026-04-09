/**
 * FloatingTextToolbar
 *
 * A portal-rendered formatting toolbar that appears above a <textarea> when the
 * user selects text inside it. Applies markdown syntax wrapping.
 *
 * Usage:
 *   <FloatingTextToolbar
 *     targetRef={textareaRef}
 *     onApplyFormat={(prefix, suffix) => wrapSelection(prefix, suffix)}
 *   />
 *
 * Positioning strategy: We can't get exact glyph coordinates from a textarea, so
 * the toolbar floats above the textarea element itself — centred on the selection
 * x-midpoint when the browser exposes it, otherwise centred on the textarea.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bold, Italic, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingTextToolbarProps {
  /** The textarea element to monitor for selections */
  targetRef: React.RefObject<HTMLTextAreaElement>;
  /** Called when the user clicks a format button with the markdown prefix/suffix */
  onApplyFormat: (prefix: string, suffix: string) => void;
  /** When true the toolbar is suppressed (e.g. annotation mode is on) */
  disabled?: boolean;
}

const ACTIONS = [
  { label: 'Bold',        icon: Bold,   prefix: '**', suffix: '**', title: 'Bold (Ctrl+B)' },
  { label: 'Italic',      icon: Italic, prefix: '*',  suffix: '*',  title: 'Italic (Ctrl+I)' },
  { label: 'Inline Code', icon: Code,   prefix: '`',  suffix: '`',  title: 'Inline code' },
];

export const FloatingTextToolbar = ({
  targetRef,
  onApplyFormat,
  disabled = false,
}: FloatingTextToolbarProps) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  // guard: prevent mousedown-on-toolbar from dismissing before click fires
  const mouseDownInToolbar = useRef(false);

  useEffect(() => {
    const textarea = targetRef.current;
    if (!textarea || disabled) return;

    const show = () => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      if (end <= start) { setVisible(false); return; }

      // Position above the textarea, horizontally centred
      const rect = textarea.getBoundingClientRect();
      const toolbarWidth = 128; // approximate
      const centreX = rect.left + rect.width / 2;

      setPos({
        top: rect.top + window.scrollY - 44,
        left: Math.max(8, centreX + window.scrollX - toolbarWidth / 2),
      });
      setVisible(true);
    };

    const hide = (e: MouseEvent) => {
      if (mouseDownInToolbar.current) return;
      if (toolbarRef.current?.contains(e.target as Node)) return;
      setVisible(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false);
    };

    textarea.addEventListener('mouseup', show);
    textarea.addEventListener('keyup', show);
    document.addEventListener('mousedown', hide);
    document.addEventListener('keydown', onKey);

    return () => {
      textarea.removeEventListener('mouseup', show);
      textarea.removeEventListener('keyup', show);
      document.removeEventListener('mousedown', hide);
      document.removeEventListener('keydown', onKey);
    };
  }, [targetRef, disabled]);

  if (!visible || disabled) return null;

  return createPortal(
    <div
      ref={toolbarRef}
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
      onMouseDown={() => { mouseDownInToolbar.current = true; }}
      onMouseUp={() => { mouseDownInToolbar.current = false; }}
    >
      <div className="flex items-center gap-0.5 bg-popover border border-border rounded-lg shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
        {ACTIONS.map(({ label, icon: Icon, prefix, suffix, title }) => (
          <button
            key={label}
            title={title}
            onMouseDown={(e) => {
              // prevent textarea losing focus/selection before we read it
              e.preventDefault();
            }}
            onClick={() => {
              onApplyFormat(prefix, suffix);
              setVisible(false);
            }}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground',
              'hover:bg-muted hover:text-foreground transition-colors',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
};

export default FloatingTextToolbar;
