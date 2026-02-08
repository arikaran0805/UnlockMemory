import { useState } from "react";
import { Search, Check, Plus, Eye, Code2, Bug, ListX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface AddProblemDialogProblem {
  id: string;
  title: string;
  difficulty: string;
  status: string;
  sub_topic?: string | null;
  problemType: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong";
  language?: string;
}

interface AddProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allProblems: AddProblemDialogProblem[];
  mappedProblemIds: Set<string>;
  onAddProblems: (selections: { id: string; problemType: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong" }[]) => void;
  onCreateNew: () => void;
}

export function AddProblemDialog({
  open,
  onOpenChange,
  allProblems,
  mappedProblemIds,
  onAddProblems,
  onCreateNew,
}: AddProblemDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredProblems = allProblems.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.sub_topic?.toLowerCase().includes(search.toLowerCase())
  );

  const availableProblems = filteredProblems.filter(
    (p) => !mappedProblemIds.has(p.id)
  );

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleAdd = () => {
    const selections = Array.from(selectedIds).map(id => {
      const problem = allProblems.find(p => p.id === id);
      return { id, problemType: problem?.problemType || "problem-solving" as const };
    });
    onAddProblems(selections);
    setSelectedIds(new Set());
    setSearch("");
    onOpenChange(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 dark:text-green-500";
      case "Medium":
        return "text-amber-600 dark:text-amber-500";
      case "Hard":
        return "text-red-600 dark:text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Problems to Sub-Topic</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search & Create New */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search problems..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={onCreateNew} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create New
            </Button>
          </div>

          {/* Problems List */}
          <ScrollArea className="h-[400px] border rounded-lg">
            {availableProblems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <p className="text-muted-foreground">
                  {search ? "No problems match your search" : "All problems are already mapped"}
                </p>
                <Button variant="link" onClick={onCreateNew} className="mt-2">
                  Create a new problem
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {availableProblems.map((problem) => (
                  <div
                    key={problem.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                      selectedIds.has(problem.id) 
                        ? "bg-primary/10" 
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleToggle(problem.id)}
                  >
                    <div className={cn(
                      "h-5 w-5 rounded border flex items-center justify-center shrink-0",
                      selectedIds.has(problem.id) 
                        ? "bg-primary border-primary" 
                        : "border-border"
                    )}>
                      {selectedIds.has(problem.id) && (
                        <Check className="h-3.5 w-3.5 text-primary-foreground" />
                      )}
                    </div>
                    {problem.problemType === "predict-output" ? (
                      <Eye className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : problem.problemType === "fix-error" ? (
                      <Bug className="h-4 w-4 text-destructive shrink-0" />
                    ) : problem.problemType === "eliminate-wrong" ? (
                      <ListX className="h-4 w-4 text-violet-500 shrink-0" />
                    ) : (
                      <Code2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{problem.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {problem.problemType === "predict-output" 
                          ? `Predict Output · ${problem.language || "python"}`
                          : problem.problemType === "fix-error"
                          ? `Fix the Error · ${problem.language || "python"}`
                          : problem.problemType === "eliminate-wrong"
                          ? `Eliminate Wrong · ${problem.language || "python"}`
                          : problem.sub_topic || "Problem Solving"}
                      </p>
                    </div>
                    <span className={cn("text-sm font-medium", getDifficultyColor(problem.difficulty))}>
                      {problem.difficulty}
                    </span>
                    <Badge variant={problem.status === "published" ? "default" : "secondary"}>
                      {problem.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selection Count */}
          {selectedIds.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} problem{selectedIds.size > 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={selectedIds.size === 0}>
            Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
