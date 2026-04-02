import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleScope } from "@/hooks/useRoleScope";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Trash2, MessageSquare, Search, User, UserX, Reply, ThumbsUp, ThumbsDown, 
  ExternalLink, Send, Shield, XCircle, X, Check,
  ChevronDown, ChevronUp, BookOpen
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LightEditor, type LightEditorRef, RichTextRenderer } from "@/components/tiptap";
import { serializeContent } from "@/lib/tiptapMigration";

interface Comment {
  id: string;
  content: string;
  status: string;
  created_at: string;
  post_id: string;
  user_id: string | null;
  is_anonymous: boolean;
  display_name: string | null;
  parent_id: string | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  posts: {
    title: string;
    slug: string;
    category_id: string | null;
    courses: {
      name: string;
      slug: string;
    } | null;
  } | null;
}

interface CommentReaction {
  comment_id: string;
  reaction_type: string;
  count: number;
}

interface CourseGroup {
  courseId: string | null;
  courseName: string;
  courseSlug: string;
  comments: Comment[];
  totalComments: number;
}

const AdminComments = () => {
  const { role, courseIds } = useRoleScope();
  const [comments, setComments] = useState<Comment[]>([]);
  const [reactions, setReactions] = useState<Map<string, { likes: number; dislikes: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
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

    setCurrentUserId(session.user.id);

    const { data: rolesData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "super_moderator", "senior_moderator", "moderator"]);

    if (roleError || !rolesData || rolesData.length === 0) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    const roles = rolesData.map(r => r.role);
    const userIsAdmin = roles.includes("admin");
    const userIsModerator = roles.includes("moderator");

    setIsAdmin(userIsAdmin);
    setIsModerator(userIsModerator);

    fetchComments(session.user.id, userIsAdmin);
    fetchReactions();
  };

  const fetchComments = async (userId: string, userIsAdmin: boolean) => {
    try {
      let query = supabase
        .from("comments")
        .select(`
          *,
          profiles:user_id (full_name, email),
          posts:post_id (title, slug, category_id, courses:category_id (name, slug))
        `)
        .order("created_at", { ascending: false });

      if (!userIsAdmin) {
        // Scope comments to assigned courses via post's category_id
        if (courseIds.length > 0) {
          // Get post IDs in scope first, then filter comments
          const { data: scopedPosts } = await supabase
            .from("posts")
            .select("id")
            .in("category_id", courseIds);
          const scopedPostIds = (scopedPosts || []).map((p) => p.id);
          if (scopedPostIds.length > 0) {
            query = query.in("post_id", scopedPostIds);
          } else {
            setComments([]);
            setLoading(false);
            return;
          }
        } else {
          setComments([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching comments", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from("comment_reactions")
        .select("comment_id, reaction_type");

      if (error) throw error;

      const reactionMap = new Map<string, { likes: number; dislikes: number }>();
      data?.forEach((reaction) => {
        const current = reactionMap.get(reaction.comment_id) || { likes: 0, dislikes: 0 };
        if (reaction.reaction_type === "like") {
          current.likes++;
        } else if (reaction.reaction_type === "dislike") {
          current.dislikes++;
        }
        reactionMap.set(reaction.comment_id, current);
      });
      setReactions(reactionMap);
    } catch (error: any) {
      console.error("Error fetching reactions:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this comment? This will also delete all replies.")) return;
    try {
      await supabase.from("comments").delete().eq("parent_id", id);
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Comment deleted" });
      if (currentUserId) fetchComments(currentUserId, isAdmin);
    } catch (error: any) {
      toast({ title: "Error deleting comment", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedComments.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedComments.size} comment(s)? This will also delete all their replies.`)) return;
    
    try {
      const ids = Array.from(selectedComments);
      for (const id of ids) {
        await supabase.from("comments").delete().eq("parent_id", id);
      }
      const { error } = await supabase.from("comments").delete().in("id", ids);
      if (error) throw error;
      
      toast({ title: `${selectedComments.size} comment(s) deleted` });
      setSelectedComments(new Set());
      if (currentUserId) fetchComments(currentUserId, isAdmin);
    } catch (error: any) {
      toast({ title: "Error deleting comments", description: error.message, variant: "destructive" });
    }
  };

  const toggleSelectComment = (id: string) => {
    setSelectedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ status: "rejected" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Comment rejected" });
      if (currentUserId) fetchComments(currentUserId, isAdmin);
    } catch (error: any) {
      toast({ title: "Error rejecting comment", description: error.message, variant: "destructive" });
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .update({ status: "approved" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Comment approved" });
      if (currentUserId) fetchComments(currentUserId, isAdmin);
    } catch (error: any) {
      toast({ title: "Error approving comment", description: error.message, variant: "destructive" });
    }
  };

  const handleSubmitReply = async (parentComment: Comment) => {
    if (!replyContent.trim() || !currentUserId) return;
    
    setSubmittingReply(true);
    try {
      const { error } = await supabase.from("comments").insert({
        content: replyContent.trim(),
        post_id: parentComment.post_id,
        parent_id: parentComment.id,
        user_id: currentUserId,
        is_anonymous: false,
        display_name: isAdmin ? "Admin" : "Moderator",
        status: "approved"
      });

      if (error) throw error;
      
      toast({ title: "Reply posted successfully" });
      setReplyContent("");
      setReplyingTo(null);
      if (currentUserId) fetchComments(currentUserId, isAdmin);
    } catch (error: any) {
      toast({ title: "Error posting reply", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingReply(false);
    }
  };

  const getReplies = (parentId: string) => {
    return comments.filter(c => c.parent_id === parentId);
  };

  const topLevelComments = comments.filter(c => !c.parent_id);

  const filteredComments = topLevelComments.filter((comment) => {
    const matchesSearch = 
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.posts?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.posts?.courses?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = false;
    if (activeTab === "all") {
      matchesTab = true;
    } else if (activeTab === "anonymous") {
      matchesTab = comment.is_anonymous;
    } else if (activeTab === "replies") {
      matchesTab = getReplies(comment.id).length > 0;
    } else {
      matchesTab = comment.status === activeTab;
    }
    
    return matchesSearch && matchesTab;
  });

  // Group comments by course
  const groupedByCourse = filteredComments.reduce<Map<string, CourseGroup>>((acc, comment) => {
    const courseId = comment.posts?.category_id || "uncategorized";
    const courseName = comment.posts?.courses?.name || "Uncategorized";
    const courseSlug = comment.posts?.courses?.slug || "";
    
    if (!acc.has(courseId)) {
      acc.set(courseId, {
        courseId,
        courseName,
        courseSlug,
        comments: [],
        totalComments: 0
      });
    }
    
    const group = acc.get(courseId)!;
    group.comments.push(comment);
    group.totalComments = group.comments.length + group.comments.reduce((sum, c) => sum + getReplies(c.id).length, 0);
    
    return acc;
  }, new Map());

  const courseGroups = Array.from(groupedByCourse.values()).sort((a, b) => 
    b.totalComments - a.totalComments
  );

  const toggleCourseExpand = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const stats = {
    total: comments.length,
    topLevel: topLevelComments.length,
    replies: comments.filter(c => c.parent_id).length,
    anonymous: comments.filter(c => c.is_anonymous).length,
    rejected: comments.filter(c => c.status === "rejected").length,
    courses: courseGroups.length
  };

  const getAuthorDisplay = (comment: Comment) => {
    if (comment.is_anonymous || !comment.user_id) {
      return {
        name: comment.display_name || "unknown_ant",
        isAnonymous: true,
        email: null
      };
    }
    return {
      name: comment.profiles?.full_name || "Learner",
      isAnonymous: false,
      email: comment.profiles?.email
    };
  };

  const CommentCard = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => {
    const author = getAuthorDisplay(comment);
    const commentReactions = reactions.get(comment.id) || { likes: 0, dislikes: 0 };
    const replies = getReplies(comment.id);

    return (
      <div className={`${isReply ? 'ml-8 border-l-2 border-primary/20 pl-4' : ''}`}>
        <Card className={`border-primary/10 ${isReply ? 'bg-muted/20' : ''} ${!isReply && selectedComments.has(comment.id) ? 'ring-2 ring-primary' : ''}`}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-4">
              {!isReply && (
                <Checkbox
                  checked={selectedComments.has(comment.id)}
                  onCheckedChange={() => toggleSelectComment(comment.id)}
                  className="mt-1"
                />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                    author.isAnonymous 
                      ? 'bg-orange-500/20 text-orange-600' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {author.isAnonymous ? (
                      <UserX className="h-5 w-5" />
                    ) : (
                      author.name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{author.name}</p>
                      {comment.display_name === "Admin" && (
                        <Badge className="text-xs bg-primary text-primary-foreground">
                          <Shield className="h-3 w-3 mr-1" /> Admin
                        </Badge>
                      )}
                      {author.isAnonymous && comment.display_name !== "Admin" && (
                        <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-600">
                          Anonymous
                        </Badge>
                      )}
                      {isReply && (
                        <Badge variant="outline" className="text-xs">
                          <Reply className="h-3 w-3 mr-1" /> Reply
                        </Badge>
                      )}
                    </div>
                    {author.email && (
                      <p className="text-xs text-muted-foreground">{author.email}</p>
                    )}
                  </div>
                </div>

                {comment.posts && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>On:</span>
                    <span className="font-medium text-foreground">{comment.posts.title}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2"
                      onClick={() => window.open(`/course/${comment.posts?.slug}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <RichTextRenderer 
                content={comment.content} 
                className="text-sm"
                emptyPlaceholder=""
              />
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span>{commentReactions.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span>{commentReactions.dislikes}</span>
              </div>
              {!isReply && replies.length > 0 && (
                <div className="flex items-center gap-1">
                  <Reply className="h-4 w-4 text-primary" />
                  <span>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap pt-2 border-t border-border/50">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="border-primary text-primary hover:bg-primary/10"
              >
                <Reply className="mr-1 h-4 w-4" /> Reply
              </Button>
              {comment.status === "rejected" ? (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleApprove(comment.id)}
                  className="border-green-500 text-green-500 hover:bg-green-500/10"
                >
                  <Check className="mr-1 h-4 w-4" /> Approve
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleReject(comment.id)}
                  className="border-orange-500 text-orange-500 hover:bg-orange-500/10"
                >
                  <X className="mr-1 h-4 w-4" /> Reject
                </Button>
              )}
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => handleDelete(comment.id)}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Delete
              </Button>
            </div>

            {replyingTo === comment.id && (
              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Reply as Admin</span>
                </div>
                <LightEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="Write your reply..."
                  characterLimit={2000}
                  minHeight="100px"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment)}
                    disabled={!replyContent.trim() || submittingReply}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Send className="mr-1 h-4 w-4" />
                    {submittingReply ? "Posting..." : "Post Reply"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!isReply && replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map((reply) => (
              <CommentCard key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    );
  };

  const CourseCard = ({ group }: { group: CourseGroup }) => {
    const isExpanded = expandedCourses.has(group.courseId || "uncategorized");
    const courseKey = group.courseId || "uncategorized";

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleCourseExpand(courseKey)}>
        <Card className="border-primary/20 hover:border-primary/40 transition-colors">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{group.courseName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {group.comments.length} {group.comments.length === 1 ? 'comment' : 'comments'}
                      {group.totalComments > group.comments.length && (
                        <span className="ml-1">
                          ({group.totalComments - group.comments.length} {group.totalComments - group.comments.length === 1 ? 'reply' : 'replies'})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {group.courseSlug && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/course/${group.courseSlug}`, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Badge variant="secondary" className="text-lg font-bold px-3 py-1">
                    {group.totalComments}
                  </Badge>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4 border-t border-border/50 pt-4">
                {/* Bulk Actions for this course */}
                {group.comments.length > 0 && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={group.comments.every(c => selectedComments.has(c.id))}
                        onCheckedChange={() => {
                          const allSelected = group.comments.every(c => selectedComments.has(c.id));
                          setSelectedComments(prev => {
                            const newSet = new Set(prev);
                            group.comments.forEach(c => {
                              if (allSelected) {
                                newSet.delete(c.id);
                              } else {
                                newSet.add(c.id);
                              }
                            });
                            return newSet;
                          });
                        }}
                      />
                      <span className="text-sm text-muted-foreground">
                        Select all in this course
                      </span>
                    </div>
                  </div>
                )}
                
                {group.comments.map((comment) => (
                  <CommentCard key={comment.id} comment={comment} />
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Comments Management</h1>
            <p className="text-muted-foreground">Review, moderate, and manage learner comments grouped by course</p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
                <MessageSquare className="h-6 w-6 text-primary/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Courses</p>
                  <p className="text-xl font-bold text-green-500">{stats.courses}</p>
                </div>
                <BookOpen className="h-6 w-6 text-green-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Top-level</p>
                  <p className="text-xl font-bold text-blue-500">{stats.topLevel}</p>
                </div>
                <MessageSquare className="h-6 w-6 text-blue-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Replies</p>
                  <p className="text-xl font-bold text-purple-500">{stats.replies}</p>
                </div>
                <Reply className="h-6 w-6 text-purple-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Anonymous</p>
                  <p className="text-xl font-bold text-orange-500">{stats.anonymous}</p>
                </div>
                <UserX className="h-6 w-6 text-orange-500/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-xl font-bold text-red-500">{stats.rejected}</p>
                </div>
                <XCircle className="h-6 w-6 text-red-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bulk Delete Button */}
        {selectedComments.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <span className="text-sm font-medium">
              {selectedComments.size} comment(s) selected
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search comments by content, author, post title, or course name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="replies">With Replies</TabsTrigger>
            <TabsTrigger value="anonymous">Anonymous</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {courseGroups.length === 0 ? (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  {searchQuery 
                    ? "No comments found matching your search." 
                    : `No ${activeTab === "all" ? "" : activeTab} comments yet.`}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {courseGroups.map((group) => (
                  <CourseCard key={group.courseId || "uncategorized"} group={group} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </>
);
};

export default AdminComments;
