import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Activity,
  Send,
  RotateCcw,
  RefreshCw,
  ClipboardList,
  Filter,
} from "lucide-react";
import { format, subDays } from "date-fns";

// ── Role color map ────────────────────────────────────────────────────────────
const ROLE_META: Record<string, { bg: string; color: string; label: string }> = {
  admin:            { bg: "rgba(15,110,86,0.12)",  color: "#0F6E56", label: "Admin"      },
  super_moderator:  { bg: "rgba(26,122,98,0.12)",  color: "#1A7A62", label: "Super Mod"  },
  senior_moderator: { bg: "rgba(38,135,112,0.12)", color: "#268770", label: "Senior Mod" },
  moderator:        { bg: "rgba(51,148,126,0.12)", color: "#33947E", label: "Moderator"  },
};

// ── Action display config ─────────────────────────────────────────────────────
const ACTION_META: Record<string, {
  Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  label: string;
}> = {
  approved:          { Icon: CheckCircle, color: "#4FAF7A", bg: "rgba(79,175,122,0.15)",  label: "Approved"          },
  rejected:          { Icon: XCircle,     color: "#D65A4F", bg: "rgba(214,90,79,0.12)",   label: "Rejected"          },
  submitted:         { Icon: Send,        color: "#2FA4A9", bg: "rgba(47,164,169,0.12)",  label: "Submitted"         },
  changes_requested: { Icon: RotateCcw,   color: "#D4A12F", bg: "rgba(212,161,47,0.12)", label: "Changes Requested" },
};

interface ActivityEntry {
  id: string;
  action: string;
  performed_by: string;
  content_type: string;
  content_id: string;
  feedback: string | null;
  created_at: string;
  actor_name: string;
  actor_role: string;
}

const DATE_RANGES = [
  { label: "Today",        value: "today" },
  { label: "Last 7 days",  value: "7d"    },
  { label: "Last 30 days", value: "30d"   },
  { label: "All time",     value: "all"   },
];

const PAGE_SIZE = 25;

const getDateFilter = (range: string): string | null => {
  if (range === "today") {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === "7d")  return subDays(new Date(), 7).toISOString();
  if (range === "30d") return subDays(new Date(), 30).toISOString();
  return null;
};

const formatDayLabel = (dateKey: string) => {
  const today     = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  if (dateKey === today)     return "Today";
  if (dateKey === yesterday) return "Yesterday";
  return format(new Date(dateKey + "T12:00:00"), "MMMM d, yyyy");
};

