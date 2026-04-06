/**
 * CanvasContextMenu - Context menu for adding blocks
 */

import { FileText, MessageCircle, CheckCircle2 } from 'lucide-react';
import { BlockKind, ContextMenuPosition } from './types';
import { cn } from '@/lib/utils';

interface CanvasContextMenuProps {
  position: ContextMenuPosition;
  onAddBlock: (kind: BlockKind) => void;
  onClose: () => void;
}

const CanvasContextMenu = ({ position, onAddBlock, onClose }: CanvasContextMenuProps) => {
  const handleAddBlock = (kind: BlockKind) => {
    onAddBlock(kind);
    onClose();
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      
      {/* Menu */}
      <div
        className={cn(
          "fixed z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg",
          "animate-in fade-in-0 zoom-in-95 duration-150"
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
      >
        <button
          onClick={() => handleAddBlock('text')}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <FileText className="h-4 w-4" />
          Text Block
        </button>
        <button
          onClick={() => handleAddBlock('chat')}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          Chat Block
        </button>
        <button
          onClick={() => handleAddBlock('checkpoint')}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <CheckCircle2 className="h-4 w-4" />
          Checkpoint Block
        </button>
      </div>
    </>
  );
};

export default CanvasContextMenu;
