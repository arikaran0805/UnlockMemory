import { CheckCircle2, Circle, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Problem } from "./types";

interface ProblemRowProps {
  problem: Problem;
  onClick: () => void;
  onSolutionClick?: () => void;
  isLast?: boolean;
}

const difficultyConfig = {
  Easy: {
    label: "Easy",
    className: "bg-green-50 text-green-700 border-green-100",
  },
  Medium: {
    label: "Medium",
    className: "bg-amber-50 text-amber-700 border-amber-100",
  },
  Hard: {
    label: "Hard",
    className: "bg-red-50 text-red-600 border-red-100",
  },
};

export function ProblemRow({ problem, onClick, isLast }: ProblemRowProps) {
  const diff = difficultyConfig[problem.difficulty];

  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all duration-150",
        "hover:bg-muted/30",
        !isLast && "border-b border-border/30"
      )}
      onClick={onClick}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {problem.solved ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/35 group-hover:text-muted-foreground/60 transition-colors" />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className={cn(
            "text-[13.5px] font-medium truncate transition-colors duration-150",
            problem.solved
              ? "text-muted-foreground"
              : "text-foreground group-hover:text-primary",
            problem.locked && "text-muted-foreground"
          )}
        >
          {problem.title}
        </span>
        {problem.locked && (
          <Lock className="h-3 w-3 text-amber-500 shrink-0" />
        )}
      </div>

      {/* Difficulty pill */}
      <span
        className={cn(
          "shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
          diff.className
        )}
      >
        {diff.label}
      </span>

      {/* Arrow affordance */}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all duration-150 group-hover:translate-x-0.5 shrink-0" />
    </div>
  );
}
