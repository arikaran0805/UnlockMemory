import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_INTERVAL = 30_000; // 30s
const IDLE_TIMEOUT = 60_000; // 60s

/**
 * Tracks the current user's online/offline presence.
 * Sets is_online=true on mount, heartbeats every 30s,
 * marks offline after 60s idle or on tab close.
 */
export function usePresence(userId: string | undefined) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOnlineRef = useRef(false);

  const setOnline = useCallback(async () => {
    if (!userId) return;
    isOnlineRef.current = true;
    await supabase
      .from("profiles")
      .update({ is_online: true, last_seen_at: new Date().toISOString() } as any)
      .eq("id", userId);
  }, [userId]);

  const setOffline = useCallback(async () => {
    if (!userId) return;
    isOnlineRef.current = false;
    await supabase
      .from("profiles")
      .update({ is_online: false, last_seen_at: new Date().toISOString() } as any)
      .eq("id", userId);
  }, [userId]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isOnlineRef.current && userId) {
      setOnline();
    }
    idleTimerRef.current = setTimeout(() => {
      setOffline();
    }, IDLE_TIMEOUT);
  }, [userId, setOnline, setOffline]);

  useEffect(() => {
    if (!userId) return;

    // Go online immediately
    setOnline();

    // Heartbeat
    heartbeatRef.current = setInterval(() => {
      if (isOnlineRef.current) {
        supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() } as any)
          .eq("id", userId)
          .then(() => {});
      }
    }, HEARTBEAT_INTERVAL);

    // Activity listeners
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    // Visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        setOffline();
      } else {
        setOnline();
        resetIdleTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Beforeunload
    const handleUnload = () => {
      // Use sendBeacon for reliability
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
      const body = JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() });
      navigator.sendBeacon?.(
        url,
        new Blob([body], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      setOffline();
    };
  }, [userId, setOnline, setOffline, resetIdleTimer]);
}
