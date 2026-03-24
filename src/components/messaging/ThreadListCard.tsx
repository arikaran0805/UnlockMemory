import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ThreadStatusBadge, RoutingBadge } from "./ThreadStatusBadge";
import type { ConversationThread } from "@/hooks/useConversationThreads";

interface ThreadListCardProps {
  thread: ConversationThread;
  currentUserId: string;
  onOpen: (threadId: string) => void;
}

export function ThreadListCard({ thread, currentUserId, onOpen }: ThreadListCardProps) {
  const timeAgo = formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true });
  const [isLearnerTyping, setIsLearnerTyping] = useState(false);
  const autoExpireRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to typing events from the learner for this thread
  useEffect(() => {
    if (!thread.learner_user_id || !currentUserId) return;
    const channelKey = [thread.learner_user_id, currentUserId].sort().join("-");

    const channel = supabase
      .channel(`typing-${channelKey}`)
      .on("broadcast", { event: "typing_start" }, (payload) => {
        if (payload.payload?.user_id !== currentUserId) {
          setIsLearnerTyping(true);
          if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
          autoExpireRef.current = setTimeout(() => setIsLearnerTyping(false), 4000);
        }
      })
      .on("broadcast", { event: "typing_stop" }, (payload) => {
        if (payload.payload?.user_id !== currentUserId) {
          setIsLearnerTyping(false);
          if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
        }
      })
      .subscribe();

    return () => {
      if (autoExpireRef.current) clearTimeout(autoExpireRef.current);
      channel.unsubscribe();
    };
  }, [thread.learner_user_id, currentUserId]);

  return (
    <button
      onClick={() => onOpen(thread.id)}
      className={cn(
        "w-full text-left p-4 rounded-xl border border-border/40 bg-card",
        "hover:bg-muted/30 hover:border-border/60 hover:shadow-sm",
        "transition-all duration-200 ease-out group",
        (thread.unread_count ?? 0) > 0 && "border-primary/30 bg-primary/[0.02]"
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
          {(thread.unread_count ?? 0) > 0 && (
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

      {isLearnerTyping ? (
        <p className="text-xs text-primary flex items-center gap-1">
          <span>typing</span>
          <span className="flex gap-0.5 items-center">
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </span>
        </p>
      ) : thread.latest_message ? (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          <MessageCircle className="inline h-3 w-3 mr-1 opacity-50" />
          {thread.latest_message}
        </p>
      ) : null}

      {thread.assigned_moderator_name && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Assigned to: <span className="font-medium text-foreground">{thread.assigned_moderator_name}</span>
        </p>
      )}
    </button>
  );
}
