import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UMLoader from "@/components/UMLoader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Megaphone, Trash2, Search, Filter, Columns, Download,
  RefreshCw, ChevronLeft, ChevronRight, X, CheckCircle, XCircle,
  CalendarClock, Edit2, ArrowRight,
} from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

/* ─── types ─── */
interface AnnouncementBar {
  id: string;
  name: string;
  message: string;
  link_text: string | null;
  link_url: string | null;
  bg_color: string;
  text_color: string;
  is_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  target_type: string;
  target_ids: string[];
  audience: string;
  created_at: string;
}

type BarStatus = "active" | "disabled" | "expired" | "upcoming";

type FormData = {
  name: string;
  message: string;
  link_text: string;
  link_url: string;
  bg_color: string;
  text_color: string;
  is_enabled: boolean;
  start_date: string;
  end_date: string;
  priority: number;
  target_type: string;
  target_ids: string[];
  audience: string;
};

/* ─── constants ─── */
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const COLUMN_LABELS: Record<string, string> = {
  name: "Name",
  message: "Message",
  target: "Target",
  audience: "Audience",
  priority: "Priority",
  schedule: "Schedule",
  status: "Status",
  actions: "Actions",
};

const TARGET_OPTIONS = [
  { value: "entire_site",     label: "Entire Site" },
  { value: "home",            label: "Home Page" },
  { value: "all_courses",     label: "All Courses" },
  { value: "specific_course", label: "Specific Course" },
  { value: "all_careers",     label: "All Careers" },
  { value: "specific_career", label: "Specific Career" },
  { value: "pricing",         label: "Pricing Page" },
  { value: "checkout",        label: "Checkout" },
  { value: "admin",           label: "Admin Pages" },
  { value: "custom_path",     label: "Custom Path" },
];

const AUDIENCE_OPTIONS = [
  { value: "all",        label: "Everyone" },
  { value: "logged_in",  label: "Logged In Only" },
  { value: "logged_out", label: "Logged Out Only" },
];

const emptyForm: FormData = {
  name: "",
  message: "",
  link_text: "",
  link_url: "",
  bg_color: "#18181b",
  text_color: "#ffffff",
  is_enabled: true,
  start_date: "",
  end_date: "",
  priority: 0,
  target_type: "entire_site",
  target_ids: [],
  audience: "all",
};

/* ─── helpers ─── */
function getStatus(bar: AnnouncementBar): BarStatus {
  if (!bar.is_enabled) return "disabled";
  const now = new Date();
  if (bar.end_date && isPast(new Date(bar.end_date))) return "expired";
  if (bar.start_date && isFuture(new Date(bar.start_date))) return "upcoming";
  return "active";
}

function StatusBadge({ status }: { status: BarStatus }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
          <CheckCircle className="h-3 w-3" />Active
        </Badge>
      );
    case "disabled":
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />Disabled
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="destructive" className="gap-1 bg-orange-500/10 text-orange-600 border-orange-500/20">
          <XCircle className="h-3 w-3" />Expired
        </Badge>
      );
    case "upcoming":
      return (
        <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/40">
          <CalendarClock className="h-3 w-3" />Upcoming
        </Badge>
      );
  }
}

function TargetBadge({ targetType }: { targetType: string }) {
  const label = TARGET_OPTIONS.find((t) => t.value === targetType)?.label ?? targetType;
  return <Badge variant="outline" className="text-xs font-normal">{label}</Badge>;
}

function AudienceBadge({ audience }: { audience: string }) {
  const label = AUDIENCE_OPTIONS.find((a) => a.value === audience)?.label ?? audience;
  const cls =
    audience === "logged_in"
      ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
      : audience === "logged_out"
      ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
      : "";
  return <Badge variant="outline" className={`text-xs font-normal ${cls}`}>{label}</Badge>;
}

