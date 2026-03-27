/**
 * Canvas Editor Types
 */

export type BlockKind = 'text' | 'chat';

export interface CanvasBlock {
  id: string;
  kind: BlockKind;
  name: string;   // user-editable variable-style label
  x: number;      // kept for serialisation compat; layout is now flow-based
  y: number;
  w: number;
  h: number;
  content: string;
}

export interface CanvasData {
  version: 1;
  blocks: CanvasBlock[];
}

export interface ContextMenuPosition {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export interface ContextMenuPosition {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
}

export const DEFAULT_BLOCK_WIDTH = 600;
export const DEFAULT_BLOCK_HEIGHT = 200;

export const createEmptyBlock = (
  kind: BlockKind,
  x: number,
  y: number,
  name = '',
): CanvasBlock => ({
  id: crypto.randomUUID(),
  kind,
  name,
  x,
  y,
  w: DEFAULT_BLOCK_WIDTH,
  h: DEFAULT_BLOCK_HEIGHT,
  content: '',
});

export const isCanvasContent = (content: string): boolean => {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return parsed?.version === 1 && Array.isArray(parsed?.blocks);
  } catch {
    return false;
  }
};

export const parseCanvasContent = (content: string): CanvasData => {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.version === 1 && Array.isArray(parsed?.blocks)) {
      // Backfill name for old blocks that don't have one
      return {
        ...parsed,
        blocks: parsed.blocks.map((b: CanvasBlock) => ({
          name: '',
          ...b,
        })),
      };
    }
  } catch {
    // Not valid canvas content
  }
  return { version: 1, blocks: [] };
};

export const serializeCanvasContent = (data: CanvasData): string =>
  JSON.stringify(data);

// Sort blocks for reading order (top-to-bottom then left-to-right)
export const sortBlocksForReading = (blocks: CanvasBlock[]): CanvasBlock[] =>
  [...blocks].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 50) return yDiff;
    return a.x - b.x;
  });
