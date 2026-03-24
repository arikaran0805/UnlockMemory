import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { 
  Users, FileText, AlertTriangle, TrendingUp, TrendingDown, 
  DollarSign, Shield, Settings, Trash2, UserCog,
  Activity, Clock, Eye, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { format, subDays } from "date-fns";
import UMLoader from "@/components/UMLoader";

interface ActivityLog {
  id: string;
  action: string;
  performed_by: string;
  content_type: string;
  created_at: string;
  profile?: { full_name: string | null };
}

interface TrendData {
  current: number;
  previous: number;
  change: number;
  trend: "up" | "down" | "neutral";
  percentage: number;
}

interface KpiTrendStats {
  totalUsers: TrendData;
  activeUsers: TrendData;
  totalPosts: TrendData;
  pendingApprovals: TrendData;
  reportedContent: TrendData;
  revenue: TrendData;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState<KpiTrendStats>({
    totalUsers: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    activeUsers: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    totalPosts: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    pendingApprovals: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    reportedContent: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    revenue: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
  });
  const [criticalAlerts, setCriticalAlerts] = useState<{
    pendingPosts: number;
    deleteRequests: number;
    reportedComments: number;
  }>({ pendingPosts: 0, deleteRequests: 0, reportedComments: 0 });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState({
    newUsersThisWeek: 0,
    postsPerDay: 0,
    avgApprovalTime: "< 24h",
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
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
        .eq("role", "admin");

      if (roleError || !roleData || roleData.length === 0) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/admin");
        return;
      }

      await Promise.all([
        fetchStats(),
        fetchCriticalAlerts(),
        fetchActivityLogs(),
        fetchAnalyticsSnapshot(),
      ]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const calculateTrend = (current: number, previous: number): TrendData => {
    const change = current - previous;
    if (change === 0) return { current, previous, change: 0, trend: "neutral", percentage: 0 };
    const percentage = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((Math.abs(change) / previous) * 100);
    return {
      current,
      previous,
      change,
      trend: change > 0 ? "up" : "down",
      percentage,
    };
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      const oneDayAgo = subDays(now, 1);
      const twoDaysAgo = subDays(now, 2);
      const sevenDaysAgo = subDays(now, 7);
      const fourteenDaysAgo = subDays(now, 14);

      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Users created in last 7 days vs previous 7 days
      const { count: newUsersThisWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      const { count: newUsersPrevWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());

      // Active users this week vs previous week
      const { count: activeUsersThisWeek } = await supabase
        .from("lesson_progress")
        .select("user_id", { count: "exact", head: true })
        .gte("viewed_at", sevenDaysAgo.toISOString());

      const { count: activeUsersPrevWeek } = await supabase
        .from("lesson_progress")
        .select("user_id", { count: "exact", head: true })
        .gte("viewed_at", fourteenDaysAgo.toISOString())
        .lt("viewed_at", sevenDaysAgo.toISOString());

      // Total posts
      const { count: totalPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true });

      const { count: postsThisWeek } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      const { count: postsPrevWeek } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fourteenDaysAgo.toISOString())
        .lt("created_at", sevenDaysAgo.toISOString());

      // Pending approvals - today vs yesterday
      const { count: pendingApprovalsNow } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Reported content - today vs yesterday
      const { count: reportedContentNow } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: reportsAddedToday } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneDayAgo.toISOString());

      const { count: reportsResolvedToday } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .neq("status", "pending")
        .gte("updated_at", oneDayAgo.toISOString());

      // Calculate reported content trend based on net change today
      const reportedNetChange = (reportsAddedToday || 0) - (reportsResolvedToday || 0);

      setStats({
        totalUsers: calculateTrend(totalUsers || 0, (totalUsers || 0) - (newUsersThisWeek || 0)),
        activeUsers: calculateTrend(activeUsersThisWeek || 0, activeUsersPrevWeek || 0),
        totalPosts: {
          ...calculateTrend(totalPosts || 0, (totalPosts || 0) - (postsThisWeek || 0)),
          change: postsThisWeek || 0,
        },
        pendingApprovals: {
          current: pendingApprovalsNow || 0,
          previous: 0,
          change: pendingApprovalsNow || 0,
          trend: (pendingApprovalsNow || 0) > 0 ? "up" : "neutral",
          percentage: 0,
        },
        reportedContent: {
          current: reportedContentNow || 0,
          previous: 0,
          change: reportedNetChange,
          trend: reportedNetChange > 0 ? "up" : reportedNetChange < 0 ? "down" : "neutral",
          percentage: 0,
        },
        revenue: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchCriticalAlerts = async () => {
    try {
      const { count: pendingPosts } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: deleteRequests } = await supabase
        .from("delete_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: reportedComments } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("content_type", "comment");

      setCriticalAlerts({
        pendingPosts: pendingPosts || 0,
        deleteRequests: deleteRequests || 0,
        reportedComments: reportedComments || 0,
      });
    } catch (error) {
      console.error("Error fetching critical alerts:", error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data } = await supabase
        .from("approval_history")
        .select(`
          id,
          action,
          performed_by,
          content_type,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        // Fetch profile names for each log entry
        const profileIds = [...new Set(data.map(log => log.performed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
        
        setActivityLogs(data.map(log => ({
          ...log,
          profile: { full_name: profileMap.get(log.performed_by) || "Unknown User" }
        })));
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  const fetchAnalyticsSnapshot = async () => {
    try {
      const sevenDaysAgo = subDays(new Date(), 7);
      
      const { count: newUsersThisWeek } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      const { count: postsThisWeek } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      setAnalyticsSnapshot({
        newUsersThisWeek: newUsersThisWeek || 0,
        postsPerDay: Math.round((postsThisWeek || 0) / 7),
        avgApprovalTime: "< 24h",
      });
    } catch (error) {
      console.error("Error fetching analytics snapshot:", error);
    }
  };

  // KPI Trend Indicator Component
  interface TrendIndicatorProps {
    data: TrendData;
    type: "users" | "active" | "posts" | "pending" | "reported" | "revenue";
    invertColors?: boolean;
  }

  const KpiTrendIndicator = ({ data, type, invertColors = false }: TrendIndicatorProps) => {
    const { trend, change, percentage } = data;

    // For pending and reported, increase is bad (red), decrease is good (green)
    const isPositive = invertColors ? trend === "down" : trend === "up";
    const isNegative = invertColors ? trend === "up" : trend === "down";

    const colorClass = isPositive 
      ? "text-emerald-600 dark:text-emerald-400" 
      : isNegative 
        ? "text-red-500 dark:text-red-400" 
        : "text-muted-foreground";

    const formatChange = () => {
      const sign = change > 0 ? "+" : "";
      switch (type) {
        case "users":
          return `${sign}${change} this week`;
        case "active":
          if (percentage > 0) return `${sign}${percentage}% vs last week`;
          return `${sign}${change} users`;
        case "posts":
          if (percentage > 0) return `${sign}${change} this week (+${percentage}%)`;
          return `${sign}${change} this week`;
        case "pending":
          if (change > 0) return `+${change} today`;
          if (change < 0) return `${change} resolved`;
          return "No change";
        case "reported":
          if (change > 0) return `+${change} today`;
          if (change < 0) return `${Math.abs(change)} resolved`;
          return "No change";
        case "revenue":
          if (change === 0) return "No change";
          return `${sign}$${Math.abs(change).toLocaleString()} this month`;
        default:
          return `${sign}${change}`;
      }
    };

    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

    return (
      <div 
        className={`flex items-center gap-1 text-xs mt-1 ${colorClass}`}
        title="Compared to previous period"
      >
        {TrendIcon && <TrendIcon className="h-3 w-3" />}
        {trend === "neutral" && <span className="text-muted-foreground">—</span>}
        <span>{formatChange()}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <UMLoader size={56} dark label="Loading…" />
      </div>
    );
  }

  const totalCriticalAlerts = criticalAlerts.pendingPosts + criticalAlerts.deleteRequests + criticalAlerts.reportedComments;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Platform overview & system control</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total Users
                <Users className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalUsers.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.totalUsers} type="users" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Active Users (7d)
                <Activity className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.activeUsers.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.activeUsers} type="active" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Total Posts
                <FileText className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalPosts.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.totalPosts} type="posts" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Pending Approvals
                <Clock className="h-4 w-4 text-amber-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.pendingApprovals.current}</div>
              <KpiTrendIndicator data={stats.pendingApprovals} type="pending" invertColors />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Reported Content
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.reportedContent.current}</div>
              <KpiTrendIndicator data={stats.reportedContent} type="reported" invertColors />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Revenue
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">${stats.revenue.current.toLocaleString()}</div>
              <KpiTrendIndicator data={stats.revenue} type="revenue" />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Needs Attention Panel */}
          <Card className="lg:col-span-1 border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-950/10 dark:to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
                Needs Attention
                {totalCriticalAlerts > 0 && (
                  <Badge variant="destructive" className="ml-auto">{totalCriticalAlerts}</Badge>
                )}
              </CardTitle>
              <CardDescription>Critical items requiring review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/admin/approvals">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-sm font-medium">Pending Posts</span>
                  </div>
                  <Badge variant="secondary">{criticalAlerts.pendingPosts}</Badge>
                </div>
              </Link>

              <Link to="/admin/delete-requests">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-sm font-medium">Delete Requests</span>
                  </div>
                  <Badge variant="secondary">{criticalAlerts.deleteRequests}</Badge>
                </div>
              </Link>

              <Link to="/admin/reports">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium">Reported Comments</span>
                  </div>
                  <Badge variant="secondary">{criticalAlerts.reportedComments}</Badge>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Admin-only platform controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Link to="/admin/users">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                    <Users className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">Manage Users</span>
                  </Button>
                </Link>
                <Link to="/admin/authors">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                    <UserCog className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">Roles & Permissions</span>
                  </Button>
                </Link>
                <Link to="/admin/monetization">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">Monetization</span>
                  </Button>
                </Link>
                <Link to="/admin/delete-requests">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                    <Trash2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">Delete Requests</span>
                  </Button>
                </Link>
                <Link to="/admin/settings">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                    <Settings className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">Platform Settings</span>
                  </Button>
                </Link>
                <Link to="/admin/analytics">
                  <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/20">
                    <Eye className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm">View Analytics</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Analytics Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle>Analytics Snapshot</CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {analyticsSnapshot.newUsersThisWeek}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">New Users (7d)</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {analyticsSnapshot.postsPerDay}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Posts/Day</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {analyticsSnapshot.avgApprovalTime}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Avg Approval</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent admin & moderator actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                <div className="space-y-3">
                  {activityLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">No recent activity</div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          log.action === "approved" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                          log.action === "rejected" ? "bg-red-100 dark:bg-red-900/30" :
                          "bg-muted"
                        }`}>
                          {log.action === "approved" ? (
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          ) : log.action === "rejected" ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{log.profile?.full_name || "User"}</span>
                            <span className="text-muted-foreground"> {log.action} </span>
                            <span className="font-medium">{log.content_type}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
  );
};

export default AdminDashboard;
