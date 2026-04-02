import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import UMLoader from "@/components/UMLoader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  RefreshCw,
  Search,
  Download,
  CheckCircle,
  XCircle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Columns,
  X,
} from "lucide-react";
import { format, isPast, isFuture } from "date-fns";

/* ─── types ─── */
interface Ad {
  id: string;
  name: string;
  placement: string;
  ad_label?: string | null;
  ad_code: string | null;
  image_url: string | null;
  redirect_url: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
}

type AdStatus = "active" | "disabled" | "scheduled" | "expired";

/* ─── constants ─── */
// Single placement for now — All Courses Page Banner
const PLACEMENTS = [
  { value: "courses-banner", label: "All Courses Page Banner" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const COLUMN_LABELS: Record<string, string> = {
  name: "Name",
  label: "Label",
  placement: "Placement",
  schedule: "Schedule",
  status: "Status",
};


/* ─── helpers ─── */
function getAdStatus(ad: Ad): AdStatus {
  if (!ad.is_active) return "disabled";
  if (ad.end_date && isPast(new Date(ad.end_date))) return "expired";
  if (ad.start_date && isFuture(new Date(ad.start_date))) return "scheduled";
  return "active";
}

function StatusBadge({ status }: { status: AdStatus }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1 font-medium">
          <CheckCircle className="h-3 w-3" />Active
        </Badge>
      );
    case "disabled":
      return (
        <Badge variant="secondary" className="gap-1 font-medium">
          <XCircle className="h-3 w-3" />Disabled
        </Badge>
      );
    case "scheduled":
      return (
        <Badge variant="outline" className="gap-1 font-medium text-amber-600 border-amber-500/40">
          <CalendarClock className="h-3 w-3" />Scheduled
        </Badge>
      );
    case "expired":
      return (
        <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 gap-1 font-medium">
          <XCircle className="h-3 w-3" />Expired
        </Badge>
      );
  }
}

/* ══════════════════════════════════════════════════════════════ */

