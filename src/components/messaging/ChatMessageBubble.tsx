import { useState } from "react";
import { cn } from "@/lib/utils";
import { Paperclip, Check, CheckCheck, Pencil, Trash2, X, Check as CheckIcon, FileText, File, Download, RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VoiceMessageBubble } from "./VoiceMessageBubble";
import { ImageLightbox } from "./ImageLightbox";
import type { ChatMessage } from "@/hooks/useMessaging";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  senderName?: string;
  onEdit?: (messageId: string, newText: string) => void;
  onDelete?: (messageId: string) => void;
}

const formatSize = (bytes: number | null | undefined) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ChatMessageBubble({ message, isOwn, senderName, onEdit, onDelete }: ChatMessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.message_text || "");
  const [showActions, setShowActions] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Treat is_read as a persistent "seen" fallback — delivery_status may lag on refresh
  const deliveryStatus = (message.delivery_status === "seen" || message.is_read)
    ? "seen"
    : (message.delivery_status || "sent");
  const msgType = message.message_type || "text";

  if (msgType === "system") {
    const isResolved = message.message_text?.includes("Doubt Cleared") || message.message_text?.includes("Resolved");
    const isReopened = message.message_text?.includes("Restarted");
    if (isReopened) {
      return (
        <div className="flex items-center gap-3 py-4">
          <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/40" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/30 flex-shrink-0">
            <RotateCcw className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap">
              {message.message_text}
            </span>
          </div>
          <div className="flex-1 h-px bg-amber-200 dark:bg-amber-800/40" />
        </div>
      );
    }
    if (isResolved) {
      return (
        <div className="flex flex-col items-center py-4">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-800/40" />
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 flex-shrink-0">
              <CheckCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                {(message.message_text || "").replace(/^✓\s*/, "")} · {time}
              </span>
            </div>
            <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-800/40" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex justify-center py-2">
        <span className="text-[11px] text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
          {message.message_text}
        </span>
      </div>
    );
  }

  const formatSeenTime = (ts: string | null | undefined) => {
    if (!ts) return "";
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderStatusIcon = () => {
    if (!isOwn) return null;
    const icon = (() => {
      switch (deliveryStatus) {
        case "seen":
          return <CheckCheck className="h-3 w-3 text-[#34B7F1] transition-colors duration-300" />;
        case "delivered":
          return <CheckCheck className="h-3 w-3 text-gray-400 transition-colors duration-300" />;
        case "sent":
        default:
          return <Check className="h-3 w-3 text-gray-400 transition-colors duration-300" />;
      }
    })();

    const tooltipText =
      deliveryStatus === "seen"
        ? `Seen at ${formatSeenTime(message.seen_at)}`
        : deliveryStatus === "delivered"
          ? `Delivered at ${formatSeenTime(message.delivered_at)}`
          : "Sent";

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default">{icon}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px] px-2 py-1">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Determine if this is an image attachment
  const isImage = msgType === "image" || (message.attachment_url && (message.attachment_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i)));
  const isVoice = msgType === "voice";
  const isFileAttachment = msgType === "file" || (msgType === "attachment" && !isImage && !isVoice);

  const renderContent = () => {
    // Voice message
    if (isVoice && message.attachment_url) {
      return (
        <VoiceMessageBubble
          url={message.attachment_url}
          duration={(message as any).voice_duration_seconds || 0}
          isOwn={isOwn}
        />
      );
    }

    // Image message
    if (isImage && message.attachment_url) {
      return (
        <>
          <img
            src={message.attachment_url}
            alt={message.attachment_name || "Image"}
            className="rounded-xl max-w-full max-h-[200px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setShowLightbox(true)}
          />
          {message.message_text && (
            <p className="whitespace-pre-wrap break-words mt-1.5">{message.message_text}</p>
          )}
          {showLightbox && (
            <ImageLightbox
              src={message.attachment_url}
              alt={message.attachment_name || "Image"}
              onClose={() => setShowLightbox(false)}
            />
          )}
        </>
      );
    }

    // File attachment
    if (isFileAttachment && message.attachment_url) {
      const ext = message.attachment_name?.split(".").pop()?.toUpperCase() || "FILE";
      const isPdf = ext === "PDF";
      const Icon = isPdf ? FileText : File;

      return (
        <a
          href={message.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2.5 p-2 rounded-xl transition-colors",
            isOwn ? "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15" : "bg-muted/40 hover:bg-muted/60"
          )}
        >
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
            isOwn ? "bg-black/10 dark:bg-white/20" : "bg-primary/10"
          )}>
            <Icon className={cn("h-4 w-4", isOwn ? "text-gray-700 dark:text-gray-200" : "text-primary")} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs font-medium truncate", isOwn ? "text-gray-900 dark:text-gray-100" : "text-foreground")}>
              {message.attachment_name || "File"}
            </p>
            <p className={cn("text-[10px]", isOwn ? "text-gray-500 dark:text-gray-400" : "text-muted-foreground")}>
              {ext} {formatSize((message as any).attachment_size)}
            </p>
          </div>
          <Download className={cn("h-3.5 w-3.5 flex-shrink-0", isOwn ? "text-gray-500 dark:text-gray-400" : "text-muted-foreground")} />
        </a>
      );
    }

    // Legacy attachment link
    if (message.attachment_url) {
      return (
        <>
          <a
            href={message.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-2 mb-1 text-xs underline-offset-2 hover:underline",
              isOwn ? "text-gray-800 dark:text-gray-200" : "text-primary"
            )}
          >
            <Paperclip className="h-3 w-3" />
            {message.attachment_name || "Attachment"}
          </a>
          {message.message_text && (
            <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
          )}
        </>
      );
    }

    // Text editing
    if (isEditing) {
      return (
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
              className="p-1 rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive"
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
              className="p-1 rounded-md bg-background/80 hover:bg-background text-primary"
            >
              <CheckIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // Plain text
    return message.message_text ? (
      <p className="whitespace-pre-wrap break-words">{message.message_text}</p>
    ) : null;
  };

  return (
    <div
      className={cn("flex mb-2 group relative", isOwn ? "justify-end" : "justify-start")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { if (!isEditing) setShowActions(false); }}
    >
      {/* Action buttons for own messages */}
      {isOwn && showActions && !isEditing && msgType !== "system" && (
        <div className="flex items-center gap-0.5 mr-1 self-center">
          {onEdit && message.message_text && msgType === "text" && (
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
            ? "bg-[#DCF8C6] dark:bg-[#005C4B] text-gray-900 dark:text-gray-100 rounded-br-lg"
            : "bg-muted/50 text-foreground rounded-bl-lg border border-border/20",
          isImage && "p-1.5"
        )}
      >
        {!isOwn && senderName && (
          <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{senderName}</p>
        )}
        {renderContent()}

        {/* Meta */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          isOwn ? "text-gray-500 dark:text-gray-400" : "text-muted-foreground",
          isImage && "px-2"
        )}>
          <span className="text-[10px]">{time}</span>
          {renderStatusIcon()}
        </div>
      </div>
    </div>
  );
}
