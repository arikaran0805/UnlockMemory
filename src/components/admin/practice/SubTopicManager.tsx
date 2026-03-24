import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  useSubTopicsByLesson,
  useCreateSubTopic,
  useUpdateSubTopic,
  useDeleteSubTopic,
  type SubTopic,
} from "@/hooks/useSubTopics";
import UMLoader from "@/components/UMLoader";

interface SubTopicManagerProps {
  lessonId: string;
  skillId: string;
  lessonTitle: string;
  disabled?: boolean;
  onManageProblems?: (subTopicId: string, subTopicTitle: string) => void;
}

export function SubTopicManager({
  lessonId,
  skillId,
  lessonTitle,
  disabled = false,
  onManageProblems,
}: SubTopicManagerProps) {
  const { data: subTopics, isLoading } = useSubTopicsByLesson(lessonId);
  const createMutation = useCreateSubTopic();
  const updateMutation = useUpdateSubTopic();
  const deleteMutation = useDeleteSubTopic();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSubTopic, setEditingSubTopic] = useState<SubTopic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubTopic | null>(null);

  const [formData, setFormData] = useState({ title: "", description: "" });

  const handleCreate = async () => {
    if (!formData.title.trim()) return;
    await createMutation.mutateAsync({
      lesson_id: lessonId,
      skill_id: skillId,
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      display_order: (subTopics?.length || 0) + 1,
    });
    setFormData({ title: "", description: "" });
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingSubTopic || !formData.title.trim()) return;
    await updateMutation.mutateAsync({
      id: editingSubTopic.id,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
    });
    setEditingSubTopic(null);
    setFormData({ title: "", description: "" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync({
      id: deleteTarget.id,
      lessonId,
      skillId,
    });
    setDeleteTarget(null);
  };

  const openEdit = (st: SubTopic) => {
    setFormData({ title: st.title, description: st.description || "" });
    setEditingSubTopic(st);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <UMLoader size={44} label="Unlocking memory…" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Practice Sub-Topics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Group problems by concept within "{lessonTitle}"
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFormData({ title: "", description: "" });
              setIsCreateOpen(true);
            }}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Sub-Topic
          </Button>
        </CardHeader>
        <CardContent>
          {subTopics && subTopics.length > 0 ? (
            <div className="space-y-2">
              {subTopics.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{st.title}</span>
                      {st.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    {st.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {st.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    <FileQuestion className="h-3 w-3 mr-1" />
                    {st.problem_count || 0} problems
                  </Badge>
                  <div className="flex items-center gap-1">
                    {onManageProblems && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onManageProblems(st.id, st.title)}
                      >
                        Manage Problems
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => openEdit(st)}
                      disabled={disabled}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(st)}
                      disabled={disabled || st.is_default}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileQuestion className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No sub-topics yet.</p>
              <p className="text-sm">Add sub-topics to group practice problems.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sub-Topic</DialogTitle>
            <DialogDescription>
              Add a new practice sub-topic for "{lessonTitle}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Array Basics"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this sub-topic"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!formData.title.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubTopic} onOpenChange={() => setEditingSubTopic(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSubTopic(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.title.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sub-Topic?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{deleteTarget?.title}" and remove all problem mappings.
              The problems themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
