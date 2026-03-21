import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface NextLesson {
  id: string;
  title: string;
  slug: string;
  courseSlug: string;
  courseId: string;
  courseName: string;
}

interface TodaysFocusData {
  nextLesson: NextLesson | null;
  hasActiveCourse: boolean;
  hasCompletedLessons: boolean;
  loading: boolean;
}

export const useTodaysFocus = (userId: string | null, activeCourseSlug?: string, activeCourseId?: string, activeCourseName?: string) => {
  const navigate = useNavigate();
  const [data, setData] = useState<TodaysFocusData>({
    nextLesson: null,
    hasActiveCourse: false,
    hasCompletedLessons: false,
    loading: true,
  });

  useEffect(() => {
    if (!userId || !activeCourseId) {
      setData(prev => ({ ...prev, loading: false, hasActiveCourse: false }));
      return;
    }

    const fetchNextLesson = async () => {
      try {
        // Get all published lessons for the course, ordered
        const { data: lessons } = await supabase
          .from("posts")
          .select("id, title, slug, sort_order")
          .eq("category_id", activeCourseId)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("sort_order", { ascending: true });

        if (!lessons || lessons.length === 0) {
          setData({ nextLesson: null, hasActiveCourse: true, hasCompletedLessons: false, loading: false });
          return;
        }

        // Get completed lesson IDs
        const { data: completedProgress } = await supabase
          .from("lesson_progress")
          .select("lesson_id")
          .eq("user_id", userId)
          .eq("course_id", activeCourseId)
          .eq("completed", true);

        const completedIds = new Set((completedProgress || []).map(p => p.lesson_id));
        const hasCompleted = completedIds.size > 0;

        // Find first uncompleted lesson
        const nextUncompleted = lessons.find(l => !completedIds.has(l.id));

        if (nextUncompleted) {
          setData({
            nextLesson: {
              id: nextUncompleted.id,
              title: nextUncompleted.title,
              slug: nextUncompleted.slug,
              courseSlug: activeCourseSlug || "",
              courseId: activeCourseId,
              courseName: activeCourseName || "",
            },
            hasActiveCourse: true,
            hasCompletedLessons: hasCompleted,
            loading: false,
          });
        } else {
          // All completed
          setData({
            nextLesson: null,
            hasActiveCourse: true,
            hasCompletedLessons: true,
            loading: false,
          });
        }
      } catch (error) {
        console.error("Error fetching next lesson:", error);
        setData(prev => ({ ...prev, loading: false }));
      }
    };

    fetchNextLesson();
  }, [userId, activeCourseId, activeCourseSlug, activeCourseName]);

  const handleContinueLearning = useCallback(() => {
    if (data.nextLesson) {
      navigate(`/course/${data.nextLesson.courseSlug}?lesson=${data.nextLesson.slug}&tab=lessons`);
    } else if (data.hasActiveCourse && activeCourseSlug) {
      // All lessons completed - go to course page
      navigate(`/course/${activeCourseSlug}`);
    } else {
      // No active course - go to courses page
      navigate("/courses");
    }
  }, [data, navigate, activeCourseSlug]);

  const handleDailyQuiz = useCallback(() => {
    if (!data.hasCompletedLessons) return;
    // Navigate to arcade/quiz with course context
    if (activeCourseSlug) {
      navigate(`/arcade?course=${activeCourseSlug}&mode=quiz`);
    } else {
      navigate("/arcade");
    }
  }, [data, navigate, activeCourseSlug]);

  const handleDebugPractice = useCallback(() => {
    if (!data.nextLesson) return;
    // Navigate to practice lab with lesson context
    navigate(`/profile?tab=practice`);
  }, [data, navigate]);

  return {
    ...data,
    handleContinueLearning,
    handleDailyQuiz,
    handleDebugPractice,
  };
};
