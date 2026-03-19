import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useConversationThreads } from "@/hooks/useConversationThreads";
import { ThreadListCard } from "@/components/messaging/ThreadListCard";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Inbox } from "lucide-react";

type FilterTab = "all" | "unassigned" | "assigned" | "new" | "open" | "replied" | "resolved";

const SeniorModeratorMessageRequests = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>("all");
  const { threads, isLoading } = useConversationThreads(userId, "senior_moderator", filter as any);

  const handleOpenThread = (threadId: string) => {
    navigate(`/senior-moderator/message-requests/${threadId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Message Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Learner questions for your team
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-[#D97706]/10 flex items-center justify-center">
          <MessageCircle className="h-5 w-5 text-[#D97706]" />
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="replied">Replied</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/40">
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))
        ) : threads.length === 0 ? (
          <Card className="border-border/30 bg-card/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No team messages yet</p>
              <p className="text-xs text-muted-foreground">Unassigned team requests will appear here</p>
            </CardContent>
          </Card>
        ) : (
          threads.map((thread) => (
            <ThreadListCard
              key={thread.id}
              thread={thread}
              onOpen={handleOpenThread}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default SeniorModeratorMessageRequests;
