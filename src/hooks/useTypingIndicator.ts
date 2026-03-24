import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const TYPING_DEBOUNCE = 1500; // ms before emitting typing_stop

/**
 * Ephemeral typing indicator using Supabase Realtime presence.
 * No DB writes — purely in-memory via broadcast channels.
 */
export function useTypingIndicator(
  conversationId: string | null,
  userId: string | undefined
) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitRef = useRef<number>(0);
  const autoExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the user is mid-typing while channel is still connecting
  const pendingTypingRef = useRef(false);

  // Subscribe to typing events on this conversation
  useEffect(() => {
    if (!conversationId || !userId) return;

    isSubscribedRef.current = false;
    pendingTypingRef.current = false;

    const channel = supabase.channel(`typing-${conversationId}`);

    channel
      .on("broadcast", { event: "typing_start" }, (payload) => {
        if (payload.payload?.user_id !== userId) {
          setIsOtherTyping(true);
          // Auto-expire after 4s if no follow-up
          if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
          autoExpireRef.current = setTimeout(() => setIsOtherTyping(false), 4000);
        }
      })
      .on("broadcast", { event: "typing_stop" }, (payload) => {
        if (payload.payload?.user_id !== userId) {
          setIsOtherTyping(false);
          if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
        }
      })
      .subscribe((status) => {
        isSubscribedRef.current = status === "SUBSCRIBED";
        // If keystrokes arrived before the handshake completed, flush now
        if (status === "SUBSCRIBED" && pendingTypingRef.current) {
          pendingTypingRef.current = false;
          lastEmitRef.current = Date.now();
          channelRef.current?.send({
            type: "broadcast",
            event: "typing_start",
            payload: { user_id: userId },
          });
        }
      });

    channelRef.current = channel;

    return () => {
      isSubscribedRef.current = false;
      pendingTypingRef.current = false;
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [conversationId, userId]);

  // Emit typing start — throttled to once per 300ms so missed events self-heal on the next keystroke
  const emitTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;

    // Channel not ready yet — mark pending so we flush on SUBSCRIBED
    if (!isSubscribedRef.current) {
      pendingTypingRef.current = true;
      // Still set up the stop timer so it fires correctly
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        pendingTypingRef.current = false;
        lastEmitRef.current = 0;
      }, TYPING_DEBOUNCE);
      return;
    }

    const now = Date.now();
    if (now - lastEmitRef.current > 300) {
      lastEmitRef.current = now;
      channelRef.current.send({
        type: "broadcast",
        event: "typing_start",
        payload: { user_id: userId },
      });
    }

    // Reset stop timer — fires 1500ms after last keystroke
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      lastEmitRef.current = 0;
      channelRef.current?.send({
        type: "broadcast",
        event: "typing_stop",
        payload: { user_id: userId },
      });
    }, TYPING_DEBOUNCE);
  }, [userId]);

  // Force stop (call on message send)
  const stopTyping = useCallback(() => {
    pendingTypingRef.current = false;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    lastEmitRef.current = 0;
    if (!channelRef.current || !userId || !isSubscribedRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing_stop",
      payload: { user_id: userId },
    });
  }, [userId]);

  return { isOtherTyping, emitTyping, stopTyping };
}
