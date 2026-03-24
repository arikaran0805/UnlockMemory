import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface CourseProgress {
  totalLessons: number;
  publishedLessons: number;
  viewedLessons: number;
  completedLessons: number;
  totalProblems: number;
  solvedProblems: number;
  percentage: number;
}

interface LessonStatus {
  lessonId: string;
  viewed: boolean;
  completed: boolean;
}

// initialLessonMap: lessonId → completed boolean, built from prefetched data
export const useCourseProgress = (
  courseId: string | undefined,
  user?: User | null,
  initialLessonMap?: Record<string, boolean>
) => {
  const buildInitialStatuses = (): Map<string, LessonStatus> => {
    if (!initialLessonMap) return new Map();
    return new Map(
      Object.entries(initialLessonMap).map(([id, completed]) => [
        id, { lessonId: id, viewed: true, completed },
      ])
    );
  };

  const buildInitialProgress = (): CourseProgress => {
    if (!initialLessonMap) return {
      totalLessons: 0, publishedLessons: 0, viewedLessons: 0,
      completedLessons: 0, totalProblems: 0, solvedProblems: 0, percentage: 0,
    };
    const entries = Object.values(initialLessonMap);
    const total = entries.length;
    const completed = entries.filter(Boolean).length;
    return {
      totalLessons: total,
      publishedLessons: total,
      viewedLessons: completed,
      completedLessons: completed,
      totalProblems: 0,
      solvedProblems: 0,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const [progress, setProgress] = useState<CourseProgress>(buildInitialProgress);
  const [lessonStatuses, setLessonStatuses] = useState<Map<string, LessonStatus>>(buildInitialStatuses);
  // If initialLessonMap provided, skip loading gate — render immediately
  const [loading, setLoading] = useState(!initialLessonMap);

  const fetchProgress = useCallback(async () => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    try {
      // Resolve user: use passed-in user if provided, otherwise fetch from auth
      const resolvedUser = user !== undefined ? user : (await supabase.auth.getUser()).data.user;

      // Wave 1: run all independent queries in parallel
      const [totalResult, publishedResult, skillResult, progressResult] = await Promise.all([
        supabase
          .from("course_lessons" as any)
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .is('deleted_at', null),
        supabase
          .from("course_lessons" as any)
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('is_published', true)
          .is('deleted_at', null),
        supabase
          .from("practice_skills")
          .select("id")
          .eq("course_id", courseId)
          .eq("status", "published")
          .maybeSingle(),
        resolvedUser
          ? supabase
              .from('lesson_progress')
              .select('lesson_id, completed')
              .eq('user_id', resolvedUser.id)
              .eq('course_id', courseId)
          : Promise.resolve({ data: null }),
      ]);

      const totalLessons = totalResult.count || 0;
      const publishedLessons = publishedResult.count || 0;
      const skill = skillResult.data;

      // Wave 2: practice problems (conditional, only if skill exists)
      let totalProblems = 0;
      let solvedProblems = 0;

      if (skill) {
        const { data: subTopics } = await supabase
          .from("sub_topics")
          .select("problem_mappings(problem_id)")
          .eq("skill_id", skill.id);

        if (subTopics) {
          let allProblemIds: string[] = [];
          subTopics.forEach((st: any) => {
            const ids = (st.problem_mappings || []).map((pm: any) => pm.problem_id);
            allProblemIds = [...allProblemIds, ...ids];
          });
          allProblemIds = [...new Set(allProblemIds)];
          totalProblems = allProblemIds.length;

          if (resolvedUser && allProblemIds.length > 0) {
            const { count } = await supabase
              .from("learner_problem_progress")
              .select("*", { count: "exact", head: true })
              .eq("user_id", resolvedUser.id)
              .eq("status", "solved")
              .in("problem_id", allProblemIds);
            solvedProblems = count || 0;
          }
        }
      }

      if (!resolvedUser) {
        const percentage = totalLessons > 0
          ? Math.min(100, Math.round((publishedLessons / totalLessons) * 100))
          : 0;
        setProgress({
          totalLessons,
          publishedLessons,
          viewedLessons: 0,
          completedLessons: 0,
          totalProblems,
          solvedProblems: 0,
          percentage,
        });
        setLessonStatuses(new Map());
        setLoading(false);
        return;
      }

      const progressData = (progressResult as any).data || [];
      const viewedLessons = progressData.length;
      const completedLessons = progressData.filter((p: any) => p.completed).length;
      const percentage = totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0;

      const statusMap = new Map<string, LessonStatus>();
      progressData.forEach((p: any) => {
        statusMap.set(p.lesson_id, {
          lessonId: p.lesson_id,
          viewed: true,
          completed: p.completed,
        });
      });
      setLessonStatuses(statusMap);

      setProgress({
        totalLessons,
        publishedLessons,
        viewedLessons,
        completedLessons,
        totalProblems,
        solvedProblems,
        percentage,
      });
    } catch (error) {
      console.error('Error fetching course progress:', error);
    } finally {
      setLoading(false);
    }
  }, [courseId, user]);

  const markLessonViewed = useCallback(async (lessonId: string) => {
    if (!courseId) return false;
    try {
      const resolvedUser = user !== undefined ? user : (await supabase.auth.getUser()).data.user;
      if (!resolvedUser) return false;
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: resolvedUser.id,
          lesson_id: lessonId,
          course_id: courseId,
          viewed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
      if (error) throw error;
      await fetchProgress();
      return true;
    } catch (error) {
      console.error('Error marking lesson as viewed:', error);
      return false;
    }
  }, [courseId, user, fetchProgress]);

  const markLessonCompleted = useCallback(async (lessonId: string, completed: boolean = true) => {
    if (!courseId) return false;
    try {
      const resolvedUser = user !== undefined ? user : (await supabase.auth.getUser()).data.user;
      if (!resolvedUser) return false;
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: resolvedUser.id,
          lesson_id: lessonId,
          course_id: courseId,
          completed,
          viewed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
      if (error) throw error;
      await fetchProgress();
      return true;
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
      return false;
    }
  }, [courseId, user, fetchProgress]);

  const isLessonCompleted = useCallback((lessonId: string): boolean => {
    return lessonStatuses.get(lessonId)?.completed || false;
  }, [lessonStatuses]);

  const isLessonViewed = useCallback((lessonId: string): boolean => {
    return lessonStatuses.has(lessonId);
  }, [lessonStatuses]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return {
    progress,
    loading,
    lessonStatuses,
    markLessonViewed,
    markLessonCompleted,
    isLessonCompleted,
    isLessonViewed,
    refetch: fetchProgress,
  };
};
