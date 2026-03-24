import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface CourseStats {
  enrollmentCount: number;
  averageRating: number;
  reviewCount: number;
  isEnrolled: boolean;
  userReview: {
    rating: number;
    review: string | null;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  user_id: string;
  is_anonymous?: boolean;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const useCourseStats = (
  courseId: string | undefined,
  user: User | null,
  initialStats?: Partial<CourseStats>
) => {
  const [stats, setStats] = useState<CourseStats>({
    enrollmentCount: 0,
    averageRating: 0,
    reviewCount: 0,
    isEnrolled: false,
    userReview: null,
    ...initialStats,
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  // If initialStats provided, skip loading gate — render immediately
  const [loading, setLoading] = useState(!initialStats);
  const [enrolling, setEnrolling] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!courseId) return;

    try {
      // Run all queries in parallel
      const [enrollmentCountResult, reviewsResult, userEnrollmentResult, userReviewResult] = await Promise.all([
        supabase
          .from("course_enrollments")
          .select("*", { count: "exact", head: true })
          .eq("course_id", courseId),
        supabase
          .from("course_reviews")
          .select(`id, rating, review, created_at, user_id, is_anonymous, profiles:user_id (full_name, avatar_url)`)
          .eq("course_id", courseId)
          .order("created_at", { ascending: false }),
        user
          ? supabase.from("course_enrollments").select("id").eq("course_id", courseId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase.from("course_reviews").select("rating, review").eq("course_id", courseId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const reviewsList = reviewsResult.data || [];
      const averageRating = reviewsList.length > 0
        ? reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length
        : 0;

      setStats({
        enrollmentCount: enrollmentCountResult.count || 0,
        averageRating,
        reviewCount: reviewsList.length,
        isEnrolled: !!(userEnrollmentResult as any).data,
        userReview: (userReviewResult as any).data ?? null,
      });
      setReviews(reviewsList);
    } catch (error) {
      console.error("Error fetching course stats:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId, user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const enroll = async () => {
    if (!courseId || !user) return false;

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from("course_enrollments")
        .insert({ course_id: courseId, user_id: user.id });

      if (error) throw error;

      // Create enrollment achievement
      const { data: course } = await supabase
        .from("courses")
        .select("name")
        .eq("id", courseId)
        .single();

      await supabase
        .from("achievements")
        .insert({
          user_id: user.id,
          achievement_type: "enrollment",
          achievement_name: "Course Enrolled",
          description: `Enrolled in ${course?.name || 'a course'}`,
          icon: "BookOpen",
          color: "blue",
        });

      setStats(prev => ({
        ...prev,
        isEnrolled: true,
        enrollmentCount: prev.enrollmentCount + 1,
      }));
      return true;
    } catch (error) {
      console.error("Error enrolling:", error);
      return false;
    } finally {
      setEnrolling(false);
    }
  };

  const unenroll = async () => {
    if (!courseId || !user) return false;

    setEnrolling(true);
    try {
      const { error } = await supabase
        .from("course_enrollments")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", user.id);

      if (error) throw error;

      setStats(prev => ({
        ...prev,
        isEnrolled: false,
        enrollmentCount: Math.max(0, prev.enrollmentCount - 1),
      }));
      return true;
    } catch (error) {
      console.error("Error unenrolling:", error);
      return false;
    } finally {
      setEnrolling(false);
    }
  };

  const submitReview = async (rating: number, review: string, isAnonymous: boolean = false) => {
    if (!courseId || !user) return false;

    try {
      if (stats.userReview) {
        // Update existing review
        const { error } = await supabase
          .from("course_reviews")
          .update({ rating, review, is_anonymous: isAnonymous })
          .eq("course_id", courseId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert new review
        const { error } = await supabase
          .from("course_reviews")
          .insert({ 
            course_id: courseId, 
            user_id: user.id, 
            rating, 
            review,
            is_anonymous: isAnonymous 
          });

        if (error) throw error;
      }

      await fetchStats();
      return true;
    } catch (error) {
      console.error("Error submitting review:", error);
      return false;
    }
  };

  const deleteReview = async () => {
    if (!courseId || !user) return false;

    try {
      const { error } = await supabase
        .from("course_reviews")
        .delete()
        .eq("course_id", courseId)
        .eq("user_id", user.id);

      if (error) throw error;

      await fetchStats();
      return true;
    } catch (error) {
      console.error("Error deleting review:", error);
      return false;
    }
  };

  return {
    stats,
    reviews,
    loading,
    enrolling,
    enroll,
    unenroll,
    submitReview,
    deleteReview,
    refetch: fetchStats,
  };
};