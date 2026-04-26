import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Edit, Trash2, Star, Eye, BookOpen } from "lucide-react";
import UMLoader from "@/components/UMLoader";
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

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured: boolean;
  level: string | null;
  created_at: string;
}

interface CategoryStats {
  [categoryId: string]: {
    postCount: number;
  };
}

/** Per-level visual config — band gradient + badge colors */
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
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}

const CourseCard = ({
  category,
  postCount,
  onView,
  onEdit,
  onDelete,
  onToggleFeatured,
}: CourseCardProps) => {
  const cfg = getLevelConfig(category.level);
  const initial = category.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <div className="group rounded-xl border border-border/70 overflow-hidden bg-card hover:border-border transition-all duration-200 flex flex-col hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]">

      {/* Gradient band — carries level identity + initial letter */}
      <div className={cn('relative h-[72px] bg-gradient-to-br flex-shrink-0 overflow-hidden', cfg.band)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.18),transparent_65%)]" />
        {/* Large initial — decorative, bottom-right */}
        <span className="absolute -bottom-2 -right-1 text-[64px] font-black text-white/[0.12] leading-none select-none pointer-events-none">
          {initial}
        </span>
        {/* Level badge — top-left */}
        <div className="absolute top-3 left-3">
          <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-white/25 backdrop-blur-sm text-white border border-white/20 tracking-wide">
            {category.level ?? 'General'}
          </span>
        </div>
        {/* Featured star — top-right */}
        {category.featured && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/25">
            <Star className="h-2.5 w-2.5 fill-white text-white" />
            <span className="text-[10.5px] font-semibold text-white tracking-wide">Featured</span>
          </div>
        )}
      </div>

      {/* Body — 2 columns separated by a vertical divider */}
      <div className="flex-1 flex divide-x divide-border/50">

        {/* LEFT: name + slug */}
        <div className="flex-1 min-w-0 px-4 py-3.5 flex flex-col gap-1.5">
          <h3 className="text-[14.5px] font-semibold text-foreground leading-snug line-clamp-2">
            {category.name}
          </h3>
          <p className="text-[10.5px] font-mono text-muted-foreground/50 truncate">
            /{category.slug}
          </p>
          {category.description && (
            <p className="text-[11.5px] text-muted-foreground/60 line-clamp-2 leading-relaxed mt-0.5">
              {category.description}
            </p>
          )}
        </div>

        {/* RIGHT: stats */}
        <div className="w-[88px] flex-shrink-0 flex flex-col items-center justify-center gap-1 py-3.5 bg-muted/[0.03]">
          <span className="text-[22px] font-bold text-foreground/80 tabular-nums leading-none">
            {postCount}
          </span>
          <div className="flex items-center gap-1 text-muted-foreground/50">
            <BookOpen className="h-3 w-3" />
            <span className="text-[10.5px]">{postCount === 1 ? 'post' : 'posts'}</span>
          </div>
        </div>

      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/40 bg-muted/[0.04] flex-shrink-0">
        <button
          onClick={onToggleFeatured}
          className={cn(
            'flex items-center gap-1 text-[11.5px] font-medium transition-colors duration-150 rounded-md px-1.5 py-1',
            category.featured
              ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400'
              : 'text-muted-foreground/60 hover:text-foreground',
          )}
          title={category.featured ? 'Unmark as featured' : 'Mark as featured'}
        >
          <Star className={cn('h-3.5 w-3.5', category.featured && 'fill-current')} />
          <span className="hidden sm:inline">{category.featured ? 'Featured' : 'Feature'}</span>
        </button>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/50 hover:text-foreground hover:bg-muted"
            onClick={onView}
            title="View course"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/50 hover:text-foreground hover:bg-muted"
            onClick={onEdit}
            title="Edit course"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            title="Delete course"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Page ───────────────────────────────────────────────────────────────────

const AdminCourses = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Category | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: rolesData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "moderator"]);

    if (roleError || !rolesData || rolesData.length === 0) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    fetchCategories();
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);

      if (data && data.length > 0) {
        await fetchCategoryStats(data.map(c => c.id));
      }
    } catch (error: any) {
      toast({ title: "Error fetching courses", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
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

  const handleDeleteClick = (category: Category) => {
    setCourseToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      const { error } = await supabase.from("courses").delete().eq("id", courseToDelete.id);
      if (error) throw error;
      toast({ title: "Course deleted successfully" });
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error deleting course", description: error.message, variant: "destructive" });
    }
  };

  const toggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ featured: !currentFeatured })
        .eq("id", id);

      if (error) throw error;
      toast({ title: `Course ${!currentFeatured ? "marked as featured" : "unmarked as featured"}` });
      fetchCategories();
    } catch (error: any) {
      toast({ title: "Error updating featured status", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="flex flex-col gap-0">
      <div className="admin-section-spacing-top" />
      <div className="flex items-center justify-center min-h-[400px]">
        <UMLoader size={56} dark label="Loading…" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground">Manage and organize learning paths and course content</p>
        </div>
        <Button onClick={() => navigate("/admin/courses/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Course
        </Button>
      </div>

      <div className="admin-section-spacing-top" />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[15px] font-medium text-foreground">No courses yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first course to get started.</p>
          <Button className="mt-4" onClick={() => navigate("/admin/courses/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((category) => (
            <CourseCard
              key={category.id}
              category={category}
              postCount={categoryStats[category.id]?.postCount ?? 0}
              onView={() => window.open(`/course/${category.slug}`, "_blank")}
              onEdit={() => navigate(`/admin/courses/${category.id}`)}
              onDelete={() => handleDeleteClick(category)}
              onToggleFeatured={() => toggleFeatured(category.id, category.featured)}
            />
          ))}
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold text-foreground">"{courseToDelete?.name}"</span> and all its associated data. This action cannot be undone.
              {courseToDelete && (categoryStats[courseToDelete.id]?.postCount ?? 0) > 0 && (
                <span className="block mt-2 font-semibold text-destructive">
                  This course has {categoryStats[courseToDelete.id].postCount} linked post{categoryStats[courseToDelete.id].postCount !== 1 ? 's' : ''}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCourses;
