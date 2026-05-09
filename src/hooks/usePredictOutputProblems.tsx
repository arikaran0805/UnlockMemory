import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PredictOutputProblem {
  id: string;
  skill_id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  language: string;
  tags: string[];
  prompt: string | null;
  code: string;
  expected_output: string;
  accepted_outputs: string[];
  match_mode: "strict" | "trim" | "normalized";
  output_type: "single_line" | "multi_line" | "json";
  reveal_allowed: boolean;
  reveal_timing: "anytime" | "after_1" | "after_2";
  reveal_penalty: "no_xp" | "half_xp" | "viewed_solution";
  explanation: string | null;
  step_by_step: string[];
  common_mistakes: string[];
  hints: string[];
  xp_value: number;
  streak_eligible: boolean;
  is_premium: boolean;
  display_order: number;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function transformProblem(row: any): PredictOutputProblem {
  return {
    ...row,
    tags: (row.tags || []) as string[],
    accepted_outputs: (row.accepted_outputs || []) as string[],
    step_by_step: (row.step_by_step || []) as string[],
    common_mistakes: (row.common_mistakes || []) as string[],
    hints: (row.hints || []) as string[],
  };
}

export function usePredictOutputProblems(skillId: string | undefined) {
  return useQuery({
    queryKey: ["predict-output-problems", skillId],
    queryFn: async () => {
      if (!skillId) return [];
      const { data, error } = await supabase
        .from("predict_output_problems")
        .select("*")
        .eq("skill_id", skillId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []).map(transformProblem);
    },
    enabled: !!skillId,
  });
}

export function usePredictOutputProblem(id: string | undefined) {
  return useQuery({
    queryKey: ["predict-output-problem", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("predict_output_problems")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    enabled: !!id,
  });
}

export function usePublishedPredictOutputProblem(slug: string | undefined) {
  return useQuery({
    queryKey: ["published-predict-output-problem", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("predict_output_problems")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    enabled: !!slug,
    placeholderData: (prev) => prev,
  });
}

export function usePublishedPredictOutputProblems(skillId: string | undefined) {
  return useQuery({
    queryKey: ["published-predict-output-problems", skillId],
    queryFn: async () => {
      if (!skillId) return [];
      const { data, error } = await supabase
        .from("predict_output_problems")
        .select("*")
        .eq("skill_id", skillId)
        .eq("status", "published")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []).map(transformProblem);
    },
    enabled: !!skillId,
  });
}

export type CreatePredictOutputInput = Omit<PredictOutputProblem, "id" | "created_at" | "updated_at" | "created_by">;

export function useCreatePredictOutputProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePredictOutputInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("predict_output_problems")
        .insert({
          ...input,
          accepted_outputs: input.accepted_outputs as any,
          step_by_step: input.step_by_step as any,
          common_mistakes: input.common_mistakes as any,
          hints: input.hints as any,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["predict-output-problems", data.skill_id] });
      toast.success("Predict Output problem created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdatePredictOutputProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PredictOutputProblem> & { id: string }) => {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) payload[key] = value;
      }
      const { data, error } = await supabase
        .from("predict_output_problems")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["predict-output-problems", data.skill_id] });
      queryClient.invalidateQueries({ queryKey: ["predict-output-problem", variables.id] });
      toast.success("Problem updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeletePredictOutputProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, skillId }: { id: string; skillId: string }) => {
      const { error } = await supabase
        .from("predict_output_problems")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { skillId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["predict-output-problems", data.skillId] });
      toast.success("Problem deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