const AdminMonetization = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  /* ─── data ─── */
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* ─── toolbar ─── */
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  /* ─── filter + columns ─── */
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    label: true,
    placement: true,
    schedule: true,
    status: true,
  });

  /* ─── selection ─── */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  /* ─── single delete ─── */
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ─── init ─── */
  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ads")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error fetching ads", variant: "destructive" });
    } else {
      setAds(data || []);
    }
    setLoading(false);
  };

  /* ─── filtered + paginated ─── */
  const filtered = useMemo(() => {
    let result = ads;
    const q = searchQuery.toLowerCase();
    if (q) {
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.redirect_url ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((a) => getAdStatus(a) === statusFilter);
    }
    return result;
  }, [ads, searchQuery, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, rowsPerPage]);

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
      setSelectedIds(new Set(paginated.map((a) => a.id)));
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
    const { error } = await supabase.from("ads").delete().in("id", ids);
    if (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    } else {
      setAds((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      toast({ title: `${ids.length} ad${ids.length > 1 ? "s" : ""} deleted` });
      setSelectedIds(new Set());
    }
    setBulkDeleteLoading(false);
    setBulkDeleteOpen(false);
  };

  /* ─── export CSV ─── */
  const handleExportCSV = () => {
    const headers = ["Name", "Placement", "Priority", "Status", "Start", "End"];
    const rows = filtered.map((a) => [
      a.name,
      PLACEMENTS.find((p) => p.value === a.placement)?.label ?? a.placement,
      String(a.priority),
      getAdStatus(a),
      a.start_date ? format(new Date(a.start_date), "dd MMM yyyy") : "",
      a.end_date ? format(new Date(a.end_date), "dd MMM yyyy") : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  /* ─── optimistic toggle ─── */
  const toggleActive = async (ad: Ad) => {
    const next = !ad.is_active;
    setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, is_active: next } : a)));
    const { error } = await supabase
      .from("ads")
      .update({ is_active: next })
      .eq("id", ad.id);
    if (error) {
      setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, is_active: ad.is_active } : a)));
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  /* ─── delete ─── */
  const handleDelete = async () => {
    if (!selectedAd) return;
    setIsDeleting(true);
    const { error } = await supabase.from("ads").delete().eq("id", selectedAd.id);
    if (error) {
      toast({ title: "Failed to delete ad", variant: "destructive" });
    } else {
      setAds((prev) => prev.filter((a) => a.id !== selectedAd.id));
      toast({ title: "Ad deleted" });
      setDeleteDialogOpen(false);
      setSelectedAd(null);
    }
    setIsDeleting(false);
  };

  /* ─── derived KPIs ─── */
  const activeCount = ads.filter((a) => getAdStatus(a) === "active").length;
  const scheduledCount = ads.filter((a) => getAdStatus(a) === "scheduled").length;

  /* ══════════ render ══════════ */
  return (
    <>
      <div className="flex flex-col gap-0">

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monetization</h1>
            <p className="text-muted-foreground">Manage affiliate and display ads</p>
          </div>
          <Button onClick={() => navigate("/admin/monetization/new")} className="gap-2">
            <Plus className="h-4 w-4" />New Advertisement
          </Button>
        </div>

        <div className="admin-section-spacing-top" />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md p-2 bg-muted text-muted-foreground">
                <DollarSign className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Ads</p>
                <p className="text-xl font-bold">{ads.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md p-2 bg-emerald-500/10 text-emerald-600">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Now</p>
                <p className="text-xl font-bold text-emerald-600">{activeCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-md p-2 bg-amber-500/10 text-amber-600">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Scheduled</p>
                <p className="text-xl font-bold text-amber-600">{scheduledCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6" />

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search ads…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setBulkDeleteOpen(true)}
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
                  {statusFilter !== "all" && (
                    <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-0.5">1</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-4 shadow-lg space-y-3" align="end">
                <h4 className="text-sm font-semibold text-foreground">Filters</h4>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Status</p>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {statusFilter !== "all" && (
                  <Button
                    variant="ghost" size="sm"
                    className="w-full h-8 text-xs text-muted-foreground"
                    onClick={() => { setStatusFilter("all"); setFilterOpen(false); }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />Clear filter
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
                      setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
                    }}
                    className="flex items-center gap-3 py-2 cursor-pointer focus:bg-accent rounded-md"
                  >
                    <Switch checked={visibleColumns[key as keyof typeof visibleColumns]} className="pointer-events-none" />
                    <span className="text-sm font-medium">{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />Export CSV
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                await fetchAds();
                setRefreshing(false);
              }}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-3" />

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <UMLoader size={44} label="Loading ads…" />
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th:not(:last-child)]:border-r">
                  <TableHead className="w-10 h-9 pl-4">
                    <div className="flex items-center justify-center h-full">
                      <input
                        type="checkbox"
                        checked={paginated.length > 0 && selectedIds.size === paginated.length}
                        ref={(el) => {
                          if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < paginated.length;
                        }}
                        onChange={handleToggleSelectAll}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer block"
                      />
                    </div>
                  </TableHead>
                  {visibleColumns.name && <TableHead className="w-[220px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Name</TableHead>}
                  {visibleColumns.label && <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Label</TableHead>}
                  {visibleColumns.placement && <TableHead className="w-[200px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Placement</TableHead>}
                  {visibleColumns.schedule && <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Schedule</TableHead>}
                  {visibleColumns.status && <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Status</TableHead>}
                  <TableHead className="w-20 text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9 px-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <DollarSign className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        {searchQuery || statusFilter !== "all"
                          ? "No ads match your search or filter."
                          : "No ads configured yet."}
                      </p>
                      {!searchQuery && statusFilter === "all" && (
                        <Button className="mt-4" onClick={() => navigate("/admin/monetization/new")}>
                          Create Your First Advertisement
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((ad) => {
                    const status = getAdStatus(ad);
                    return (
                      <TableRow
                        key={ad.id}
                        className="hover:bg-muted/30 transition-colors [&>td:not(:last-child)]:border-r"
                      >
                        {/* Checkbox */}
                        <TableCell className="w-10 pl-4 py-3">
                          <div className="flex items-center justify-center h-full">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(ad.id)}
                              onChange={() => handleToggleSelectRow(ad.id)}
                              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                            />
                          </div>
                        </TableCell>

                        {/* Name */}
                        {visibleColumns.name && (
                          <TableCell className="py-3 px-4 w-[220px]">
                            <div className="space-y-0.5">
                              <p className="font-medium text-sm truncate">{ad.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Priority {ad.priority}
                              </p>
                            </div>
                          </TableCell>
                        )}

                        {/* Label */}
                        {visibleColumns.label && (
                          <TableCell className="py-3 px-4 w-[140px]">
                            {ad.ad_label ? (
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium capitalize ${
                                  ad.ad_label === "sponsored"
                                    ? "border-slate-400/40 text-slate-600"
                                    : ad.ad_label === "partner"
                                    ? "border-blue-400/40 text-blue-600"
                                    : "border-emerald-400/40 text-emerald-600"
                                }`}
                              >
                                {ad.ad_label.charAt(0).toUpperCase() + ad.ad_label.slice(1)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}

                        {/* Placement */}
                        {visibleColumns.placement && (
                          <TableCell className="py-3 px-4 w-[200px]">
                            <Badge variant="outline" className="text-xs font-medium">
                              {PLACEMENTS.find((p) => p.value === ad.placement)?.label ?? ad.placement}
                            </Badge>
                          </TableCell>
                        )}

                        {/* Schedule */}
                        {visibleColumns.schedule && (
                          <TableCell className="py-3 px-4 w-[160px]">
                            {ad.start_date || ad.end_date ? (
                              <span className="text-xs text-muted-foreground">
                                {ad.start_date && format(new Date(ad.start_date), "dd MMM yy")}
                                {ad.start_date && ad.end_date && " → "}
                                {ad.end_date && format(new Date(ad.end_date), "dd MMM yy")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Always</span>
                            )}
                          </TableCell>
                        )}

                        {/* Status */}
                        {visibleColumns.status && (
                          <TableCell className="py-3 px-4 w-[180px]">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={ad.is_active}
                                onCheckedChange={() => toggleActive(ad)}
                              />
                              <StatusBadge status={status} />
                            </div>
                          </TableCell>
                        )}

                        {/* Actions */}
                        <TableCell className="py-3 px-4 w-20">
                          <div className="flex items-center justify-start gap-1">
                            <Button
                              size="icon" variant="ghost" className="h-8 w-8"
                              onClick={() => navigate(`/admin/monetization/${ad.id}`)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => { setSelectedAd(ad); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-between pt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => setRowsPerPage(Number(v))}
              >
                <SelectTrigger className="h-8 w-16 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROWS_PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex gap-1">
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="icon" className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ad?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{selectedAd?.name}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Ad{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} ad{selectedIds.size > 1 ? "s" : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
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

export default AdminMonetization;
