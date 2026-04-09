/**
 * CanvasRenderer - Read-only renderer for canvas content
 *
 * Renders blocks in their stored array order (which reflects the user's
 * visual ordering from the editor, including any drag-to-reorder changes).
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  parseCanvasContent,
  isCanvasContent,
} from './types';
import { RichTextRenderer } from '@/components/tiptap';
import { ChatConversationView } from '@/components/chat-editor';
import { InlineCheckpointRenderer } from './checkpoint';

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

  const firstChatBlockId = useMemo(
    () => blocks.find((block) => ["chat", "takeaway", "freeform"].includes(block.kind))?.id ?? null,
    [blocks]
  );

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {blocks.map((block) => (
        <div
          key={block.id}
          className={cn(
            "canvas-rendered-block",
            block.kind === "text"
              ? "canvas-rendered-block-text"
              : block.kind === "checkpoint"
                ? "canvas-rendered-block-checkpoint py-4"
                : "canvas-rendered-block-chat"
          )}
        >
          {block.kind === 'text' ? (
            <RichTextRenderer content={block.content} />
          ) : block.kind === 'checkpoint' ? (
            block.data ? (
              <InlineCheckpointRenderer data={block.data} blockId={block.id} />
            ) : null
          ) : (
            <ChatConversationView
              content={block.content}
              courseType={courseType}
              codeTheme={codeTheme}
              showHeader={block.id === firstChatBlockId}
              allowSingleSpeaker
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CanvasRenderer;
