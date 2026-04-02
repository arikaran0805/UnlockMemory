import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen, Users, CheckCircle, Clock, TrendingUp,
  Target, ClipboardList, BarChart2, Settings,
  AlertTriangle, AlertCircle, Info,
  Zap, Star, Timer, Layers, ShieldAlert,
} from "lucide-react";

// ── Interfaces — kept for Supabase data fetching ────────────────────────────
interface CareerAssignment {
  id: string;
  career_id: string;
  career: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
}

interface DashboardStats {
  assignedCareers: number;
  coursesInCareers: number;
  postsInCareers: number;
  pendingApprovals: number;
  teamMembers: number;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const careerManagerData = {
  career: {
    name: "Data Analyst Career",
    totalCourses: 4,
    publishedCourses: 3,
    enrolledLearners: 132,
    activeLearners7d: 132,
    completionHealth: 78,
    avgCompletion: 78,
    contentQuality: 94,
    engagementRate: 72,
    openActions: 5,
    overallHealth: "Healthy",
  },
  kpis: {
    totalCourses: 4,
    activeLearners: 132,
    publishedCourses: 3,
    pendingApprovals: 5,
    completionHealth: 78,
  },
  needsAttention: [
    { id: 1, label: "Pending Course Reviews", count: 3, type: "warning" },
    { id: 2, label: "Learner Escalations",    count: 1, type: "danger"  },
    { id: 3, label: "Reported Discussions",   count: 2, type: "info"    },
  ],
  analytics: [
    { id: 1, value: "+14%",   label: "Learner Growth",      sub: "vs last week",                          status: "growing"  },
    { id: 2, value: "72%",    label: "Engagement Rate",     sub: "active learners in career",             status: "active"   },
    { id: 3, value: "94%",    label: "Content Quality",     sub: "based on reviews and approvals",        status: "high"     },
    { id: 4, value: "8h",     label: "Review Efficiency",   sub: "89% closed within SLA",                 status: "on track" },
    { id: 5, value: "Strong", label: "Progress Momentum",   sub: "learner completion trend",              status: "strong"   },
    { id: 6, value: "Low",    label: "Career Risk",         sub: "drop-off and issue signals",            status: "low"      },
  ],
  activityLog: [
    { id: 1, text: "Achu submitted a lesson update request",    meta: "SQL Basics · 12 min ago",          status: "Pending",  type: "warning" },
    { id: 2, text: "Mentor approved SQL Basics module",          meta: "Data Analyst Career · 1h ago",    status: "Approved", type: "success" },
    { id: 3, text: "New learner enrolled in Data Analyst Career",meta: "2h ago",                          status: "Enrolled", type: "info"    },
    { id: 4, text: "Power BI project review was completed",      meta: "Data Analyst Career · 4h ago",    status: "Reviewed", type: "success" },
    { id: 5, text: "Discussion flagged in SQL Developer module", meta: "Data Analyst Career · 5h ago",    status: "Flagged",  type: "danger"  },
  ],
  quickActions: [
    { id: 1, label: "Manage Career",       icon: "Target"        },
    { id: 2, label: "Review Submissions",  icon: "ClipboardList" },
    { id: 3, label: "Manage Courses",      icon: "BookOpen"      },
    { id: 4, label: "Track Learners",      icon: "Users"         },
    { id: 5, label: "View Analytics",      icon: "BarChart2"     },
    { id: 6, label: "Career Settings",     icon: "Settings"      },
  ],
};

// ── Icon map for quick actions ───────────────────────────────────────────────
const QUICK_ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Target, ClipboardList, BookOpen, Users, BarChart2, Settings,
};

const QUICK_ICON_STYLE: Record<string, { bg: string; color: string }> = {
  Target:        { bg: "rgba(15,110,86,0.12)",   color: "#0F6E56" },
  ClipboardList: { bg: "rgba(212,161,47,0.12)",  color: "#D4A12F" },
  BookOpen:      { bg: "rgba(15,110,86,0.12)",   color: "#0F6E56" },
  Users:         { bg: "rgba(47,164,169,0.12)",  color: "#2FA4A9" },
  BarChart2:     { bg: "rgba(47,164,169,0.12)",  color: "#2FA4A9" },
  Settings:      { bg: "rgba(148,163,184,0.10)", color: "#94a3b8" },
};

