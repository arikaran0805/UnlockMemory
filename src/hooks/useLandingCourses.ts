import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LandingCourse {
  id: string;
  name: string;
  slug: string;
  level: string | null;
  featured_image: string | null;
  learning_hours: number | null;
  icon: string | null;
  enrollmentCount: number;
  averageRating: number;
}

export function useLandingCourses() {
  return useQuery<LandingCourse[]>({
    queryKey: ["landing-courses"],
    queryFn: async () => {
      // 1. Fetch published featured courses
      const { data: courses, error } = await supabase
        .from("courses")
        .select("id, name, slug, level, featured_image, learning_hours, icon")
        .eq("status", "published")
        .eq("featured", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      if (!courses || courses.length === 0) return [];

      const courseIds = courses.map((c) => c.id);

      // 2. Batch-fetch enrollments + reviews in parallel — one query each
      const [enrollmentsResult, reviewsResult] = await Promise.all([
        supabase
          .from("course_enrollments")
          .select("course_id")
          .in("course_id", courseIds),
        supabase
          .from("course_reviews")
          .select("course_id, rating")
          .in("course_id", courseIds),
      ]);

      // Aggregate enrollment count per course
      const enrollmentCounts: Record<string, number> = {};
      for (const row of enrollmentsResult.data ?? []) {
        enrollmentCounts[row.course_id] = (enrollmentCounts[row.course_id] ?? 0) + 1;
      }

      // Aggregate average rating per course
      const ratingBuckets: Record<string, { sum: number; count: number }> = {};
      for (const row of reviewsResult.data ?? []) {
        if (!ratingBuckets[row.course_id]) {
          ratingBuckets[row.course_id] = { sum: 0, count: 0 };
        }
        ratingBuckets[row.course_id].sum += row.rating;
        ratingBuckets[row.course_id].count += 1;
      }

      return courses.map((c) => ({
        ...c,
        enrollmentCount: enrollmentCounts[c.id] ?? 0,
        averageRating: ratingBuckets[c.id]
          ? Math.round((ratingBuckets[c.id].sum / ratingBuckets[c.id].count) * 10) / 10
          : 0,
      })) as LandingCourse[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
