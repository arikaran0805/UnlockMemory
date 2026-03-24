import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeHtml } from "@/lib/sanitize";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Star, Eye, Info } from "lucide-react";
import { format } from "date-fns";
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

const AdminCourses = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [loading, setLoading] = useState(true);
  const [previewCategory, setPreviewCategory] = useState<Category | null>(null);
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
      categoryIds.forEach(id => {
        statsMap[id] = { postCount: 0 };
      });

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
    <div className="flex items-center justify-center min-h-[400px]">
      <UMLoader size={56} dark label="Loading…" />
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <Button onClick={() => navigate("/admin/courses/new")}>
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{category.name}</span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => window.open(`/course/${category.slug}`, "_blank")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/courses/${category.id}`)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="p-3">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Posts:</span>
                              <span className="font-medium">{categoryStats[category.id]?.postCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Created:</span>
                              <span className="font-medium">{format(new Date(category.created_at), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground break-words">/{category.slug}</p>
                {category.description && (
                  <div>
                    <div 
                      className="text-sm break-words prose prose-sm max-w-none line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(category.description) }}
                    />
                    {category.description.length > 150 && (
                      <button
                        onClick={() => setPreviewCategory(category)}
                        className="text-xs text-primary hover:underline mt-1"
                      >
                        Read more
                      </button>
                    )}
                  </div>
                )}
                {category.level && (
                  <p className="text-sm font-medium break-words">Level: {category.level}</p>
                )}
                <div className="flex items-center gap-2 pt-3 border-t">
                  <Star className={`h-4 w-4 ${category.featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-medium">Featured</span>
                  <Switch
                    checked={category.featured}
                    onCheckedChange={() => toggleFeatured(category.id, category.featured)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview Dialog */}
        <Dialog open={!!previewCategory} onOpenChange={() => setPreviewCategory(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{previewCategory?.name}</DialogTitle>
              {previewCategory?.level && (
                <p className="text-sm text-muted-foreground">Level: {previewCategory.level}</p>
              )}
            </DialogHeader>
            {previewCategory?.description && (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: previewCategory.description }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AdminCourses;
