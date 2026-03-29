import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";
import { Plus, Edit, Trash2, Eye, Info, User, UserCog, Shield, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

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

const AdminPosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [postStats, setPostStats] = useState<PostStats>({});
  const [users, setUsers] = useState<Map<string, UserWithRole>>(new Map());
  const [loading, setLoading] = useState(true);
  const [moderatorOnly, setModeratorOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deleteRequestPost, setDeleteRequestPost] = useState<Post | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post deleted successfully",
      });

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

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="text-center p-6">Loading...</div>
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

      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
          <CardDescription>
            {moderatorOnly ? "Posts you created or were assigned to you" : "Manage all blog posts"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => {
                const author = getUserDisplay(post.author_id);
                const assignee = getUserDisplay(post.assigned_to);
                
                return (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-medium">{post.title}</span>
                        {post.courses?.slug && (
                          <div className="text-xs text-muted-foreground">
                            in <span className="font-medium">{post.courses.slug}</span>
                          </div>
                        )}
                        {assignee && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserCog className="h-3 w-3" />
                            Assigned to: {assignee.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {author && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{author.name}</span>
                          {getRoleBadge(author.role, true)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <ContentStatusBadge status={post.status as ContentStatus} />
                    </TableCell>
                    <TableCell>
                      {post.published_at ? format(new Date(post.published_at), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (post.courses?.slug) {
                              window.open(`/course/${post.courses.slug}?lesson=${post.slug}&preview=true`, "_blank");
                            } else {
                              toast({
                                title: "No Course",
                                description: "This post doesn't have a course assigned.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(post)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="p-3">
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
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {!moderatorOnly ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-500 hover:text-orange-600"
                            onClick={() => setDeleteRequestPost(post)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No posts yet. Create your first post!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Request Dialog */}
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