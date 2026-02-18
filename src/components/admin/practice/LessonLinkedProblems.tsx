import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Code2, Eye, Bug, ListX } from "lucide-react";

interface LinkedProblem {
  id: string;
  title: string;
  difficulty: string;
  type: "solve" | "predict" | "fix" | "eliminate";
  subTopicTitle: string;
}

const TYPE_CONFIG = {
  solve: { icon: Code2, label: "Solve", color: "text-primary" },
  predict: { icon: Eye, label: "Predict", color: "text-amber-500" },
  fix: { icon: Bug, label: "Fix", color: "text-red-500" },
  eliminate: { icon: ListX, label: "Eliminate", color: "text-violet-500" },
};

function useLinkedProblemsByLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: ["linked-problems-by-lesson", lessonId],
    queryFn: async () => {
      if (!lessonId) return [];

      // Get sub-topics for this lesson
      const { data: subTopics } = await supabase
        .from("sub_topics")
        .select("id, title")
        .eq("lesson_id", lessonId);

      if (!subTopics?.length) return [];

      const subTopicIds = subTopics.map((st) => st.id);
      const stMap = Object.fromEntries(subTopics.map((st) => [st.id, st.title]));

      // Fetch all 4 mapping types in parallel
      const [regular, predict, fixError, eliminate] = await Promise.all([
        supabase
          .from("problem_mappings")
          .select("sub_topic_id, practice_problems!problem_id(id, title, difficulty)")
          .in("sub_topic_id", subTopicIds),
        supabase
          .from("predict_output_mappings")
          .select("sub_topic_id, predict_output_problems!predict_output_problem_id(id, title, difficulty)")
          .in("sub_topic_id", subTopicIds),
        supabase
          .from("fix_error_mappings")
          .select("sub_topic_id, fix_error_problems!fix_error_problem_id(id, title, difficulty)")
          .in("sub_topic_id", subTopicIds),
        supabase
          .from("eliminate_wrong_mappings")
          .select("sub_topic_id, eliminate_wrong_problems!eliminate_wrong_problem_id(id, title, difficulty)")
          .in("sub_topic_id", subTopicIds),
      ]);

      const problems: LinkedProblem[] = [];

      (regular.data || []).forEach((m: any) => {
        if (m.practice_problems) {
          problems.push({
            id: m.practice_problems.id,
            title: m.practice_problems.title,
            difficulty: m.practice_problems.difficulty,
            type: "solve",
            subTopicTitle: stMap[m.sub_topic_id] || "",
          });
        }
      });

      (predict.data || []).forEach((m: any) => {
        if (m.predict_output_problems) {
          problems.push({
            id: m.predict_output_problems.id,
            title: m.predict_output_problems.title,
            difficulty: m.predict_output_problems.difficulty,
            type: "predict",
            subTopicTitle: stMap[m.sub_topic_id] || "",
          });
        }
      });

      (fixError.data || []).forEach((m: any) => {
        if (m.fix_error_problems) {
          problems.push({
            id: m.fix_error_problems.id,
            title: m.fix_error_problems.title,
            difficulty: m.fix_error_problems.difficulty,
            type: "fix",
            subTopicTitle: stMap[m.sub_topic_id] || "",
          });
        }
      });

      (eliminate.data || []).forEach((m: any) => {
        if (m.eliminate_wrong_problems) {
          problems.push({
            id: m.eliminate_wrong_problems.id,
            title: m.eliminate_wrong_problems.title,
            difficulty: m.eliminate_wrong_problems.difficulty,
            type: "eliminate",
            subTopicTitle: stMap[m.sub_topic_id] || "",
          });
        }
      });

      return problems;
    },
    enabled: !!lessonId,
  });
}

const difficultyColor = (d: string) => {
  const lower = d.toLowerCase();
  if (lower === "easy") return "text-green-600 bg-green-50 border-green-200";
  if (lower === "medium") return "text-amber-600 bg-amber-50 border-amber-200";
  if (lower === "hard") return "text-red-600 bg-red-50 border-red-200";
  return "";
};

interface LessonLinkedProblemsProps {
  lessonId: string;
  lessonTitle: string;
}

export function LessonLinkedProblems({ lessonId, lessonTitle }: LessonLinkedProblemsProps) {
  const { data: problems, isLoading } = useLinkedProblemsByLesson(lessonId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (!problems?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        No problems linked to this lesson yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          Linked Problems
        </h4>
        <Badge variant="secondary" className="text-xs">
          {problems.length} problem{problems.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="rounded-lg border border-border overflow-hidden divide-y divide-border">
        {problems.map((problem) => {
          const config = TYPE_CONFIG[problem.type];
          const Icon = config.icon;
          return (
            <div
              key={`${problem.type}-${problem.id}`}
              className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-muted/50 transition-colors"
            >
              <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">
                  {problem.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  {problem.subTopicTitle}
                </span>
              </div>
              <Badge variant="outline" className={`text-[10px] shrink-0 ${difficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </Badge>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
