import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Eye, Info, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PageStats {
  [pageId: string]: {
    views: number;
  };
}

const AdminPages = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [pageStats, setPageStats] = useState<PageStats>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [formData, setFormData] = useState({ title: "", slug: "", content: "", status: "draft" });
  const [searchQuery, setSearchQuery] = useState("");
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    fetchPages();
  };

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPages(data || []);
      
      // Fetch view stats for each page
      if (data && data.length > 0) {
        await fetchPageStats(data.map(p => p.id));
      }
    } catch (error: any) {
      toast({ title: "Error fetching pages", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPageStats = async (pageIds: string[]) => {
    try {
      const statsMap: PageStats = {};
      
      pageIds.forEach(id => {
        statsMap[id] = { views: 0 };
      });

      const { data: viewsData } = await supabase
        .from("page_views")
        .select("page_id")
        .in("page_id", pageIds);
      
      if (viewsData) {
        viewsData.forEach(view => {
          if (statsMap[view.page_id]) {
            statsMap[view.page_id].views++;
          }
        });
      }

      setPageStats(statsMap);
    } catch (error) {
      console.error("Error fetching page stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const pageData = {
        ...formData,
        author_id: session.user.id,
      };

      if (editingPage) {
        const { error } = await supabase
          .from("pages")
          .update(pageData)
          .eq("id", editingPage.id);
        if (error) throw error;
        toast({ title: "Page updated successfully" });
      } else {
        const { error } = await supabase.from("pages").insert([pageData]);
        if (error) throw error;
        toast({ title: "Page created successfully" });
      }

      setDialogOpen(false);
      setEditingPage(null);
      setFormData({ title: "", slug: "", content: "", status: "draft" });
      fetchPages();
    } catch (error: any) {
      toast({ title: "Error saving page", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      const { error } = await supabase.from("pages").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Page deleted successfully" });
      fetchPages();
    } catch (error: any) {
      toast({ title: "Error deleting page", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (page: Page) => {
    setEditingPage(page);
    setFormData({ title: page.title, slug: page.slug, content: page.content, status: page.status });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingPage(null);
    setFormData({ title: "", slug: "", content: "", status: "draft" });
    setDialogOpen(true);
  };

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Static Pages</h1>
            <p className="text-muted-foreground">Create and manage content pages for your site</p>
          </div>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              New Page
            </Button>
          </DialogTrigger>
        </div>

        <div className="admin-section-spacing-top" />

        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="gap-6 border-b border-border/60 pb-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:w-[68%]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
              <Badge variant="secondary" className="h-11 rounded-full px-4 text-sm font-medium">
                {filteredPages.length} {filteredPages.length === 1 ? "Page" : "Pages"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug / Url</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Updated</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-0">
                      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/20 text-muted-foreground shadow-sm">
                          <FileText className="h-6 w-6" />
                        </div>
                        <h2 className="mt-6 text-2xl font-semibold text-foreground">
                          {searchQuery ? "No pages match your search" : "No pages created yet"}
                        </h2>
                        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                          {searchQuery
                            ? "Try a different keyword or clear the search to browse all pages."
                            : "Create static pages like About, Privacy Policy, or Terms for your site"}
                        </p>
                        {!searchQuery ? (
                          <Button className="mt-6" onClick={openCreateDialog}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create your first page
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPages.map((page) => (
                    <TableRow key={page.id} className="transition-colors hover:bg-muted/20">
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <p className="text-foreground">{page.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Created {format(new Date(page.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        /{page.slug}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                            page.status === "published"
                              ? "border-primary/20 bg-primary/10 text-primary"
                              : "border-border/70 bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          {page.status === "published" ? "Published" : "Draft"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(page.updated_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(`/${page.slug}`, "_blank")}
                                  className="h-9 px-3"
                                  aria-label={`View ${page.title}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View page</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(page)}
                                  className="h-9 px-3"
                                  aria-label={`Edit ${page.title}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit page</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-9 px-3"
                                  aria-label={`View details for ${page.title}`}
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="p-3">
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Views:</span>
                                    <span className="font-medium">{pageStats[page.id]?.views || 0}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Status:</span>
                                    <span className="font-medium">{page.status}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Created:</span>
                                    <span className="font-medium">{format(new Date(page.created_at), "MMM d, yyyy")}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-muted-foreground">Last Updated:</span>
                                    <span className="font-medium">{format(new Date(page.updated_at), "MMM d, yyyy")}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(page.id)}
                                  className="h-9 px-3 text-muted-foreground hover:text-destructive"
                                  aria-label={`Delete ${page.title}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete page</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Page Title"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
              }}
              required
            />
            <Input
              placeholder="Slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              required
            />
            <Textarea
              placeholder="Page Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              required
            />
            <select
              className="w-full px-3 py-2 border border-input rounded-md"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
            <Button type="submit" className="w-full">
              {editingPage ? "Update Page" : "Create Page"}
            </Button>
          </form>
        </DialogContent>
      </div>
    </Dialog>
  );
};

export default AdminPages;
