import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LearnerProblemProgress {
  id: string;
  user_id: string;
  problem_id: string;
  status: "unsolved" | "attempted" | "solved";
  solved_at: string | null;
  attempts: number;
  best_runtime_ms: number | null;
  best_memory_mb: number | null;
  created_at: string;
  updated_at: string;
}

export function useLearnerProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ["learner-progress", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("learner_problem_progress")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as LearnerProblemProgress[];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useLearnerProgressByProblem(userId: string | undefined, problemId: string | undefined) {
  return useQuery({
    queryKey: ["learner-progress", userId, problemId],
    queryFn: async () => {
      if (!userId || !problemId) return null;
      const { data, error } = await supabase
        .from("learner_problem_progress")
        .select("*")
        .eq("user_id", userId)
        .eq("problem_id", problemId)
        .maybeSingle();

      if (error) throw error;
      return data as LearnerProblemProgress | null;
    },
    enabled: !!userId && !!problemId,
  });
}

export function useUpdateLearnerProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (progress: {
      problem_id: string;
      status?: "unsolved" | "attempted" | "solved";
      best_runtime_ms?: number;
      best_memory_mb?: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const updateData: any = {
        user_id: userData.user.id,
        problem_id: progress.problem_id,
        attempts: 1, // Will be incremented by upsert
        updated_at: new Date().toISOString(),
      };

      if (progress.status) {
        updateData.status = progress.status;
        if (progress.status === "solved") {
          updateData.solved_at = new Date().toISOString();
        }
      }

      if (progress.best_runtime_ms !== undefined) {
        updateData.best_runtime_ms = progress.best_runtime_ms;
      }
      if (progress.best_memory_mb !== undefined) {
        updateData.best_memory_mb = progress.best_memory_mb;
      }

      const { data, error } = await supabase
        .from("learner_problem_progress")
        .upsert(updateData, {
          onConflict: "user_id,problem_id",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["learner-progress", data.user_id] });
      queryClient.invalidateQueries({ queryKey: ["learner-progress", data.user_id, data.problem_id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update progress: ${error.message}`);
    },
  });
}

// Calculate progress stats for a sub-topic
export function useSubTopicProgress(userId: string | undefined, subTopicId: string | undefined) {
  return useQuery({
    queryKey: ["sub-topic-progress", userId, subTopicId],
    queryFn: async () => {
      if (!userId || !subTopicId) return null;

      // Get all problem mappings for this sub-topic
      const { data: mappings, error: mappingsError } = await supabase
        .from("problem_mappings")
        .select("problem_id")
        .eq("sub_topic_id", subTopicId);

      if (mappingsError) throw mappingsError;

      const problemIds = (mappings || []).map((m) => m.problem_id);
      if (problemIds.length === 0) return { total: 0, solved: 0, attempted: 0, percentage: 0 };

      // Get progress for these problems
      const { data: progress, error: progressError } = await supabase
        .from("learner_problem_progress")
        .select("status")
        .eq("user_id", userId)
        .in("problem_id", problemIds);

      if (progressError) throw progressError;

      const solved = (progress || []).filter((p) => p.status === "solved").length;
      const attempted = (progress || []).filter((p) => p.status === "attempted").length;

      return {
        total: problemIds.length,
        solved,
        attempted,
        percentage: Math.round((solved / problemIds.length) * 100),
      };
    },
    enabled: !!userId && !!subTopicId,
  });
}
