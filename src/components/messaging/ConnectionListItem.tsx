import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConnectionWithConversation } from "@/hooks/useMessaging";

interface ConnectionListItemProps {
  connection: ConnectionWithConversation;
  onClick: () => void;
}

export function ConnectionListItem({ connection, onClick }: ConnectionListItemProps) {
  const unread = connection.conversation?.unread_count_learner || 0;
  const preview = connection.conversation?.last_message_preview;
  const lastAt = connection.conversation?.last_message_at || connection.last_message_at;

  const formatTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left rounded-2xl transition-all duration-200",
        "hover:bg-muted/40 hover:shadow-sm",
        unread > 0 && "bg-primary/[0.03]"
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11 border border-border/30">
          <AvatarImage src={connection.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/8 text-primary text-sm font-medium">
            {connection.display_name?.charAt(0)?.toUpperCase() || "T"}
          </AvatarFallback>
        </Avatar>
        {/* Online dot */}
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-primary border-2 border-card" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-sm truncate",
            unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground"
          )}>
            {connection.display_name}
          </span>
          {lastAt && (
            <span className="text-[11px] text-muted-foreground flex-shrink-0">
              {formatTime(lastAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-[18px] bg-muted/60 text-muted-foreground font-normal flex-shrink-0"
            >
              {connection.role_label}
            </Badge>
            {preview && (
              <span className={cn(
                "text-xs truncate",
                unread > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"
              )}>
                {preview}
              </span>
            )}
          </div>
          {unread > 0 && (
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {unread > 9 ? "9+" : unread}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
