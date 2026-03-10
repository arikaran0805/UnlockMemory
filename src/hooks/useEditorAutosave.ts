/**
 * Editor Autosave Hook
 * 
 * Provides debounced autosave with localStorage fallback,
 * dirty state tracking, and navigation warnings.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { JSONContent } from '@tiptap/react';

const DRAFT_PREFIX = 'tiptap_draft_';
const DEBOUNCE_MS = 1500;

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseEditorAutosaveOptions {
  /** Unique key for draft storage */
  draftKey: string;
  /** Callback to save content (e.g., to database) */
  onSave?: (content: JSONContent) => Promise<void>;
  /** Enable localStorage fallback */
  enableLocalDraft?: boolean;
  /** Enable beforeunload warning */
  warnOnUnsavedChanges?: boolean;
  /** Debounce delay in ms */
  debounceMs?: number;
}

interface UseEditorAutosaveReturn {
  /** Current save status */
  status: AutosaveStatus;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Mark content as changed */
  markDirty: () => void;
  /** Save content immediately */
  saveNow: (content: JSONContent) => Promise<void>;
  /** Load draft from localStorage */
  loadDraft: () => JSONContent | null;
  /** Clear draft from localStorage */
  clearDraft: () => void;
  /** Trigger debounced save */
  debouncedSave: (content: JSONContent) => void;
}

export function useEditorAutosave({
  draftKey,
  onSave,
  enableLocalDraft = true,
  warnOnUnsavedChanges = true,
  debounceMs = DEBOUNCE_MS,
}: UseEditorAutosaveOptions): UseEditorAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [isDirty, setIsDirty] = useState(false);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `${DRAFT_PREFIX}${draftKey}`;

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  // Warn on unsaved changes
  useEffect(() => {
    if (!warnOnUnsavedChanges || !isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [warnOnUnsavedChanges, isDirty]);

  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  const loadDraft = useCallback((): JSONContent | null => {
    if (!enableLocalDraft) return null;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Autosave] Failed to load draft:', e);
    }
    return null;
  }, [storageKey, enableLocalDraft]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('[Autosave] Failed to clear draft:', e);
    }
    setIsDirty(false);
    setStatus('idle');
  }, [storageKey]);

  const saveDraftToLocal = useCallback((content: JSONContent) => {
    if (!enableLocalDraft) return;
    
    try {
      const serialized = JSON.stringify(content);
      localStorage.setItem(storageKey, serialized);
    } catch (e) {
      console.warn('[Autosave] Failed to save local draft:', e);
    }
  }, [storageKey, enableLocalDraft]);

  const saveNow = useCallback(async (content: JSONContent) => {
    const serialized = JSON.stringify(content);
    
    // Skip if content hasn't changed
    if (serialized === lastSavedRef.current) {
      return;
    }

    setStatus('saving');

    try {
      // Save to localStorage as backup
      saveDraftToLocal(content);
      
      // Call external save if provided
      if (onSave) {
        await onSave(content);
      }
      
      lastSavedRef.current = serialized;
      setIsDirty(false);
      setStatus('saved');

      // Reset status after delay
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => {
        setStatus('idle');
      }, 2000);
    } catch (e) {
      console.error('[Autosave] Save failed:', e);
      setStatus('error');
    }
  }, [onSave, saveDraftToLocal]);

  const debouncedSave = useCallback((content: JSONContent) => {
    setIsDirty(true);
    setStatus('saving');

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveNow(content);
    }, debounceMs);
  }, [saveNow, debounceMs]);

  return {
    status,
    isDirty,
    markDirty,
    saveNow,
    loadDraft,
    clearDraft,
    debouncedSave,
  };
}

/**
 * Autosave status indicator component props
 */
export interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  className?: string;
}
