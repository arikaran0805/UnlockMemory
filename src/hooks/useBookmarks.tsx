import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id || null);
      if (session?.user?.id) {
        fetchBookmarks(session.user.id);
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const fetchBookmarks = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
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
        `)
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error: any) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

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
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;

        setBookmarks(prev => prev.filter(b => b.id !== existingBookmark.id));
        toast({
          title: "Removed",
          description: "Bookmark removed successfully.",
        });
        return false;
      } else {
        // Add bookmark
        const { data, error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            course_id: courseId || null,
            post_id: postId || null,
          })
          .select(`
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
          `)
          .single();

        if (error) throw error;

        setBookmarks(prev => [data, ...prev]);
        toast({
          title: "Saved",
          description: "Added to your bookmarks.",
        });
        return true;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return isBookmarked(courseId, postId);
    }
  };

  const refreshBookmarks = async () => {
    if (userId) {
      await fetchBookmarks(userId);
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
