import { useState } from "react";
import { cn } from "@/lib/utils";
import { Paperclip, Check, CheckCheck, Pencil, Trash2, X, Check as CheckIcon } from "lucide-react";
import type { ChatMessage } from "@/hooks/useMessaging";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
}

export function ChatMessageBubble({ message, isOwn, onEdit, onDelete }: ChatMessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message_text || "");
  const [showActions, setShowActions] = useState(false);

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
    <div
      className={cn("flex mb-2 group relative", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!isEditing) setShowActions(false); }}
    >
      {/* Action buttons for own messages */}
      {isOwn && showActions && !isEditing && message.message_type !== "system" && (
        <div className="flex items-center gap-0.5 mr-1 self-center">
          {onEdit && message.message_text && (
            <button
              onClick={() => { setIsEditing(true); setEditText(message.message_text || ""); }}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
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
        {isEditing ? (
          <div className="space-y-1.5">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-background/80 text-foreground text-sm rounded-lg px-2 py-1.5 border border-border/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              rows={2}
              autoFocus
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  if (editText.trim() && onEdit) {
                    onEdit(message.id, editText.trim());
                    setIsEditing(false);
                  }
                }}
                className="p-1 rounded-md hover:bg-primary/20 text-primary"
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : message.message_text ? (
          <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
        ) : null}

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
