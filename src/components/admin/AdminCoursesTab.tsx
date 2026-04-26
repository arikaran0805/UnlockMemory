import { useState, useEffect } from "react";
import UMLoader from "@/components/UMLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleScope } from "@/hooks/useRoleScope";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Eye,
  Pencil,
  Trash2,
  Send,
  Shield,
  UserCog,
  User,
  BookOpen,
  Star,
} from "lucide-react";
import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  level: string | null;
  created_at: string;
  status: string;
  author_id: string | null;
  assigned_to: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UserWithRole {
  profile: UserProfile;
  role: string;
}

interface CategoryStats {
  [categoryId: string]: {
    postCount: number;
  };
}

/** Per-level visual config */
const LEVEL_CONFIG: Record<string, { band: string; badge: string }> = {
  beginner: {
    band: 'from-emerald-500 to-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  },
  intermediate: {
    band: 'from-sky-500 to-sky-400',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
  },
  advanced: {
    band: 'from-violet-500 to-violet-400',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
  },
};

const DEFAULT_LEVEL_CONFIG = {
  band: 'from-neutral-400 to-neutral-300',
  badge: 'bg-neutral-200 text-content-secondary dark:bg-neutral-800 dark:text-content-muted',
};

function getLevelConfig(level: string | null) {
  if (!level) return DEFAULT_LEVEL_CONFIG;
  return LEVEL_CONFIG[level.toLowerCase()] ?? DEFAULT_LEVEL_CONFIG;
}

// ─── Course Card ────────────────────────────────────────────────────────────

interface CourseCardProps {
  category: Category;
  postCount: number;
  isAdmin: boolean;
  authorDisplay: { name: string; role: string } | null;
  canDirectDelete: boolean;
  canRequestDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRequestDelete: () => void;
}

const CourseCard = ({
  category,
  postCount,
  isAdmin,
  authorDisplay,
  canDirectDelete,
  canRequestDelete,
  onView,
  onEdit,
  onDelete,
  onRequestDelete,
}: CourseCardProps) => {
  const cfg = getLevelConfig(category.level);
  const initial = category.name.charAt(0).toUpperCase();

  return (
    <div className="group rounded-xl border border-border overflow-hidden bg-card shadow-[0_1px_4px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] transition-all duration-200 flex flex-col">

      {/* Colored band — h-12, level badge left, Featured+Status right */}
      <div className={cn('relative h-12 bg-gradient-to-r flex-shrink-0 flex items-center px-3 gap-2', cfg.band)}>
        {/* Large watermark initial — gives each card unique visual identity */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-5xl font-black text-white/10 select-none leading-none pointer-events-none">
          {initial}
        </span>

        {/* Level badge — left, white pill */}
        <span className="relative z-10 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/25 text-white border border-white/20 flex-shrink-0">
          {category.level ?? 'General'}
        </span>

        {/* Right side — status + featured */}
        <div className="ml-auto flex items-center gap-1.5 z-10">
          {!isAdmin && (
            <ContentStatusBadge status={category.status as ContentStatus} />
          )}
          {category.featured && (
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/25">
              <Star className="h-2.5 w-2.5 fill-white text-white" />
              <span className="text-[10.5px] font-semibold text-white tracking-wide">Featured</span>
            </div>
          )}
        </div>
      </div>

      {/* Body — fixed min-height keeps all cards the same height */}
      <div className="px-4 pt-3 pb-3 flex flex-col gap-1.5 min-h-[100px]">
        {/* Course name */}
        <h3 className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">
          {category.name}
        </h3>

        {/* Slug */}
        <p className="text-[11px] font-mono text-muted-foreground/55 truncate">
          /{category.slug}
        </p>

        {/* Post count */}
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <BookOpen className="h-3 w-3 flex-shrink-0" />
          <span>{postCount} {postCount === 1 ? 'post' : 'posts'}</span>
        </div>

        {/* Author row — pushed to bottom, takes up reserved space even when absent */}
        <div className="mt-auto pt-1 min-h-[20px] flex items-center">
          {authorDisplay && (
            <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground min-w-0">
              <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {authorDisplay.role === "admin"
                  ? <Shield className="h-2.5 w-2.5" />
                  : authorDisplay.role === "moderator" || authorDisplay.role === "super_moderator"
                  ? <UserCog className="h-2.5 w-2.5" />
                  : <User className="h-2.5 w-2.5" />
                }
              </div>
              <span className="truncate">{authorDisplay.name}</span>
              {(authorDisplay.role === "admin") && (
                <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                  Admin
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action footer — always visible, not faded */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border/50 bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={onView}
            title="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={onEdit}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        {canDirectDelete ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : canRequestDelete ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-orange-500/70 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-colors"
            onClick={onRequestDelete}
            title="Request deletion"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const AdminCoursesTab = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [users, setUsers] = useState<Map<string, UserWithRole>>(new Map());
  const [loading, setLoading] = useState(true);
  const [deleteRequestCategory, setDeleteRequestCategory] = useState<Category | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role, courseIds, loading: scopeLoading } = useRoleScope();
  const { userId } = useAuth();

  const isAdmin = role === "admin";
  const isSuperMod = role === "super_moderator";
  const isSeniorMod = role === "senior_moderator";
  const isModerator = role === "moderator";

  const canDirectDelete = (courseId: string) =>
    isAdmin || (isSuperMod && courseIds.includes(courseId));

  useEffect(() => {
    if (!scopeLoading) fetchCategories();
  }, [scopeLoading, role]);

  const fetchCategories = async () => {
    try {
      let query = supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });

      if (!isAdmin) {
        if (courseIds.length > 0) {
          query = query.in("id", courseIds);
        } else {
          setCategories([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setCategories((data as Category[]) || []);

      if (data && data.length > 0) {
        await fetchCategoryStats(data.map(c => c.id));

        const userIds = new Set<string>();
        data.forEach(c => {
          if (c.author_id) userIds.add(c.author_id);
          if (c.assigned_to) userIds.add(c.assigned_to);
        });
        if (userIds.size > 0) await fetchUsers(Array.from(userIds));
      }
    } catch (error: any) {
      toast({ title: "Error fetching courses", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async (userIds: string[]) => {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const userMap = new Map<string, UserWithRole>();
      profiles?.forEach(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        userMap.set(profile.id, { profile, role: userRole?.role || "user" });
      });
      setUsers(userMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchCategoryStats = async (categoryIds: string[]) => {
    try {
      const statsMap: CategoryStats = {};
      categoryIds.forEach(id => { statsMap[id] = { postCount: 0 }; });

      const { data: postsData } = await supabase
        .from("posts")
        .select("category_id")
        .in("category_id", categoryIds);

      if (postsData) {
        postsData.forEach(post => {
          if (post.category_id && statsMap[post.category_id]) {
            statsMap[post.category_id].postCount++;
          }
        });
      }
      setCategoryStats(statsMap);
    } catch (error) {
      console.error("Error fetching category stats:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (isSuperMod && !courseIds.includes(id)) {
      toast({ title: "You can only delete courses in your assigned career", variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Course deleted successfully" });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error deleting course", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteRequest = async () => {
    if (!deleteRequestCategory || !userId) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("delete_requests")
        .insert({
          content_type: "course",
          content_id: deleteRequestCategory.id,
          content_title: deleteRequestCategory.name,
          requested_by: userId,
          reason: deleteReason || null,
        });
      if (error) throw error;
      toast({ title: "Delete request submitted", description: "An admin will review your request" });
      setDeleteRequestCategory(null);
      setDeleteReason("");
    } catch (error: any) {
      toast({ title: "Error submitting request", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserDisplay = (uid: string | null) => {
    if (!uid) return null;
    const user = users.get(uid);
    if (!user) return { name: "Unknown", role: "user" };
    return {
      name: user.profile.full_name || user.profile.email.split("@")[0],
      role: user.role,
    };
  };

  const editCoursePath = (id: string) =>
    isSuperMod ? `/super-moderator/courses/${id}` : `/admin/courses/${id}`;

  if (loading || scopeLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <UMLoader size={44} label="Unlocking memory…" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-[15px] font-medium text-foreground">No courses yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin ? "Create your first course to get started." : "No courses have been assigned to you yet."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categories.map((category) => (
          <CourseCard
            key={category.id}
            category={category}
            postCount={categoryStats[category.id]?.postCount ?? 0}
            isAdmin={isAdmin}
            authorDisplay={getUserDisplay(category.author_id)}
            canDirectDelete={canDirectDelete(category.id)}
            canRequestDelete={isSeniorMod || isModerator}
            onView={() => window.open(`/course/${category.slug}?preview=true`, "_blank")}
            onEdit={() => navigate(editCoursePath(category.id))}
            onDelete={() => handleDelete(category.id)}
            onRequestDelete={() => setDeleteRequestCategory(category)}
          />
        ))}
      </div>

      {/* Delete Request Dialog */}
      <Dialog open={!!deleteRequestCategory} onOpenChange={() => setDeleteRequestCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Course Deletion</DialogTitle>
            <DialogDescription>
              Request to delete: {deleteRequestCategory?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason for deletion (optional)</label>
              <Textarea
                placeholder="Explain why this course should be deleted..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRequestCategory(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleDeleteRequest} disabled={isSubmitting} className="gap-2">
              <Send className="h-4 w-4" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCoursesTab;
