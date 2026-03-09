import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCourseNavigation } from "@/hooks/useCourseNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useProblemBookmarks } from "@/hooks/useProblemBookmarks";
import { CourseProgressDisplay } from "@/components/CourseProgressDisplay";
import { useCareers } from "@/hooks/useCareers";
import { CareerReadinessCard } from "@/components/CareerReadinessCard";
import { SkillMilestones } from "@/components/SkillMilestones";
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import { ProfileWeeklyActivityCard } from "@/components/profile/ProfileWeeklyActivityCard";
import { ProfileDashboardHeader } from "@/components/profile/ProfileDashboardHeader";
import { ContinueLearningCard } from "@/components/ContinueLearningCard";
import Layout from "@/components/Layout";
import { useUserRole } from "@/hooks/useUserRole";
import { PracticeLab } from "@/components/practice";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { LightEditor } from "@/components/tiptap";
import { useWeeklyActivity } from "@/hooks/useWeeklyActivity";
import { z } from "zod";
import { icons, RotateCcw, Code2, Play, CheckCircle2, AlertCircle, Mail, HelpCircle, Code } from "lucide-react";
import { 
  LayoutDashboard, 
  BookOpen, 
  Bookmark, 
  BookmarkX,
  MessageSquare, 
  Settings, 
  Award,
  Clock,
  TrendingUp,
  Star,
  ChevronRight,
  User,
  Bell,
  Shield,
  LogOut,
  FileText,
  Sparkles,
  Target,
  Flame,
  Trophy,
  Snowflake,
  Zap,
  Library,
  Gamepad2,
  FlaskConical,
  LayoutGrid
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Helper to get a dynamic icon from lucide-react's icons map
const ICONS = icons as unknown as Record<string, LucideIcon>;
const getIcon = (iconName: string | null | undefined, fallback: LucideIcon): LucideIcon => {
  if (!iconName) return fallback;
  return ICONS[iconName] ?? fallback;
};

const stripHtml = (value: string | null | undefined) => {
  if (!value) return "";
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
};

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  avatar_url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type TabType = 'dashboard' | 'learnings' | 'bookmarks' | 'discussions' | 'achievements' | 'settings' | 'practice';

const sidebarItems = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learnings' as TabType, label: 'My Learnings', icon: BookOpen },
  { id: 'bookmarks' as TabType, label: 'Bookmarks', icon: Bookmark },
  { id: 'discussions' as TabType, label: 'Discussions', icon: MessageSquare },
];

const exploreItems = [
  { id: 'practice' as TabType, label: 'Practice Lab', icon: FlaskConical },
  { id: 'achievements' as TabType, label: 'Achievements', icon: Award },
];

const accountItems = [
  { id: 'settings' as TabType, label: 'Settings', icon: Settings },
];

