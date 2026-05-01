import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Shared types ─────────────────────────────────────────────────────────────
// Exported so CourseDetail.tsx can import them instead of defining locally.

export interface Course {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
  status: string;
  level?: string | null;
  learning_hours?: number | null;
  author_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
  prerequisites?: string[] | null;
}

export interface CourseLesson {
  id: string;
  title: string;
  description: string | null;
  lesson_rank: string;
  is_published: boolean;
  course_id: string;
}

export interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  published_at: string | null;
  updated_at: string;
  status: string;
  content?: string;
  lesson_id: string | null;
  post_rank: string | null;
  post_type: string | null;
  code_theme?: string | null;
  profiles: { full_name: string | null };
}

export interface CourseDetailPayload {
  course: Course;
  lessons: CourseLesson[];
  posts: Post[];
}

// ── Cache key ─────────────────────────────────────────────────────────────────
export const courseDetailKey = (slug: string, showAllStatuses = false) =>
  ["course-detail", slug, showAllStatuses] as const;

// ── Fetcher — exported so Header can call prefetchQuery with it ───────────────
export async function fetchCourseDetail(
  slug: string,
  showAllStatuses: boolean
): Promise<CourseDetailPayload> {
  // Step 1: resolve slug → course row (sequential; we need the id)
  let courseQuery = supabase
    .from("courses")
    .select("*")
    .eq("slug", slug);

  if (!showAllStatuses) {
    courseQuery = courseQuery.eq("status", "published");
  }

  const { data: courseData, error: courseError } = await courseQuery.single();

  if (courseError) {
    if (courseError.code === "PGRST116") {
      throw new Error("Course not found or not published yet");
    }
    throw courseError;
  }

  // Step 2: lessons + posts in parallel (both only need courseData.id)
  let postsQuery = supabase
    .from("posts")
    .select(`
      id,
      title,
      excerpt,
      slug,
      published_at,
      updated_at,
      lesson_id,
      post_rank,
      post_type,
      status,
      content,
      code_theme,
      profiles:author_id (full_name)
    `)
    .eq("category_id", courseData.id)
    .order("post_rank", { ascending: true });

  if (!showAllStatuses) {
    postsQuery = postsQuery.eq("status", "published");
  }

  const [
    { data: lessonsData, error: lessonsError },
    { data: postsData, error: postsError },
  ] = await Promise.all([
    supabase
      .from("course_lessons")
      .select("id, title, description, lesson_rank, is_published, course_id")
      .eq("course_id", courseData.id)
      .is("deleted_at", null)
      .order("lesson_rank", { ascending: true }),
    postsQuery,
  ]);

  if (lessonsError) throw lessonsError;
  if (postsError) throw postsError;

  const typedLessons = (lessonsData ?? []) as unknown as CourseLesson[];

  let typedPosts = (postsData ?? []).map((p) => ({
    ...p,
    lesson_id: p.lesson_id as string | null,
    post_rank: p.post_rank as string | null,
    post_type: p.post_type as string | null,
    profiles: p.profiles as { full_name: string | null },
  })) as Post[];

  // Strip posts that belong to unpublished lessons (for public viewers)
  if (!showAllStatuses) {
    const publishedLessonIds = new Set(
      typedLessons.filter((l) => l.is_published === true).map((l) => l.id)
    );
    typedPosts = typedPosts.filter(
      (p) => p.lesson_id === null || publishedLessonIds.has(p.lesson_id)
    );
  }

  return { course: courseData, lessons: typedLessons, posts: typedPosts };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
/**
 * Fetches and caches course + lessons + posts for a given slug.
 *
 * staleTime: 5 min — course content almost never changes mid-session.
 * gcTime:   15 min — keeps data across typical same-session back-navigations.
 *
 * Cache hit → instant render (no loading state). Perfect for the secondary
 * header where users jump between courses frequently.
 */
export function useCourseDetailData(slug: string, showAllStatuses: boolean) {
  return useQuery<CourseDetailPayload>({
    queryKey: courseDetailKey(slug, showAllStatuses),
    queryFn: () => fetchCourseDetail(slug, showAllStatuses),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!slug,
    retry: 1,
  });
}
