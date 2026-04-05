import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useRoleScope } from "@/hooks/useRoleScope";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RichTextRenderer } from "@/components/tiptap";
import {
  Flag,
  Edit,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  MessageSquare,
  Loader2,
  AlertCircle,
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
  const { courseIds } = useRoleScope();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reports");
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("reviewed");
  const [updating, setUpdating] = useState(false);
  const [reviewFlowState, setReviewFlowState] = useState<"base" | "confirm" | "success">("base");
  const [reviewError, setReviewError] = useState<string>("");

  useEffect(() => {
    if (!roleLoading) {
      if (!isAdmin && !isModerator) {
        navigate("/auth");
      } else {
        fetchReports();
      }
    }
  }, [roleLoading, isAdmin, isModerator, navigate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isAdmin && courseIds.length > 0) {
        query = query.in("content_id", courseIds);
      }

      const { data, error } = await query;
      if (error) throw error;

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
        }),
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
    setReviewFlowState("base");
    setReviewError("");
    setReviewDialogOpen(true);
  };

  useEffect(() => {
    if (!reviewDialogOpen || reviewFlowState !== "success") return;

    const timeout = window.setTimeout(() => {
      setReviewDialogOpen(false);
      setReviewFlowState("base");
      setReviewError("");
      setSelectedReport(null);
      setReviewNotes("");
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [reviewDialogOpen, reviewFlowState]);

  const handleUpdateStatus = async () => {
    if (!selectedReport) return;

    setUpdating(true);
    setReviewError("");
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

      setReviewFlowState("success");
      await fetchReports();
    } catch (error: any) {
      setReviewFlowState("base");
      setReviewError("Something went wrong. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-50">
            Pending
          </Badge>
        );
      case "reviewed":
        return (
          <Badge className="border-blue-200/80 bg-blue-50 text-blue-700 hover:bg-blue-50">
            Reviewed
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            Resolved
          </Badge>
        );
      case "dismissed":
        return (
          <Badge className="border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-50">
            Dismissed
          </Badge>
        );
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

  const getContentPath = (report: ContentReport) =>
    report.content_type === "course"
      ? `/admin/courses/${report.content_id}`
      : `/admin/posts/edit/${report.content_id}`;

  const getDecisionLabel = (status: string) => {
    switch (status) {
      case "resolved":
        return "Approve Content";
      case "dismissed":
        return "Reject Content";
      case "reviewed":
      default:
        return "Request Changes";
    }
  };

  const getConfirmationTitle = (status: string) => {
    switch (status) {
      case "resolved":
        return "Confirm Approval?";
      case "dismissed":
        return "Confirm Rejection?";
      case "reviewed":
      default:
        return "Confirm Request for Changes?";
    }
  };

  const getConfirmationText = (status: string) => {
    switch (status) {
      case "resolved":
        return "This content will be published or marked as approved.";
      case "dismissed":
        return "This content will be rejected and may be removed.";
      case "reviewed":
      default:
        return "Moderator will be asked to update the content.";
    }
  };

  const getLoadingLabel = (status: string) => {
    switch (status) {
      case "resolved":
        return "Approving...";
      case "dismissed":
        return "Rejecting...";
      case "reviewed":
      default:
        return "Submitting...";
    }
  };

  const getSuccessState = (status: string) => {
    switch (status) {
      case "resolved":
        return {
          title: "Content Approved",
          description: "The report has been resolved and the content is marked approved.",
          icon: <CheckCircle className="h-10 w-10 text-emerald-600" />,
        };
      case "dismissed":
        return {
          title: "Content Rejected",
          description: "The report has been rejected and moderators have been updated.",
          icon: <AlertCircle className="h-10 w-10 text-red-600" />,
        };
      case "reviewed":
      default:
        return {
          title: "Changes Requested",
          description: "The moderator has been asked to review and update the content.",
          icon: <MessageSquare className="h-10 w-10 text-amber-600" />,
        };
    }
  };

  const decisionNeedsNotes = newStatus === "dismissed" || newStatus === "reviewed";

  const handlePrimaryActionClick = () => {
    setReviewError("");

    if (decisionNeedsNotes && !reviewNotes.trim()) {
      setReviewError("Please add review notes before proceeding");
      return;
    }

    setReviewFlowState("confirm");
  };

  const reasonBadgeClassName = (reason: string | null) => {
    if (reason?.toLowerCase() === "inappropriate") {
      return "border-red-200/80 bg-red-50 text-red-700 hover:bg-red-50";
    }

    return "border-border/70 bg-background/70 text-foreground";
  };

  const reportsList = reports.filter((r) => r.report_type === "report");
  const suggestionsList = reports.filter((r) => r.report_type === "suggestion");
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const queueStatus =
    pendingCount === 0
      ? {
          label: "All Clear",
          className:
            "border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
        }
      : pendingCount <= 5
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

  const renderReportsTable = (
    items: ContentReport[],
    tabType: "report" | "suggestion",
    icon: React.ReactNode,
  ) => (
    <Card>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex justify-center text-foreground/60 [&_svg]:opacity-95 [&_svg]:stroke-[1.75]">
              {icon}
            </div>
            <p className="mt-4 text-base font-medium text-foreground">
              No {tabType === "report" ? "reports" : "suggestions"} yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              All submissions are reviewed. You're up to date.
            </p>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground/90">
                No new {tabType === "report" ? "reports" : "suggestions"} from users
              </p>
              <p className="text-xs text-muted-foreground/75">Last checked just now</p>
            </div>
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-border/70 bg-background/80 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={() => navigate("/admin/posts")}
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
                <TableHead>Type</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    <div>
                      <p>{report.content_title}</p>
                      {report.reason && (
                        <p className="mt-1 text-xs text-muted-foreground">{report.reason}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2 capitalize">
                      {getTypeIcon(report.content_type)}
                      <span>{report.content_type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{report.reporter_name}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(report.updated_at || report.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleReview(report)}
                        title="Review"
                      >
                        <Eye className="h-4 w-4" />
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
                value="reports"
                className="flex items-center gap-2 transition-colors hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Flag className="h-4 w-4" />
                Reports
                <Badge
                  variant="outline"
                  className="ml-1 h-5 min-w-5 border-border/70 bg-background/70 px-1.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {reportsList.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="flex items-center gap-2 transition-colors hover:bg-background/60 data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Edit className="h-4 w-4" />
                Suggestions
                <Badge
                  variant="outline"
                  className="ml-1 h-5 min-w-5 border-border/70 bg-background/70 px-1.5 text-[11px] font-semibold text-muted-foreground"
                >
                  {suggestionsList.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="mt-6">
              {renderReportsTable(
                reportsList,
                "report",
                <Flag className="h-12 w-12 text-muted-foreground mx-auto" />,
              )}
            </TabsContent>
            <TabsContent value="suggestions" className="mt-6">
              {renderReportsTable(
                suggestionsList,
                "suggestion",
                <Edit className="h-12 w-12 text-muted-foreground mx-auto" />,
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] shadow-2xl shadow-black/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedReport?.report_type === "report" ? (
                <Flag className="h-5 w-5 stroke-[1.9] text-red-500" />
              ) : (
                <Edit className="h-5 w-5 stroke-[1.9] text-primary" />
              )}
              Moderation Review
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/90">
              {selectedReport?.content_title}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 pt-4 transition-opacity duration-200">
              {reviewFlowState === "success" ? (
                <div className="space-y-4 py-8 text-center">
                  <div className="flex justify-center">{getSuccessState(newStatus).icon}</div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {getSuccessState(newStatus).title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getSuccessState(newStatus).description}
                    </p>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => {
                        setReviewDialogOpen(false);
                        setReviewFlowState("base");
                        setReviewError("");
                        setSelectedReport(null);
                        setReviewNotes("");
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
                <>
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="border-b border-border/50 pb-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Content Preview
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedReport.content_title || "Untitled content"}
                    </p>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-medium text-primary transition-colors hover:text-primary/80"
                      onClick={() => navigate(getContentPath(selectedReport))}
                    >
                      {"View Full Content \u2192"}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <span className="font-medium">From:</span>
                  <div className="space-y-1">
                    <p>{selectedReport.reporter_name}</p>
                    {selectedReport.reporter_email ? (
                      <p className="text-xs text-muted-foreground">{selectedReport.reporter_email}</p>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground/85">Reported recently</p>
                {selectedReport.reason && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Reason:</span>
                    <Badge className={reasonBadgeClassName(selectedReport.reason)}>
                      {selectedReport.reason}
                    </Badge>
                  </div>
                )}
                <div className="border-t border-border/50 pt-3 text-sm">
                  <span className="font-medium">Details:</span>
                  <div className="mt-1 rounded-md border border-border/40 bg-background/40 p-3">
                    <RichTextRenderer
                      content={selectedReport.description}
                      emptyPlaceholder="No details provided"
                      className="text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Decision</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger disabled={updating}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved">Approve</SelectItem>
                    <SelectItem value="dismissed">Reject</SelectItem>
                    <SelectItem value="reviewed">Needs Changes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 border-t border-border/50 pt-4">
                <label className="text-sm font-medium">Review Notes</label>
                <Textarea
                  placeholder="Explain your decision (visible to moderators)"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  disabled={updating}
                  className="focus-visible:ring-primary/30 focus-visible:border-primary"
                />
              </div>

              {reviewError && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {reviewError}
                </div>
              )}

              {reviewFlowState === "confirm" && (
                <div className="space-y-1 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="text-sm font-semibold text-foreground">{getConfirmationTitle(newStatus)}</p>
                  <p className="text-sm text-muted-foreground">{getConfirmationText(newStatus)}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                {reviewFlowState === "confirm" ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setReviewFlowState("base")}
                      disabled={updating}
                    >
                      Back
                    </Button>
                    <Button onClick={handleUpdateStatus} disabled={updating}>
                      {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {updating ? getLoadingLabel(newStatus) : "Confirm"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setReviewDialogOpen(false)}
                      disabled={updating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handlePrimaryActionClick} disabled={updating}>
                      {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {updating ? getLoadingLabel(newStatus) : getDecisionLabel(newStatus)}
                    </Button>
                  </>
                )}
              </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminReports;