// OngoingCourseCard component for the learnings section (Library-style)
const OngoingCourseCard = ({ 
  course, 
  userId, 
  onClick,
  onResetProgress
}: { 
  course: any; 
  userId: string | null;
  onClick: () => void;
  onResetProgress?: () => void;
}) => {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [nextLesson, setNextLesson] = useState<{ title: string; order: number } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProgress = async () => {
      if (!course?.id || !userId) return;

      // Fetch lessons and progress
      const [{ count: totalLessons }, { count: completedLessons }, lessonsData, progressData] = await Promise.all([
        supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', course.id),
        supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('course_id', course.id)
          .eq('completed', true),
        (supabase
          .from('course_lessons' as any)
          .select('id, title, lesson_rank')
          .eq('course_id', course.id)
          .eq('is_published', true)
          .is('deleted_at', null)
          .order('lesson_rank', { ascending: true }) as unknown as Promise<{ data: { id: string; title: string; lesson_rank: string | null }[] | null }>),
        supabase
          .from('lesson_progress')
          .select('lesson_id')
          .eq('course_id', course.id)
          .eq('user_id', userId)
          .eq('completed', true),
      ]);

      setProgress({
        completed: completedLessons || 0,
        total: totalLessons || 0,
      });

      // Find next incomplete lesson
      const completedIds = new Set(progressData.data?.map(l => l.lesson_id) || []);
      const allLessons = lessonsData.data || [];
      const nextLessonData = allLessons.find(lesson => !completedIds.has(lesson.id));
      if (nextLessonData) {
        setNextLesson({ title: nextLessonData.title, order: allLessons.indexOf(nextLessonData) + 1 });
      }
    };

    fetchProgress();
  }, [course?.id, userId]);

  const progressPercent = progress.total > 0 
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const handleResetProgress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!course?.id || !userId || isResetting) return;
    
    setIsResetting(true);
    try {
      const { error } = await supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', course.id);

      if (error) throw error;

      setProgress({ completed: 0, total: progress.total });
      setNextLesson(null);
      toast({
        title: "Progress Reset",
        description: `Your progress for ${course.name} has been reset.`,
      });
      onResetProgress?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reset progress",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg h-[130px]"
      onClick={onClick}
    >
      <div className="flex h-full">
        {/* Left Section - Dark */}
        <div className="w-1/3 p-4 flex flex-col justify-between bg-emerald-900">
          <div>
            <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              Course
            </span>
            <h3 className="text-sm font-semibold text-white mt-1 leading-tight line-clamp-3">
              {course?.name}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-xs mt-2">
            <span>View all</span>
            <ChevronRight className="h-3 w-3" />
          </div>
        </div>

        {/* Right Section - Light */}
        <div className="w-2/3 bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                {course?.level || "Beginner"} • {progress.total} Lessons
              </span>
              <span className="text-[10px] text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all bg-emerald-900"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Next Lesson */}
            {nextLesson && (
              <div className="flex items-center gap-1.5 mb-2">
                <Play className="h-3 w-3 text-primary fill-primary" />
                <span className="text-[10px] text-muted-foreground">Next:</span>
                <span className="text-[10px] font-medium text-foreground truncate">
                  {nextLesson.title}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                {course?.learning_hours > 0 
                  ? `${course.learning_hours}h` 
                  : `${Math.max(1, Math.round((progress.total * 15) / 60))}h`}
              </span>
            </div>
            <Button 
              variant="default" 
              size="sm"
              className="text-white rounded-full px-4 h-7 text-xs hover:opacity-90 bg-emerald-900 hover:bg-emerald-800"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// CompletedCourseCard component for the learnings section (Library-style)
const CompletedCourseCard = ({ 
  course, 
  onClick 
}: { 
  course: any;
  onClick: () => void;
}) => {
  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg h-[130px]"
      onClick={onClick}
    >
      <div className="flex h-full">
        {/* Left Section - Emerald/Green for completed */}
        <div className="w-1/3 p-4 flex flex-col justify-between bg-emerald-700">
          <div>
            <span className="text-[10px] font-medium tracking-wider text-emerald-200 uppercase">
              Completed
            </span>
            <h3 className="text-sm font-semibold text-white mt-1 leading-tight line-clamp-3">
              {course?.name}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-emerald-200 hover:text-white transition-colors text-xs mt-2">
            <CheckCircle2 className="h-3 w-3" />
            <span>100%</span>
          </div>
        </div>

        {/* Right Section - Light */}
        <div className="w-2/3 bg-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-medium tracking-wider text-emerald-600 uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Course Completed
              </span>
            </div>
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all bg-emerald-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                {course?.learning_hours > 0 
                  ? `${course.learning_hours}h` 
                  : '—'}
              </span>
            </div>
            <Button 
              variant="default" 
              size="sm"
              className="text-white rounded-full px-4 h-7 text-xs hover:opacity-90 bg-emerald-600 hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Review
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

// FeaturedCourseCard component for the learnings section
const FeaturedCourseCard = ({ 
  course, 
  gradient,
  onClick 
}: { 
  course: any;
  gradient: string;
  onClick: () => void;
}) => {
  const [lessonCount, setLessonCount] = useState(0);

  useEffect(() => {
    const fetchLessonCount = async () => {
      if (!course?.id) return;

      // Count all lessons regardless of status on public pages
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', course.id);

      setLessonCount(count || 0);
    };

    fetchLessonCount();
  }, [course?.id]);

  // Use course learning_hours if available, otherwise estimate (avg 15 min per lesson)
  const displayHours = course.learning_hours > 0 
    ? course.learning_hours 
    : Math.max(1, Math.round((lessonCount * 15) / 60));

  // Get the icon component
  const iconName = course?.icon || 'BookOpen';
  const IconComponent = getIcon(iconName, BookOpen);

  return (
    <Card 
      className={`bg-gradient-to-br ${gradient} border-0 text-white cursor-pointer hover:scale-[1.02] transition-transform`}
      onClick={onClick}
    >
      <CardContent className="p-5 h-44 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-lg">{course.name}</h4>
          <div className="flex items-center gap-4 mt-2 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {lessonCount} Lessons
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {displayHours}h
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <IconComponent className="h-12 w-12 text-white/30" />
        </div>
      </CardContent>
    </Card>
  );
};

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [completedCourseSlugs, setCompletedCourseSlugs] = useState<string[]>([]);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, { completed: number; total: number }>>({});
  const [selectedCareer, setSelectedCareer] = useState<string>('data-science');
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [streakFreezesAvailable, setStreakFreezesAvailable] = useState(2);
  const [isFreezingStreak, setIsFreezingStreak] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [userComments, setUserComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [commentReplies, setCommentReplies] = useState<Record<string, any[]>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { bookmarks, loading: bookmarksLoading, toggleBookmark } = useBookmarks();
  const { bookmarks: problemBookmarks, loading: problemBookmarksLoading, toggleBookmark: toggleProblemBookmark } = useProblemBookmarks();
  const { getCareerBySlug, getCareerCourseSlugs, getCareerSkills, getSkillContributionsForCourse, getCourseForSkill, loading: careersLoading } = useCareers();
  const { isAdmin, isModerator } = useUserRole();
  const { navigateToCourse, navigateToCourseInCareerBoard, handleResume } = useCourseNavigation();

  const { data: weeklyActivityQueryData, isLoading: weeklyActivityLoading } = useWeeklyActivity(userId);
  const weeklyActivityData =
    weeklyActivityQueryData ??
    ({ totalSeconds: 0, activeDays: 0, dailySeconds: {}, lastWeekSeconds: 0 } as const);

  // Handle skill click - navigate to course that teaches this skill INSIDE CAREER BOARD
  // This uses the Career Board route for guaranteed CareerScopedHeader rendering
  const handleSkillClick = async (skillName: string) => {
    if (!career) return;
    
    const courseInfo = getCourseForSkill(career.id, skillName);
    if (courseInfo) {
      // Navigate inside Career Board shell - guaranteed CareerScopedHeader
      navigateToCourseInCareerBoard(career.slug, courseInfo.courseSlug);
    } else {
      // Fallback: navigate to career board shell which auto-redirects to first course
      navigate(`/career-board/${career.slug}`);
    }
  };

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    const allTabs = [...sidebarItems, ...exploreItems, ...accountItems];
    if (tab && allTabs.some(item => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    checkUser();
  }, []);

  // Fetch user's comments for Discussions tab
  useEffect(() => {
    const fetchUserComments = async () => {
      if (!userId) return;
      
      setCommentsLoading(true);
      try {
        // Fetch user's comments (excluding replies they made)
        const { data: comments, error } = await supabase
          .from('comments')
          .select(`
            id,
            content,
            created_at,
            is_anonymous,
            display_name,
            parent_id,
            status,
            post_id,
            posts!inner (
              id,
              title,
              slug,
              category_id,
              courses:category_id (
                name,
                slug
              )
            )
          `)
          .eq('user_id', userId)
          .is('parent_id', null)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Fetch replies to user's comments
        if (comments && comments.length > 0) {
          const commentIds = comments.map(c => c.id);
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              id,
              content,
              created_at,
              is_anonymous,
              display_name,
              parent_id,
              user_id,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .in('parent_id', commentIds)
            .eq('status', 'approved')
            .order('created_at', { ascending: true });
          
          // Group replies by parent_id
          const repliesMap: Record<string, any[]> = {};
          replies?.forEach(reply => {
            if (reply.parent_id) {
              if (!repliesMap[reply.parent_id]) {
                repliesMap[reply.parent_id] = [];
              }
              repliesMap[reply.parent_id].push(reply);
            }
          });
          setCommentReplies(repliesMap);
        }
        
        setUserComments(comments || []);
      } catch (error) {
        console.error('Error fetching user comments:', error);
      } finally {
        setCommentsLoading(false);
      }
    };

    fetchUserComments();
  }, [userId]);

  const toDayKey = (d: Date) => {
    const safe = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    return safe.toISOString().slice(0, 10);
  };

  const formatDurationFromSeconds = (seconds: number) => {
    if (!seconds) return "0 min";
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return "<1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Refresh streak from activity + stored max streak
  useEffect(() => {
    const refreshStreak = async () => {
      if (!userId) return;

      const today = new Date();

      const { data: allTimeData } = await supabase
        .from('lesson_time_tracking')
        .select('tracked_date, duration_seconds')
        .eq('user_id', userId)
        .order('tracked_date', { ascending: false })
        .limit(500);

      const dailyTotals = new Map<string, number>();
      allTimeData?.forEach((record: any) => {
        dailyTotals.set(record.tracked_date, (dailyTotals.get(record.tracked_date) || 0) + (record.duration_seconds || 0));
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('max_streak, last_freeze_date, last_activity_date')
        .eq('id', userId)
        .maybeSingle();

      const storedMaxStreak = (profile as any)?.max_streak || 0;
      const lastFreezeDate = (profile as any)?.last_freeze_date;
      const todayKey = toDayKey(today);
      const todaySeconds = dailyTotals.get(todayKey) || 0;
      const todayFrozen = lastFreezeDate === todayKey;

      let recalculatedStreak = 0;
      let checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
      if (todaySeconds === 0 && !todayFrozen) {
        checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 12);
      }

      for (let i = 0; i < 365; i++) {
        const dateKey = toDayKey(checkDate);
        const daySeconds = dailyTotals.get(dateKey) || 0;
        const wasFrozen = lastFreezeDate === dateKey;

        if (daySeconds > 0 || wasFrozen) {
          recalculatedStreak++;
          checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 1, 12);
        } else {
          break;
        }
      }

      const newMax = Math.max(recalculatedStreak, storedMaxStreak);
      setCurrentStreak(recalculatedStreak);
      setMaxStreak(newMax);

      await supabase
        .from('profiles')
        .update({
          current_streak: recalculatedStreak,
          max_streak: newMax,
          last_activity_date: todaySeconds > 0 ? todayKey : (profile as any)?.last_activity_date,
        } as any)
        .eq('id', userId);
    };

    refreshStreak();
  }, [userId]);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check email verification status from session
      setEmailVerified(session.user.email_confirmed_at !== null);

      // Fetch profile data
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFullName(profile.full_name || "");
        setAvatarUrl(profile.avatar_url || "");
        setEmail(profile.email);
        setUserId(session.user.id);
        // Load saved career path
        if ((profile as any).selected_career) {
          setSelectedCareer((profile as any).selected_career as string);
        }
        // Load streak data
        setCurrentStreak((profile as any).current_streak || 0);
        setMaxStreak((profile as any).max_streak || 0);
        setStreakFreezesAvailable((profile as any).streak_freezes_available ?? 2);
      }

      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from("course_enrollments")
        .select(`
          *,
          courses:course_id (
            id,
            name,
            slug,
            description,
            featured_image,
            level,
            icon,
            learning_hours
          )
        `)
        .eq("user_id", session.user.id);

      if (enrollments) {
        setEnrolledCourses(enrollments);
      }

      // Fetch all courses for recommendations
      const { data: courses } = await supabase
        .from("courses")
        .select("id, name, slug, description, featured_image, level, icon, learning_hours");

      if (courses) {
        setAllCourses(courses);
      }

      // Fetch lesson progress to determine completed courses
      const { data: lessonProgress } = await supabase
        .from("lesson_progress")
        .select("course_id, completed")
        .eq("user_id", session.user.id)
        .eq("completed", true);

      // Fetch lesson counts per course (all lessons regardless of status)
      const { data: courseLessons } = await supabase
        .from("posts")
        .select("id, category_id");

      if (lessonProgress && courseLessons && courses) {
        // Count lessons per course
        const lessonCountByCourse: Record<string, number> = {};
        courseLessons.forEach(lesson => {
          if (lesson.category_id) {
            lessonCountByCourse[lesson.category_id] = (lessonCountByCourse[lesson.category_id] || 0) + 1;
          }
        });

        // Count completed lessons per course
        const completedByCourse: Record<string, number> = {};
        lessonProgress.forEach(progress => {
          completedByCourse[progress.course_id] = (completedByCourse[progress.course_id] || 0) + 1;
        });

        // Build course progress map (by slug for easy lookup)
        const progressMap: Record<string, { completed: number; total: number }> = {};
        courses.forEach(course => {
          const total = lessonCountByCourse[course.id] || 0;
          const done = completedByCourse[course.id] || 0;
          progressMap[course.slug] = { completed: done, total };
        });
        setCourseProgressMap(progressMap);

        // Determine which courses are completed (all lessons done)
        const completed = courses
          .filter(course => {
            const total = lessonCountByCourse[course.id] || 0;
            const done = completedByCourse[course.id] || 0;
            return total > 0 && done >= total;
          })
          .map(course => course.slug);

        setCompletedCourseSlugs(completed);
      }

      // Fetch achievements from database
      const { data: userAchievements } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", session.user.id)
        .order("earned_at", { ascending: false })
        .limit(5);

      if (userAchievements) {
        setAchievements(userAchievements);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = profileSchema.parse({
        full_name: fullName,
        avatar_url: avatarUrl,
      });

      setUpdating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validated.full_name,
          avatar_url: validated.avatar_url || null,
        })
        .eq("id", session.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = passwordSchema.parse({
        newPassword,
        confirmPassword,
      });

      setUpdating(true);

      const { error } = await supabase.auth.updateUser({
        password: validated.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleResendVerification = async () => {
    if (resendingVerification || !email) return;
    
    setResendingVerification(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setResendingVerification(false);
    }
  };

  const useStreakFreeze = async () => {
    if (!userId || streakFreezesAvailable <= 0 || isFreezingStreak) return;

    setIsFreezingStreak(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('profiles')
        .update({
          streak_freezes_available: streakFreezesAvailable - 1,
          streak_freezes_used: (await supabase.from('profiles').select('streak_freezes_used').eq('id', userId).single()).data?.streak_freezes_used + 1 || 1,
          last_freeze_date: today,
          last_activity_date: today, // Counts as activity to preserve streak
        })
        .eq('id', userId);

      if (error) throw error;

      setStreakFreezesAvailable(prev => prev - 1);
      toast({
        title: "Streak Frozen! ❄️",
        description: "Your streak is protected for today. You won't lose your progress!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to use streak freeze",
        variant: "destructive",
      });
    } finally {
      setIsFreezingStreak(false);
    }
  };

  const handleCareerSelect = async (careerSlug: string) => {
    setSelectedCareer(careerSlug);
    
    // Save to database
    if (userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ selected_career: careerSlug } as any)
        .eq("id", userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save career preference",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Career Updated",
          description: `Your career path has been updated`,
        });
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p className="text-center">Loading...</p>
        </div>
      </Layout>
    );
  }

  // Get career course slugs from database
  const career = getCareerBySlug(selectedCareer);
  const careerRelatedSlugs = career ? getCareerCourseSlugs(career.id) : [];
  
  const enrolledInCareer = enrolledCourses.filter(e =>
    careerRelatedSlugs.includes(e.courses?.slug)
  ).length;
  
  const recommendedCourses = allCourses.filter(course => 
    careerRelatedSlugs.includes(course.slug) && 
    !enrolledCourses.some(e => e.courses?.id === course.id)
  );

  const careerEnrolledCourses = enrolledCourses.filter(e => 
    careerRelatedSlugs.includes(e.courses?.slug)
  );

  // Calculate completed courses for the career path
  const careerCompletedSlugs = completedCourseSlugs.filter(slug => 
    careerRelatedSlugs.includes(slug)
  );
  const completedInCareer = careerCompletedSlugs.length;
  const avgMinutesPerDay = weeklyActivityData.activeDays > 0 
    ? Math.round((weeklyActivityData.totalSeconds / 60) / weeklyActivityData.activeDays) 
    : 0;

  // Get skills and calculate actual skill values from database
  const skills = career ? getCareerSkills(career.id) : [];
  
  // Calculate skill values based on lesson completion within courses
  const calculateSkillValues = () => {
    if (!career || skills.length === 0) return {};
    
    const skillValues: Record<string, number> = {};
    
    skills.forEach(skill => {
      let skillValue = 0;
      
      // For each course in this career path, calculate partial contribution based on lesson progress
      careerRelatedSlugs.forEach(courseSlug => {
        const contributions = getSkillContributionsForCourse(career.id, courseSlug);
        const contribution = contributions.find(c => c.skill_name === skill.skill_name);
        
        if (contribution) {
          // Get the course's lesson progress
          const progress = courseProgressMap[courseSlug];
          if (progress && progress.total > 0) {
            // Calculate partial contribution based on % of lessons completed
            const completionRatio = progress.completed / progress.total;
            skillValue += contribution.contribution * completionRatio;
          }
        }
      });
      
      // Cap at 100
      skillValues[skill.skill_name] = Math.min(Math.round(skillValue), 100);
    });
    
    return skillValues;
  };
  
  const skillValues = calculateSkillValues();
  
  // Calculate weighted career readiness percentage
  const calculateWeightedReadiness = () => {
    if (!skills.length) return 0;
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    skills.forEach(skill => {
      const value = skillValues[skill.skill_name] || 0;
      const weight = skill.weight || 25; // Default to 25 if no weight set
      weightedSum += value * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  };
  
  const readinessPercentage = calculateWeightedReadiness();

  // Determine focus message based on progress
  const getFocusContent = () => {
    // Find first incomplete course in career path
    const incompleteCourse = careerEnrolledCourses.find(e => {
      const progress = courseProgressMap[e.courses?.slug];
      return progress && progress.completed < progress.total;
    });
    
    if (incompleteCourse) {
      const progress = courseProgressMap[incompleteCourse.courses?.slug];
      const remaining = progress ? progress.total - progress.completed : 0;
      const estimatedMins = remaining * 15;
      return {
        message: `Complete ${incompleteCourse.courses?.name}`,
        subtext: estimatedMins > 0 ? `~${Math.ceil(estimatedMins / 60)}h remaining` : "Almost there!",
        currentCourse: incompleteCourse.courses?.name,
      };
    }
    
    if (readinessPercentage < 30) {
      return {
        message: "Build your foundation",
        subtext: `Reach ${30}% career readiness`,
        currentCourse: undefined,
      };
    }
    
    if (readinessPercentage < 75) {
      return {
        message: "Strengthen your skills",
        subtext: `Reach interview-ready status`,
        currentCourse: undefined,
      };
    }
    
    return {
      message: "Keep the momentum",
      subtext: "You're doing great!",
      currentCourse: undefined,
    };
  };
  
  const focusContent = getFocusContent();

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Dashboard Header + Career Readiness + Practice Labs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Premium Dashboard Header */}
          <ProfileDashboardHeader
            className="animate-stagger-1"
            fullName={fullName}
            careerName={career?.name || "Data Analyst"}
            currentStreak={currentStreak}
            maxStreak={maxStreak}
          />
          {/* Career Readiness */}
          <Card className="card-premium rounded-xl animate-stagger-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Career Readiness</h3>
                  <p className="text-sm text-muted-foreground">Your progress toward becoming job-ready</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Primary CTA: Career Board - Navigate to first course in career path */}
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-1.5 rounded-full px-4"
                    onClick={() => {
                      if (career) {
                        // Try to get specific course, otherwise navigate to career board index
                        if (skills.length > 0) {
                          const courseInfo = getCourseForSkill(career.id, skills[0].skill_name);
                          if (courseInfo) {
                            navigateToCourseInCareerBoard(career.slug, courseInfo.courseSlug);
                            return;
                          }
                        }
                        // Fallback: navigate to career board shell which auto-redirects to first course
                        navigate(`/career-board/${career.slug}`);
                      }
                    }}
                  >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="font-medium">Career Board</span>
                  </Button>
                  {/* Readiness Level Badge with Tooltip */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className="gap-1.5 px-3 py-1.5 text-primary border-primary/30 bg-primary/5 cursor-default"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span className="font-semibold text-sm">
                          {readinessPercentage >= 100 ? 'Career Ready' : readinessPercentage > 75 ? 'Interview Ready' : readinessPercentage > 50 ? 'Skill Builder' : 'Foundation Builder'}
                        </span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Based on your overall career readiness</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Skill Progress Bars */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto overflow-x-visible pr-2 py-2 pl-2 -ml-2 -mt-2">
                  {skills.map((skill, index) => {
                    // Get actual skill value from our calculation
                    const skillProgress = skillValues[skill.skill_name] || 0;
                    
                    // Get icon from database
                    const renderSkillIcon = (iconName: string) => {
                      const IconComp = getIcon(iconName, Code2);
                      return <IconComp className="h-5 w-5" />;
                    };
                    
                    return (
                      <div 
                        key={skill.id} 
                        className="group cursor-pointer hover:bg-primary/5 rounded-lg p-3 -m-1 transition-all duration-150 border border-transparent hover:border-primary/20 hover:shadow-md hover:translate-y-[-1px] active:translate-y-0"
                        onClick={() => handleSkillClick(skill.skill_name)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="text-primary transition-transform duration-150 group-hover:scale-110">
                              {renderSkillIcon(skill.icon)}
                            </div>
                            <span className="font-medium">{skill.skill_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">{skillProgress}%</span>
                            {/* Secondary contextual CTA - visible on hover */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="hidden group-hover:inline-flex items-center gap-1 h-6 text-[11px] font-medium text-primary/80 border-primary/30 bg-transparent px-2 py-0 rounded-full transition-all duration-150 hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSkillClick(skill.skill_name);
                              }}
                            >
                              View Courses
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:hidden transition-opacity duration-150" />
                          </div>
                        </div>
                        <Progress 
                          value={skillProgress} 
                          className="h-2.5"
                        />
                      </div>
                    );
                  })}
                  
                  {skills.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      <p>No skills defined for this career path.</p>
                      <p className="text-sm">Select a career to see required skills.</p>
                    </div>
                  )}
                </div>

                {/* Circular Progress Gauge - Modern Design */}
                {/* Check if close to next level threshold (within 5%) */}
                {(() => {
                  const isCloseToNextLevel = 
                    (readinessPercentage >= 15 && readinessPercentage < 20) ||
                    (readinessPercentage >= 45 && readinessPercentage < 50) ||
                    (readinessPercentage >= 75 && readinessPercentage < 80);
                  
                  return (
                    <div className="flex flex-col items-center justify-center">
                      <div className={`relative w-44 h-44 ${isCloseToNextLevel ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>
                        {/* Outer glow ring */}
                        <div 
                          className={`absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity duration-500 ${isCloseToNextLevel ? 'opacity-40' : ''}`}
                          style={{
                            background: `conic-gradient(from 0deg, hsl(var(--primary)) ${readinessPercentage}%, transparent ${readinessPercentage}%)`
                          }}
                        />
                        
                        <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 208 208">
                          {/* Background track with segments */}
                          <circle
                            cx="104"
                            cy="104"
                            r="88"
                            stroke="hsl(var(--muted))"
                            strokeWidth="12"
                            fill="none"
                            opacity="0.3"
                          />
                          
                          {/* Inner background circle */}
                          <circle
                            cx="104"
                            cy="104"
                            r="76"
                            stroke="hsl(var(--muted))"
                            strokeWidth="4"
                            fill="none"
                            opacity="0.2"
                          />
                          
                          {/* Progress gradient arc */}
                          <defs>
                            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="hsl(var(--primary))" />
                              <stop offset="50%" stopColor="hsl(280 80% 60%)" />
                              <stop offset="100%" stopColor="hsl(45 93% 47%)" />
                            </linearGradient>
                            {/* Glow filter for active arc */}
                            <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="2.5" result="blur" />
                              <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>
                          
                          {/* Main progress arc with glow */}
                          <circle
                            cx="104"
                            cy="104"
                            r="88"
                            stroke="url(#progressGradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(readinessPercentage / 100) * 553.07} 553.07`}
                            className="transition-all duration-1000 ease-out"
                            filter="url(#arcGlow)"
                          />
                          
                          {/* Decorative milestone dots on the track */}
                          {[0, 25, 50, 75, 100].map((percent, i) => {
                            const angle = (percent / 100) * 360 - 90;
                            const rad = (angle * Math.PI) / 180;
                            const x = 104 + 88 * Math.cos(rad);
                            const y = 104 + 88 * Math.sin(rad);
                            const isAchieved = readinessPercentage >= percent;
                            return (
                              <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r="4"
                                fill={isAchieved ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                                className="transition-all duration-500"
                              />
                            );
                          })}
                          
                          {/* Current progress indicator dot */}
                          {readinessPercentage > 0 && (() => {
                            const progressAngle = (readinessPercentage / 100) * 360 - 90;
                            const progressRad = (progressAngle * Math.PI) / 180;
                            const dotX = 104 + 88 * Math.cos(progressRad);
                            const dotY = 104 + 88 * Math.sin(progressRad);
                            return (
                              <circle
                                cx={dotX}
                                cy={dotY}
                                r="8"
                                fill="hsl(var(--background))"
                                stroke="url(#progressGradient)"
                                strokeWidth="3"
                                className="transition-all duration-1000 ease-out"
                                style={{
                                  filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.7))'
                                }}
                              />
                            );
                          })()}
                        </svg>
                        
                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="relative">
                            <span className="text-5xl font-bold bg-gradient-to-br from-primary via-purple-500 to-amber-500 bg-clip-text text-transparent">
                              {readinessPercentage}
                            </span>
                            <span className="text-2xl font-bold text-muted-foreground">%</span>
                          </div>
                          <span className="text-sm text-muted-foreground mt-1">Career Ready</span>
                        </div>
                      </div>

                      {/* Micro guidance - Silent Coach */}
                      {readinessPercentage < 100 && skills.length > 0 && (() => {
                        // Find the lowest skill to suggest focus
                        const lowestSkill = skills.reduce((min, skill) => {
                          const currentValue = skillValues[skill.skill_name] || 0;
                          const minValue = skillValues[min.skill_name] || 0;
                          return currentValue < minValue ? skill : min;
                        }, skills[0]);
                        const nextThreshold = readinessPercentage < 20 ? 20 : 
                                             readinessPercentage < 50 ? 50 : 
                                             readinessPercentage < 80 ? 80 : 100;
                        return (
                          <p className="text-xs text-primary/70 mt-3 text-center max-w-[200px] leading-relaxed">
                            Next focus: <span className="font-medium">{lowestSkill.skill_name}</span> to reach {nextThreshold}% readiness
                          </p>
                        );
                      })()}

                      {/* Bottom CTA with contextual subtext */}
                      <div className="flex flex-col items-center mt-5 group/cta gap-2">
                        <Button 
                          className="gap-2 rounded-full px-5"
                          onClick={() => {
                            // This is a career action - navigate to first course inside Career Board
                            if (career) {
                              if (skills.length > 0) {
                                const courseInfo = getCourseForSkill(career.id, skills[0].skill_name);
                                if (courseInfo) {
                                  navigateToCourseInCareerBoard(career.slug, courseInfo.courseSlug);
                                  return;
                                }
                              }
                              // Fallback: navigate to career board shell which auto-redirects
                              navigate(`/career-board/${career.slug}`);
                              return;
                            }
                            // No career selected - go to arcade to pick one
                            navigate('/arcade');
                          }}
                        >
                          Improve Career Readiness
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Labs Section - Directly below Career Readiness */}
          <Card className="card-premium rounded-xl animate-stagger-3">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Recommended Labs</CardTitle>
                    <CardDescription>Practice exercises based on your enrolled courses</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleTabChange('practice')} className="gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {enrolledCourses.slice(0, 3).map((enrollment, index) => {
                  const course = enrollment.courses;
                  if (!course) return null;
                  
                  const labTypes = ['Coding Challenge', 'Quiz', 'Project'];
                  const labIcons = [<Zap className="h-4 w-4" />, <Target className="h-4 w-4" />, <Award className="h-4 w-4" />];
                  const labColors = ['from-emerald-500 to-teal-600', 'from-blue-500 to-indigo-600', 'from-purple-500 to-pink-600'];
                  
                  return (
                    <Card 
                      key={enrollment.id} 
                      className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer border"
                      onClick={() => handleTabChange('practice')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${labColors[index % 3]} flex items-center justify-center shrink-0`}>
                            {labIcons[index % 3]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{course.name} {labTypes[index % 3]}</p>
                            <p className="text-xs text-muted-foreground mt-1">Practice your skills</p>
                            <Badge variant="secondary" className="mt-2 text-xs">
                              {labTypes[index % 3]}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {enrolledCourses.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Enroll in courses to unlock practice labs</p>
                    <Button variant="link" onClick={() => navigate('/courses')} className="mt-2">
                      Browse Courses
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Today's Focus + Weekly Activity + AI Mentor */}
        <div className="flex flex-col space-y-6 h-full min-h-full">
          {/* Today's Focus Card */}
          <Card className="card-premium rounded-xl animate-stagger-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">
                  Today's Focus
                </span>
              </div>
              
              <div className="space-y-3">
                {/* Lesson Suggestion */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Continue Learning</p>
                    <p className="text-xs text-muted-foreground truncate">{focusContent.message}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                {/* MCQ Suggestion */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Daily Quiz</p>
                    <p className="text-xs text-muted-foreground">Test your knowledge with MCQs</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>

                {/* Debug & Practice Suggestion */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 hover:bg-violet-500/10 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Code className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">Debug & Practice</p>
                    <p className="text-xs text-muted-foreground">Hands-on coding challenges</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>

          <ProfileWeeklyActivityCard
            className="animate-stagger-2"
            loading={weeklyActivityLoading}
            weeklyActivityData={weeklyActivityData}
          />

          {/* AI Mentor Card - Expand to match Practice Labs height */}
          <Card className="card-premium rounded-xl animate-stagger-3 flex-1 flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/30">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold">AI Mentor</h3>
                  <p className="text-sm text-muted-foreground">
                    Your personal learning assistant
                  </p>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-between">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {completedInCareer < careerRelatedSlugs.length 
                    ? `Continue your ${career?.name || 'career'} journey. Get personalized guidance on what to learn next and improve your skills.`
                    : 'Great progress! Ask me about advanced topics, career advice, or explore new learning paths.'}
                </p>
                
                <Button variant="default" className="w-full mt-4 gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                  <Sparkles className="h-4 w-4" />
                  Ask AI Mentor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Arcade Section */}
      <Card className="card-premium rounded-xl animate-stagger-5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Gamepad2 className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold mb-1">Arcade</h3>
              <p className="text-muted-foreground">
                Test your skills with interactive challenges, quizzes, and games to reinforce your learning.
              </p>
            </div>
            <Button 
              onClick={() => navigate('/arcade')} 
              className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
            >
              <Gamepad2 className="h-4 w-4" />
              Enter Arcade
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <CareerSelectionDialog
        open={careerDialogOpen}
        onOpenChange={setCareerDialogOpen}
        selectedCareerSlug={selectedCareer}
        onCareerSelect={handleCareerSelect}
      />
    </div>
  );


  const renderLearnings = () => {
    // Get featured courses (not enrolled)
    const enrolledCourseIds = enrolledCourses.map(e => e.courses?.id);
    const featuredCourses = allCourses.filter(c => !enrolledCourseIds.includes(c.id)).slice(0, 4);

    // Color gradients for featured cards
    const gradients = [
      'from-blue-600 to-blue-800',
      'from-teal-600 to-teal-800', 
      'from-purple-600 to-purple-800',
      'from-cyan-600 to-cyan-800',
    ];

    // Split enrolled courses into ongoing and completed
    const ongoingCourses = enrolledCourses.filter(enrollment => {
      const progress = courseProgressMap[enrollment.courses?.slug];
      // Not completed: either no progress data or completed < total or total is 0
      return !progress || progress.total === 0 || progress.completed < progress.total;
    });

    const completedCourses = enrolledCourses.filter(enrollment => {
      const progress = courseProgressMap[enrollment.courses?.slug];
      // Completed: has progress data, total > 0, and completed >= total
      return progress && progress.total > 0 && progress.completed >= progress.total;
    });

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <h2 className="text-2xl font-bold">Study Plan</h2>
          <Button 
            variant="ghost" 
            onClick={() => {
              // Guard: if careers data is still loading, don't navigate yet
              if (careersLoading) {
                toast({ description: "Loading career data...", duration: 1500 });
                return;
              }
              // Get career ID and first course to navigate to proper shell
              const career = getCareerBySlug(selectedCareer);
              if (career) {
                const courseSlugs = getCareerCourseSlugs(career.id);
                if (courseSlugs.length > 0) {
                  navigate(`/career-board/${selectedCareer}/course/${courseSlugs[0]}`);
                } else {
                  navigate('/arcade');
                }
              } else {
                navigate('/arcade');
              }
            }}
            className="gap-1"
          >
            My Study Plan <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Ongoing Section */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Ongoing
          </h3>
          {ongoingCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ongoingCourses.map((enrollment) => (
                <OngoingCourseCard 
                  key={enrollment.id}
                  course={enrollment.courses}
                  userId={userId}
                  onClick={() => navigateToCourse(enrollment.courses?.slug, enrollment.courses?.id)}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-muted/30">
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No ongoing courses. Start learning today!</p>
                <Button className="mt-4" size="sm" onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Completed Section */}
        {completedCourses.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Completed
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedCourses.map((enrollment) => (
                <CompletedCourseCard 
                  key={enrollment.id}
                  course={enrollment.courses}
                  onClick={() => navigateToCourse(enrollment.courses?.slug, enrollment.courses?.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Featured Section */}
        {featuredCourses.length > 0 && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Featured Courses
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCourses.map((course, index) => (
                <FeaturedCourseCard 
                  key={course.id}
                  course={course}
                  gradient={gradients[index % gradients.length]}
                  onClick={() => navigateToCourse(course.slug, course.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBookmarks = () => {
    const courseBookmarks = bookmarks.filter(b => b.course_id);
    const lessonBookmarks = bookmarks.filter(b => b.post_id);
    const totalBookmarks = bookmarks.length + problemBookmarks.length;
    const isLoading = bookmarksLoading || problemBookmarksLoading;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Bookmarks</h2>
          <Badge variant="secondary">{totalBookmarks} Saved</Badge>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading bookmarks...</p>
          </div>
        ) : totalBookmarks > 0 ? (
          <div className="space-y-6">
            {/* Course Bookmarks */}
            {courseBookmarks.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Courses ({courseBookmarks.length})
                </h3>
                <div className="grid gap-4">
                  {courseBookmarks.map((bookmark) => (
                    <Card 
                      key={bookmark.id}
                      className="card-premium hover:scale-[1.01] transition-transform"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div 
                          className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.courses?.slug}`)}
                        >
                          {bookmark.courses?.featured_image ? (
                            <img 
                              src={bookmark.courses.featured_image} 
                              alt={bookmark.courses.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.courses?.slug}`)}
                        >
                          <h4 className="font-semibold truncate">{bookmark.courses?.name}</h4>
                          <Badge variant="outline" className="mt-1">
                            {bookmark.courses?.level || 'Beginner'}
                          </Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleBookmark(bookmark.course_id || undefined)}
                          className="flex-shrink-0"
                        >
                          <BookmarkX className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Lesson Bookmarks */}
            {lessonBookmarks.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Lessons ({lessonBookmarks.length})
                </h3>
                <div className="grid gap-4">
                  {lessonBookmarks.map((bookmark) => (
                    <Card 
                      key={bookmark.id}
                      className="card-premium hover:scale-[1.01] transition-transform"
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.posts?.courses?.slug}?lesson=${bookmark.posts?.slug}`)}
                        >
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => navigate(`/course/${bookmark.posts?.courses?.slug}?lesson=${bookmark.posts?.slug}`)}
                        >
                          <h4 className="font-semibold truncate">{bookmark.posts?.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {bookmark.posts?.excerpt 
                              ? bookmark.posts.excerpt.replace(/<[^>]*>/g, '').slice(0, 100) 
                              : 'No description'}
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleBookmark(undefined, bookmark.post_id || undefined)}
                          className="flex-shrink-0"
                        >
                          <BookmarkX className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Problem Bookmarks */}
            {problemBookmarks.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Code className="h-5 w-5 text-orange-500" />
                  Saved Problems ({problemBookmarks.length})
                </h3>
                <div className="grid gap-4">
                  {problemBookmarks.map((bookmark) => {
                    const problem = bookmark.problem;
                    const difficultyColor = 
                      problem?.difficulty === 'Easy' ? 'text-green-500' :
                      problem?.difficulty === 'Medium' ? 'text-yellow-500' : 'text-red-500';
                    
                    return (
                      <Card 
                        key={bookmark.id}
                        className="card-premium hover:scale-[1.01] transition-transform"
                      >
                        <CardContent className="p-4 flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center flex-shrink-0 cursor-pointer"
                            onClick={() => problem?.skill_id && navigate(`/practice/${problem.skill_id}/problem/${problem.slug}`)}
                          >
                            <Code className="h-6 w-6 text-orange-500" />
                          </div>
                          <div 
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => problem?.skill_id && navigate(`/practice/${problem.skill_id}/problem/${problem.slug}`)}
                          >
                            <h4 className="font-semibold truncate">{problem?.title || 'Unknown Problem'}</h4>
                            <span className={`text-sm font-medium ${difficultyColor}`}>
                              {problem?.difficulty || 'Unknown'}
                            </span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => toggleProblemBookmark(bookmark.problem_id)}
                            className="flex-shrink-0"
                          >
                            <BookmarkX className="h-5 w-5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
              <p className="text-muted-foreground mb-4">Save lessons, courses, and problems for quick access.</p>
              <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDiscussions = () => {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    };

    const extractTextFromContent = (content: string) => {
      try {
        const parsed = JSON.parse(content);
        if (parsed?.content) {
          const extractText = (node: any): string => {
            if (node.text) return node.text;
            if (node.content) return node.content.map(extractText).join('');
            return '';
          };
          return extractText(parsed);
        }
        return content;
      } catch {
        return content.replace(/<[^>]*>/g, '');
      }
    };

    const handleSubmitReply = async (parentId: string, postId: string) => {
      if (!replyContent || !userId) return;
      
      // Check if content is empty TipTap doc
      try {
        const parsed = JSON.parse(replyContent);
        const isEmpty = !parsed?.content?.some((node: any) => 
          node.content?.some((c: any) => c.text?.trim())
        );
        if (isEmpty) return;
      } catch {
        if (!replyContent.trim()) return;
      }
      
      setSubmittingReply(true);
      try {
        const contentJson = replyContent;
        
        const { data, error } = await supabase
          .from('comments')
          .insert({
            content: contentJson,
            post_id: postId,
            user_id: userId,
            parent_id: parentId,
            is_anonymous: false,
            status: 'approved'
          })
          .select(`
            id,
            content,
            created_at,
            is_anonymous,
            display_name,
            parent_id,
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `)
          .single();
        
        if (error) throw error;
        
        // Add the new reply to the replies map
        setCommentReplies(prev => ({
          ...prev,
          [parentId]: [...(prev[parentId] || []), data]
        }));
        
        setReplyContent("");
        toast({
          title: "Reply posted",
          description: "Your reply has been added to the discussion."
        });
      } catch (error) {
        console.error('Error posting reply:', error);
        toast({
          title: "Error",
          description: "Failed to post reply. Please try again.",
          variant: "destructive"
        });
      } finally {
        setSubmittingReply(false);
      }
    };

    const getDisplayName = (reply: any) => {
      if (reply.is_anonymous) return reply.display_name || 'Anonymous';
      return reply.profiles?.full_name || 'Unknown User';
    };

    if (commentsLoading) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">My Discussions</h2>
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/3 mx-auto" />
                <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">My Discussions</h2>
        
        {userComments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No discussions yet</h3>
              <p className="text-muted-foreground">Join the conversation by commenting on lessons.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {userComments.map((comment) => {
              const post = comment.posts as any;
              const course = post?.courses;
              const commentText = extractTextFromContent(comment.content);
              const replies = commentReplies[comment.id] || [];
              const isExpanded = expandedComment === comment.id;
              
              return (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    {/* Main comment header */}
                    <div 
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() => setExpandedComment(isExpanded ? null : comment.id)}
                    >
                      <div className="shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            <MessageSquare className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium text-primary">
                            {course?.name || 'Unknown Course'}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                          {replies.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 truncate">
                          {post?.title || 'Unknown Lesson'}
                        </p>
                        <p className="text-foreground">
                          {commentText}
                        </p>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                    
                    {/* Expanded section with replies and reply form */}
                    {isExpanded && (
                      <div className="mt-4 ml-14 space-y-4">
                        {/* Replies */}
                        {replies.length > 0 && (
                          <div className="space-y-3 border-l-2 border-muted pl-4">
                            {replies.map((reply) => (
                              <div key={reply.id} className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={reply.profiles?.avatar_url || undefined} />
                                  <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                    {getDisplayName(reply).charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">
                                      {getDisplayName(reply)}
                                    </span>
                                    {reply.user_id === comment.user_id && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                                        Author
                                      </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {formatDate(reply.created_at)}
                                    </span>
                                  </div>
                                  <p className="text-sm text-foreground">
                                    {extractTextFromContent(reply.content)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Reply form */}
                        <div className="flex gap-3 items-start pt-2 border-t border-muted">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatarUrl || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <LightEditor
                              value={replyContent}
                              onChange={setReplyContent}
                              placeholder="Write a reply..."
                              minHeight="60px"
                            />
                            <div className="flex justify-between items-center">
                              <Button 
                                variant="link" 
                                size="sm" 
                                className="text-xs p-0 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (course?.slug && post?.slug) {
                                    navigate(`/courses/${course.slug}/${post.slug}`);
                                  }
                                }}
                              >
                                View in lesson →
                              </Button>
                              <Button 
                                size="sm"
                                disabled={!replyContent || submittingReply}
                                onClick={() => handleSubmitReply(comment.id, comment.post_id)}
                              >
                                {submittingReply ? "Posting..." : "Reply"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAchievements = () => {
    const readinessPercentage = careerRelatedSlugs.length > 0 
      ? Math.round((completedInCareer / careerRelatedSlugs.length) * 100) 
      : 0;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Achievements</h2>
        
        {/* Skill Milestones - Full View */}
        <SkillMilestones 
          completedCourses={completedInCareer}
          readinessPercentage={readinessPercentage}
          compact={false}
        />

        {/* Additional Achievements */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Learning Badges
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'First Lesson', desc: 'Complete your first lesson', locked: true },
                { name: 'Enrolled', desc: 'Enroll in your first course', locked: enrolledCourses.length === 0 },
                { name: 'Bookworm', desc: 'Complete 5 courses', locked: completedCourseSlugs.length < 5 },
                { name: 'Discussion Star', desc: 'Leave 10 comments', locked: true },
              ].map((achievement, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border text-center transition-all ${
                    achievement.locked 
                      ? 'opacity-50 bg-muted/30 border-dashed' 
                      : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${
                    achievement.locked ? 'bg-muted' : 'bg-primary/10'
                  }`}>
                    <Award className={`h-6 w-6 ${achievement.locked ? 'text-muted-foreground' : 'text-primary'}`} />
                  </div>
                  <h4 className="font-medium text-sm">{achievement.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{achievement.desc}</p>
                  {!achievement.locked && <Badge className="mt-2" variant="secondary">Unlocked</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };


  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>Update your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={avatarUrl} alt={fullName} />
                <AvatarFallback className="text-2xl">
                  {fullName?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{fullName || 'User'}</h3>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <div className="flex items-center gap-2 mt-2">
                {emailVerified === null ? (
                  <span className="text-xs text-muted-foreground">Checking verification status...</span>
                ) : emailVerified ? (
                  <div className="flex items-center gap-1.5 text-xs text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Email verified</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5 text-xs text-accent">
                      <AlertCircle className="h-4 w-4" />
                      <span>Email not verified</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                      className="h-7 text-xs"
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      {resendingVerification ? "Sending..." : "Resend verification"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            <Button type="submit" disabled={updating}>
              {updating ? "Updating..." : "Update Profile"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
              />
            </div>

            <Button type="submit" disabled={updating}>
              {updating ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences - Only show for admins/moderators */}
      {(isAdmin || isModerator) && (
        <NotificationPreferences 
          userId={userId} 
          isAdmin={isAdmin} 
          isModerator={isModerator} 
        />
      )}

      {/* Logout */}
      <Card className="border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Sign Out</h3>
              <p className="text-sm text-muted-foreground">Sign out of your account</p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPracticeLab = () => (
    <div className="px-8 md:px-16 lg:px-32 xl:px-40">
      <PracticeLab enrolledCourses={enrolledCourses} userId={userId || undefined} />
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'learnings': return renderLearnings();
      case 'practice': return renderPracticeLab();
      case 'bookmarks': return renderBookmarks();
      case 'discussions': return renderDiscussions();
      case 'achievements': return renderAchievements();
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className={`flex flex-col lg:flex-row gap-8 -mx-4 px-4 py-6 rounded-2xl ${activeTab === 'dashboard' ? 'dashboard-bg' : 'bg-background'}`}>
          {/* Sidebar - hidden for Practice Lab */}
          {activeTab !== 'practice' && (
          <aside className="lg:w-64 flex-shrink-0 animate-sidebar">
            <Card className="rounded-xl bg-card/80 backdrop-blur-sm border shadow-lg">
              <CardContent className="p-4">
                {/* Profile Summary */}
                <div className="text-center pb-4 mb-4 border-b border-border/50">
                  <div className="mx-auto w-fit">
                    <Avatar className="h-20 w-20 ring-4 ring-primary/20 ring-offset-2 ring-offset-background shadow-lg">
                      <AvatarImage src={avatarUrl} alt={fullName} />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                        {fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h3 className="font-semibold text-lg truncate mt-3 text-foreground">{fullName || 'User'}</h3>
                  <p className="text-sm text-muted-foreground truncate">{email}</p>
                </div>
                
                {/* Navigation */}
                <nav className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                        activeTab === item.id 
                          ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                          : 'hover:bg-muted/70 text-foreground hover:translate-x-1'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${activeTab === item.id ? '' : 'text-muted-foreground'}`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>

                {/* Explore Section */}
                <div className="border-t mt-2 pt-2">
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Explore
                  </p>
                  <nav className="space-y-1">
                    {exploreItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                          activeTab === item.id 
                            ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                            : 'hover:bg-muted/70 text-foreground hover:translate-x-1'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${activeTab === item.id ? '' : 'text-muted-foreground'}`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => navigate('/library')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/70 text-foreground hover:translate-x-1"
                    >
                      <Library className="h-5 w-5 text-muted-foreground" />
                      <span>Library</span>
                    </button>
                    <button
                      onClick={() => navigate('/arcade')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/70 text-foreground hover:translate-x-1"
                    >
                      <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                      <span>Arcade</span>
                    </button>
                  </nav>
                </div>

                {/* Account Section */}
                <div className="border-t mt-2 pt-2">
                  <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Account
                  </p>
                  <nav className="space-y-1">
                    {accountItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleTabChange(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-all duration-200 ${
                          activeTab === item.id 
                            ? 'bg-primary text-primary-foreground font-medium shadow-md' 
                            : 'hover:bg-muted/70 text-foreground hover:translate-x-1'
                        }`}
                      >
                        <item.icon className={`h-5 w-5 ${activeTab === item.id ? '' : 'text-muted-foreground'}`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                    {(isAdmin || isModerator) && (
                      <button
                        onClick={() => navigate('/admin')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors hover:bg-muted/70 text-foreground hover:translate-x-1"
                      >
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                  </nav>
                </div>
              </CardContent>
            </Card>
          </aside>
          )}

          {/* Main Content */}
          <main className={`flex-1 min-w-0 ${activeTab === 'practice' ? 'py-8' : ''}`}>
            {renderContent()}
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
