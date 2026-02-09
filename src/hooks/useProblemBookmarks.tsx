import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProblemType } from "./useProblemReactions";

export interface ProblemBookmark {
  id: string;
  problem_id: string;
  problem_type: string;
  created_at: string;
  problem?: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    skill_id: string;
  };
}

export function useProblemBookmarks(problemType: ProblemType = "solve") {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<ProblemBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setBookmarkedIds(new Set());
      setLoading(false);
      return;
    }

    const fetchBookmarks = async () => {
      setLoading(true);
      try {
        // For solve type, join with practice_problems; for others just fetch raw data
        if (problemType === "solve") {
          const { data, error } = await supabase
            .from("problem_bookmarks")
            .select(`
              id,
              problem_id,
              problem_type,
              created_at,
              problem:practice_problems (
                id,
                title,
                slug,
                difficulty,
                skill_id
              )
            `)
            .eq("user_id", user.id)
            .eq("problem_type", problemType)
            .order("created_at", { ascending: false });

          if (error) throw error;

          const bookmarkData = (data || []).map((b: any) => ({
            id: b.id,
            problem_id: b.problem_id,
            problem_type: b.problem_type,
            created_at: b.created_at,
            problem: b.problem,
          }));

          setBookmarks(bookmarkData);
          setBookmarkedIds(new Set(bookmarkData.map((b) => b.problem_id)));
        } else {
          const { data, error } = await supabase
            .from("problem_bookmarks")
            .select("id, problem_id, problem_type, created_at")
            .eq("user_id", user.id)
            .eq("problem_type", problemType)
            .order("created_at", { ascending: false });

          if (error) throw error;

          const bookmarkData = (data || []).map((b: any) => ({
            id: b.id,
            problem_id: b.problem_id,
            problem_type: b.problem_type,
            created_at: b.created_at,
          }));

          setBookmarks(bookmarkData);
          setBookmarkedIds(new Set(bookmarkData.map((b) => b.problem_id)));
        }
      } catch (err) {
        console.error("Error fetching problem bookmarks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookmarks();
  }, [user, problemType]);

  const isBookmarked = useCallback(
    (problemId: string) => bookmarkedIds.has(problemId),
    [bookmarkedIds]
  );

  const toggleBookmark = useCallback(
    async (problemId: string) => {
      if (!user) return false;

      const wasBookmarked = bookmarkedIds.has(problemId);

      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (wasBookmarked) next.delete(problemId);
        else next.add(problemId);
        return next;
      });

      try {
        if (wasBookmarked) {
          await supabase
            .from("problem_bookmarks")
            .delete()
            .eq("problem_id", problemId)
            .eq("user_id", user.id)
            .eq("problem_type", problemType);

          setBookmarks((prev) => prev.filter((b) => b.problem_id !== problemId));
          return false;
        } else {
          const { data, error } = await supabase
            .from("problem_bookmarks")
            .insert({ problem_id: problemId, user_id: user.id, problem_type: problemType })
            .select()
            .single();

          if (error) throw error;

          if (problemType === "solve") {
            const { data: problemData } = await supabase
              .from("practice_problems")
              .select("id, title, slug, difficulty, skill_id")
              .eq("id", problemId)
              .single();

            setBookmarks((prev) => [
              { id: data.id, problem_id: problemId, problem_type: problemType, created_at: data.created_at, problem: problemData || undefined },
              ...prev,
            ]);
          } else {
            setBookmarks((prev) => [
              { id: data.id, problem_id: problemId, problem_type: problemType, created_at: data.created_at },
              ...prev,
            ]);
          }
          return true;
        }
      } catch (err: any) {
        console.error("Error toggling problem bookmark:", err);
        setBookmarkedIds((prev) => {
          const next = new Set(prev);
          if (wasBookmarked) next.add(problemId);
          else next.delete(problemId);
          return next;
        });
        throw new Error(err?.message || "Failed to save problem");
      }
    },
    [user, bookmarkedIds, problemType]
  );

  return useMemo(
    () => ({
      bookmarks,
      loading,
      isBookmarked,
      toggleBookmark,
      isAuthenticated: !!user,
    }),
    [bookmarks, loading, isBookmarked, toggleBookmark, user]
  );
}
