import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NavCareer {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

// Exported so App.tsx can prefetch at module-load time (before any component mounts)
export const NAV_CAREERS_KEY = ["nav-careers"] as const;

export async function fetchNavCareers(): Promise<NavCareer[]> {
  const { data, error } = await supabase
    .from("careers")
    .select("id, name, slug, icon")
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .limit(6);
  if (error) throw error;
  return data ?? [];
}

/**
 * Cached career list for header nav dropdowns.
 * staleTime: 15 min — career paths change very rarely.
 * gcTime: 30 min — keep cache across a full session.
 */
export function useNavCareers() {
  return useQuery<NavCareer[]>({
    queryKey: NAV_CAREERS_KEY,
    queryFn: fetchNavCareers,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
