import { Problem } from "./types";
import { ProblemRow } from "./ProblemRow";

interface SubTopicGroup {
  title: string;
  problems: Problem[];
}

interface LessonProblemSectionProps {
  lessonTitle: string;
  subTopics: SubTopicGroup[];
  onProblemClick: (problem: Problem) => void;
  onSolutionClick?: (problem: Problem) => void;
}

export function LessonProblemSection({
  lessonTitle,
  subTopics,
  onProblemClick
}: LessonProblemSectionProps) {
  const totalProblems = subTopics.reduce((sum, st) => sum + st.problems.length, 0);

  if (totalProblems === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
      {/* Lesson header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40">
        <div className="w-1 h-4 rounded-full bg-primary/70 shrink-0" />
        <h3 className="text-[13px] font-semibold text-foreground tracking-[-0.01em]">
          {lessonTitle}
        </h3>
        <span className="ml-auto text-[11px] font-medium text-muted-foreground/70 tabular-nums">
          {totalProblems} {totalProblems === 1 ? "problem" : "problems"}
        </span>
      </div>

      {/* Sub-Topics + Problems */}
      <div>
        {subTopics.map((subTopic, idx) => (
          <div key={subTopic.title}>
            {(subTopics.length > 1 || subTopic.title !== lessonTitle) && (
              <div className="flex items-center gap-3 px-5 py-2 bg-muted/20 border-b border-border/30">
                <span className="text-[11px] font-semibold text-muted-foreground/80 tracking-[0.03em] uppercase">
                  {subTopic.title}
                </span>
                <div className="flex-1 h-px bg-border/30" />
              </div>
            )}
            <div>
              {subTopic.problems.map((problem, pIdx) => (
                <ProblemRow
                  key={problem.id}
                  problem={problem}
                  onClick={() => onProblemClick(problem)}
                  isLast={
                    pIdx === subTopic.problems.length - 1 &&
                    idx === subTopics.length - 1
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
