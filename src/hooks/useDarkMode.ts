import { useTheme } from "next-themes";

/**
 * Thin wrapper around next-themes so the admin settings toggle
 * stays in sync with the rest of the app (ThemeToggle, etc.).
 *
 * Previously this hook directly mutated document.documentElement.classList
 * and used its own localStorage key — that caused the two systems to fight
 * and produce the dark-mode flicker. Now everything goes through next-themes.
 */
export function useDarkMode() {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  return { isDark, toggle, setIsDark: (dark: boolean) => setTheme(dark ? "dark" : "light") };
}
