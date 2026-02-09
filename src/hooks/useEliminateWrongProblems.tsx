import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ═══ Types ═══

export interface EliminateWrongOption {
  id: string;
  label: string;
  content: string;
  content_type: "text" | "code" | "output";
  is_correct: boolean;
  explanation: string;
}

export interface EliminateWrongProblem {
  id: string;
  skill_id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  language: string;
  tags: string[];
  description: string;
  context_code: string;
  selection_mode: "single" | "multiple";
  options: EliminateWrongOption[];
  shuffle_options: boolean;
  allow_partial_credit: boolean;
  allow_retry: boolean;
  explanation: string;
  hints: string[];
  status: string;
  display_order: number;
  is_premium: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EliminateWrongAttempt {
  id: string;
  user_id: string;
  problem_id: string;
  selected_options: string[];
  is_correct: boolean;
  score: number;
  created_at: string;
}

// ═══ Transform ═══

function transformProblem(row: any): EliminateWrongProblem {
  return {
    ...row,
    tags: (row.tags || []) as string[],
    options: (row.options || []) as EliminateWrongOption[],
    hints: (row.hints || []) as string[],
  };
}

// ═══ Admin Hooks ═══

export function useEliminateWrongProblems(skillId: string | undefined) {
  return useQuery({
    queryKey: ["eliminate-wrong-problems", skillId],
    queryFn: async () => {
      if (!skillId) return [];
      const { data, error } = await supabase
        .from("eliminate_wrong_problems")
        .select("*")
        .eq("skill_id", skillId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []).map(transformProblem);
    },
    enabled: !!skillId,
  });
}

export function useEliminateWrongProblem(id: string | undefined) {
  return useQuery({
    queryKey: ["eliminate-wrong-problem", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("eliminate_wrong_problems")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    enabled: !!id,
  });
}

// ═══ Published Hooks (Learner) ═══

export function usePublishedEliminateWrongProblem(slug: string | undefined) {
  return useQuery({
    queryKey: ["published-eliminate-wrong-problem", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("eliminate_wrong_problems")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (error) return null;
      return transformProblem(data);
    },
    enabled: !!slug,
  });
}

// ═══ Attempts ═══

export function useEliminateWrongAttempts(problemId: string | undefined) {
  return useQuery({
    queryKey: ["eliminate-wrong-attempts", problemId],
    queryFn: async () => {
      if (!problemId) return [];
      const { data, error } = await supabase
        .from("eliminate_wrong_attempts")
        .select("*")
        .eq("problem_id", problemId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EliminateWrongAttempt[];
    },
    enabled: !!problemId,
  });
}

export function useSubmitEliminateWrongAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      problem_id: string;
      selected_options: string[];
      is_correct: boolean;
      score: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Must be logged in");

      // Insert attempt
      const { data, error } = await supabase
        .from("eliminate_wrong_attempts")
        .insert({
          user_id: userData.user.id,
          problem_id: input.problem_id,
          selected_options: input.selected_options as any,
          is_correct: input.is_correct,
          score: input.score,
        })
        .select()
        .single();
      if (error) throw error;

      // Update learner_problem_progress for checkmark tracking
      const progressData: any = {
        user_id: userData.user.id,
        problem_id: input.problem_id,
        status: input.is_correct ? "solved" : "attempted",
        attempts: 1,
        updated_at: new Date().toISOString(),
      };
      if (input.is_correct) {
        progressData.solved_at = new Date().toISOString();
      }
      await supabase
        .from("learner_problem_progress")
        .upsert(progressData, { onConflict: "user_id,problem_id" });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-attempts", data.problem_id] });
      queryClient.invalidateQueries({ queryKey: ["learner-progress"] });
    },
  });
}

// ═══ CRUD Mutations ═══

export function useCreateEliminateWrongProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<EliminateWrongProblem, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("eliminate_wrong_problems")
        .insert({
          ...input,
          options: input.options as any,
          hints: input.hints as any,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-problems", data.skill_id] });
      toast.success("Problem created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEliminateWrongProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EliminateWrongProblem> & { id: string }) => {
      const payload: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) payload[key] = value;
      }
      const { data, error } = await supabase
        .from("eliminate_wrong_problems")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return transformProblem(data);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-problems", data.skill_id] });
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-problem", variables.id] });
      toast.success("Problem updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEliminateWrongProblem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, skillId }: { id: string; skillId: string }) => {
      const { error } = await supabase
        .from("eliminate_wrong_problems")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { skillId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-problems", data.skillId] });
      toast.success("Problem deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
