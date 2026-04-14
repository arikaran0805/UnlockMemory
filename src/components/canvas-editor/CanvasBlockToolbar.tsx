/**
 * CanvasBlockToolbar – Inline header for each canvas block
 *
 * Collapsed:  entire bar is clickable to expand  ·  actions pinned to far right
 * Expanded:   name input is editable  ·  actions pinned to far right
 */

import { useRef } from 'react';
import {
  GripVertical, Copy, Trash2, ChevronDown, ChevronRight,
  FileText, MessageCircle, CheckCircle2, Lightbulb, PenTool, Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Per-kind visual identity — icon, colors, label */
const KIND_CONFIG = {
  text: {
    Icon: FileText,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/15',
    label: 'text',
  },
  chat: {
    Icon: MessageCircle,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/15',
    label: 'chat',
  },
  checkpoint: {
    Icon: CheckCircle2,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/15',
    label: 'checkpoint',
  },
  takeaway: {
    Icon: Lightbulb,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/15',
    label: 'takeaway',
  },
  freeform: {
    Icon: PenTool,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/15',
    label: 'freeform',
  },
  media: {
    Icon: ImageIcon,
    iconColor: 'text-primary',
    iconBg: 'bg-primary/10 dark:bg-primary/15',
    label: 'media',
  },
} as const;

interface CanvasBlockToolbarProps {
  kind: 'text' | 'chat' | 'checkpoint' | 'takeaway' | 'freeform' | 'media';
  name: string;
  onNameChange: (name: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  contentPreview?: string;
  annotationMode?: boolean;
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
  annotationMode,
}: CanvasBlockToolbarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const config = KIND_CONFIG[kind];
  const { Icon } = config;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2.5',
        'border-b border-border/40 bg-muted/[0.03]',
        'rounded-t-xl cursor-pointer select-none',
        'transition-colors duration-150 hover:bg-muted/[0.07]',
        isCollapsed && 'rounded-xl border-b-0',
      )}
      onClick={onToggleCollapse}
    >
      {/* Chevron — proper hover zone */}
      <button
        onClick={e => { e.stopPropagation(); onToggleCollapse(); }}
        className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-100"
        title={isCollapsed ? 'Expand block' : 'Collapse block'}
      >
        {isCollapsed
          ? <ChevronRight className="h-3.5 w-3.5" />
          : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {/* Kind icon — colored badge */}
      <div className={cn('flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center', config.iconBg)}>
        <Icon className={cn('h-3 w-3', config.iconColor)} />
      </div>

      {/* Name — editable when expanded, plain text when collapsed */}
      {isCollapsed ? (
        <span className="text-[11.5px] font-mono font-semibold text-foreground/80 flex-shrink-0 tracking-tight">
          {name || `${config.label}_block`}
        </span>
      ) : (
        <input
          ref={inputRef}
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
          placeholder={`${config.label}_block`}
          spellCheck={false}
          className={cn(
            'flex-shrink-0 w-40 text-[11.5px] font-mono font-semibold tracking-tight',
            'bg-transparent border-none outline-none',
            'text-foreground/80 placeholder:text-muted-foreground/40',
            'hover:bg-muted/50 focus:bg-muted/60 focus:ring-1 focus:ring-primary/25',
            'rounded px-1.5 py-0.5 transition-colors duration-100',
          )}
          onClick={e => e.stopPropagation()}
        />
      )}

      {/* Middle spacer — shows content preview when collapsed */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {isCollapsed && contentPreview && (
          <span className="text-[11.5px] text-muted-foreground/60 truncate block leading-none">
            — {contentPreview}
          </span>
        )}
      </div>

      {/* Actions — fade in on group-hover; hidden entirely in annotation mode */}
      {!annotationMode && (
        <div
          className="flex items-center gap-0.5 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle — visible only on hover to reduce visual noise */}
          <div
            {...dragHandleProps}
            className="flex items-center justify-center w-6 h-6 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted rounded transition-all duration-150 opacity-0 group-hover:opacity-100"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/50 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all duration-150"
            onClick={onDuplicate}
            title="Duplicate block"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-150"
            onClick={onDelete}
            title="Delete block"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CanvasBlockToolbar;