// ── Analytics icon list (maps 1:1 with analytics array order) ───────────────
const ANALYTICS_ICONS = [TrendingUp, Zap, Star, Timer, Layers, ShieldAlert];

// ── Color helpers ────────────────────────────────────────────────────────────
const analyticsStatusStyle = (status: string) => {
  if (["growing", "strong", "high", "low", "on track"].includes(status))
    return { bg: "#E1F5EE", color: "#085041" };
  if (status === "active")
    return { bg: "rgba(47,164,169,0.12)", color: "#258f94" };
  return { bg: "rgba(212,161,47,0.12)", color: "#b88c26" };
};

const needsAttentionStyle = (type: string) => {
  if (type === "warning") return {
    iconBg: "rgba(212,161,47,0.12)",  iconColor: "#D4A12F",
    pillBg: "rgba(212,161,47,0.15)", pillColor: "#b88c26",
  };
  if (type === "danger") return {
    iconBg: "rgba(214,90,79,0.12)",   iconColor: "#D65A4F",
    pillBg: "rgba(214,90,79,0.15)",  pillColor: "#c0392b",
  };
  return {
    iconBg: "rgba(138,111,209,0.12)", iconColor: "#8A6FD1",
    pillBg: "rgba(138,111,209,0.15)",pillColor: "#7059b8",
  };
};

const activityDotClass = (type: string) => {
  if (type === "warning") return "bg-amber-400";
  if (type === "success") return "bg-emerald-500";
  if (type === "info")    return "bg-blue-400";
  if (type === "danger")  return "bg-red-500";
  return "bg-muted-foreground";
};

const activityPillStyle = (type: string) => {
  if (type === "warning") return { bg: "rgba(212,161,47,0.12)",  color: "#b88c26" };
  if (type === "success") return { bg: "rgba(79,175,122,0.12)",  color: "#2e7d52" };
  if (type === "info")    return { bg: "rgba(47,164,169,0.12)",  color: "#258f94" };
  if (type === "danger")  return { bg: "rgba(214,90,79,0.12)",   color: "#c0392b" };
  return                         { bg: "rgba(0,0,0,0.06)",       color: "#94a3b8" };
};