// ── SuperModeratorActivityLog ─────────────────────────────────────────────────
const SuperModeratorActivityLog = () => {
  const { userId } = useUserRole();

  const [scopedIds, setScopedIds]   = useState<string[]>([]);
  const [scopeReady, setScopeReady] = useState(false);

  const [entries, setEntries]           = useState<ActivityEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(false);
  const [offset, setOffset]             = useState(0);

  const [filterAction, setFilterAction] = useState("all");
  const [filterDate,   setFilterDate]   = useState("30d");

  // ── Step 1: resolve career + course IDs for this user ──────────────────────
  useEffect(() => {
    if (!userId) return;

    const resolveScope = async () => {
      const { data: assignmentData } = await supabase
        .from("career_assignments")
        .select("career_id")
        .eq("user_id", userId);

      const careerIds = assignmentData?.map((a) => a.career_id) ?? [];

      let courseIds: string[] = [];
      if (careerIds.length > 0) {
        const { data: careerCourses } = await supabase
          .from("career_courses")
          .select("course_id")
          .in("career_id", careerIds);
        courseIds = careerCourses?.map((cc) => cc.course_id) ?? [];
      }

      setScopedIds([...careerIds, ...courseIds]);
      setScopeReady(true);
    };

    resolveScope();
  }, [userId]);

  // ── Step 2: fetch activity once scope is ready ──────────────────────────────
  const doFetch = async (
    currentOffset: number,
    action: string,
    dateRange: string,
    append: boolean,
    ids: string[],
  ) => {
    if (ids.length === 0) {
      setEntries([]);
      setHasMore(false);
      return;
    }

    try {
      let query = supabase
        .from("approval_history")
        .select("id, action, performed_by, content_type, content_id, feedback, created_at")
        .in("content_id", ids)
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + PAGE_SIZE - 1);

      const dateFrom = getDateFilter(dateRange);
      if (dateFrom)         query = query.gte("created_at", dateFrom);
      if (action !== "all") query = query.eq("action", action);

      const { data } = await query;
      if (!data) return;

      const userIds = [...new Set(data.map((e) => e.performed_by).filter(Boolean))];

      let profileMap = new Map<string, string | null>();
      let roleMap    = new Map<string, string>();

      if (userIds.length > 0) {
        const [profilesRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("id, full_name").in("id", userIds),
          supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
        ]);
        profileMap = new Map(profilesRes.data?.map((p) => [p.id, p.full_name]) ?? []);
        roleMap    = new Map(rolesRes.data?.map((r) => [r.user_id, r.role]) ?? []);
      }

      const enriched: ActivityEntry[] = data.map((e) => ({
        ...e,
        actor_name: profileMap.get(e.performed_by) ?? `User (${e.performed_by?.slice(0, 6) ?? "?"})`,
        actor_role: roleMap.get(e.performed_by) ?? "unknown",
      }));

      setHasMore(data.length === PAGE_SIZE);
      setEntries((prev) => append ? [...prev, ...enriched] : enriched);
    } catch (err) {
      console.error("Error fetching activity:", err);
    }
  };

  // Refetch from scratch when filters change (only after scope is ready)
  useEffect(() => {
    if (!scopeReady) return;
    setLoading(true);
    setEntries([]);
    setOffset(0);
    doFetch(0, filterAction, filterDate, false, scopedIds).finally(() => setLoading(false));
  }, [filterAction, filterDate, scopeReady]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setEntries([]);
    setOffset(0);
    await doFetch(0, filterAction, filterDate, false, scopedIds);
    setIsRefreshing(false);
  };

  const handleLoadMore = async () => {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    setLoadingMore(true);
    await doFetch(next, filterAction, filterDate, true, scopedIds);
    setLoadingMore(false);
  };

  // Group entries by calendar day
  const grouped = entries.reduce<Record<string, ActivityEntry[]>>((acc, entry) => {
    const day = format(new Date(entry.created_at), "yyyy-MM-dd");
    if (!acc[day]) acc[day] = [];
    acc[day].push(entry);
    return acc;
  }, {});
  const groupedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const isFiltered = filterDate !== "30d" || filterAction !== "all";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Career Activity</h1>
          <p className="text-muted-foreground">All actions within your assigned careers and courses</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Filters */}
      <div className="card-premium rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

          <Select value={filterDate} onValueChange={setFilterDate}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"               className="text-xs">All actions</SelectItem>
              <SelectItem value="approved"          className="text-xs">Approved</SelectItem>
              <SelectItem value="rejected"          className="text-xs">Rejected</SelectItem>
              <SelectItem value="submitted"         className="text-xs">Submitted</SelectItem>
              <SelectItem value="changes_requested" className="text-xs">Changes Requested</SelectItem>
            </SelectContent>
          </Select>

          {isFiltered && (
            <button
              onClick={() => { setFilterDate("30d"); setFilterAction("all"); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="card-premium rounded-2xl p-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse h-[68px] rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No activity found</p>
            <p className="text-xs text-muted-foreground/60">
              {scopedIds.length === 0
                ? "No careers are assigned to your account yet"
                : "Try adjusting your filters or date range"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedKeys.map((dayKey) => (
              <div key={dayKey}>
                {/* Day separator */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {formatDayLabel(dayKey)}
                  </span>
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-xs text-muted-foreground">
                    {grouped[dayKey].length} action{grouped[dayKey].length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Entries for this day */}
                <div className="space-y-2">
                  {grouped[dayKey].map((entry) => {
                    const am = ACTION_META[entry.action] ?? {
                      Icon: Activity,
                      color: "#94a3b8",
                      bg: "rgba(0,0,0,0.06)",
                      label: entry.action,
                    };
                    const rm = ROLE_META[entry.actor_role];
                    const { Icon } = am;

                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border/40 bg-background transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-primary hover:bg-primary/[0.06]"
                      >
                        {/* Action icon */}
                        <span className="p-1.5 rounded-lg shrink-0 mt-0.5" style={{ background: am.bg }}>
                          <Icon className="h-4 w-4" style={{ color: am.color }} />
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">{entry.actor_name}</span>
                            {rm && (
                              <span
                                className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                                style={{ background: rm.bg, color: rm.color }}
                              >
                                {rm.label}
                              </span>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {am.label.toLowerCase()} a{" "}
                              <span className="font-medium text-foreground/80">{entry.content_type}</span>
                            </span>
                          </div>
                          {entry.feedback && (
                            <p className="text-xs text-muted-foreground mt-1 italic truncate">
                              "{entry.feedback}"
                            </p>
                          )}
                        </div>

                        {/* Time */}
                        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                          {format(new Date(entry.created_at), "h:mm a")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors px-5 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/[0.04] disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperModeratorActivityLog;
