import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useConnectionPresence } from "@/hooks/useConnectionPresence";
import type { ConnectionWithConversation } from "@/hooks/useMessaging";

interface ConnectionListItemProps {
  connection: ConnectionWithConversation;
  currentUserId: string;
  onClick: () => void;
  onDelete?: (connectionId: string) => void;
}

export function ConnectionListItem({ connection, currentUserId, onClick, onDelete }: ConnectionListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const autoExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unread = connection.conversation?.unread_count_learner || 0;
  const preview = connection.conversation?.last_message_preview;
  const lastAt = connection.conversation?.last_message_at || connection.last_message_at;
  const connectedUserId = (connection as any).connected_user_id;
  const presence = useConnectionPresence(connectedUserId);

  // Subscribe to typing events for this connection (WhatsApp-style "typing..." in list)
  useEffect(() => {
    if (!connectedUserId || !currentUserId) return;
    const channelKey = [currentUserId, connectedUserId].sort().join("-");

    const channel = supabase
      .channel(`typing-${channelKey}`)
      .on("broadcast", { event: "typing_start" }, (payload) => {
        if (payload.payload?.user_id !== currentUserId) {
          setIsTyping(true);
          if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
          autoExpireRef.current = setTimeout(() => setIsTyping(false), 4000);
        }
      })
      .on("broadcast", { event: "typing_stop" }, (payload) => {
        if (payload.payload?.user_id !== currentUserId) {
          setIsTyping(false);
          if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
        }
      })
      .subscribe();

    return () => {
      if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
      channel.unsubscribe();
    };
  }, [connectedUserId, currentUserId]);

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
    <div
      className={cn(
        "group relative w-full flex items-center gap-3 px-4 py-3 text-left rounded-2xl transition-all duration-200 cursor-pointer",
        "hover:bg-muted/40 hover:shadow-sm",
        unread > 0 && "bg-primary/[0.03]"
      )}
      onClick={() => { if (!menuOpen) onClick(); }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11 border border-border/30">
          <AvatarImage src={connection.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/8 text-primary text-sm font-medium">
            {connection.display_name?.charAt(0)?.toUpperCase() || "T"}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card transition-colors duration-300",
            presence.is_online ? "bg-emerald-500" : "bg-muted-foreground/40"
          )}
        />
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
          <div className="flex items-center gap-1 flex-shrink-0">
            {lastAt && (
              <span className="text-[11px] text-muted-foreground">
                {formatTime(lastAt)}
              </span>
            )}
            {/* 3-dot menu */}
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "p-1 rounded-md hover:bg-muted/60 transition-all duration-150 text-muted-foreground hover:text-foreground",
                    menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  aria-label="More options"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4} className="w-36 rounded-xl z-[100]" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(connection.id);
                    setMenuOpen(false);
                  }}
                  className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-[18px] bg-muted/60 text-muted-foreground font-normal flex-shrink-0"
            >
              {connection.role_label}
            </Badge>
            {isTyping ? (
              <span className="text-xs text-primary flex items-center gap-1">
                <span>typing</span>
                <span className="flex gap-0.5 items-center">
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                </span>
              </span>
            ) : preview ? (
              <span className={cn(
                "text-xs truncate",
                unread > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"
              )}>
                {preview}
              </span>
            ) : null}
          </div>
          {unread > 0 && (
            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {unread > 9 ? "9+" : unread}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
