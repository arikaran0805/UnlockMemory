import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Users, Briefcase, TrendingUp, TrendingDown,
  DollarSign, Settings, Trash2, UserCog,
  Activity, Eye, CheckCircle, XCircle, AlertCircle,
  BarChart2, Zap, Star, Timer, Layers, ShieldAlert,
  RefreshCw, ClipboardList, ClipboardCheck, Flag,
} from "lucide-react";
import { format, subDays } from "date-fns";

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

// ── Skeleton block for per-section loading ───────────────────────────────────
const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-muted/50 ${className ?? ""}`} />
);

// ── KPI Trend Indicator ──────────────────────────────────────────────────────
interface TrendIndicatorProps {
  data: TrendData;
  type: "learners" | "active" | "posts" | "pending" | "reported" | "revenue" | "approvals";
  invertColors?: boolean;
}

const KpiTrendIndicator = ({ data, type, invertColors = false }: TrendIndicatorProps) => {
  const { trend, change, percentage, previous: dataPrevious, current: dataCurrent } = data;

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
        if (dataPrevious === 0 && dataCurrent > 0) return `${dataCurrent} new this period`;
        if (dataPrevious === 0 && dataCurrent === 0) return "No activity";
        if (percentage > 0) return `${sign}${percentage}% vs last week`;
        return `${sign}${change} users`;
      case "approvals":
        if (change === 0) return "No change";
        if (change > 0) return `+${change} vs yesterday`;
        return `${Math.abs(change)} resolved`;
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

// ── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [stats, setStats] = useState<KpiTrendStats>({
    totalUsers:       { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    activeUsers:      { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    totalCareers:     { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    pendingApprovals: { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
    reportedContent:  { current: 0, previous: 0, change: 0, trend: "neutral", percentage: 0 },
  });
  const [criticalAlerts, setCriticalAlerts] = useState<{
    pendingPosts: number;
    deleteRequests: number;
    reportedComments: number;
  }>({ pendingPosts: 0, deleteRequests: 0, reportedComments: 0 });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // ── Derived insights — wired to live stats ───────────────────────────────
  const derivedInsights = useMemo(() => {
    // Growth Rate: new users this week as % of base
    const growthPct = stats.totalUsers.previous > 0
      ? Math.round((stats.totalUsers.change / stats.totalUsers.previous) * 100)
      : stats.totalUsers.change > 0 ? 100 : 0;
    const growthSign = growthPct > 0 ? "+" : "";
    const growthValue = `${growthSign}${growthPct}%`;
    const growthBadge = growthPct > 0 ? "↑ growing" : growthPct === 0 ? "stable" : "↓ declining";
    const growthSentiment = growthPct > 0 ? "positive" : growthPct === 0 ? "neutral" : "negative";

    // Engagement Rate: active learners / total learners
    const engagementPct = stats.totalUsers.current > 0
      ? Math.round((stats.activeUsers.current / stats.totalUsers.current) * 100)
      : 0;
    const engagementBadge = engagementPct >= 60 ? "strong" : engagementPct >= 40 ? "healthy" : engagementPct >= 20 ? "low" : "at risk";
    const engagementSentiment = engagementPct >= 40 ? "positive" : "warning";

    // Content Quality: inverse of issue pressure
    const totalIssues = (stats.reportedContent.current || 0) + (stats.pendingApprovals.current || 0);
    const qualityScore = totalIssues === 0 ? 100 : Math.max(0, Math.round(100 - (totalIssues / Math.max(stats.totalUsers.current, 1)) * 100));
    const qualityBadge = qualityScore >= 90 ? "excellent" : qualityScore >= 70 ? "good" : qualityScore >= 50 ? "fair" : "at risk";
    const qualitySentiment = qualityScore >= 80 ? "positive" : "warning";

    // Approval Efficiency
    const approvalBadge = stats.pendingApprovals.current === 0 ? "clear" : stats.pendingApprovals.current <= 5 ? "on track" : stats.pendingApprovals.current <= 15 ? "busy" : "overloaded";
    const approvalSentiment = stats.pendingApprovals.current === 0 ? "positive" : stats.pendingApprovals.current <= 5 ? "positive" : "warning";

    // Backlog Pressure: derived from totalCriticalAlerts
    const total = criticalAlerts.pendingPosts + criticalAlerts.deleteRequests + criticalAlerts.reportedComments;
    const backlogValue = total === 0 ? "None" : total <= 5 ? "Low" : total <= 15 ? "Medium" : "High";
    const backlogBadge = total === 0 ? "clear" : total <= 5 ? "low" : total <= 15 ? "monitor" : "critical";
    const backlogSentiment = total === 0 ? "positive" : total <= 5 ? "positive" : total <= 15 ? "warning" : "negative";

    // Platform Risk: from reported content + reported comments
    const riskScore = stats.reportedContent.current + criticalAlerts.reportedComments;
    const riskValue = riskScore === 0 ? "Low" : riskScore <= 3 ? "Medium" : "High";
    const riskBadge = riskScore === 0 ? "safe" : riskScore <= 3 ? "elevated" : "critical";
    const riskSentiment = riskScore === 0 ? "positive" : riskScore <= 3 ? "warning" : "negative";

    return {
      growthRate:         { value: growthValue,         badge: growthBadge,     subtext: "vs last week",                          sentiment: growthSentiment },
      engagementRate:     { value: `${engagementPct}%`, badge: engagementBadge, subtext: "active learner engagement",             sentiment: engagementSentiment },
      contentQuality:     { value: `${qualityScore}%`,  badge: qualityBadge,    subtext: "based on reports, pending & approvals", sentiment: qualitySentiment },
      approvalEfficiency: {
        value:     stats.pendingApprovals.current === 0 ? "Clear" : `${stats.pendingApprovals.current} pending`,
        badge:     approvalBadge,
        subtext:   stats.pendingApprovals.current === 0 ? "no pending approvals" : "items awaiting review",
        sentiment: approvalSentiment,
      },
      backlogPressure:    { value: backlogValue, badge: backlogBadge, subtext: "pending vs handling capacity", sentiment: backlogSentiment },
      platformRisk:       { value: riskValue,    badge: riskBadge,    subtext: "trust & safety signal",        sentiment: riskSentiment },
    };
  }, [stats, criticalAlerts]);

  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAdminAccess();
  }, []);

  // ── Data fetch — only after auth confirmed ──────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
    Promise.all([fetchStats(), fetchCriticalAlerts(), fetchActivityLogs()])
      .then(() => setLastUpdated(new Date()));
  }, [isAuthorized]);

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

      setIsAuthorized(true);
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
    return { current, previous, change, trend: change > 0 ? "up" : "down", percentage };
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      const oneDayAgo       = subDays(now, 1);
      const sevenDaysAgo    = subDays(now, 7);
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

      // Active users — distinct user_id via Set
      const { data: activeRawThis } = await supabase
        .from("lesson_progress")
        .select("user_id")
        .gte("viewed_at", sevenDaysAgo.toISOString());
      const activeUsersThisWeek = new Set(activeRawThis?.map(r => r.user_id)).size;

      const { data: activeRawPrev } = await supabase
        .from("lesson_progress")
        .select("user_id")
        .gte("viewed_at", fourteenDaysAgo.toISOString())
        .lt("viewed_at", sevenDaysAgo.toISOString());
      const activeUsersPrevWeek = new Set(activeRawPrev?.map(r => r.user_id)).size;

      // Total careers
      const { count: totalCareers } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true });

      const { count: careersThisWeek } = await supabase
        .from("careers")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      // Pending approvals — current vs yesterday's backlog
      const { count: pendingApprovalsNow } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: pendingApprovalsPrev } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", oneDayAgo.toISOString());

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
        totalUsers:       calculateTrend(totalUsers || 0, (totalUsers || 0) - (newUsersThisWeek || 0)),
        activeUsers:      calculateTrend(activeUsersThisWeek, activeUsersPrevWeek),
        totalCareers: {
          ...calculateTrend(totalCareers || 0, (totalCareers || 0) - (careersThisWeek || 0)),
          change: careersThisWeek || 0,
        },
        pendingApprovals: calculateTrend(pendingApprovalsNow || 0, pendingApprovalsPrev || 0),
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
        pendingPosts:     pendingPosts     || 0,
        deleteRequests:   deleteRequests   || 0,
        reportedComments: reportedComments || 0,
      });
    } catch (error) {
      console.error("Error fetching critical alerts:", error);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("approval_history")
        .select(`
          id,
          action,
          performed_by,
          content_type,
          created_at
        `)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        const profileIds = [...new Set(data.map(log => log.performed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", profileIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

        setActivityLogs(data.map(log => ({
          ...log,
          profile: {
            full_name: profileMap.get(log.performed_by)
              || `Admin (${log.performed_by.slice(0, 6)})`
          }
        })));
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchCriticalAlerts(), fetchActivityLogs()]);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const totalCriticalAlerts = criticalAlerts.pendingPosts + criticalAlerts.deleteRequests + criticalAlerts.reportedComments;

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-[28px] font-semibold" style={{ color: "var(--color-text-primary)" }}>Platform Manager</h1>
          <p className="text-[15px] mt-0.5" style={{ color: "var(--color-text-secondary)", lineHeight: 1.65 }}>Full platform control across learners, content, and system operations</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 mt-1">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Updated {format(lastUpdated, "h:mm a")}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      {/* KPI Cards & rest of the content */}
      <div className="space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {loading ? (
            <>
              <SkeletonBlock className="h-[120px] rounded-xl" />
              <SkeletonBlock className="h-[120px] rounded-xl" />
              <SkeletonBlock className="h-[120px] rounded-xl" />
              <SkeletonBlock className="h-[120px] rounded-xl" />
              <SkeletonBlock className="h-[120px] rounded-xl" />
            </>
          ) : (
            <>
              {/* Primary KPI — Total Learners (largest emphasis) */}
              <div className="card-premium p-5 px-6 admin-clickable-card"
                style={{ borderTop: "2px solid rgba(15,110,86,0.40)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-medium" style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.02em" }}>Total Learners</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(15,110,86,0.10)" }}>
                    <Users className="h-4 w-4" style={{ color: "#0F6E56" }} />
                  </span>
                </div>
                <p className="text-[32px] font-bold leading-none mb-1" style={{ color: "var(--color-text-primary)" }}>{stats.totalUsers.current.toLocaleString()}</p>
                <KpiTrendIndicator data={stats.totalUsers} type="learners" />
              </div>

              {/* Primary KPI — Active Learners (second emphasis) */}
              <div className="card-premium p-5 px-6 admin-clickable-card"
                style={{ borderTop: "2px solid rgba(47,164,169,0.40)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-medium" style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.02em" }}>Active Learners (7d)</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(47,164,169,0.10)" }}>
                    <Activity className="h-4 w-4" style={{ color: "#2FA4A9" }} />
                  </span>
                </div>
                <p className="text-[32px] font-bold leading-none mb-1" style={{ color: "var(--color-text-primary)" }}>{stats.activeUsers.current.toLocaleString()}</p>
                <KpiTrendIndicator data={stats.activeUsers} type="active" />
              </div>

              {/* Secondary KPIs */}
              <div className="card-premium p-5 admin-clickable-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-medium" style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.02em" }}>Total Careers</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(138,111,209,0.10)" }}>
                    <Briefcase className="h-4 w-4" style={{ color: "#8A6FD1" }} />
                  </span>
                </div>
                <p className="text-[28px] font-bold leading-none mb-1" style={{ color: "var(--color-text-primary)" }}>{stats.totalCareers.current.toLocaleString()}</p>
                <KpiTrendIndicator data={stats.totalCareers} type="posts" />
              </div>

              <div className="card-premium p-5 admin-clickable-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-medium" style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.02em" }}>Pending Approvals</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(212,161,47,0.10)" }}>
                    <ClipboardCheck className="h-4 w-4" style={{ color: "#D4A12F" }} />
                  </span>
                </div>
                <p className="text-[28px] font-bold leading-none mb-1" style={{ color: "var(--color-text-primary)" }}>{stats.pendingApprovals.current}</p>
                <KpiTrendIndicator data={stats.pendingApprovals} type="approvals" invertColors />
              </div>

              <div className="card-premium p-5 admin-clickable-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-medium" style={{ color: "var(--color-text-tertiary)", letterSpacing: "0.02em" }}>Reported Content</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(214,90,79,0.10)" }}>
                    <Flag className="h-4 w-4" style={{ color: "#D65A4F" }} />
                  </span>
                </div>
                <p className="text-[28px] font-bold leading-none mb-1" style={{ color: "var(--color-text-primary)" }}>{stats.reportedContent.current}</p>
                <KpiTrendIndicator data={stats.reportedContent} type="reported" invertColors />
              </div>
            </>
          )}
        </div>

        {/* ── Needs Attention + Quick Actions ── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonBlock className="h-[280px] rounded-2xl" />
            <SkeletonBlock className="h-[280px] rounded-2xl lg:col-span-2" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Needs Attention Panel */}
            <div className="card-premium p-6 lg:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(212,161,47,0.12)" }}>
                    <AlertCircle className="h-4 w-4" style={{ color: "#D4A12F" }} />
                  </span>
                  <h2 className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>Needs Attention</h2>
                </div>
                {totalCriticalAlerts > 0 && (
                  <Badge variant="destructive">{totalCriticalAlerts}</Badge>
                )}
              </div>
              <p className="text-[13px] mb-4 ml-8" style={{ color: "var(--color-text-tertiary)" }}>Critical items requiring review</p>
              <div className="flex flex-col gap-4">
                <Link to="/admin/approvals" className="block w-full">
                  <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06] cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded-lg shrink-0" style={{ background: "rgba(212,161,47,0.12)" }}>
                        <ClipboardCheck className="h-4 w-4" style={{ color: "#D4A12F" }} />
                      </span>
                      <span className="text-sm font-medium">Pending Posts</span>
                    </div>
                    <Badge variant={criticalAlerts.pendingPosts > 0 ? "destructive" : "secondary"}>
                      {criticalAlerts.pendingPosts}
                    </Badge>
                  </div>
                </Link>

                <Link to="/admin/delete-requests" className="block w-full">
                  <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06] cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded-lg shrink-0" style={{ background: "rgba(214,90,79,0.12)" }}>
                        <Trash2 className="h-4 w-4" style={{ color: "#D65A4F" }} />
                      </span>
                      <span className="text-sm font-medium">Delete Requests</span>
                    </div>
                    <Badge variant={criticalAlerts.deleteRequests > 0 ? "destructive" : "secondary"}>
                      {criticalAlerts.deleteRequests}
                    </Badge>
                  </div>
                </Link>

                <Link to="/admin/reports" className="block w-full">
                  <div className="flex items-center justify-between px-4 py-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06] cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="p-1.5 rounded-lg shrink-0" style={{ background: "rgba(214,90,79,0.12)" }}>
                        <Flag className="h-4 w-4" style={{ color: "#D65A4F" }} />
                      </span>
                      <span className="text-sm font-medium">Reported Comments</span>
                    </div>
                    <Badge variant={criticalAlerts.reportedComments > 0 ? "destructive" : "secondary"}>
                      {criticalAlerts.reportedComments}
                    </Badge>
                  </div>
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card-premium p-6 lg:col-span-2">
              <h2 className="text-[18px] font-medium mb-1" style={{ color: "var(--color-text-primary)" }}>Quick Actions</h2>
              <p className="text-[13px] mb-4" style={{ color: "var(--color-text-tertiary)" }}>Admin-only platform controls</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Link to="/admin/users">
                  <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Manage Learners</span>
                    <p className="text-xs text-muted-foreground text-center leading-tight mt-0.5">View & manage accounts</p>
                  </div>
                </Link>
                <Link to="/admin/authors">
                  <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                    <UserCog className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Roles &amp; Permissions</span>
                    <p className="text-xs text-muted-foreground text-center leading-tight mt-0.5">Assign moderator roles</p>
                  </div>
                </Link>
                <Link to="/admin/monetization">
                  <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Monetization</span>
                    <p className="text-xs text-muted-foreground text-center leading-tight mt-0.5">Plans, billing & revenue</p>
                  </div>
                </Link>
                <Link to="/admin/careers">
                  <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Manage Careers</span>
                    <p className="text-xs text-muted-foreground text-center leading-tight mt-0.5">Career paths & courses</p>
                  </div>
                </Link>
                <Link to="/admin/settings">
                  <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                    <Settings className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">Platform Settings</span>
                    <p className="text-xs text-muted-foreground text-center leading-tight mt-0.5">System configuration</p>
                  </div>
                </Link>
                <Link to="/admin/analytics">
                  <div className="w-full py-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-background text-foreground font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">View Analytics</span>
                    <p className="text-xs text-muted-foreground text-center leading-tight mt-0.5">Traffic & engagement</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Analytics Snapshot + Activity Log ── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <SkeletonBlock className="h-[360px] rounded-2xl" />
            <SkeletonBlock className="h-[360px] rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* Left: Analytics Snapshot */}
            <div className="card-premium p-6">
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-medium" style={{ color: "var(--color-text-primary)" }}>Analytics Snapshot</h2>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: "rgba(15,110,86,0.10)", color: "#0F6E56" }}>
                    live
                  </span>
                </div>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>Derived insights across platform health, quality, and moderation</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Growth Rate */}
                <div className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="p-1.5 rounded-lg" style={{ background: "rgba(79,175,122,0.12)" }}>
                      <BarChart2 className="h-3.5 w-3.5" style={{ color: "#4FAF7A" }} />
                    </span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${derivedInsights.growthRate.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : derivedInsights.growthRate.sentiment === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" : derivedInsights.growthRate.sentiment === "negative" ? "bg-red-50 text-red-700 border border-red-100" : "bg-muted text-muted-foreground border border-border"}`}>{derivedInsights.growthRate.badge}</span>
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
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${derivedInsights.engagementRate.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : derivedInsights.engagementRate.sentiment === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" : derivedInsights.engagementRate.sentiment === "negative" ? "bg-red-50 text-red-700 border border-red-100" : "bg-muted text-muted-foreground border border-border"}`}>{derivedInsights.engagementRate.badge}</span>
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
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${derivedInsights.contentQuality.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : derivedInsights.contentQuality.sentiment === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" : derivedInsights.contentQuality.sentiment === "negative" ? "bg-red-50 text-red-700 border border-red-100" : "bg-muted text-muted-foreground border border-border"}`}>{derivedInsights.contentQuality.badge}</span>
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
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${derivedInsights.approvalEfficiency.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : derivedInsights.approvalEfficiency.sentiment === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" : derivedInsights.approvalEfficiency.sentiment === "negative" ? "bg-red-50 text-red-700 border border-red-100" : "bg-muted text-muted-foreground border border-border"}`}>{derivedInsights.approvalEfficiency.badge}</span>
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
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${derivedInsights.backlogPressure.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : derivedInsights.backlogPressure.sentiment === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" : derivedInsights.backlogPressure.sentiment === "negative" ? "bg-red-50 text-red-700 border border-red-100" : "bg-muted text-muted-foreground border border-border"}`}>{derivedInsights.backlogPressure.badge}</span>
                  </div>
                  <div>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        derivedInsights.backlogPressure.sentiment === "positive"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : derivedInsights.backlogPressure.sentiment === "negative"
                            ? "text-red-500 dark:text-red-400"
                            : ""
                      }`}
                      style={derivedInsights.backlogPressure.sentiment === "warning" ? { color: "#c49020" } : undefined}
                    >
                      {derivedInsights.backlogPressure.value}
                    </p>
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
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${derivedInsights.platformRisk.sentiment === "positive" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : derivedInsights.platformRisk.sentiment === "warning" ? "bg-amber-50 text-amber-700 border border-amber-100" : derivedInsights.platformRisk.sentiment === "negative" ? "bg-red-50 text-red-700 border border-red-100" : "bg-muted text-muted-foreground border border-border"}`}>{derivedInsights.platformRisk.badge}</span>
                  </div>
                  <div>
                    <p
                      className={`text-2xl font-bold tracking-tight ${
                        derivedInsights.platformRisk.sentiment === "positive"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : derivedInsights.platformRisk.sentiment === "negative"
                            ? "text-red-500 dark:text-red-400"
                            : ""
                      }`}
                      style={derivedInsights.platformRisk.sentiment === "warning" ? { color: "#c49020" } : undefined}
                    >
                      {derivedInsights.platformRisk.value}
                    </p>
                    <p className="text-xs font-medium text-foreground/80 mt-0.5">Platform Risk</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{derivedInsights.platformRisk.subtext}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Activity Log */}
            <div className="card-premium p-6 flex flex-col">
              {/* Sticky header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-[18px] font-medium mb-0.5" style={{ color: "var(--color-text-primary)" }}>Activity Log</h2>
                  <p className="text-[13px]" style={{ color: "var(--color-text-tertiary)" }}>Today's actions across all roles</p>
                </div>
                <Link to="/admin/activity-log" className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
                  View all →
                </Link>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3 pr-1 pt-1">
                  {activityLogs.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-muted-foreground">No activity today</p>
                      <p className="text-xs text-muted-foreground/60">Actions performed today will appear here</p>
                    </div>
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
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
