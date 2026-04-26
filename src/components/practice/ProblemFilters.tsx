import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyFilter, StatusFilter } from "./types";

interface ProblemFiltersProps {
  difficulty: DifficultyFilter;
  status: StatusFilter;
  search: string;
  onDifficultyChange: (d: DifficultyFilter) => void;
  onStatusChange: (s: StatusFilter) => void;
  onSearchChange: (s: string) => void;
}

const difficultyOptions: { value: DifficultyFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'solved', label: 'Solved' },
  { value: 'unsolved', label: 'Unsolved' },
];

export function ProblemFilters({
  difficulty,
  status,
  search,
  onDifficultyChange,
  onStatusChange,
  onSearchChange,
}: ProblemFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-3">
      {/* Difficulty */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11.5px] font-medium text-muted-foreground/70 tracking-[0.02em] whitespace-nowrap">
          Difficulty
        </span>
        <div className="flex gap-0.5 ml-1">
          {difficultyOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onDifficultyChange(opt.value)}
              className={cn(
                "h-7 px-3 text-[12px] font-medium rounded-lg transition-all duration-150",
                difficulty === opt.value
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-5 bg-border/50 mx-1" />

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11.5px] font-medium text-muted-foreground/70 tracking-[0.02em] whitespace-nowrap">
          Status
        </span>
        <div className="flex gap-0.5 ml-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              className={cn(
                "h-7 px-3 text-[12px] font-medium rounded-lg transition-all duration-150",
                status === opt.value
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-xs ml-auto">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
        <Input
          placeholder="Search problems…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-8 text-[12.5px] bg-muted/30 border-border/40 rounded-lg focus-visible:ring-primary/20"
        />
      </div>
    </div>
  );
}
