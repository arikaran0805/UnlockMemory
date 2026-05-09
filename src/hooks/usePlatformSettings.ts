import { useCallback, useEffect, useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface LearningExperienceSettings {
  fontSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  highlightActiveLine: boolean;
  showMatchingBrackets: boolean;
}

export interface CodeEditorSettings {
  fontFamily: "default" | "monospace" | "serif";
  tabSize: number;
  indentationType: "spaces" | "tabs";
  fontLigatures: boolean;
}

export interface AdvancedSettings {
  performanceMode: boolean;
  minimap: boolean;
  highlightErrorLines: boolean;
}

export interface PlatformSettings {
  learningExperience: LearningExperienceSettings;
  codeEditor: CodeEditorSettings;
  advanced: AdvancedSettings;
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_LEARNING_EXPERIENCE: LearningExperienceSettings = {
  fontSize: 14,
  wordWrap: true,
  showLineNumbers: true,
  highlightActiveLine: true,
  showMatchingBrackets: true,
};

export const DEFAULT_CODE_EDITOR: CodeEditorSettings = {
  fontFamily: "monospace",
  tabSize: 4,
  indentationType: "spaces",
  fontLigatures: false,
};

export const DEFAULT_ADVANCED: AdvancedSettings = {
  performanceMode: false,
  minimap: false,
  highlightErrorLines: true,
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  learningExperience: DEFAULT_LEARNING_EXPERIENCE,
  codeEditor: DEFAULT_CODE_EDITOR,
  advanced: DEFAULT_ADVANCED,
};

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = "unlockmemory-platform-settings";

function loadSettings(): PlatformSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_PLATFORM_SETTINGS;
    const parsed = JSON.parse(saved);
    // Deep merge with defaults to handle new/migrated settings
    return {
      learningExperience: { ...DEFAULT_LEARNING_EXPERIENCE, ...(parsed.learningExperience ?? {}) },
      codeEditor: { ...DEFAULT_CODE_EDITOR, ...(parsed.codeEditor ?? {}) },
      advanced: { ...DEFAULT_ADVANCED, ...(parsed.advanced ?? {}) },
    };
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
}

function saveSettings(settings: PlatformSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

// ============================================================================
// Hook
// ============================================================================

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformSettings>(loadSettings);

  // Persist on change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Update a specific category
  const updateCategory = useCallback(
    <K extends keyof PlatformSettings>(
      category: K,
      updates: Partial<PlatformSettings[K]>
    ) => {
      setSettings((prev) => ({
        ...prev,
        [category]: { ...prev[category], ...updates },
      }));
    },
    []
  );

  // Reset a specific section
  const resetSection = useCallback((category: keyof PlatformSettings) => {
    const defaults: Record<keyof PlatformSettings, unknown> = {
      learningExperience: DEFAULT_LEARNING_EXPERIENCE,
      codeEditor: DEFAULT_CODE_EDITOR,
      advanced: DEFAULT_ADVANCED,
    };
    setSettings((prev) => ({
      ...prev,
      [category]: defaults[category],
    }));
  }, []);

  // Reset all settings
  const resetAll = useCallback(() => {
    setSettings(DEFAULT_PLATFORM_SETTINGS);
  }, []);

  // Computed Monaco editor options
  const monacoOptions = useMemo(() => {
    const { learningExperience, codeEditor, advanced } = settings;

    const fontFamilyMap: Record<string, string> = {
      default: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      monospace: "'Consolas', 'Courier New', monospace",
      serif: "'Georgia', 'Times New Roman', serif",
    };

    return {
      fontSize: learningExperience.fontSize,
      wordWrap: (learningExperience.wordWrap ? "on" : "off") as "on" | "off",
      lineNumbers: (learningExperience.showLineNumbers ? "on" : "off") as "on" | "off",
      renderLineHighlight: (learningExperience.highlightActiveLine ? "line" : "none") as "line" | "none",
      matchBrackets: (learningExperience.showMatchingBrackets ? "always" : "never") as "always" | "never",
      fontFamily: fontFamilyMap[codeEditor.fontFamily] || fontFamilyMap.default,
      tabSize: codeEditor.tabSize,
      insertSpaces: codeEditor.indentationType === "spaces",
      fontLigatures: codeEditor.fontLigatures,
      minimap: { enabled: advanced.minimap },
      // Performance mode: disables smooth animations for better responsiveness
      cursorBlinking: (advanced.performanceMode ? "solid" : "smooth") as "solid" | "smooth",
      cursorSmoothCaretAnimation: (advanced.performanceMode ? "off" : "on") as "off" | "on",
      smoothScrolling: !advanced.performanceMode,
      bracketPairColorization: { enabled: !advanced.performanceMode },
    };
  }, [settings]);

  return useMemo(
    () => ({
      settings,
      updateCategory,
      resetSection,
      resetAll,
      monacoOptions,
    }),
    [settings, updateCategory, resetSection, resetAll, monacoOptions]
  );
}

export type PlatformSettingsReturn = ReturnType<typeof usePlatformSettings>;
