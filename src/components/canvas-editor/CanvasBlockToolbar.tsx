/**
 * CanvasBlockToolbar – Inline header for each canvas block
 *
 * Collapsed:  entire bar is clickable to expand  ·  actions pinned to far right
 * Expanded:   name input is editable  ·  actions pinned to far right
 */

import { useRef } from 'react';
import {
  GripVertical, Copy, Trash2, ChevronDown, ChevronRight,
  FileText, MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CanvasBlockToolbarProps {
  kind: 'text' | 'chat';
  name: string;
  onNameChange: (name: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  contentPreview?: string;
}

const CanvasBlockToolbar = ({
  kind,
  name,
  onNameChange,
  isCollapsed,
  onToggleCollapse,
  onDuplicate,
  onDelete,
  dragHandleProps,
  contentPreview,
}: CanvasBlockToolbarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const KindIcon = kind === 'text' ? FileText : MessageCircle;
  const kindLabel = kind === 'text' ? 'text' : 'chat';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 border-b border-border/50 bg-muted/30 rounded-t-lg min-w-0 cursor-pointer select-none',
        isCollapsed && 'rounded-lg border-b-0',
      )}
      onClick={onToggleCollapse}
    >
      {/* Chevron */}
      <button
        onClick={e => { e.stopPropagation(); onToggleCollapse(); }}
        className="flex-shrink-0 flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-colors rounded"
        title={isCollapsed ? 'Expand block' : 'Collapse block'}
      >
        {isCollapsed
          ? <ChevronRight className="h-3.5 w-3.5" />
          : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {/* Kind icon */}
      <KindIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

      {/* Name — editable when expanded, plain text when collapsed */}
      {isCollapsed ? (
        <span className="text-xs font-mono text-foreground/70 flex-shrink-0">
          {name || `${kindLabel}_block`}
        </span>
      ) : (
        <input
          ref={inputRef}
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
          placeholder={`${kindLabel}_block`}
          spellCheck={false}
          className={cn(
            'flex-shrink-0 w-36 text-xs font-mono bg-transparent border-none outline-none',
            'text-foreground/80 placeholder:text-muted-foreground/50',
            'hover:bg-muted/50 focus:bg-muted focus:ring-1 focus:ring-primary/30',
            'rounded px-1 py-0.5 transition-colors',
          )}
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Middle — flex-1 always, shows preview when collapsed */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {isCollapsed && contentPreview && (
          <span className="text-xs text-muted-foreground/50 truncate block">
            — {contentPreview}
          </span>
        )}
      </div>

      {/* Actions — always on the far right, stop propagation so they don't trigger expand */}
      <div
        className="flex items-center gap-0.5 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <div
          {...dragHandleProps}
          className="flex items-center justify-center w-6 h-6 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors rounded"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onDuplicate}
          title="Duplicate block"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          title="Delete block"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default CanvasBlockToolbar;
