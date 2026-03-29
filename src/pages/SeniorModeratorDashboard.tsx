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
  FileText, Clock, CheckCircle, XCircle, Edit, Shield,
  AlertTriangle, MessageSquare, BookOpen, Flag, Eye,
  BarChart3, TrendingUp
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

const SeniorModeratorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    totalPosts: 0,
    totalCourses: 0,
    flaggedReports: 0,
    approvedThisWeek: 0,
  });
  const [workQueue, setWorkQueue] = useState<{
    pending: WorkQueueItem[];
    courses: WorkQueueItem[];
  }>({ pending: [], courses: [] });
  const [flaggedContent, setFlaggedContent] = useState<FlaggedItem[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
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
        .in("role", ["admin", "senior_moderator"]);

      if (roleError || !roleData || roleData.length === 0) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/");
        return;
      }

      setCurrentUserId(session.user.id);
      await Promise.all([
        fetchStats(session.user.id),
        fetchWorkQueue(),
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
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [pendingRes, postsRes, coursesRes, reportsRes, approvedRes] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("content_reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("approval_history").select("*", { count: "exact", head: true })
          .eq("action", "approved").gte("created_at", weekAgo.toISOString()),
      ]);

      setStats({
        pendingApprovals: pendingRes.count || 0,
        totalPosts: postsRes.count || 0,
        totalCourses: coursesRes.count || 0,
        flaggedReports: reportsRes.count || 0,
        approvedThisWeek: approvedRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchWorkQueue = async () => {
    try {
      const { data: pendingData } = await supabase
        .from("posts")
        .select(`id, title, status, created_at, profiles:author_id (full_name)`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: coursesData } = await supabase
        .from("courses")
        .select(`id, name, status, created_at`)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      const mapPosts = (data: any[]): WorkQueueItem[] =>
        (data || []).map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
          created_at: item.created_at,
          author_name: item.profiles?.full_name || "Unknown",
          content_type: "post" as const,
        }));

      const mapCourses = (data: any[]): WorkQueueItem[] =>
        (data || []).map((item) => ({
          id: item.id,
          title: item.name,
          status: item.status,
          created_at: item.created_at,
          author_name: "Course",
          content_type: "course" as const,
        }));

      setWorkQueue({
        pending: mapPosts(pendingData || []),
        courses: mapCourses(coursesData || []),
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
      fetchWorkQueue();
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
      fetchWorkQueue();
      fetchStats(currentUserId!);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
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
            <h1 className="text-3xl font-bold text-foreground">Course Manager</h1>
            <p className="text-muted-foreground">Manage courses, approvals, and structured learning content within your scope</p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Pending Approvals
                <Clock className="h-4 w-4 text-[#D4AF37]" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.pendingApprovals}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background border-blue-100 dark:border-blue-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total Posts
                <FileText className="h-4 w-4 text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalPosts}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background border-purple-100 dark:border-purple-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total Courses
                <BookOpen className="h-4 w-4 text-purple-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalCourses}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Flagged Reports
                <Flag className="h-4 w-4 text-red-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.flaggedReports}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Approved (Week)
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.approvedThisWeek}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Approval Queue */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#D4AF37]" />
                Approval Queue
              </CardTitle>
              <CardDescription>Content awaiting your review</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pending" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Posts ({workQueue.pending.length})
                  </TabsTrigger>
                  <TabsTrigger value="courses" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Courses ({workQueue.courses.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                  <ScrollArea className="h-[350px]">
                    {currentQueue.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                        <CheckCircle className="h-12 w-12 mb-4 text-emerald-500" />
                        <p className="text-lg font-medium">All caught up!</p>
                        <p className="text-sm">No items pending approval</p>
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
                              <Link to={item.content_type === "post" ? `/admin/posts/${item.id}` : `/admin/courses/${item.id}`}>
                                <Button variant="outline" size="sm" className="gap-1">
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                              </Link>
                              {item.content_type === "post" && (
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
                    <CheckCircle className="h-12 w-12 mb-4 text-emerald-500" />
                    <p className="text-lg font-medium">No flagged content</p>
                    <p className="text-sm">Everything looks clean</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flaggedContent.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.content_type}
                          </Badge>
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs">
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.reason || "No reason provided"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(item.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <Link to="/admin/reports">
                <Button variant="outline" className="w-full mt-4">
                  View All Reports
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Link to="/admin/approvals">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Clock className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-xs">Approvals</span>
                </Button>
              </Link>
              <Link to="/admin/posts">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <FileText className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-xs">Posts</span>
                </Button>
              </Link>
              <Link to="/admin/courses">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <BookOpen className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-xs">Courses</span>
                </Button>
              </Link>
              <Link to="/admin/comments">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <MessageSquare className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-xs">Comments</span>
                </Button>
              </Link>
              <Link to="/admin/reports">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Flag className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-xs">Reports</span>
                </Button>
              </Link>
              <Link to="/admin/analytics">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <BarChart3 className="h-5 w-5 text-[#D4AF37]" />
                  <span className="text-xs">Analytics</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SeniorModeratorDashboard;
