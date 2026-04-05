import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Plus, Pencil, Trash2, Tag, Search, FolderPlus } from "lucide-react";
import UMLoader from "@/components/UMLoader";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const tagSchema = z.object({
  name: z.string().trim().min(1, "Tag name is required").max(50, "Tag name too long"),
  slug: z.string().trim().min(1, "Slug is required").max(50, "Slug too long"),
});

interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  post_count?: number;
}

const AdminTags = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  });

  useEffect(() => {
    checkAdminAccess();
    fetchTags();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        return;
      }

      const { data: rolesData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .in("role", ["admin", "moderator"]);

      if (roleError) throw roleError;

      if (!rolesData || rolesData.length === 0) {
        toast({
          title: "Access Denied",
          description: "You don't have admin or moderator privileges",
          variant: "destructive",
        });
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error checking access:", error);
      navigate("/");
    }
  };

  const fetchTags = async () => {
    try {
      setLoading(true);
      
      // Fetch tags with post count
      const { data: tagsData, error: tagsError } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (tagsError) throw tagsError;

      // Fetch post counts for each tag
      const tagsWithCounts = await Promise.all(
        (tagsData || []).map(async (tag) => {
          const { count } = await supabase
            .from("post_tags")
            .select("*", { count: "exact", head: true })
            .eq("tag_id", tag.id);

          return {
            ...tag,
            post_count: count || 0,
          };
        })
      );

      setTags(tagsWithCounts);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
      toast({
        title: "Error",
        description: "Failed to load tags",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleOpenCreateDialog = () => {
    setSelectedTag(null);
    setFormData({ name: "", slug: "" });
    setEditDialogOpen(true);
  };

  const handleOpenEditDialog = (tag: Tag) => {
    setSelectedTag(tag);
    setFormData({ name: tag.name, slug: tag.slug });
    setEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (tag: Tag) => {
    setSelectedTag(tag);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const validated = tagSchema.parse(formData);

      if (selectedTag) {
        // Update existing tag
        const { error } = await supabase
          .from("tags")
          .update({
            name: validated.name,
            slug: validated.slug,
          })
          .eq("id", selectedTag.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Tag updated successfully",
        });
      } else {
        // Create new tag
        const { error } = await supabase
          .from("tags")
          .insert([{
            name: validated.name,
            slug: validated.slug,
          }]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Tag created successfully",
        });
      }

      setEditDialogOpen(false);
      fetchTags();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedTag) return;

    try {
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("id", selectedTag.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });

      setDeleteDialogOpen(false);
      fetchTags();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="flex items-center justify-center min-h-[400px]">
          <UMLoader size={56} dark label="Loading…" />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Tags Management
          </h1>
          <p className="text-muted-foreground">
            Manage your content tags
          </p>
        </div>
        <Button onClick={handleOpenCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Tag
        </Button>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">
        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="gap-6 border-b border-border/60 pb-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:w-[68%]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
              <Badge variant="secondary" className="h-11 rounded-full px-4 text-sm font-medium">
                {filteredTags.length} {filteredTags.length === 1 ? "Tag" : "Tags"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Slug</TableHead>
                  <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Posts</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Created On</TableHead>
                  <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-0">
                      <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/20 text-muted-foreground shadow-sm">
                          <Tag className="h-6 w-6" />
                        </div>
                        <h2 className="mt-6 text-2xl font-semibold text-foreground">
                          {searchQuery ? "No tags match your search" : "No tags created yet"}
                        </h2>
                        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                          {searchQuery
                            ? "Try a different keyword or clear the search to browse all tags."
                            : "Create tags to organize your content"}
                        </p>
                        {!searchQuery ? (
                          <Button className="mt-6 gap-2" onClick={handleOpenCreateDialog}>
                            <FolderPlus className="h-4 w-4" />
                            Create your first tag
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTags.map((tag) => (
                    <TableRow
                      key={tag.id}
                      className="cursor-default transition-colors hover:bg-muted/20"
                    >
                      <TableCell className="font-medium">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {tag.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {tag.slug}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {tag.post_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(tag.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditDialog(tag)}
                                  className="h-9 px-3"
                                  aria-label={`Edit ${tag.name}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit tag</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDeleteDialog(tag)}
                                  className="h-9 px-3 text-muted-foreground hover:text-destructive"
                                  aria-label={`Delete ${tag.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete tag</TooltipContent>
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
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTag ? "Edit Tag" : "Create New Tag"}
            </DialogTitle>
            <DialogDescription>
              {selectedTag 
                ? "Update the tag name and slug. The slug is used in URLs." 
                : "Add a new tag to organize your content."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tag Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setFormData({ 
                    name, 
                    slug: selectedTag ? formData.slug : generateSlug(name)
                  });
                }}
                placeholder="e.g., JavaScript"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="e.g., javascript"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used in URLs, should be lowercase with hyphens
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedTag ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the tag "{selectedTag?.name}" and remove it from all posts. 
              This action cannot be undone.
              {selectedTag && selectedTag.post_count > 0 && (
                <span className="block mt-2 font-semibold text-destructive">
                  This tag is used in {selectedTag.post_count} post{selectedTag.post_count !== 1 ? 's' : ''}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </>
);
};

export default AdminTags;
