import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Reorder sub-topics within a lesson by updating display_order */
export function useReorderSubTopics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; display_order: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from("sub_topics")
          .update({ display_order: item.display_order })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub-topics"] });
    },
  });
}

/** Reorder problem mappings within a sub-topic by updating display_order */
export function useReorderProblemMappings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: { id: string; display_order: number; table: "problem_mappings" | "predict_output_mappings" | "fix_error_mappings" | "eliminate_wrong_mappings" }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from(item.table)
          .update({ display_order: item.display_order })
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["problem-mappings-by-skill"] });
      queryClient.invalidateQueries({ queryKey: ["predict-output-mappings-by-skill"] });
      queryClient.invalidateQueries({ queryKey: ["fix-error-mappings-by-skill"] });
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-mappings-by-skill"] });
      queryClient.invalidateQueries({ queryKey: ["problem-mappings"] });
    },
  });
}
