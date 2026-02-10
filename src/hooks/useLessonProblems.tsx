import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LessonProblemCount {
  lessonId: string;
  problemCount: number;
}

/**
 * Hook to get the practice skill linked to a course
 */
export function usePracticeSkillByCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: ["practice-skill-by-course", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from("practice_skills")
        .select("id, slug, name, status")
        .eq("course_id", courseId)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}

/**
 * Hook to get problem counts grouped by lesson for a course
 * Returns a map of lessonId -> problemCount
 */
export function useLessonProblemCounts(courseId: string | undefined) {
  return useQuery({
    queryKey: ["lesson-problem-counts", courseId],
    queryFn: async () => {
      if (!courseId) return new Map<string, number>();

      // First get the practice skill for this course
      const { data: skill } = await supabase
        .from("practice_skills")
        .select("id")
        .eq("course_id", courseId)
        .eq("status", "published")
        .maybeSingle();

      if (!skill) return new Map<string, number>();

      // Get sub-topics for this skill with their problem counts (both types)
      const { data: subTopics, error } = await supabase
        .from("sub_topics")
        .select("lesson_id, problem_mappings(count), predict_output_mappings(count)")
        .eq("skill_id", skill.id);

      if (error) throw error;

      // Aggregate problem counts by lesson
      const countMap = new Map<string, number>();
      
      (subTopics || []).forEach((st: any) => {
        const lessonId = st.lesson_id;
        const regularCount = st.problem_mappings?.[0]?.count || 0;
        const predictCount = st.predict_output_mappings?.[0]?.count || 0;
        const totalCount = regularCount + predictCount;
        
        if (lessonId && totalCount > 0) {
          countMap.set(lessonId, (countMap.get(lessonId) || 0) + totalCount);
        }
      });

      return countMap;
    },
    enabled: !!courseId,
  });
}

/**
 * Hook to get lesson problem completion status
 * Returns a map of lessonId -> allCompleted (boolean)
 */
export function useLessonProblemsCompletion(courseId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["lesson-problems-completion", courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user?.id) return new Map<string, boolean>();

      // Get the practice skill for this course
      const { data: skill } = await supabase
        .from("practice_skills")
        .select("id")
        .eq("course_id", courseId)
        .eq("status", "published")
        .maybeSingle();

      if (!skill) return new Map<string, boolean>();

      // Get sub-topics with both problem mapping types
      const { data: subTopics } = await supabase
        .from("sub_topics")
        .select(`
          lesson_id,
          problem_mappings(problem_id),
          predict_output_mappings(predict_output_problem_id),
          fix_error_mappings(fix_error_problem_id),
          eliminate_wrong_mappings(eliminate_wrong_problem_id)
        `)
        .eq("skill_id", skill.id);

      if (!subTopics) return new Map<string, boolean>();

      // Get all problem IDs grouped by lesson (all types)
      const problemsByLesson = new Map<string, string[]>();
      subTopics.forEach((st: any) => {
        if (!st.lesson_id) return;
        const regularIds = (st.problem_mappings || []).map((pm: any) => pm.problem_id);
        const predictIds = (st.predict_output_mappings || []).map((pm: any) => pm.predict_output_problem_id);
        const fixErrorIds = (st.fix_error_mappings || []).map((pm: any) => pm.fix_error_problem_id);
        const eliminateIds = (st.eliminate_wrong_mappings || []).map((pm: any) => pm.eliminate_wrong_problem_id);
        const allIds = [...regularIds, ...predictIds, ...fixErrorIds, ...eliminateIds];
        const existing = problemsByLesson.get(st.lesson_id) || [];
        problemsByLesson.set(st.lesson_id, [...existing, ...allIds]);
      });

      // Get user's solved problems
      const allProblemIds = Array.from(problemsByLesson.values()).flat();
      if (allProblemIds.length === 0) return new Map<string, boolean>();

      const { data: progress } = await supabase
        .from("learner_problem_progress")
        .select("problem_id, status")
        .eq("user_id", user.id)
        .eq("status", "solved")
        .in("problem_id", allProblemIds);

      const solvedIds = new Set((progress || []).map(p => p.problem_id));

      // Check completion per lesson
      const completionMap = new Map<string, boolean>();
      problemsByLesson.forEach((problemIds, lessonId) => {
        if (problemIds.length === 0) {
          completionMap.set(lessonId, false);
        } else {
          const allSolved = problemIds.every(id => solvedIds.has(id));
          completionMap.set(lessonId, allSolved);
        }
      });

      return completionMap;
    },
    enabled: !!courseId && !!user?.id,
  });
}
