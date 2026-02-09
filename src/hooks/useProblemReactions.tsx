import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ReactionCounts {
  likes: number;
  dislikes: number;
}

export type ProblemType = "solve" | "predict" | "fix" | "eliminate";

export function useProblemReactions(problemId: string | undefined, problemType: ProblemType = "solve") {
  const { user } = useAuth();
  const [counts, setCounts] = useState<ReactionCounts>({ likes: 0, dislikes: 0 });
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch counts and user reaction
  useEffect(() => {
    if (!problemId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: reactions, error } = await supabase
          .from("problem_reactions")
          .select("reaction_type, user_id")
          .eq("problem_id", problemId)
          .eq("problem_type", problemType);

        if (error) throw error;

        let likes = 0;
        let dislikes = 0;
        let currentUserReaction: "like" | "dislike" | null = null;

        reactions?.forEach((r) => {
          if (r.reaction_type === "like") likes++;
          if (r.reaction_type === "dislike") dislikes++;
          if (user && r.user_id === user.id) {
            currentUserReaction = r.reaction_type as "like" | "dislike";
          }
        });

        setCounts({ likes, dislikes });
        setUserReaction(currentUserReaction);
      } catch (err) {
        console.error("Error fetching problem reactions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [problemId, problemType, user]);

  const react = useCallback(
    async (type: "like" | "dislike") => {
      if (!problemId || !user) return;

      const previousReaction = userReaction;
      const previousCounts = { ...counts };

      // Optimistic update
      if (userReaction === type) {
        setUserReaction(null);
        setCounts((prev) => ({
          ...prev,
          [type === "like" ? "likes" : "dislikes"]: Math.max(0, prev[type === "like" ? "likes" : "dislikes"] - 1),
        }));
      } else {
        setUserReaction(type);
        setCounts((prev) => {
          const newCounts = { ...prev };
          newCounts[type === "like" ? "likes" : "dislikes"]++;
          if (previousReaction) {
            newCounts[previousReaction === "like" ? "likes" : "dislikes"] = Math.max(
              0,
              newCounts[previousReaction === "like" ? "likes" : "dislikes"] - 1
            );
          }
          return newCounts;
        });
      }

      try {
        if (userReaction === type) {
          await supabase
            .from("problem_reactions")
            .delete()
            .eq("problem_id", problemId)
            .eq("user_id", user.id)
            .eq("problem_type", problemType);
        } else if (previousReaction) {
          await supabase
            .from("problem_reactions")
            .update({ reaction_type: type })
            .eq("problem_id", problemId)
            .eq("user_id", user.id)
            .eq("problem_type", problemType);
        } else {
          await supabase.from("problem_reactions").insert({
            problem_id: problemId,
            user_id: user.id,
            reaction_type: type,
            problem_type: problemType,
          });
        }
      } catch (err) {
        console.error("Error updating reaction:", err);
        setUserReaction(previousReaction);
        setCounts(previousCounts);
      }
    },
    [problemId, problemType, user, userReaction, counts]
  );

  return useMemo(
    () => ({
      likes: counts.likes,
      dislikes: counts.dislikes,
      userReaction,
      loading,
      react,
      isAuthenticated: !!user,
    }),
    [counts, userReaction, loading, react, user]
  );
}
