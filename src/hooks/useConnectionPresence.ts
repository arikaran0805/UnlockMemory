import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PresenceState {
  is_online: boolean;
  last_seen_at: string | null;
}

/**
 * Tracks online/offline status of a specific user (the other person in the chat).
 * Uses realtime subscription on profiles table.
 */
export function useConnectionPresence(connectedUserId: string | undefined) {
  const [presence, setPresence] = useState<PresenceState>({
    is_online: false,
    last_seen_at: null,
  });

  // Initial fetch
  const fetchPresence = useCallback(async () => {
    if (!connectedUserId) return;
    const { data } = await supabase
      .from("profiles")
      .select("is_online, last_seen_at")
      .eq("id", connectedUserId)
      .single();
    if (data) {
      setPresence({
        is_online: (data as any).is_online ?? false,
        last_seen_at: (data as any).last_seen_at ?? null,
      });
    }
  }, [connectedUserId]);

  useEffect(() => {
    if (!connectedUserId) return;
    fetchPresence();

    // Realtime subscription for presence changes
    const channel = supabase
      .channel(`presence-${connectedUserId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${connectedUserId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setPresence({
            is_online: row.is_online ?? false,
            last_seen_at: row.last_seen_at ?? null,
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [connectedUserId, fetchPresence]);

  return presence;
}

/**
 * Formats last_seen_at into a human-readable string.
 */
export function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "Offline";
  const d = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `Last seen ${diffHrs}h ago`;
  return `Last seen ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
