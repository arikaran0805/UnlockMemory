import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import UMLoader from "@/components/UMLoader";
import { useCourseNavigation } from "@/hooks/useCourseNavigation";
import { useTodaysFocus } from "@/hooks/useTodaysFocus";
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
import { CareerSelectionDialog } from "@/components/CareerSelectionDialog";
import { ProfileWeeklyActivityCard } from "@/components/profile/ProfileWeeklyActivityCard";
import { ProfileDashboardHeader } from "@/components/profile/ProfileDashboardHeader";
import { ContinueLearningCard } from "@/components/ContinueLearningCard";
import Layout from "@/components/Layout";
import SlimFooter from "@/components/SlimFooter";
import { useUserRole } from "@/hooks/useUserRole";
import { PracticeLab } from "@/components/practice";
import { useActiveLabsProgress } from "@/hooks/useActiveLabsProgress";
import { useSkillsProgress } from "@/hooks/useSkillsProgress";
import { usePublishedPracticeSkills } from "@/hooks/usePracticeSkills";
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
  LayoutGrid,
  BookCopy,
  Lock,
  ChevronLeft
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

type TabType = 'dashboard' | 'learnings' | 'bookmarks' | 'discussions' | 'settings' | 'practice';

const sidebarItems = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'learnings' as TabType, label: 'My Learnings', icon: BookOpen },
  { id: 'bookmarks' as TabType, label: 'Bookmarks', icon: Bookmark },
  { id: 'discussions' as TabType, label: 'Discussions', icon: MessageSquare },
];

