import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProblemWithMapping } from "./usePracticeProblems";

const STALE_TIME = 5 * 60 * 1000;

function castArrays(row: any) {
  return {
    ...row,
    tags: row.tags || [],
    hints: row.hints || [],
    options: row.options || [],
    test_cases: row.test_cases || [],
    step_by_step: row.step_by_step || [],
    common_mistakes: row.common_mistakes || [],
    constraints: row.constraints || [],
    examples: row.examples || [],
    starter_code: row.starter_code || {},
    supported_languages: row.supported_languages || ["python"],
    function_signature: row.function_signature || { name: "solution", parameters: [], return_type: "int" },
  };
}

async function fetchPracticeProblem(skillSlug: string, problemSlug: string) {
  const { data: skill } = await supabase
    .from("practice_skills")
    .select("id")
    .eq("slug", skillSlug)
    .eq("status", "published")
    .single();
  if (!skill) return null;
  const { data } = await supabase
    .from("practice_problems")
    .select("*")
    .eq("skill_id", skill.id)
    .eq("slug", problemSlug)
    .eq("status", "published")
    .single();
  return data ? castArrays(data) : null;
}

async function fetchFromTable(table: string, slug: string) {
  const { data } = await supabase
    .from(table)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return data ? castArrays(data) : null;
}

/**
 * Background-prefetches the previous and next problems into React Query cache
 * so navigation between problems is instant (isLoading: false on mount).
 */
export function usePrefetchAdjacentProblems(
  skillSlug: string | undefined,
  prev: ProblemWithMapping | null | undefined,
  next: ProblemWithMapping | null | undefined
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!skillSlug) return;

    [prev, next].forEach((problem) => {
      if (!problem) return;
      const { slug, problemType } = problem;

      if (problemType === "predict-output") {
        queryClient.prefetchQuery({
          queryKey: ["published-predict-output-problem", slug],
          queryFn: () => fetchFromTable("predict_output_problems", slug),
          staleTime: STALE_TIME,
        });
      } else if (problemType === "eliminate-wrong") {
        queryClient.prefetchQuery({
          queryKey: ["published-eliminate-wrong-problem", slug],
          queryFn: () => fetchFromTable("eliminate_wrong_problems", slug),
          staleTime: STALE_TIME,
        });
      } else if (problemType === "fix-error") {
        queryClient.prefetchQuery({
          queryKey: ["fix-error-problem-by-slug", slug],
          queryFn: () => fetchFromTable("fix_error_problems", slug),
          staleTime: STALE_TIME,
        });
      } else {
        queryClient.prefetchQuery({
          queryKey: ["published-practice-problem", skillSlug, slug],
          queryFn: () => fetchPracticeProblem(skillSlug, slug),
          staleTime: STALE_TIME,
        });
      }
    });
  }, [prev?.slug, next?.slug, skillSlug, queryClient]);
}
