/**
 * Hook to compute real lesson-based progress for enrolled courses.
 * Returns a Map of courseId → { completed, total, percentage, lastPracticedAt }.
 * Used by PracticeLab to filter and display "Your Active Labs".
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LabProgress {
  courseId: string;
  completed: number;
  total: number;
  percentage: number;
  lastPracticedAt: string | null;
}

export function useActiveLabsProgress(
  userId: string | undefined,
  courseIds: string[]
) {
  return useQuery({
    queryKey: ["active-labs-progress", userId, courseIds],
    enabled: !!userId && courseIds.length > 0,
    queryFn: async () => {
      if (!userId || courseIds.length === 0) return new Map<string, LabProgress>();

      // 1 & 2: Fetch lessons and progress in parallel (independent queries)
      const [{ data: courseLessons }, { data: progressData }] = await Promise.all([
        supabase
          .from("course_lessons" as any)
          .select("id, course_id")
          .in("course_id", courseIds)
          .eq("is_published", true)
          .is("deleted_at", null),
        supabase
          .from("lesson_progress")
          .select("course_id, completed, viewed_at")
          .eq("user_id", userId)
          .in("course_id", courseIds),
      ]);

      // Count lessons per course
      const totalByCourseLessons: Record<string, number> = {};
      (courseLessons || []).forEach((lesson: any) => {
        totalByCourseLessons[lesson.course_id] =
          (totalByCourseLessons[lesson.course_id] || 0) + 1;
      });

      // Count completed lessons per course + track latest viewed_at
      const completedByCourse: Record<string, number> = {};
      const lastPracticedByCourse: Record<string, string> = {};

      (progressData || []).forEach((p) => {
        if (p.completed) {
          completedByCourse[p.course_id] =
            (completedByCourse[p.course_id] || 0) + 1;
        }
        // Track latest activity (viewed_at)
        const prev = lastPracticedByCourse[p.course_id];
        if (!prev || p.viewed_at > prev) {
          lastPracticedByCourse[p.course_id] = p.viewed_at;
        }
      });

      // 3. Build progress map
      const result = new Map<string, LabProgress>();
      for (const courseId of courseIds) {
        const total = totalByCourseLessons[courseId] || 0;
        const completed = completedByCourse[courseId] || 0;
        const percentage =
          total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

        result.set(courseId, {
          courseId,
          completed,
          total,
          percentage,
          lastPracticedAt: lastPracticedByCourse[courseId] || null,
        });
      }

      return result;
    },
    staleTime: 2 * 60 * 1000,
  });
}
