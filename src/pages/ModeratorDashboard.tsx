import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { 
  FileText, Clock, CheckCircle, XCircle, Edit, UserCheck,
  AlertTriangle, MessageSquare, Image, BookOpen, Flag, Eye
} from "lucide-react";
import { format } from "date-fns";

interface WorkQueueItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  author_name: string;
  content_type: "post" | "course";
}

interface FlaggedItem {
  id: string;
  content_type: string;
  reason: string;
  created_at: string;
  status: string;
}

const ModeratorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendingPosts: 0,
    assignedToMe: 0,
    flaggedComments: 0,
    approvedToday: 0,
  });
  const [workQueue, setWorkQueue] = useState<{
    assigned: WorkQueueItem[];
    pending: WorkQueueItem[];
    returned: WorkQueueItem[];
  }>({ assigned: [], pending: [], returned: [] });
  const [flaggedContent, setFlaggedContent] = useState<FlaggedItem[]>([]);
  const [activeTab, setActiveTab] = useState("assigned");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkModeratorAccess();
  }, []);

  const checkModeratorAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "moderator"]);

      if (roleError || !roleData || roleData.length === 0) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/");
        return;
      }

      setCurrentUserId(session.user.id);
      await Promise.all([
        fetchStats(session.user.id),
        fetchWorkQueue(session.user.id),
        fetchFlaggedContent(),
      ]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (userId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // My pending posts
      const { count: pendingPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", userId)
        .eq("status", "pending");

      // Posts assigned to me
      const { count: assignedToMe } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("assigned_to", userId)
        .in("status", ["draft", "pending", "changes_requested"]);

      // Flagged comments on my posts
      const { data: myPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", userId);

      let flaggedComments = 0;
      if (myPosts && myPosts.length > 0) {
        const { count } = await supabase
          .from("content_reports")
          .select("*", { count: "exact", head: true })
          .eq("content_type", "comment")
          .eq("status", "pending");
        flaggedComments = count || 0;
      }

      // Approved today (by me)
      const { count: approvedToday } = await supabase
        .from("approval_history")
        .select("*", { count: "exact", head: true })
        .eq("performed_by", userId)
        .eq("action", "approved")
        .gte("created_at", today.toISOString());

      setStats({
        pendingPosts: pendingPosts || 0,
        assignedToMe: assignedToMe || 0,
        flaggedComments,
        approvedToday: approvedToday || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchWorkQueue = async (userId: string) => {
    try {
      // Assigned to me
      const { data: assignedData } = await supabase
        .from("posts")
        .select(`
          id, title, status, created_at,
          profiles:author_id (full_name)
        `)
        .eq("assigned_to", userId)
        .in("status", ["draft", "pending"])
        .order("created_at", { ascending: false })
        .limit(10);

      // Pending approval (my posts)
      const { data: pendingData } = await supabase
        .from("posts")
        .select(`
          id, title, status, created_at,
          profiles:author_id (full_name)
        `)
        .eq("author_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      // Returned for edit
      const { data: returnedData } = await supabase
        .from("posts")
        .select(`
          id, title, status, created_at,
          profiles:author_id (full_name)
        `)
        .eq("author_id", userId)
        .eq("status", "changes_requested")
        .order("created_at", { ascending: false })
        .limit(10);

      const mapData = (data: any[]): WorkQueueItem[] =>
        (data || []).map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          created_at: item.created_at,
          author_name: item.profiles?.full_name || "Unknown",
          content_type: "post" as const,
        }));

      setWorkQueue({
        assigned: mapData(assignedData || []),
        pending: mapData(pendingData || []),
        returned: mapData(returnedData || []),
      });
    } catch (error) {
      console.error("Error fetching work queue:", error);
    }
  };

  const fetchFlaggedContent = async () => {
    try {
      const { data } = await supabase
        .from("content_reports")
        .select("id, content_type, reason, created_at, status")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);

      setFlaggedContent(data || []);
    } catch (error) {
      console.error("Error fetching flagged content:", error);
    }
  };

  const handleApprove = async (postId: string) => {
    try {
      await supabase
        .from("posts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", postId);

      await supabase.from("approval_history").insert({
        content_id: postId,
        content_type: "post",
        action: "approved",
        performed_by: currentUserId!,
      });

      toast({ title: "Post approved successfully" });
      fetchWorkQueue(currentUserId!);
      fetchStats(currentUserId!);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (postId: string) => {
    try {
      await supabase
        .from("posts")
        .update({ status: "changes_requested" })
        .eq("id", postId);

      await supabase.from("approval_history").insert({
        content_id: postId,
        content_type: "post",
        action: "rejected",
        performed_by: currentUserId!,
      });

      toast({ title: "Post returned for changes" });
      fetchWorkQueue(currentUserId!);
      fetchStats(currentUserId!);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      draft: "bg-neutral-200 text-content-secondary dark:bg-neutral-800 dark:text-content-muted",
      changes_requested: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    return (
      <Badge className={`${styles[status] || styles.draft} border-0`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  const currentQueue = workQueue[activeTab as keyof typeof workQueue] || [];

  return (
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content Moderator</h1>
            <p className="text-muted-foreground">Create, review, and manage content within assigned courses</p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Pending Posts
                <Clock className="h-4 w-4 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.pendingPosts}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Assigned to Me
                <FileText className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.assignedToMe}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Flagged Comments
                <Flag className="h-4 w-4 text-red-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.flaggedComments}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Approved Today
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.approvedToday}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* My Work Queue */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My Work Queue</CardTitle>
              <CardDescription>Content items requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="assigned" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Assigned ({workQueue.assigned.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending ({workQueue.pending.length})
                  </TabsTrigger>
                  <TabsTrigger value="returned" className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Returned ({workQueue.returned.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  <ScrollArea className="h-[350px]">
                    {currentQueue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mb-4 text-emerald-500" />
                        <p className="text-lg font-medium">All caught up!</p>
                        <p className="text-sm">No items in this queue</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentQueue.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{item.title}</h4>
                                {getStatusBadge(item.status)}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>By {item.author_name}</span>
                                <span>•</span>
                                <span>{format(new Date(item.created_at), "MMM d, yyyy")}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Link to={`/admin/posts/${item.id}`}>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                              </Link>
                              {activeTab === "assigned" && item.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(item.id)}
                                    className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleReject(item.id)}
                                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {activeTab === "returned" && (
                                <Link to={`/admin/posts/${item.id}`}>
                                  <Button size="sm" variant="outline" className="gap-1">
                                    <Edit className="h-3 w-3" />
                                    Edit
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Flagged Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Flagged Content
              </CardTitle>
              <CardDescription>Items reported by users</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                {flaggedContent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                    <CheckCircle className="h-10 w-10 mb-3 text-emerald-500" />
                    <p className="text-sm">No flagged content</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flaggedContent.map((item) => (
                      <div key={item.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {item.content_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "MMM d")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.reason || "No reason provided"}
                        </p>
                        <Link to="/admin/reports">
                          <Button variant="ghost" size="sm" className="mt-2 w-full">
                            Review
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Quick Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Tools</CardTitle>
            <CardDescription>Frequently used moderation actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to="/admin/posts">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Moderate Posts</span>
                </Button>
              </Link>
              <Link to="/admin/comments">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Moderate Comments</span>
                </Button>
              </Link>
              <Link to="/admin/media">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                  <Image className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Media Review</span>
                </Button>
              </Link>
              <Link to="/admin/courses">
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm">Course Content</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ModeratorDashboard;
