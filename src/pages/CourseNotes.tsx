/**
 * CourseNotes - Dedicated Notes Workspace Page
 * 
 * Opens in a new tab from the Course Detail page.
 * Renders NotesFocusMode in full isolation without course chrome.
 * 
 * CRITICAL: Listens for context-switch messages to display the correct note
 * when opened from different lessons/contexts.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { NotesFocusMode } from "@/components/notes";
import { useNotesTabRegistration } from "@/hooks/useNotesTabManager";

interface CourseInfo {
  id: string;
  name: string;
  slug: string;
}

const CourseNotes = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const careerId = searchParams.get("careerId");
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Context switch state - when we receive a message to switch to a specific note
  const [switchContext, setSwitchContext] = useState<{
    noteId?: string;
    lessonId?: string;
    entityType?: string;
  } | null>(null);

  // Handle context switch messages from other tabs
  const handleSwitchNote = useCallback((options: { noteId?: string; lessonId?: string; entityType?: string }) => {
    setSwitchContext(options);
  }, []);

  // Register this tab for single-tab-per-course management
  // Pass the switch handler to receive context-switch messages
  useNotesTabRegistration(courseId, handleSwitchNote);

  // Fetch course info
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, slug")
        .eq("id", courseId)
        .single();
      
      if (error || !data) {
        console.error("Failed to fetch course:", error);
        navigate("/courses");
        return;
      }
      
      setCourse(data);
      setLoading(false);
    };

    fetchCourse();
  }, [courseId, navigate]);

  // Update document title
  useEffect(() => {
    if (course) {
      document.title = `Notes — ${course.name}`;
    }
    return () => {
      document.title = "Lovable"; // Reset on unmount
    };
  }, [course]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { state: { from: `/courses/${courseId}/notes` } });
    }
  }, [authLoading, user, courseId, navigate]);

  // Handle back to course - navigate in current tab
  const handleBackToCourse = () => {
    if (!course?.slug) return;
    if (careerId) {
      navigate(`/career-board/${careerId}/course/${course.slug}`);
    } else {
      navigate(`/course/${course.slug}`);
    }
  };

  // Handle navigate to lesson - navigates current tab to the lesson
  const handleNavigateToLesson = async (lessonId: string) => {
    if (!course?.slug) return;

    try {
      const { data: lesson } = await supabase
        .from("posts")
        .select("slug")
        .eq("id", lessonId)
        .maybeSingle();

      if (careerId) {
        // Career board route
        const base = `/career-board/${careerId}/course/${course.slug}`;
        navigate(lesson?.slug ? `${base}?lesson=${lesson.slug}&tab=lessons` : base);
      } else {
        // Regular course route
        navigate(lesson?.slug
          ? `/course/${course.slug}?lesson=${lesson.slug}&tab=lessons`
          : `/course/${course.slug}?tab=lessons`
        );
      }
    } catch {
      navigate(careerId
        ? `/career-board/${careerId}/course/${course.slug}`
        : `/course/${course.slug}?tab=lessons`
      );
    }
  };

  if (loading || authLoading || !course || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading notes...</div>
      </div>
    );
  }

  return (
    <NotesFocusMode
      courseId={course.id}
      userId={user.id}
      courseName={course.name}
      onExit={handleBackToCourse}
      onNavigateToLesson={handleNavigateToLesson}
      isStandalonePage
      switchToContext={switchContext}
      onContextSwitched={() => setSwitchContext(null)}
    />
  );
};

export default CourseNotes;
