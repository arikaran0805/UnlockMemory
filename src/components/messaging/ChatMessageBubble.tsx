import { cn } from "@/lib/utils";
import { Paperclip, Check, CheckCheck } from "lucide-react";
import type { ChatMessage } from "@/hooks/useMessaging";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export function ChatMessageBubble({ message, isOwn }: ChatMessageBubbleProps) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (message.message_type === "system") {
    return (
      <div className="flex justify-center py-2">
        <span className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
          {message.message_text}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex mb-2", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
          "transition-shadow duration-200",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-lg"
            : "bg-muted/50 text-foreground rounded-bl-lg border border-border/20"
        )}
      >
        {/* Attachment */}
        {message.attachment_url && (
          <a
            href={message.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 mb-1 text-xs underline-offset-2 hover:underline",
              isOwn ? "text-primary-foreground/90" : "text-primary"
            )}
          >
            <Paperclip className="h-3 w-3" />
            {message.attachment_name || "Attachment"}
          </a>
        )}

        {/* Text */}
        {message.message_text && (
          <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
        )}

        {/* Meta */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
        )}>
          <span className="text-[10px]">{time}</span>
          {isOwn && (
            message.is_read
              ? <CheckCheck className="h-3 w-3" />
              : <Check className="h-3 w-3" />
          )}
        </div>
      </div>
    </div>
  );
}
