import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";

interface DifficultyLevel {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

const AdminDifficultyLevels = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DifficultyLevel | null>(null);
  const [formData, setFormData] = useState({ name: "", display_order: 0 });

  useEffect(() => {
    checkAdminAccess();
    fetchLevels();
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
    }
  };

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("difficulty_levels")
        .select("*")
        .order("display_order");

      if (error) throw error;
      setLevels(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching levels", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingLevel) {
        const { error } = await supabase
          .from("difficulty_levels")
          .update(formData)
          .eq("id", editingLevel.id);

        if (error) throw error;
        toast({ title: "Difficulty level updated successfully" });
      } else {
        const { error } = await supabase
          .from("difficulty_levels")
          .insert([formData]);

        if (error) throw error;
        toast({ title: "Difficulty level created successfully" });
      }

      setDialogOpen(false);
      setEditingLevel(null);
      setFormData({ name: "", display_order: 0 });
      fetchLevels();
    } catch (error: any) {
      toast({ title: "Error saving difficulty level", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this difficulty level?")) return;

    try {
      const { error } = await supabase
        .from("difficulty_levels")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Difficulty level deleted successfully" });
      fetchLevels();
    } catch (error: any) {
      toast({ title: "Error deleting difficulty level", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (level: DifficultyLevel) => {
    setEditingLevel(level);
    setFormData({ name: level.name, display_order: level.display_order });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingLevel(null);
    setFormData({ name: "", display_order: levels.length + 1 });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Difficulty Levels</h1>
            <p className="text-muted-foreground">Manage and organize content difficulty classifications</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Level
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? "Edit Difficulty Level" : "Create Difficulty Level"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Level Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Beginner, Advanced, etc."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order *</Label>
                  <Input
                    id="order"
                    type="number"
                    placeholder="Order for sorting"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingLevel ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">

        <Card>
          <CardHeader>
            <CardTitle>Manage Difficulty Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-32">Display Order</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No difficulty levels found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  levels.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>{level.display_order}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(level)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(level.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  </>
);
};

export default AdminDifficultyLevels;
