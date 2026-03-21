import { useEffect, useRef, useLayoutEffect, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown } from "lucide-react";
import type { ChatMessage } from "@/hooks/useMessaging";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading: boolean;
  onEditMessage?: (messageId: string, newText: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  isOtherTyping?: boolean;
}

export function ChatMessageList({ messages, currentUserId, isLoading, onEditMessage, onDeleteMessage, isOtherTyping }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const prevMessageCount = useRef(0);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // Track scroll position to show/hide the button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollDown(distanceFromBottom > 120);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length]);

  // Instant scroll on first load, smooth on new messages
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (isFirstLoad.current) {
      scrollToBottom("instant" as ScrollBehavior);
      isFirstLoad.current = false;
    } else if (messages.length !== prevMessageCount.current) {
      scrollToBottom("smooth");
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Also scroll when typing indicator appears
  useEffect(() => {
    if (isOtherTyping) {
      scrollToBottom("smooth");
    }
  }, [isOtherTyping, scrollToBottom]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
            <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-40"}`} />
          </div>
        ))}
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
          <p className="text-sm text-muted-foreground">
            Start the conversation
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Ask your question about this lesson
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <div ref={scrollContainerRef} className="h-full overflow-y-auto">
        <div className="p-4 space-y-1">
          {messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
            />
          ))}
          {isOtherTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollDown && (
        <button
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-card border border-border/50 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 z-10"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
