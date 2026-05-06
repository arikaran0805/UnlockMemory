import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
import { useUserState } from "@/hooks/useUserState";
import { PracticeLab } from "@/components/practice";
import { useActiveLabsProgress } from "@/hooks/useActiveLabsProgress";
import { useSkillsProgress } from "@/hooks/useSkillsProgress";
import { usePublishedPracticeSkills } from "@/hooks/usePracticeSkills";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { LightEditor } from "@/components/tiptap";
import { useWeeklyActivity } from "@/hooks/useWeeklyActivity";
import type { WeeklyActivityData } from "@/hooks/useWeeklyActivity";
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

// ─── Profile data cache (sessionStorage) ────────────────────────────────────
// Persists within a browser session so the dashboard renders instantly on revisit.
// The user ID is stored separately so lazy state initializers can read the cache
// synchronously before the first render — before AuthContext finishes its DB call.
const PROFILE_CACHE_KEY = (uid: string) => `um_profile_${uid}`;
const PROFILE_UID_KEY = 'um_profile_uid';
interface ProfileCache {
  fullName: string; avatarUrl: string; email: string; selectedCareer: string;
  currentStreak: number; maxStreak: number; streakFreezesAvailable: number;
  enrolledCourses: any[]; allCourses: any[];
  courseProgressMap: Record<string, { completed: number; total: number }>;
  completedCourseSlugs: string[];
}
function getStoredUid(): string | null {
  try { return sessionStorage.getItem(PROFILE_UID_KEY); }
  catch { return null; }
}
function readProfileCache(uid: string): ProfileCache | null {
  try { return JSON.parse(sessionStorage.getItem(PROFILE_CACHE_KEY(uid)) || "null"); }
  catch { return null; }
}
function writeProfileCache(uid: string, data: ProfileCache) {
  try {
    sessionStorage.setItem(PROFILE_CACHE_KEY(uid), JSON.stringify(data));
    sessionStorage.setItem(PROFILE_UID_KEY, uid); // stored for lazy init on next mount
  }
  catch {}
}

