/**
 * CodeEditContext - Tracks when learners edit code blocks
 * 
 * Exposes the most recently edited code block's content and language
 * to enable the "Run this code yourself" CTA in the sidebar.
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface EditedCodeBlock {
  id: string;
  code: string;
  originalCode: string;
  language: string;
  editedAt: number;
}

interface CodeEditContextValue {
  /** The most recently edited code block */
  editedCodeBlock: EditedCodeBlock | null;
  /** Whether any code block has been modified from its original */
  hasEditedCode: boolean;
  /** Register a code block edit */
  reportCodeEdit: (id: string, code: string, originalCode: string, language: string) => void;
  /** Reset a code block to original (removes from tracking) */
  resetCodeEdit: (id: string) => void;
  /** Clear all tracked edits (e.g., when leaving lesson) */
  clearAllEdits: () => void;
}

const CodeEditContext = createContext<CodeEditContextValue | undefined>(undefined);

export function CodeEditProvider({ children }: { children: ReactNode }) {
  const [editedBlocks, setEditedBlocks] = useState<Map<string, EditedCodeBlock>>(new Map());

  const reportCodeEdit = useCallback((
    id: string, 
    code: string, 
    originalCode: string, 
    language: string
  ) => {
    // Only track if code differs from original
    if (code === originalCode) {
      setEditedBlocks(prev => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    setEditedBlocks(prev => {
      const next = new Map(prev);
      next.set(id, {
        id,
        code,
        originalCode,
        language,
        editedAt: Date.now(),
      });
      return next;
    });
  }, []);

  const resetCodeEdit = useCallback((id: string) => {
    setEditedBlocks(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearAllEdits = useCallback(() => {
    setEditedBlocks(new Map());
  }, []);

  // Get most recently edited block
  const editedCodeBlock = Array.from(editedBlocks.values())
    .sort((a, b) => b.editedAt - a.editedAt)[0] || null;

  const hasEditedCode = editedBlocks.size > 0;

  return (
    <CodeEditContext.Provider value={{
      editedCodeBlock,
      hasEditedCode,
      reportCodeEdit,
      resetCodeEdit,
      clearAllEdits,
    }}>
      {children}
    </CodeEditContext.Provider>
  );
}

export function useCodeEdit() {
  const context = useContext(CodeEditContext);
  if (context === undefined) {
    throw new Error("useCodeEdit must be used within a CodeEditProvider");
  }
  return context;
}

/** Safe variant — returns null when called outside a CodeEditProvider */
export function useCodeEditOptional(): CodeEditContextValue | null {
  return useContext(CodeEditContext) ?? null;
}

export default CodeEditContext;
