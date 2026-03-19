import { formatDistanceToNow } from "date-fns";
import { MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThreadStatusBadge, RoutingBadge } from "./ThreadStatusBadge";
import type { ConversationThread } from "@/hooks/useConversationThreads";

interface ThreadListCardProps {
  thread: ConversationThread;
  onOpen: (threadId: string) => void;
}

export function ThreadListCard({ thread, onOpen }: ThreadListCardProps) {
  const timeAgo = formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true });

  return (
    <button
      onClick={() => onOpen(thread.id)}
      className={cn(
        "w-full text-left p-4 rounded-xl border border-border/40 bg-card",
        "hover:bg-muted/30 hover:border-border/60 hover:shadow-sm",
        "transition-all duration-200 ease-out group",
        thread.unread_count && thread.unread_count > 0 && "border-primary/30 bg-primary/[0.02]"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {thread.learner_name}
            </p>
            {thread.post_title && (
              <p className="text-xs text-muted-foreground truncate">
                {thread.post_title}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {thread.unread_count && thread.unread_count > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {thread.unread_count}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <ThreadStatusBadge status={thread.current_status} />
        <RoutingBadge type={thread.routing_type} />
        {thread.team_name && (
          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            {thread.team_name}
          </span>
        )}
      </div>

      {thread.latest_message && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          <MessageCircle className="inline h-3 w-3 mr-1 opacity-50" />
          {thread.latest_message}
        </p>
      )}

      {thread.assigned_moderator_name && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Assigned to: <span className="font-medium text-foreground">{thread.assigned_moderator_name}</span>
        </p>
      )}
    </button>
  );
}