const exploreItems = [
  { id: 'practice' as TabType, label: 'Practice Lab', icon: FlaskConical },
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

  // Estimate remaining time
  const remainingLessons = progress.total - progress.completed;
  const estimatedRemainingHours = Math.max(1, Math.round((remainingLessons * 15) / 60));

  const iconName = course?.icon || 'BookOpen';
  const IconComponent = getIcon(iconName, BookOpen);

  return (
    <div
      className="cursor-pointer group relative"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: '28px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)',
        transition: 'all 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)';
      }}
      onClick={onClick}
    >
      {/* Subtle top-left glass sheen */}
      <div 
        className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, transparent 70%)' }}
      />

      <div className="relative p-6">
        {/* Top row: Icon badge + metadata */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))' }}
            >
              <IconComponent className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground leading-snug tracking-[-0.01em] line-clamp-2">
                {course?.name}
              </h3>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                {course?.level || "Beginner"} · {progress.total} lessons
              </span>
            </div>
          </div>
          {/* Progress percentage pill */}
          <span 
            className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 tabular-nums"
            style={{ 
              background: progressPercent >= 75 ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.04)',
              color: progressPercent >= 75 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            }}
          >
            {progressPercent}%
          </span>
        </div>

        {/* Description line */}
        {course?.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mb-4">
            {course.description.replace(/<[^>]*>/g, '').slice(0, 120)}
          </p>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="w-full overflow-hidden" style={{ height: '4px', borderRadius: '999px', background: 'rgba(0,0,0,0.04)' }}>
            <div 
              className="h-full transition-all duration-500"
              style={{ 
                width: `${progressPercent}%`, 
                background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(142, 76%, 36%))',
                borderRadius: '999px',
              }}
            />
          </div>
        </div>

        {/* Next lesson */}
        {nextLesson && (
          <div className="flex items-center gap-2 mb-4">
            <Play className="h-3 w-3 text-primary fill-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Up next:</span>
            <span className="text-xs font-medium text-foreground truncate">{nextLesson.title}</span>
          </div>
        )}

        {/* Bottom: time remaining + CTAs */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1 text-xs">
              <Clock className="h-3.5 w-3.5" />
              ~{estimatedRemainingHours}h left
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span 
              className="text-xs font-medium text-muted-foreground hidden sm:inline-flex items-center gap-0.5 group-hover:text-foreground transition-colors duration-200"
            >
              View roadmap
              <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
            <button 
              className="text-xs font-semibold text-white border-0 cursor-pointer flex items-center gap-1.5"
              style={{ 
                background: 'linear-gradient(180deg, hsl(var(--primary)), hsl(142, 76%, 36%))',
                borderRadius: '999px',
                padding: '8px 18px',
                boxShadow: '0 4px 14px hsla(142, 71%, 45%, 0.25)',
                transition: 'all 220ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px hsla(142, 71%, 45%, 0.35)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px hsla(142, 71%, 45%, 0.25)'; }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Continue
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// CompletedCourseCard component - premium unified surface
const CompletedCourseCard = ({ 
  course, 
  onClick 
}: { 
  course: any;
  onClick: () => void;
}) => {
  const iconName = course?.icon || 'BookOpen';
  const IconComponent = getIcon(iconName, BookOpen);

  return (
    <div
      className="cursor-pointer group relative"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: '28px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)',
        transition: 'all 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.03)';
      }}
      onClick={onClick}
    >
      {/* Subtle top-left glass sheen */}
      <div 
        className="absolute top-0 left-0 w-48 h-48 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.6) 0%, transparent 70%)' }}
      />

      <div className="relative p-6">
        {/* Top row: Icon badge + completed status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.05))' }}
            >
              <IconComponent className="h-5 w-5 text-primary" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-foreground leading-snug tracking-[-0.01em] line-clamp-2">
                {course?.name}
              </h3>
              <span className="text-xs text-muted-foreground mt-0.5 block">
                {course?.level || "Beginner"} · {course?.learning_hours > 0 ? `${course.learning_hours}h` : '—'}
              </span>
            </div>
          </div>
          {/* Completed badge */}
          <span 
            className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1"
            style={{ background: 'rgba(34,197,94,0.1)', color: 'hsl(var(--primary))' }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Done
          </span>
        </div>

        {/* Full progress bar */}
        <div className="mb-4">
          <div className="w-full overflow-hidden" style={{ height: '4px', borderRadius: '999px', background: 'rgba(0,0,0,0.04)' }}>
            <div 
              className="h-full"
              style={{ width: '100%', background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(142, 76%, 36%))', borderRadius: '999px' }}
            />
          </div>
        </div>

        {/* Bottom: CTAs */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            Course completed
          </span>
          <button 
            className="text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5"
            style={{ 
              background: 'rgba(34,197,94,0.08)',
              color: 'hsl(var(--primary))',
              padding: '8px 18px',
              borderRadius: '999px',
              transition: 'all 220ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.14)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Review
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// FeaturedCourseCard - premium editorial card with soft gradient
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
      const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', course.id);
      setLessonCount(count || 0);
    };
    fetchLessonCount();
  }, [course?.id]);

  const displayHours = course.learning_hours > 0 
    ? course.learning_hours 
    : Math.max(1, Math.round((lessonCount * 15) / 60));

  const iconName = course?.icon || 'BookOpen';
  const IconComponent = getIcon(iconName, BookOpen);

  return (
    <div 
      className="cursor-pointer group relative"
      style={{
        background: gradient,
        borderRadius: '28px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04)',
        transition: 'all 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.04)';
      }}
      onClick={onClick}
    >
      {/* Glass sheen overlay */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%)' }}
      />
      
      {/* Watermark icon */}
      <div className="absolute -right-6 -bottom-6 pointer-events-none transition-transform duration-300 group-hover:scale-110" style={{ opacity: 0.08 }}>
        <IconComponent className="h-36 w-36 text-white" />
      </div>

      <div className="relative p-7 flex flex-col justify-between h-[220px]">
        <div>
          {/* Badge */}
          <span 
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-3"
            style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.9)' }}
          >
            <IconComponent className="h-3 w-3" />
            Course
          </span>
          
          <h4 className="text-lg font-semibold text-white leading-snug tracking-[-0.01em] line-clamp-2">
            {course.name}
          </h4>
          
          {course.description && (
            <p className="text-xs leading-relaxed line-clamp-1 mt-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {course.description.replace(/<[^>]*>/g, '').slice(0, 80)}
            </p>
          )}
        </div>

        <div>
          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs mb-4" style={{ color: 'rgba(255,255,255,0.75)' }}>
            <span className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              {lessonCount} lessons
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {displayHours}h
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {course.level || 'Beginner'}
            </span>
          </div>

          {/* CTA row */}
          <div className="flex items-center justify-between">
            <button 
              className="text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5"
              style={{ 
                background: 'rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: '999px',
                transition: 'all 220ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Explore
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <span 
              className="text-xs font-medium hidden sm:inline-flex items-center gap-0.5 transition-colors duration-200"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Preview path
              <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
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

  // Practice labs progress — used in My Learnings
  const enrolledCourseIds = useMemo(
    () => enrolledCourses.map((e: any) => e.courses?.id).filter(Boolean) as string[],
    [enrolledCourses],
  );
  const { data: labProgressMap, isLoading: labProgressLoading } = useActiveLabsProgress(
    userId ?? undefined,
    enrolledCourseIds,
  );
  const sortedActiveLabs = useMemo(() => {
    if (!labProgressMap) return [];
    const active = enrolledCourses.filter((enrollment: any) => {
      const courseId = enrollment.courses?.id;
      if (!courseId) return false;
      const p = labProgressMap.get(courseId);
      return p && p.percentage > 0 && p.percentage < 100;
    });
    return [...active].sort((a: any, b: any) => {
      const at = labProgressMap?.get(a.courses?.id)?.lastPracticedAt;
      const bt = labProgressMap?.get(b.courses?.id)?.lastPracticedAt;
      return (bt ? new Date(bt).getTime() : 0) - (at ? new Date(at).getTime() : 0);
    });
  }, [enrolledCourses, labProgressMap]);

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
  // Compute active course for Today's Focus (must be before early returns for hooks)
  const activeFocusCourse = React.useMemo(() => {
    const careerObj = getCareerBySlug(selectedCareer);
    const slugs = careerObj ? getCareerCourseSlugs(careerObj.id) : [];
    const careerEnrolled = enrolledCourses.filter(e => slugs.includes(e.courses?.slug));
    const incomplete = careerEnrolled.find(e => {
      const progress = courseProgressMap[e.courses?.slug];
      return progress && progress.completed < progress.total;
    });
    if (incomplete) {
      return { slug: incomplete.courses?.slug, id: incomplete.courses?.id, name: incomplete.courses?.name };
    }
    // Fallback: first enrolled course
    if (careerEnrolled.length > 0) {
      return { slug: careerEnrolled[0].courses?.slug, id: careerEnrolled[0].courses?.id, name: careerEnrolled[0].courses?.name };
    }
    return { slug: undefined, id: undefined, name: undefined };
  }, [enrolledCourses, courseProgressMap, selectedCareer]);

  const todaysFocus = useTodaysFocus(userId, activeFocusCourse.slug, activeFocusCourse.id, activeFocusCourse.name);

  if (loading) {
    return (
      <Layout showFooter={false}>
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-10">
          <div className="flex flex-col items-center gap-4">
            <UMLoader size={64} dark label={null} />
            <span className="text-[11px] text-muted-foreground tracking-[0.06em] uppercase">Loading…</span>
          </div>
        </div>
        <SlimFooter />
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

  // Determine focus message and active course based on progress
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
        activeCourseSlug: incompleteCourse.courses?.slug as string | undefined,
        activeCourseId: incompleteCourse.courses?.id as string | undefined,
        activeCourseName: incompleteCourse.courses?.name as string | undefined,
      };
    }
    
    if (readinessPercentage < 30) {
      return {
        message: "Build your foundation",
        subtext: `Reach ${30}% career readiness`,
        currentCourse: undefined,
        activeCourseSlug: undefined,
        activeCourseId: undefined,
        activeCourseName: undefined,
      };
    }
    
    if (readinessPercentage < 75) {
      return {
        message: "Strengthen your skills",
        subtext: `Reach interview-ready status`,
        currentCourse: undefined,
        activeCourseSlug: undefined,
        activeCourseId: undefined,
        activeCourseName: undefined,
      };
    }
    
    return {
      message: "Keep the momentum",
      subtext: "You're doing great!",
      currentCourse: undefined,
      activeCourseSlug: undefined,
      activeCourseId: undefined,
      activeCourseName: undefined,
    };
  };
  
  const focusContent = getFocusContent();

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Left Column - Dashboard Header + Career Readiness + Practice Labs */}
        <div className="lg:col-span-2 space-y-7">
          {/* Premium Dashboard Header */}
          <ProfileDashboardHeader
            className="animate-stagger-1"
            fullName={fullName}
            careerName={career?.name || "Data Analyst"}
            currentStreak={currentStreak}
            maxStreak={maxStreak}
          />
          {/* Career Readiness - Primary tier */}
          <Card className="card-premium card-primary card-no-lift animate-stagger-2">
            <CardContent className="p-7">
              <div className="flex items-center justify-between mb-7">
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.02em] text-foreground">Career Readiness</h3>
                  <p className="text-sm mt-1 font-normal text-muted-foreground">Your progress toward becoming job-ready</p>
                </div>
                <div className="flex items-center gap-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
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
                          className="group cursor-pointer hover:bg-muted/40 rounded-xl p-3.5 -m-1 transition-all duration-200 border border-transparent hover:border-border/40"
                          onClick={() => handleSkillClick(skill.skill_name)}
                        >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="text-primary/70 transition-transform duration-200 group-hover:scale-110">
                              {renderSkillIcon(skill.icon)}
                            </div>
                            <span className="font-medium">{skill.skill_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold tabular-nums">{skillProgress}%</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                          </div>
                        </div>
                        <Progress 
                          value={skillProgress} 
                          className="h-[6px] rounded-full progress-animate [&]:bg-muted/60 [&>div]:rounded-full [&>div]:bg-primary"
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
                              <stop offset="0%" stopColor="#86EFAC" />
                              <stop offset="100%" stopColor="#15803D" />
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
                            <span className="text-5xl font-bold">
                              {readinessPercentage}
                            </span>
                            <span className="text-2xl font-bold">%</span>
                          </div>
                          <span className="text-sm mt-1 text-muted-foreground">Career Ready</span>
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

                      {/* Bottom CTA */}
                      <div className="flex flex-col items-center mt-5">
                        <Button 
                          className="gap-2 rounded-full px-6 font-semibold text-white hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[220ms]"
                          style={{ background: 'linear-gradient(180deg, #22C55E, #16A34A)', boxShadow: '0 10px 24px rgba(34,197,94,0.3)' }}
                          onClick={() => {
                            if (career) {
                              if (skills.length > 0) {
                                const courseInfo = getCourseForSkill(career.id, skills[0].skill_name);
                                if (courseInfo) {
                                  navigateToCourseInCareerBoard(career.slug, courseInfo.courseSlug);
                                  return;
                                }
                              }
                              navigate(`/career-board/${career.slug}`);
                              return;
                            }
                            navigate('/careers');
                          }}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Career Board
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Labs Section */}
          <Card className="card-premium card-no-lift animate-stagger-3">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/15">
                    <FlaskConical className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg tracking-[-0.01em]">Recommended Labs</CardTitle>
                    <CardDescription className="font-normal">Practice exercises based on your enrolled courses</CardDescription>
                  </div>
                </div>
                <button
                  onClick={() => handleTabChange('practice')}
                  className="group inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:text-primary/80 transition-colors duration-150"
                >
                  View all
                  <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {enrolledCourses.slice(0, 4).map((enrollment, index) => {
                  const course = enrollment.courses;
                  if (!course) return null;

                  const labTypes = ['Coding Challenge', 'Quiz', 'Project', 'Mini Project'];
                  const labIcons = [<Zap className="h-4 w-4" />, <Target className="h-4 w-4" />, <Award className="h-4 w-4" />, <Zap className="h-4 w-4" />];
                  const labColors = ['from-emerald-500 to-teal-600', 'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600'];

                  return (
                    <div
                      key={enrollment.id}
                      className="group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-border/30 cursor-pointer transition-all duration-200 hover:border-primary/25 hover:bg-muted/20 hover:-translate-y-[2px]"
                      onClick={() => handleTabChange('practice')}
                    >
                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex-shrink-0 bg-gradient-to-br ${labColors[index % 4]} flex items-center justify-center`}
                        style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.12)' }}
                      >
                        {React.cloneElement(labIcons[index % 4] as React.ReactElement, { className: 'h-[18px] w-[18px] text-white' })}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-foreground line-clamp-1 leading-snug">
                          {course.name}
                        </p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">
                          {labTypes[index % 4]}
                        </p>
                      </div>

                      {/* CTA */}
                      <div className="flex-shrink-0 flex items-center gap-0.5 text-[12px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Start <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  );
                })}
                {enrolledCourses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
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
        <div className="flex flex-col space-y-7 h-full min-h-full">
          {/* Today's Focus Card */}
          <Card className="card-premium card-no-lift animate-stagger-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shadow-primary/15">
                  <Target className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-lg font-semibold tracking-[-0.01em] text-foreground">Today's Focus</h3>
                  <p className="text-xs font-medium text-muted-foreground">Recommended for you today</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* Lesson Suggestion */}
                <div
                  onClick={todaysFocus.handleContinueLearning}
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 hover:border-primary/20 hover:bg-primary/[0.03] transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center shrink-0 group-hover:bg-primary/12 transition-colors">
                    <BookOpen className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Continue Learning</p>
                    <p className="text-[11.5px] mt-0.5 truncate text-muted-foreground">
                      {todaysFocus.nextLesson
                        ? todaysFocus.nextLesson.title
                        : todaysFocus.hasActiveCourse
                          ? "All lessons completed!"
                          : "Start your learning journey"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* MCQ Suggestion */}
                <div
                  onClick={todaysFocus.handleDailyQuiz}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border border-border/30 transition-all duration-200 group ${
                    todaysFocus.hasCompletedLessons
                      ? 'hover:border-amber-300/40 hover:bg-amber-50/30 cursor-pointer'
                      : 'opacity-45 cursor-default'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500/8 flex items-center justify-center shrink-0">
                    <HelpCircle className="h-4 w-4 text-amber-500" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Daily Quiz</p>
                    <p className="text-[11.5px] mt-0.5 text-muted-foreground">
                      {todaysFocus.hasCompletedLessons
                        ? "Test your knowledge with MCQs"
                        : "Complete lessons to unlock quiz"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>

                {/* Debug & Practice Suggestion */}
                <div
                  onClick={todaysFocus.handleDebugPractice}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border border-border/30 transition-all duration-200 group ${
                    todaysFocus.nextLesson
                      ? 'hover:border-slate-300/50 hover:bg-slate-50/40 cursor-pointer'
                      : 'opacity-45 cursor-default'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-500/8 flex items-center justify-center shrink-0">
                    <Code className="h-4 w-4 text-slate-500" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">Debug & Practice</p>
                    <p className="text-[11.5px] mt-0.5 text-muted-foreground">
                      {todaysFocus.nextLesson
                        ? "Hands-on coding challenges"
                        : "No practice available for today"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>

          <ProfileWeeklyActivityCard
            className="animate-stagger-2"
            loading={weeklyActivityLoading}
            weeklyActivityData={weeklyActivityData}
          />

          {/* AI Mentor Card - tertiary tier */}
          <Card className="card-premium card-tertiary card-no-lift animate-stagger-3 flex-1 flex flex-col overflow-hidden">
            {/* Calm ambient tint */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.07)' }} />
            <CardContent className="p-5 flex-1 flex flex-col relative">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    boxShadow: '0 4px 14px rgba(99,102,241,0.28)',
                  }}
                >
                  <Sparkles className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold tracking-tight text-foreground">AI Mentor</h3>
                  <p className="text-[11.5px] text-muted-foreground">Your personal learning assistant</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-end">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {completedInCareer < careerRelatedSlugs.length
                    ? `Continue your ${career?.name || 'career'} journey. Get personalized guidance on what to learn next and improve your skills.`
                    : 'Great progress! Ask me about advanced topics, career advice, or explore new learning paths.'}
                </p>

                <Button
                  variant="default"
                  className="w-full mt-4 gap-2 rounded-xl font-semibold text-white hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[220ms] text-[13px] h-10"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #4338CA)',
                    boxShadow: '0 6px 20px rgba(99,102,241,0.28)',
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Ask AI Mentor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>



      <CareerSelectionDialog
        open={careerDialogOpen}
        onOpenChange={setCareerDialogOpen}
        selectedCareerSlug={selectedCareer}
        onCareerSelect={handleCareerSelect}
      />
    </div>
  );


  const renderLearnings = () => {
    const ongoingCourses = enrolledCourses.filter(enrollment => {
      const progress = courseProgressMap[enrollment.courses?.slug];
      return !progress || progress.total === 0 || progress.completed < progress.total;
    });

    const completedCourses = enrolledCourses.filter(enrollment => {
      const progress = courseProgressMap[enrollment.courses?.slug];
      return progress && progress.total > 0 && progress.completed >= progress.total;
    });

    const iconColors = [
      { bg: 'rgba(34,197,94,0.1)',  fg: '#16A34A' },
      { bg: 'rgba(59,130,246,0.1)', fg: '#2563EB' },
      { bg: 'rgba(168,85,247,0.1)', fg: '#9333EA' },
      { bg: 'rgba(249,115,22,0.1)', fg: '#EA580C' },
      { bg: 'rgba(20,184,166,0.1)', fg: '#0D9488' },
      { bg: 'rgba(236,72,153,0.1)', fg: '#DB2777' },
    ];

    const CourseRow = ({ enrollment, index, isCompleted }: { enrollment: any; index: number; isCompleted: boolean }) => {
      const course = enrollment.courses;
      const progress = courseProgressMap[course?.slug] || { completed: 0, total: 0 };
      const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
      const col = iconColors[index % iconColors.length];
      const IconComp = getIcon(course?.icon, BookOpen);

      return (
        <div
          className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-card border border-border/60 cursor-pointer transition-all duration-200 hover:border-primary/25 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
          onClick={() => navigateToCourse(course?.slug, course?.id)}
        >
          {/* Course icon */}
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: col.bg }}
          >
            <IconComp className="w-[18px] h-[18px]" style={{ color: col.fg }} strokeWidth={1.8} />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] font-semibold text-foreground tracking-tight truncate">
                {course?.name}
              </span>
              {course?.level && (
                <span className="flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {course.level}
                </span>
              )}
              {isCompleted && (
                <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-emerald-700" style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <CheckCircle2 className="w-3 h-3" />
                  Completed
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden progress-track">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${isCompleted ? 100 : pct}%`,
                    background: isCompleted
                      ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                      : 'linear-gradient(90deg, hsl(var(--primary)), hsl(142,76%,36%))',
                    transition: 'width 600ms ease',
                  }}
                />
              </div>
              <span className="flex-shrink-0 text-[12px] font-semibold text-muted-foreground w-8 text-right">
                {isCompleted ? '100%' : `${pct}%`}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              {progress.completed} of {progress.total} lessons completed
              {!isCompleted && course?.learning_hours > 0 ? ` · ${course.learning_hours}h total` : ''}
            </p>
          </div>

          {/* CTA button */}
          <button
            className="flex-shrink-0 text-[13px] font-semibold px-4 py-2 rounded-xl border-0 cursor-pointer transition-all duration-150"
            style={isCompleted
              ? { background: 'rgba(34,197,94,0.08)', color: '#16A34A' }
              : { background: 'hsl(var(--primary))', color: '#fff', boxShadow: '0 2px 8px hsla(142,71%,45%,0.22)' }
            }
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {isCompleted ? 'Review' : 'Continue →'}
          </button>
        </div>
      );
    };

    const EmptyOngoing = () => (
      <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl border border-dashed border-border bg-card text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.08)' }}>
          <BookOpen className="w-5 h-5 text-primary" strokeWidth={1.8} />
        </div>
        <p className="text-[14px] font-semibold text-foreground mb-1">No courses in progress</p>
        <p className="text-[13px] text-muted-foreground mb-5">Enroll in a course to start your learning journey.</p>
        <button
          onClick={() => navigate('/courses')}
          className="text-[13px] font-semibold text-white px-5 py-2.5 rounded-xl border-0 cursor-pointer"
          style={{ background: 'hsl(var(--primary))', boxShadow: '0 2px 8px hsla(142,71%,45%,0.25)' }}
        >
          Browse Courses
        </button>
      </div>
    );

    return (
      <div className="space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">My Learnings</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Track your progress across all enrolled courses</p>
          </div>
          {/* Stats pills */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-[12px] font-semibold text-foreground">
              <Library className="w-3.5 h-3.5 text-muted-foreground" />
              {enrolledCourses.length} Enrolled
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-orange-600" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <Flame className="w-3.5 h-3.5" />
              {ongoingCourses.length} Ongoing
            </div>
            {completedCourses.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-emerald-700" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {completedCourses.length} Done
              </div>
            )}
          </div>
        </div>

        {/* ── Ongoing ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 pb-1 border-b border-border/60">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <Flame className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <h2 className="text-[14px] font-semibold text-foreground">Ongoing</h2>
            <span className="ml-auto text-[12px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {ongoingCourses.length}
            </span>
          </div>
          {ongoingCourses.length > 0 ? (
            <div className="space-y-2.5">
              {ongoingCourses.map((enrollment, i) => (
                <CourseRow key={enrollment.id} enrollment={enrollment} index={i} isCompleted={false} />
              ))}
            </div>
          ) : (
            <EmptyOngoing />
          )}
        </div>

        {/* ── Completed ── */}
        {completedCourses.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-1 border-b border-border/60">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <h2 className="text-[14px] font-semibold text-foreground">Completed</h2>
              <span className="ml-auto text-[12px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {completedCourses.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {completedCourses.map((enrollment, i) => (
                <CourseRow key={enrollment.id} enrollment={enrollment} index={i} isCompleted={true} />
              ))}
            </div>
          </div>
        )}

        {/* ── Practice Labs ── */}
        {!labProgressLoading && sortedActiveLabs.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 pb-1 border-b border-border/60">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.08)' }}>
                <FlaskConical className="w-3.5 h-3.5 text-primary" />
              </div>
              <h2 className="text-[14px] font-semibold text-foreground">Practice Labs</h2>
              <span className="ml-auto text-[12px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {sortedActiveLabs.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sortedActiveLabs.map((enrollment: any, idx: number) => {
                const course = enrollment.courses;
                if (!course) return null;
                const lp = labProgressMap?.get(course.id);
                const pct = lp?.percentage ?? 0;
                const GRADIENTS_MINI = [
                  "linear-gradient(148deg, #0a2a14 0%, #104828 42%, #186838 72%, #22a055 100%)",
                  "linear-gradient(148deg, #0b1a3a 0%, #142e62 42%, #1e4490 72%, #2558b0 100%)",
                  "linear-gradient(148deg, #16082a 0%, #2e1054 42%, #5228a0 72%, #7840d4 100%)",
                  "linear-gradient(148deg, #2d1200 0%, #5c2800 42%, #a04810 72%, #d86820 100%)",
                ];
                const grad = GRADIENTS_MINI[idx % GRADIENTS_MINI.length];
                return (
                  <div
                    key={enrollment.id}
                    className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-card border border-border/60 cursor-pointer transition-all duration-200 hover:border-primary/25 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                    onClick={() => navigate(`/course/${course.slug}`)}
                  >
                    {/* Mini gradient icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: grad }}
                    >
                      <FlaskConical className="w-4 h-4 text-white/80" strokeWidth={1.8} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[13.5px] font-semibold text-foreground tracking-tight truncate">
                          {course.name}
                        </span>
                        {idx === 0 && (
                          <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full text-primary" style={{ background: 'rgba(34,197,94,0.1)' }}>
                            Continue
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden progress-track">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #4CAF82, #22C55E)',
                              transition: 'width 600ms ease',
                            }}
                          />
                        </div>
                        <span className="flex-shrink-0 text-[11.5px] font-semibold text-muted-foreground tabular-nums">
                          {pct}%
                        </span>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground mt-1">
                        {lp?.completed ?? 0} of {lp?.total ?? 0} lessons
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => handleTabChange('practice')}
              className="group inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors duration-150 mt-1"
            >
              View all practice labs
              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
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

    const diffMap: Record<string, { bg: string; fg: string }> = {
      Easy:   { bg: 'rgba(34,197,94,0.1)',   fg: '#16A34A' },
      Medium: { bg: 'rgba(234,179,8,0.1)',    fg: '#A16207' },
      Hard:   { bg: 'rgba(239,68,68,0.1)',    fg: '#DC2626' },
    };

    const RowWrap = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
      <div
        className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-card border border-border/60 cursor-pointer transition-all duration-200 hover:border-primary/25 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
        onClick={onClick}
      >
        {children}
      </div>
    );

    const SecHeader = ({ icon: Icon, label, count, iconBg, iconFg }: { icon: any; label: string; count: number; iconBg: string; iconFg: string }) => (
      <div className="flex items-center gap-2.5 pb-1 border-b border-border/60">
        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: iconBg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: iconFg }} strokeWidth={1.8} />
        </div>
        <h2 className="text-[14px] font-semibold text-foreground">{label}</h2>
        <span className="ml-auto text-[12px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{count}</span>
      </div>
    );

    const RemoveBtn = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
      <button
        onClick={onClick}
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
        title="Remove bookmark"
      >
        <BookmarkX className="w-4 h-4" />
      </button>
    );

    if (isLoading) return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <UMLoader size={48} dark label={null} />
        <p className="text-[12px] text-muted-foreground tracking-[0.06em] uppercase">Loading bookmarks</p>
      </div>
    );

    return (
      <div className="space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">Bookmarks</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Your saved courses, lessons, and problems</p>
          </div>
          {/* Stats pills — always visible, mirrors My Learnings pattern */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-[12px] font-semibold text-foreground">
              <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              {courseBookmarks.length} Courses
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-blue-600" style={{ background: 'rgba(59,130,246,0.08)' }}>
              <FileText className="w-3.5 h-3.5" />
              {lessonBookmarks.length} Lessons
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-orange-600" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <Code className="w-3.5 h-3.5" />
              {problemBookmarks.length} Problems
            </div>
          </div>
        </div>

        {totalBookmarks === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl border border-dashed border-border bg-card text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.08)' }}>
              <Bookmark className="w-5 h-5 text-primary" strokeWidth={1.8} />
            </div>
            <p className="text-[14px] font-semibold text-foreground mb-1">No bookmarks yet</p>
            <p className="text-[13px] text-muted-foreground mb-5">Save courses, lessons, and problems for quick access later.</p>
            <button onClick={() => navigate('/courses')} className="text-[13px] font-semibold text-white px-5 py-2.5 rounded-xl border-0 cursor-pointer" style={{ background: 'hsl(var(--primary))' }}>
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Courses */}
            {courseBookmarks.length > 0 && (
              <div className="space-y-3">
                <SecHeader icon={BookOpen} label="Courses" count={courseBookmarks.length} iconBg="rgba(34,197,94,0.1)" iconFg="#16A34A" />
                <div className="space-y-2.5">
                  {courseBookmarks.map((bookmark) => (
                    <RowWrap key={bookmark.id} onClick={() => navigate(`/course/${bookmark.courses?.slug}`)}>
                      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.08)' }}>
                        {bookmark.courses?.featured_image
                          ? <img src={bookmark.courses.featured_image} alt={bookmark.courses.name} className="w-full h-full object-cover" />
                          : <BookOpen className="w-4.5 h-4.5 text-primary" strokeWidth={1.8} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-foreground truncate">{bookmark.courses?.name}</p>
                        {bookmark.courses?.level && (
                          <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">{bookmark.courses.level}</span>
                        )}
                      </div>
                      <RemoveBtn onClick={(e) => { e.stopPropagation(); toggleBookmark(bookmark.course_id || undefined); }} />
                    </RowWrap>
                  ))}
                </div>
              </div>
            )}

            {/* Lessons */}
            {lessonBookmarks.length > 0 && (
              <div className="space-y-3">
                <SecHeader icon={FileText} label="Lessons" count={lessonBookmarks.length} iconBg="rgba(59,130,246,0.1)" iconFg="#2563EB" />
                <div className="space-y-2.5">
                  {lessonBookmarks.map((bookmark) => (
                    <RowWrap key={bookmark.id} onClick={() => navigate(`/course/${bookmark.posts?.courses?.slug}?lesson=${bookmark.posts?.slug}`)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.08)' }}>
                        <FileText className="w-4.5 h-4.5" style={{ color: '#2563EB' }} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-foreground truncate">{bookmark.posts?.title}</p>
                        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                          {bookmark.posts?.excerpt ? bookmark.posts.excerpt.replace(/<[^>]*>/g, '').slice(0, 80) : 'No description'}
                        </p>
                      </div>
                      <RemoveBtn onClick={(e) => { e.stopPropagation(); toggleBookmark(undefined, bookmark.post_id || undefined); }} />
                    </RowWrap>
                  ))}
                </div>
              </div>
            )}

            {/* Problems */}
            {problemBookmarks.length > 0 && (
              <div className="space-y-3">
                <SecHeader icon={Code} label="Problems" count={problemBookmarks.length} iconBg="rgba(249,115,22,0.1)" iconFg="#EA580C" />
                <div className="space-y-2.5">
                  {problemBookmarks.map((bookmark) => {
                    const problem = bookmark.problem;
                    const dStyle = diffMap[problem?.difficulty || 'Easy'] || diffMap['Easy'];
                    return (
                      <RowWrap key={bookmark.id} onClick={() => problem?.skill_id && navigate(`/practice/${problem.skill_id}/problem/${problem.slug}`)}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.08)' }}>
                          <Code className="w-4.5 h-4.5 text-orange-500" strokeWidth={1.8} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-foreground truncate">{problem?.title || 'Unknown Problem'}</p>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block" style={{ background: dStyle.bg, color: dStyle.fg }}>
                            {problem?.difficulty || 'Unknown'}
                          </span>
                        </div>
                        <RemoveBtn onClick={(e) => { e.stopPropagation(); toggleProblemBookmark(bookmark.problem_id); }} />
                      </RowWrap>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
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

    if (commentsLoading) return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <UMLoader size={48} dark label={null} />
        <p className="text-[12px] text-muted-foreground tracking-[0.06em] uppercase">Loading discussions</p>
      </div>
    );

    return (
      <div className="space-y-8">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">Discussions</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Comments you've made across lessons</p>
          </div>
          {userComments.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold flex-shrink-0" style={{ background: 'rgba(99,102,241,0.08)', color: '#4F46E5' }}>
              <MessageSquare className="w-3.5 h-3.5" />
              {userComments.length} Comments
            </div>
          )}
        </div>

        {userComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 rounded-2xl border border-dashed border-border bg-card text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.08)' }}>
              <MessageSquare className="w-5 h-5" style={{ color: '#4F46E5' }} strokeWidth={1.8} />
            </div>
            <p className="text-[14px] font-semibold text-foreground mb-1">No discussions yet</p>
            <p className="text-[13px] text-muted-foreground">Join the conversation by commenting on lessons.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {userComments.map((comment) => {
              const post = comment.posts as any;
              const course = post?.courses;
              const commentText = extractTextFromContent(comment.content);
              const replies = commentReplies[comment.id] || [];
              const isExpanded = expandedComment === comment.id;

              return (
                <div key={comment.id} className="rounded-2xl bg-card border border-border/60 overflow-hidden transition-all duration-200">
                  {/* Comment row */}
                  <div
                    className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedComment(isExpanded ? null : comment.id)}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.08)' }}>
                      <MessageSquare className="w-4 h-4" style={{ color: '#4F46E5' }} strokeWidth={1.8} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[12px] font-semibold text-primary">{course?.name || 'Unknown Course'}</span>
                        <span className="text-muted-foreground text-[12px]">·</span>
                        <span className="text-[12px] text-muted-foreground">{post?.title || 'Unknown Lesson'}</span>
                        <span className="text-muted-foreground text-[12px]">·</span>
                        <span className="text-[12px] text-muted-foreground">{formatDate(comment.created_at)}</span>
                        {replies.length > 0 && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: '#4F46E5' }}>
                            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-foreground line-clamp-2">{commentText}</p>
                    </div>

                    <ChevronRight className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded: replies + reply form */}
                  {isExpanded && (
                    <div className="border-t border-border/60 px-5 py-4 space-y-4 bg-muted/20">
                      {/* Replies thread */}
                      {replies.length > 0 && (
                        <div className="space-y-3 pl-4 border-l-2 border-border">
                          {replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden bg-muted flex items-center justify-center">
                                {reply.profiles?.avatar_url
                                  ? <img src={reply.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-[11px] font-bold text-muted-foreground">{getDisplayName(reply).charAt(0).toUpperCase()}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[12px] font-semibold text-foreground">{getDisplayName(reply)}</span>
                                  {reply.user_id === comment.user_id && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>Author</span>
                                  )}
                                  <span className="text-[11px] text-muted-foreground">{formatDate(reply.created_at)}</span>
                                </div>
                                <p className="text-[13px] text-foreground">{extractTextFromContent(reply.content)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply composer */}
                      <div className="flex gap-3 items-start pt-2">
                        <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}>
                          {avatarUrl
                            ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                            : <span className="text-[11px] font-bold text-white">{fullName?.charAt(0)?.toUpperCase() || 'U'}</span>}
                        </div>
                        <div className="flex-1 space-y-2">
                          <LightEditor value={replyContent} onChange={setReplyContent} placeholder="Write a reply…" minHeight="56px" />
                          <div className="flex items-center justify-between">
                            <button
                              className="text-[12px] font-medium text-primary hover:underline bg-transparent border-0 cursor-pointer p-0"
                              onClick={(e) => { e.stopPropagation(); if (course?.slug && post?.slug) navigate(`/courses/${course.slug}/${post.slug}`); }}
                            >
                              View in lesson →
                            </button>
                            <button
                              disabled={!replyContent || submittingReply}
                              onClick={() => handleSubmitReply(comment.id, comment.post_id)}
                              className="text-[13px] font-semibold text-white px-4 py-1.5 rounded-xl border-0 cursor-pointer disabled:opacity-50"
                              style={{ background: 'hsl(var(--primary))' }}
                            >
                              {submittingReply ? 'Posting…' : 'Reply'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    const SettingSection = ({ icon: Icon, title, subtitle, iconBg, iconFg, children }: { icon: any; title: string; subtitle: string; iconBg: string; iconFg: string; children: React.ReactNode }) => (
      <div className="rounded-2xl bg-card border border-border/60 overflow-hidden">
        {/* Section header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
            <Icon className="w-4 h-4" style={{ color: iconFg }} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-foreground">{title}</p>
            <p className="text-[12px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    );

    const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-semibold text-foreground uppercase tracking-wide">{label}</label>
        {children}
      </div>
    );

    return (
      <div className="space-y-8">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Manage your profile, security, and account preferences</p>
        </div>

        {/* ── Profile Information ── */}
        <SettingSection icon={User} title="Profile Information" subtitle="Update your display name and avatar" iconBg="rgba(34,197,94,0.1)" iconFg="#16A34A">
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            {/* Avatar preview */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-white">{fullName?.charAt(0)?.toUpperCase() || 'U'}</span>}
              </div>
              <div>
                <p className="text-[14px] font-semibold text-foreground">{fullName || 'User'}</p>
                <p className="text-[12px] text-muted-foreground">{email}</p>
              </div>
            </div>

            <FieldRow label="Full Name">
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                className="h-10 text-[13px] rounded-xl border-border/70"
              />
            </FieldRow>

            <FieldRow label="Avatar URL">
              <Input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="h-10 text-[13px] rounded-xl border-border/70"
              />
            </FieldRow>

            <FieldRow label="Email">
              <div className="flex items-center gap-3">
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="h-10 text-[13px] rounded-xl border-border/70 bg-muted flex-1"
                />
                {emailVerified === null ? null : emailVerified ? (
                  <span className="flex items-center gap-1 text-[12px] font-semibold flex-shrink-0" style={{ color: '#16A34A' }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex-shrink-0 disabled:opacity-50 bg-transparent cursor-pointer"
                  >
                    <Mail className="w-3 h-3 inline mr-1" />
                    {resendingVerification ? 'Sending…' : 'Verify email'}
                  </button>
                )}
              </div>
            </FieldRow>

            <div className="pt-1">
              <button
                type="submit"
                disabled={updating}
                className="text-[13px] font-semibold text-white px-5 py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60"
                style={{ background: 'hsl(var(--primary))' }}
              >
                {updating ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </SettingSection>

        {/* ── Security ── */}
        <SettingSection icon={Shield} title="Security" subtitle="Update your password" iconBg="rgba(99,102,241,0.1)" iconFg="#4F46E5">
          <form onSubmit={handlePasswordChange} className="space-y-5">
            <FieldRow label="New Password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="h-10 text-[13px] rounded-xl border-border/70"
              />
            </FieldRow>
            <FieldRow label="Confirm Password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="h-10 text-[13px] rounded-xl border-border/70"
              />
            </FieldRow>
            <div className="pt-1">
              <button
                type="submit"
                disabled={updating}
                className="text-[13px] font-semibold text-white px-5 py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60"
                style={{ background: '#4F46E5' }}
              >
                {updating ? 'Updating…' : 'Change Password'}
              </button>
            </div>
          </form>
        </SettingSection>

        {/* ── Danger zone ── */}
        <div className="rounded-2xl bg-card border border-red-200/40 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-[14px] font-semibold text-foreground">Sign Out</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">Sign out of your account on this device</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-[13px] font-semibold text-red-600 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

      </div>
    );
  };

  const renderPracticeLab = () => (
    <div className="px-8 md:px-16 lg:px-32 xl:px-40 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium back nav */}
      <div className="flex mb-5">
        <button
          onClick={() => handleTabChange('dashboard')}
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-all duration-150 hover:bg-muted/50 border border-transparent hover:border-border/40 -ml-1"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
          Dashboard
        </button>
      </div>
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
      case 'settings': return renderSettings();
      default: return renderDashboard();
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="profile-page-outer">

        {/* ── Icon Sidebar — flat, no card, floats on page bg ── */}
        {activeTab !== 'practice' && (
          <aside className="profile-icon-sidebar-wrap animate-sidebar">
            <div className="profile-icon-sidebar">
              {/* Main nav icons */}
              <nav className="profile-icon-nav">
                {sidebarItems.map((item) => (
                  <TooltipProvider key={item.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleTabChange(item.id)}
                          className={`profile-icon-btn${activeTab === item.id ? ' active' : ''}`}
                        >
                          <item.icon className="profile-icon-btn-icon" strokeWidth={activeTab === item.id ? 2 : 1.5} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="profile-icon-tooltip">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}

                {/* Separator */}
                <div className="profile-icon-sep" />

                {/* Explore items */}
                {exploreItems.map((item) => (
                  <TooltipProvider key={item.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleTabChange(item.id)}
                          className={`profile-icon-btn${activeTab === item.id ? ' active' : ''}`}
                        >
                          <item.icon className="profile-icon-btn-icon" strokeWidth={activeTab === item.id ? 2 : 1.5} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="profile-icon-tooltip">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </nav>

              {/* Bottom: avatar only — clicks to open settings */}
              <div className="profile-icon-bottom">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleTabChange('settings')}
                        className="profile-icon-avatar"
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={fullName} className="profile-icon-avatar-img" />
                        ) : (
                          <span className="profile-icon-avatar-initial">
                            {fullName?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="profile-icon-tooltip">
                      <p>Settings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <div className={`profile-content-wrap${activeTab === 'dashboard' ? ' profile-content-wrap--gray' : ''}`}>
          <main className={`${activeTab === 'practice' ? 'py-4' : ''}`}>
            {renderContent()}
          </main>
        </div>

      </div>
      <SlimFooter />
    </Layout>
  );
};

export default Profile;
