import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Skeleton } from "@/components/ui/skeleton";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";

interface DifficultyLevel {
  id: string;
  name: string;
  display_order: number;
  created_at: string;
}

interface CourseLevelUsage {
  level: string | null;
  updated_at: string | null;
}

interface DifficultyLevelWithMeta extends DifficultyLevel {
  keyLabel: string;
  linkedCourseCount: number;
  lastUpdatedLabel: string;
}

interface SortableRowProps {
  level: DifficultyLevelWithMeta;
  onEdit: (level: DifficultyLevel) => void;
  onDelete: (level: DifficultyLevel) => void;
  isDraggingActive: boolean;
}

export interface AdminDifficultyTabRef {
  openCreateDialog: () => void;
}

const toLevelKey = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const SortableRow = ({ level, onEdit, onDelete, isDraggingActive }: SortableRowProps) => {
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
      className={[
        "group transition-colors hover:bg-muted/40",
        isDragging ? "bg-muted/80 shadow-lg ring-1 ring-border" : "",
        isDraggingActive && !isDragging ? "opacity-90" : "",
      ].join(" ")}
    >
      <TableCell className="align-top">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${level.name}`}
          className="mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="py-4">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{level.name}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Key: {level.keyLabel}</span>
            <span>{level.linkedCourseCount} linked {level.linkedCourseCount === 1 ? "course" : "courses"}</span>
            <span>Last updated {level.lastUpdatedLabel}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-36 text-right align-top">
        <TooltipProvider>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(level)}
                  aria-label={`Edit ${level.name}`}
                  className="hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit level</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(level)}
                  aria-label={`Delete ${level.name}`}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete level</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
};

const AdminDifficultyTab = forwardRef<AdminDifficultyTabRef>((_, ref) => {
  const { toast } = useToast();
  const [levels, setLevels] = useState<DifficultyLevel[]>([]);
  const [courseUsage, setCourseUsage] = useState<CourseLevelUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DifficultyLevel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DifficultyLevel | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    void fetchLevels();
  }, []);

  const levelMeta = useMemo<DifficultyLevelWithMeta[]>(() => {
    return levels.map((level) => {
      const matchingCourses = courseUsage.filter((course) => course.level === level.name);
      const mostRecentCourseUpdate = matchingCourses
        .map((course) => course.updated_at)
        .filter(Boolean)
        .sort()
        .reverse()[0];

      return {
        ...level,
        keyLabel: toLevelKey(level.name) || "level",
        linkedCourseCount: matchingCourses.length,
        lastUpdatedLabel: format(
          new Date(mostRecentCourseUpdate || level.created_at),
          "MMM d, yyyy",
        ),
      };
    });
  }, [levels, courseUsage]);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const [{ data: levelData, error: levelError }, { data: courseData, error: courseError }] =
        await Promise.all([
          supabase.from("difficulty_levels").select("*").order("display_order"),
          supabase.from("courses").select("level, updated_at").is("deleted_at", null),
        ]);

      if (levelError) throw levelError;
      if (courseError) throw courseError;

      setLevels(levelData || []);
      setCourseUsage((courseData as CourseLevelUsage[]) || []);
    } catch (error: any) {
      toast({
        title: "Error fetching levels",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = levels.findIndex((item) => item.id === active.id);
      const newIndex = levels.findIndex((item) => item.id === over.id);
      const newLevels = arrayMove(levels, oldIndex, newIndex);

      setLevels(newLevels);

      try {
        const updates = newLevels.map((level, index) => ({
          id: level.id,
          display_order: index + 1,
        }));

        for (const update of updates) {
          await supabase
            .from("difficulty_levels")
            .update({ display_order: update.display_order })
            .eq("id", update.id);
        }

        toast({
          title: "Difficulty levels reordered",
          description: "New order saved across the platform.",
        });
      } catch (error: any) {
        toast({
          title: "Error updating order",
          description: error.message,
          variant: "destructive",
        });
        void fetchLevels();
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Level name required",
        description: "Please enter a difficulty level name.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingLevel) {
        const { error } = await supabase
          .from("difficulty_levels")
          .update({ name: formData.name.trim() })
          .eq("id", editingLevel.id);

        if (error) throw error;
        toast({ title: "Difficulty level updated successfully" });
      } else {
        const { error } = await supabase
          .from("difficulty_levels")
          .insert([{ name: formData.name.trim(), display_order: levels.length + 1 }]);

        if (error) throw error;
        toast({ title: "Difficulty level created successfully" });
      }

      setDialogOpen(false);
      setEditingLevel(null);
      setFormData({ name: "" });
      await fetchLevels();
    } catch (error: any) {
      toast({
        title: "Error saving difficulty level",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("difficulty_levels")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) throw error;
      toast({ title: "Difficulty level deleted successfully" });
      setDeleteTarget(null);
      await fetchLevels();
    } catch (error: any) {
      toast({
        title: "Error deleting difficulty level",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
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

  useImperativeHandle(ref, () => ({
    openCreateDialog,
  }));

  const renderSkeletonRows = () =>
    Array.from({ length: 5 }).map((_, index) => (
      <TableRow key={`skeleton-${index}`}>
        <TableCell className="w-12">
          <Skeleton className="h-8 w-8 rounded-md" />
        </TableCell>
        <TableCell className="py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </TableCell>
        <TableCell className="w-36">
          <div className="flex justify-end gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </TableCell>
      </TableRow>
    ));

  return (
    <>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingLevel(null);
            setFormData({ name: "" });
          }
        }}
      >
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  renderSkeletonRows()
                ) : levelMeta.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center">
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">No difficulty levels yet</p>
                        <p className="text-sm text-muted-foreground">
                          Add your first level to start organizing course difficulty.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={levelMeta.map((level) => level.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {levelMeta.map((level) => (
                        <SortableRow
                          key={level.id}
                          level={level}
                          onEdit={openEditDialog}
                          onDelete={setDeleteTarget}
                          isDraggingActive={Boolean(activeDragId)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving..." : editingLevel ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete difficulty level?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove "${deleteTarget.name}" from the list of reusable course levels.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

AdminDifficultyTab.displayName = "AdminDifficultyTab";

export default AdminDifficultyTab;
