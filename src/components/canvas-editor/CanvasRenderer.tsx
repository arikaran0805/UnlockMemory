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
            block.kind === "text" ? "canvas-rendered-block-text" : "canvas-rendered-block-chat"
          )}
        >
          {block.kind === 'text' ? (
            <RichTextRenderer content={block.content} />
          ) : (
            <ChatConversationView
              content={block.content}
              courseType={courseType}
              codeTheme={codeTheme}
              allowSingleSpeaker
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default CanvasRenderer;
