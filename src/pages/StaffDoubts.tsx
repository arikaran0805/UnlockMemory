import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  HelpCircle, BookOpen, FileText, MessageCircle, Clock,
  Search, Users, ArrowUpRight, UserPlus, CheckCircle2,
} from "lucide-react";

interface StaffDoubt {
  id: string;
  learner_user_id: string;
  source_type: string;
  source_id: string | null;
  source_title: string | null;
  routed_mode: string;
  assigned_user_id: string | null;
  current_owner_role: string | null;
  status: string;
  priority: string;
  conversation_thread_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  learner_name?: string;
  assigned_user_name?: string;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  assigned: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  escalated: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};

const StaffDoubts = () => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSeniorMod = location.pathname.startsWith("/senior-moderator");
  const basePath = isSeniorMod ? "/senior-moderator" : "/moderator";

  const [doubts, setDoubts] = useState<StaffDoubt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState("assigned");
  const [search, setSearch] = useState("");

  const fetchDoubts = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from("doubt_threads")
        .select("*")
        .order("updated_at", { ascending: false });

      if (tab === "assigned") {
        query = query.eq("assigned_user_id", userId).in("status", ["open", "assigned", "in_progress"]);
      } else if (tab === "escalated") {
        query = query.eq("status", "escalated");
      } else if (tab === "resolved") {
        query = query.eq("status", "resolved");
      } else {
        // all
        if (!isSeniorMod) {
          query = query.eq("assigned_user_id", userId);
        }
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const userIds = [
          ...new Set([
            ...data.map((d: any) => d.learner_user_id),
            ...data.map((d: any) => d.assigned_user_id).filter(Boolean),
          ]),
        ];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]));

        setDoubts(
          data.map((d: any) => ({
            ...d,
            learner_name: profileMap.get(d.learner_user_id) || "Unknown",
            assigned_user_name: profileMap.get(d.assigned_user_id) || undefined,
          }))
        );
      } else {
        setDoubts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, tab, isSeniorMod]);

  useEffect(() => {
    fetchDoubts();
  }, [fetchDoubts]);

  const filteredDoubts = search
    ? doubts.filter(
        (d) =>
          d.source_title?.toLowerCase().includes(search.toLowerCase()) ||
          d.learner_name?.toLowerCase().includes(search.toLowerCase())
      )
    : doubts;

  const handleDoubtClick = (doubt: StaffDoubt) => {
    if (doubt.conversation_thread_id) {
      navigate(`${basePath}/message-requests/${doubt.conversation_thread_id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Doubt Queue</h1>
          <p className="text-muted-foreground">Manage learner doubts and support requests</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by learner or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-border/30"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="assigned">My Assigned</TabsTrigger>
          {isSeniorMod && <TabsTrigger value="all">All Queue</TabsTrigger>}
          <TabsTrigger value="escalated">Escalated</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredDoubts.length === 0 ? (
            <Card className="border-border/30">
              <CardContent className="py-12 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No doubts in this queue</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredDoubts.map((doubt) => (
                <Card
                  key={doubt.id}
                  className="border-border/30 hover:border-border/50 cursor-pointer transition-all hover:shadow-sm"
                  onClick={() => handleDoubtClick(doubt)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted/40 text-muted-foreground flex-shrink-0">
                        <HelpCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {doubt.source_title || "Untitled Doubt"}
                          </p>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-2 py-0 flex-shrink-0",
                              statusColors[doubt.status] || statusColors.open
                            )}
                          >
                            {doubt.status.replace(/_/g, " ")}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 flex-shrink-0">
                            {doubt.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-medium">{doubt.learner_name}</span>
                          <span>·</span>
                          <span className="capitalize">{doubt.source_type}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(doubt.created_at), { addSuffix: true })}</span>
                          {doubt.assigned_user_name && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <UserPlus className="h-3 w-3" />
                                {doubt.assigned_user_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StaffDoubts;
