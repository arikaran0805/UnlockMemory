import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Bookmark {
  id: string;
  user_id: string;
  course_id: string | null;
  post_id: string | null;
  created_at: string;
  courses?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    featured_image: string | null;
    level: string | null;
  } | null;
  posts?: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    category_id: string | null;
    courses?: {
      slug: string;
    } | null;
  } | null;
}

const BOOKMARK_SELECT = `
  *,
  courses:course_id (
    id,
    name,
    slug,
    description,
    featured_image,
    level
  ),
  posts:post_id (
    id,
    title,
    slug,
    excerpt,
    category_id,
    courses:category_id (
      slug
    )
  )
`;

const bookmarksKey = (userId: string) => ['bookmarks', userId];

export const useBookmarks = () => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bookmarks = [], isLoading: loading } = useQuery<Bookmark[]>({
    queryKey: bookmarksKey(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(BOOKMARK_SELECT)
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Bookmark[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const isBookmarked = useCallback((courseId?: string, postId?: string): boolean => {
    if (!userId) return false;
    return bookmarks.some(b =>
      (courseId && b.course_id === courseId) ||
      (postId && b.post_id === postId)
    );
  }, [bookmarks, userId]);

  const toggleBookmark = async (courseId?: string, postId?: string): Promise<boolean> => {
    if (!userId) {
      toast({
        title: "Login required",
        description: "Please log in to bookmark items.",
        variant: "destructive",
      });
      return false;
    }

    const existingBookmark = bookmarks.find(b =>
      (courseId && b.course_id === courseId) ||
      (postId && b.post_id === postId)
    );

    try {
      if (existingBookmark) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;

        queryClient.setQueryData<Bookmark[]>(bookmarksKey(userId), (old) =>
          (old ?? []).filter(b => b.id !== existingBookmark.id)
        );
        toast({ title: "Removed", description: "Bookmark removed successfully." });
        return false;
      } else {
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            course_id: courseId || null,
            post_id: postId || null,
          })
          .select(BOOKMARK_SELECT)
          .single();

        if (error) throw error;

        queryClient.setQueryData<Bookmark[]>(bookmarksKey(userId), (old) =>
          [data as Bookmark, ...(old ?? [])]
        );
        toast({ title: "Saved", description: "Added to your bookmarks." });
        return true;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return isBookmarked(courseId, postId);
    }
  };

  const refreshBookmarks = async () => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: bookmarksKey(userId) });
    }
  };

  return {
    bookmarks,
    loading,
    isBookmarked,
    toggleBookmark,
    refreshBookmarks,
    isAuthenticated: !!userId,
  };
};
