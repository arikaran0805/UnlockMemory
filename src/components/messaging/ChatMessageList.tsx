import { useEffect, useRef, useLayoutEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
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
  const isFirstLoad = useRef(true);
  const prevMessageCount = useRef(0);

  // Instant scroll on first load, smooth on new messages
  useLayoutEffect(() => {
    if (messages.length === 0) return;
    if (isFirstLoad.current) {
      // Use instant scroll on initial load to jump to bottom immediately
      bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      isFirstLoad.current = false;
    } else if (messages.length !== prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Also scroll when typing indicator appears
  useEffect(() => {
    if (isOtherTyping) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOtherTyping]);

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
    <ScrollArea className="flex-1">
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
    </ScrollArea>
  );
}
