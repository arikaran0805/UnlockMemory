import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePromoCodes, PromoCode, PromoCodeFormData } from "@/hooks/usePromoCodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import UMLoader from "@/components/UMLoader";
import {
  Plus, Search, MoreHorizontal, Copy, Pencil, Trash2, Eye, CopyPlus, Tag, Ticket, Clock, BarChart3, AlertTriangle, X,
  Columns, Download, RefreshCw, ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, isPast, differenceInDays } from "date-fns";
import { toast } from "@/hooks/use-toast";

/* ─── helpers ─── */
function getStatus(p: PromoCode): "active" | "expired" | "inactive" {
  if (p.expiry_date && isPast(new Date(p.expiry_date))) return "expired";
  if (!p.is_active) return "inactive";
  return "active";
}

function statusBadge(s: ReturnType<typeof getStatus>) {
  switch (s) {
    case "active":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">Active</Badge>;
    case "expired":
      return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-500/20">Expired</Badge>;
    case "inactive":
      return <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>;
  }
}

function appliesToLabel(t: string) {
  const map: Record<string, string> = {
    entire_website: "Entire Website",
    all_careers: "All Careers",
    all_courses: "All Courses",
    specific_careers: "Specific Careers",
    specific_courses: "Specific Courses",
  };
  return map[t] ?? t;
}

const emptyForm: PromoCodeFormData = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  max_discount: null,
  applies_to_type: "entire_website",
  applies_to_ids: [],
  min_purchase: 0,
  usage_limit: null,
  per_user_limit: null,
  start_date: new Date().toISOString().slice(0, 16),
  expiry_date: null,
  is_active: true,
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const COLUMN_LABELS: Record<string, string> = {
  code: "Code",
  type: "Type",
  value: "Value",
  applies_to: "Applies To",
  min_purchase: "Min Purchase",
  usage: "Usage",
  expiry: "Expiry",
  status: "Status",
};

