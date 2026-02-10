import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface FixErrorProblem {
  id: string;
  skill_id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  language: string;
  tags: string[];
  description: string;
  buggy_code: string;
  correct_code: string;
  validation_type: "test_cases" | "output_comparison" | "custom_function";
  comparison_mode: "exact" | "trimmed" | "numeric_tolerance" | "json_deep";
  test_cases: TestCase[];
  expected_output: string;
  custom_validator: string;
  failure_message: string;
  success_message: string;
  hints: string[];
  status: string;
  display_order: number;
  is_premium: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

function transformProblem(row: any): FixErrorProblem {
  return {
    ...row,
    tags: (row.tags || []) as string[],
    test_cases: (row.test_cases || []) as TestCase[],
    hints: (row.hints || []) as string[],
  };
}

export function useFixErrorProblems(skillId: string | undefined) {
  return useQuery({
    queryKey: ["fix-error-problems", skillId],
    queryFn: async () => {
      if (!skillId) return [];
      const { data, error } = await supabase
        .from("fix_error_problems")
        .select("*")
        .eq("skill_id", skillId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []).map(transformProblem);
    },
    enabled: !!skillId,
  });
}

export function useFixErrorProblem(id: string | undefined) {
  return useQuery({
    queryKey: ["fix-error-problem", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("fix_error_problems")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    enabled: !!id,
  });
}

export type CreateFixErrorInput = Omit<FixErrorProblem, "id" | "created_at" | "updated_at" | "created_by">;

export function useCreateFixErrorProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFixErrorInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("fix_error_problems")
        .insert({
          ...input,
          test_cases: input.test_cases as any,
          hints: input.hints as any,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fix-error-problems", data.skill_id] });
      toast.success("Fix the Error problem created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateFixErrorProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FixErrorProblem> & { id: string }) => {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) payload[key] = value;
      }
      const { data, error } = await supabase
        .from("fix_error_problems")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["fix-error-problems", data.skill_id] });
      queryClient.invalidateQueries({ queryKey: ["fix-error-problem", variables.id] });
      toast.success("Problem updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteFixErrorProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, skillId }: { id: string; skillId: string }) => {
      const { error } = await supabase
        .from("fix_error_problems")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { skillId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["fix-error-problems", data.skillId] });
      toast.success("Problem deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
