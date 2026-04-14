import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const CODE_THEMES = [
  { value: "vscode", label: "VS Code", description: "Pure white background with VS Code syntax colors" },
  { value: "clean", label: "Clean Light", description: "Minimal white theme with colored syntax" },
  { value: "tomorrow", label: "Tomorrow Night", description: "Dark theme with muted colors" },
  { value: "okaidia", label: "Okaidia", description: "Monokai-inspired dark theme" },
  { value: "solarizedlight", label: "Solarized Light", description: "Light theme with warm tones" },
  { value: "coy", label: "Coy", description: "Light minimal theme" },
  { value: "twilight", label: "Twilight", description: "Dark purple-ish theme" },
  { value: "funky", label: "Funky", description: "Colorful gradient theme" },
  { value: "gray", label: "Gray", description: "Neutral gray dark theme" },
] as const;

export type CodeTheme = typeof CODE_THEMES[number]["value"];

export const useCodeTheme = () => {
  // Default to "tomorrow" — matches the DB column default (code_theme DEFAULT 'tomorrow')
  const [theme, setTheme] = useState<CodeTheme>("tomorrow");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheme = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("code_theme")
        .limit(1)
        .maybeSingle();

      if (data?.code_theme) {
        setTheme(data.code_theme as CodeTheme);
      }
      setLoading(false);
    };

    fetchTheme();
  }, []);

  return { theme, loading };
};

export default useCodeTheme;
