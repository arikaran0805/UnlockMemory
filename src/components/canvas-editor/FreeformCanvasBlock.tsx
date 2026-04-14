/**
 * FreeformCanvasBlock
 *
 * Wraps FreeformCanvas (Fabric.js) as a standalone canvas block editor.
 * Replaces the old ChatStyleEditor wrapper for kind === 'freeform' blocks.
 */

import { lazy, Suspense, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import type { FreeformCanvasData } from '@/components/chat-editor/freeform/types';

const FreeformCanvas = lazy(() =>
  import('@/components/chat-editor/freeform/FreeformCanvas').then(m => ({
    default: m.FreeformCanvas,
  })),
);

interface FreeformCanvasBlockProps {
  content: string;
  onChange: (content: string) => void;
}

const FreeformCanvasBlock = ({ content, onChange }: FreeformCanvasBlockProps) => {
  const initialData: FreeformCanvasData | undefined = (() => {
    if (!content) return undefined;
    try { return JSON.parse(content) as FreeformCanvasData; } catch { return undefined; }
  })();

  const handleSave = useCallback(
    (data: FreeformCanvasData) => onChange(JSON.stringify(data)),
    [onChange],
  );

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px] rounded-xl border border-border bg-muted/30">
          <div className="text-center text-muted-foreground">
            <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading canvas…</p>
          </div>
        </div>
      }
    >
      <FreeformCanvas
        initialData={initialData}
        onSave={handleSave}
        readOnly={false}
        className="min-h-[400px]"
      />
    </Suspense>
  );
};

export default FreeformCanvasBlock;
