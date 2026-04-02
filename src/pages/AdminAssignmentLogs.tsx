/**
 * Assignment Logs (Read-Only Audit Log)
 *
 * Unified table of career + course assignments sorted by date.
 * No editing — all assignment management is via Team Ownership.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import {
  Briefcase, GraduationCap, Search, User, Shield, ExternalLink,
  ChevronLeft, ChevronRight, Filter, Columns, Download, RefreshCw, X,
} from "lucide-react";
import { format } from "date-fns";

/* ─── types ─── */
type AppRole = "admin" | "moderator" | "user" | "senior_moderator" | "super_moderator";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
}

interface UnifiedAssignment {
  id: string;
  type: "career" | "course";
  assigned_at: string;
  user?: UserWithRole;
  team?: { id: string; name: string } | null;
  assignedByUser?: UserWithRole | null;
  career?: { id: string; name: string; slug: string; icon: string; color: string };
  course?: { id: string; name: string; slug: string; icon: string | null };
  courseRole?: AppRole;
  isDefaultManager?: boolean;
}

/* ─── constants ─── */
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const COLUMN_LABELS: Record<string, string> = {
  type:           "Type",
  item:           "Item",
  role:           "Role",
  team:           "Team",
  defaultManager: "Default Manager",
  assignedBy:     "Assigned By",
  assignedAt:     "Assigned At",
};

/* ══════════════════════════════════════════════════════════════ */

