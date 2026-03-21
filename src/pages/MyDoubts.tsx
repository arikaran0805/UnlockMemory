import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDoubtSystem, type DoubtThread } from "@/hooks/useDoubtSystem";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { HelpCircle, BookOpen, FileText, MessageCircle, Clock, CheckCircle2, ArrowUpRight } from "lucide-react";

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  assigned: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  awaiting_assignment: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  waiting_for_learner: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const sourceIcons: Record<string, typeof BookOpen> = {
  lesson: BookOpen,
  post: FileText,
  course: BookOpen,
  quiz: HelpCircle,
  practice: HelpCircle,
};

const MyDoubts = () => {
  const { userId } = useAuth();
  const { myDoubts, isLoadingDoubts, fetchMyDoubts } = useDoubtSystem(userId);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    fetchMyDoubts(tab === "all" ? undefined : tab);
  }, [fetchMyDoubts, tab]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Doubts</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all your questions and their status</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoadingDoubts ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : myDoubts.length === 0 ? (
            <Card className="border-border/30">
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No doubts found</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Ask a doubt from any lesson or post to get help
                </p>
              </CardContent>
            </Card>
          ) : (
            myDoubts.map((doubt) => (
              <DoubtCard key={doubt.id} doubt={doubt} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

function DoubtCard({ doubt }: { doubt: DoubtThread }) {
  const Icon = sourceIcons[doubt.source_type] || HelpCircle;

  return (
    <Card className="border-border/30 hover:border-border/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground flex-shrink-0">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-foreground line-clamp-1">
                {doubt.source_title || "Untitled"}
              </p>
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-2 py-0.5 flex-shrink-0", statusColors[doubt.status] || statusColors.open)}
              >
                {doubt.status.replace(/_/g, " ")}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="capitalize">{doubt.source_type}</span>
              <span>·</span>
              {doubt.assigned_user_name && (
                <>
                  <span>Assigned to {doubt.assigned_user_name}</span>
                  <span>·</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(doubt.created_at), { addSuffix: true })}
              </span>
            </div>

            {doubt.routed_mode && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {doubt.routed_mode.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default MyDoubts;
