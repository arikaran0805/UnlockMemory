import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Edit, Trash2, Star, Eye, BookOpen } from "lucide-react";
import UMLoader from "@/components/UMLoader";

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
  band: 'from-slate-400 to-slate-300',
  badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
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

  return (
    <div className="group rounded-xl border border-border overflow-hidden bg-card shadow-[0_1px_4px_rgba(0,0,0,0.07)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] transition-all duration-200 flex flex-col">

      {/* Colored level band */}
      <div className={cn('relative h-14 bg-gradient-to-r flex-shrink-0', cfg.band)}>
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_60%)]" />

        {category.featured && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/25">
            <Star className="h-2.5 w-2.5 fill-white text-white" />
            <span className="text-[10.5px] font-semibold text-white tracking-wide">Featured</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2 flex-1">
        <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2">
          {category.name}
        </h3>

        {/* Level badge + post count */}
        <div className="flex items-center gap-2 mt-2">
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.badge)}>
            {category.level ?? 'General'}
          </span>
          <span className="text-muted-foreground/40 text-[11px]">•</span>
          <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
            <BookOpen className="h-3 w-3 flex-shrink-0" />
            <span>{postCount} {postCount === 1 ? 'post' : 'posts'}</span>
          </div>
        </div>

        {/* Slug */}
        <p className="text-[11px] font-mono text-muted-foreground/55 mt-1.5 truncate">
          /{category.slug}
        </p>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/20 flex-shrink-0">
        <button
          onClick={onToggleFeatured}
          className={cn(
            'flex items-center gap-1 text-[12px] font-medium transition-colors duration-150 rounded px-1 py-0.5',
            category.featured
              ? 'text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title={category.featured ? 'Unmark as featured' : 'Mark as featured'}
        >
          <Star className={cn('h-3.5 w-3.5', category.featured && 'fill-current')} />
          <span>{category.featured ? 'Featured' : 'Mark featured'}</span>
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

  const handleDelete = async (id: string) => {
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
              onDelete={() => handleDelete(category.id)}
              onToggleFeatured={() => toggleFeatured(category.id, category.featured)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
