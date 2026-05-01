import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PublicCareerCardData } from "@/components/PublicCareerCard";

export function useLandingCareers() {
  return useQuery<PublicCareerCardData[]>({
    queryKey: ["landing-careers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("careers")
        .select(
          "id, name, description, icon, slug, color, discount_percentage, is_featured, career_courses(course_id, courses(id, name, description, original_price, discount_price))"
        )
        .eq("status", "published")
        .order("display_order", { ascending: true })
        .limit(6);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const allCourseIds = data.flatMap((c: any) =>
        (c.career_courses || []).filter((cc: any) => cc.courses).map((cc: any) => cc.courses.id)
      );

      let enrollmentCounts: Record<string, number> = {};
      let ratingBuckets: Record<string, { sum: number; count: number }> = {};

      if (allCourseIds.length > 0) {
        const [{ data: enrollments }, { data: reviews }] = await Promise.all([
          supabase.from("course_enrollments").select("course_id").in("course_id", allCourseIds),
          supabase.from("course_reviews").select("course_id, rating").in("course_id", allCourseIds),
        ]);
        for (const e of enrollments ?? []) {
          enrollmentCounts[e.course_id] = (enrollmentCounts[e.course_id] ?? 0) + 1;
        }
        for (const r of reviews ?? []) {
          if (!ratingBuckets[r.course_id]) ratingBuckets[r.course_id] = { sum: 0, count: 0 };
          ratingBuckets[r.course_id].sum += r.rating;
          ratingBuckets[r.course_id].count += 1;
        }
      }

      return data.map((c: any) => {
        const validCCs = (c.career_courses || []).filter((cc: any) => cc.courses);
        const coursesRaw = validCCs.map((cc: any) => ({
          id: cc.courses.id as string,
          name: cc.courses.name as string,
          description: (cc.courses.description || "") as string,
          originalPrice: Number(cc.courses.original_price) || 0,
          discountPrice: Number(cc.courses.discount_price) || Number(cc.courses.original_price) || 0,
        }));
        const courseIds = validCCs.map((cc: any) => cc.courses.id as string);
        const enrollmentCount = courseIds.reduce(
          (sum: number, id: string) => sum + (enrollmentCounts[id] ?? 0),
          0
        );
        const allRatings = courseIds.flatMap((id: string) => {
          const b = ratingBuckets[id];
          return b ? [{ sum: b.sum, count: b.count }] : [];
        });
        const totalRatingSum = allRatings.reduce((s, b) => s + b.sum, 0);
        const totalRatingCount = allRatings.reduce((s, b) => s + b.count, 0);
        const averageRating = totalRatingCount > 0
          ? Math.round(totalRatingSum / totalRatingCount * 10) / 10
          : 0;
        const price = coursesRaw.reduce((sum: number, co) => sum + co.originalPrice, 0);
        return {
          id: c.id,
          name: c.name,
          description: c.description ?? null,
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
        } satisfies PublicCareerCardData;
      });
    },
    staleTime: 5 * 60 * 1000,
  });
}
