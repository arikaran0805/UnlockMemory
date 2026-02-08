import { useState, useCallback } from "react";
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
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, GripVertical, MoreHorizontal, Unlink, Eye, Code2, Bug, ListX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SubTopic, useCreateSubTopic, useDeleteSubTopic, useUpdateSubTopic } from "@/hooks/useSubTopics";
import { useReorderSubTopics, useReorderProblemMappings } from "@/hooks/useReorderMappings";
import { cn } from "@/lib/utils";

interface LessonProblemsSectionProps {
  lesson: {
    id: string;
    title: string;
    course_id: string;
  };
  skillId: string;
  subTopics: SubTopic[];
  problemsBySubTopic: Record<string, any[]>;
  mappingsBySubTopic?: Record<string, { id: string; problem_id: string; problemType?: string }[]>;
  onProblemClick: (problemId: string, problemType?: string) => void;
  onAddProblem: (subTopicId: string) => void;
  onUnlinkProblem?: (mappingId: string, subTopicId: string, problemId: string, problemType?: string) => void;
}

export function LessonProblemsSection({
  lesson,
  skillId,
  subTopics,
  problemsBySubTopic,
  mappingsBySubTopic,
  onProblemClick,
  onAddProblem,
  onUnlinkProblem,
}: LessonProblemsSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSubTopicTitle, setNewSubTopicTitle] = useState("");
  const [deleteSubTopicId, setDeleteSubTopicId] = useState<string | null>(null);
  const [renameSubTopic, setRenameSubTopic] = useState<SubTopic | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [orderedSubTopics, setOrderedSubTopics] = useState<SubTopic[] | null>(null);

  const createSubTopic = useCreateSubTopic();
  const deleteSubTopic = useDeleteSubTopic();
  const updateSubTopic = useUpdateSubTopic();
  const reorderSubTopics = useReorderSubTopics();

  // Use local order if dragging has occurred, otherwise use props
  const displaySubTopics = orderedSubTopics || subTopics;

  // Reset local order when props change
  const subTopicIds = subTopics.map(s => s.id).join(",");
  const [lastSubTopicIds, setLastSubTopicIds] = useState(subTopicIds);
  if (subTopicIds !== lastSubTopicIds) {
    setOrderedSubTopics(null);
    setLastSubTopicIds(subTopicIds);
  }

  const totalProblems = displaySubTopics.reduce((sum, st) => sum + (problemsBySubTopic[st.id]?.length || 0), 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleSubTopicDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = orderedSubTopics || subTopics;
    const oldIndex = current.findIndex(st => st.id === active.id);
    const newIndex = current.findIndex(st => st.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(current, oldIndex, newIndex);
    setOrderedSubTopics(newOrder);

    // Persist new order
    reorderSubTopics.mutate(
      newOrder.map((st, i) => ({ id: st.id, display_order: i }))
    );
  }, [orderedSubTopics, subTopics, reorderSubTopics]);

  const handleCreateSubTopic = async () => {
    if (!newSubTopicTitle.trim()) return;
    await createSubTopic.mutateAsync({
      lesson_id: lesson.id,
      skill_id: skillId,
      title: newSubTopicTitle.trim(),
      display_order: displaySubTopics.length,
    });
    setNewSubTopicTitle("");
    setShowCreateDialog(false);
  };

  const handleDeleteSubTopic = async (subTopicId: string) => {
    await deleteSubTopic.mutateAsync({ id: subTopicId, lessonId: lesson.id, skillId });
    setDeleteSubTopicId(null);
  };

  const handleRenameSubTopic = async () => {
    if (!renameSubTopic || !renameTitle.trim()) return;
    await updateSubTopic.mutateAsync({ id: renameSubTopic.id, title: renameTitle.trim() });
    setRenameSubTopic(null);
    setRenameTitle("");
  };

  const openRenameDialog = (subTopic: SubTopic) => {
    setRenameSubTopic(subTopic);
    setRenameTitle(subTopic.title);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Easy</Badge>;
      case "Medium":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs">Medium</Badge>;
      case "Hard":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs">Hard</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{difficulty}</Badge>;
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {/* Lesson Header */}
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium">{lesson.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {totalProblems} problems
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateDialog(true);
                }}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Sub-Topic
              </Button>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {displaySubTopics.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p className="text-sm">No sub-topics yet.</p>
                <Button variant="link" size="sm" onClick={() => setShowCreateDialog(true)} className="mt-1">
                  Create your first sub-topic
                </Button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubTopicDragEnd}>
                <SortableContext items={displaySubTopics.map(st => st.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-border">
                    {displaySubTopics.map((subTopic) => (
                      <SortableSubTopic
                        key={subTopic.id}
                        subTopic={subTopic}
                        problems={problemsBySubTopic[subTopic.id] || []}
                        mappings={mappingsBySubTopic?.[subTopic.id] || []}
                        onProblemClick={onProblemClick}
                        onAddProblem={() => onAddProblem(subTopic.id)}
                        onRename={() => openRenameDialog(subTopic)}
                        onDelete={() => setDeleteSubTopicId(subTopic.id)}
                        onUnlinkProblem={onUnlinkProblem}
                        getDifficultyBadge={getDifficultyBadge}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Create Sub-Topic Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Sub-Topic</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Sub-topic title..."
              value={newSubTopicTitle}
              onChange={(e) => setNewSubTopicTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSubTopic()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSubTopic} disabled={!newSubTopicTitle.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteSubTopicId} onOpenChange={() => setDeleteSubTopicId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Sub-Topic</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the sub-topic and all problem mappings. The problems themselves won't be deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSubTopicId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteSubTopicId && handleDeleteSubTopic(deleteSubTopicId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Sub-Topic Dialog */}
      <Dialog open={!!renameSubTopic} onOpenChange={() => setRenameSubTopic(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Sub-Topic</DialogTitle></DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Sub-topic title..."
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubTopic()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameSubTopic(null)}>Cancel</Button>
            <Button onClick={handleRenameSubTopic} disabled={!renameTitle.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Sortable Sub-Topic ──────────────────────────────────────

interface SortableSubTopicProps {
  subTopic: SubTopic;
  problems: any[];
  mappings: { id: string; problem_id: string; problemType?: string }[];
  onProblemClick: (problemId: string, problemType?: string) => void;
  onAddProblem: () => void;
  onRename: () => void;
  onDelete: () => void;
  onUnlinkProblem?: (mappingId: string, subTopicId: string, problemId: string, problemType?: string) => void;
  getDifficultyBadge: (difficulty: string) => React.ReactNode;
}

function SortableSubTopic({
  subTopic,
  problems,
  mappings,
  onProblemClick,
  onAddProblem,
  onRename,
  onDelete,
  onUnlinkProblem,
  getDifficultyBadge,
}: SortableSubTopicProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [orderedProblems, setOrderedProblems] = useState<any[] | null>(null);
  const reorderMappings = useReorderProblemMappings();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subTopic.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  // Use local order or props
  const displayProblems = orderedProblems || problems;

  // Reset local order when props change
  const problemIds = problems.map(p => `${p.problemType}-${p.id}`).join(",");
  const [lastProblemIds, setLastProblemIds] = useState(problemIds);
  if (problemIds !== lastProblemIds) {
    setOrderedProblems(null);
    setLastProblemIds(problemIds);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Build unique sortable IDs for problems (combo of type + id)
  const sortableIds = displayProblems.map(p => `${p.problemType || 'ps'}-${p.id}`);

  const handleProblemDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const current = orderedProblems || problems;
    const oldIndex = sortableIds.indexOf(active.id as string);
    const newIndex = sortableIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(current, oldIndex, newIndex);
    setOrderedProblems(newOrder);

    // Persist: find the mapping for each problem and update display_order
    const updates = newOrder.map((problem, i) => {
      const mapping = mappings.find(m => m.problem_id === problem.id && m.problemType === problem.problemType);
      if (!mapping) return null;
      return {
        id: mapping.id,
        display_order: i,
        table: (problem.problemType === "predict-output" 
          ? "predict_output_mappings" 
          : problem.problemType === "fix-error" 
          ? "fix_error_mappings" 
          : problem.problemType === "eliminate-wrong"
          ? "eliminate_wrong_mappings"
          : "problem_mappings") as "problem_mappings" | "predict_output_mappings" | "fix_error_mappings" | "eliminate_wrong_mappings",
      };
    }).filter(Boolean) as { id: string; display_order: number; table: "problem_mappings" | "predict_output_mappings" | "fix_error_mappings" | "eliminate_wrong_mappings" }[];

    if (updates.length > 0) {
      reorderMappings.mutate(updates);
    }
  }, [orderedProblems, problems, sortableIds, mappings, reorderMappings]);

  return (
    <div ref={setNodeRef} style={style} className="bg-background">
      {/* Sub-Topic Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 pl-6 bg-muted/20 cursor-pointer hover:bg-muted/30"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {/* Drag handle for sub-topic */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-2 text-muted-foreground/50 hover:text-muted-foreground touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{subTopic.title}</span>
          {subTopic.is_default && (
            <Badge variant="outline" className="text-xs">Default</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            ({displayProblems.length} problems)
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onAddProblem(); }}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3 w-3" />
            Add Problem
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Sub-Topic
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Problems List with DnD */}
      {isExpanded && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProblemDragEnd}>
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-border/50">
              {displayProblems.length === 0 ? (
                <div className="px-4 py-4 pl-14 text-sm text-muted-foreground">
                  No problems mapped yet.
                </div>
              ) : (
                displayProblems.map((problem) => (
                  <SortableProblemRow
                    key={`${problem.problemType || 'ps'}-${problem.id}`}
                    sortableId={`${problem.problemType || 'ps'}-${problem.id}`}
                    problem={problem}
                    subTopic={subTopic}
                    mapping={mappings.find(m => m.problem_id === problem.id && m.problemType === problem.problemType)}
                    onProblemClick={onProblemClick}
                    onUnlinkProblem={onUnlinkProblem}
                    getDifficultyBadge={getDifficultyBadge}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ─── Sortable Problem Row ──────────────────────────────────────

interface SortableProblemRowProps {
  sortableId: string;
  problem: any;
  subTopic: SubTopic;
  mapping?: { id: string; problem_id: string; problemType?: string };
  onProblemClick: (problemId: string, problemType?: string) => void;
  onUnlinkProblem?: (mappingId: string, subTopicId: string, problemId: string, problemType?: string) => void;
  getDifficultyBadge: (difficulty: string) => React.ReactNode;
}

function SortableProblemRow({
  sortableId,
  problem,
  subTopic,
  mapping,
  onProblemClick,
  onUnlinkProblem,
  getDifficultyBadge,
}: SortableProblemRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const isPredictOutput = problem.problemType === "predict-output";
  const isFixError = problem.problemType === "fix-error";
  const isEliminateWrong = problem.problemType === "eliminate-wrong";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 pl-10 hover:bg-muted/30 cursor-pointer transition-colors group bg-background",
        isDragging && "shadow-md rounded"
      )}
      onClick={() => onProblemClick(problem.id, problem.problemType)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:text-muted-foreground touch-none"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {/* Type icon */}
      {isPredictOutput ? (
        <Eye className="h-4 w-4 text-amber-500 shrink-0" />
      ) : isFixError ? (
        <Bug className="h-4 w-4 text-destructive shrink-0" />
      ) : isEliminateWrong ? (
        <ListX className="h-4 w-4 text-violet-500 shrink-0" />
      ) : (
        <Code2 className="h-4 w-4 text-primary/70 shrink-0" />
      )}
      <span className="flex-1 text-sm">{problem.title}</span>
      {getDifficultyBadge(problem.difficulty)}
      <Badge variant={problem.status === "published" ? "default" : "secondary"} className="text-xs">
        {problem.status}
      </Badge>
      {onUnlinkProblem && mapping && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onUnlinkProblem(mapping.id, subTopic.id, problem.id, problem.problemType);
              }}
            >
              <Unlink className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Unlink from sub-topic</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
