import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConversationThreads } from "@/hooks/useConversationThreads";
import { ThreadListCard } from "@/components/messaging/ThreadListCard";
import UMLoader from "@/components/UMLoader";
import { MessageCircle, Inbox } from "lucide-react";

const SeniorModeratorMessageRequests = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const { threads, isLoading, markThreadRead } = useConversationThreads(userId, "senior_moderator", "all" as any);

  const handleOpenThread = (threadId: string) => {
    markThreadRead(threadId);
    navigate(`/senior-moderator/message-requests/${threadId}`);
  };

  const active = threads.filter(t => t.current_status !== "resolved");
  const resolved = threads.filter(t => t.current_status === "resolved");

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Message Requests</h1>
          <p className="text-muted-foreground">Learner questions for your team</p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <UMLoader size={44} label="Unlocking memory…" />
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Inbox className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">No team messages yet</p>
          <p className="text-xs text-muted-foreground">Unassigned team requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                Active · {active.length}
              </p>
              <div className="space-y-2">
                {active.map(thread => (
                  <ThreadListCard
                    key={thread.id}
                    thread={thread}
                    currentUserId={userId || ""}
                    onOpen={handleOpenThread}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                Resolved · {resolved.length}
              </p>
              <div className="space-y-2 opacity-70">
                {resolved.map(thread => (
                  <ThreadListCard
                    key={thread.id}
                    thread={thread}
                    currentUserId={userId || ""}
                    onOpen={handleOpenThread}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
};

export default SeniorModeratorMessageRequests;
