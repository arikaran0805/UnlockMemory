import { useEffect, useRef, useLayoutEffect, useState, useCallback, Fragment } from "react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import UMLoader from "@/components/UMLoader";
import { ChevronDown, RotateCcw } from "lucide-react";
import type { ChatMessage } from "@/hooks/useMessaging";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading: boolean;
  senderName?: string;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  isOtherTyping?: boolean;
  onReopenConversation?: () => void;
  onStartNew?: () => void;
}

export function ChatMessageList({ messages, currentUserId, isLoading, senderName, onEditMessage, onDeleteMessage, isOtherTyping, onReopenConversation, onStartNew }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const prevMessageCount = useRef(0);
  const isAtBottomRef = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setPendingCount(0);
  }, []);

  // Track scroll position — depends on isLoading so the listener attaches after the container renders
  useEffect(() => {
    if (isLoading) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 80;
      isAtBottomRef.current = atBottom;
      setShowScrollDown(!atBottom);
      if (atBottom) setPendingCount(0);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [isLoading]);

  // Smart scroll: handles both initial load (instant) and new messages (smart)
  useLayoutEffect(() => {
    // Reset on new load cycle
    if (isLoading) {
      hasInitialScrolled.current = false;
      prevMessageCount.current = 0;
      return;
    }
    if (messages.length === 0) return;

    // First time messages are ready — instant jump to bottom
    if (!hasInitialScrolled.current) {
      scrollToBottom("instant" as ScrollBehavior);
      hasInitialScrolled.current = true;
      prevMessageCount.current = messages.length;
      return;
    }

    // New messages arrived
    if (messages.length <= prevMessageCount.current) return;
    const newCount = messages.length - prevMessageCount.current;
    prevMessageCount.current = messages.length;

    const lastMsg = messages[messages.length - 1];
    const isOwn = lastMsg?.sender_id === currentUserId;

    // Always scroll for own messages; only scroll for others if already at bottom
    if (isAtBottomRef.current || isOwn) {
      scrollToBottom("smooth");
    } else {
      setPendingCount((prev) => prev + newCount);
    }
  }, [isLoading, messages.length, currentUserId, scrollToBottom]);

  // If typing indicator appears and user is already at bottom, keep it in view
  useEffect(() => {
    if (isOtherTyping && isAtBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [isOtherTyping, scrollToBottom]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <UMLoader size={44} label="Unlocking memory…" />
      </div>
    );
  }

  if (messages.length === 0 && !isOtherTyping) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-3">
            <span className="text-xl">💬</span>
          </div>
          <p className="text-sm text-muted-foreground">Start the conversation</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Ask your question about this lesson</p>
        </div>
      </div>
    );
  }

  const showButton = showScrollDown || pendingCount > 0;

  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto">
        <div className="p-4 space-y-1">
          {messages.map((msg, idx) => {
            const messagesAfter = messages.slice(idx + 1);
            // In the learner view, the resolving system message can be "Doubt Cleared" or "Resolved" and is type "system" or "system_event"
            const isSystemResolved = (msg.message_type === "system" || msg.message_type === "system_event") &&
              (msg.message_text?.includes("Doubt Cleared") || msg.message_text?.includes("Resolved"));

            let showReopenButton = false;
            let hideMessage = false;

            if (isSystemResolved) {
              // Show reopen button ONLY if no messages come after it
              showReopenButton = messagesAfter.length === 0;

              // Hide the resolved break line entirely if there's a subsequent "reopened" message
              const hasReopenedAfter = messagesAfter.some(
                (m) => (m.message_type === "system" || m.message_type === "system_event") && m.message_text?.includes("Restarted")
              );
              if (hasReopenedAfter) {
                hideMessage = true;
              }
            }

            if (hideMessage) return null;

            return (
              <Fragment key={msg.id}>
                <ChatMessageBubble
                  message={msg}
                  isOwn={msg.sender_id === currentUserId}
                  senderName={msg.sender_id !== currentUserId ? senderName : undefined}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                />
                {showReopenButton && (onReopenConversation || onStartNew) && (
                  <div className="flex justify-center gap-2 py-2">
                    {onReopenConversation && (
                      <button
                        onClick={onReopenConversation}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reopen if uncleared; else start new.
                      </button>
                    )}
                    {onStartNew && (
                      <button
                        onClick={onStartNew}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-medium border border-border/40 bg-muted/40 text-muted-foreground hover:bg-muted/60 transition-colors"
                      >
                        Start New
                      </button>
                    )}
                  </div>
                )}
              </Fragment>
            );
          })}
          {isOtherTyping && <TypingIndicator label="Mentor is typing..." />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Smart scroll FAB — shows typing dots or unread count badge */}
      {showButton && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card border border-border/50 shadow-md flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 z-10"
          aria-label="Scroll to bottom"
        >
          {isOtherTyping ? (
            <div className="flex gap-0.5 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold text-primary leading-none">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
