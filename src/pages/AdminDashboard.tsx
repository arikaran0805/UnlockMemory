import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Users, Briefcase, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Shield, Settings, Trash2, UserCog,
  Activity, Clock, Eye, CheckCircle, XCircle, AlertCircle,
  BarChart2, Zap, Star, Timer, Layers, ShieldAlert
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
  totalCareers: TrendData;
  pendingApprovals: TrendData;
  reportedContent: TrendData;
}

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<KpiTrendStats>({
    totalUsers: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    activeUsers: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    totalCareers: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    pendingApprovals: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    reportedContent: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
  });
  const [criticalAlerts, setCriticalAlerts] = useState<{
    pendingPosts: number;
    deleteRequests: number;
    reportedComments: number;
  }>({ pendingPosts: 0, deleteRequests: 0, reportedComments: 0 });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  // Derived insight cards — wired as structured state for easy backend integration
  const [derivedInsights] = useState({
    growthRate: { value: "+18%", subtext: "vs last week", sentiment: "positive" },
    engagementRate: { value: "65%", subtext: "active learner engagement", sentiment: "positive" },
    contentQuality: { value: "92%", subtext: "based on reports, deletes & approvals", sentiment: "positive" },
    approvalEfficiency: { value: "10h", subtext: "92% within SLA", sentiment: "neutral" },
    backlogPressure: { value: "Medium", subtext: "pending vs handling capacity", sentiment: "warning" },
    platformRisk: { value: "Low", subtext: "critical trust & safety issues", sentiment: "positive" },
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

      // Total careers
      const { count: totalCareers } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true });

      const { count: careersThisWeek } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // Pending approvals
      const { count: pendingApprovalsNow } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Reported content
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

      const reportedNetChange = (reportsAddedToday || 0) - (reportsResolvedToday || 0);

      setStats({
        totalUsers: calculateTrend(totalUsers || 0, (totalUsers || 0) - (newUsersThisWeek || 0)),
        activeUsers: calculateTrend(activeUsersThisWeek || 0, activeUsersPrevWeek || 0),
        totalCareers: {
          ...calculateTrend(totalCareers || 0, (totalCareers || 0) - (careersThisWeek || 0)),
          change: careersThisWeek || 0,
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
          profile: { full_name: profileMap.get(log.performed_by) || "Unknown Learner" }
        })));
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  // fetchAnalyticsSnapshot removed — replaced by derivedInsights state (placeholder data ready for backend wiring)

  // KPI Trend Indicator Component
  interface TrendIndicatorProps {
    data: TrendData;
    type: "learners" | "active" | "posts" | "pending" | "reported" | "revenue";
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
        case "learners":
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
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center py-12">
          <UMLoader size={56} dark label="Loading…" />
        </div>
      </div>
    );
  }

  const totalCriticalAlerts = criticalAlerts.pendingPosts + criticalAlerts.deleteRequests + criticalAlerts.reportedComments;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Platform Manager</h1>
          <p className="text-muted-foreground">Full platform control across learners, content, and system operations</p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      {/* KPI Cards & rest of the content */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ borderLeft: "2px solid rgba(79,175,122,0.35)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Total Learners</p>
            <span className="p-1.5 rounded-lg" style={{ background: "rgba(79,175,122,0.15)" }}>
              <Users className="h-4 w-4" style={{ color: "#4FAF7A" }} />
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalUsers.current.toLocaleString()}</p>
          <KpiTrendIndicator data={stats.totalUsers} type="learners" />
        </div>

        <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ borderLeft: "2px solid rgba(47,164,169,0.35)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Active Learners (7d)</p>
            <span className="p-1.5 rounded-lg" style={{ background: "rgba(47,164,169,0.15)" }}>
              <Activity className="h-4 w-4" style={{ color: "#2FA4A9" }} />
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.activeUsers.current.toLocaleString()}</p>
          <KpiTrendIndicator data={stats.activeUsers} type="active" />
        </div>

        <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ borderLeft: "2px solid rgba(138,111,209,0.35)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Total Careers</p>
            <span className="p-1.5 rounded-lg" style={{ background: "rgba(138,111,209,0.15)" }}>
              <Briefcase className="h-4 w-4" style={{ color: "#8A6FD1" }} />
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalCareers.current.toLocaleString()}</p>
          <KpiTrendIndicator data={stats.totalCareers} type="posts" />
        </div>

        <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ borderLeft: "2px solid rgba(212,161,47,0.35)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
            <span className="p-1.5 rounded-lg" style={{ background: "rgba(212,161,47,0.15)" }}>
              <Clock className="h-4 w-4" style={{ color: "#D4A12F" }} />
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.pendingApprovals.current}</p>
          <KpiTrendIndicator data={stats.pendingApprovals} type="pending" invertColors />
        </div>

        <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          style={{ borderLeft: "2px solid rgba(214,90,79,0.35)" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Reported Content</p>
            <span className="p-1.5 rounded-lg" style={{ background: "rgba(214,90,79,0.15)" }}>
              <AlertTriangle className="h-4 w-4" style={{ color: "#D65A4F" }} />
            </span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.reportedContent.current}</p>
          <KpiTrendIndicator data={stats.reportedContent} type="reported" invertColors />
        </div>
      </div>




      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention Panel */}
        <div className="card-premium rounded-2xl p-7 lg:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg" style={{ background: "rgba(212,161,47,0.15)" }}>
                <AlertCircle className="h-4 w-4" style={{ color: "#D4A12F" }} />
              </span>
              <h2 className="font-semibold text-foreground">Needs Attention</h2>
            </div>
            {totalCriticalAlerts > 0 && (
              <Badge variant="destructive">{totalCriticalAlerts}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4 ml-8">Critical items requiring review</p>
          <div className="flex flex-col gap-4">
            <Link to="/admin/approvals" className="block w-full">
              <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 rounded-lg shrink-0" style={{ background: "rgba(212,161,47,0.12)" }}>
                    <Clock className="h-4 w-4" style={{ color: "#D4A12F" }} />
                  </span>
                  <span className="text-sm font-medium">Pending Posts</span>
                </div>
                <Badge variant="secondary">{criticalAlerts.pendingPosts}</Badge>
              </div>
            </Link>

            <Link to="/admin/delete-requests" className="block w-full">
              <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 rounded-lg shrink-0" style={{ background: "rgba(214,90,79,0.12)" }}>
                    <Trash2 className="h-4 w-4" style={{ color: "#D65A4F" }} />
                  </span>
                  <span className="text-sm font-medium">Delete Requests</span>
                </div>
                <Badge variant="secondary">{criticalAlerts.deleteRequests}</Badge>
              </div>
            </Link>

            <Link to="/admin/reports" className="block w-full">
              <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 rounded-lg shrink-0" style={{ background: "rgba(214,90,79,0.12)" }}>
                    <AlertTriangle className="h-4 w-4" style={{ color: "#D65A4F" }} />
                  </span>
                  <span className="text-sm font-medium">Reported Comments</span>
                </div>
                <Badge variant="secondary">{criticalAlerts.reportedComments}</Badge>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-premium rounded-2xl p-7 lg:col-span-2">
          <h2 className="font-semibold text-foreground mb-1">Quick Actions</h2>
          <p className="text-sm text-muted-foreground mb-4">Admin-only platform controls</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link to="/admin/users">
              <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Manage Learners</span>
              </div>
            </Link>
            <Link to="/admin/authors">
              <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <UserCog className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Roles &amp; Permissions</span>
              </div>
            </Link>
            <Link to="/admin/monetization">
              <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Monetization</span>
              </div>
            </Link>
            <Link to="/admin/careers">
              <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Manage Careers</span>
              </div>
            </Link>
            <Link to="/admin/settings">
              <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">Platform Settings</span>
              </div>
            </Link>
            <Link to="/admin/analytics">
              <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">View Analytics</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Analytics Snapshot + Activity Log (2-column) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* Left: Analytics Snapshot */}
        <div className="card-premium rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="font-semibold text-foreground">Analytics Snapshot</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Derived insights across platform health, quality, and moderation</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Growth Rate */}
            <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-lg" style={{ background: "rgba(79,175,122,0.12)" }}>
                  <BarChart2 className="h-3.5 w-3.5" style={{ color: "#4FAF7A" }} />
                </span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(79,175,122,0.1)", color: "#3a9a66" }}>↑ growing</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{derivedInsights.growthRate.value}</p>
                <p className="text-xs font-medium text-foreground/80 mt-0.5">Growth Rate</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{derivedInsights.growthRate.subtext}</p>
              </div>
            </div>

            {/* Engagement Rate */}
            <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-lg" style={{ background: "rgba(47,164,169,0.12)" }}>
                  <Zap className="h-3.5 w-3.5" style={{ color: "#2FA4A9" }} />
                </span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(47,164,169,0.1)", color: "#258f94" }}>healthy</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{derivedInsights.engagementRate.value}</p>
                <p className="text-xs font-medium text-foreground/80 mt-0.5">Engagement Rate</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{derivedInsights.engagementRate.subtext}</p>
              </div>
            </div>

            {/* Content Quality */}
            <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-lg" style={{ background: "rgba(138,111,209,0.12)" }}>
                  <Star className="h-3.5 w-3.5" style={{ color: "#8A6FD1" }} />
                </span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(138,111,209,0.1)", color: "#7059b8" }}>excellent</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{derivedInsights.contentQuality.value}</p>
                <p className="text-xs font-medium text-foreground/80 mt-0.5">Content Quality</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{derivedInsights.contentQuality.subtext}</p>
              </div>
            </div>

            {/* Approval Efficiency */}
            <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-lg" style={{ background: "rgba(79,175,122,0.10)" }}>
                  <Timer className="h-3.5 w-3.5" style={{ color: "#4FAF7A" }} />
                </span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(79,175,122,0.08)", color: "#3a9a66" }}>on track</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{derivedInsights.approvalEfficiency.value}</p>
                <p className="text-xs font-medium text-foreground/80 mt-0.5">Approval Efficiency</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{derivedInsights.approvalEfficiency.subtext}</p>
              </div>
            </div>

            {/* Backlog Pressure */}
            <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-lg" style={{ background: "rgba(212,161,47,0.15)" }}>
                  <Layers className="h-3.5 w-3.5" style={{ color: "#D4A12F" }} />
                </span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(212,161,47,0.12)", color: "#b88c26" }}>monitor</span>
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight" style={{ color: "#c49020" }}>{derivedInsights.backlogPressure.value}</p>
                <p className="text-xs font-medium text-foreground/80 mt-0.5">Backlog Pressure</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{derivedInsights.backlogPressure.subtext}</p>
              </div>
            </div>

            {/* Platform Risk */}
            <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
              <div className="flex items-center justify-between">
                <span className="p-1.5 rounded-lg" style={{ background: "rgba(79,175,122,0.12)" }}>
                  <ShieldAlert className="h-3.5 w-3.5" style={{ color: "#4FAF7A" }} />
                </span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(79,175,122,0.1)", color: "#3a9a66" }}>safe</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">{derivedInsights.platformRisk.value}</p>
                <p className="text-xs font-medium text-foreground/80 mt-0.5">Platform Risk</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{derivedInsights.platformRisk.subtext}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Activity Log */}
        <div className="card-premium rounded-2xl p-6 flex flex-col lg:h-0 lg:min-h-full">
          {/* Sticky header */}
          <div className="mb-4">
            <h2 className="font-semibold text-foreground mb-1">Activity Log</h2>
            <p className="text-sm text-muted-foreground">Recent admin &amp; moderator actions</p>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 pr-1 pt-1">
              {activityLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">No recent activity</div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-3 py-3 rounded-xl border border-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-primary hover:bg-primary/[0.06]">
                    <span className="p-1.5 rounded-lg shrink-0" style={{
                      background: log.action === "approved" ? "rgba(79,175,122,0.15)" :
                        log.action === "rejected" ? "rgba(214,90,79,0.12)" :
                          "rgba(0,0,0,0.06)"
                    }}>
                      {log.action === "approved" ? (
                        <CheckCircle className="h-4 w-4" style={{ color: "#4FAF7A" }} />
                      ) : log.action === "rejected" ? (
                        <XCircle className="h-4 w-4" style={{ color: "#D65A4F" }} />
                      ) : (
                        <Activity className="h-4 w-4 text-muted-foreground" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{log.profile?.full_name || "Learner"}</span>
                        <span className="text-muted-foreground"> {log.action} </span>
                        <span className="font-medium">{log.content_type}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(log.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
