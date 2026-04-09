import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { FolderPlus, Pencil, Search, Trash2 } from "lucide-react";
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

interface DifficultyRowProps {
  level: DifficultyLevelWithMeta;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (level: DifficultyLevel) => void;
  onDelete: (level: DifficultyLevel) => void;
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

const DifficultyRow = ({ level, isSelected, onToggleSelect, onEdit, onDelete }: DifficultyRowProps) => {
  return (
    <TableRow
      className="cursor-default transition-colors hover:bg-muted/20"
    >
      <TableCell className="w-12">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(level.id)}
          aria-label={`Select ${level.name}`}
          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
        />
      </TableCell>
      <TableCell className="py-4">
        <div className="space-y-1">
          <div className="font-medium text-foreground">{level.name}</div>
          <div className="text-xs text-muted-foreground">Key: {level.keyLabel}</div>
        </div>
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        <Badge variant="outline">
          {level.linkedCourseCount}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {level.lastUpdatedLabel}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<DifficultyLevel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DifficultyLevel | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({ name: "" });

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

  const filteredLevels = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return levelMeta;

    return levelMeta.filter((level) =>
      level.name.toLowerCase().includes(query) ||
      level.keyLabel.toLowerCase().includes(query)
    );
  }, [levelMeta, searchQuery]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchQuery, levelMeta.length]);

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

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredLevels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLevels.map((level) => level.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("difficulty_levels")
        .delete()
        .in("id", ids);

      if (error) throw error;

      toast({
        title: "Difficulty levels deleted successfully",
        description: `${ids.length} level${ids.length === 1 ? "" : "s"} removed.`,
      });
      setSelectedIds(new Set());
      setBulkDeleteDialogOpen(false);
      await fetchLevels();
    } catch (error: any) {
      toast({
        title: "Error deleting difficulty levels",
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
          <Skeleton className="h-4 w-4 rounded-sm" />
        </TableCell>
        <TableCell className="py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </TableCell>
        <TableCell className="text-center">
          <Skeleton className="mx-auto h-6 w-10 rounded-full" />
        </TableCell>
        <TableCell>
          <Skeleton className="h-4 w-28" />
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
        <Card className="border border-border/70 shadow-sm">
          <CardHeader className="gap-6 border-b border-border/60 pb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search difficulty levels..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="h-11 pl-10"
                />
              </div>

              {selectedIds.size > 0 ? (
                <Button
                  variant="destructive"
                  className="gap-2 h-11 px-5"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedIds.size} row{selectedIds.size === 1 ? "" : "s"}
                </Button>
              ) : null}

              <div className="ml-auto">
                <Badge variant="secondary" className="h-11 rounded-full px-4 text-sm font-medium">
                  {filteredLevels.length} {filteredLevels.length === 1 ? "Level" : "Levels"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={filteredLevels.length > 0 && selectedIds.size === filteredLevels.length}
                      ref={(el) => {
                        if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredLevels.length;
                      }}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all difficulty levels"
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Level</TableHead>
                  <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Linked Courses</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last Updated</TableHead>
                  <TableHead className="w-36 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  renderSkeletonRows()
                ) : filteredLevels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-0">
                      <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/20 text-muted-foreground shadow-sm">
                          <FolderPlus className="h-6 w-6" />
                        </div>
                        <h2 className="mt-6 text-2xl font-semibold text-foreground">
                          {searchQuery ? "No levels match your search" : "No difficulty levels yet"}
                        </h2>
                        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                          {searchQuery
                            ? "Try a different keyword or clear the search to browse all difficulty levels."
                            : "Add your first level to start organizing course difficulty."}
                        </p>
                        {!searchQuery ? (
                          <Button className="mt-6 gap-2" onClick={openCreateDialog}>
                            <FolderPlus className="h-4 w-4" />
                            Create your first level
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLevels.map((level) => (
                    <DifficultyRow
                      key={level.id}
                      level={level}
                      isSelected={selectedIds.has(level.id)}
                      onToggleSelect={handleToggleSelectRow}
                      onEdit={openEditDialog}
                      onDelete={setDeleteTarget}
                    />
                  ))
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected difficulty levels?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} difficulty level{selectedIds.size === 1 ? "" : "s"}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
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
