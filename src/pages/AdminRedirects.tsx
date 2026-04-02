import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UMLoader from "@/components/UMLoader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Plus, Edit2, Trash2, Search, ArrowRight, ExternalLink,
  Filter, Columns, Download, RefreshCw, ChevronLeft, ChevronRight, X,
} from "lucide-react";

/* ─── types ─── */
interface Redirect {
  id: string;
  source_path: string;
  destination_url: string;
  redirect_type: number;
  is_active: boolean;
  hit_count: number;
  created_at: string;
  updated_at: string;
}

type FormData = {
  source_path: string;
  destination_url: string;
  redirect_type: number;
  is_active: boolean;
};

/* ─── constants ─── */
const emptyForm: FormData = {
  source_path: "",
  destination_url: "",
  redirect_type: 301,
  is_active: true,
};

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const COLUMN_LABELS: Record<string, string> = {
  source: "Source",
  destination: "Destination",
  type: "Type",
  hits: "Hits",
  status: "Status",
  actions: "Actions",
};

/* ═══════════ PAGE ═══════════ */
const AdminRedirects = () => {
  const { toast } = useToast();

  /* ─── data ─── */
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ─── toolbar ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "301" | "302">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    source: true,
    destination: true,
    type: true,
    hits: true,
    status: true,
    actions: true,
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
  const [selectedRedirect, setSelectedRedirect] = useState<Redirect | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...emptyForm });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ─── init ─── */
  useEffect(() => { fetchRedirects(); }, []);

  const fetchRedirects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("redirects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error fetching redirects", variant: "destructive" });
    } else {
      setRedirects((data as Redirect[]) || []);
    }
    setLoading(false);
  };

  /* ─── filtered list ─── */
  const filtered = useMemo(() => {
    let list = redirects;
    const q = searchQuery.toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.source_path.toLowerCase().includes(q) ||
          r.destination_url.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      list = list.filter((r) => r.redirect_type === parseInt(typeFilter));
    }
    if (statusFilter !== "all") {
      list = list.filter((r) =>
        statusFilter === "active" ? r.is_active : !r.is_active
      );
    }
    return list;
  }, [redirects, searchQuery, typeFilter, statusFilter]);

  /* ─── pagination ─── */
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, typeFilter, statusFilter, rowsPerPage]);

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
      setSelectedIds(new Set(paginated.map((r) => r.id)));
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
    const { error } = await supabase.from("redirects").delete().in("id", ids);
    if (error) {
      toast({ title: "Failed to delete redirects", variant: "destructive" });
    } else {
      setRedirects((prev) => prev.filter((r) => !selectedIds.has(r.id)));
      toast({ title: `${ids.length} redirect${ids.length > 1 ? "s" : ""} deleted` });
    }
    setSelectedIds(new Set());
    setBulkDeleteLoading(false);
    setBulkDeleteDialogOpen(false);
  };

  /* ─── export CSV ─── */
  const handleExportCSV = () => {
    const headers = ["Source", "Destination", "Type", "Hits", "Status"];
    const rows = filtered.map((r) => [
      r.source_path,
      r.destination_url,
      String(r.redirect_type),
      String(r.hit_count),
      r.is_active ? "Active" : "Inactive",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `redirects_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  /* ─── dialog helpers ─── */
  const openCreateDialog = () => {
    setSelectedRedirect(null);
    setFormData({ ...emptyForm });
    setFormErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (redirect: Redirect) => {
    setSelectedRedirect(redirect);
    setFormData({
      source_path: redirect.source_path,
      destination_url: redirect.destination_url,
      redirect_type: redirect.redirect_type,
      is_active: redirect.is_active,
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  /* ─── validation ─── */
  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    const trimmedSource = formData.source_path.trim();
    const trimmedDest = formData.destination_url.trim();

    if (!trimmedSource) errors.source_path = "Source path is required.";

    if (!trimmedDest) {
      errors.destination_url = "Destination URL is required.";
    } else {
      const valid = trimmedDest.startsWith("/") ||
        trimmedDest.startsWith("http://") ||
        trimmedDest.startsWith("https://");
      if (!valid)
        errors.destination_url = 'Must start with "/" or "http(s)://".';
    }

    const normSource = trimmedSource.startsWith("/") ? trimmedSource : "/" + trimmedSource;
    if (!errors.source_path && !errors.destination_url && normSource === trimmedDest)
      errors.destination_url = "Source and destination cannot be the same.";

    if (!errors.source_path) {
      const dupe = redirects.find(
        (r) => r.source_path === normSource && r.id !== selectedRedirect?.id
      );
      if (dupe) errors.source_path = `A redirect for "${normSource}" already exists.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ─── save ─── */
  const handleSave = async () => {
    if (!validate()) return;
    const trimmed = formData.source_path.trim();
    const sourcePath = trimmed.startsWith("/") ? trimmed : "/" + trimmed;
    const payload = {
      source_path: sourcePath,
      destination_url: formData.destination_url.trim(),
      redirect_type: formData.redirect_type,
      is_active: formData.is_active,
    };

    setIsSaving(true);
    if (selectedRedirect) {
      const { data, error } = await supabase
        .from("redirects").update(payload).eq("id", selectedRedirect.id)
        .select().single();
      if (error) {
        toast({ title: "Failed to update redirect", description: error.message, variant: "destructive" });
      } else {
        setRedirects((prev) => prev.map((r) => (r.id === selectedRedirect.id ? (data as Redirect) : r)));
        toast({ title: "Redirect updated" });
        setDialogOpen(false);
      }
    } else {
      const { data, error } = await supabase
        .from("redirects").insert({ ...payload, hit_count: 0 })
        .select().single();
      if (error) {
        toast({ title: "Failed to create redirect", description: error.message, variant: "destructive" });
      } else {
        setRedirects((prev) => [data as Redirect, ...prev]);
        toast({ title: "Redirect created" });
        setDialogOpen(false);
      }
    }
    setIsSaving(false);
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    if (!selectedRedirect) return;
    setIsDeleting(true);
    const { error } = await supabase.from("redirects").delete().eq("id", selectedRedirect.id);
    if (error) {
      toast({ title: "Failed to delete redirect", variant: "destructive" });
    } else {
      setRedirects((prev) => prev.filter((r) => r.id !== selectedRedirect.id));
      toast({ title: "Redirect deleted" });
    }
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setSelectedRedirect(null);
  };

  /* ─── toggle active (optimistic) ─── */
  const toggleActive = async (redirect: Redirect) => {
    const next = !redirect.is_active;
    setRedirects((prev) => prev.map((r) => (r.id === redirect.id ? { ...r, is_active: next } : r)));
    const { error } = await supabase.from("redirects").update({ is_active: next }).eq("id", redirect.id);
    if (error) {
      setRedirects((prev) => prev.map((r) => (r.id === redirect.id ? { ...r, is_active: redirect.is_active } : r)));
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const hasActiveFilters = typeFilter !== "all" || statusFilter !== "all";

  /* ══════════ render ══════════ */
  return (
    <>
      <div className="flex flex-col gap-0">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Redirect Rules</h1>
            <p className="text-muted-foreground">Manage URL redirections and track traffic hits</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />Add Redirect
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
                placeholder="Search by source or destination…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Bulk delete */}
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                className="h-9 gap-2"
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
                  <Button variant="outline" className="h-9 gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                    {hasActiveFilters && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-0.5">
                        {[typeFilter !== "all", statusFilter !== "all"].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px] p-4 shadow-lg space-y-3" align="end">
                  <h4 className="text-sm font-semibold text-foreground">Filters</h4>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Type</p>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="301">301 — Permanent</SelectItem>
                        <SelectItem value="302">302 — Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Status</p>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {hasActiveFilters && (
                    <Button
                      variant="ghost" size="sm"
                      className="w-full h-8 text-xs text-muted-foreground"
                      onClick={() => { setTypeFilter("all"); setStatusFilter("all"); setFilterOpen(false); }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />Clear filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>

              {/* Columns */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 gap-2">
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
              <Button variant="outline" className="h-9 gap-2" onClick={handleExportCSV}>
                <Download className="h-4 w-4" />Export CSV
              </Button>

              {/* Refresh */}
              <Button
                variant="outline" className="h-9 gap-2"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  await fetchRedirects();
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
              {typeFilter !== "all" && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs">
                  <span className="font-medium text-foreground">Type</span>
                  <span className="text-muted-foreground">is</span>
                  <span className="font-medium text-foreground">"{typeFilter}"</span>
                  <button onClick={() => setTypeFilter("all")} className="ml-0.5 text-muted-foreground hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
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
              <button
                onClick={() => { setTypeFilter("all"); setStatusFilter("all"); }}
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
            <UMLoader size={44} label="Loading redirects…" />
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
                  {visibleColumns.source && (
                    <TableHead className="w-[340px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                      Source
                    </TableHead>
                  )}
                  {visibleColumns.destination && (
                    <TableHead className="w-[340px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                      Destination
                    </TableHead>
                  )}
                  {visibleColumns.type && (
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                      Type
                    </TableHead>
                  )}
                  {visibleColumns.hits && (
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                      Hits
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                      Status
                    </TableHead>
                  )}
                  {visibleColumns.actions && (
                    <TableHead className="w-32 text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">
                      Actions
                    </TableHead>
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
                      <ExternalLink className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        {searchQuery || hasActiveFilters
                          ? "No redirects match your search or filters."
                          : "No redirect rules configured yet."}
                      </p>
                      {!searchQuery && !hasActiveFilters && (
                        <Button className="mt-4" onClick={openCreateDialog}>
                          Create Your First Redirect
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((redirect) => (
                    <TableRow
                      key={redirect.id}
                      className={`hover:bg-muted/30 transition-colors [&>td:not(:last-child)]:border-r ${
                        selectedIds.has(redirect.id) ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                    >
                      {/* checkbox */}
                      <TableCell className="w-10 pl-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(redirect.id)}
                          onChange={() => handleToggleSelectRow(redirect.id)}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                      </TableCell>

                      {/* source */}
                      {visibleColumns.source && (
                        <TableCell className="py-3 px-4 w-[340px] max-w-0">
                          <code className="inline-flex items-center font-mono text-xs bg-muted border border-border/60 rounded-md px-2 py-1 text-foreground leading-none truncate max-w-full block">
                            {redirect.source_path}
                          </code>
                        </TableCell>
                      )}

                      {/* destination */}
                      {visibleColumns.destination && (
                        <TableCell className="py-3 px-4 w-[340px] max-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate text-sm text-muted-foreground">
                              {redirect.destination_url}
                            </span>
                          </div>
                        </TableCell>
                      )}

                      {/* type */}
                      {visibleColumns.type && (
                        <TableCell className="py-3 px-4 w-32">
                          <Badge
                            variant={redirect.redirect_type === 301 ? "default" : "secondary"}
                            className="tabular-nums"
                          >
                            {redirect.redirect_type}
                          </Badge>
                        </TableCell>
                      )}

                      {/* hits */}
                      {visibleColumns.hits && (
                        <TableCell className="py-3 px-4 w-32">
                          <span className="text-sm font-medium tabular-nums text-muted-foreground">
                            {redirect.hit_count.toLocaleString()}
                          </span>
                        </TableCell>
                      )}

                      {/* status */}
                      {visibleColumns.status && (
                        <TableCell className="py-3 px-4 w-32">
                          <Switch
                            checked={redirect.is_active}
                            onCheckedChange={() => toggleActive(redirect)}
                          />
                        </TableCell>
                      )}

                      {/* actions */}
                      {visibleColumns.actions && (
                        <TableCell className="py-3 px-4 w-32">
                          <div className="flex items-center justify-start gap-1">
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => openEditDialog(redirect)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => { setSelectedRedirect(redirect); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
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

      {/* ─── Create / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!isSaving) setDialogOpen(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedRedirect ? "Edit Redirect" : "Create Redirect"}</DialogTitle>
            <DialogDescription>
              {selectedRedirect ? "Update the redirect rule below." : "Define a new URL redirect rule."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current summary — edit mode only */}
            {selectedRedirect && (
              <div className="rounded-md bg-muted/50 border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="font-mono text-xs bg-background border border-border rounded px-1.5 py-0.5">
                    {selectedRedirect.source_path}
                  </code>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="font-mono text-xs bg-background border border-border rounded px-1.5 py-0.5 truncate max-w-[200px]">
                    {selectedRedirect.destination_url}
                  </code>
                  <Badge variant={selectedRedirect.redirect_type === 301 ? "default" : "secondary"} className="text-xs">
                    {selectedRedirect.redirect_type}
                  </Badge>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="source_path">Source Path</Label>
              <Input
                id="source_path"
                value={formData.source_path}
                onChange={(e) => {
                  setFormData({ ...formData, source_path: e.target.value });
                  if (formErrors.source_path) setFormErrors({ ...formErrors, source_path: undefined });
                }}
                placeholder="/old-page"
              />
              {formErrors.source_path ? (
                <p className="text-xs text-destructive">{formErrors.source_path}</p>
              ) : (
                <p className="text-xs text-muted-foreground">A leading "/" is added automatically.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination_url">Destination URL</Label>
              <Input
                id="destination_url"
                value={formData.destination_url}
                onChange={(e) => {
                  setFormData({ ...formData, destination_url: e.target.value });
                  if (formErrors.destination_url) setFormErrors({ ...formErrors, destination_url: undefined });
                }}
                placeholder="https://example.com/new-page or /new-page"
              />
              {formErrors.destination_url ? (
                <p className="text-xs text-destructive">{formErrors.destination_url}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Full URL (https://…) or internal path (/new-page).</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="redirect_type">Redirect Type</Label>
              <Select
                value={formData.redirect_type.toString()}
                onValueChange={(v) => setFormData({ ...formData, redirect_type: parseInt(v) })}
              >
                <SelectTrigger id="redirect_type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 — Permanent Redirect</SelectItem>
                  <SelectItem value="302">302 — Temporary Redirect</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Use 301 for permanent moves (SEO-friendly), 302 for temporary.</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? selectedRedirect ? "Saving…" : "Creating…"
                : selectedRedirect ? "Save Changes" : "Create Redirect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Single Delete ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete the redirect for{" "}
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                {selectedRedirect?.source_path}
              </code>. This cannot be undone.
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
            <AlertDialogTitle>Delete {selectedIds.size} Redirect{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} redirect rule{selectedIds.size > 1 ? "s" : ""}. This cannot be undone.
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

export default AdminRedirects;
