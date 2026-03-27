import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CourseAnnotationReply {
  id: string;
  annotation_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_profile?: {
    full_name: string | null;
    email: string;
  };
}

export interface CourseAnnotation {
  id: string;
  course_id: string;
  version_id: string | null;
  author_id: string;
  selection_start: number;
  selection_end: number;
  selected_text: string;
  comment: string;
  status: string;
  created_at: string;
  updated_at: string;
  bubble_index: number | null;
  editor_type: string;
  author_profile?: {
    full_name: string | null;
    email: string;
  };
  replies?: CourseAnnotationReply[];
}

export const useCourseAnnotations = (courseId: string | undefined) => {
  const [annotations, setAnnotations] = useState<CourseAnnotation[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchAuthorProfile = async (authorId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", authorId)
      .single();
    return profile || undefined;
  };

  const fetchRepliesForAnnotation = async (annotationId: string): Promise<CourseAnnotationReply[]> => {
    const { data: repliesData } = await supabase
      .from("course_annotation_replies")
      .select("*")
      .eq("annotation_id", annotationId)
      .order("created_at", { ascending: true });

    if (!repliesData) return [];

    const repliesWithProfiles = await Promise.all(
      repliesData.map(async (reply) => ({
        ...reply,
        author_profile: await fetchAuthorProfile(reply.author_id),
      }))
    );

    return repliesWithProfiles;
  };

  const fetchAnnotations = useCallback(async () => {
    if (!courseId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_annotations")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const annotationsWithProfilesAndReplies = await Promise.all(
        (data || []).map(async (annotation) => ({
          ...annotation,
          author_profile: await fetchAuthorProfile(annotation.author_id),
          replies: await fetchRepliesForAnnotation(annotation.id),
        } as CourseAnnotation))
      );

      setAnnotations(annotationsWithProfilesAndReplies);
    } catch (error: any) {
      console.error("Error fetching course annotations:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;

    fetchAnnotations();

    const channel = supabase
      .channel(`course_annotations:${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_annotations',
          filter: `course_id=eq.${courseId}`,
        },
        async (payload) => {
          const newAnnotation = payload.new as any;
          const annotationWithProfile: CourseAnnotation = {
            ...newAnnotation,
            author_profile: await fetchAuthorProfile(newAnnotation.author_id),
            replies: [],
          };
          setAnnotations(prev => [...prev, annotationWithProfile]);
          toast({
            title: "New annotation",
            description: "Someone added a new annotation",
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'course_annotations',
          filter: `course_id=eq.${courseId}`,
        },
        async (payload) => {
          const updatedAnnotation = payload.new as any;
          setAnnotations(prev => prev.map(a => 
            a.id === updatedAnnotation.id 
              ? { ...a, ...updatedAnnotation }
              : a
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'course_annotations',
        },
        (payload) => {
          const deletedId = (payload.old as any).id;
          setAnnotations(prev => prev.filter(a => a.id !== deletedId));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_annotation_replies',
        },
        async (payload) => {
          const newReply = payload.new as any;
          const replyWithProfile: CourseAnnotationReply = {
            ...newReply,
            author_profile: await fetchAuthorProfile(newReply.author_id),
          };
          setAnnotations(prev => prev.map(a => 
            a.id === newReply.annotation_id
              ? { ...a, replies: [...(a.replies || []), replyWithProfile] }
              : a
          ));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'course_annotation_replies',
        },
        (payload) => {
          const deletedReply = payload.old as any;
          setAnnotations(prev => prev.map(a => ({
            ...a,
            replies: a.replies?.filter(r => r.id !== deletedReply.id) || [],
          })));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [courseId, toast]);

  useEffect(() => {
    fetchAnnotations();
  }, [fetchAnnotations]);

  const createAnnotation = async (
    selectionStart: number,
    selectionEnd: number,
    selectedText: string,
    comment: string,
    editorType: "rich-text" | "chat" | "canvas",
    bubbleIndex?: number,
    versionId?: string
  ) => {
    if (!courseId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("course_annotations")
        .insert({
          course_id: courseId,
          version_id: versionId || null,
          author_id: session.user.id,
          selection_start: selectionStart,
          selection_end: selectionEnd,
          selected_text: selectedText,
          comment,
          editor_type: editorType,
          bubble_index: bubbleIndex || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Annotation added",
        description: "Your comment has been added",
      });

      await fetchAnnotations();
      return data;
    } catch (error: any) {
      console.error("Error creating course annotation:", error);
      toast({
        title: "Error",
        description: "Failed to add annotation",
        variant: "destructive",
      });
      return null;
    }
  };

  const createReply = async (annotationId: string, content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("course_annotation_replies")
        .insert({
          annotation_id: annotationId,
          author_id: session.user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Reply added",
        description: "Your reply has been added",
      });

      await fetchAnnotations();
      return data;
    } catch (error: any) {
      console.error("Error creating course annotation reply:", error);
      toast({
        title: "Error",
        description: "Failed to add reply",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteReply = async (replyId: string) => {
    try {
      const { error } = await supabase
        .from("course_annotation_replies")
        .delete()
        .eq("id", replyId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Reply removed",
      });

      await fetchAnnotations();
      return true;
    } catch (error: any) {
      console.error("Error deleting course annotation reply:", error);
      toast({
        title: "Error",
        description: "Failed to delete reply",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateAnnotationStatus = async (
    annotationId: string,
    status: "open" | "resolved" | "dismissed"
  ) => {
    try {
      const { error } = await supabase
        .from("course_annotations")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", annotationId);

      if (error) throw error;

      toast({
        title: "Updated",
        description: `Annotation marked as ${status}`,
      });

      await fetchAnnotations();
      return true;
    } catch (error: any) {
      console.error("Error updating course annotation:", error);
      toast({
        title: "Error",
        description: "Failed to update annotation",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteAnnotation = async (annotationId: string) => {
    try {
      const { error } = await supabase
        .from("course_annotations")
        .delete()
        .eq("id", annotationId);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Annotation removed",
      });

      await fetchAnnotations();
      return true;
    } catch (error: any) {
      console.error("Error deleting course annotation:", error);
      toast({
        title: "Error",
        description: "Failed to delete annotation",
        variant: "destructive",
      });
      return false;
    }
  };

  const openAnnotations = annotations.filter(a => a.status === "open");
  const resolvedAnnotations = annotations.filter(a => a.status === "resolved");

  return {
    annotations,
    openAnnotations,
    resolvedAnnotations,
    loading,
    fetchAnnotations,
    createAnnotation,
    createReply,
    deleteReply,
    updateAnnotationStatus,
    deleteAnnotation,
  };
};
