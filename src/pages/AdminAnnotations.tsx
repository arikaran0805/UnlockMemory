import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MoreHorizontal, 
  Eye, 
  CheckCircle, 
  XCircle,
  MessageSquarePlus,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface Annotation {
  id: string;
  post_id: string;
  author_id: string;
  selected_text: string;
  comment: string;
  status: string;
  created_at: string;
  bubble_index: number | null;
  editor_type: string | null;
  post?: {
    id: string;
    title: string;
    slug: string;
  };
  author?: {
    full_name: string | null;
    email: string;
  };
}

const AdminAnnotations = () => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchAnnotations();
    }
  }, [statusFilter]);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "moderator"]);

    if (!rolesData || rolesData.length === 0) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    setLoading(false);
    fetchAnnotations();
  };

  const fetchAnnotations = async () => {
    let query = supabase
      .from("post_annotations")
      .select(`
        id,
        post_id,
        author_id,
        selected_text,
        comment,
        status,
        created_at,
        bubble_index,
        editor_type,
        post:posts(id, title, slug),
        author:profiles!post_annotations_author_id_fkey(full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching annotations:", error);
      toast({ title: "Error loading annotations", variant: "destructive" });
      return;
    }

    setAnnotations((data as unknown as Annotation[]) || []);
  };

  const updateAnnotationStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("post_annotations")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating annotation", variant: "destructive" });
      return;
    }

    toast({ title: `Annotation marked as ${newStatus}` });
    fetchAnnotations();
  };

  const deleteAnnotation = async (id: string) => {
    const { error } = await supabase
      .from("post_annotations")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting annotation", variant: "destructive" });
      return;
    }

    toast({ title: "Annotation deleted" });
    fetchAnnotations();
  };

  const filteredAnnotations = annotations.filter((annotation) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      annotation.selected_text.toLowerCase().includes(searchLower) ||
      annotation.comment.toLowerCase().includes(searchLower) ||
      annotation.post?.title?.toLowerCase().includes(searchLower) ||
      annotation.author?.full_name?.toLowerCase().includes(searchLower) ||
      annotation.author?.email?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default" className="bg-amber-500">Open</Badge>;
      case "resolved":
        return <Badge variant="secondary">Resolved</Badge>;
      case "dismissed":
        return <Badge variant="outline">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const openCount = annotations.filter(a => a.status === "open").length;
  const resolvedCount = annotations.filter(a => a.status === "resolved").length;
  const dismissedCount = annotations.filter(a => a.status === "dismissed").length;

  return (
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Annotations
            </h1>
            <p className="text-muted-foreground">
              Manage annotations and feedback across all posts
            </p>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Open</div>
            <div className="text-2xl font-bold text-amber-500">{openCount}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Resolved</div>
            <div className="text-2xl font-bold text-green-500">{resolvedCount}</div>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Dismissed</div>
            <div className="text-2xl font-bold text-muted-foreground">{dismissedCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search annotations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Annotations Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Post</TableHead>
                <TableHead>Selected Text</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnnotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No annotations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAnnotations.map((annotation) => (
                  <TableRow key={annotation.id}>
                    <TableCell className="font-medium">
                      <Button
                        variant="link"
                        className="p-0 h-auto text-left"
                        onClick={() => navigate(`/admin/posts/edit/${annotation.post_id}`)}
                      >
                        {truncateText(annotation.post?.title || "Unknown Post", 30)}
                      </Button>
                      {annotation.bubble_index !== null && (
                        <div className="text-xs text-muted-foreground">
                          Bubble #{annotation.bubble_index + 1}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-sm bg-muted px-1 rounded">
                        {truncateText(annotation.selected_text, 40)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {truncateText(annotation.comment, 50)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {annotation.author?.full_name || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {annotation.author?.email}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(annotation.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(annotation.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/admin/posts/edit/${annotation.post_id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Post
                          </DropdownMenuItem>
                          {annotation.status !== "resolved" && (
                            <DropdownMenuItem
                              onClick={() => updateAnnotationStatus(annotation.id, "resolved")}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </DropdownMenuItem>
                          )}
                          {annotation.status !== "dismissed" && (
                            <DropdownMenuItem
                              onClick={() => updateAnnotationStatus(annotation.id, "dismissed")}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Dismiss
                            </DropdownMenuItem>
                          )}
                          {annotation.status !== "open" && (
                            <DropdownMenuItem
                              onClick={() => updateAnnotationStatus(annotation.id, "open")}
                            >
                              <MessageSquarePlus className="h-4 w-4 mr-2" />
                              Reopen
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteAnnotation(annotation.id)}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
  </div>
);
};

export default AdminAnnotations;
