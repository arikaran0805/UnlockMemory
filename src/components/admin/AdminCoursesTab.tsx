import { useState, useEffect } from "react";
import UMLoader from "@/components/UMLoader";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleScope } from "@/hooks/useRoleScope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Eye, 
  Pencil, 
  Trash2, 
  Info,
  FileText,
  Send,
  Shield,
  UserCog,
  User,
  BookOpen
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

const AdminCoursesTab = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats>({});
  const [users, setUsers] = useState<Map<string, UserWithRole>>(new Map());
  const [loading, setLoading] = useState(true);
  const [previewCategory, setPreviewCategory] = useState<Category | null>(null);
  const [deleteRequestCategory, setDeleteRequestCategory] = useState<Category | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role, courseIds, careerIds, loading: scopeLoading } = useRoleScope();

  const isAdmin = role === "admin";
  const isSuperMod = role === "super_moderator";
  const isSeniorMod = role === "senior_moderator";
  const isModerator = role === "moderator";

  // Roles that can create courses
  const canCreateCourse = isAdmin || isSuperMod;
  // Roles that can directly delete (not just request)
  const canDirectDelete = (courseId: string) =>
    isAdmin || (isSuperMod && courseIds.includes(courseId));

  useEffect(() => {
    if (!scopeLoading) {
      fetchCategories();
    }
  }, [scopeLoading, role]);

  const fetchCategories = async () => {
    try {
      let query = supabase
        .from("courses")
        .select("*")
        .order("name", { ascending: true });

      // Scope filter for non-admin roles
      if (!isAdmin) {
        if (courseIds.length > 0) {
          query = query.in("id", courseIds);
        } else {
          // No assigned courses — return empty
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
        
        // Collect all unique user IDs (authors and assignees)
        const userIds = new Set<string>();
        data.forEach(c => {
          if (c.author_id) userIds.add(c.author_id);
          if (c.assigned_to) userIds.add(c.assigned_to);
        });
        
        if (userIds.size > 0) {
          await fetchUsers(Array.from(userIds));
        }
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
    // Scope guard: super_mod can only delete courses in their career scope
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
          reason: deleteReason || null
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

  const getUserDisplay = (userId: string | null) => {
    if (!userId) return null;
    const user = users.get(userId);
    if (!user) return { name: "Unknown", role: "user" };
    return {
      name: user.profile.full_name || user.profile.email.split("@")[0],
      role: user.role
    };
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 ml-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (role === "moderator") {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1 ml-1">
          <UserCog className="h-3 w-3" />
          Mod
        </Badge>
      );
    }
    return null;
  };

  const getLevelBadge = (level: string | null) => {
    if (!level) return <span className="text-muted-foreground text-sm">-</span>;
    
    const colors: Record<string, string> = {
      beginner: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      intermediate: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      advanced: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    };
    
    return (
      <Badge className={colors[level.toLowerCase()] || "bg-muted text-muted-foreground"}>
        {level}
      </Badge>
    );
  };

  if (loading || scopeLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <UMLoader size={44} label="Unlocking memory…" />
      </div>
    );
  }

  // Determine correct "new course" path based on role prefix
  const newCoursePath = isSuperMod
    ? "/super-moderator/courses/new"
    : "/admin/courses/new";

  const editCoursePath = (id: string) =>
    isSuperMod ? `/super-moderator/courses/${id}` : `/admin/courses/${id}`;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {canCreateCourse && (
          <div className="flex justify-end">
            <Button onClick={() => navigate(newCoursePath)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Course
            </Button>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isAdmin ? "No courses found" : "No courses assigned to you yet"}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const author = getUserDisplay(category.author_id);
              const assignee = getUserDisplay(category.assigned_to);
              
              return (
                <Card key={category.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{category.name}</h3>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          /{category.slug}
                        </code>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setPreviewCategory(category)}
                            >
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    
                    {/* Status Badge - for non-admin roles */}
                    {!isAdmin && (
                      <div className="mt-2">
                        <ContentStatusBadge status={category.status as ContentStatus} />
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Level and Posts */}
                    <div className="flex items-center justify-between">
                      {getLevelBadge(category.level)}
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{categoryStats[category.id]?.postCount || 0} posts</span>
                      </div>
                    </div>

                    {/* Ownership Info */}
                    <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-sm">
                      {author && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Created by
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium truncate max-w-[100px]">{author.name}</span>
                            {getRoleBadge(author.role)}
                          </div>
                        </div>
                      )}
                      
                      {assignee && (
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <UserCog className="h-3 w-3" />
                            Assigned to
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium truncate max-w-[100px]">{assignee.name}</span>
                            {getRoleBadge(assignee.role)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => window.open(`/course/${category.slug}?preview=true`, "_blank")}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(editCoursePath(category.id))}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </div>

                      {canDirectDelete(category.id) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      ) : isSeniorMod || isModerator ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-orange-500 hover:text-orange-600"
                              onClick={() => setDeleteRequestCategory(category)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Request Delete</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Dialog */}
        <Dialog open={!!previewCategory} onOpenChange={() => setPreviewCategory(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{previewCategory?.name}</DialogTitle>
              <DialogDescription>Course Details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Slug:</span>
                  <p className="font-mono mt-1">{previewCategory?.slug}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Level:</span>
                  <p className="mt-1">{previewCategory?.level || "-"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="mt-1">{previewCategory?.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Posts:</span>
                  <p className="mt-1">{previewCategory ? categoryStats[previewCategory.id]?.postCount || 0 : 0}</p>
                </div>
              </div>
              {previewCategory?.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <div 
                    className="mt-1 text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewCategory.description }}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
              <Button
                variant="outline"
                onClick={() => setDeleteRequestCategory(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteRequest}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default AdminCoursesTab;
