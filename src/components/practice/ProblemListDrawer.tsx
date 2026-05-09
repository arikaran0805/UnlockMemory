import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProblemWithMapping } from "@/hooks/usePracticeProblems";
import { useLearnerProgress } from "@/hooks/useLearnerProblemProgress";
import { useAuth } from "@/contexts/AuthContext";

interface ProblemListDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  problems: ProblemWithMapping[];
  currentProblemSlug: string | undefined;
  onSelectProblem: (problemSlug: string, problemType?: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong") => void;
}

const difficultyConfig = {
  Easy: { label: "Easy", className: "bg-green-50 text-green-700 border-green-100" },
  Medium: { label: "Medium", className: "bg-amber-50 text-amber-700 border-amber-100" },
  Hard: { label: "Hard", className: "bg-red-50 text-red-600 border-red-100" },
};

export function ProblemListDrawer({
  open,
  onOpenChange,
  skillName,
  problems,
  currentProblemSlug,
  onSelectProblem,
}: ProblemListDrawerProps) {
  const { user } = useAuth();
  const { data: progressData } = useLearnerProgress(user?.id);

  const solvedProblems = new Set(
    (progressData || [])
      .filter((p) => p.status === "solved")
      .map((p) => p.problem_id)
  );

  const groupedByLesson = problems.reduce((acc, problem) => {
    const lessonTitle = problem.lesson_title || "General";
    if (!acc[lessonTitle]) acc[lessonTitle] = {};
    const subTopic = problem.sub_topic_title || "General";
    if (!acc[lessonTitle][subTopic]) acc[lessonTitle][subTopic] = [];
    acc[lessonTitle][subTopic].push(problem);
    return acc;
  }, {} as Record<string, Record<string, ProblemWithMapping[]>>);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[65vw] min-w-[600px] max-w-[960px] p-0">
        <SheetHeader className="px-6 py-4 border-b border-border/50">
          <SheetTitle className="text-left text-[17px] font-semibold tracking-[-0.02em]">
            {skillName}
          </SheetTitle>
          <p className="text-[12.5px] text-muted-foreground/70 text-left">
            {problems.length} problem{problems.length !== 1 ? "s" : ""}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="py-5 space-y-4 px-5">
            {Object.entries(groupedByLesson).map(([lessonTitle, subTopics]) => {
              const totalCount = Object.values(subTopics).reduce((s, arr) => s + arr.length, 0);
              const subTopicEntries = Object.entries(subTopics);
              return (
                <div key={lessonTitle} className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
                  {/* Lesson Header */}
                  <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40">
                    <div className="w-1 h-4 rounded-full bg-primary/70 shrink-0" />
                    <h3 className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">
                      {lessonTitle}
                    </h3>
                    <span className="ml-auto text-[11px] font-medium text-muted-foreground/70 tabular-nums">
                      {totalCount} {totalCount === 1 ? "problem" : "problems"}
                    </span>
                  </div>

                  {/* Sub-topics and Problems */}
                  <div>
                    {subTopicEntries.map(([subTopicTitle, subTopicProblems], stIdx) => (
                      <div key={subTopicTitle}>
                        {(subTopicEntries.length > 1 || subTopicTitle !== lessonTitle) && (
                          <div className="flex items-center gap-3 px-5 py-2 bg-muted/20 border-b border-border/30">
                            <span className="text-[11px] font-semibold text-muted-foreground/80 tracking-[0.03em] uppercase">
                              {subTopicTitle}
                            </span>
                            <div className="flex-1 h-px bg-border/30" />
                          </div>
                        )}
                        <div>
                          {subTopicProblems.map((problem, pIdx) => {
                            const isActive = problem.slug === currentProblemSlug;
                            const isSolved = solvedProblems.has(problem.id);
                            const diff = difficultyConfig[problem.difficulty];
                            const isLast =
                              pIdx === subTopicProblems.length - 1 &&
                              stIdx === subTopicEntries.length - 1;

                            return (
                              <div
                                key={problem.id}
                                onClick={() => {
                                  onSelectProblem(problem.slug, problem.problemType);
                                  onOpenChange(false);
                                }}
                                className={cn(
                                  "group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-all duration-150",
                                  "hover:bg-muted/30",
                                  isActive && "bg-primary/5",
                                  !isLast && "border-b border-border/30"
                                )}
                              >
                                {/* Status icon */}
                                <div className="shrink-0">
                                  {isSolved ? (
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground/35 group-hover:text-muted-foreground/60 transition-colors" />
                                  )}
                                </div>

                                {/* Title */}
                                <span className={cn(
                                  "flex-1 text-[13.5px] font-medium truncate transition-colors duration-150",
                                  isSolved
                                    ? "text-muted-foreground"
                                    : "text-foreground group-hover:text-primary",
                                  isActive && "text-primary"
                                )}>
                                  {problem.title}
                                </span>

                                {/* Difficulty pill */}
                                <span className={cn(
                                  "shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border",
                                  diff.className
                                )}>
                                  {diff.label}
                                </span>

                                {/* Arrow affordance */}
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all duration-150 group-hover:translate-x-0.5 shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {problems.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <p className="text-[13.5px]">No problems available</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
