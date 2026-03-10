import { useEffect, useRef, useCallback, useState } from 'react';

const DRAFT_PREFIX = 'lovable_draft_';
const DEBOUNCE_MS = 1000;

export type AutoSaveStatus = 'idle' | 'saving' | 'saved';

export function useAutoSaveDraft(key: string, value: string, enabled: boolean = true) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save draft to localStorage with debounce
  const saveDraft = useCallback((content: string) => {
    if (!enabled || !key) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Show saving indicator immediately when content changes
    if (content !== lastSavedRef.current && content.trim()) {
      setStatus('saving');
    }

    timeoutRef.current = setTimeout(() => {
      if (content !== lastSavedRef.current && content.trim()) {
        try {
          localStorage.setItem(`${DRAFT_PREFIX}${key}`, content);
          lastSavedRef.current = content;
          setStatus('saved');
          
          // Clear the "saved" status after 2 seconds
          if (statusTimeoutRef.current) {
            clearTimeout(statusTimeoutRef.current);
          }
          statusTimeoutRef.current = setTimeout(() => {
            setStatus('idle');
          }, 2000);
        } catch (e) {
          console.warn('Failed to save draft:', e);
          setStatus('idle');
        }
      } else {
        setStatus('idle');
      }
    }, DEBOUNCE_MS);
  }, [key, enabled]);

  // Auto-save on value change
  useEffect(() => {
    if (value) {
      saveDraft(value);
    }
  }, [value, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  // Load draft from localStorage
  const loadDraft = useCallback((): string | null => {
    if (!key) return null;
    try {
      return localStorage.getItem(`${DRAFT_PREFIX}${key}`);
    } catch (e) {
      console.warn('Failed to load draft:', e);
      return null;
    }
  }, [key]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    if (!key) return;
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${key}`);
      lastSavedRef.current = '';
      setStatus('idle');
    } catch (e) {
      console.warn('Failed to clear draft:', e);
    }
  }, [key]);

  return { loadDraft, clearDraft, saveDraft, status };
}
