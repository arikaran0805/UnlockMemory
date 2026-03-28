import { useState, useEffect } from "react";

const STORAGE_KEY = "um-admin-theme";

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "dark";
    // fallback: respect OS preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply / remove .dark class on <html> whenever isDark changes
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setIsDark(e.newValue === "dark");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggle = () => setIsDark((prev) => !prev);

  return { isDark, toggle, setIsDark };
}
