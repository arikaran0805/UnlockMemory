import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isPast, isFuture } from "date-fns";

interface AnnouncementBar {
  id: string;
  name: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  bg_color: string;
  text_color: string;
  is_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  target_type: string;
  target_ids: string[];
  audience: string;
}

interface AnnouncementBarProps {
  onVisibilityChange?: (visible: boolean) => void;
}

// Shared target → pathname matching constants
// Keep in sync with AdminAnnouncementBars TARGET_OPTIONS values
function matchesPath(bar: AnnouncementBar, pathname: string): boolean {
  // Normalise: strip trailing slash except root
  const p = pathname === "/" ? "/" : pathname.replace(/\/$/, "");

  switch (bar.target_type) {
    case "entire_site":
      return true;

    case "home":
      return p === "/" || p === "/home";

    case "all_courses":
      return p === "/courses" || p.startsWith("/courses/");

    case "specific_course":
      return (
        bar.target_ids.length > 0 &&
        bar.target_ids.some(
          (id) => p === `/courses/${id}` || p.startsWith(`/courses/${id}/`)
        )
      );

    case "all_careers":
      return (
        p === "/careers" ||
        p.startsWith("/careers/") ||
        p.startsWith("/career-board/")
      );

    case "specific_career":
      return (
        bar.target_ids.length > 0 &&
        bar.target_ids.some(
          (id) =>
            p === `/careers/${id}` ||
            p.startsWith(`/careers/${id}/`) ||
            p.startsWith(`/career-board/${id}`)
        )
      );

    case "pricing":
      return p === "/pricing" || p.startsWith("/pricing/");

    case "checkout":
      return p === "/checkout" || p.startsWith("/checkout/");

    case "admin":
      return p.startsWith("/admin");

    case "custom_path": {
      if (!bar.target_ids.length || !bar.target_ids[0]) return false;
      const pattern = bar.target_ids[0].trim();
      // If it starts with ^ or contains regex metacharacters, treat as regex
      const isRegex = /[\\^$.*+?()[\]{}|]/.test(pattern);
      if (isRegex) {
        try {
          return new RegExp(pattern).test(p);
        } catch {
          return false;
        }
      }
      // Otherwise exact match
      return p === pattern;
    }

    default:
      return true;
  }
}

function isWithinSchedule(bar: AnnouncementBar): boolean {
  if (bar.start_date && isFuture(new Date(bar.start_date))) return false;
  if (bar.end_date && isPast(new Date(bar.end_date))) return false;
  return true;
}

const DISMISS_KEY_PREFIX = "um_bar_dismissed_";

export const AnnouncementBar = ({ onVisibilityChange }: AnnouncementBarProps) => {
  const [activeBar, setActiveBar] = useState<AnnouncementBar | null>(null);
  // Cache fetched bars — avoids re-fetching on every navigation
  const barsRef = useRef<AnnouncementBar[]>([]);
  const location = useLocation();
  const { user } = useAuth();

  /**
   * Pure sync evaluation — reads from barsRef cache, no network call.
   * isLoggedIn passed as argument so this function doesn't depend on user ref.
   */
  const evaluate = useCallback(
    (pathname: string, isLoggedIn: boolean) => {
      const sorted = [...barsRef.current].sort((a, b) => b.priority - a.priority);

      for (const bar of sorted) {
        if (!bar.is_enabled) continue;
        if (!isWithinSchedule(bar)) continue;
        if (!matchesPath(bar, pathname)) continue;
        if (bar.audience === "logged_in" && !isLoggedIn) continue;
        if (bar.audience === "logged_out" && isLoggedIn) continue;
        if (localStorage.getItem(DISMISS_KEY_PREFIX + bar.id)) continue;

        setActiveBar(bar);
        onVisibilityChange?.(true);
        return;
      }

      setActiveBar(null);
      onVisibilityChange?.(false);
    },
    [onVisibilityChange]
  );

  /**
   * Fetch bars from DB.
   * Only runs on mount and when auth state changes (user?.id).
   * After fetch, evaluates the current pathname immediately.
   */
  useEffect(() => {
    let cancelled = false;
    const isLoggedIn = !!user;

    (async () => {
      const { data } = await (supabase as any)
        .from("announcement_bars")
        .select("*")
        .eq("is_enabled", true)
        .order("priority", { ascending: false });

      if (cancelled) return;

      barsRef.current = ((data as AnnouncementBar[]) || []).map((b) => ({
        ...b,
        target_ids: Array.isArray(b.target_ids) ? b.target_ids : [],
      }));

      evaluate(location.pathname, isLoggedIn);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // re-fetch only when auth changes

  /**
   * Re-evaluate when pathname changes — fast, no DB call, uses cache.
   */
  useEffect(() => {
    evaluate(location.pathname, !!user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleDismiss = () => {
    if (!activeBar) return;
    localStorage.setItem(DISMISS_KEY_PREFIX + activeBar.id, "1");
    setActiveBar(null);
    onVisibilityChange?.(false);
  };

  if (!activeBar) return null;

  const isExternalLink = activeBar.link_url?.startsWith("http");

  return (
    <div
      className="py-2 px-4 text-center text-sm font-medium relative"
      style={{ backgroundColor: activeBar.bg_color, color: activeBar.text_color }}
    >
      <div className="container mx-auto flex items-center justify-center gap-2">
        <span>{activeBar.message}</span>
        {activeBar.link_text && activeBar.link_url && (
          isExternalLink ? (
            <a
              href={activeBar.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold"
            >
              {activeBar.link_text}
            </a>
          ) : (
            <Link
              to={activeBar.link_url}
              className="underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold"
            >
              {activeBar.link_text}
            </Link>
          )
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-black/10"
        style={{ color: activeBar.text_color }}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
