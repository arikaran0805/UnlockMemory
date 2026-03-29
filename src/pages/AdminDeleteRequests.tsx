import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  BookOpen,
  User,
  Calendar,
  MessageSquare
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
  }, [isAdmin, isModerator, roleLoading]);

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from("delete_requests")
        .select("*")
        .order("created_at", { ascending: false });

      // Moderators can only see their own delete requests
      if (isModerator && !isAdmin && userId) {
        query = query.eq("requested_by", userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);

      // Fetch user profiles
      const userIds = new Set<string>();
      data?.forEach(req => {
        userIds.add(req.requested_by);
        if (req.reviewed_by) userIds.add(req.reviewed_by);
      });

      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", Array.from(userIds));

        const userMap = new Map<string, UserProfile>();
        profiles?.forEach(p => userMap.set(p.id, p));
        setUsers(userMap);
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
      
      // Delete the actual content
      const tableName = selectedRequest.content_type === "course" ? "courses" : "posts";
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq("id", selectedRequest.content_id);

      if (deleteError) throw deleteError;

      // Update the request status
      const { error: updateError } = await supabase
        .from("delete_requests")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes || null
        })
        .eq("id", selectedRequest.id);

      if (updateError) throw updateError;

      toast({ title: "Delete request approved", description: `${selectedRequest.content_title} has been deleted` });
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
          review_notes: reviewNotes || null
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

  const getUserName = (userId: string) => {
    const user = users.get(userId);
    return user?.full_name || user?.email?.split("@")[0] || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1"><CheckCircle className="h-3 w-3" />Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getContentIcon = (type: string) => {
    return type === "course" ? <BookOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const processedRequests = requests.filter(r => r.status !== "pending");

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
            <h1 className="text-3xl font-bold text-foreground">Delete Requests</h1>
            <p className="text-muted-foreground">Review and manage content deletion requests from moderators</p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">

        {/* Pending Requests */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Requests ({pendingRequests.length})
          </h2>
          
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending delete requests
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="border-yellow-500/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getContentIcon(request.content_type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{request.content_title}</CardTitle>
                          <p className="text-sm text-muted-foreground capitalize">{request.content_type}</p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Requested by: <span className="text-foreground font-medium">{getUserName(request.requested_by)}</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(request.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                      </div>
                    </div>
                    
                    {request.reason && (
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm text-muted-foreground flex items-start gap-2">
                          <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{request.reason}</span>
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="default" 
                        className="gap-2"
                        onClick={() => setSelectedRequest(request)}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Processed Requests */}
        {processedRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">History ({processedRequests.length})</h2>
            <div className="grid gap-4">
              {processedRequests.map((request) => (
                <Card key={request.id} className="opacity-75">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          {getContentIcon(request.content_type)}
                        </div>
                        <div>
                          <p className="font-medium">{request.content_title}</p>
                          <p className="text-sm text-muted-foreground">
                            Requested by {getUserName(request.requested_by)} • {format(new Date(request.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {request.reviewed_by && (
                          <span className="text-sm text-muted-foreground">
                            Reviewed by {getUserName(request.reviewed_by)}
                          </span>
                        )}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                    {request.review_notes && (
                      <p className="text-sm text-muted-foreground mt-2 pl-12">
                        Note: {request.review_notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Review Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
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
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">{selectedRequest.reason}</p>
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
                onClick={() => setSelectedRequest(null)}
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
    </div>
  </>
);
};

export default AdminDeleteRequests;
