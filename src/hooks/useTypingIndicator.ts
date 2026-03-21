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
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const autoExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to typing events on this conversation
  useEffect(() => {
    if (!conversationId || !userId) return;

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
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
    };
  }, [conversationId, userId]);

  // Emit typing start (debounced)
  const emitTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current.send({
        type: "broadcast",
        event: "typing_start",
        payload: { user_id: userId },
      });
    }

    // Reset stop timer
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      channelRef.current?.send({
        type: "broadcast",
        event: "typing_stop",
        payload: { user_id: userId },
      });
    }, TYPING_DEBOUNCE);
  }, [userId]);

  // Force stop (call on message send)
  const stopTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    isTypingRef.current = false;
    channelRef.current.send({
      type: "broadcast",
      event: "typing_stop",
      payload: { user_id: userId },
    });
  }, [userId]);

  return { isOtherTyping, emitTyping, stopTyping };
}
