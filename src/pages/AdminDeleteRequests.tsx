import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  BookOpen,
  Eye,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

interface DeleteRequest {
  id: string;
  content_type: string;
  content_id: string;
  content_title: string;
  requested_by: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

const AdminDeleteRequests = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, isLoading: roleLoading, userId } = useUserRole();
  const [activeTab, setActiveTab] = useState("posts");
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DeleteRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin && !isModerator) {
      navigate("/admin");
      return;
    }
    if (!roleLoading && (isAdmin || isModerator)) {
      fetchRequests();
    }
  }, [isAdmin, isModerator, roleLoading, navigate]);

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from("delete_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      // Moderators can only see their own delete requests
      if (isModerator && !isAdmin && userId) {
        query = query.eq("requested_by", userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);

      const userIds = new Set<string>();
      data?.forEach((req) => {
        userIds.add(req.requested_by);
        if (req.reviewed_by) userIds.add(req.reviewed_by);
      });

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));

        const userMap = new Map<string, UserProfile>();
        profiles?.forEach((p) => userMap.set(p.id, p));
        setUsers(userMap);
      } else {
        setUsers(new Map());
      }
    } catch (error: any) {
      toast({ title: "Error fetching requests", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const tableName = selectedRequest.content_type === "course" ? "courses" : "posts";
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq("id", selectedRequest.content_id);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from("delete_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      toast({
        title: "Delete request approved",
        description: `${selectedRequest.content_title} has been deleted`,
      });
      setSelectedRequest(null);
      setReviewNotes("");
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Error approving request", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("delete_requests")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null,
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({ title: "Delete request rejected" });
      setSelectedRequest(null);
      setReviewNotes("");
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Error rejecting request", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const getUserName = (requesterId: string) => {
    const user = users.get(requesterId);
    return user?.full_name || user?.email || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-50">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="border-red-200/80 bg-red-50 text-red-700 hover:bg-red-50">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPublishedContentPath = (contentType: string) =>
    contentType === "course" ? "/admin/courses" : "/admin/posts";

  const renderRequestsTable = (items: DeleteRequest[], contentType: "post" | "course", icon: React.ReactNode) => (
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
              <p className="text-xs text-muted-foreground/90">No new delete requests from moderators</p>
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
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.content_title}</TableCell>
                  <TableCell className="text-muted-foreground">{getUserName(request.requested_by)}</TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(request.reviewed_at || request.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewNotes(request.review_notes || "");
                        }}
                        title="Review"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewNotes(request.review_notes || "");
                        }}
                        title="Approve & Delete"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewNotes(request.review_notes || "");
                        }}
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

  const pendingPosts = requests.filter((request) => request.status === "pending" && request.content_type === "post");
  const pendingCourses = requests.filter((request) => request.status === "pending" && request.content_type === "course");
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
            <h1 className="text-3xl font-bold text-foreground">Delete Requests</h1>
            <p className="text-muted-foreground">
              Review and manage content deletion requests from moderators
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
                  className="ml-1 h-5 min-w-5 border-border/70 bg-background/70 px-1.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {pendingPosts.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="courses"
                className="flex items-center gap-2 transition-colors hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <BookOpen className="h-4 w-4" />
                Courses
                <Badge
                  variant="outline"
                  className="ml-1 h-5 min-w-5 border-border/70 bg-background/70 px-1.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {pendingCourses.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="mt-6">
              {renderRequestsTable(
                pendingPosts,
                "post",
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />,
              )}
            </TabsContent>
            <TabsContent value="courses" className="mt-6">
              {renderRequestsTable(
                pendingCourses,
                "course",
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto" />,
              )}
            </TabsContent>
          </Tabs>
        </div>

        <Dialog
          open={!!selectedRequest}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedRequest(null);
              setReviewNotes("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Delete Request</DialogTitle>
              <DialogDescription>
                {selectedRequest?.content_type === "course" ? "Course" : "Post"}: {selectedRequest?.content_title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedRequest?.reason && (
                <div>
                  <p className="text-sm font-medium mb-1">Reason for deletion:</p>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {selectedRequest.reason}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Review notes (optional)</label>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setReviewNotes("");
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={isProcessing}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Approve & Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AdminDeleteRequests;
