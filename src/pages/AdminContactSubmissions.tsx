import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, RefreshCw, Eye } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  created_at: string;
}

const TOPIC_LABELS: Record<string, string> = {
  course_question: "Course Question",
  technical_issue: "Technical Issue",
  billing: "Billing",
  partnership: "Partnership",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  unread: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  read: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

const AdminContactSubmissions = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate("/admin/dashboard");
  }, [roleLoading, isAdmin, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data, error } = await query;
    if (error) {
      toast({ title: "Failed to load submissions", variant: "destructive" });
    } else {
      setSubmissions((data as ContactSubmission[]) || []);
    }
    setLoading(false);
  }, [statusFilter, toast]);

  useEffect(() => {
    if (!roleLoading && isAdmin) load();
  }, [load, roleLoading, isAdmin]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase
      .from("contact_submissions")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      setSubmissions(prev =>
        prev.map(s => (s.id === id ? { ...s, status } : s))
      );
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
    }
    setUpdating(null);
  };

  const openDetail = async (submission: ContactSubmission) => {
    setSelected(submission);
    if (submission.status === "unread") {
      await updateStatus(submission.id, "read");
    }
  };

  const unreadCount = submissions.filter(s => s.status === "unread").length;

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contact Submissions</h1>
          <p className="text-muted-foreground">Messages submitted via the Contact page</p>
        </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          {unreadCount > 0 && (
            <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 border text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[180px]">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[150px]">Topic</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[140px]">Received</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading…
                </TableCell>
              </TableRow>
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  No submissions {statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}
                </TableCell>
              </TableRow>
            ) : (
              submissions.map(sub => (
                <TableRow
                  key={sub.id}
                  className={`cursor-pointer hover:bg-muted/30 transition-colors ${sub.status === "unread" ? "font-medium" : ""}`}
                  onClick={() => openDetail(sub)}
                >
                  <TableCell>{sub.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{sub.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-normal">
                      {TOPIC_LABELS[sub.topic] ?? sub.topic}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs border ${STATUS_COLORS[sub.status] ?? ""}`}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(sub.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={e => { e.stopPropagation(); openDetail(sub); }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>{selected?.name}</span>
              {selected && (
                <Badge className={`text-xs border ${STATUS_COLORS[selected.status] ?? ""}`}>
                  {selected.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                  <a href={`mailto:${selected.email}`} className="text-primary hover:underline">
                    {selected.email}
                  </a>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Topic</p>
                  <p>{TOPIC_LABELS[selected.topic] ?? selected.topic}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Received</p>
                  <p>{format(new Date(selected.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Message</p>
                <p className="text-foreground leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-lg p-4">
                  {selected.message}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-muted-foreground mr-1">Mark as:</span>
                {["unread", "read", "resolved"].map(s => (
                  <Button
                    key={s}
                    variant={selected.status === s ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs capitalize"
                    disabled={updating === selected.id}
                    onClick={() => updateStatus(selected.id, s)}
                  >
                    {updating === selected.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : s}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs ml-auto"
                  asChild
                >
                  <a href={`mailto:${selected.email}`}>Reply via email</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContactSubmissions;
