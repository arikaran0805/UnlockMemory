import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Minus, X, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnectionPresence, formatLastSeen } from "@/hooks/useConnectionPresence";
import type { ConnectionWithConversation } from "@/hooks/useMessaging";

interface ChatHeaderProps {
  connection: ConnectionWithConversation;
  onBack: () => void;
  onCollapse: () => void;
  onClose: () => void;
  isOtherTyping?: boolean;
  onProfileClick?: () => void;
}

export function ChatHeader({ connection, onBack, onCollapse, onClose, isOtherTyping, onProfileClick }: ChatHeaderProps) {
  const connectedUserId = (connection as any).connected_user_id;
  const presence = useConnectionPresence(connectedUserId);

  const statusText = isOtherTyping
    ? "typing..."
    : presence.is_online
      ? "Online"
      : formatLastSeen(presence.last_seen_at);

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30">
      <button
        onClick={onBack}
        className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="relative flex-shrink-0">
        <Avatar className="h-8 w-8 border border-border/20">
          <AvatarImage src={connection.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/8 text-primary text-xs font-medium">
            {connection.display_name?.charAt(0)?.toUpperCase() || "T"}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-card transition-colors duration-300",
            presence.is_online ? "bg-emerald-500" : "bg-muted-foreground/40"
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">
          {connection.display_name}
        </p>
        <p
          className={cn(
            "text-[11px] leading-tight mt-0.5 truncate transition-colors duration-200",
            isOtherTyping
              ? "text-emerald-500 font-medium"
              : presence.is_online
                ? "text-emerald-500"
                : "text-muted-foreground"
          )}
        >
          {statusText}
        </p>
      </div>

      <div className="flex items-center gap-0.5">
        <button className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button
          onClick={onCollapse}
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
