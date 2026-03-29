import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Trash2, Eye, Info } from "lucide-react";
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

  if (loading) return <div>Loading...</div>;

  return (
    <>
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Static Pages</h1>
            <p className="text-muted-foreground">Create and manage content pages for your site</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPage(null); setFormData({ title: "", slug: "", content: "", status: "draft" }); }}>
                <Plus className="mr-2 h-4 w-4" /> New Page
              </Button>
            </DialogTrigger>
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
          </Dialog>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">

        <div className="grid gap-4">
          {pages.map((page) => (
            <Card key={page.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{page.title}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/${page.slug}`, "_blank")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(page)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm">
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
                    </TooltipProvider>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(page.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">/{page.slug}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${page.status === 'published' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {page.status}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  </>
);
};

export default AdminPages;
