import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Info,
  UserCog,
  Shield,
  Send,
  Search,
  FileText,
  Filter,
  Columns,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Archive,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { format, formatDistanceToNow } from "date-fns";
import UMLoader from "@/components/UMLoader";

interface Post {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category_id: string | null;
  author_id: string;
  assigned_to: string | null;
  courses: {
    slug: string;
  } | null;
}

type PostDisplayStatus = "published" | "draft" | "scheduled" | "archived";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UserWithRole {
  profile: UserProfile;
  role: string;
}

interface PostStats {
  [postId: string]: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
}

type PostDraftMap = { [postId: string]: boolean };

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const COLUMN_LABELS: Record<string, string> = {
  title: "Title",
  createdBy: "Created By",
  status: "Status",
  published: "Published",
  actions: "Actions",
};

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
];

const statusMeta: Record<PostDisplayStatus, {
  label: string;
  dotClass: string;
  badgeClass: string;
  icon: typeof CheckCircle2;
}> = {
  published: {
    label: "Published",
    dotClass: "bg-emerald-500",
    badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
    icon: CheckCircle2,
  },
  draft: {
    label: "Draft",
    dotClass: "bg-amber-500",
    badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-700",
    icon: CircleDashed,
  },
  scheduled: {
    label: "Scheduled",
    dotClass: "bg-sky-500",
    badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-700",
    icon: Clock3,
  },
  archived: {
    label: "Archived",
    dotClass: "bg-slate-400",
    badgeClass: "border-slate-400/20 bg-slate-400/10 text-slate-700",
    icon: Archive,
  },
};

const getPostDisplayStatus = (post: Post): PostDisplayStatus => {
  if (post.status === "archived") return "archived";
  if (post.status === "draft") return "draft";
  if (post.published_at && new Date(post.published_at) > new Date()) return "scheduled";
  if (post.status === "published") return "published";
  return "draft";
};

const formatRelativeDate = (value: string) => formatDistanceToNow(new Date(value), { addSuffix: true });