// ─── Weekly activity sessionStorage cache ─────────────────────────────────────
// Separate from profile cache — written when React Query returns fresh data,
// restored as placeholderData so the chart renders immediately without loading state.
const WEEKLY_ACTIVITY_CACHE_KEY = (uid: string) => `um_weekly_activity_${uid}`;
function readWeeklyActivityCache(uid: string): WeeklyActivityData | null {
  try { return JSON.parse(sessionStorage.getItem(WEEKLY_ACTIVITY_CACHE_KEY(uid)) || "null"); }
  catch { return null; }
}
function writeWeeklyActivityCache(uid: string, data: WeeklyActivityData) {
  try { sessionStorage.setItem(WEEKLY_ACTIVITY_CACHE_KEY(uid), JSON.stringify(data)); }
  catch {}
}
// ────────────────────────────────────────────────────────────────────────────

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
      className="cursor-pointer group flex flex-row w-full overflow-hidden"
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        minHeight: '160px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)';
      }}
      onClick={onClick}
    >
      {/* Left side: Green block */}
      <div
        className="w-[280px] shrink-0 p-6 flex flex-col justify-center"
        style={{ background: 'hsl(var(--primary))' }}
      >
        <div>
          <span className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-2 block">
            Course
          </span>
          <h3 className="text-white text-xl font-medium leading-tight line-clamp-3">
            {course?.name}
          </h3>
        </div>
        <div className="flex items-center text-white/80 text-sm font-medium mt-6 group-hover:text-white transition-colors">
          View all chapters <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {/* Right side: White block */}
      <div className="flex-1 p-6 flex flex-col justify-center relative">
        <div className="flex items-start justify-between gap-4">
          <div className="mt-2">
            <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-2 block">
              {nextLesson ? `CHAPTER ${nextLesson.order}` : `UP NEXT`}
            </span>
            <h4 className="text-foreground text-2xl font-medium line-clamp-2">
              {nextLesson ? nextLesson.title : "Course Overview"}
            </h4>
          </div>

          {/* Progress area on the right */}
          <div className="flex flex-col items-end shrink-0 w-[140px] pt-1">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: 'hsl(var(--primary))'
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground">
              {progress.completed}/{progress.total} Lessons
            </span>
          </div>
        </div>

        {/* Bottom right button */}
        <div className="flex justify-end mt-4">
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-6 py-2 rounded-full text-sm font-medium shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Continue
          </button>
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
      className="cursor-pointer group flex flex-row w-full overflow-hidden"
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        minHeight: '160px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.06)';
      }}
      onClick={onClick}
    >
      {/* Left side: Green block */}
      <div
        className="w-[280px] shrink-0 p-6 flex flex-col justify-center"
        style={{ background: 'hsl(var(--primary))' }}
      >
        <div>
          <span className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-2 block">
            Course
          </span>
          <h3 className="text-white text-xl font-medium leading-tight line-clamp-3">
            {course?.name}
          </h3>
        </div>
        <div className="flex items-center text-white/80 text-sm font-medium mt-6 group-hover:text-white transition-colors">
          Review course <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {/* Right side: White block */}
      <div className="flex-1 p-6 flex flex-col justify-center relative">
        <div className="flex items-start justify-between gap-4">
          <div className="mt-2">
            <span className="text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-2 block">
              STATUS
            </span>
            <h4 className="text-foreground text-2xl font-medium line-clamp-2">
              Course Completed
            </h4>
          </div>

          {/* Progress area on the right */}
          <div className="flex flex-col items-end shrink-0 w-[140px] pt-1">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `100%`,
                  background: 'hsl(var(--primary))'
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Done
            </span>
          </div>
        </div>

        {/* Bottom right button */}
        <div className="flex justify-end mt-4">
          <button
            className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-6 py-2 rounded-full text-sm font-medium shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Review
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
  const { user, isLoading: authLoading } = useAuth();

  // ── Synchronous cache init ────────────────────────────────────────────────
  // Read cache before first render so the dashboard is instant on revisit.
  // AuthContext fires a DB call (fetchUserRoles) before setting user/isLoading,
  // so we can't wait for it. We stored the uid at last write so we can look it
  // up synchronously here.
  const [initData] = useState<{ uid: string | null; cache: ProfileCache | null }>(() => {
    const uid = getStoredUid();
    return { uid, cache: uid ? readProfileCache(uid) : null };
  });

  const [loading, setLoading] = useState(() => !initData.cache);
  const [updating, setUpdating] = useState(false);
  const [fullName, setFullName] = useState(() => initData.cache?.fullName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(() => initData.cache?.avatarUrl ?? "");
  const [email, setEmail] = useState(() => initData.cache?.email ?? "");
  const [userId, setUserId] = useState<string | null>(() => initData.uid);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const contentRef = useRef<HTMLDivElement>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>(() => initData.cache?.enrolledCourses ?? []);
  const [allCourses, setAllCourses] = useState<any[]>(() => initData.cache?.allCourses ?? []);
  const [completedCourseSlugs, setCompletedCourseSlugs] = useState<string[]>(() => initData.cache?.completedCourseSlugs ?? []);
  const [courseProgressMap, setCourseProgressMap] = useState<Record<string, { completed: number; total: number }>>(() => initData.cache?.courseProgressMap ?? {});
  const [selectedCareer, setSelectedCareer] = useState<string>(() => initData.cache?.selectedCareer ?? '');
  const [userCareerSelectedIds, setUserCareerSelectedIds] = useState<string[] | null>(null);
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(() => initData.cache?.currentStreak ?? 0);
  const [maxStreak, setMaxStreak] = useState(() => initData.cache?.maxStreak ?? 0);
  const [streakFreezesAvailable, setStreakFreezesAvailable] = useState(() => initData.cache?.streakFreezesAvailable ?? 2);
  const [isFreezingStreak, setIsFreezingStreak] = useState(false);
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [expandedComment, setExpandedComment] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { bookmarks, loading: bookmarksLoading, toggleBookmark } = useBookmarks();
  const { bookmarks: problemBookmarks, loading: problemBookmarksLoading, toggleBookmark: toggleProblemBookmark } = useProblemBookmarks();
  const { getCareerBySlug, getCareerCourseSlugs, getCareerSkills, getCourseForSkill, loading: careersLoading } = useCareers();
  const { isAdmin, isModerator } = useUserRole();
  const { isPro, isLoading: userStateLoading } = useUserState();
  const { navigateToCourse, navigateToCourseInCareerBoard, handleResume } = useCourseNavigation();

  // Restore cached weekly activity as placeholderData so the chart never shows
  // a loading state on revisit — React Query refetches in background silently.
  const cachedWeeklyActivity = initData.uid ? readWeeklyActivityCache(initData.uid) : null;
  const { data: weeklyActivityQueryData, isLoading: weeklyActivityLoading } = useWeeklyActivity(
    userId,
    cachedWeeklyActivity ?? undefined,
  );
  const weeklyActivityData =
    weeklyActivityQueryData ??
    ({ totalSeconds: 0, activeDays: 0, dailySeconds: {}, lastWeekSeconds: 0 } as const);

  // Persist weekly activity to sessionStorage whenever React Query returns fresh data
  useEffect(() => {
    if (weeklyActivityQueryData && userId) {
      writeWeeklyActivityCache(userId, weeklyActivityQueryData);
    }
  }, [weeklyActivityQueryData, userId]);

  // Practice labs progress — used in My Learnings
  const enrolledCourseIds = useMemo(
    () => enrolledCourses.map((e: any) => e.courses?.id).filter(Boolean) as string[],
    [enrolledCourses],
  );
  const { data: publishedPracticeSkills = [] } = usePublishedPracticeSkills();

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

  /**
   * Fetch all profile data in a single parallel batch.
   * uid is taken directly from AuthContext — no extra getSession() round-trip.
   * Results are written to sessionStorage for instant render on the next visit.
   * NOTE: must be declared before the useEffect that lists it as a dependency (TDZ safety).
   */
  const fetchProfileData = useCallback(async (uid: string) => {
    try {
      // All 5 queries run in parallel — from ~750 ms sequential to ~150 ms parallel.
      const [profileRes, enrollmentsRes, coursesRes, lessonProgressRes, courseLessonsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase.from("course_enrollments").select(`
          *,
          courses:course_id (id, name, slug, description, featured_image, level, icon, learning_hours)
        `).eq("user_id", uid),
        supabase.from("courses").select("id, name, slug, description, featured_image, level, icon, learning_hours"),
        supabase.from("lesson_progress").select("course_id, completed").eq("user_id", uid).eq("completed", true),
        supabase.from("posts").select("id, category_id"),
      ]);

      if (profileRes.error) throw profileRes.error;
      const profile = profileRes.data;
      const enrollments = enrollmentsRes.data ?? [];
      const courses = coursesRes.data ?? [];
      const lessonProgress = lessonProgressRes.data ?? [];
      const courseLessons = courseLessonsRes.data ?? [];

      // Profile fields
      setFullName(profile.full_name || "");
      setAvatarUrl(profile.avatar_url || "");
      setEmail(profile.email);
      setUserId(uid);
      setSelectedCareer((profile as any).selected_career || '');
      setCurrentStreak((profile as any).current_streak || 0);
      setMaxStreak((profile as any).max_streak || 0);
      setStreakFreezesAvailable((profile as any).streak_freezes_available ?? 2);

      setEnrolledCourses(enrollments);
      setAllCourses(courses);

      // Build progress maps
      const lessonCountByCourse: Record<string, number> = {};
      courseLessons.forEach(lesson => {
        if (lesson.category_id) {
          lessonCountByCourse[lesson.category_id] = (lessonCountByCourse[lesson.category_id] || 0) + 1;
        }
      });
      const completedByCourse: Record<string, number> = {};
      lessonProgress.forEach(progress => {
        completedByCourse[progress.course_id] = (completedByCourse[progress.course_id] || 0) + 1;
      });
      const progressMap: Record<string, { completed: number; total: number }> = {};
      courses.forEach(course => {
        progressMap[course.slug] = {
          completed: completedByCourse[course.id] || 0,
          total: lessonCountByCourse[course.id] || 0,
        };
      });
      setCourseProgressMap(progressMap);

      const completed = courses
        .filter(course => {
          const total = lessonCountByCourse[course.id] || 0;
          return total > 0 && (completedByCourse[course.id] || 0) >= total;
        })
        .map(course => course.slug);
      setCompletedCourseSlugs(completed);

      // Persist to sessionStorage so the next visit renders instantly from cache
      writeProfileCache(uid, {
        fullName: profile.full_name || "",
        avatarUrl: profile.avatar_url || "",
        email: profile.email,
        selectedCareer: (profile as any).selected_career || '',
        currentStreak: (profile as any).current_streak || 0,
        maxStreak: (profile as any).max_streak || 0,
        streakFreezesAvailable: (profile as any).streak_freezes_available ?? 2,
        enrolledCourses: enrollments,
        allCourses: courses,
        courseProgressMap: progressMap,
        completedCourseSlugs: completed,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Auth-aware data loading:
  // Cache was already applied synchronously via lazy useState initializers (instant render).
  // This effect waits for AuthContext to finish (fetchUserRoles DB call), then:
  // - Redirects unauthenticated users to /auth
  // - Ensures userId reflects the actual authenticated user (not a stale cached uid)
  // - Fetches fresh data in the background (silent refresh on revisit, first load on new visit)
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    setEmailVerified(user.email_confirmed_at !== null);
    setUserId(user.id);

    fetchProfileData(user.id);
  }, [authLoading, user, fetchProfileData]);

  // Fetch user's comments for Discussions tab — cached so tab switches are instant
  const { data: discussionsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['user-discussions', userId],
    queryFn: async () => {
      if (!userId) return { comments: [] as any[], repliesMap: {} as Record<string, any[]> };

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

      const repliesMap: Record<string, any[]> = {};
      if (comments && comments.length > 0) {
        const commentIds = comments.map((c: any) => c.id);
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

        (replies || []).forEach((reply: any) => {
          if (reply.parent_id) {
            if (!repliesMap[reply.parent_id]) repliesMap[reply.parent_id] = [];
            repliesMap[reply.parent_id].push(reply);
          }
        });
      }

      return { comments: comments || [], repliesMap };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
  const userComments = discussionsData?.comments ?? [];
  const commentReplies = discussionsData?.repliesMap ?? {};

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

  // Fetch user's planned course selections for the active career
  useEffect(() => {
    if (!userId || !selectedCareer) {
      setUserCareerSelectedIds(null);
      return;
    }
    const career = getCareerBySlug(selectedCareer);
    if (!career) {
      setUserCareerSelectedIds(null);
      return;
    }
    const fetchCareerSelections = async () => {
      const { data } = await supabase
        .from("user_career_selections")
        .select("selected_course_ids")
        .eq("user_id", userId)
        .eq("career_id", career.id)
        .maybeSingle();
      setUserCareerSelectedIds(data?.selected_course_ids ?? null);
    };
    fetchCareerSelections();
  }, [userId, selectedCareer, getCareerBySlug]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    if (contentRef.current) contentRef.current.scrollTop = 0;
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

  // Career skills kept for weight lookup (each career_skills row maps 1:1 to a course in the new model)
  const skills = career ? getCareerSkills(career.id) : [];

  // Helper: get lesson-completion % for a course slug (0–100)
  const getCourseCompletionPct = (slug: string): number => {
    const p = courseProgressMap[slug];
    if (!p || p.total === 0) return 0;
    return Math.round((p.completed / p.total) * 100);
  };

  // Effective planned course IDs:
  // - If user has selections in user_career_selections, use those (their plan)
  // - Otherwise fall back to all career courses (they haven't planned yet)
  const effectivePlannedIds: string[] = (() => {
    if (userCareerSelectedIds !== null && userCareerSelectedIds.length > 0) {
      return userCareerSelectedIds;
    }
    // Fallback: all career courses (no plan recorded yet)
    return allCourses
      .filter(c => careerRelatedSlugs.includes(c.slug))
      .map(c => c.id);
  })();

  // Planned career courses (from allCourses, ordered by effectivePlannedIds)
  const plannedCareerCourses = effectivePlannedIds
    .map(id => allCourses.find(c => c.id === id))
    .filter(Boolean) as typeof allCourses;

  // Non-career enrolled courses (enrolled outside this career or outside the plan)
  const nonCareerEnrolledCourses = enrolledCourses.filter(
    e => !careerRelatedSlugs.includes(e.courses?.slug)
  );

  // Display list: planned career courses first (flat course objects), then non-career enrolled
  // We unify them as a single shape: { id, name, slug, icon, isCareer, isEnrolled }
  const displayCourses: Array<{
    id: string; name: string; slug: string; icon: string | null;
    isCareer: boolean; isEnrolled: boolean;
  }> = [
    ...plannedCareerCourses.map(c => ({
      id: c.id, name: c.name, slug: c.slug, icon: c.icon,
      isCareer: true,
      isEnrolled: enrolledCourses.some(e => e.courses?.id === c.id),
    })),
    ...nonCareerEnrolledCourses
      .filter(e => e.courses)
      .map(e => ({
        id: e.courses.id, name: e.courses.name, slug: e.courses.slug, icon: e.courses.icon,
        isCareer: false,
        isEnrolled: true,
      })),
  ];

  // Career readiness = weighted average of planned career course completion %
  // Weight comes from career_skills.weight (skill_name === course name in the new model)
  const calculateWeightedReadiness = () => {
    if (plannedCareerCourses.length === 0) return 0;
    let weightedSum = 0;
    let totalWeight = 0;
    plannedCareerCourses.forEach(course => {
      const pct = getCourseCompletionPct(course.slug);
      const matchingSkill = skills.find(s => s.skill_name === course.name);
      const weight = matchingSkill?.weight ?? 25;
      weightedSum += pct * weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  };

  const readinessPercentage = calculateWeightedReadiness();

  // Determine focus message and active course based on progress
  const getFocusContent = () => {
    // Find first incomplete planned career course (enrolled + in progress, or not started)
    const incompleteCourse = plannedCareerCourses.find(c => {
      const progress = courseProgressMap[c.slug];
      const isEnrolled = enrolledCourses.some(e => e.courses?.id === c.id);
      return isEnrolled && progress && progress.completed < progress.total;
    });

    if (incompleteCourse) {
      const progress = courseProgressMap[incompleteCourse.slug];
      const remaining = progress ? progress.total - progress.completed : 0;
      const estimatedMins = remaining * 15;
      return {
        message: `Complete ${incompleteCourse.name}`,
        subtext: estimatedMins > 0 ? `~${Math.ceil(estimatedMins / 60)}h remaining` : "Almost there!",
        currentCourse: incompleteCourse.name,
        activeCourseSlug: incompleteCourse.slug as string | undefined,
        activeCourseId: incompleteCourse.id as string | undefined,
        activeCourseName: incompleteCourse.name as string | undefined,
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
    <div className="space-y-6">
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Dashboard Header + Career Readiness + Practice Labs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Premium Dashboard Header */}
          <ProfileDashboardHeader
            className="animate-stagger-1"
            fullName={fullName}
            careerName={career?.name || "Data Analyst"}
            currentStreak={currentStreak}
            maxStreak={maxStreak}
          />
          {/* Career Readiness */}
          {userStateLoading ? null : !isPro ? (
            /* Locked state — shown to free learners */
            <Card className="card-premium card-primary card-no-lift animate-stagger-2">
              <CardContent className="p-7">
                {/* Header */}
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <h3 className="text-xl font-bold tracking-[-0.02em] text-foreground">Career Readiness</h3>
                    <p className="text-sm mt-1 font-normal text-muted-foreground">Your progress toward becoming job-ready</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border">
                    <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs font-semibold text-muted-foreground">Pro Only</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left: greyed course rows */}
                  <div className="space-y-1.5 h-[264px] overflow-y-hidden pr-1">
                    {displayCourses.length > 0 ? displayCourses.map((course) => {
                      const IconComp = getIcon(course.icon, Code2);
                      return (
                        <div key={course.id} className="rounded-xl p-3 border border-transparent opacity-40 select-none cursor-default">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-muted-foreground shrink-0">
                                <IconComp className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium truncate block text-muted-foreground">{course.name}</span>
                                {course.isCareer && !course.isEnrolled && (
                                  <span className="text-[10px] text-muted-foreground/50 font-normal">Not enrolled</span>
                                )}
                              </div>
                            </div>
                            <span className="font-semibold tabular-nums text-muted-foreground">— %</span>
                          </div>
                          <Progress value={0} className="h-[6px] rounded-full [&]:bg-muted/60 [&>div]:bg-muted" />
                        </div>
                      );
                    }) : (
                      <div className="space-y-3 opacity-40 select-none">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="rounded-xl p-3 border border-transparent">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="h-5 w-5 rounded bg-muted/60" />
                                <div className="h-4 w-24 rounded bg-muted/60" />
                              </div>
                              <span className="font-semibold text-muted-foreground">— %</span>
                            </div>
                            <Progress value={0} className="h-[6px] rounded-full [&]:bg-muted/60" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: blurred gauge + Career Board button */}
                  <div className="flex flex-col items-center -mt-6 blur-sm opacity-40 pointer-events-none select-none" aria-hidden="true">
                    <div className="relative w-44 h-44">
                      <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 208 208">
                        <circle cx="104" cy="104" r="88" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" opacity="0.3" />
                        <circle cx="104" cy="104" r="76" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" opacity="0.2" />
                        <defs>
                          <linearGradient id="lockedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6CBFA0" />
                            <stop offset="100%" stopColor="#2A5E42" />
                          </linearGradient>
                        </defs>
                        <circle cx="104" cy="104" r="88" stroke="url(#lockedGradient)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray="40 553.07" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-bold">—</span>
                        <span className="text-sm mt-1 text-muted-foreground">Getting Started</span>
                      </div>
                    </div>
                    <Button
                      className="gap-2 rounded-full px-6 font-semibold text-white mt-6"
                      style={{ background: 'linear-gradient(135deg, #4CAF82, #2A5E42)', boxShadow: '0 6px 20px hsl(var(--primary) / 0.28)' }}
                      disabled
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Career Board
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* CTA strip */}
                <div className="flex items-center justify-between border-t border-border pt-5 mt-5">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Unlock career readiness tracking</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Available on Pro plan</p>
                  </div>
                  <Button
                    className="gap-2 rounded-full px-5 font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #4CAF82, #2A5E42)', boxShadow: '0 6px 20px hsl(var(--primary) / 0.28)' }}
                    onClick={() => navigate('/choose-plan')}
                  >
                    Upgrade to Pro
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Unlocked state — existing card, unchanged */
            <Card className="card-premium card-primary card-no-lift animate-stagger-2">
              <CardContent className="p-7">
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <h3 className="text-xl font-bold tracking-[-0.02em] text-foreground">Career Readiness</h3>
                    <p className="text-sm mt-1 font-normal text-muted-foreground">Your progress toward becoming job-ready</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Course Progress Bars */}
                  <div className="space-y-1.5 h-[264px] overflow-y-auto pr-1 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {displayCourses.map((course) => {
                      const pct = getCourseCompletionPct(course.slug);
                      const IconComp = getIcon(course.icon, Code2);

                      return (
                        <div
                          key={course.id}
                          className="group cursor-pointer hover:bg-primary/[0.04] rounded-xl p-3 transition-all duration-200 border border-transparent hover:border-primary/15"
                          onClick={() => {
                            if (course.isCareer && career) {
                              navigateToCourseInCareerBoard(career.slug, course.slug);
                            } else {
                              navigate(`/courses/${course.slug}`);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-primary/70 shrink-0 transition-transform duration-200 group-hover:scale-110">
                                <IconComp className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium truncate block">{course.name}</span>
                                {!course.isCareer && (
                                  <span className="text-[10px] text-muted-foreground/60 font-normal">Additional</span>
                                )}
                                {course.isCareer && !course.isEnrolled && (
                                  <span className="text-[10px] text-muted-foreground/50 font-normal">Not enrolled</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-semibold tabular-nums">{pct}%</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className="h-[6px] rounded-full progress-animate [&]:bg-muted/60 [&>div]:rounded-full [&>div]:bg-primary"
                          />
                        </div>
                      );
                    })}

                    {displayCourses.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-2">
                        <BookOpen className="h-8 w-8 opacity-25" />
                        <p className="text-sm font-medium">No courses in your plan yet</p>
                        <p className="text-xs opacity-70">Add courses to your career plan to track progress here.</p>
                      </div>
                    )}
                  </div>

                  {/* Circular Progress Gauge */}
                  {(() => {
                    const isCloseToNextLevel =
                      (readinessPercentage >= 15 && readinessPercentage < 20) ||
                      (readinessPercentage >= 45 && readinessPercentage < 50) ||
                      (readinessPercentage >= 75 && readinessPercentage < 80);

                    return (
                      <div className="flex flex-col items-center -mt-6">
                        <div className={`relative w-44 h-44 ${isCloseToNextLevel ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>
                          <div
                            className={`absolute inset-0 rounded-full opacity-20 blur-xl transition-opacity duration-500 ${isCloseToNextLevel ? 'opacity-40' : ''}`}
                            style={{
                              background: `conic-gradient(from 0deg, hsl(var(--primary)) ${readinessPercentage}%, transparent ${readinessPercentage}%)`
                            }}
                          />

                          <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 208 208">
                            <circle cx="104" cy="104" r="88" stroke="hsl(var(--muted))" strokeWidth="12" fill="none" opacity="0.3" />
                            <circle cx="104" cy="104" r="76" stroke="hsl(var(--muted))" strokeWidth="4" fill="none" opacity="0.2" />
                            <defs>
                              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#6CBFA0" />
                                <stop offset="100%" stopColor="#2A5E42" />
                              </linearGradient>
                              <filter id="arcGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feMerge>
                                  <feMergeNode in="blur" />
                                  <feMergeNode in="SourceGraphic" />
                                </feMerge>
                              </filter>
                            </defs>
                            <circle
                              cx="104" cy="104" r="88"
                              stroke="url(#progressGradient)" strokeWidth="12" fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${(readinessPercentage / 100) * 553.07} 553.07`}
                              className="transition-all duration-1000 ease-out"
                              filter="url(#arcGlow)"
                            />
                            {[0, 25, 50, 75, 100].map((percent, i) => {
                              const angle = (percent / 100) * 360 - 90;
                              const rad = (angle * Math.PI) / 180;
                              const x = 104 + 88 * Math.cos(rad);
                              const y = 104 + 88 * Math.sin(rad);
                              const isAchieved = readinessPercentage >= percent;
                              return (
                                <circle key={i} cx={x} cy={y} r="4"
                                  fill={isAchieved ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                                  className="transition-all duration-500"
                                />
                              );
                            })}
                            {readinessPercentage > 0 && (() => {
                              const progressAngle = (readinessPercentage / 100) * 360 - 90;
                              const progressRad = (progressAngle * Math.PI) / 180;
                              const dotX = 104 + 88 * Math.cos(progressRad);
                              const dotY = 104 + 88 * Math.sin(progressRad);
                              return (
                                <circle cx={dotX} cy={dotY} r="8"
                                  fill="hsl(var(--background))"
                                  stroke="url(#progressGradient)" strokeWidth="3"
                                  className="transition-all duration-1000 ease-out"
                                  style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.7))' }}
                                />
                              );
                            })()}
                          </svg>

                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="relative">
                              <span className="text-5xl font-bold">{readinessPercentage}</span>
                              <span className="text-2xl font-bold">%</span>
                            </div>
                            <span className="text-sm mt-1 text-muted-foreground">
                              {readinessPercentage >= 100 ? 'Career Ready' : readinessPercentage > 75 ? 'Interview Ready' : readinessPercentage > 50 ? 'Skill Builder' : readinessPercentage > 20 ? 'Progressing' : 'Getting Started'}
                            </span>
                          </div>
                        </div>

                        {readinessPercentage < 100 && plannedCareerCourses.length > 0 && (() => {
                          const lowestCourse = plannedCareerCourses.reduce((min, c) => {
                            return getCourseCompletionPct(c.slug) < getCourseCompletionPct(min.slug) ? c : min;
                          }, plannedCareerCourses[0]);
                          const nextThreshold = readinessPercentage < 20 ? 20 :
                            readinessPercentage < 50 ? 50 :
                              readinessPercentage < 80 ? 80 : 100;
                          return (
                            <div className="mt-3 px-3 py-1.5 rounded-full bg-primary/[0.07] border border-primary/15">
                              <p className="text-[11px] text-primary/80 text-center leading-relaxed">
                                Next: <span className="font-semibold">{lowestCourse.name}</span> → {nextThreshold}%
                              </p>
                            </div>
                          );
                        })()}

                        <div className="flex flex-col items-center mt-3">
                          <Button
                            disabled={careersLoading}
                            className="gap-2 rounded-full px-6 font-semibold text-white hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[220ms] disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                              background: 'linear-gradient(135deg, #4CAF82, #2A5E42)',
                              boxShadow: '0 6px 20px hsl(var(--primary) / 0.28)',
                            }}
                            onClick={() => {
                              const slug = career?.slug || selectedCareer;
                              if (!slug) { navigate('/careers'); return; }
                              const firstSlug = Array.isArray(careerRelatedSlugs) && careerRelatedSlugs.length > 0
                                ? careerRelatedSlugs[0]
                                : null;
                              navigate(firstSlug
                                ? `/career-board/${slug}/course/${firstSlug}`
                                : `/career-board/${slug}`
                              );
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
          )}

          {/* Recommended Labs Section */}
          <Card className="card-premium card-no-lift animate-stagger-3 flex-1 flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #4CAF82, #2A5E42)', boxShadow: '0 4px 12px hsl(var(--primary)/0.22)' }}>
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
                {(() => {
                  const labIcons = [<Zap className="h-4 w-4" />, <Target className="h-4 w-4" />, <Award className="h-4 w-4" />, <BookOpen className="h-4 w-4" />];

                  // Build up to 3 items: enrolled courses first, then pad with practice skills
                  const courseItems = enrolledCourses
                    .filter((e: any) => !!e.courses)
                    .slice(0, 3)
                    .map((enrollment: any, index: number) => {
                      const course = enrollment.courses;
                      return {
                        id: enrollment.id,
                        name: course.name,
                        // Use actual DB field: level (e.g. "Beginner"), fallback to learning_hours, then "Course"
                        type: course.level || (course.learning_hours ? `${course.learning_hours}h course` : 'Course'),
                        icon: labIcons[index % 4],
                        onClick: () => handleTabChange('practice'),
                      };
                    });

                  const needed = 3 - courseItems.length;
                  const skillItems = needed > 0
                    ? publishedPracticeSkills.slice(0, needed).map((skill: any, i: number) => ({
                        id: `skill-${skill.id}`,
                        name: skill.name,
                        // Use actual DB field: description (truncated), fallback to "Practice Skill"
                        type: skill.description
                          ? skill.description.replace(/<[^>]*>/g, '').slice(0, 38).trim() + (skill.description.length > 38 ? '…' : '')
                          : 'Practice Skill',
                        icon: labIcons[(courseItems.length + i) % 4],
                        onClick: () => navigate(`/practice/${skill.slug}`),
                      }))
                    : [];

                  const items = [...courseItems, ...skillItems];

                  if (items.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <FlaskConical className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Enroll in courses to unlock practice labs</p>
                        <Button variant="link" onClick={() => navigate('/courses')} className="mt-2">Browse Courses</Button>
                      </div>
                    );
                  }

                  return items.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-border/30 cursor-pointer transition-all duration-200 hover:border-primary/25 hover:bg-muted/20 hover:-translate-y-[2px]"
                      onClick={item.onClick}
                    >
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 bg-muted/70 flex items-center justify-center">
                        {React.cloneElement(item.icon as React.ReactElement, { className: 'h-[18px] w-[18px] text-foreground/40' })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-semibold text-foreground line-clamp-1 leading-snug">{item.name}</p>
                        <p className="text-[11.5px] text-muted-foreground mt-0.5">{item.type}</p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-0.5 text-[12px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Start <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Today's Focus + Weekly Activity + AI Mentor */}
        <div className="space-y-6">
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
                  className="flex items-center gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/[0.04] hover:border-primary/30 hover:bg-primary/[0.07] transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
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
                  className={`flex items-center gap-3 p-3.5 rounded-xl border border-border/30 transition-all duration-200 group ${todaysFocus.hasCompletedLessons
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
                  className={`flex items-center gap-3 p-3.5 rounded-xl border border-border/30 transition-all duration-200 group ${todaysFocus.nextLesson
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
          <Card className="card-premium card-tertiary card-no-lift animate-stagger-3">
            {/* Calm ambient tint */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none" style={{ background: 'hsl(var(--primary) / 0.08)' }} />
            <CardContent className="p-5 flex flex-col relative">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF82, #2A5E42)',
                    boxShadow: '0 4px 14px hsl(var(--primary) / 0.28)',
                  }}
                >
                  <Sparkles className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold tracking-tight text-foreground">AI Mentor</h3>
                  <p className="text-[11.5px] text-muted-foreground">Your personal learning assistant</p>
                </div>
              </div>

              <div className="flex flex-col mt-3">
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {completedInCareer < careerRelatedSlugs.length
                    ? `Continue your ${career?.name || 'career'} journey. Get personalized guidance on what to learn next and improve your skills.`
                    : 'Great progress! Ask me about advanced topics, career advice, or explore new learning paths.'}
                </p>

                <Button
                  variant="default"
                  className="w-full mt-4 gap-2 rounded-xl font-semibold text-white hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[220ms] text-[13px] h-10"
                  style={{
                    background: 'linear-gradient(135deg, #4CAF82, #2A5E42)',
                    boxShadow: '0 6px 20px hsl(var(--primary) / 0.28)',
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
      { bg: 'rgba(34,197,94,0.1)', fg: '#16A34A' },
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

      // Cached per-course — survives tab switches and page re-navigation
      const { data: nextLesson = null } = useQuery<{ title: string; order: number } | null>({
        queryKey: ['next-lesson', course?.id, userId],
        queryFn: async () => {
          if (!course?.id || !userId) return null;
          try {
            const [lessonsData, postsData, progressData] = await Promise.all([
              (supabase
                .from('course_lessons' as any)
                .select('id, title, lesson_rank')
                .eq('course_id', course.id)
                .eq('is_published', true)
                .is('deleted_at', null)
                .order('lesson_rank', { ascending: true }) as unknown as Promise<{ data: { id: string; title: string; lesson_rank: string | null }[] | null }>),
              supabase
                .from('posts')
                .select('id, title, lesson_id, post_rank')
                .eq('category_id', course.id)
                .eq('status', 'published')
                .order('post_rank', { ascending: true }),
              supabase
                .from('lesson_progress')
                .select('lesson_id')
                .eq('course_id', course.id)
                .eq('user_id', userId)
                .eq('completed', true),
            ]);

            const completedIds = new Set(progressData.data?.map((l: any) => l.lesson_id) || []);
            const allPosts = postsData.data || [];

            const lessonRanks = new Map((lessonsData.data || []).map((l, i) => [l.id, i]));
            allPosts.sort((a: any, b: any) => {
              const rankA = lessonRanks.get(a.lesson_id) ?? 999;
              const rankB = lessonRanks.get(b.lesson_id) ?? 999;
              if (rankA !== rankB) return rankA - rankB;
              return String(a.post_rank || '').localeCompare(String(b.post_rank || ''));
            });

            const nextPost = allPosts.find((post: any) => !completedIds.has(post.id));
            if (nextPost) {
              const parentLesson = (lessonsData.data || []).find(l => l.id === nextPost.lesson_id);
              const lessonOrder = parentLesson ? (lessonsData.data || []).indexOf(parentLesson) + 1 : 1;
              const lessonTitle = parentLesson?.title || 'Chapter';
              return { title: `${lessonTitle} > ${nextPost.title}`, order: lessonOrder };
            }
            return null;
          } catch (e) {
            console.error("Failed to fetch next lesson", e);
            return null;
          }
        },
        enabled: !isCompleted && !!course?.id && !!userId,
        staleTime: 2 * 60 * 1000,
      });

      return (
        <div
          className="group flex flex-col sm:flex-row w-full overflow-hidden cursor-pointer bg-card border border-border/50"
          style={{
            borderRadius: '14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
            minHeight: '140px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)';
          }}
          onClick={() => navigateToCourse(course?.slug, course?.id)}
        >
          {/* Left: primary green panel */}
          <div
            className="sm:w-[170px] shrink-0 px-5 py-5 flex flex-col justify-between relative overflow-hidden"
            style={{ background: 'hsl(var(--primary))' }}
          >
            <div className="relative z-10">
              <span className="text-white/60 text-[9px] font-bold tracking-[0.18em] uppercase mb-2 block">
                Course
              </span>
              <h3 className="text-white text-[16px] font-semibold leading-snug line-clamp-3 tracking-tight">
                {course?.name}
              </h3>
            </div>
            <div className="relative z-10 flex items-center text-white/70 text-[11px] font-medium mt-4 group-hover:text-white transition-colors duration-150">
              {isCompleted ? 'Review course' : 'View all chapters'}
              <ChevronRight className="w-3 h-3 ml-0.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </div>
            {/* Subtle top-right highlight */}
            <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-[0.12]"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
          </div>

          {/* Right: white info panel */}
          <div className="flex-1 px-5 py-4 flex flex-col justify-between bg-card min-w-0">

            {/* Top: status + lesson count */}
            <div className="flex items-center justify-between gap-2">
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Completed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  In Progress
                </span>
              )}
              <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
                {isCompleted ? (
                  <span className="text-primary font-semibold">100%</span>
                ) : (
                  `${progress.completed}/${progress.total} Lessons`
                )}
              </span>
            </div>

            {/* Progress bar — full width */}
            <div className="mt-2.5 w-full h-[3px] bg-muted/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${isCompleted ? 100 : pct}%`, background: 'hsl(var(--primary))' }}
              />
            </div>

            {/* Next lesson / done state */}
            <div className="mt-3 flex items-center justify-between min-w-0">
              <button
                className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-primary transition-colors duration-150 truncate group/cta"
                onClick={(e) => { e.stopPropagation(); navigateToCourse(course?.slug, course?.id); }}
              >
                <span className="truncate">
                  {isCompleted
                    ? 'Review course'
                    : (nextLesson ? nextLesson.title : 'Start course')}
                </span>
                <ChevronRight className="w-3 h-3 shrink-0 opacity-50 transition-transform duration-150 group-hover/cta:translate-x-0.5" />
              </button>
            </div>

          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-3">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
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
      Easy: { bg: 'rgba(34,197,94,0.1)', fg: '#16A34A' },
      Medium: { bg: 'rgba(234,179,8,0.1)', fg: '#A16207' },
      Hard: { bg: 'rgba(239,68,68,0.1)', fg: '#DC2626' },
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

        // Add the new reply to the cached discussions map
        queryClient.setQueryData(['user-discussions', userId], (old: any) => ({
          ...old,
          repliesMap: {
            ...(old?.repliesMap ?? {}),
            [parentId]: [...(old?.repliesMap?.[parentId] ?? []), data],
          },
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
      <div ref={contentRef} className="profile-page-outer">

        {/* ── Sidebar + Content row ── */}
        <div className="profile-inner-row">

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

        </div>{/* end profile-inner-row */}

        {/* ── Slim footer — full width, visible on scroll ── */}
        <SlimFooter />

      </div>
    </Layout>
  );
};

export default Profile;
