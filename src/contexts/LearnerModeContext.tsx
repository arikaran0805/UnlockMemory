/**
 * LearnerModeContext
 * 
 * Global state for FREE vs PRO learner mode.
 * Persists to localStorage and provides mode switching throughout the app.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { toast } from "@/hooks/use-toast";

export type LearnerMode = "FREE" | "PRO";

interface LearnerModeContextValue {
  /** Current learner mode */
  learnerMode: LearnerMode;
  /** Check if user is in FREE mode */
  isFreeMode: boolean;
  /** Check if user is in PRO mode */
  isProMode: boolean;
  /** Activate PRO mode - shows toast and unlocks features */
  activateProMode: () => void;
  /** Reset to FREE mode */
  resetToFreeMode: () => void;
  /** Toggle between modes */
  toggleMode: () => void;
}

const LearnerModeContext = createContext<LearnerModeContextValue | undefined>(undefined);

const STORAGE_KEY = "lovable_learner_mode";

export const LearnerModeProvider = ({ children }: { children: ReactNode }) => {
  const [learnerMode, setLearnerMode] = useState<LearnerMode>(() => {
    if (typeof window === "undefined") return "FREE";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "PRO" ? "PRO" : "FREE";
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, learnerMode);
  }, [learnerMode]);

  const activateProMode = useCallback(() => {
    setLearnerMode("PRO");
    toast({
      title: "✨ You are now a Pro Learner",
      description: "Course customization, bundle discounts, and premium features are now unlocked.",
    });
  }, []);

  const resetToFreeMode = useCallback(() => {
    setLearnerMode("FREE");
    toast({
      title: "Mode Reset",
      description: "You're now browsing as a Free Learner.",
    });
  }, []);

  const toggleMode = useCallback(() => {
    if (learnerMode === "FREE") {
      activateProMode();
    } else {
      resetToFreeMode();
    }
  }, [learnerMode, activateProMode, resetToFreeMode]);

  const value: LearnerModeContextValue = {
    learnerMode,
    isFreeMode: learnerMode === "FREE",
    isProMode: learnerMode === "PRO",
    activateProMode,
    resetToFreeMode,
    toggleMode,
  };

  return (
    <LearnerModeContext.Provider value={value}>
      {children}
    </LearnerModeContext.Provider>
  );
};

export const useLearnerMode = (): LearnerModeContextValue => {
  const context = useContext(LearnerModeContext);
  if (!context) {
    throw new Error("useLearnerMode must be used within a LearnerModeProvider");
  }
  return context;
};

export default LearnerModeContext;
