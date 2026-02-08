import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EliminateWrongMapping {
  id: string;
  eliminate_wrong_problem_id: string;
  sub_topic_id: string;
  display_order: number;
  context_note: string | null;
  created_at: string;
  created_by: string | null;
}

export function useEliminateWrongMappingsBySkill(
  skillId: string | undefined,
  subTopicIds: string[]
) {
  return useQuery({
    queryKey: ["eliminate-wrong-mappings-by-skill", skillId, subTopicIds],
    queryFn: async () => {
      if (!skillId || subTopicIds.length === 0) return [];
      const { data, error } = await supabase
        .from("eliminate_wrong_mappings")
        .select("*, eliminate_wrong_problems(*)")
        .in("sub_topic_id", subTopicIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!skillId && subTopicIds.length > 0,
  });
}

export function useCreateEliminateWrongMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mapping: {
      eliminate_wrong_problem_id: string;
      sub_topic_id: string;
      display_order?: number;
      context_note?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("eliminate_wrong_mappings")
        .insert({
          eliminate_wrong_problem_id: mapping.eliminate_wrong_problem_id,
          sub_topic_id: mapping.sub_topic_id,
          display_order: mapping.display_order || 0,
          context_note: mapping.context_note,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-mappings-by-skill"] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics"] });
      toast.success("Problem attached successfully");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.error("This problem is already attached to this sub-topic");
      } else {
        toast.error(`Failed to attach problem: ${error.message}`);
      }
    },
  });
}

export function useDeleteEliminateWrongMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; subTopicId: string; problemId: string }) => {
      const { error } = await supabase
        .from("eliminate_wrong_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eliminate-wrong-mappings-by-skill"] });
      queryClient.invalidateQueries({ queryKey: ["sub-topics"] });
      toast.success("Problem detached successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to detach problem: ${error.message}`);
    },
  });
}