/* ═══════════ PAGE ═══════════ */
const AdminPromoCodes = () => {
  const navigate = useNavigate();
  const { promoCodes, isLoading, create, update, remove, toggleActive, isCreating, isUpdating } = usePromoCodes();

  // UI state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    code: true,
    type: true,
    value: true,
    applies_to: true,
    min_purchase: true,
    usage: true,
    expiry: true,
    status: true,
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PromoCodeFormData>({ ...emptyForm });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<PromoCode | null>(null);

  /* ─── filtered / sorted list ─── */
  const filtered = useMemo(() => {
    let list = promoCodes.map((p) => ({ ...p, _status: getStatus(p) }));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.code.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") list = list.filter((p) => p._status === statusFilter);
    if (typeFilter !== "all") list = list.filter((p) => p.discount_type === typeFilter);

    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "expiry") return (a.expiry_date ?? "9").localeCompare(b.expiry_date ?? "9");
      if (sortBy === "usage") return b.used_count - a.used_count;
      return 0;
    });
    return list;
  }, [promoCodes, search, statusFilter, typeFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, statusFilter, typeFilter, sortBy, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginatedCodes = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  /* ─── multi-select ─── */
  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedCodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCodes.map((p) => p.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteLoading(true);
    for (const id of selectedIds) {
      await remove(id);
    }
    setBulkDeleteLoading(false);
    setSelectedIds(new Set());
    setBulkDeleteDialogOpen(false);
  };

  /* ─── stats ─── */
  const stats = useMemo(() => {
    const active = promoCodes.filter((p) => getStatus(p) === "active").length;
    const expired = promoCodes.filter((p) => getStatus(p) === "expired").length;
    const totalRedemptions = promoCodes.reduce((s, p) => s + p.used_count, 0);
    return { total: promoCodes.length, active, expired, totalRedemptions };
  }, [promoCodes]);

  /* ─── export CSV ─── */
  const handleExportCSV = () => {
    const headers = ["Code", "Type", "Value", "Applies To", "Min Purchase", "Usage", "Usage Limit", "Expiry", "Status"];
    const rows = filtered.map((p) => [
      p.code,
      p.discount_type,
      p.discount_type === "percentage" ? `${p.discount_value}%` : `${p.discount_value}`,
      appliesToLabel(p.applies_to_type),
      String(p.min_purchase),
      String(p.used_count),
      p.usage_limit ? String(p.usage_limit) : "Unlimited",
      p.expiry_date ? format(new Date(p.expiry_date), "dd MMM yyyy") : "—",
      p._status,
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promo-codes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  /* ─── form helpers (duplicate only) ─── */
  const openDuplicate = (p: PromoCode) => {
    setEditingId(null);
    setForm({
      code: "",
      description: p.description ?? "",
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      max_discount: p.max_discount,
      applies_to_type: p.applies_to_type,
      applies_to_ids: p.applies_to_ids ?? [],
      min_purchase: p.min_purchase,
      usage_limit: p.usage_limit,
      per_user_limit: p.per_user_limit,
      start_date: new Date().toISOString().slice(0, 16),
      expiry_date: p.expiry_date ? new Date(p.expiry_date).toISOString().slice(0, 16) : null,
      is_active: true,
    });
    setErrors({});
    setFormOpen(true);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Promo code is required.";
    if (!editingId && promoCodes.some((p) => p.code === form.code.toUpperCase())) e.code = "This code already exists.";
    if (form.discount_value <= 0) e.discount_value = "Discount value must be greater than 0.";
    if (form.discount_type === "percentage" && (form.discount_value < 1 || form.discount_value > 100))
      e.discount_value = "Percentage must be between 1 and 100.";
    if (form.expiry_date && form.start_date && new Date(form.expiry_date) <= new Date(form.start_date))
      e.expiry_date = "Expiry date must be after start date.";
    if (form.min_purchase < 0) e.min_purchase = "Cannot be negative.";
    if (form.usage_limit !== null && form.usage_limit < 0) e.usage_limit = "Cannot be negative.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: any = {
      ...form,
      code: form.code.toUpperCase(),
      expiry_date: form.expiry_date ? new Date(form.expiry_date).toISOString() : null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
    };
    if (editingId) {
      await update({ id: editingId, ...payload });
    } else {
      await create(payload);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: `"${code}" copied to clipboard.` });
  };

  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" || sortBy !== "newest";

  /* ─── render ─── */
  return (
    <>
      <div className="flex flex-col gap-0">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Promo Codes</h1>
            <p className="text-muted-foreground">Create and manage discount codes for careers and courses.</p>
          </div>
          <Button onClick={() => navigate("/admin/promo-codes/new")}><Plus className="mr-2 h-4 w-4" />Create Promo Code</Button>
        </div>

        <div className="admin-section-spacing-top" />

        {/* STATS */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <UMLoader size={44} label="Unlocking memory…" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={<Tag className="h-4 w-4" />} label="Total Promo Codes" value={stats.total} />
            <StatCard icon={<Ticket className="h-4 w-4" />} label="Active Codes" value={stats.active} accent />
            <StatCard icon={<Clock className="h-4 w-4" />} label="Expired Codes" value={stats.expired} />
            <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Total Redemptions" value={stats.totalRedemptions} />
          </div>
        )}

        {/* TOOLBAR */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search codes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                className="gap-2"
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
                        {[statusFilter !== "all", typeFilter !== "all", sortBy !== "newest"].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-4 shadow-lg space-y-3" align="end">
                  <h4 className="text-sm font-semibold text-foreground">Filters</h4>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Status</p>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Discount Type</p>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                        <SelectItem value="flat">Flat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Sort By</p>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="expiry">Expiry Date</SelectItem>
                        <SelectItem value="usage">Usage Count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs text-muted-foreground"
                      onClick={() => {
                        setStatusFilter("all");
                        setTypeFilter("all");
                        setSortBy("newest");
                        setFilterOpen(false);
                      }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Clear filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Column toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Columns className="h-4 w-4" />
                    Columns
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
                      className="flex items-center gap-3 py-2 cursor-pointer focus:bg-accent focus:text-accent-foreground rounded-md"
                    >
                      <Switch
                        checked={visibleColumns[key]}
                        className="pointer-events-none"
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export CSV */}
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>

              {/* Refresh */}
              <Button
                variant="outline"
                className="gap-2"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  // promoCodes refetch is handled by react-query; simulate brief spin
                  await new Promise((r) => setTimeout(r, 600));
                  setRefreshing(false);
                }}
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
                  <button onClick={() => setStatusFilter("all")} className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {typeFilter !== "all" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs">
                  <span className="font-medium text-foreground">Type</span>
                  <span className="text-muted-foreground">is</span>
                  <span className="font-medium text-foreground">"{typeFilter}"</span>
                  <button onClick={() => setTypeFilter("all")} className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {sortBy !== "newest" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs">
                  <span className="font-medium text-foreground">Sort</span>
                  <span className="text-muted-foreground">by</span>
                  <span className="font-medium text-foreground">"{sortBy}"</span>
                  <button onClick={() => setSortBy("newest")} className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <button
                onClick={() => { setStatusFilter("all"); setTypeFilter("all"); setSortBy("newest"); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="mt-3" />

        {/* TABLE */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <UMLoader size={44} label="Unlocking memory…" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th:not(:last-child)]:border-r">
                  <TableHead className="w-10 h-9 pl-4">
                    <input
                      type="checkbox"
                      checked={paginatedCodes.length > 0 && selectedIds.size === paginatedCodes.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < paginatedCodes.length;
                      }}
                      onChange={handleToggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </TableHead>
                  {visibleColumns.code && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Code</TableHead>
                  )}
                  {visibleColumns.type && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Type</TableHead>
                  )}
                  {visibleColumns.value && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Value</TableHead>
                  )}
                  {visibleColumns.applies_to && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Applies To</TableHead>
                  )}
                  {visibleColumns.min_purchase && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Min Purchase</TableHead>
                  )}
                  {visibleColumns.usage && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Usage</TableHead>
                  )}
                  {visibleColumns.expiry && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Expiry</TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCodes.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                      className="text-center py-16"
                    >
                      <Ticket className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">No promo codes found</p>
                      {(search || hasActiveFilters) ? (
                        <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
                      ) : (
                        <Button className="mt-4" onClick={() => navigate("/admin/promo-codes/new")}>
                          Create Your First Promo Code
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCodes.map((p) => {
                    const nearExpiry = p.expiry_date && !isPast(new Date(p.expiry_date)) && differenceInDays(new Date(p.expiry_date), new Date()) <= 7;
                    return (
                      <TableRow
                        key={p.id}
                        className={`hover:bg-muted/30 transition-colors [&>td:not(:last-child)]:border-r ${selectedIds.has(p.id) ? "bg-primary/5 hover:bg-primary/10" : nearExpiry ? "bg-orange-500/5" : ""}`}
                      >
                        <TableCell className="w-10 pl-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => handleToggleSelectRow(p.id)}
                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                          />
                        </TableCell>
                        {visibleColumns.code && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-sm">{p.code}</span>
                              <button onClick={() => copyCode(p.code)} className="text-muted-foreground hover:text-foreground transition-colors">
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                              {nearExpiry && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.type && (
                          <TableCell className="capitalize text-sm py-3">{p.discount_type}</TableCell>
                        )}
                        {visibleColumns.value && (
                          <TableCell className="text-sm font-medium py-3">
                            {p.discount_type === "percentage" ? `${p.discount_value}%` : `₹${p.discount_value}`}
                          </TableCell>
                        )}
                        {visibleColumns.applies_to && (
                          <TableCell className="text-sm py-3">{appliesToLabel(p.applies_to_type)}</TableCell>
                        )}
                        {visibleColumns.min_purchase && (
                          <TableCell className="text-sm py-3">
                            {p.min_purchase > 0 ? `₹${p.min_purchase}` : "—"}
                          </TableCell>
                        )}
                        {visibleColumns.usage && (
                          <TableCell className="text-sm py-3">
                            <span>{p.used_count}</span>
                            {p.usage_limit && (
                              <span className="text-muted-foreground">/{p.usage_limit} ({Math.round((p.used_count / p.usage_limit) * 100)}%)</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.expiry && (
                          <TableCell className="text-sm py-3">
                            {p.expiry_date ? format(new Date(p.expiry_date), "dd MMM yyyy") : "—"}
                          </TableCell>
                        )}
                        {visibleColumns.status && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              {statusBadge(p._status)}
                              {p._status !== "expired" && (
                                <Switch
                                  checked={p.is_active}
                                  onCheckedChange={(v) => toggleActive({ id: p.id, is_active: v })}
                                  className="scale-75"
                                />
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setDetailTarget(p); setDetailOpen(true); }}>
                                    <Eye className="mr-2 h-4 w-4" />View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => navigate(`/admin/promo-codes/${p.id}`)}>
                                    <Pencil className="mr-2 h-4 w-4" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openDuplicate(p)}>
                                    <CopyPlus className="mr-2 h-4 w-4" />Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onClick={() => { setDeleteTarget(p); setDeleteOpen(true); }}>
                                    <Trash2 className="mr-2 h-4 w-4" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

        {/* FOOTER: rows per page + pagination */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
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
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CREATE / EDIT MODAL ─── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Promo Code" : "Create Promo Code"}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic */}
            <div className="space-y-2">
              <Label>Promo Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER25"
                className="font-mono uppercase"
              />
              {errors.code && <p className="text-destructive text-xs">{errors.code}</p>}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note" rows={2} />
            </div>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type *</Label>
                <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Discount Value *</Label>
                <Input
                  type="number"
                  value={form.discount_value || ""}
                  onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                  placeholder={form.discount_type === "percentage" ? "1-100" : "₹ amount"}
                />
                {errors.discount_value && <p className="text-destructive text-xs">{errors.discount_value}</p>}
              </div>
            </div>
            {form.discount_type === "percentage" && (
              <div className="space-y-2">
                <Label>Max Discount Amount (₹)</Label>
                <Input
                  type="number"
                  value={form.max_discount ?? ""}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Optional cap"
                />
              </div>
            )}

            {/* Applicability */}
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={form.applies_to_type} onValueChange={(v) => setForm({ ...form, applies_to_type: v, applies_to_ids: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entire_website">Entire Website</SelectItem>
                  <SelectItem value="all_careers">All Careers</SelectItem>
                  <SelectItem value="all_courses">All Courses</SelectItem>
                  <SelectItem value="specific_careers">Specific Careers</SelectItem>
                  <SelectItem value="specific_courses">Specific Courses</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Specific items multi-select */}
            {(form.applies_to_type === "specific_careers" || form.applies_to_type === "specific_courses") && (
              <SpecificItemsSelector
                type={form.applies_to_type === "specific_careers" ? "careers" : "courses"}
                selectedIds={form.applies_to_ids ?? []}
                onChange={(ids) => setForm({ ...form, applies_to_ids: ids })}
              />
            )}

            {/* Purchase rules */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Purchase (₹)</Label>
                <Input type="number" value={form.min_purchase || ""} onChange={(e) => setForm({ ...form, min_purchase: Number(e.target.value) })} />
                {errors.min_purchase && <p className="text-destructive text-xs">{errors.min_purchase}</p>}
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input
                  type="number"
                  value={form.usage_limit ?? ""}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="Unlimited"
                />
                {errors.usage_limit && <p className="text-destructive text-xs">{errors.usage_limit}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Per User Limit</Label>
              <Input
                type="number"
                value={form.per_user_limit ?? ""}
                onChange={(e) => setForm({ ...form, per_user_limit: e.target.value ? Number(e.target.value) : null })}
                placeholder="Unlimited"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="datetime-local" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="datetime-local" value={form.expiry_date ?? ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value || null })} />
                {errors.expiry_date && <p className="text-destructive text-xs">{errors.expiry_date}</p>}
              </div>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isCreating || isUpdating}>
              {editingId ? "Save Changes" : "Save Promo Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM ─── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Promo Code</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-mono font-semibold">{deleteTarget?.code}</span>?
              <br />Deleted promo codes cannot be applied anymore.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── BULK DELETE CONFIRM ─── */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Promo Code{selectedIds.size > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              This will permanently delete {selectedIds.size} promo code{selectedIds.size > 1 ? "s" : ""}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)} disabled={bulkDeleteLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteLoading}>
              {bulkDeleteLoading ? "Deleting..." : `Delete ${selectedIds.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW DETAIL ─── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">{detailTarget?.code}</DialogTitle>
            <DialogDescription>{detailTarget?.description || "No description"}</DialogDescription>
          </DialogHeader>
          {detailTarget && (
            <div className="grid grid-cols-2 gap-3 text-sm py-2">
              <Detail label="Type" value={detailTarget.discount_type} />
              <Detail label="Value" value={detailTarget.discount_type === "percentage" ? `${detailTarget.discount_value}%` : `₹${detailTarget.discount_value}`} />
              {detailTarget.max_discount && <Detail label="Max Discount" value={`₹${detailTarget.max_discount}`} />}
              <Detail label="Applies To" value={appliesToLabel(detailTarget.applies_to_type)} />
              <Detail label="Min Purchase" value={detailTarget.min_purchase > 0 ? `₹${detailTarget.min_purchase}` : "None"} />
              <Detail label="Usage" value={`${detailTarget.used_count}${detailTarget.usage_limit ? ` / ${detailTarget.usage_limit}` : ""}`} />
              {detailTarget.per_user_limit && <Detail label="Per User Limit" value={String(detailTarget.per_user_limit)} />}
              <Detail label="Start" value={detailTarget.start_date ? format(new Date(detailTarget.start_date), "dd MMM yyyy HH:mm") : "—"} />
              <Detail label="Expiry" value={detailTarget.expiry_date ? format(new Date(detailTarget.expiry_date), "dd MMM yyyy HH:mm") : "No expiry"} />
              <Detail label="Status" value={getStatus(detailTarget)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ─── small components ─── */
function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium capitalize">{value}</p>
    </div>
  );
}

/* ─── Specific items multi-select ─── */
function SpecificItemsSelector({
  type,
  selectedIds,
  onChange,
}: {
  type: "careers" | "courses";
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [itemSearch, setItemSearch] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: [type === "careers" ? "careers-list" : "courses-list"],
    queryFn: async () => {
      if (type === "careers") {
        const { data, error } = await supabase.from("careers").select("id, name").order("name");
        if (error) throw error;
        return data as { id: string; name: string }[];
      } else {
        const { data, error } = await supabase.from("courses").select("id, name").order("name");
        if (error) throw error;
        return data as { id: string; name: string }[];
      }
    },
  });

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedItems = items.filter((i) => selectedIds.includes(i.id));

  return (
    <div className="space-y-2">
      <Label>Select {type === "careers" ? "Careers" : "Courses"}</Label>

      {/* Selected chips */}
      {selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedItems.map((item) => (
            <Badge key={item.id} variant="secondary" className="gap-1 pr-1">
              {item.name}
              <button onClick={() => toggle(item.id)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search + list */}
      <div className="border rounded-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder={`Search ${type}…`}
            className="border-0 border-b rounded-none pl-8 h-9 focus-visible:ring-0"
          />
        </div>
        <div className="max-h-40 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No {type} found.</p>
          ) : (
            filtered.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors text-left"
                >
                  <Checkbox checked={checked} className="pointer-events-none" />
                  <span className={checked ? "font-medium" : ""}>{item.name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPromoCodes;
