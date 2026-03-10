import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_PREFIX = "problem_draft_code_";
const LAST_SUBMITTED_PREFIX = "problem_last_submitted_";
const AUTO_SAVE_DELAY_MS = 1500; // Auto-save after 1.5s of inactivity

interface LastSubmittedCode {
  code: string;
  language: string;
  timestamp: string;
}

interface UseProblemCodePersistenceOptions {
  problemId: string | undefined;
  starterCode: Record<string, string>;
  supportedLanguages: string[];
}

interface UseProblemCodePersistenceReturn {
  code: string;
  language: string;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  handleLanguageChange: (newLanguage: string) => void;
  handleReset: () => void;
  restoreLastSubmission: () => boolean;
  saveAsLastSubmission: (code: string, language: string) => void;
  hasLastSubmission: boolean;
  hasDraft: boolean;
  isDraftDirty: boolean;
}

/**
 * LeetCode-style code persistence hook
 * 
 * Features:
 * - Auto-saves drafts to localStorage on change (debounced)
 * - Stores last submitted code per problem + language
 * - Restore priority: draft > last submitted > starter code
 * - Language-aware persistence
 * - Silent auto-restore on mount (LeetCode-like)
 */
export function useProblemCodePersistence({
  problemId,
  starterCode,
  supportedLanguages,
}: UseProblemCodePersistenceOptions): UseProblemCodePersistenceReturn {
  const availableLanguages = supportedLanguages.length > 0 
    ? supportedLanguages 
    : Object.keys(starterCode);
  
  const defaultLanguage = availableLanguages[0] || "python";
  
  const [language, setLanguageState] = useState(defaultLanguage);
  const [code, setCodeState] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [hasLastSubmission, setHasLastSubmission] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const lastSavedCodeRef = useRef<string>("");

  // Storage key generators
  const getDraftKey = useCallback((lang: string) => {
    return `${DRAFT_PREFIX}${problemId}_${lang}`;
  }, [problemId]);

  const getLastSubmittedKey = useCallback((lang: string) => {
    return `${LAST_SUBMITTED_PREFIX}${problemId}_${lang}`;
  }, [problemId]);

  // Get draft from localStorage
  const getDraft = useCallback((lang: string): string | null => {
    if (!problemId) return null;
    try {
      return localStorage.getItem(getDraftKey(lang));
    } catch {
      return null;
    }
  }, [problemId, getDraftKey]);

  // Save draft to localStorage
  const saveDraft = useCallback((codeToSave: string, lang: string) => {
    if (!problemId) return;
    try {
      const key = getDraftKey(lang);
      if (codeToSave === starterCode[lang]) {
        // If code equals starter code, remove draft
        localStorage.removeItem(key);
        setHasDraft(false);
      } else {
        localStorage.setItem(key, codeToSave);
        setHasDraft(true);
      }
      lastSavedCodeRef.current = codeToSave;
      setIsDraftDirty(false);
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  }, [problemId, getDraftKey, starterCode]);

  // Clear draft from localStorage
  const clearDraft = useCallback((lang: string) => {
    if (!problemId) return;
    try {
      localStorage.removeItem(getDraftKey(lang));
      setHasDraft(false);
    } catch {
      // Ignore errors
    }
  }, [problemId, getDraftKey]);

  // Get last submitted code from localStorage
  const getLastSubmitted = useCallback((lang: string): LastSubmittedCode | null => {
    if (!problemId) return null;
    try {
      const stored = localStorage.getItem(getLastSubmittedKey(lang));
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  }, [problemId, getLastSubmittedKey]);

  // Check if any last submission exists for any language
  const checkHasAnyLastSubmission = useCallback(() => {
    if (!problemId) return false;
    return availableLanguages.some(lang => getLastSubmitted(lang) !== null);
  }, [problemId, availableLanguages, getLastSubmitted]);

  // Save last submitted code
  const saveAsLastSubmission = useCallback((codeToSave: string, lang: string) => {
    if (!problemId) return;
    try {
      const data: LastSubmittedCode = {
        code: codeToSave,
        language: lang,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(getLastSubmittedKey(lang), JSON.stringify(data));
      setHasLastSubmission(true);
      
      // Also update draft to match submission (fresh slate)
      saveDraft(codeToSave, lang);
    } catch (error) {
      console.error("Failed to save last submission:", error);
    }
  }, [problemId, getLastSubmittedKey, saveDraft]);

  // Restore code for a specific language with priority logic
  const restoreCodeForLanguage = useCallback((lang: string): string => {
    // Priority 1: Draft
    const draft = getDraft(lang);
    if (draft !== null) {
      setHasDraft(true);
      return draft;
    }
    
    // Priority 2: Last submitted code
    const lastSubmitted = getLastSubmitted(lang);
    if (lastSubmitted) {
      setHasLastSubmission(true);
      return lastSubmitted.code;
    }
    
    // Priority 3: Starter code
    setHasDraft(false);
    return starterCode[lang] || "";
  }, [getDraft, getLastSubmitted, starterCode]);

  // Restore last submission manually (button click)
  const restoreLastSubmission = useCallback((): boolean => {
    const lastSubmitted = getLastSubmitted(language);
    if (lastSubmitted) {
      setCodeState(lastSubmitted.code);
      saveDraft(lastSubmitted.code, language);
      return true;
    }
    return false;
  }, [language, getLastSubmitted, saveDraft]);

  // Handle code changes with auto-save
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode);
    setIsDraftDirty(newCode !== lastSavedCodeRef.current);
    
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Set new auto-save timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(newCode, language);
    }, AUTO_SAVE_DELAY_MS);
  }, [language, saveDraft]);

  // Handle language change with persistence
  const handleLanguageChange = useCallback((newLang: string) => {
    // Save current draft before switching
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    saveDraft(code, language);
    
    // Switch language
    setLanguageState(newLang);
    
    // Restore code for new language
    const restoredCode = restoreCodeForLanguage(newLang);
    setCodeState(restoredCode);
    lastSavedCodeRef.current = restoredCode;
    setIsDraftDirty(false);
  }, [code, language, saveDraft, restoreCodeForLanguage]);

  // Set language without restoring (for external control)
  const setLanguage = useCallback((newLang: string) => {
    setLanguageState(newLang);
  }, []);

  // Reset to starter code
  const handleReset = useCallback(() => {
    const starter = starterCode[language] || "";
    setCodeState(starter);
    clearDraft(language);
    lastSavedCodeRef.current = starter;
    setIsDraftDirty(false);
  }, [language, starterCode, clearDraft]);

  // Initialize on mount - restore code silently (LeetCode-like)
  useEffect(() => {
    if (!problemId || isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    
    // Check for any last submissions
    setHasLastSubmission(checkHasAnyLastSubmission());
    
    // Restore code for current language
    const restoredCode = restoreCodeForLanguage(language);
    setCodeState(restoredCode);
    lastSavedCodeRef.current = restoredCode;
  }, [problemId, language, restoreCodeForLanguage, checkHasAnyLastSubmission]);

  // Reset initialization when problemId changes
  useEffect(() => {
    if (problemId) {
      isInitializedRef.current = false;
    }
  }, [problemId]);

  // Save draft on unmount or when leaving page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (problemId && isDraftDirty) {
        saveDraft(code, language);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Save on unmount
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (problemId && isDraftDirty) {
        saveDraft(code, language);
      }
    };
  }, [problemId, code, language, isDraftDirty, saveDraft]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    code,
    language,
    setCode,
    setLanguage,
    handleLanguageChange,
    handleReset,
    restoreLastSubmission,
    saveAsLastSubmission,
    hasLastSubmission,
    hasDraft,
    isDraftDirty,
  };
}