/* ═══════════ PAGE ═══════════ */
const AdminAnnouncementBars = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ─── data ─── */
  const [bars, setBars] = useState<AnnouncementBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ─── select options for specific_course / specific_career ─── */
  const [allCareers, setAllCareers] = useState<{ id: string; name: string }[]>([]);
  const [allCourses, setAllCourses] = useState<{ id: string; name: string }[]>([]);
  const [itemSearch, setItemSearch] = useState("");

  /* ─── toolbar ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true, message: true, target: true, audience: true,
    priority: false, schedule: true, status: true, actions: true,
  });

  /* ─── pagination ─── */
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  /* ─── selection ─── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  /* ─── form / dialogs ─── */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBar, setSelectedBar] = useState<AnnouncementBar | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ─── init ─── */
  useEffect(() => {
    fetchBars();
    fetchSelectOptions();
  }, []);

  const fetchBars = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("announcement_bars")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error fetching announcement bars", variant: "destructive" });
    } else {
      setBars(
        (data || []).map((b: any) => ({
          ...b,
          target_ids: b.target_ids ?? [],
        }))
      );
    }
    setLoading(false);
  };

  const fetchSelectOptions = async () => {
    const [careersRes, coursesRes] = await Promise.all([
      supabase.from("careers").select("id, name").order("name"),
      supabase.from("courses").select("id, name").order("name"),
    ]);
    if (careersRes.data) setAllCareers(careersRes.data as { id: string; name: string }[]);
    if (coursesRes.data) setAllCourses(coursesRes.data as { id: string; name: string }[]);
  };

  /* ─── filtered + paginated ─── */
  const filtered = useMemo(() => {
    let list = bars;
    const q = searchQuery.toLowerCase();
    if (q) {
      list = list.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.message.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((b) => getStatus(b) === statusFilter);
    }
    if (targetFilter !== "all") {
      list = list.filter((b) => b.target_type === targetFilter);
    }
    return list;
  }, [bars, searchQuery, statusFilter, targetFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, targetFilter, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  /* ─── selection ─── */
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((b) => b.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ─── bulk delete ─── */
  const handleBulkDelete = async () => {
    setBulkDeleteLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await (supabase as any).from("announcement_bars").delete().in("id", ids);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      setBars((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      toast({ title: `${ids.length} bar${ids.length > 1 ? "s" : ""} deleted` });
    }
    setSelectedIds(new Set());
    setBulkDeleteLoading(false);
    setBulkDeleteDialogOpen(false);
  };

  /* ─── export CSV ─── */
  const handleExportCSV = () => {
    const headers = ["Name", "Message", "Target", "Audience", "Priority", "Status", "Start", "End"];
    const rows = filtered.map((b) => [
      b.name,
      b.message,
      TARGET_OPTIONS.find((t) => t.value === b.target_type)?.label ?? b.target_type,
      AUDIENCE_OPTIONS.find((a) => a.value === b.audience)?.label ?? b.audience,
      String(b.priority),
      getStatus(b),
      b.start_date ? format(new Date(b.start_date), "dd MMM yyyy") : "",
      b.end_date ? format(new Date(b.end_date), "dd MMM yyyy") : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `announcement-bars_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  /* ─── toggle enabled (optimistic) ─── */
  const toggleEnabled = async (bar: AnnouncementBar) => {
    const next = !bar.is_enabled;
    setBars((prev) => prev.map((b) => (b.id === bar.id ? { ...b, is_enabled: next } : b)));
    const { error } = await (supabase as any)
      .from("announcement_bars")
      .update({ is_enabled: next })
      .eq("id", bar.id);
    if (error) {
      setBars((prev) => prev.map((b) => (b.id === bar.id ? { ...b, is_enabled: bar.is_enabled } : b)));
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  /* ─── validation ─── */
  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.name.trim()) errors.name = "Internal name is required.";
    if (!formData.message.trim()) errors.message = "Message is required.";
    if (formData.link_text && !formData.link_url)
      errors.link_url = "Link URL is required when link text is set.";
    if (formData.link_url && !formData.link_text)
      errors.link_text = "Link text is required when link URL is set.";
    if (
      ["specific_course", "specific_career"].includes(formData.target_type) &&
      formData.target_ids.length === 0
    ) {
      errors.target_ids = `Select at least one ${formData.target_type === "specific_course" ? "course" : "career"}.`;
    }
    if (
      formData.start_date &&
      formData.end_date &&
      new Date(formData.start_date) >= new Date(formData.end_date)
    ) {
      errors.end_date = "End date must be after start date.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ─── save ─── */
  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);

    const payload = {
      name: formData.name.trim(),
      message: formData.message.trim(),
      link_text: formData.link_text.trim() || null,
      link_url: formData.link_url.trim() || null,
      bg_color: formData.bg_color,
      text_color: formData.text_color,
      is_enabled: formData.is_enabled,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      priority: formData.priority,
      target_type: formData.target_type,
      target_ids: formData.target_ids,
      audience: formData.audience,
    };

    if (selectedBar) {
      const { data, error } = await (supabase as any)
        .from("announcement_bars")
        .update(payload)
        .eq("id", selectedBar.id)
        .select()
        .single();
      if (error) {
        toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      } else {
        setBars((prev) => prev.map((b) => (b.id === selectedBar.id ? { ...data, target_ids: data.target_ids ?? [] } : b)));
        toast({ title: "Announcement bar updated" });
        setDialogOpen(false);
      }
    } else {
      const { data, error } = await (supabase as any)
        .from("announcement_bars")
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast({ title: "Failed to create", description: error.message, variant: "destructive" });
      } else {
        setBars((prev) => [{ ...data, target_ids: data.target_ids ?? [] }, ...prev]);
        toast({ title: "Announcement bar created" });
        setDialogOpen(false);
      }
    }
    setIsSaving(false);
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    if (!selectedBar) return;
    setIsDeleting(true);
    const { error } = await (supabase as any)
      .from("announcement_bars")
      .delete()
      .eq("id", selectedBar.id);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      setBars((prev) => prev.filter((b) => b.id !== selectedBar.id));
      toast({ title: "Announcement bar deleted" });
    }
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setSelectedBar(null);
  };

  const hasActiveFilters = statusFilter !== "all" || targetFilter !== "all";

  /* ─── specific items selector (inside form) ─── */
  const needsItemSelector = formData.target_type === "specific_course" || formData.target_type === "specific_career";
  const selectorItems = formData.target_type === "specific_course" ? allCourses : allCareers;
  const filteredSelectorItems = selectorItems.filter((i) =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const toggleTargetId = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      target_ids: prev.target_ids.includes(id)
        ? prev.target_ids.filter((i) => i !== id)
        : [...prev.target_ids, id],
    }));
    if (formErrors.target_ids) setFormErrors((e) => ({ ...e, target_ids: undefined }));
  };

  /* ─── preview status for dialog ─── */
  const previewStatus = (): BarStatus => {
    if (!formData.is_enabled) return "disabled";
    const now = new Date();
    if (formData.end_date && isPast(new Date(formData.end_date))) return "expired";
    if (formData.start_date && isFuture(new Date(formData.start_date))) return "upcoming";
    return "active";
  };

  /* ══════════ render ══════════ */
  return (
    <>
      <div className="flex flex-col gap-0">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Announcement Bars</h1>
            <p className="text-muted-foreground">
              Create targeted announcement banners for specific pages and audiences
            </p>
          </div>
          <Button onClick={() => navigate("/admin/announcement-bars/new")}>
            <Plus className="h-4 w-4 mr-2" />New Announcement
          </Button>
        </div>

        <div className="admin-section-spacing-top" />

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or message…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Bulk delete */}
            {selectedIds.size > 0 && (
              <Button
                variant="destructive" className="gap-2"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={bulkDeleteLoading}
              >
                <Trash2 className="h-4 w-4" />
                Delete {selectedIds.size} row{selectedIds.size > 1 ? "s" : ""}
              </Button>
            )}

            <div className="flex items-center gap-2 ml-auto">

              {/* Filter */}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                    {hasActiveFilters && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-0.5">
                        {[statusFilter !== "all", targetFilter !== "all"].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-4 shadow-lg space-y-3" align="end">
                  <h4 className="text-sm font-semibold text-foreground">Filters</h4>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Status</p>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Target</p>
                    <Select value={targetFilter} onValueChange={setTargetFilter}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Targets</SelectItem>
                        {TARGET_OPTIONS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost" size="sm"
                      className="w-full h-8 text-xs text-muted-foreground"
                      onClick={() => { setStatusFilter("all"); setTargetFilter("all"); setFilterOpen(false); }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />Clear filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Columns */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Columns className="h-4 w-4" />Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-2">
                  <div className="mb-2 px-1 py-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Toggle Columns
                  </div>
                  {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onSelect={(e) => {
                        e.preventDefault();
                        setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
                      }}
                      className="flex items-center gap-3 py-2 cursor-pointer focus:bg-accent rounded-md"
                    >
                      <Switch checked={visibleColumns[key]} className="pointer-events-none" />
                      <span className="text-sm font-medium">{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export CSV */}
              <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />Export CSV
              </Button>

              {/* Refresh */}
              <Button
                variant="outline" className="gap-2" disabled={refreshing}
                onClick={async () => { setRefreshing(true); await fetchBars(); setRefreshing(false); }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {statusFilter !== "all" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs">
                  <span className="font-medium text-foreground">Status</span>
                  <span className="text-muted-foreground">is</span>
                  <span className="font-medium text-foreground">"{statusFilter}"</span>
                  <button onClick={() => setStatusFilter("all")} className="ml-0.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {targetFilter !== "all" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs">
                  <span className="font-medium text-foreground">Target</span>
                  <span className="text-muted-foreground">is</span>
                  <span className="font-medium text-foreground">"{TARGET_OPTIONS.find(t => t.value === targetFilter)?.label}"</span>
                  <button onClick={() => setTargetFilter("all")} className="ml-0.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <button
                onClick={() => { setStatusFilter("all"); setTargetFilter("all"); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="mt-3" />

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <UMLoader size={44} label="Loading announcement bars…" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th:not(:last-child)]:border-r">
                  <TableHead className="w-10 h-9 pl-4 align-middle">
                    <input
                      type="checkbox"
                      checked={paginated.length > 0 && selectedIds.size === paginated.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < paginated.length;
                      }}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer block"
                    />
                  </TableHead>
                  {visibleColumns.name && (
                    <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Name</TableHead>
                  )}
                  {visibleColumns.message && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Message</TableHead>
                  )}
                  {visibleColumns.target && (
                    <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Target</TableHead>
                  )}
                  {visibleColumns.audience && (
                    <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Audience</TableHead>
                  )}
                  {visibleColumns.priority && (
                    <TableHead className="w-20 text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 text-center">Priority</TableHead>
                  )}
                  {visibleColumns.schedule && (
                    <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Schedule</TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Status</TableHead>
                  )}
                  {visibleColumns.actions && (
                    <TableHead className="w-24 text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 text-right px-4">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                      className="text-center py-16"
                    >
                      <Megaphone className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        {searchQuery || hasActiveFilters
                          ? "No announcement bars match your search or filters."
                          : "No announcement bars created yet."}
                      </p>
                      {!searchQuery && !hasActiveFilters && (
                        <Button className="mt-4" onClick={() => navigate("/admin/announcement-bars/new")}>
                          Create Your First Announcement
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((bar) => {
                    const status = getStatus(bar);
                    return (
                      <TableRow
                        key={bar.id}
                        className={`hover:bg-muted/30 transition-colors [&>td:not(:last-child)]:border-r ${
                          selectedIds.has(bar.id) ? "hover:bg-muted/40" : ""
                        }`}
                      >
                        <TableCell className="w-10 pl-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(bar.id)}
                            onChange={() => handleToggleSelectRow(bar.id)}
                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                          />
                        </TableCell>

                        {/* name + color swatch */}
                        {visibleColumns.name && (
                          <TableCell className="py-3 px-4 w-[180px]">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full shrink-0 border border-border/40"
                                style={{ backgroundColor: bar.bg_color }}
                              />
                              <span className="font-medium text-sm truncate">{bar.name}</span>
                            </div>
                          </TableCell>
                        )}

                        {/* message */}
                        {visibleColumns.message && (
                          <TableCell className="py-3 px-4 max-w-0">
                            <p className="text-sm text-muted-foreground truncate">{bar.message}</p>
                          </TableCell>
                        )}

                        {/* target */}
                        {visibleColumns.target && (
                          <TableCell className="py-3 px-4 w-[140px]">
                            <TargetBadge targetType={bar.target_type} />
                          </TableCell>
                        )}

                        {/* audience */}
                        {visibleColumns.audience && (
                          <TableCell className="py-3 px-4 w-[130px]">
                            <AudienceBadge audience={bar.audience} />
                          </TableCell>
                        )}

                        {/* priority */}
                        {visibleColumns.priority && (
                          <TableCell className="py-3 w-20 text-center">
                            <span className="text-sm font-medium tabular-nums">{bar.priority}</span>
                          </TableCell>
                        )}

                        {/* schedule */}
                        {visibleColumns.schedule && (
                          <TableCell className="py-3 px-4 w-[140px]">
                            {bar.start_date || bar.end_date ? (
                              <span className="text-xs text-muted-foreground">
                                {bar.start_date && format(new Date(bar.start_date), "dd MMM yy")}
                                {bar.start_date && bar.end_date && <ArrowRight className="inline h-3 w-3 mx-1" />}
                                {bar.end_date && format(new Date(bar.end_date), "dd MMM yy")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Always</span>
                            )}
                          </TableCell>
                        )}

                        {/* status + toggle */}
                        {visibleColumns.status && (
                          <TableCell className="py-3 px-4 w-[140px]">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={bar.is_enabled}
                                onCheckedChange={() => toggleEnabled(bar)}
                              />
                              <StatusBadge status={status} />
                            </div>
                          </TableCell>
                        )}

                        {/* actions */}
                        {visibleColumns.actions && (
                          <TableCell className="py-3 px-4 w-24">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon" variant="ghost" className="h-8 w-8"
                                onClick={() => navigate(`/admin/announcement-bars/${bar.id}`)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon" variant="ghost"
                                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => { setSelectedBar(bar); setDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

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
              <Button variant="outline" size="icon" className="h-7 w-7"
                disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7"
                disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ Create / Edit Dialog ═══════════ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!isSaving) setDialogOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBar ? "Edit Announcement Bar" : "Create Announcement Bar"}</DialogTitle>
            <DialogDescription>
              {selectedBar ? "Update this announcement bar." : "Configure a new targeted announcement banner."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-1">

            {/* Internal name */}
            <div className="space-y-1.5">
              <Label>Internal Name <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (formErrors.name) setFormErrors({ ...formErrors, name: undefined }); }}
                placeholder="e.g. Black Friday — Courses Page"
              />
              {formErrors.name ? (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Only visible to admins, not shown to visitors.</p>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label>Message <span className="text-destructive">*</span></Label>
              <Input
                value={formData.message}
                onChange={(e) => { setFormData({ ...formData, message: e.target.value }); if (formErrors.message) setFormErrors({ ...formErrors, message: undefined }); }}
                placeholder="🎉 Limited time offer — 50% off all courses!"
              />
              {formErrors.message && <p className="text-xs text-destructive">{formErrors.message}</p>}
            </div>

            {/* CTA link */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>CTA Link Text</Label>
                <Input
                  value={formData.link_text}
                  onChange={(e) => { setFormData({ ...formData, link_text: e.target.value }); if (formErrors.link_text) setFormErrors({ ...formErrors, link_text: undefined }); }}
                  placeholder="Shop now →"
                />
                {formErrors.link_text && <p className="text-xs text-destructive">{formErrors.link_text}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>CTA URL</Label>
                <Input
                  value={formData.link_url}
                  onChange={(e) => { setFormData({ ...formData, link_url: e.target.value }); if (formErrors.link_url) setFormErrors({ ...formErrors, link_url: undefined }); }}
                  placeholder="/courses or https://…"
                />
                {formErrors.link_url && <p className="text-xs text-destructive">{formErrors.link_url}</p>}
              </div>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.bg_color}
                    onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                    className="w-10 h-9 rounded border cursor-pointer shrink-0"
                  />
                  <Input
                    value={formData.bg_color}
                    onChange={(e) => setFormData({ ...formData, bg_color: e.target.value })}
                    className="font-mono text-sm"
                    placeholder="#18181b"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Text Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="w-10 h-9 rounded border cursor-pointer shrink-0"
                  />
                  <Input
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="font-mono text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            {/* Live preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Preview</Label>
                <StatusBadge status={previewStatus()} />
              </div>
              <div className="rounded-md overflow-hidden border border-border">
                <div
                  className="py-2 px-4 text-center text-sm font-medium relative"
                  style={{ backgroundColor: formData.bg_color, color: formData.text_color }}
                >
                  <span>{formData.message || "Your announcement message here…"}</span>
                  {formData.link_text && (
                    <span className="ml-2 underline underline-offset-2 font-semibold">{formData.link_text}</span>
                  )}
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded opacity-60 cursor-pointer"
                    style={{ color: formData.text_color }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Targeting */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Page Target <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.target_type}
                  onValueChange={(v) => setFormData({ ...formData, target_type: v, target_ids: [] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Select
                  value={formData.audience}
                  onValueChange={(v) => setFormData({ ...formData, audience: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Specific item selector */}
            {needsItemSelector && (
              <div className="space-y-1.5">
                <Label>
                  Select {formData.target_type === "specific_course" ? "Courses" : "Careers"}
                  <span className="text-destructive ml-0.5">*</span>
                </Label>
                {/* Selected chips */}
                {formData.target_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {formData.target_ids.map((id) => {
                      const item = selectorItems.find((i) => i.id === id);
                      return item ? (
                        <Badge key={id} variant="secondary" className="gap-1 pr-1">
                          {item.name}
                          <button onClick={() => toggleTargetId(id)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                <div className="border rounded-md">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder={`Search ${formData.target_type === "specific_course" ? "courses" : "careers"}…`}
                      className="border-0 border-b rounded-none pl-8 h-9 focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto p-1">
                    {filteredSelectorItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Nothing found.</p>
                    ) : (
                      filteredSelectorItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleTargetId(item.id)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left"
                        >
                          <Checkbox checked={formData.target_ids.includes(item.id)} className="pointer-events-none" />
                          <span className={formData.target_ids.includes(item.id) ? "font-medium" : ""}>{item.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                {formErrors.target_ids && <p className="text-xs text-destructive">{formErrors.target_ids}</p>}
              </div>
            )}

            {/* Custom path input */}
            {formData.target_type === "custom_path" && (
              <div className="space-y-1.5">
                <Label>Custom Path Pattern</Label>
                <Input
                  value={formData.target_ids[0] ?? ""}
                  onChange={(e) => setFormData({ ...formData, target_ids: [e.target.value] })}
                  placeholder="/blog/.*  or  /careers/.*"
                />
                <p className="text-xs text-muted-foreground">JavaScript regex pattern tested against the pathname.</p>
              </div>
            )}

            <Separator />

            {/* Schedule + Priority */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => { setFormData({ ...formData, end_date: e.target.value }); if (formErrors.end_date) setFormErrors({ ...formErrors, end_date: undefined }); }}
                />
                {formErrors.end_date && <p className="text-xs text-destructive">{formErrors.end_date}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">Higher = shown first when multiple bars match.</p>
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label className="cursor-pointer">Enabled</Label>
              <Switch
                checked={formData.is_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, is_enabled: v })}
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? selectedBar ? "Saving…" : "Creating…"
                : selectedBar ? "Save Changes" : "Create Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Single Delete ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement Bar?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{selectedBar?.name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete} disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Bulk Delete ─── */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Bar{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} announcement bar{selectedIds.size > 1 ? "s" : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete} disabled={bulkDeleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteLoading ? "Deleting…" : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminAnnouncementBars;
