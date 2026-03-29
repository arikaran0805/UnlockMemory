import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Flag, Edit, AlertCircle, CheckCircle, XCircle, 
  Clock, Eye, FileText, GraduationCap, MessageSquare, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ContentReport {
  id: string;
  content_type: string;
  content_id: string;
  report_type: string;
  reason: string | null;
  description: string;
  status: string;
  reporter_id: string | null;
  reporter_email: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  content_title?: string;
  reporter_name?: string;
}

const AdminReports = () => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("reviewed");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!roleLoading) {
      if (!isAdmin && !isModerator) {
        navigate("/auth");
      } else {
        fetchReports();
      }
    }
  }, [roleLoading, isAdmin, isModerator]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with content titles and reporter names
      const enrichedReports = await Promise.all(
        (data || []).map(async (report) => {
          let contentTitle = "Unknown";
          
          if (report.content_type === "post") {
            const { data: post } = await supabase
              .from("posts")
              .select("title")
              .eq("id", report.content_id)
              .maybeSingle();
            contentTitle = post?.title || "Deleted Post";
          } else if (report.content_type === "course") {
            const { data: course } = await supabase
              .from("courses")
              .select("name")
              .eq("id", report.content_id)
              .maybeSingle();
            contentTitle = course?.name || "Deleted Course";
          }

          let reporterName = report.reporter_email || "Anonymous";
          if (report.reporter_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", report.reporter_id)
              .maybeSingle();
            reporterName = profile?.full_name || profile?.email || "Unknown User";
          }

          return {
            ...report,
            content_title: contentTitle,
            reporter_name: reporterName,
          };
        })
      );

      setReports(enrichedReports);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (report: ContentReport) => {
    setSelectedReport(report);
    setReviewNotes(report.review_notes || "");
    setNewStatus(report.status === "pending" ? "reviewed" : report.status);
    setReviewDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;
    
    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from("content_reports")
        .update({
          status: newStatus,
          review_notes: reviewNotes.trim() || null,
          reviewed_by: session?.user?.id,
        })
        .eq("id", selectedReport.id);

      if (error) throw error;

      toast({
        title: "Report updated",
        description: `Status changed to ${newStatus}`,
      });

      setReviewDialogOpen(false);
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update report",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Pending</Badge>;
      case "reviewed":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">Reviewed</Badge>;
      case "resolved":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Resolved</Badge>;
      case "dismissed":
        return <Badge className="bg-muted text-muted-foreground">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "post":
        return <FileText className="h-4 w-4" />;
      case "course":
        return <GraduationCap className="h-4 w-4" />;
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const pendingReports = reports.filter(r => r.status === "pending");
  const reviewedReports = reports.filter(r => r.status !== "pending");
  const reportsList = reports.filter(r => r.report_type === "report");
  const suggestionsList = reports.filter(r => r.report_type === "suggestion");

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

  const renderReportCard = (report: ContentReport) => (
    <div
      key={report.id}
      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${report.report_type === "report" ? "bg-red-500/10" : "bg-primary/10"}`}>
            {report.report_type === "report" ? (
              <Flag className="h-4 w-4 text-red-500" />
            ) : (
              <Edit className="h-4 w-4 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium">{report.content_title}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getTypeIcon(report.content_type)}
              <span className="capitalize">{report.content_type}</span>
              <span>•</span>
              <span>{report.reporter_name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(report.status)}
          <Button variant="outline" size="sm" onClick={() => handleReview(report)}>
            <Eye className="h-4 w-4 mr-1" />
            Review
          </Button>
        </div>
      </div>
      
      {report.reason && (
        <Badge variant="outline" className="mb-2">
          {report.reason}
        </Badge>
      )}
      
      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
        {report.description}
      </p>
      
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{format(new Date(report.created_at), "MMM d, yyyy h:mm a")}</span>
      </div>
    </div>
  );

  return (
    <>
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reports & Suggestions</h1>
            <p className="text-muted-foreground">
              Review user-submitted reports and content suggestions
            </p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingReports.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <Flag className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reportsList.length}</p>
                  <p className="text-sm text-muted-foreground">Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Edit className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{suggestionsList.length}</p>
                  <p className="text-sm text-muted-foreground">Suggestions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{reports.filter(r => r.status === "resolved").length}</p>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({reports.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingReports.length})</TabsTrigger>
            <TabsTrigger value="reports">Reports ({reportsList.length})</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions ({suggestionsList.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Submissions</CardTitle>
                <CardDescription>All reports and suggestions from users</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No reports or suggestions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reports.map(renderReportCard)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Review</CardTitle>
                <CardDescription>Items awaiting admin review</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {pendingReports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500/50 mb-4" />
                      <p className="text-muted-foreground">All caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingReports.map(renderReportCard)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Content Reports</CardTitle>
                <CardDescription>Issues reported by users</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {reportsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No reports yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reportsList.map(renderReportCard)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle>Content Suggestions</CardTitle>
                <CardDescription>Change suggestions from users</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {suggestionsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No suggestions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {suggestionsList.map(renderReportCard)}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport?.report_type === "report" ? (
                <>
                  <Flag className="h-5 w-5 text-red-500" />
                  Review Report
                </>
              ) : (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  Review Suggestion
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedReport?.content_title}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 pt-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">From:</span>
                  <span>{selectedReport.reporter_name}</span>
                </div>
                {selectedReport.reason && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Reason:</span>
                    <Badge variant="outline">{selectedReport.reason}</Badge>
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium">Details:</span>
                  <p className="mt-1 text-muted-foreground">{selectedReport.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="dismissed">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Add notes about your review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateStatus} disabled={updating}>
                  {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminReports;
