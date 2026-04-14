/**
 * CanvasContextMenu - Context menu for adding blocks inline on the canvas
 */

import { FileText, MessageCircle, CheckCircle2, Lightbulb, PenTool, Image as ImageIcon } from 'lucide-react';
import { BlockKind, ContextMenuPosition } from './types';
import { cn } from '@/lib/utils';

interface CanvasContextMenuProps {
  position: ContextMenuPosition;
  onAddBlock: (kind: BlockKind) => void;
  onClose: () => void;
}

const BLOCK_OPTIONS: { kind: BlockKind; label: string; Icon: React.ElementType }[] = [
  { kind: 'text',       label: 'Text Block',       Icon: FileText     },
  { kind: 'chat',       label: 'Chat Block',        Icon: MessageCircle },
  { kind: 'checkpoint', label: 'Checkpoint Block',  Icon: CheckCircle2 },
  { kind: 'takeaway',   label: 'Takeaway Block',    Icon: Lightbulb    },
  { kind: 'freeform',   label: 'Freeform Canvas',   Icon: PenTool      },
  { kind: 'media',      label: 'Media Block',       Icon: ImageIcon    },
];

import React from 'react';

const CanvasContextMenu = ({ position, onAddBlock, onClose }: CanvasContextMenuProps) => {
  const handleAddBlock = (kind: BlockKind) => {
    onAddBlock(kind);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />

      {/* Menu — positioned via CSS, clamped by the parent to stay inside canvas */}
      <div
        className={cn(
          'fixed z-50 min-w-[180px] rounded-xl border border-border/60 bg-popover p-1.5 shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-150',
        )}
        style={{ left: position.x, top: position.y }}
      >
        <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
          Insert Block
        </p>
        {BLOCK_OPTIONS.map(({ kind, label, Icon }) => (
          <button
            key={kind}
            onClick={() => handleAddBlock(kind)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-primary/[0.07] hover:text-primary transition-colors"
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </>
  );
};

export default CanvasContextMenu;
