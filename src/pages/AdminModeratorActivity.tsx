import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, GraduationCap, Tags, Clock, CheckCircle, XCircle, 
  MessageSquare, AlertCircle, RefreshCw, History, ExternalLink
} from "lucide-react";
import { format } from "date-fns";

interface MyAction {
  id: string;
  type: "post" | "course" | "tag" | "career";
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  latestFeedback?: {
    action: string;
    feedback: string | null;
    admin_name: string;
    created_at: string;
  };
}

interface AdminReaction {
  id: string;
  content_type: string;
  content_id: string;
  content_title?: string;
  action: string;
  feedback: string | null;
  created_at: string;
  admin_name?: string;
}

interface HistoryItem {
  id: string;
  action: string;
  feedback: string | null;
  created_at: string;
  admin_name: string;
}

const AdminModeratorActivity = () => {
  const navigate = useNavigate();
  const { userId, isModerator, isAdmin, isLoading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [myActions, setMyActions] = useState<MyAction[]>([]);
  const [adminReactions, setAdminReactions] = useState<AdminReaction[]>([]);
  
  // Dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MyAction | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<AdminReaction | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!roleLoading) {
      if (!isModerator && !isAdmin) {
        navigate("/auth");
      } else {
        fetchData();
      }
    }
  }, [roleLoading, isModerator, isAdmin, userId]);

  const fetchData = async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
      await Promise.all([
        fetchMyActions(),
        fetchAdminReactions()
      ]);
    } catch (error) {
      console.error("Error fetching activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyActions = async () => {
    if (!userId) return;

    // Fetch posts created by me
    const { data: posts } = await supabase
      .from("posts")
      .select("id, title, status, created_at, updated_at")
      .or(`author_id.eq.${userId},assigned_to.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(50);

    // Fetch courses created by me
    const { data: courses } = await supabase
      .from("courses")
      .select("id, name, status, created_at, updated_at")
      .or(`author_id.eq.${userId},assigned_to.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(50);

    // Fetch tags created by me
    const { data: tags } = await supabase
      .from("tags")
      .select("id, name, status, created_at")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Collect all content IDs
    const allContentIds = [
      ...(posts || []).map(p => p.id),
      ...(courses || []).map(c => c.id),
      ...(tags || []).map(t => t.id)
    ];

    // Fetch latest approval history for each content
    let feedbackMap = new Map<string, { action: string; feedback: string | null; admin_name: string; created_at: string }>();
    
    if (allContentIds.length > 0) {
      const { data: history } = await supabase
        .from("approval_history")
        .select("content_id, action, feedback, created_at, performed_by")
        .in("content_id", allContentIds)
        .order("created_at", { ascending: false });

      if (history && history.length > 0) {
        // Get admin names
        const adminIds = [...new Set(history.map(h => h.performed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", adminIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || "Admin"]) || []);

        // Get the latest feedback for each content (first occurrence since sorted desc)
        for (const h of history) {
          if (!feedbackMap.has(h.content_id)) {
            feedbackMap.set(h.content_id, {
              action: h.action,
              feedback: h.feedback,
              admin_name: profileMap.get(h.performed_by) || "Admin",
              created_at: h.created_at
            });
          }
        }
      }
    }

    const actions: MyAction[] = [
      ...(posts || []).map(p => ({
        id: p.id,
        type: "post" as const,
        title: p.title,
        status: p.status,
        created_at: p.created_at,
        updated_at: p.updated_at,
        latestFeedback: feedbackMap.get(p.id)
      })),
      ...(courses || []).map(c => ({
        id: c.id,
        type: "course" as const,
        title: c.name,
        status: c.status,
        created_at: c.created_at,
        updated_at: c.updated_at || c.created_at,
        latestFeedback: feedbackMap.get(c.id)
      })),
      ...(tags || []).map(t => ({
        id: t.id,
        type: "tag" as const,
        title: t.name,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.created_at,
        latestFeedback: feedbackMap.get(t.id)
      }))
    ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    setMyActions(actions);
  };

  const fetchAdminReactions = async () => {
    if (!userId) return;

    // Get all my content IDs
    const { data: myPosts } = await supabase
      .from("posts")
      .select("id, title")
      .or(`author_id.eq.${userId},assigned_to.eq.${userId}`);

    const { data: myCourses } = await supabase
      .from("courses")
      .select("id, name")
      .or(`author_id.eq.${userId},assigned_to.eq.${userId}`);

    const { data: myTags } = await supabase
      .from("tags")
      .select("id, name")
      .eq("author_id", userId);

    const contentIds = [
      ...(myPosts || []).map(p => p.id),
      ...(myCourses || []).map(c => c.id),
      ...(myTags || []).map(t => t.id)
    ];

    if (contentIds.length === 0) {
      setAdminReactions([]);
      return;
    }

    // Fetch approval history for my content
    const { data: history } = await supabase
      .from("approval_history")
      .select("id, content_type, content_id, action, feedback, created_at, performed_by")
      .in("content_id", contentIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!history || history.length === 0) {
      setAdminReactions([]);
      return;
    }

    // Get admin names
    const adminIds = [...new Set(history.map(h => h.performed_by))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", adminIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    // Map content titles
    const postMap = new Map(myPosts?.map(p => [p.id, p.title]) || []);
    const courseMap = new Map(myCourses?.map(c => [c.id, c.name]) || []);
    const tagMap = new Map(myTags?.map(t => [t.id, t.name]) || []);

    const reactions: AdminReaction[] = history.map(h => ({
      id: h.id,
      content_type: h.content_type,
      content_id: h.content_id,
      content_title: h.content_type === "post" 
        ? postMap.get(h.content_id) 
        : h.content_type === "course" 
        ? courseMap.get(h.content_id)
        : tagMap.get(h.content_id),
      action: h.action,
      feedback: h.feedback,
      created_at: h.created_at,
      admin_name: profileMap.get(h.performed_by) || "Admin"
    }));

    setAdminReactions(reactions);
  };

  const openHistoryDialog = async (item: MyAction) => {
    setSelectedItem(item);
    setSelectedReaction(null);
    setHistoryDialogOpen(true);
    await fetchHistoryForContent(item.id);
  };

  const openHistoryDialogForReaction = async (reaction: AdminReaction) => {
    setSelectedReaction(reaction);
    setSelectedItem(null);
    setHistoryDialogOpen(true);
    await fetchHistoryForContent(reaction.content_id);
  };

  const fetchHistoryForContent = async (contentId: string) => {
    setHistoryLoading(true);
    
    try {
      const { data: history } = await supabase
        .from("approval_history")
        .select("id, action, feedback, created_at, performed_by")
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });

      if (history && history.length > 0) {
        const adminIds = [...new Set(history.map(h => h.performed_by))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", adminIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || "Admin"]) || []);

        setHistoryItems(history.map(h => ({
          id: h.id,
          action: h.action,
          feedback: h.feedback,
          created_at: h.created_at,
          admin_name: profileMap.get(h.performed_by) || "Admin"
        })));
      } else {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getEditUrl = (item: MyAction | null, reaction: AdminReaction | null) => {
    if (item) {
      switch (item.type) {
        case "post":
          return `/admin/posts/${item.id}`;
        case "course":
          return `/admin/courses/${item.id}`;
        default:
          return null;
      }
    }
    if (reaction) {
      switch (reaction.content_type) {
        case "post":
          return `/admin/posts/${reaction.content_id}`;
        case "course":
          return `/admin/courses/${reaction.content_id}`;
        default:
          return null;
      }
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
      case "approved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Published</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "draft":
        return <Badge className="bg-muted text-muted-foreground">Draft</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "changes_requested":
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="h-4 w-4" />;
      case "course":
        return <GraduationCap className="h-4 w-4" />;
      case "tag":
        return <Tags className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatActionLabel = (action: string) => {
    switch (action) {
      case "approved":
        return "Approved";
      case "rejected":
        return "Rejected";
      case "changes_requested":
        return "Changes Requested";
      default:
        return action;
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Activity</h1>
            <p className="text-muted-foreground">
              Track your content submissions and admin feedback
            </p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
          <Tabs defaultValue="actions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="actions" className="gap-2">
              <FileText className="h-4 w-4" />
              My Submissions ({myActions.length})
            </TabsTrigger>
            <TabsTrigger value="reactions" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Admin Feedback ({adminReactions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actions">
            <Card>
              <CardHeader>
                <CardTitle>My Content Submissions</CardTitle>
                <CardDescription>
                  All posts, courses, and tags you've created or been assigned to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {myActions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No content created yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myActions.map((action) => (
                        <div
                          key={`${action.type}-${action.id}`}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => openHistoryDialog(action)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-muted">
                                {getTypeIcon(action.type)}
                              </div>
                              <div>
                                <p className="font-medium">{action.title}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="capitalize">{action.type}</span>
                                  <span>•</span>
                                  <Clock className="h-3 w-3" />
                                  <span>{format(new Date(action.updated_at), "MMM d, yyyy")}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(action.status)}
                              <History className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                          
                          {/* Admin feedback box - show when there's been any admin action */}
                          {action.latestFeedback && (
                            <div className="mt-3 ml-12 p-3 bg-muted/60 border-l-4 border-primary/50 rounded-r-md">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-medium text-primary">
                                  Admin Feedback from {action.latestFeedback.admin_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  • {format(new Date(action.latestFeedback.created_at), "MMM d, yyyy")}
                                </span>
                              </div>
                              {action.latestFeedback.feedback ? (
                                <p className="text-sm text-foreground/80 italic">
                                  "{action.latestFeedback.feedback}"
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground/60 italic">
                                  No feedback provided
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reactions">
            <Card>
              <CardHeader>
                <CardTitle>Admin Feedback</CardTitle>
                <CardDescription>
                  Review and approval actions taken by admins on your content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {adminReactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No admin feedback yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adminReactions.map((reaction) => (
                        <div
                          key={reaction.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => openHistoryDialogForReaction(reaction)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {getActionIcon(reaction.action)}
                              <div>
                                <p className="font-medium">
                                  {reaction.content_title || "Untitled"}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <span className="capitalize">{reaction.content_type}</span>
                                  <span>•</span>
                                  <span>{reaction.admin_name}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant="outline"
                                className={
                                  reaction.action === "approved"
                                    ? "bg-green-500/10 text-green-500 border-green-500/30"
                                    : reaction.action === "rejected"
                                    ? "bg-red-500/10 text-red-500 border-red-500/30"
                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                                }
                              >
                                {formatActionLabel(reaction.action)}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(reaction.created_at), "MMM d, yyyy h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 p-3 bg-muted/50 rounded-md flex items-center justify-between">
                            <div className="flex-1">
                              {reaction.feedback ? (
                                <p className="text-sm text-muted-foreground italic">
                                  "{reaction.feedback}"
                                </p>
                              ) : (
                                <p className="text-sm text-muted-foreground/60 italic">
                                  No feedback provided
                                </p>
                              )}
                            </div>
                            <History className="h-4 w-4 text-muted-foreground ml-2 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* History Dialog */}
        <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedItem && getTypeIcon(selectedItem.type)}
                {selectedReaction && getTypeIcon(selectedReaction.content_type)}
                {selectedItem?.title || selectedReaction?.content_title || "Content Details"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <span className="capitalize">{selectedItem?.type || selectedReaction?.content_type}</span>
                {selectedItem && (
                  <>
                    <span>•</span>
                    {getStatusBadge(selectedItem.status)}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Action buttons */}
              {(selectedItem || selectedReaction) && getEditUrl(selectedItem, selectedReaction) && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = getEditUrl(selectedItem, selectedReaction);
                      if (url) navigate(url);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Edit Content
                  </Button>
                </div>
              )}

              {/* History Timeline */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Admin Feedback History
                </h4>
                
                <ScrollArea className="h-[300px]">
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : historyItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">No admin feedback yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Feedback will appear here once an admin reviews this content
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {historyItems.map((item, index) => (
                        <div
                          key={item.id}
                          className={`relative pl-6 pb-4 ${
                            index !== historyItems.length - 1 ? "border-l-2 border-muted" : ""
                          }`}
                        >
                          {/* Timeline dot */}
                          <div className="absolute left-0 top-0 -translate-x-1/2 p-1 bg-background rounded-full border-2 border-muted">
                            {getActionIcon(item.action)}
                          </div>
                          
                          <div className="ml-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={
                                  item.action === "approved"
                                    ? "bg-green-500/10 text-green-500 border-green-500/30"
                                    : item.action === "rejected"
                                    ? "bg-red-500/10 text-red-500 border-red-500/30"
                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
                                }
                              >
                                {formatActionLabel(item.action)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                by {item.admin_name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            {item.feedback ? (
                              <div className="p-3 bg-muted/50 rounded-md">
                                <p className="text-sm italic">"{item.feedback}"</p>
                              </div>
                            ) : (
                              <div className="p-3 bg-muted/30 rounded-md">
                                <p className="text-sm text-muted-foreground/60 italic">
                                  No feedback provided
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  </>
  );
};

export default AdminModeratorActivity;
