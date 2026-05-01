/**
 * useLessonProblemsForFocus
 *
 * Fetches all problem types linked to a specific lesson via:
 *   practice_skills → sub_topics (lesson_id) → *_mappings → *_problems
 *
 * Used by PracticeFocusMode to render the problem list for a selected lesson.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProblemType =
  | "problem-solving"
  | "predict-output"
  | "fix-error"
  | "eliminate-wrong";

export interface FocusProblem {
  id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  /** true = user has solved this */
  solved: boolean;
  locked: boolean;
  subTopic: string;
  subTopicId: string;
  problemType: ProblemType;
  hasSolution: boolean;
}

/** Reusable hook that returns problems for one lesson. */
export function useLessonProblemsForFocus(
  skillSlug: string | undefined,
  lessonId: string | undefined,
) {
  const { user } = useAuth();

  // ── 1. Resolve skill ID from slug ─────────────────────────────────────────
  const { data: skill } = useQuery({
    queryKey: ["practice-skill-by-slug", skillSlug],
    queryFn: async () => {
      if (!skillSlug) return null;
      const { data, error } = await supabase
        .from("practice_skills")
        .select("id, slug, name")
        .eq("slug", skillSlug)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!skillSlug,
  });

  // ── 2. Fetch all problem types for the lesson ────────────────────────────
  const { data: rawProblems, isLoading } = useQuery({
    queryKey: ["focus-lesson-problems", skill?.id, lessonId],
    queryFn: async () => {
      if (!skill?.id || !lessonId) return [];

      // Sub-topics for this lesson
      const { data: subTopics } = await supabase
        .from("sub_topics")
        .select("id, title")
        .eq("skill_id", skill.id)
        .eq("lesson_id", lessonId)
        .order("display_order", { ascending: true });

      if (!subTopics?.length) return [];

      const subTopicIds = subTopics.map((s) => s.id);
      const subTopicMap = new Map(subTopics.map((s) => [s.id, s.title]));

      const results: any[] = [];

      // --- regular problem-solving ---
      const { data: pm } = await supabase
        .from("problem_mappings")
        .select(
          "problem_id, sub_topic_id, display_order, practice_problems(id, title, slug, difficulty, is_premium, solution, status)",
        )
        .in("sub_topic_id", subTopicIds)
        .order("display_order", { ascending: true });

      (pm || [])
        .filter((m: any) => m.practice_problems?.status === "published")
        .forEach((m: any) => {
          results.push({
            ...m.practice_problems,
            subTopicTitle: subTopicMap.get(m.sub_topic_id) ?? "General",
            subTopicId: m.sub_topic_id,
            problemType: "problem-solving",
            displayOrder: m.display_order,
          });
        });

      // --- predict output ---
      const { data: pred } = await supabase
        .from("predict_output_mappings")
        .select(
          "predict_output_problem_id, sub_topic_id, display_order, predict_output_problems(id, title, slug, difficulty, is_premium, status)",
        )
        .in("sub_topic_id", subTopicIds)
        .order("display_order", { ascending: true });

      (pred || [])
        .filter((m: any) => m.predict_output_problems?.status === "published")
        .forEach((m: any) => {
          results.push({
            ...m.predict_output_problems,
            subTopicTitle: subTopicMap.get(m.sub_topic_id) ?? "General",
            subTopicId: m.sub_topic_id,
            problemType: "predict-output",
            displayOrder: m.display_order,
          });
        });

      // --- fix error ---
      const { data: fe } = await supabase
        .from("fix_error_mappings")
        .select(
          "fix_error_problem_id, sub_topic_id, display_order, fix_error_problems(id, title, slug, difficulty, is_premium, status)",
        )
        .in("sub_topic_id", subTopicIds)
        .order("display_order", { ascending: true });

      (fe || [])
        .filter((m: any) => m.fix_error_problems?.status === "published")
        .forEach((m: any) => {
          results.push({
            ...m.fix_error_problems,
            subTopicTitle: subTopicMap.get(m.sub_topic_id) ?? "General",
            subTopicId: m.sub_topic_id,
            problemType: "fix-error",
            displayOrder: m.display_order,
          });
        });

      // --- eliminate wrong ---
      const { data: ew } = await supabase
        .from("eliminate_wrong_mappings")
        .select(
          "eliminate_wrong_problem_id, sub_topic_id, display_order, eliminate_wrong_problems(id, title, slug, difficulty, is_premium, status)",
        )
        .in("sub_topic_id", subTopicIds)
        .order("display_order", { ascending: true });

      (ew || [])
        .filter((m: any) => m.eliminate_wrong_problems?.status === "published")
        .forEach((m: any) => {
          results.push({
            ...m.eliminate_wrong_problems,
            subTopicTitle: subTopicMap.get(m.sub_topic_id) ?? "General",
            subTopicId: m.sub_topic_id,
            problemType: "eliminate-wrong",
            displayOrder: m.display_order,
          });
        });

      return results;
    },
    enabled: !!skill?.id && !!lessonId,
  });

  // ── 3. User progress (solved set) ────────────────────────────────────────
  const { data: progressData } = useQuery({
    queryKey: ["learner-progress-focus", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("learner_problem_progress")
        .select("problem_id, status")
        .eq("user_id", user.id)
        .eq("status", "solved");
      return data || [];
    },
    enabled: !!user?.id,
  });

  const solvedSet = useMemo(
    () => new Set((progressData || []).map((p: any) => p.problem_id)),
    [progressData],
  );

  // ── 4. Shape into FocusProblem[] ─────────────────────────────────────────
  const problems = useMemo<FocusProblem[]>(() => {
    if (!rawProblems) return [];
    return rawProblems.map((p: any) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty ?? "Easy",
      solved: solvedSet.has(p.id),
      locked: !!p.is_premium,
      subTopic: p.subTopicTitle ?? "General",
      subTopicId: p.subTopicId ?? "",
      problemType: p.problemType as ProblemType,
      hasSolution: !!p.solution,
    }));
  }, [rawProblems, solvedSet]);

  // Group by sub-topic preserving order
  const grouped = useMemo(() => {
    const map = new Map<string, FocusProblem[]>();
    problems.forEach((p) => {
      const bucket = map.get(p.subTopic) ?? [];
      bucket.push(p);
      map.set(p.subTopic, bucket);
    });
    return map;
  }, [problems]);

  return {
    problems,
    grouped,
    isLoading,
    skillSlug: skill?.slug,
    skillName: skill?.name,
  };
}
