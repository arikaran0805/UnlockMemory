import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PracticeSkill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  display_order: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  course_id: string | null;
  problem_count?: number;
  // Joined fields
  course_name?: string;
  course_slug?: string;
}

export function usePracticeSkills() {
  return useQuery({
    queryKey: ["practice-skills"],
    queryFn: async () => {
      // Get skills with direct problem count and course info
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*, practice_problems(count), courses!course_id(name, slug)")
        .order("display_order", { ascending: true });

      if (error) throw error;
      
      // For course-linked skills, also count problems via sub_topics -> problem_mappings
      const skillsWithCourses = (data || []).filter((s: any) => s.course_id);
      const skillIds = skillsWithCourses.map((s: any) => s.id);
      
      let mappedCounts: Record<string, number> = {};
      
      if (skillIds.length > 0) {
        // Get sub-topics for these skills with their problem mapping counts
        const { data: subTopics } = await supabase
          .from("sub_topics")
          .select("skill_id, problem_mappings(count)")
          .in("skill_id", skillIds);
        
        // Aggregate counts by skill_id
        (subTopics || []).forEach((st: any) => {
          const count = st.problem_mappings?.[0]?.count || 0;
          mappedCounts[st.skill_id] = (mappedCounts[st.skill_id] || 0) + count;
        });
      }
      
      // Transform to include problem_count and course info
      return (data || []).map((skill: any) => ({
        ...skill,
        // Use mapped count for course-linked skills, direct count for custom collections
        problem_count: skill.course_id 
          ? (mappedCounts[skill.id] || 0)
          : (skill.practice_problems?.[0]?.count || 0),
        course_name: skill.courses?.name,
        course_slug: skill.courses?.slug,
      })) as PracticeSkill[];
    },
  });
}

export function usePracticeSkill(id: string | undefined) {
  return useQuery({
    queryKey: ["practice-skill", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as PracticeSkill;
    },
    enabled: !!id,
  });
}

export function usePublishedPracticeSkills() {
  return useQuery({
    queryKey: ["published-practice-skills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*")
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PracticeSkill[];
    },
  });
}

export function useCreatePracticeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skill: {
      name: string;
      slug: string;
      description?: string;
      icon?: string;
      display_order?: number;
      status?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("practice_skills")
        .insert({
          name: skill.name,
          slug: skill.slug,
          description: skill.description,
          icon: skill.icon || "Code2",
          display_order: skill.display_order || 0,
          status: skill.status || "draft",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-skills"] });
      toast.success("Practice skill created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create skill: ${error.message}`);
    },
  });
}

export function useUpdatePracticeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PracticeSkill> & { id: string }) => {
      const { data, error } = await supabase
        .from("practice_skills")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["practice-skills"] });
      queryClient.invalidateQueries({ queryKey: ["practice-skill", variables.id] });
      // Also bust the published-skills cache so PracticeLab reflects live-toggle changes immediately
      queryClient.invalidateQueries({ queryKey: ["published-practice-skills"] });
      toast.success("Practice skill updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update skill: ${error.message}`);
    },
  });
}

export function useDeletePracticeSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("practice_skills")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["practice-skills"] });
      toast.success("Practice skill deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete skill: ${error.message}`);
    },
  });
}