// ── Skeleton block ───────────────────────────────────────────────────────────
const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-muted/50 ${className ?? ""}`} />
);

// ── SuperModeratorDashboard ──────────────────────────────────────────────────
const SuperModeratorDashboard = () => {
  const { userId } = useUserRole();
  const [assignments, setAssignments] = useState<CareerAssignment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assignedCareers: 0,
    coursesInCareers: 0,
    postsInCareers: 0,
    pendingApprovals: 0,
    teamMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("career_assignments")
        .select(`
          id,
          career_id,
          career:careers(id, name, slug, icon, color)
        `)
        .eq("user_id", userId);

      if (assignmentError) throw assignmentError;

      const careerIds = assignmentData?.map((a) => a.career_id) || [];
      setAssignments(assignmentData as unknown as CareerAssignment[] || []);

      if (careerIds.length > 0) {
        const { data: careerCourses } = await supabase
          .from("career_courses")
          .select("course_id")
          .in("career_id", careerIds);

        const courseIds = careerCourses?.map((cc) => cc.course_id) || [];

        let postCount = 0;
        if (courseIds.length > 0) {
          const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .in("category_id", courseIds);
          postCount = count || 0;
        }

        let pendingCount = 0;
        if (courseIds.length > 0) {
          const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .in("category_id", courseIds)
            .eq("status", "pending");
          pendingCount = count || 0;
        }

        setStats({
          assignedCareers: careerIds.length,
          coursesInCareers: courseIds.length,
          postsInCareers: postCount,
          pendingApprovals: pendingCount,
          teamMembers: 0,
        });
      } else {
        setStats({
          assignedCareers: 0,
          coursesInCareers: 0,
          postsInCareers: 0,
          pendingApprovals: 0,
          teamMembers: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const { career, kpis, needsAttention, analytics, activityLog, quickActions } = careerManagerData;
  const totalAttentionItems = needsAttention.reduce((s, i) => s + i.count, 0);

  return (
    <div className="flex flex-col gap-0">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#0F6E56" }} />
            <span className="text-xs font-medium text-muted-foreground">Career Manager</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{career.name}</h1>
          <p className="text-muted-foreground">
            Monitor learner progress, content readiness, course quality, and moderation health for your assigned career
          </p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">

        {/* ── KPI Cards ────────────────────────────────────────────────────── */}
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
              {/* Total Courses */}
              <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                style={{ borderLeft: "2px solid rgba(15,110,86,0.6)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(15,110,86,0.15)" }}>
                    <BookOpen className="h-4 w-4" style={{ color: "#0F6E56" }} />
                  </span>
                </div>
                <p className="text-3xl font-bold text-foreground">{kpis.totalCourses}</p>
                <p className="text-xs text-muted-foreground mt-1">1 updated this week</p>
              </div>

              {/* Active Learners */}
              <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                style={{ borderLeft: "2px solid rgba(47,164,169,0.6)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Active Learners (7d)</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(47,164,169,0.15)" }}>
                    <Users className="h-4 w-4" style={{ color: "#2FA4A9" }} />
                  </span>
                </div>
                <p className="text-3xl font-bold text-foreground">{kpis.activeLearners}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">+12% vs last week</p>
              </div>

              {/* Published Courses */}
              <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                style={{ borderLeft: "2px solid rgba(79,175,122,0.6)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Published Courses</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(79,175,122,0.15)" }}>
                    <CheckCircle className="h-4 w-4" style={{ color: "#4FAF7A" }} />
                  </span>
                </div>
                <p className="text-3xl font-bold text-foreground">{kpis.publishedCourses}</p>
                <p className="text-xs text-muted-foreground mt-1">1 in draft</p>
              </div>

              {/* Pending Approvals */}
              <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                style={{ borderLeft: "2px solid rgba(212,161,47,0.6)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(212,161,47,0.15)" }}>
                    <Clock className="h-4 w-4" style={{ color: "#D4A12F" }} />
                  </span>
                </div>
                <p className="text-3xl font-bold text-foreground">{kpis.pendingApprovals}</p>
                <p className="text-xs mt-1" style={{ color: "#b88c26" }}>2 need review today</p>
              </div>

              {/* Completion Health */}
              <div className="card-premium rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40"
                style={{ borderLeft: "2px solid rgba(138,111,209,0.6)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Completion Health</p>
                  <span className="p-1.5 rounded-lg" style={{ background: "rgba(138,111,209,0.15)" }}>
                    <TrendingUp className="h-4 w-4" style={{ color: "#8A6FD1" }} />
                  </span>
                </div>
                <p className="text-3xl font-bold text-foreground">{kpis.completionHealth}%</p>
                <p className="text-xs text-muted-foreground mt-1">stable this week</p>
              </div>
            </>
          )}
        </div>

        {/* ── Second Row: Needs Attention · Career in Scope · Quick Actions ── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonBlock className="h-[300px] rounded-2xl" />
            <SkeletonBlock className="h-[300px] rounded-2xl" />
            <SkeletonBlock className="h-[300px] rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* COLUMN 1 — Needs Attention */}
            <div className="card-premium rounded-2xl p-7">
              <h2 className="font-semibold text-foreground mb-0.5">Needs attention</h2>
              <p className="text-sm text-muted-foreground mb-5">Items in your career requiring action</p>
              <div className="flex flex-col">
                {needsAttention.map((item, idx) => {
                  const s = needsAttentionStyle(item.type);
                  const Icon = item.type === "warning" ? AlertTriangle : item.type === "danger" ? AlertCircle : Info;
                  return (
                    <div key={item.id}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="p-1.5 rounded-lg shrink-0" style={{ background: s.iconBg }}>
                            <Icon className="h-4 w-4" style={{ color: s.iconColor }} />
                          </span>
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                        </div>
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: s.pillBg, color: s.pillColor }}
                        >
                          {item.count}
                        </span>
                      </div>
                      {idx < needsAttention.length - 1 && (
                        <div className="h-px bg-border/50" />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border/40">
                <span className="font-semibold text-foreground">{totalAttentionItems}</span> total items require your attention
              </p>
            </div>

            {/* COLUMN 2 — Career in Scope */}
            <div className="card-premium rounded-2xl p-7">
              <h2 className="font-semibold text-foreground mb-0.5">Career in scope</h2>
              <p className="text-sm text-muted-foreground mb-5">Your assigned career track and health overview</p>

              {/* Career header block */}
              <div className="flex items-center gap-3 mb-5 p-3 rounded-xl border border-border/60 bg-background">
                <span className="text-2xl leading-none">🎯</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{career.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {career.totalCourses} courses · {career.enrolledLearners} enrolled learners
                  </p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: "#E1F5EE", color: "#085041" }}
                >
                  {career.overallHealth}
                </span>
              </div>

              {/* 2×2 stat grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Avg Completion</p>
                  <p className="text-xl font-bold text-foreground">{career.avgCompletion}%</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Content Quality</p>
                  <p className="text-xl font-bold text-foreground">{career.contentQuality}%</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Engagement Rate</p>
                  <p className="text-xl font-bold text-foreground">{career.engagementRate}%</p>
                </div>
                <div className="rounded-xl bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">Open Actions</p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: career.openActions > 0 ? "#D4A12F" : undefined }}
                  >
                    {career.openActions}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40">
                <span className="text-xs text-muted-foreground">Overall career health</span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#E1F5EE", color: "#085041" }}
                >
                  {career.overallHealth}
                </span>
              </div>
            </div>

            {/* COLUMN 3 — Quick Actions */}
            <div className="card-premium rounded-2xl p-7">
              <h2 className="font-semibold text-foreground mb-0.5">Quick actions</h2>
              <p className="text-sm text-muted-foreground mb-5">Tools for managing your career</p>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = QUICK_ICON_MAP[action.icon] ?? Settings;
                  const style = QUICK_ICON_STYLE[action.icon] ?? { bg: "rgba(0,0,0,0.06)", color: "#94a3b8" };
                  return (
                    <div
                      key={action.id}
                      className="flex flex-col items-center gap-2 py-4 rounded-xl border border-border bg-background cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]"
                    >
                      <span className="p-1.5 rounded-lg" style={{ background: style.bg }}>
                        <Icon className="h-4 w-4" style={{ color: style.color }} />
                      </span>
                      <span className="text-xs font-medium text-foreground text-center leading-tight px-1">{action.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ── Analytics Snapshot + Activity Log ───────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <SkeletonBlock className="h-[360px] rounded-2xl" />
            <SkeletonBlock className="h-[360px] rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* Left: Analytics Snapshot */}
            <div className="card-premium rounded-2xl p-6">
              <div className="mb-5">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-foreground">Analytics snapshot</h2>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    live
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Derived insights across learner engagement, content quality, and career performance
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {analytics.map((item, idx) => {
                  const Icon = ANALYTICS_ICONS[idx] ?? BarChart2;
                  const pillStyle = analyticsStatusStyle(item.status);
                  return (
                    <div
                      key={item.id}
                      className="group relative flex flex-col gap-3 p-4 rounded-xl border border-border bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary hover:bg-primary/[0.06]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="p-1.5 rounded-lg" style={{ background: pillStyle.bg }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: pillStyle.color }} />
                        </span>
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded-md"
                          style={{ background: pillStyle.bg, color: pillStyle.color }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-foreground tracking-tight">{item.value}</p>
                        <p className="text-xs font-medium text-foreground/80 mt-0.5">{item.label}</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Activity Log */}
            <div className="card-premium rounded-2xl p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-foreground mb-1">Activity log</h2>
                  <p className="text-sm text-muted-foreground">Today's actions across your assigned career</p>
                </div>
                <a
                  href="/super-moderator/activity-log"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                >
                  View all →
                </a>
              </div>
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-3 pr-1 pt-1">
                  {activityLog.map((entry) => {
                    const pill = activityPillStyle(entry.type);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 px-3 py-3 rounded-xl border border-border/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-primary hover:bg-primary/[0.06]"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${activityDotClass(entry.type)}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{entry.text}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.meta}</p>
                        </div>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: pill.bg, color: pill.color }}
                        >
                          {entry.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default SuperModeratorDashboard;
