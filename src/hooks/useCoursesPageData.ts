import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicCourseCardCourse } from "@/components/PublicCourseCard";

export interface CoursePageItem extends PublicCourseCardCourse {
  excerpt: string;
}

// Exported so App.tsx can prefetch if desired
export const COURSES_PAGE_KEY = ["courses-page"] as const;

export async function fetchCoursesPageData(): Promise<CoursePageItem[]> {
  // Fire all three queries in parallel — no waterfall
  const [{ data: courses, error }, enrollmentsResult, reviewsResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, name, slug, description, featured_image, level, icon")
      .eq("status", "published")
      .order("name", { ascending: true }),
    supabase.from("course_enrollments").select("course_id"),
    supabase.from("course_reviews").select("course_id, rating"),
  ]);

  if (error) throw error;
  if (!courses) return [];

  // Build O(1) lookup maps instead of per-course filter passes
  const enrollmentCounts: Record<string, number> = {};
  for (const row of enrollmentsResult.data ?? []) {
    enrollmentCounts[row.course_id] = (enrollmentCounts[row.course_id] ?? 0) + 1;
  }

  const ratingBuckets: Record<string, { sum: number; count: number }> = {};
  for (const row of reviewsResult.data ?? []) {
    if (!ratingBuckets[row.course_id]) {
      ratingBuckets[row.course_id] = { sum: 0, count: 0 };
    }
    ratingBuckets[row.course_id].sum += row.rating;
    ratingBuckets[row.course_id].count += 1;
  }

  return courses.map((course: any) => ({
    id: course.id,
    name: course.name,
    excerpt: course.description || "Explore this course and learn new skills",
    slug: course.slug,
    featured_image: course.featured_image,
    level: course.level ?? null,
    icon: course.icon ?? null,
    enrollmentCount: enrollmentCounts[course.id] ?? 0,
    averageRating: ratingBuckets[course.id]
      ? Math.round((ratingBuckets[course.id].sum / ratingBuckets[course.id].count) * 10) / 10
      : 0,
  }));
}

/**
 * Cached course list for the /courses page.
 * Replaces the previous N+1 pattern (1 + N enrollment + N review queries).
 * Now: 3 parallel queries total, cached for 5 minutes.
 */
export function useCoursesPageData() {
  return useQuery<CoursePageItem[]>({
    queryKey: COURSES_PAGE_KEY,
    queryFn: fetchCoursesPageData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
