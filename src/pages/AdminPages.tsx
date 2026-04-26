import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Columns,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Info,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import UMLoader from "@/components/UMLoader";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PageStats {
  [pageId: string]: {
    views: number;
  };
}

type PageDisplayStatus = "published" | "draft" | "archived";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const COLUMN_LABELS: Record<string, string> = {
  title: "Title",
  slug: "URL",
  status: "Status",
  updated: "Updated",
  actions: "Actions",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const statusMeta: Record<
  PageDisplayStatus,
  {
    label: string;
    badgeClass: string;
    icon: typeof CheckCircle2;
  }
> = {
  published: {
    label: "Published",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    icon: CheckCircle2,
  },
  draft: {
    label: "Draft",
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-700",
    icon: CircleDashed,
  },
  archived: {
    label: "Archived",
    badgeClass: "border-neutral-400/20 bg-neutral-400/10 text-content-secondary",
    icon: Archive,
  },
};

const getPageDisplayStatus = (page: Page): PageDisplayStatus => {
  if (page.status === "published") return "published";
  if (page.status === "archived") return "archived";
  return "draft";
};

function PageStatusBadge({ status }: { status: PageDisplayStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", meta.badgeClass)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

const AdminPages = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [pageStats, setPageStats] = useState<PageStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [formData, setFormData] = useState({ title: "", slug: "", content: "", status: "draft" });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    title: true,
    slug: true,
    status: true,
    updated: true,
    actions: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, rowsPerPage]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast({ title: "Access Denied", variant: "destructive" });
        navigate("/");
        return;
      }

      await fetchPages();
    } catch (error: any) {
      toast({ title: "Error loading pages", description: error.message, variant: "destructive" });
      navigate("/");
    }
  };

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const nextPages = (data as Page[]) || [];
      setPages(nextPages);

      if (nextPages.length > 0) {
        await fetchPageStats(nextPages.map((page) => page.id));
      } else {
        setPageStats({});
      }
    } catch (error: any) {
      toast({ title: "Error fetching pages", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPageStats = async (pageIds: string[]) => {
    try {
      const statsMap: PageStats = {};
      pageIds.forEach((id) => {
        statsMap[id] = { views: 0 };
      });

      const { data: viewsData } = await supabase
        .from("page_views")
        .select("page_id")
        .in("page_id", pageIds);

      viewsData?.forEach((view) => {
        if (statsMap[view.page_id]) {
          statsMap[view.page_id].views += 1;
        }
      });

      setPageStats(statsMap);
    } catch (error) {
      console.error("Error fetching page stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const pageData = {
        ...formData,
        author_id: session.user.id,
      };

      if (editingPage) {
        const { error } = await supabase.from("pages").update(pageData).eq("id", editingPage.id);
        if (error) throw error;
        toast({ title: "Page updated successfully" });
      } else {
        const { error } = await supabase.from("pages").insert([pageData]);
        if (error) throw error;
        toast({ title: "Page created successfully" });
      }

      setDialogOpen(false);
      setEditingPage(null);
      setFormData({ title: "", slug: "", content: "", status: "draft" });
      await fetchPages();
    } catch (error: any) {
      toast({ title: "Error saving page", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;

    try {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Page deleted successfully" });
      await fetchPages();
    } catch (error: any) {
      toast({ title: "Error deleting page", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.length} page${ids.length > 1 ? "s" : ""}?`)) return;

    try {
      const { error } = await supabase.from("pages").delete().in("id", ids);
      if (error) throw error;
      toast({ title: "Pages deleted successfully" });
      setSelectedIds(new Set());
      await fetchPages();
    } catch (error: any) {
      toast({ title: "Error deleting pages", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkStatusUpdate = async (nextStatus: "published" | "draft") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const { error } = await supabase.from("pages").update({ status: nextStatus }).in("id", ids);
      if (error) throw error;

      toast({
        title: nextStatus === "published" ? "Pages published" : "Pages moved to draft",
        description: `${ids.length} page${ids.length > 1 ? "s were" : " was"} updated`,
      });

      setSelectedIds(new Set());
      await fetchPages();
    } catch (error: any) {
      toast({ title: "Error updating pages", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content,
      status: page.status === "published" ? "published" : "draft",
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPage(null);
    setFormData({ title: "", slug: "", content: "", status: "draft" });
    setDialogOpen(true);
  };

  const filteredPages = useMemo(() => {
    let list = pages;
    const query = deferredSearchQuery.toLowerCase().trim();

    if (query) {
      list = list.filter((page) =>
        [page.title, page.slug, statusMeta[getPageDisplayStatus(page)].label]
          .some((value) => value.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== "all") {
      list = list.filter((page) => getPageDisplayStatus(page) === statusFilter);
    }

    return list;
  }, [pages, deferredSearchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPages.length / rowsPerPage));
  const paginatedPages = filteredPages.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const hasActiveFilters = statusFilter !== "all";

  const handleToggleSelectAll = () => {
    if (paginatedPages.length > 0 && selectedIds.size === paginatedPages.length) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(paginatedPages.map((page) => page.id)));
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = (ids?: string[]) => {
    const exportPages = ids?.length ? filteredPages.filter((page) => ids.includes(page.id)) : filteredPages;
    const headers = ["Title", "Slug", "Status", "Views", "Created", "Updated"];
    const rows = exportPages.map((page) => [
      page.title,
      page.slug,
      statusMeta[getPageDisplayStatus(page)].label,
      pageStats[page.id]?.views || 0,
      format(new Date(page.created_at), "dd MMM yyyy"),
      format(new Date(page.updated_at), "dd MMM yyyy"),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pages_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: `${exportPages.length} row${exportPages.length === 1 ? "" : "s"} exported`,
    });
  };

  const visibleDataColumns = useMemo(
    () =>
      [
        { key: "title", label: COLUMN_LABELS.title },
        { key: "slug", label: COLUMN_LABELS.slug },
        { key: "status", label: COLUMN_LABELS.status },
        { key: "updated", label: COLUMN_LABELS.updated },
        { key: "actions", label: COLUMN_LABELS.actions },
      ].filter((column) => visibleColumns[column.key]),
    [visibleColumns]
  );

  const gridTemplateColumns = useMemo(() => {
    const columns = ["48px"];
    if (visibleColumns.title) columns.push("minmax(280px, 1.7fr)");
    if (visibleColumns.slug) columns.push("minmax(220px, 1.1fr)");
    if (visibleColumns.status) columns.push("minmax(170px, 0.8fr)");
    if (visibleColumns.updated) columns.push("minmax(190px, 0.9fr)");
    if (visibleColumns.actions) columns.push("132px");
    return columns.join(" ");
  }, [visibleColumns]);

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex min-h-[400px] items-center justify-center">
          <UMLoader size={56} dark label="Loading…" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Static Pages</h1>
            <p className="text-muted-foreground">Create and manage content pages for your site</p>
          </div>

          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Button>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader className="gap-6 border-b border-border/60 pb-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px] max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, slug, status..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Clear search"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Filter className="h-4 w-4" />
                          Filter
                          {hasActiveFilters ? (
                            <Badge className="ml-0.5 flex h-4 w-4 items-center justify-center p-0 text-[10px]">
                              1
                            </Badge>
                          ) : null}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[220px] space-y-3 p-4 shadow-lg" align="end">
                        <h4 className="text-sm font-semibold text-foreground">Filters</h4>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Status</p>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_FILTER_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {hasActiveFilters ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-full text-xs text-muted-foreground"
                            onClick={() => {
                              setStatusFilter("all");
                              setFilterOpen(false);
                            }}
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            Clear filters
                          </Button>
                        ) : null}
                      </PopoverContent>
                    </Popover>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <Columns className="h-4 w-4" />
                          Columns
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 p-2">
                        <div className="mb-2 px-1 py-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Toggle Columns
                        </div>
                        {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                          <DropdownMenuItem
                            key={key}
                            onSelect={(e) => {
                              e.preventDefault();
                              setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-md py-2 focus:bg-accent"
                          >
                            <Switch checked={visibleColumns[key]} className="pointer-events-none" />
                            <span className="text-sm font-medium">{label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" className="gap-2" onClick={() => handleExportCSV()}>
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>

                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={refreshing}
                      onClick={async () => {
                        setRefreshing(true);
                        await fetchPages();
                        setRefreshing(false);
                      }}
                    >
                      <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                      Refresh
                    </Button>
                  </div>
                </div>

                {selectedIds.size > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                        {selectedIds.size}
                      </Badge>
                      <span className="font-medium text-foreground">
                        {selectedIds.size} row{selectedIds.size > 1 ? "s" : ""} selected
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleBulkStatusUpdate("published")}>
                        <CheckCircle2 className="h-4 w-4" />
                        Publish
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleBulkStatusUpdate("draft")}>
                        <CircleDashed className="h-4 w-4" />
                        Unpublish
                      </Button>
                      <Button variant="destructive" size="sm" className="gap-2" onClick={handleBulkDelete}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : null}

                {hasActiveFilters ? (
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs">
                      <span className="font-medium text-foreground">Status</span>
                      <span className="text-muted-foreground">is</span>
                      <span className="font-medium text-foreground">"{statusFilter}"</span>
                      <button onClick={() => setStatusFilter("all")} className="ml-0.5 text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    >
                      Clear all
                    </button>
                  </div>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
                <div
                  className="grid items-center border-b border-border/60 bg-muted/35 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55"
                  style={{ gridTemplateColumns }}
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={paginatedPages.length > 0 && selectedIds.size === paginatedPages.length}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = selectedIds.size > 0 && selectedIds.size < paginatedPages.length;
                        }
                      }}
                      onChange={handleToggleSelectAll}
                      className="block h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </div>

                  {visibleDataColumns.map((column) => (
                    <div key={column.key} className={cn("px-4", column.key === "actions" ? "text-right" : "text-left")}>
                      {column.label}
                    </div>
                  ))}
                </div>

                {paginatedPages.length === 0 ? (
                  <div className="px-6 py-20 text-center">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {searchQuery || hasActiveFilters ? "No pages match your search or filters." : "No pages created yet."}
                    </p>
                    {!searchQuery && !hasActiveFilters ? (
                      <Button className="mt-4" onClick={openCreateDialog}>
                        Create Your First Page
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {paginatedPages.map((page) => {
                      const displayStatus = getPageDisplayStatus(page);
                      const actionButtons = [
                        {
                          key: "preview",
                          label: "View page",
                          icon: Eye,
                          className: "text-foreground hover:bg-muted/50 hover:text-foreground",
                          onClick: () => window.open(`/${page.slug}`, "_blank"),
                        },
                        {
                          key: "edit",
                          label: "Edit page",
                          icon: Edit,
                          className: "text-foreground hover:bg-muted/50 hover:text-foreground",
                          onClick: () => handleEdit(page),
                        },
                        {
                          key: "info",
                          label: "Page insights",
                          icon: Info,
                          className: "text-foreground hover:bg-muted/50 hover:text-foreground",
                          tooltipContent: (
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Views:</span>
                                <span className="font-medium">{pageStats[page.id]?.views || 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Created:</span>
                                <span className="font-medium">{format(new Date(page.created_at), "MMM d, yyyy")}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Updated:</span>
                                <span className="font-medium">{format(new Date(page.updated_at), "MMM d, yyyy")}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Status:</span>
                                <span className="font-medium">{statusMeta[displayStatus].label}</span>
                              </div>
                            </div>
                          ),
                        },
                        {
                          key: "delete",
                          label: "Delete page",
                          icon: Trash2,
                          className: "text-destructive hover:bg-destructive/10 hover:text-destructive",
                          iconClassName: "text-destructive",
                          onClick: () => handleDelete(page.id),
                        },
                      ] as const;

                      return (
                        <div
                          key={page.id}
                          className={cn(
                            "grid items-stretch px-3 py-2.5 transition-colors",
                            selectedIds.has(page.id) ? "bg-muted/[0.14] hover:bg-muted/[0.18]" : "hover:bg-muted/[0.08]"
                          )}
                          style={{ gridTemplateColumns }}
                        >
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(page.id)}
                              onChange={() => handleToggleSelectRow(page.id)}
                              className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                            />
                          </div>

                          {visibleColumns.title ? (
                            <div className="flex min-h-[88px] items-center px-4">
                              <div className="space-y-2">
                                <div className="text-[15px] font-semibold leading-5 text-foreground">{page.title}</div>
                                <div className="space-y-1 text-xs leading-4 text-muted-foreground">
                                  <div>Created {format(new Date(page.created_at), "MMM d, yyyy")}</div>
                                  <div className="font-mono">/{page.slug}</div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {visibleColumns.slug ? (
                            <div className="flex min-h-[88px] items-center px-4">
                              <div className="space-y-1">
                                <div className="font-mono text-sm text-foreground">/{page.slug}</div>
                                <div className="text-xs text-muted-foreground">Static content page</div>
                              </div>
                            </div>
                          ) : null}

                          {visibleColumns.status ? (
                            <div className="flex min-h-[88px] items-center px-4">
                              <PageStatusBadge status={displayStatus} />
                            </div>
                          ) : null}

                          {visibleColumns.updated ? (
                            <div className="flex min-h-[88px] items-center px-4">
                              <div className="space-y-1">
                                <div className="text-sm font-semibold text-foreground">
                                  {format(new Date(page.updated_at), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {visibleColumns.actions ? (
                            <div className="flex min-h-[88px] items-center justify-end px-4">
                              <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-background/85 p-1 shadow-sm">
                                {actionButtons.map((action) => {
                                  const Icon = action.icon;
                                  const button = (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className={cn(
                                        "h-8 w-8 rounded-lg transition-colors focus-visible:ring-1 focus-visible:ring-ring/50",
                                        action.className
                                      )}
                                      onClick={action.onClick}
                                    >
                                      <Icon className={cn("h-4 w-4", action.iconClassName)} />
                                    </Button>
                                  );

                                  return (
                                    <TooltipProvider key={action.key}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                                        <TooltipContent side="top" className={action.tooltipContent ? "p-3" : undefined}>
                                          {action.tooltipContent ?? action.label}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(value) => setRowsPerPage(Number(value))}>
                    <SelectTrigger className="h-9 w-[92px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROWS_PER_PAGE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground sm:justify-end">
                  <span>
                    {filteredPages.length === 0
                      ? "0 records"
                      : `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, filteredPages.length)} of ${filteredPages.length} records`}
                  </span>
                  <span>{`Page ${currentPage} of ${totalPages}`}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Page Title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  title: e.target.value,
                  slug: editingPage ? prev.slug : e.target.value.toLowerCase().trim().replace(/\s+/g, "-"),
                }))
              }
              required
            />

            <Input
              placeholder="Slug"
              value={formData.slug}
              onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
              required
            />

            <Textarea
              placeholder="Page Content"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
              rows={10}
              required
            />

            <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>

            <Button type="submit" className="w-full">
              {editingPage ? "Update Page" : "Create Page"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPages;
