import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicCareerCardData } from "@/components/PublicCareerCard";

// Exported so App.tsx can prefetch if desired
export const CAREERS_PAGE_KEY = ["careers-page"] as const;

export async function fetchCareersPageData(): Promise<PublicCareerCardData[]> {
  // Fire all three queries in parallel — careers + global stats
  // Enrollments and reviews cover all courses; we filter in-memory per career
  const [{ data: careers, error }, enrollmentsResult, reviewsResult] = await Promise.all([
    supabase
      .from("careers")
      .select(
        "id, name, description, icon, slug, color, discount_percentage, is_featured, career_courses(course_id, courses(id, name, description, original_price, discount_price))"
      )
      .eq("status", "published")
      .order("display_order", { ascending: true }),
    supabase.from("course_enrollments").select("course_id"),
    supabase.from("course_reviews").select("course_id, rating"),
  ]);

  if (error) throw error;
  if (!careers) return [];

  // Build O(1) lookup maps
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

  return careers.map((c: any) => {
    const validCCs = (c.career_courses || []).filter((cc: any) => cc.courses);
    const coursesRaw = validCCs.map((cc: any) => ({
      id: cc.courses.id,
      name: cc.courses.name,
      description: cc.courses.description || "",
      originalPrice: Number(cc.courses.original_price) || 0,
      discountPrice:
        Number(cc.courses.discount_price) || Number(cc.courses.original_price) || 0,
    }));
    const courseIds: string[] = validCCs.map((cc: any) => cc.courses.id);

    const enrollmentCount = courseIds.reduce(
      (sum, id) => sum + (enrollmentCounts[id] ?? 0),
      0
    );

    let ratingSum = 0;
    let ratingCount = 0;
    for (const id of courseIds) {
      const bucket = ratingBuckets[id];
      if (bucket) {
        ratingSum += bucket.sum;
        ratingCount += bucket.count;
      }
    }
    const averageRating =
      ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

    const price = coursesRaw.reduce((sum, co) => sum + co.originalPrice, 0);

    return {
      id: c.id,
      name: c.name,
      description: c.description || null,
      icon: c.icon || "Briefcase",
      color: c.color || "",
      slug: c.slug,
      courseCount: coursesRaw.length,
      enrollmentCount,
      averageRating,
      courses: coursesRaw,
      discountPercentage: c.discount_percentage ?? null,
      isFeatured: c.is_featured ?? false,
      price,
    };
  });
}

/**
 * Cached career list for the /careers page.
 * Replaced the previous sequential waterfall (careers → then stats).
 * Now: 3 parallel queries total, cached for 5 minutes.
 */
export function useCareersPageData() {
  return useQuery<PublicCareerCardData[]>({
    queryKey: CAREERS_PAGE_KEY,
    queryFn: fetchCareersPageData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
