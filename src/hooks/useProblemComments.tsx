import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { ProblemType } from "./useProblemReactions";

export interface ProblemComment {
  id: string;
  problem_id: string;
  user_id: string | null;
  parent_id: string | null;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: ProblemComment[];
}

export function useProblemComments(problemId: string | undefined, problemType: ProblemType = "solve") {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProblemComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!problemId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("problem_comments")
        .select(`
          id, problem_id, user_id, parent_id, content, status, created_at, updated_at
        `)
        .eq("problem_id", problemId)
        .eq("problem_type", problemType)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const userIds = [...new Set((data || []).map((c) => c.user_id).filter(Boolean))];
      let profiles: Record<string, { id: string; full_name: string | null; avatar_url: string | null }> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        
        profiles = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {} as typeof profiles);
      }

      const commentMap = new Map<string, ProblemComment>();
      const rootComments: ProblemComment[] = [];

      (data || []).forEach((c) => {
        const comment: ProblemComment = {
          ...c,
          author: c.user_id ? profiles[c.user_id] : undefined,
          replies: [],
        };
        commentMap.set(c.id, comment);
      });

      commentMap.forEach((comment) => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (err) {
      console.error("Error fetching problem comments:", err);
    } finally {
      setLoading(false);
    }
  }, [problemId, problemType]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      if (!problemId || !user || !content.trim()) return null;

      setSubmitting(true);
      try {
        const { data, error } = await supabase
          .from("problem_comments")
          .insert({
            problem_id: problemId,
            user_id: user.id,
            parent_id: parentId || null,
            content: content.trim(),
            status: "approved",
            problem_type: problemType,
          })
          .select()
          .single();

        if (error) throw error;

        await fetchComments();
        return data;
      } catch (err) {
        console.error("Error adding comment:", err);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [problemId, problemType, user, fetchComments]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return false;

      try {
        const { error } = await supabase
          .from("problem_comments")
          .delete()
          .eq("id", commentId)
          .eq("user_id", user.id);

        if (error) throw error;

        await fetchComments();
        return true;
      } catch (err) {
        console.error("Error deleting comment:", err);
        return false;
      }
    },
    [user, fetchComments]
  );

  const commentCount = useMemo(() => {
    let count = 0;
    const countReplies = (items: ProblemComment[]) => {
      items.forEach((c) => {
        count++;
        if (c.replies) countReplies(c.replies);
      });
    };
    countReplies(comments);
    return count;
  }, [comments]);

  return useMemo(
    () => ({
      comments,
      loading,
      submitting,
      addComment,
      deleteComment,
      commentCount,
      refetch: fetchComments,
      isAuthenticated: !!user,
    }),
    [comments, loading, submitting, addComment, deleteComment, commentCount, fetchComments, user]
  );
}
