import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  CheckCircle,
  Clock,
  Eye,
  Search,
  ShieldCheck,
  ShieldX,
  XCircle,
  Calendar,
  GraduationCap,
  User,
  FileText,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { useCertificateApprovals, CertificateWithDetails, CertificateStatus } from "@/hooks/useCertificateApprovals";
import { useDebounce } from "@/hooks/useDebounce";

const ModeratorCertificates = () => {
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | "all">("all");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const [selectedCertificate, setSelectedCertificate] = useState<CertificateWithDetails | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    certificates,
    stats,
    courses,
    isLoading,
    approveCertificate,
    rejectCertificate,
  } = useCertificateApprovals({
    statusFilter,
    courseFilter: courseFilter || undefined,
    searchQuery: debouncedSearch || undefined,
  });

  const handleReview = (certificate: CertificateWithDetails) => {
    setSelectedCertificate(certificate);
    setRejectionReason("");
    setIsDrawerOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedCertificate) return;
    setIsProcessing(true);
    const success = await approveCertificate(selectedCertificate.id);
    setIsProcessing(false);
    if (success) {
      setIsDrawerOpen(false);
      setSelectedCertificate(null);
    }
  };

  const handleReject = async () => {
    if (!selectedCertificate) return;
    setIsProcessing(true);
    const success = await rejectCertificate(selectedCertificate.id, rejectionReason);
    setIsProcessing(false);
    if (success) {
      setIsDrawerOpen(false);
      setSelectedCertificate(null);
      setRejectionReason("");
    }
  };

  const getStatusBadge = (status: CertificateStatus) => {
    const styles: Record<CertificateStatus, { className: string; icon: React.ReactNode; label: string }> = {
      pending: {
        className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0",
        icon: <Clock className="h-3 w-3 mr-1" />,
        label: "Pending",
      },
      verified: {
        className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0",
        icon: <ShieldCheck className="h-3 w-3 mr-1" />,
        label: "Verified",
      },
      revoked: {
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0",
        icon: <XCircle className="h-3 w-3 mr-1" />,
        label: "Rejected",
      },
    };

    const style = styles[status];
    return (
      <Badge className={style.className}>
        {style.icon}
        {style.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Certificate Approvals</h1>
          <p className="text-muted-foreground">Review and approve course completion certificates</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background border-amber-100 dark:border-amber-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Pending
              <Clock className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Approved
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.verified}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-background border-red-100 dark:border-red-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
              Rejected
              <XCircle className="h-4 w-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.revoked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by learner name or certificate ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as CertificateStatus | "all")}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Approved</SelectItem>
                <SelectItem value="revoked">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Certificates Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-center">Lessons</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx}>
                      <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : certificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center text-muted-foreground">
                        <Award className="h-12 w-12 mb-3 opacity-50" />
                        <p className="font-medium">No certificates found</p>
                        <p className="text-sm">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cert.learner_name}</p>
                          <p className="text-sm text-muted-foreground">{cert.learner_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{cert.course_name}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {cert.lessons_completed} / {cert.total_lessons}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(cert.issued_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(cert.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReview(cert)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Review Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certificate Review
            </DrawerTitle>
            <DrawerDescription>
              Review certificate details and approve or reject
            </DrawerDescription>
          </DrawerHeader>

          {selectedCertificate && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Certificate Preview */}
                <div className="space-y-4">
                  <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6">
                    <div className="text-center space-y-4">
                      <Award className="h-16 w-16 mx-auto text-amber-600" />
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Certificate of Completion</p>
                        <h3 className="text-xl font-bold mt-2">{selectedCertificate.course_name}</h3>
                      </div>
                      <div className="pt-4 border-t border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-muted-foreground">Awarded to</p>
                        <p className="text-lg font-semibold">{selectedCertificate.learner_name}</p>
                      </div>
                      <div className="pt-4">
                        <p className="text-xs text-muted-foreground">
                          Completed on {format(new Date(selectedCertificate.issued_at), "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Details */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Learner</p>
                        <p className="font-medium">{selectedCertificate.learner_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedCertificate.learner_email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Lessons Completed</p>
                        <p className="font-medium">
                          {selectedCertificate.lessons_completed} / {selectedCertificate.total_lessons}
                          {selectedCertificate.total_lessons > 0 && (
                            <span className="text-muted-foreground ml-2">
                              ({Math.round((selectedCertificate.lessons_completed / selectedCertificate.total_lessons) * 100)}%)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Certificate ID</p>
                        <p className="font-mono text-sm">{selectedCertificate.certificate_id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Generated Date</p>
                        <p className="font-medium">
                          {format(new Date(selectedCertificate.created_at), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        {getStatusBadge(selectedCertificate.status)}
                      </div>
                    </div>
                  </div>

                  {/* Rejection Reason (only for pending) */}
                  {selectedCertificate.status === "pending" && (
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium">
                        Rejection Reason <span className="text-muted-foreground">(required for rejection)</span>
                      </label>
                      <Textarea
                        placeholder="Provide a reason for rejecting this certificate..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DrawerFooter className="border-t">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>

              {selectedCertificate?.status === "pending" && (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    onClick={handleReject}
                    disabled={isProcessing || !rejectionReason.trim()}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldX className="h-4 w-4 mr-2" />
                    )}
                    Reject Certificate
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleApprove}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    Approve Certificate
                  </Button>
                </>
              )}
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default ModeratorCertificates;
