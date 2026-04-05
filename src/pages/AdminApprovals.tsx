import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useRoleScope } from "@/hooks/useRoleScope";

import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle, XCircle, MessageSquare, Clock, BookOpen, 
  GraduationCap, Eye, History
} from "lucide-react";
import { format } from "date-fns";

interface PendingItem {
  id: string;
  title?: string;
  name?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  author_id?: string;
  author?: { full_name: string | null; email: string } | null;
}

interface ApprovalHistoryItem {
  id: string;
  action: string;
  feedback: string | null;
  created_at: string;
  performed_by: string;
  performer?: { full_name: string | null; email: string } | null;
}

const AdminApprovals = () => {
  const [activeTab, setActiveTab] = useState("posts");
  const [pendingPosts, setPendingPosts] = useState<PendingItem[]>([]);
  const [pendingCourses, setPendingCourses] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<string>("");
  const [actionType, setActionType] = useState<"approve" | "reject" | "changes">("approve");
  const [feedback, setFeedback] = useState("");
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { role: userRole, courseIds, loading: scopeLoading } = useRoleScope();
  const isSuperMod = userRole === "super_moderator";
  const isSeniorMod = userRole === "senior_moderator";
  const canApprove = isAdmin || isSuperMod || isSeniorMod;

  useEffect(() => {
    if (roleLoading || scopeLoading) return;
    if (!canApprove) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/admin");
      return;
    }
    fetchAllPending();
  }, [canApprove, roleLoading, scopeLoading]);

  const fetchAllPending = async () => {
    setLoading(true);
    await Promise.all([
      fetchPendingPosts(),
      fetchPendingCourses(),
    ]);
    setLoading(false);
  };

  const fetchAuthorInfo = async (authorId: string | null | undefined): Promise<{ full_name: string | null; email: string } | null> => {
    if (!authorId) return null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", authorId)
        .maybeSingle();
      return data;
    } catch {
      return null;
    }
  };

  const fetchPendingPosts = async () => {
    try {
      let query = supabase
        .from("posts")
        .select("*")
        .eq("status", "pending")
        .order("updated_at", { ascending: false });

      if (!isAdmin && courseIds.length > 0) {
        query = query.in("category_id", courseIds);
      } else if (!isAdmin && courseIds.length === 0) {
        setPendingPosts([]);
        return;
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Fetch author info for each post
      const postsWithAuthors = await Promise.all(
        (data || []).map(async (post) => ({
          ...post,
          author: await fetchAuthorInfo(post.author_id),
        }))
      );
      
      setPendingPosts(postsWithAuthors);
    } catch (error: any) {
      console.error("Error fetching pending posts:", error);
    }
  };

  const fetchPendingCourses = async () => {
    try {
      let query = supabase
        .from("courses")
        .select("*")
        .eq("status", "pending")
        .order("updated_at", { ascending: false });

      if (!isAdmin && courseIds.length > 0) {
        query = query.in("id", courseIds);
      } else if (!isAdmin && courseIds.length === 0) {
        setPendingCourses([]);
        return;
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      const coursesWithAuthors = await Promise.all(
        (data || []).map(async (course) => ({
          ...course,
          author: await fetchAuthorInfo(course.author_id),
        }))
      );
      
      setPendingCourses(coursesWithAuthors);
    } catch (error: any) {
      console.error("Error fetching pending courses:", error);
    }
  };

  const fetchApprovalHistory = async (contentType: string, contentId: string) => {
    try {
      const { data, error } = await supabase
        .from("approval_history")
        .select("*")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const historyWithPerformers = await Promise.all(
        (data || []).map(async (entry) => ({
          ...entry,
          performer: await fetchAuthorInfo(entry.performed_by),
        }))
      );
      
      setApprovalHistory(historyWithPerformers);
    } catch (error: any) {
      console.error("Error fetching approval history:", error);
    }
  };

  const openActionDialog = (item: PendingItem, contentType: string, action: "approve" | "reject" | "changes") => {
    setSelectedItem(item);
    setSelectedContentType(contentType);
    setActionType(action);
    setFeedback("");
    setActionDialogOpen(true);
  };

  const openHistoryDialog = async (item: PendingItem, contentType: string) => {
    setSelectedItem(item);
    setSelectedContentType(contentType);
    await fetchApprovalHistory(contentType, item.id);
    setHistoryDialogOpen(true);
  };

  const handleApprovalAction = async () => {
    if (!selectedItem || !selectedContentType) return;
    
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Determine the new status
      let newStatus = "approved";
      let actionName = "approved";
      if (actionType === "reject") {
        newStatus = "rejected";
        actionName = "rejected";
      } else if (actionType === "changes") {
        newStatus = "changes_requested";
        actionName = "changes_requested";
      } else if (actionType === "approve") {
        // For posts, use 'published' instead of 'approved'
        newStatus = selectedContentType === "post" ? "published" : "approved";
        actionName = "approved";
      }

      // Update the content status
      const tableName = selectedContentType === "post" ? "posts" : 
                        selectedContentType === "course" ? "courses" :
                        selectedContentType === "career" ? "careers" : "tags";
      
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ status: newStatus })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      // Record the action in approval history
      const { error: historyError } = await supabase
        .from("approval_history")
        .insert({
          content_type: selectedContentType,
          content_id: selectedItem.id,
          action: actionName,
          performed_by: session.user.id,
          feedback: feedback || null,
        });

      if (historyError) throw historyError;

      // Send notification to the content author
      if (selectedItem.author_id) {
        const itemName = getItemName(selectedItem);
        let notificationTitle = "";
        let notificationMessage = "";
        
        switch (actionName) {
          case "changes_requested":
            notificationTitle = `Changes requested for "${itemName}"`;
            notificationMessage = feedback || "Please review and make the requested changes.";
            break;
          case "approved":
            notificationTitle = `"${itemName}" has been approved!`;
            notificationMessage = "Your content is now published and visible to learners.";
            break;
          case "rejected":
            notificationTitle = `"${itemName}" was rejected`;
            notificationMessage = feedback || "Your content has been rejected.";
            break;
        }

        await supabase.from("moderator_notifications").insert({
          user_id: selectedItem.author_id,
          type: actionName,
          title: notificationTitle,
          message: notificationMessage,
          content_id: selectedItem.id,
          content_type: selectedContentType,
        });
      }

      toast({
        title: `Content ${actionName}`,
        description: `The ${selectedContentType} has been ${actionName}.`,
      });

      setActionDialogOpen(false);
      fetchAllPending();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getItemName = (item: PendingItem) => item.title || item.name || "Untitled";
  const getAuthorName = (item: PendingItem) => item.author?.full_name || item.author?.email || "Unknown";
  const getPublishedContentPath = (contentType: string) =>
    contentType === "course" ? "/admin/courses" : "/admin/posts";

  const renderContentTable = (items: PendingItem[], contentType: string, icon: React.ReactNode) => (
    <Card>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex justify-center text-foreground/60 [&_svg]:opacity-95 [&_svg]:stroke-[1.75]">
              {icon}
            </div>
            <p className="mt-4 text-base font-medium text-foreground">No pending {contentType}s</p>
            <p className="mt-2 text-sm text-muted-foreground">
              All submissions are reviewed. You're up to date.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground/90">No new submissions from moderators</p>
              <p className="text-xs text-muted-foreground/75">Last checked just now</p>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border/70 bg-background/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={() => navigate(getPublishedContentPath(contentType))}
              >
                View Published Content
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{getItemName(item)}</TableCell>
                  <TableCell className="text-muted-foreground">{getAuthorName(item)}</TableCell>
                  <TableCell>
                    <ContentStatusBadge status={item.status as ContentStatus} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(item.updated_at || item.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openHistoryDialog(item, contentType)}
                        title="View History"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => openActionDialog(item, contentType, "approve")}
                        title="Approve"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => openActionDialog(item, contentType, "changes")}
                        title="Request Changes"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => openActionDialog(item, contentType, "reject")}
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  const getActionTitle = () => {
    switch (actionType) {
      case "approve": return "Approve & Publish";
      case "reject": return "Reject Content";
      case "changes": return "Request Changes";
    }
  };

  const getActionDescription = () => {
    const itemName = selectedItem ? getItemName(selectedItem) : "";
    switch (actionType) {
      case "approve": 
        return `Are you sure you want to approve "${itemName}"? This will make it visible to all learners.`;
      case "reject": 
        return `Are you sure you want to reject "${itemName}"? Please provide a reason.`;
      case "changes": 
        return `Request changes for "${itemName}". Please describe what needs to be updated.`;
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const totalPending = pendingPosts.length + pendingCourses.length;
  const queueStatus =
    totalPending === 0
      ? {
          label: "All Clear",
          className:
            "border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
        }
      : totalPending <= 5
        ? {
            label: "Few Pending",
            className:
              "border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-50",
          }
        : {
            label: "High Priority",
            className:
              "border-red-200/80 bg-red-50 text-red-700 hover:bg-red-50",
          };

  return (
    <>
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Approval Queue</h1>
          <p className="text-muted-foreground">
            Review and approve content submitted by moderators
          </p>
        </div>
        <Badge
          variant="secondary"
          className={`text-lg px-4 py-2 ${queueStatus.className}`}
        >
          <Clock className="h-4 w-4 mr-2" />
          {queueStatus.label}
        </Badge>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="posts"
              className="flex items-center gap-2 transition-colors hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <BookOpen className="h-4 w-4" />
              Posts
              <Badge
                variant="outline"
                className="ml-1 h-5 min-w-5 border-border/70 bg-background/70 px-1.5 text-[11px] font-semibold text-muted-foreground data-[state=active]:text-foreground"
              >
                {pendingPosts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="courses"
              className="flex items-center gap-2 transition-colors hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <GraduationCap className="h-4 w-4" />
              Courses
              <Badge
                variant="outline"
                className="ml-1 h-5 min-w-5 border-border/70 bg-background/70 px-1.5 text-[11px] font-semibold text-muted-foreground data-[state=active]:text-foreground"
              >
                {pendingCourses.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {renderContentTable(pendingPosts, "post", <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />)}
          </TabsContent>
          <TabsContent value="courses" className="mt-6">
            {renderContentTable(pendingCourses, "course", <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto" />)}
          </TabsContent>
        </Tabs>
      </div>
    </div>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
              {actionType === "reject" && <XCircle className="h-5 w-5 text-destructive" />}
              {actionType === "changes" && <MessageSquare className="h-5 w-5 text-orange-600" />}
              {getActionTitle()}
            </DialogTitle>
            <DialogDescription>{getActionDescription()}</DialogDescription>
          </DialogHeader>

          {(actionType === "reject" || actionType === "changes") && (
            <div className="py-4">
              <Textarea
                placeholder={actionType === "reject" ? "Reason for rejection..." : "Describe the changes needed..."}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "reject" ? "destructive" : actionType === "changes" ? "secondary" : "default"}
              onClick={handleApprovalAction}
              disabled={actionLoading || ((actionType === "reject" || actionType === "changes") && !feedback.trim())}
            >
              {actionLoading ? "Processing..." : getActionTitle()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Approval History
            </DialogTitle>
            <DialogDescription>
              History for "{selectedItem ? getItemName(selectedItem) : ""}"
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {approvalHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No history available</p>
            ) : (
              <div className="space-y-4">
                {approvalHistory.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <ContentStatusBadge status={entry.action as ContentStatus} />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      By: {entry.performer?.full_name || entry.performer?.email || "Unknown"}
                    </p>
                    {entry.feedback && (
                      <p className="mt-2 text-sm bg-muted p-2 rounded">{entry.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminApprovals;
