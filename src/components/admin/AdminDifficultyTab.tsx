import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DifficultyLevel {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

interface SortableRowProps {
  level: DifficultyLevel;
  onEdit: (level: DifficultyLevel) => void;
  onDelete: (id: string) => void;
}

const SortableRow = ({ level, onEdit, onDelete }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: level.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50 bg-muted" : ""}
    >
      <TableCell>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded transition-colors"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{level.name}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(level)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(level.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

const AdminDifficultyTab = () => {
  const { toast } = useToast();
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DifficultyLevel | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchLevels();
  }, []);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = levels.findIndex((item) => item.id === active.id);
      const newIndex = levels.findIndex((item) => item.id === over.id);
      const newLevels = arrayMove(levels, oldIndex, newIndex);

      setLevels(newLevels);

      // Update display_order in database
      try {
        const updates = newLevels.map((level, index) => ({
          id: level.id,
          name: level.name,
          display_order: index + 1,
        }));

        for (const update of updates) {
          await supabase
            .from("difficulty_levels")
            .update({ display_order: update.display_order })
            .eq("id", update.id);
        }

        toast({ title: "Order updated successfully" });
      } catch (error: any) {
        toast({ title: "Error updating order", description: error.message, variant: "destructive" });
        fetchLevels(); // Revert on error
      }
    }
  };

  const handleSubmit = async () => {
    try {
      if (editingLevel) {
        const { error } = await supabase
          .from("difficulty_levels")
          .update({ name: formData.name })
          .eq("id", editingLevel.id);

        if (error) throw error;
        toast({ title: "Difficulty level updated successfully" });
      } else {
        const { error } = await supabase
          .from("difficulty_levels")
          .insert([{ name: formData.name, display_order: levels.length + 1 }]);

        if (error) throw error;
        toast({ title: "Difficulty level created successfully" });
      }

      setDialogOpen(false);
      setEditingLevel(null);
      setFormData({ name: "" });
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
    setFormData({ name: level.name });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingLevel(null);
    setFormData({ name: "" });
    setDialogOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No difficulty levels found. Create one to get started.
                  </TableCell>
                </TableRow>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={levels.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {levels.map((level) => (
                      <SortableRow
                        key={level.id}
                        level={level}
                        onEdit={openEditDialog}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDifficultyTab;