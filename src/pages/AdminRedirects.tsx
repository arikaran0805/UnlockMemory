import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Search, ArrowRight, ExternalLink } from "lucide-react";

interface Redirect {
  id: string;
  source_path: string;
  destination_url: string;
  redirect_type: number;
  is_active: boolean;
  hit_count: number;
  created_at: string;
}

const AdminRedirects = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRedirect, setSelectedRedirect] = useState<Redirect | null>(null);
  const [formData, setFormData] = useState({
    source_path: "",
    destination_url: "",
    redirect_type: 301,
    is_active: true,
  });

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

    fetchRedirects();
  };

  const fetchRedirects = async () => {
    const { data, error } = await supabase
      .from("redirects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching redirects", variant: "destructive" });
    } else {
      setRedirects(data || []);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setSelectedRedirect(null);
    setFormData({
      source_path: "",
      destination_url: "",
      redirect_type: 301,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (redirect: Redirect) => {
    setSelectedRedirect(redirect);
    setFormData({
      source_path: redirect.source_path,
      destination_url: redirect.destination_url,
      redirect_type: redirect.redirect_type,
      is_active: redirect.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.source_path.trim() || !formData.destination_url.trim()) {
      toast({ title: "Source and destination are required", variant: "destructive" });
      return;
    }

    // Ensure source path starts with /
    const sourcePath = formData.source_path.startsWith("/")
      ? formData.source_path.trim()
      : "/" + formData.source_path.trim();

    const redirectData = {
      source_path: sourcePath,
      destination_url: formData.destination_url.trim(),
      redirect_type: formData.redirect_type,
      is_active: formData.is_active,
    };

    if (selectedRedirect) {
      const { error } = await supabase
        .from("redirects")
        .update(redirectData)
        .eq("id", selectedRedirect.id);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Source path already exists", variant: "destructive" });
        } else {
          toast({ title: "Failed to update redirect", variant: "destructive" });
        }
      } else {
        toast({ title: "Redirect updated" });
        fetchRedirects();
        setDialogOpen(false);
      }
    } else {
      const { error } = await supabase.from("redirects").insert(redirectData);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Source path already exists", variant: "destructive" });
        } else {
          toast({ title: "Failed to create redirect", variant: "destructive" });
        }
      } else {
        toast({ title: "Redirect created" });
        fetchRedirects();
        setDialogOpen(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedRedirect) return;

    const { error } = await supabase.from("redirects").delete().eq("id", selectedRedirect.id);

    if (error) {
      toast({ title: "Failed to delete redirect", variant: "destructive" });
    } else {
      toast({ title: "Redirect deleted" });
      fetchRedirects();
    }
    setDeleteDialogOpen(false);
    setSelectedRedirect(null);
  };

  const toggleActive = async (redirect: Redirect) => {
    const { error } = await supabase
      .from("redirects")
      .update({ is_active: !redirect.is_active })
      .eq("id", redirect.id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    } else {
      fetchRedirects();
    }
  };

  const filteredRedirects = redirects.filter(
    (r) =>
      r.source_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Redirect Rules</h1>
            <p className="text-muted-foreground">Manage URL redirections and track traffic hits</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" /> Add Redirect
          </Button>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">
          <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search redirects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredRedirects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ExternalLink className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No redirects found" : "No redirect rules configured yet."}
              </p>
              {!searchQuery && (
                <Button className="mt-4" onClick={openCreateDialog}>
                  Create Your First Redirect
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Hits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRedirects.map((redirect) => (
                  <TableRow key={redirect.id}>
                    <TableCell className="font-mono text-sm">{redirect.source_path}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 max-w-xs">
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-sm">{redirect.destination_url}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={redirect.redirect_type === 301 ? "default" : "secondary"}>
                        {redirect.redirect_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{redirect.hit_count}</TableCell>
                    <TableCell>
                      <Switch
                        checked={redirect.is_active}
                        onCheckedChange={() => toggleActive(redirect)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(redirect)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSelectedRedirect(redirect);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRedirect ? "Edit Redirect" : "Create Redirect"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="source_path">Source Path</Label>
              <Input
                id="source_path"
                value={formData.source_path}
                onChange={(e) => setFormData({ ...formData, source_path: e.target.value })}
                placeholder="/old-page"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The path on your site that should redirect
              </p>
            </div>

            <div>
              <Label htmlFor="destination_url">Destination URL</Label>
              <Input
                id="destination_url"
                value={formData.destination_url}
                onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                placeholder="https://example.com/new-page or /new-page"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Full URL or path to redirect to
              </p>
            </div>

            <div>
              <Label htmlFor="redirect_type">Redirect Type</Label>
              <Select
                value={formData.redirect_type.toString()}
                onValueChange={(value) => setFormData({ ...formData, redirect_type: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="301">301 - Permanent Redirect</SelectItem>
                  <SelectItem value="302">302 - Temporary Redirect</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Use 301 for permanent moves, 302 for temporary
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the redirect from "{selectedRedirect?.source_path}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminRedirects;
