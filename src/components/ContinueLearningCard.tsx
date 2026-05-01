import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Play } from 'lucide-react';
import { useCourseNavigation } from '@/hooks/useCourseNavigation';

interface ResumeData {
  courseId: string;
  courseName: string;
  courseSlug: string;
  completedLessons: number;
  totalLessons: number;
  lastLessonSlug: string | null;
}

export const ContinueLearningCard = () => {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const { handleResume } = useCourseNavigation();

  useEffect(() => {
    const fetchResumeData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Get the most recently active course enrollment
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id, courses:course_id (id, name, slug)')
          .eq('user_id', session.user.id)
          .order('enrolled_at', { ascending: false })
          .limit(1);

        if (!enrollments || enrollments.length === 0) return;

        const course = enrollments[0].courses as any;
        if (!course) return;

        // Get total lessons for this course
        const { count: totalLessons } = await supabase
          .from('course_lessons' as any)
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .is('deleted_at', null);

        // Get completed lessons for this course
        const { count: completedLessons } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
          .eq('course_id', course.id)
          .eq('completed', true);

        // Get the last viewed lesson to resume from
        const { data: lastProgress } = await supabase
          .from('lesson_progress')
          .select('lesson_id, posts:lesson_id (slug)')
          .eq('user_id', session.user.id)
          .eq('course_id', course.id)
          .order('viewed_at', { ascending: false })
          .limit(1);

        const lastLessonSlug = lastProgress?.[0]?.posts 
          ? (lastProgress[0].posts as any).slug 
          : null;

        setResumeData({
          courseId: course.id,
          courseName: course.name,
          courseSlug: course.slug,
          completedLessons: completedLessons || 0,
          totalLessons: totalLessons || 0,
          lastLessonSlug,
        });
      } catch (error) {
        console.error('Error fetching resume data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResumeData();
  }, []);

  // Explicit resume action - user clicked Continue
  const handleContinue = () => {
    if (!resumeData) return;
    // Use the explicit resume handler from useCourseNavigation
    handleResume(resumeData.courseSlug, resumeData.courseId);
  };

  if (loading) {
    return (
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-5">
          <div className="h-16 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!resumeData || resumeData.totalLessons === 0) {
    return null;
  }

  // Don't show if course is completed
  if (resumeData.completedLessons >= resumeData.totalLessons) {
    return null;
  }

  return (
    <Card className="bg-white border-border/50 shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: Icon + Content */}
          <div className="flex items-start gap-4 flex-1">
            {/* Progress Icon */}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
            
            {/* Text Content */}
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold text-foreground text-lg leading-tight">
                Keep going
              </h3>
              <p className="text-sm text-muted-foreground">
                {resumeData.completedLessons} of {resumeData.totalLessons} lessons completed
              </p>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col items-center gap-1.5 sm:ml-auto">
            <Button 
              onClick={handleContinue}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-10 font-medium shadow-sm"
            >
              <Play className="h-4 w-4 mr-2 fill-current" />
              Continue Learning
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">
              Resume where you left off
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};