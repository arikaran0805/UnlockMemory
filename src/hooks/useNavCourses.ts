import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NavCourse {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  level: string | null;
}

// Exported so App.tsx can prefetch at module-load time (before any component mounts)
export const NAV_COURSES_KEY = ["nav-courses"] as const;

export async function fetchNavCourses(): Promise<NavCourse[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("id, name, slug, icon, level")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/**
 * Cached course list for header nav dropdowns and secondary header.
 * staleTime: 15 min — the published course list almost never changes mid-session.
 * gcTime: 30 min — keep the cache well past a typical session.
 * refetchOnWindowFocus/Reconnect: inherit global false defaults.
 */
export function useNavCourses() {
  return useQuery<NavCourse[]>({
    queryKey: NAV_COURSES_KEY,
    queryFn: fetchNavCourses,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
