import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SkillProgress {
  skillId: string;
  totalProblems: number;
  solvedProblems: number;
  percentage: number;
}

/**
 * Fetches real progress across all published practice skills for a user.
 * Counts published problems per skill (via direct skill_id + sub_topic mappings)
 * and solved problems from learner_problem_progress.
 */
export function useSkillsProgress(userId: string | undefined, skillIds: string[]) {
  return useQuery({
    queryKey: ["skills-progress", userId, skillIds],
    queryFn: async () => {
      if (!userId || skillIds.length === 0) return new Map<string, SkillProgress>();

      // 1 & 2: Fetch direct problems and mapped problems in parallel (independent queries)
      const [{ data: directProblems }, { data: mappedProblems }] = await Promise.all([
        supabase
          .from("practice_problems")
          .select("id, skill_id")
          .in("skill_id", skillIds)
          .eq("status", "published"),
        supabase
          .from("problem_mappings")
          .select(`
            problem_id,
            sub_topics!inner(skill_id),
            practice_problems!inner(id, status)
          `)
          .in("sub_topics.skill_id", skillIds)
          .eq("practice_problems.status", "published"),
      ]);

      // Build a map: skillId -> Set of problem IDs
      const skillProblemMap = new Map<string, Set<string>>();
      for (const sid of skillIds) {
        skillProblemMap.set(sid, new Set());
      }

      // Add direct problems
      for (const p of directProblems || []) {
        skillProblemMap.get(p.skill_id)?.add(p.id);
      }

      // Add mapped problems
      for (const m of mappedProblems || []) {
        const skillId = (m.sub_topics as any)?.skill_id;
        if (skillId && skillProblemMap.has(skillId)) {
          skillProblemMap.get(skillId)?.add(m.problem_id);
        }
      }

      // 3. Collect all unique problem IDs to query progress
      const allProblemIds = new Set<string>();
      for (const ids of skillProblemMap.values()) {
        for (const id of ids) allProblemIds.add(id);
      }

      // 4. Get user's solved problems
      const solvedSet = new Set<string>();
      if (allProblemIds.size > 0) {
        const { data: progress } = await supabase
          .from("learner_problem_progress")
          .select("problem_id")
          .eq("user_id", userId)
          .eq("status", "solved")
          .in("problem_id", Array.from(allProblemIds));

        for (const p of progress || []) {
          solvedSet.add(p.problem_id);
        }
      }

      // 5. Build result map
      const result = new Map<string, SkillProgress>();
      for (const [skillId, problemIds] of skillProblemMap) {
        const total = problemIds.size;
        let solved = 0;
        for (const pid of problemIds) {
          if (solvedSet.has(pid)) solved++;
        }
        result.set(skillId, {
          skillId,
          totalProblems: total,
          solvedProblems: solved,
          percentage: total > 0 ? Math.round((solved / total) * 100) : 0,
        });
      }

      return result;
    },
    enabled: !!userId && skillIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
