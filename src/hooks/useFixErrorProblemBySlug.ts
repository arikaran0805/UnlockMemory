import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FixErrorProblem, TestCase } from "./useFixErrorProblems";

function transformProblem(row: any): FixErrorProblem {
  return {
    ...row,
    tags: (row.tags || []) as string[],
    test_cases: (row.test_cases || []) as TestCase[],
    hints: (row.hints || []) as string[],
  };
}

/**
 * Fetch a single published Fix the Error problem by slug.
 */
export function usePublishedFixErrorProblem(slug: string | undefined) {
  return useQuery({
    queryKey: ["fix-error-problem-by-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("fix_error_problems")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (error) return null;
      return transformProblem(data);
    },
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}