const AdminAssignmentLogs = () => {
  const { toast } = useToast();

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<UnifiedAssignment[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter,  setTypeFilter]  = useState<"all" | "career" | "course">("all");
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    type:           true,
    item:           true,
    role:           true,
    team:           true,
    defaultManager: true,
    assignedBy:     true,
    assignedAt:     true,
  });

  useEffect(() => { fetchAllData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, typeFilter, rowsPerPage]);

  /* ─── data fetch ─── */
  const fetchAllData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [
        careersRes, coursesRes, teamsRes,
        profilesRes, rolesRes,
        careerAssignRes, courseAssignRes,
      ] = await Promise.all([
        supabase.from("careers").select("id, name, slug, icon, color"),
        supabase.from("courses").select("id, name, slug, icon").is("deleted_at", null),
        supabase.from("teams").select("id, name"),
        supabase.from("profiles").select("id, email, full_name"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("career_assignments").select("*").order("assigned_at", { ascending: false }),
        supabase.from("course_assignments").select("*").order("assigned_at", { ascending: false }),
      ]);

      const rolesMap = new Map<string, AppRole>();
      rolesRes.data?.forEach((r) => rolesMap.set(r.user_id, r.role as AppRole));

      const userMap = new Map<string, UserWithRole>(
        (profilesRes.data || []).map((u) => [u.id, { ...u, role: rolesMap.get(u.id) || null }])
      );
      const careerMap = new Map((careersRes.data || []).map((c) => [c.id, c]));
      const courseMap = new Map((coursesRes.data || []).map((c) => [c.id, c]));
      const teamMap   = new Map((teamsRes.data  || []).map((t) => [t.id, t]));

      const careerRows: UnifiedAssignment[] = (careerAssignRes.data || []).map((a) => ({
        id: a.id, type: "career", assigned_at: a.assigned_at,
        user:           userMap.get(a.user_id),
        team:           a.team_id ? (teamMap.get(a.team_id) ?? null) : null,
        assignedByUser: a.assigned_by ? (userMap.get(a.assigned_by) ?? null) : null,
        career:         careerMap.get(a.career_id),
      }));

      const courseRows: UnifiedAssignment[] = (courseAssignRes.data || []).map((a) => ({
        id: a.id, type: "course", assigned_at: a.assigned_at,
        user:             userMap.get(a.user_id),
        team:             a.team_id ? (teamMap.get(a.team_id) ?? null) : null,
        assignedByUser:   a.assigned_by ? (userMap.get(a.assigned_by) ?? null) : null,
        course:           courseMap.get(a.course_id),
        courseRole:       a.role as AppRole,
        isDefaultManager: a.is_default_manager,
      }));

      const merged = [...careerRows, ...courseRows].sort(
        (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      );
      setAssignments(merged);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ─── filtering ─── */
  const filtered = useMemo(() => {
    let list = assignments;
    if (typeFilter !== "all") list = list.filter((a) => a.type === typeFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.user?.full_name?.toLowerCase().includes(q) ||
          a.user?.email.toLowerCase().includes(q) ||
          a.career?.name.toLowerCase().includes(q) ||
          a.course?.name.toLowerCase().includes(q) ||
          a.team?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [assignments, typeFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated  = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const careerCount = assignments.filter((a) => a.type === "career").length;
  const courseCount = assignments.filter((a) => a.type === "course").length;
  const hasFilter   = typeFilter !== "all";

  /* ─── export CSV ─── */
  const handleExportCSV = () => {
    const getRoleText = (a: UnifiedAssignment) => {
      if (a.type === "career") {
        const map: Record<string, string> = {
          admin: "Platform Manager", super_moderator: "Career Manager",
          senior_moderator: "Course Manager", moderator: "Content Moderator",
        };
        return map[a.user?.role || ""] || "Learner";
      }
      return a.courseRole === "senior_moderator" ? "Course Manager" : "Content Moderator";
    };

    const headers = ["User", "Email", "Type", "Item", "Role", "Team", "Default Manager", "Assigned By", "Assigned At"];
    const rows = filtered.map((a) => [
      a.user?.full_name || "Unknown",
      a.user?.email || "",
      a.type === "career" ? "Career" : "Course",
      a.type === "career" ? (a.career?.name || "Unknown") : (a.course?.name || "Unknown"),
      getRoleText(a),
      a.team?.name || "",
      a.type === "course" && a.isDefaultManager ? "Yes" : "",
      a.assignedByUser?.full_name || a.assignedByUser?.email || "",
      format(new Date(a.assigned_at), "dd MMM yyyy, HH:mm"),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url; el.download = `assignment-logs_${new Date().toISOString().slice(0, 10)}.csv`;
    el.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  /* ─── role badge ─── */
  const getRoleBadge = (a: UnifiedAssignment) => {
    if (a.type === "career") {
      switch (a.user?.role) {
        case "admin":           return <Badge className="bg-[#8B1E1E]/10 text-[#8B1E1E] border-[#8B1E1E]/20">Platform Manager</Badge>;
        case "super_moderator": return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Career Manager</Badge>;
        case "senior_moderator":return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Course Manager</Badge>;
        case "moderator":       return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Content Moderator</Badge>;
        default:                return <Badge variant="outline">Learner</Badge>;
      }
    }
    switch (a.courseRole) {
      case "senior_moderator": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Course Manager</Badge>;
      case "moderator":        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Content Moderator</Badge>;
      default:                 return <Badge variant="outline">Unknown</Badge>;
    }
  };

  /* ─── loading skeleton ─── */
  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  /* ══════════ render ══════════ */
  return (
    <div className="flex flex-col gap-0">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment Logs</h1>
          <p className="text-muted-foreground">
            Read-only view of all career and course assignments for auditing purposes
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/team-ownership">
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage in Team Ownership
          </Link>
        </Button>
      </div>

      <div className="admin-section-spacing-top" />

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-3">

        {/* Left: search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by user, item or team…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Right: filter + columns + export + refresh */}
        <div className="ml-auto flex items-center gap-2">

          {/* Filter */}
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Filter className="h-3.5 w-3.5" />
                Filter
                {hasFilter && (
                  <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-medium">
                    1
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-3 space-y-3" align="end">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assignment Type</p>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types ({assignments.length})</SelectItem>
                  <SelectItem value="career">Careers ({careerCount})</SelectItem>
                  <SelectItem value="course">Courses ({courseCount})</SelectItem>
                </SelectContent>
              </Select>
              {hasFilter && (
                <Button
                  variant="ghost" size="sm"
                  className="w-full h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => { setTypeFilter("all"); setFilterOpen(false); }}
                >
                  <X className="h-3 w-3" />Clear filter
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Columns */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Columns className="h-3.5 w-3.5" />Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2">
              {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }))}
                >
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={visibleColumns[key]}
                    onCheckedChange={(v) => setVisibleColumns((prev) => ({ ...prev, [key]: v }))}
                    onClick={(e) => e.stopPropagation()}
                    className="scale-75 origin-right"
                  />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export CSV */}
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" />Export CSV
          </Button>

          {/* Refresh */}
          <Button
            variant="outline" size="sm" className="gap-1.5 h-9"
            onClick={() => fetchAllData(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th:not(:last-child)]:border-r">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                User
              </TableHead>
              {visibleColumns.type && (
                <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                  Type
                </TableHead>
              )}
              {visibleColumns.item && (
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                  Item
                </TableHead>
              )}
              {visibleColumns.role && (
                <TableHead className="w-[170px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                  Role
                </TableHead>
              )}
              {visibleColumns.team && (
                <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                  Team
                </TableHead>
              )}
              {visibleColumns.defaultManager && (
                <TableHead className="w-[150px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                  Default Manager
                </TableHead>
              )}
              {visibleColumns.assignedBy && (
                <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                  Assigned By
                </TableHead>
              )}
              {visibleColumns.assignedAt && (
                <TableHead className="w-[170px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                  Assigned At
                </TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={1 + Object.values(visibleColumns).filter(Boolean).length}
                  className="text-center py-16"
                >
                  <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">
                    {searchQuery || hasFilter
                      ? "No assignments match your search or filters."
                      : "No assignments found."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((a) => (
                <TableRow
                  key={`${a.type}-${a.id}`}
                  className="hover:bg-muted/30 transition-colors [&>td:not(:last-child)]:border-r"
                >
                  {/* User — always visible */}
                  <TableCell className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{a.user?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{a.user?.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  {visibleColumns.type && (
                    <TableCell className="py-3 px-4 w-[100px]">
                      {a.type === "career" ? (
                        <Badge variant="outline" className="gap-1 text-purple-600 border-purple-500/40 font-normal">
                          <Briefcase className="h-3 w-3" />Career
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/40 font-normal">
                          <GraduationCap className="h-3 w-3" />Course
                        </Badge>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.item && (
                    <TableCell className="py-3 px-4">
                      {a.type === "career" && a.career ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                            style={{ backgroundColor: a.career.color || "hsl(var(--primary))" }}
                          >
                            {a.career.icon || a.career.name?.[0]}
                          </div>
                          <span className="font-medium text-sm">{a.career.name}</span>
                        </div>
                      ) : a.type === "course" && a.course ? (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm">{a.course.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Unknown</span>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.role && (
                    <TableCell className="py-3 px-4 w-[170px]">{getRoleBadge(a)}</TableCell>
                  )}

                  {visibleColumns.team && (
                    <TableCell className="py-3 px-4 w-[130px]">
                      {a.team ? (
                        <Badge variant="outline">{a.team.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.defaultManager && (
                    <TableCell className="py-3 px-4 w-[150px]">
                      {a.type === "course" && a.isDefaultManager ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                          <Shield className="h-3 w-3" />Yes
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  )}

                  {visibleColumns.assignedBy && (
                    <TableCell className="py-3 px-4 w-[140px] text-sm text-muted-foreground">
                      {a.assignedByUser?.full_name || a.assignedByUser?.email || "—"}
                    </TableCell>
                  )}

                  {visibleColumns.assignedAt && (
                    <TableCell className="py-3 px-4 w-[170px] text-sm text-muted-foreground">
                      {format(new Date(a.assigned_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {filtered.length === 0
              ? "0 records"
              : `${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, filtered.length)} of ${filtered.length} records`}
          </span>
          <span className="text-muted-foreground/50">Page {currentPage} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline" size="icon" className="h-7 w-7"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignmentLogs;