function PostStatusBadge({ status }: { status: PostDisplayStatus }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", meta.badgeClass)}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

const AdminPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postStats, setPostStats] = useState<PostStats>({});
  const [postDraftMap, setPostDraftMap] = useState<PostDraftMap>({});
  const [users, setUsers] = useState<Map<string, UserWithRole>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [draftFilter, setDraftFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    title: true,
    createdBy: true,
    status: true,
    published: true,
    actions: true,
  });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moderatorOnly, setModeratorOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteRequestPost, setDeleteRequestPost] = useState<Post | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      const { data: rolesData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "moderator"]);

      if (roleError) throw roleError;

      if (!rolesData || rolesData.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin or moderator privileges",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const roles = (rolesData || []).map((r) => r.role);
      const isModeratorOnly = roles.includes("moderator") && !roles.includes("admin");
      setModeratorOnly(isModeratorOnly);
      setCurrentUserId(session.user.id);

      await fetchPosts(session.user.id, isModeratorOnly);
    } catch (error: any) {
      console.error("Error checking access:", error);
      navigate("/");
    }
  };

  const fetchUsers = async (userIds: string[]) => {
    try {
      const uniqueIds = [...new Set(userIds.filter(Boolean))];
      if (uniqueIds.length === 0) return;

      // Fetch profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueIds);

      // Fetch roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", uniqueIds);

      const userMap = new Map<string, UserWithRole>();
      
      profiles?.forEach(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        userMap.set(profile.id, {
          profile,
          role: userRole?.role || "user"
        });
      });

      setUsers(userMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchPosts = async (viewerUserId: string, isModeratorOnly: boolean) => {
    try {
      let query = supabase
        .from("posts")
        .select(
          "id, title, slug, status, published_at, created_at, updated_at, category_id, author_id, assigned_to, courses:category_id(slug)"
        );

      // Moderators see their own posts AND posts assigned to them
      if (isModeratorOnly) {
        query = query.or(`author_id.eq.${viewerUserId},assigned_to.eq.${viewerUserId}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setPosts((data as Post[]) || []);

      // Fetch stats and user info for each post
      if (data && data.length > 0) {
        await fetchPostStats(data.map((p) => p.id));
        await fetchDraftStatus(data.map((p) => p.id));

        // Collect all unique user IDs
        const userIds: string[] = [];
        data.forEach(p => {
          if (p.author_id) userIds.push(p.author_id);
          if (p.assigned_to) userIds.push(p.assigned_to);
        });
        await fetchUsers(userIds);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDraftStatus = async (postIds: string[]) => {
    try {
      const { data } = await supabase
        .from("post_versions")
        .select("post_id")
        .in("post_id", postIds)
        .eq("status", "draft");

      const map: PostDraftMap = {};
      postIds.forEach((id) => (map[id] = false));
      data?.forEach((row) => (map[row.post_id] = true));
      setPostDraftMap(map);
    } catch (error) {
      console.error("Error fetching draft status:", error);
    }
  };

  const fetchPostStats = async (postIds: string[]) => {
    try {
      const statsMap: PostStats = {};
      
      postIds.forEach(id => {
        statsMap[id] = { views: 0, likes: 0, comments: 0, shares: 0 };
      });

      const { data: viewsData } = await supabase
        .from("post_views")
        .select("post_id")
        .in("post_id", postIds);
      
      if (viewsData) {
        viewsData.forEach(view => {
          if (statsMap[view.post_id]) {
            statsMap[view.post_id].views++;
          }
        });
      }

      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds);
      
      if (likesData) {
        likesData.forEach(like => {
          if (statsMap[like.post_id]) {
            statsMap[like.post_id].likes++;
          }
        });
      }

      const { data: commentsData } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);
      
      if (commentsData) {
        commentsData.forEach(comment => {
          if (statsMap[comment.post_id]) {
            statsMap[comment.post_id].comments++;
          }
        });
      }

      const { data: sharesData } = await supabase
        .from("post_shares")
        .select("post_id")
        .in("post_id", postIds);
      
      if (sharesData) {
        sharesData.forEach(share => {
          if (statsMap[share.post_id]) {
            statsMap[share.post_id].shares++;
          }
        });
      }

      setPostStats(statsMap);
    } catch (error) {
      console.error("Error fetching post stats:", error);
    }
  };

  const handleDeleteClick = (post: Post) => {
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!postToDelete) return;
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

      setDeleteDialogOpen(false);
      setPostToDelete(null);
      if (currentUserId) {
        fetchPosts(currentUserId, moderatorOnly);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRequest = async () => {
    if (!deleteRequestPost || !currentUserId) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("delete_requests")
        .insert({
          content_type: "post",
          content_id: deleteRequestPost.id,
          content_title: deleteRequestPost.title,
          requested_by: currentUserId,
          reason: deleteReason || null
        });

      if (error) throw error;

      toast({ title: "Delete request submitted", description: "An admin will review your request" });
      setDeleteRequestPost(null);
      setDeleteReason("");
    } catch (error: any) {
      toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (post: Post) => {
    navigate(`/admin/posts/edit/${post.id}`);
  };

  const getUserDisplay = (userId: string | null) => {
    if (!userId) return null;
    const user = users.get(userId);
    if (!user) return { name: "Unknown", role: "user" };
    return {
      name: user.profile.full_name || user.profile.email.split("@")[0],
      role: user.role
    };
  };

  const getRoleBadge = (role: string, small = false) => {
    if (role === "admin") {
      return (
        <Badge className={`bg-primary/10 text-primary border-primary/20 gap-1 ${small ? 'text-[10px] px-1.5 py-0' : 'text-xs'}`}>
          <Shield className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />
          Admin
        </Badge>
      );
    }
    if (role === "moderator") {
      return (
        <Badge className={`bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 ${small ? 'text-[10px] px-1.5 py-0' : 'text-xs'}`}>
          <UserCog className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />
          Mod
        </Badge>
      );
    }
    return null;
  };

  const filteredPosts = useMemo(() => {
    let list = posts;
    const query = deferredSearchQuery.toLowerCase().trim();

    if (query) {
      list = list.filter((post) => {
        const author = getUserDisplay(post.author_id);
        const assignee = getUserDisplay(post.assigned_to);
        const displayStatus = getPostDisplayStatus(post);

        return [
          post.title,
          post.slug,
          statusMeta[displayStatus].label,
          post.courses?.slug || "",
          author?.name || "",
          assignee?.name || "",
        ].some((value) => value.toLowerCase().includes(query));
      });
    }

    if (statusFilter !== "all") {
      list = list.filter((post) => getPostDisplayStatus(post) === statusFilter);
    }

    if (draftFilter !== "all") {
      list = list.filter((post) =>
        draftFilter === "has_draft" ? !!postDraftMap[post.id] : !postDraftMap[post.id]
      );
    }

    return list;
  }, [posts, deferredSearchQuery, statusFilter, draftFilter, postDraftMap]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, draftFilter, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / rowsPerPage));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const hasActiveFilters = statusFilter !== "all" || draftFilter !== "all";

  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedPosts.map((post) => post.id)));
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
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!moderatorOnly) {
      setBulkDeleteDialogOpen(true);
      return;
    }

    if (!currentUserId) return;

    try {
      const selectedPosts = posts.filter((post) => selectedIds.has(post.id));
      const payload = selectedPosts.map((post) => ({
        content_type: "post",
        content_id: post.id,
        content_title: post.title,
        requested_by: currentUserId,
        reason: null,
      }));

      const { error } = await supabase.from("delete_requests").insert(payload);
      if (error) throw error;

      toast({
        title: "Delete requests submitted",
        description: `${payload.length} request${payload.length > 1 ? "s" : ""} sent for admin review`,
      });
      setSelectedIds(new Set());
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusUpdate = async (nextStatus: "published" | "draft") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || moderatorOnly) return;

    try {
      const payload =
        nextStatus === "published"
          ? { status: "published", published_at: new Date().toISOString() }
          : { status: "draft", published_at: null };

      const { error } = await supabase.from("posts").update(payload).in("id", ids);
      if (error) throw error;

      toast({
        title: nextStatus === "published" ? "Posts published" : "Posts moved to draft",
        description: `${ids.length} post${ids.length > 1 ? "s were" : " was"} updated`,
      });

      setSelectedIds(new Set());
      if (currentUserId) {
        fetchPosts(currentUserId, moderatorOnly);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = (ids?: string[]) => {
    const exportPosts = ids?.length
      ? filteredPosts.filter((post) => ids.includes(post.id))
      : filteredPosts;

    const headers = ["Title", "Slug", "Course", "Author", "Status", "Published", "Created"];
    const rows = exportPosts.map((post) => {
      const author = getUserDisplay(post.author_id);
      return [
        post.title,
        post.slug,
        post.courses?.slug || "",
        author?.name || "",
        statusMeta[getPostDisplayStatus(post)].label,
        post.published_at ? format(new Date(post.published_at), "dd MMM yyyy") : "",
        format(new Date(post.created_at), "dd MMM yyyy"),
      ];
    });

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `posts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Exported successfully", description: `${exportPosts.length} row${exportPosts.length === 1 ? "" : "s"} exported` });
  };

  const tableColumns = [
    {
      key: "title",
      visible: visibleColumns.title,
      headerClassName: "w-[340px] h-10 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70",
      cellClassName: "py-3.5 px-4 w-[340px] align-middle",
    },
    {
      key: "createdBy",
      visible: visibleColumns.createdBy,
      headerClassName: "w-[230px] h-10 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70",
      cellClassName: "py-3.5 px-4 w-[230px] align-middle",
    },
    {
      key: "status",
      visible: visibleColumns.status,
      headerClassName: "w-[170px] h-10 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70",
      cellClassName: "py-3.5 px-4 w-[170px] align-middle",
    },
    {
      key: "published",
      visible: visibleColumns.published,
      headerClassName: "w-[170px] h-10 px-4 text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70",
      cellClassName: "py-3.5 px-4 w-[170px] align-middle",
    },
    {
      key: "actions",
      visible: visibleColumns.actions,
      headerClassName: "w-[132px] h-10 px-4 text-right text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70",
      cellClassName: "py-3.5 px-4 w-[132px] align-middle",
    },
  ] as const;

  const visibleDataColumns = useMemo(
    () => tableColumns.filter((column) => column.visible),
    [tableColumns]
  );

  const gridTemplateColumns = useMemo(() => {
    const columns = ["48px"];

    if (visibleColumns.title) columns.push("minmax(320px, 2fr)");
    if (visibleColumns.createdBy) columns.push("minmax(220px, 1.15fr)");
    if (visibleColumns.status) columns.push("minmax(170px, 0.9fr)");
    if (visibleColumns.published) columns.push("minmax(190px, 0.95fr)");
    if (visibleColumns.actions) columns.push("132px");

    return columns.join(" ");
  }, [visibleColumns]);

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center min-h-[400px]">
          <UMLoader size={56} dark label="Loading…" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Posts</h1>
            <p className="text-muted-foreground">
              {moderatorOnly ? "Your posts and assigned posts" : "Create and manage all blog posts"}
            </p>
          </div>

          <Button onClick={() => navigate("/admin/posts/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Post
          </Button>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="gap-6 border-b border-border/60 pb-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by title, slug, author…"
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

              <div className="flex items-center gap-2 ml-auto">
                <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Filter
                      {hasActiveFilters && (
                        <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-0.5">
                          {[statusFilter !== "all", draftFilter !== "all"].filter(Boolean).length}
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
                          {STATUS_FILTER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground font-medium">Draft Version</p>
                      <Select value={draftFilter} onValueChange={setDraftFilter}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="has_draft">Has draft</SelectItem>
                          <SelectItem value="no_draft">No draft</SelectItem>
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
                          setDraftFilter("all");
                          setFilterOpen(false);
                        }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />Clear filters
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>

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

                <Button variant="outline" className="gap-2" onClick={() => handleExportCSV()}>
                  <Download className="h-4 w-4" />Export CSV
                </Button>

                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={refreshing}
                  onClick={async () => {
                    if (!currentUserId) return;
                    setRefreshing(true);
                    await fetchPosts(currentUserId, moderatorOnly);
                    setRefreshing(false);
                  }}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {selectedIds.size > 0 && (
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
                  {!moderatorOnly ? (
                    <>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleBulkStatusUpdate("published")}>
                        <CheckCircle2 className="h-4 w-4" />
                        Publish
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => handleBulkStatusUpdate("draft")}>
                        <CircleDashed className="h-4 w-4" />
                        Unpublish
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant={moderatorOnly ? "outline" : "destructive"}
                    size="sm"
                    className="gap-2"
                    onClick={handleBulkDelete}
                  >
                    {moderatorOnly ? <Send className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    {moderatorOnly ? "Request Delete" : "Delete"}
                  </Button>
                </div>
              </div>
            )}

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
                {draftFilter !== "all" && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs">
                    <span className="font-medium text-foreground">Draft</span>
                    <span className="text-muted-foreground">is</span>
                    <span className="font-medium text-foreground">"{draftFilter === "has_draft" ? "Has draft" : "No draft"}"</span>
                    <button onClick={() => setDraftFilter("all")} className="ml-0.5 text-muted-foreground hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setDraftFilter("all");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            )}
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
                  checked={paginatedPosts.length > 0 && selectedIds.size === paginatedPosts.length}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < paginatedPosts.length;
                  }}
                  onChange={handleToggleSelectAll}
                  className="h-4 w-4 rounded border-border accent-primary cursor-pointer block"
                />
              </div>
              {visibleDataColumns.map((column) => (
                <div
                  key={column.key}
                  className={cn(
                    "px-4",
                    column.key === "actions" ? "text-right" : "text-left"
                  )}
                >
                  {COLUMN_LABELS[column.key]}
                </div>
              ))}
            </div>

            {paginatedPosts.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery || hasActiveFilters
                    ? "No posts match your search or filters."
                    : moderatorOnly
                      ? "No posts found for your scope yet."
                      : "No posts created yet."}
                </p>
                {!searchQuery && !hasActiveFilters ? (
                  <Button className="mt-4" onClick={() => navigate("/admin/posts/new")}>
                    Create Your First Post
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {paginatedPosts.map((post) => {
                  const author = getUserDisplay(post.author_id);
                  const assignee = getUserDisplay(post.assigned_to);
                  const displayStatus = getPostDisplayStatus(post);
                  const actionButtons = [
                    {
                      key: "preview",
                      label: "View preview",
                      icon: Eye,
                      className: "text-foreground hover:bg-muted/50 hover:text-foreground",
                      onClick: () => {
                        if (post.courses?.slug) {
                          window.open(`/course/${post.courses.slug}?lesson=${post.slug}&preview=true`, "_blank");
                        } else {
                          toast({
                            title: "No Course",
                            description: "This post doesn't have a course assigned.",
                            variant: "destructive",
                          });
                        }
                      },
                    },
                    {
                      key: "edit",
                      label: "Edit post",
                      icon: Edit,
                      className: "text-foreground hover:bg-muted/50 hover:text-foreground",
                      onClick: () => handleEdit(post),
                    },
                    {
                      key: "info",
                      label: "Post insights",
                      icon: Info,
                      className: "text-foreground hover:bg-muted/50 hover:text-foreground",
                      tooltipContent: (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Views:</span>
                            <span className="font-medium">{postStats[post.id]?.views || 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Likes:</span>
                            <span className="font-medium">{postStats[post.id]?.likes || 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Comments:</span>
                            <span className="font-medium">{postStats[post.id]?.comments || 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Shares:</span>
                            <span className="font-medium">{postStats[post.id]?.shares || 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Created:</span>
                            <span className="font-medium">{format(new Date(post.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      ),
                    },
                    !moderatorOnly
                      ? {
                          key: "delete",
                          label: "Delete post",
                          icon: Trash2,
                          className: "text-destructive hover:bg-destructive/10 hover:text-destructive",
                          iconClassName: "text-destructive",
                          onClick: () => handleDeleteClick(post),
                        }
                      : {
                          key: "request-delete",
                          label: "Request delete",
                          icon: Send,
                          className: "text-orange-500 hover:bg-orange-500/10 hover:text-orange-600",
                          onClick: () => setDeleteRequestPost(post),
                        },
                  ] as const;

                  return (
                    <div
                      key={post.id}
                      className={cn(
                        "grid items-stretch px-3 py-2.5 transition-colors",
                        selectedIds.has(post.id)
                          ? "bg-muted/[0.14] hover:bg-muted/[0.18]"
                          : "hover:bg-muted/[0.08]"
                      )}
                      style={{ gridTemplateColumns }}
                    >
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(post.id)}
                          onChange={() => handleToggleSelectRow(post.id)}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                      </div>

                      {visibleColumns.title && (
                        <div className="flex min-h-[88px] items-center px-4">
                          <div className="space-y-2">
                            <div className="text-[15px] font-semibold leading-5 text-foreground">
                              {post.title}
                            </div>
                            <div className="space-y-1 text-xs leading-4 text-muted-foreground">
                              {post.courses?.slug ? (
                                <div>
                                  in <span className="font-medium text-muted-foreground/85">{post.courses.slug}</span>
                                </div>
                              ) : (
                                <div>{post.slug}</div>
                              )}
                              {assignee ? (
                                <div className="inline-flex items-center gap-1">
                                  <UserCog className="h-3 w-3" />
                                  Assigned to {assignee.name}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}

                      {visibleColumns.createdBy && (
                        <div className="flex min-h-[88px] items-center px-4">
                          {author ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground">{author.name}</div>
                              <div>{getRoleBadge(author.role, true)}</div>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {visibleColumns.status && (
                        <div className="flex min-h-[88px] items-center px-4">
                          <PostStatusBadge status={displayStatus} />
                        </div>
                      )}

                      {visibleColumns.published && (
                        <div className="flex min-h-[88px] items-center px-4">
                          {post.published_at ? (
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-foreground">
                                {format(new Date(post.published_at), "MMM d, yyyy")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatRelativeDate(post.published_at)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground/70">Not published</span>
                          )}
                        </div>
                      )}

                      {visibleColumns.actions && (
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
                                    <TooltipTrigger asChild>
                                      {button}
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className={action.tooltipContent ? "p-3" : undefined}>
                                      {action.tooltipContent ?? action.label}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4 mt-4 sm:flex-row sm:items-center sm:justify-between">
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
                {filteredPosts.length === 0
                  ? "0 records"
                  : `${(currentPage - 1) * rowsPerPage + 1}-${Math.min(currentPage * rowsPerPage, filteredPosts.length)} of ${filteredPosts.length} records`}
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

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">"{postToDelete?.title}"</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} {selectedIds.size === 1 ? "post" : "posts"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">{selectedIds.size} selected post{selectedIds.size !== 1 ? "s" : ""}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const ids = Array.from(selectedIds);
                try {
                  const { error } = await supabase.from("posts").delete().in("id", ids);
                  if (error) throw error;
                  toast({
                    title: "Success",
                    description: `${ids.length} post${ids.length > 1 ? "s" : ""} deleted successfully`,
                  });
                  setBulkDeleteDialogOpen(false);
                  setSelectedIds(new Set());
                  if (currentUserId) fetchPosts(currentUserId, moderatorOnly);
                } catch (error: any) {
                  toast({ title: "Error", description: error.message, variant: "destructive" });
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Posts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Delete Request Dialog (moderator flow) */}
      <Dialog open={!!deleteRequestPost} onOpenChange={() => setDeleteRequestPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Post Deletion</DialogTitle>
            <DialogDescription>
              Request deletion for "{deleteRequestPost?.title}". An admin will review your request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Why should this post be deleted?"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRequestPost(null)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteRequest} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default AdminPosts;
