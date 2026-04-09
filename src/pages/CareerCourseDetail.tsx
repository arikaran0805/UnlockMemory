/**
 * Career Course Detail Page
 * 
 * ARCHITECTURAL CONTRACT:
 * - This component is HEADER-AGNOSTIC (header owned by CareerBoardLayout)
 * - It does NOT render Header, AnnouncementBar, or Footer
 * - It does NOT show ads, nudges, or guest banners (premium experience)
 * - All career context is inherited from CareerBoardContext
 * 
 * FEATURE PARITY with CourseDetail (minus ads/nudges/header):
 * - Full tabs: Details, Lessons, Notes, Certificate
 * - Comments, Likes, Bookmarks, Sharing
 * - Reviews, Reports, Suggestions
 * - LessonFooter with all actions
 * - Course metadata, prerequisites, creator/team info
 * - Restart course, enroll, progress tracking
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useNavigate, useSearchParams, useOutletContext, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CodeEditProvider } from "@/contexts/CodeEditContext";
import { useCourseStats } from "@/hooks/useCourseStats";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { useLessonTimeTracking } from "@/hooks/useLessonTimeTracking";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserState } from "@/hooks/useUserState";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { usePracticeSkillByCourse, useLessonProblemCounts, useLessonProblemsCompletion } from "@/hooks/useLessonProblems";

import { useIsMobile } from "@/hooks/use-mobile";
import { useNotesTabOpener } from "@/hooks/useNotesTabManager";
import SEOHead from "@/components/SEOHead";
import CourseStructuredData from "@/components/CourseStructuredData";
import ContentRenderer from "@/components/ContentRenderer";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { ReviewPreviewCard } from "@/components/course-completed";
import ShareTooltip from "@/components/ShareTooltip";
import CommentDialog from "@/components/CommentDialog";
import ReportSuggestDialog from "@/components/ReportSuggestDialog";
import CourseMetadataSidebar from "@/components/course/CourseMetadataSidebar";
import LessonFooter from "@/components/course/LessonFooter";
import { LearningCockpit } from "@/components/course/LearningCockpit";
import { sanitizeHtml } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Users, 
  Tag, 
  ThumbsUp, 
  Share2, 
  MessageSquare, 
  Calendar, 
  MoreVertical, 
  Bookmark, 
  BookmarkCheck, 
  Flag, 
  Edit, 
  Lightbulb, 
  Star, 
  UserPlus, 
  CheckCircle, 
  Circle, 
  AlertTriangle, 
  Info, 
  List,
  StickyNote,
  Award,
  Play,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  Home,
  Link2,
  Clock,
  Linkedin,
  Copy,
  ExternalLink,
} from "lucide-react";
import CourseSidebar from "@/components/course/CourseSidebar";
import LessonShareMenu from "@/components/LessonShareMenu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { trackSocialMediaClick } from "@/lib/socialAnalytics";
import { trackPostShare } from "@/lib/shareAnalytics";
import { formatReadingTime, formatTotalReadingTime } from "@/lib/readingTime";
import { z } from "zod";

interface Course {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  featured_image: string | null;
  status: string;
  level?: string | null;
  learning_hours?: number | null;
  author_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
  prerequisites?: string[] | null;
}

interface CourseLesson {
  id: string;
  title: string;
  description: string | null;
  lesson_rank: string;
  is_published: boolean;
  course_id: string;
}

interface Post {
  id: string;
  title: string;
  excerpt: string | null;
  slug: string;
  published_at: string | null;
  updated_at: string;
  status: string;
  content?: string;
  lesson_id: string | null;
  post_rank: string | null;
  post_type: string | null;
  code_theme?: string | null;
  profiles: {
    full_name: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string | null;
  status: string;
  is_anonymous: boolean;
  display_name: string | null;
  parent_id: string | null;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface OutletContext {
  setCurrentCourseSlug: (slug: string | null) => void;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
}

const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must be less than 1000 characters" })
});

const CareerCourseDetail = () => {
  const params = useParams<{ careerId: string; courseSlug: string }>();
  const careerIdParam = decodeURIComponent((params.careerId ?? "").split("?")[0]).trim();
  const courseSlug = decodeURIComponent((params.courseSlug ?? "").split("?")[0]).trim();
  const [searchParams, setSearchParams] = useSearchParams();
  const lessonSlug = searchParams.get("lesson");
  const tabParam = searchParams.get("tab");
  const isPreviewMode = searchParams.get("preview") === "true";
  const navigate = useNavigate();
  const location = useLocation();
  // All data passed via navigation state for instant render (zero DB queries)
  const navState = (location.state as any) ?? {};
  const prefetchedCourse = navState.prefetchedCourse ?? null;
  const prefetchedPosts: Post[] | null = navState.prefetchedPosts ?? null;
  const prefetchedLessons: CourseLesson[] | null = navState.prefetchedLessons ?? null;
  const prefetchedStats = navState.prefetchedStats ?? null;
  const prefetchedLessonMap: Record<string, boolean> | null = navState.prefetchedLessonMap ?? null;

  // Get the outlet context to update current course in parent layout
  const { setCurrentCourseSlug, isHeaderVisible, showAnnouncement } = useOutletContext<OutletContext>();

  // Career Board context
  const { career, careerCourses, isLoading: careerLoading } = useCareerBoard();

  // Always prefer the route param for building Career Board URLs.
  // (career can be transiently null during initialization; the param is always present.)
  const careerSlugForPath = careerIdParam || career?.slug;

  // Stable identity key — changes on every course navigation
  const courseKey = `${careerIdParam}__${courseSlug}`;

  const [course, setCourse] = useState<Course | null>(prefetchedCourse ?? null);
  // Initialize lessons/posts from navigate state if available (instant — no fetch needed)
  const [lessons, setLessons] = useState<CourseLesson[]>(prefetchedLessons ?? []);
  const [posts, setPosts] = useState<Post[]>(prefetchedPosts ?? []);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(
    prefetchedLessons && prefetchedLessons.length > 0 ? new Set([prefetchedLessons[0].id]) : new Set()
  );
  const [loading, setLoading] = useState(!prefetchedCourse);
  // lessonsLoading only if we have prefetchedCourse but no prefetchedPosts
  const [lessonsLoading, setLessonsLoading] = useState(!!prefetchedCourse && !prefetchedPosts);
  const [canPreview, setCanPreview] = useState(false);
  const { isAdmin, isModerator, isLoading: roleLoading } = useUserRole();
  const { isPro, isLoading: userStateLoading } = useUserState();
  const isMobile = useIsMobile();
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const { user, isLoading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likingPost, setLikingPost] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [allTags, setAllTags] = useState<Array<{id: string; name: string; slug: string}>>([]);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [careers, setCareers] = useState<Array<{id: string; name: string; slug: string}>>([]);
  const [courseCreator, setCourseCreator] = useState<{id: string; full_name: string | null; avatar_url: string | null; role: string} | null>(null);
  const [maintenanceTeam, setMaintenanceTeam] = useState<Array<{id: string; full_name: string | null; avatar_url: string | null; role: string}>>([]);
  const [linkedPrerequisites, setLinkedPrerequisites] = useState<Array<{
    id: string;
    prerequisite_course_id: string | null;
    prerequisite_text: string | null;
    linkedCourse?: { id: string; name: string; slug: string } | null;
    isCompleted?: boolean;
    progressPercentage?: number;
  }>>([]);
  const { toast } = useToast();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [restartModalOpen, setRestartModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [defaultTabResolved, setDefaultTabResolved] = useState(false);
  const [shareOpenPostId, setShareOpenPostId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Tracks what courseKey the current state snapshot belongs to.
  // Updated synchronously at the TOP of the isNewCourse block so stateIsStale
  // flips to false on the very same render that applies new-course state.
  const committedCourseKeyRef = useRef<string | null>(null);

  // Prevents double-fetching when isAdmin updates after roleLoading resolves.
  // Reset to null on every new course navigation so we always fetch fresh data.
  const hasFetchedForCourseKeyRef = useRef<string | null>(null);

  // Derive synchronously at render time: does current state belong to the current route?
  // true on the FIRST render after navigation (before any effects run).
  const stateIsStale = committedCourseKeyRef.current !== null && committedCourseKeyRef.current !== courseKey;

  // Header visibility is now consumed from CareerBoardLayout via outlet context
  // (removed local state - isHeaderVisible and showAnnouncement come from context)

  // Course stats hook
  const {
    stats: courseStats,
    reviews: courseReviews,
    loading: courseStatsLoading,
    enrolling,
    enroll,
    unenroll,
    submitReview,
    deleteReview,
  } = useCourseStats(course?.id, user, prefetchedStats ?? undefined);

  // Course progress hook — pass user + initial lesson map for instant render
  const { progress, loading: progressLoading, lessonStatuses, markLessonViewed, markLessonCompleted, isLessonCompleted, refetch: refetchProgress } = useCourseProgress(course?.id, user, prefetchedLessonMap ?? undefined);
  const [markingComplete, setMarkingComplete] = useState(false);

  // Practice problems linking hooks
  const { data: practiceSkill } = usePracticeSkillByCourse(course?.id);
  const { data: lessonProblemCounts } = useLessonProblemCounts(course?.id);
  const { data: lessonProblemsCompleted } = useLessonProblemsCompletion(course?.id);

  // Time tracking hook
  useLessonTimeTracking({ lessonId: selectedPost?.id, courseId: course?.id });

  // Notes tab manager
  const { openNotesTab } = useNotesTabOpener(course?.id, careerSlugForPath);

  // Register current course slug with parent layout
  useEffect(() => {
    setCurrentCourseSlug(courseSlug);
    return () => setCurrentCourseSlug(null);
  }, [courseSlug, setCurrentCourseSlug]);

  // Computed values for course status (includes lessons + practice problems)
  const courseProgress = useMemo(() => {
    const completedLessons = progress.completedLessons;
    const totalLessons = posts.length;
    
    // Lessons only
    const completedCount = completedLessons;
    const totalCount = totalLessons;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const hasStarted = completedCount > 0;
    const isCompleted = completedCount === totalCount && totalCount > 0;
    
    return { completedCount, totalCount, percentage, hasStarted, isCompleted };
  }, [progress.completedLessons, posts.length]);

  /**
   * ROLE-AWARE, PROGRESS-AWARE DEFAULT TAB SELECTION
   */
  useEffect(() => {
    if (defaultTabResolved) return;
    // Bug 1 fix: courseStatsLoading removed from main guard (moved to certificate branch only)
    // Bug 2 fix: progressLoading added so we never read 0% from an in-flight fetch
    if (loading || progressLoading || roleLoading || userStateLoading) return;

    const postsLoaded = posts.length > 0;

    // Priority 1: If a lesson is already selected via URL, go to lessons tab
    if (lessonSlug) {
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // Priority 2: If tab is specified in URL, use it
    if (tabParam && ["details", "lessons", "notes", "certificate"].includes(tabParam)) {
      if (tabParam === "certificate") {
        if (!postsLoaded) return;
        // Career Board users don't go through explicit enrollment — use completion as proxy
        const certificateTabAvailable = isPro && courseProgress.isCompleted;
        if (!certificateTabAvailable) {
          setActiveTab("lessons");
          setDefaultTabResolved(true);
          return;
        }
      }
      setActiveTab(tabParam);
      setDefaultTabResolved(true);
      return;
    }

    // Priority 3: Admin / Moderator → ALWAYS Course Details
    if (isAdmin || isModerator) {
      setActiveTab("details");
      setDefaultTabResolved(true);
      return;
    }

    // Bug 3 fix: removed premature setActiveTab("details") — just wait silently
    // Bug 5 fix: all progress checks are after this guard so totalCount is always accurate
    if (!postsLoaded) return;

    // Priority 4: LEARNER progress-based tab selection
    const progressPercentage = courseProgress.percentage;

    // 100% completion → Certificate tab
    // Career Board users skip explicit enrollment — completion is proof of access
    if (progressPercentage === 100 && courseProgress.isCompleted) {
      if (isPro) {
        setActiveTab("certificate");
        setDefaultTabResolved(true);
        return;
      }
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // 1-99% progress → Lessons tab
    if (progressPercentage > 0 && progressPercentage < 100) {
      setActiveTab("lessons");
      setDefaultTabResolved(true);
      return;
    }

    // 0% progress → Course Details tab
    setActiveTab("details");
    setDefaultTabResolved(true);
  }, [
    courseKey,
    defaultTabResolved,
    loading,
    progressLoading,
    roleLoading,
    userStateLoading,
    isAdmin,
    isModerator,
    lessonSlug,
    tabParam,
    courseProgress.hasStarted,
    courseProgress.isCompleted,
    courseProgress.percentage,
    isPro,
    posts.length,
  ]);

  // Persist active tab to URL when it changes
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", newTab);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Pre-sort posts into a per-lesson map once when posts change (O(n) vs O(n) per call)
  const lessonPostsMap = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      if (!post.lesson_id) continue;
      if (!map.has(post.lesson_id)) map.set(post.lesson_id, []);
      map.get(post.lesson_id)!.push(post);
    }
    map.forEach(bucket =>
      bucket.sort((a, b) => {
        const rankA = (a as any).post_rank || 'zzz';
        const rankB = (b as any).post_rank || 'zzz';
        return rankA.localeCompare(rankB);
      })
    );
    return map;
  }, [posts]);

  // Get posts for a specific lesson — O(1) map lookup
  const getPostsForLesson = useCallback(
    (lessonId: string) => lessonPostsMap.get(lessonId) ?? [],
    [lessonPostsMap],
  );

  // Ordered flat list for prev/next navigation — recomputed only when lessons/posts change
  const orderedPosts = useMemo(() => {
    const result: Post[] = [];
    lessons.forEach(lesson => result.push(...getPostsForLesson(lesson.id)));
    return result;
  }, [lessons, getPostsForLesson]);

  // Keep getAllOrderedPosts as a stable callback for callers that need a function reference
  const getAllOrderedPosts = useCallback(() => orderedPosts, [orderedPosts]);

  // Get first uncompleted post for "Continue Learning"
  const getNextPost = useCallback(() => {
    for (const post of orderedPosts) {
      if (!isLessonCompleted(post.id)) {
        return post;
      }
    }
    return orderedPosts[0];
  }, [orderedPosts, isLessonCompleted]);

  const handleEnroll = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to enroll in this course.",
        variant: "destructive",
      });
      return;
    }
    const success = await enroll();
    if (success) {
      toast({ title: "Successfully enrolled!", description: "You can now access all course materials." });
    }
  };

  const handleUnenroll = async () => {
    const success = await unenroll();
    if (success) {
      toast({ title: "Unenrolled", description: "You have been unenrolled from this course." });
    }
  };

  useEffect(() => {
    document.title = course ? `${course.name} - Career Learning` : "Career Learning";
  }, [course]);

  useEffect(() => {
    if (!courseSlug) return;

    const isNewCourse = committedCourseKeyRef.current !== courseKey;

    if (isNewCourse) {
      // Mark committed state as belonging to the new courseKey IMMEDIATELY —
      // this flips stateIsStale to false so the next render shows correct content.
      committedCourseKeyRef.current = courseKey;
      hasFetchedForCourseKeyRef.current = null; // reset so new course always fetches

      if (prefetchedCourse && prefetchedPosts) {
        // INSTANT PATH: all data available — apply immediately, no skeleton needed
        setCourse(prefetchedCourse);
        setLessons(prefetchedLessons ?? []);
        if (prefetchedLessons && prefetchedLessons.length > 0) {
          setExpandedLessons(new Set([prefetchedLessons[0].id]));
        } else {
          setExpandedLessons(new Set());
        }
        setPosts(prefetchedPosts);
        setLoading(false);
        setLessonsLoading(false);
        setSelectedPost(null);
        setActiveTab(null);
        setDefaultTabResolved(false);
        setComments([]);
        setAllTags([]);
        setLikeCount(0);
        setHasLiked(false);
        setShareOpenPostId(null);
        setCopiedPostId(null);
        setCareers([]);
        setCourseCreator(null);
        setMaintenanceTeam([]);
        setLinkedPrerequisites([]);
        return;
      }

      if (prefetchedCourse && !prefetchedPosts) {
        // PARTIAL PREFETCH PATH: course known, posts need fetching
        setCourse(prefetchedCourse);
        setLessons(prefetchedLessons ?? []);
        if (prefetchedLessons && prefetchedLessons.length > 0) {
          setExpandedLessons(new Set([prefetchedLessons[0].id]));
        } else {
          setExpandedLessons(new Set());
        }
        setPosts([]);
        setLoading(false);
        setLessonsLoading(true);
        setSelectedPost(null);
        setActiveTab(null);
        setDefaultTabResolved(false);
        setComments([]);
        setAllTags([]);
        setLikeCount(0);
        setHasLiked(false);
        setCareers([]);
        setCourseCreator(null);
        setMaintenanceTeam([]);
        setLinkedPrerequisites([]);
        fetchLessonsAndPosts(prefetchedCourse.id);
        return;
      }

      // NO PREFETCH PATH: need full fetch — show skeleton
      setCourse(null);
      setLessons([]);
      setPosts([]);
      setExpandedLessons(new Set());
      setLoading(true);
      setLessonsLoading(false);
      setSelectedPost(null);
      setActiveTab(null);
      setDefaultTabResolved(false);
      setComments([]);
      setAllTags([]);
      setLikeCount(0);
      setHasLiked(false);
      setCareers([]);
      setCourseCreator(null);
      setMaintenanceTeam([]);
      setLinkedPrerequisites([]);
    }

    // Always re-check preview access (role may have changed)
    if (!roleLoading) {
      const hasPreviewAccess = isAdmin || isModerator;
      setCanPreview(hasPreviewAccess);
    }

    // Fetch course data if we don't have it yet.
    // Guard on authLoading: prevents firing before JWT is ready (avoids RLS race on refresh).
    // Guard on hasFetchedForCourseKeyRef: prevents double-fetch when isAdmin updates.
    if (!prefetchedCourse && !roleLoading && !authLoading) {
      if (hasFetchedForCourseKeyRef.current !== courseKey) {
        hasFetchedForCourseKeyRef.current = courseKey;
        fetchCourseAndLessons();
      }
    }
  }, [courseKey, roleLoading, isAdmin, isModerator, authLoading]);

  useEffect(() => {
    if (!lessonSlug) {
      // No lesson in URL — ensure we show the course overview, not a stale lesson
      setSelectedPost(null);
      return;
    }
    if (posts.length > 0) {
      const postToSelect = posts.find((p) => p.slug === lessonSlug);
      if (!postToSelect) {
        // Lesson slug doesn't belong to this course — clear it from URL
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("lesson");
        setSearchParams(nextParams, { replace: true });
        setSelectedPost(null);
        return;
      }
      if (selectedPost?.slug !== lessonSlug) {
        if (postToSelect.lesson_id) {
          setExpandedLessons((prev) => {
            const newSet = new Set(prev);
            newSet.add(postToSelect.lesson_id!);
            return newSet;
          });
        }
        fetchPostContent(postToSelect);
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    }
  }, [lessonSlug, posts]);

  useEffect(() => {
    if (selectedPost) {
      fetchComments(selectedPost.id);
      fetchTags(selectedPost.id);

      const channel = supabase
        .channel(`comments-${selectedPost.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `post_id=eq.${selectedPost.id}`
          },
          () => {
            fetchComments(selectedPost.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setComments([]);
      setAllTags([]);
    }
  }, [selectedPost]);

  // Fetch sidebar data in parallel when course or user changes
  useEffect(() => {
    if (!course?.id) return;
    Promise.all([fetchCareers(), fetchCourseTeam(), fetchLinkedPrerequisites()]);
  }, [course?.id, user?.id]);

  const fetchCareers = async () => {
    if (!course?.id) return;
    setCareers([]);
    try {
      const { data, error } = await supabase
        .from("career_courses")
        .select("careers(id, name, slug)")
        .eq("course_id", course.id)
        .is("deleted_at", null);

      if (error) throw error;
      const mappedCareers = data?.map(item => (item.careers as any)).filter(Boolean) || [];
      setCareers(mappedCareers);
    } catch (error) {
      console.error("Error fetching careers:", error);
    }
  };

  const fetchCourseTeam = async () => {
    if (!course?.id) return;
    setCourseCreator(null);
    setMaintenanceTeam([]);
    try {
      // Fetch course creator (author)
      if (course.author_id) {
        const { data: authorData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", course.author_id)
          .single();

        if (authorData) {
          setCourseCreator({
            id: authorData.id,
            full_name: authorData.full_name,
            avatar_url: authorData.avatar_url,
            role: "creator",
          });
        }
      }

      // Fetch maintenance team from course_assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("course_assignments")
        .select("user_id, role, profiles:user_id(id, full_name, avatar_url)")
        .eq("course_id", course.id);

      if (assignmentsError) throw assignmentsError;

      if (assignmentsData) {
        const team = assignmentsData
          .filter(a => a.profiles)
          .map(a => ({
            id: (a.profiles as any).id,
            full_name: (a.profiles as any).full_name,
            avatar_url: (a.profiles as any).avatar_url,
            role: a.role,
          }));
        setMaintenanceTeam(team);
      }
    } catch (error) {
      console.error("Error fetching course team:", error);
    }
  };

  const fetchLinkedPrerequisites = async () => {
    if (!course?.id) return;
    setLinkedPrerequisites([]);
    try {
      const { data, error } = await supabase
        .from("course_prerequisites")
        .select("id, prerequisite_course_id, prerequisite_text, display_order")
        .eq("course_id", course.id)
        .order("display_order");

      if (error) throw error;

      // Fetch linked course details
      const courseIds = (data || [])
        .filter(p => p.prerequisite_course_id)
        .map(p => p.prerequisite_course_id) as string[];

      let coursesMap: Record<string, { id: string; name: string; slug: string }> = {};
      let completionMap: Record<string, { isCompleted: boolean; progressPercentage: number }> = {};
      
      if (courseIds.length > 0) {
        // Fetch course details
        const { data: courses, error: coursesError } = await supabase
          .from("courses")
          .select("id, name, slug")
          .in("id", courseIds);

        if (!coursesError && courses) {
          coursesMap = Object.fromEntries(courses.map(c => [c.id, c]));
        }

        // Fetch completion data for logged-in user
        if (user) {
          const completionPromises = courseIds.map(async (prereqCourseId) => {
            const [{ count: totalLessons }, { count: completedLessons }] =
              await Promise.all([
                supabase.from("posts").select("*", { count: "exact", head: true })
                  .eq("category_id", prereqCourseId).eq("status", "published")
                  .is("deleted_at", null),
                supabase.from("lesson_progress").select("*", { count: "exact", head: true })
                  .eq("user_id", user.id).eq("course_id", prereqCourseId)
                  .eq("completed", true),
              ]);

            const total = totalLessons || 0;
            const completed = completedLessons || 0;
            const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isCompleted = total > 0 && completed >= total;

            return { courseId: prereqCourseId, isCompleted, progressPercentage };
          });

          const completionResults = await Promise.all(completionPromises);
          completionMap = Object.fromEntries(
            completionResults.map(r => [r.courseId, { isCompleted: r.isCompleted, progressPercentage: r.progressPercentage }])
          );
        }
      }

      const enrichedPrereqs = (data || []).map(p => {
        const completion = p.prerequisite_course_id ? completionMap[p.prerequisite_course_id] : undefined;
        return {
          id: p.id,
          prerequisite_course_id: p.prerequisite_course_id,
          prerequisite_text: p.prerequisite_text,
          linkedCourse: p.prerequisite_course_id ? coursesMap[p.prerequisite_course_id] || null : null,
          isCompleted: completion?.isCompleted,
          progressPercentage: completion?.progressPercentage,
        };
      });

      setLinkedPrerequisites(enrichedPrereqs);
    } catch (error) {
      console.error("Error fetching prerequisites:", error);
    }
  };

  // Fast path: already have course from nav state — only fetch lessons + posts in parallel
  const fetchLessonsAndPosts = useCallback(async (courseId: string) => {
    try {
      const [lessonsResult, postsResult] = await Promise.all([
        supabase
          .from("course_lessons")
          .select("id, title, description, lesson_rank, is_published, course_id")
          .eq("course_id", courseId)
          .is("deleted_at", null)
          .order("lesson_rank", { ascending: true }),
        supabase
          .from("posts")
          .select("id, title, content, excerpt, slug, published_at, updated_at, lesson_id, post_rank, post_type, status, profiles:author_id (full_name)")
          .eq("category_id", courseId)
          .eq("status", "published")
          .order("post_rank", { ascending: true }),
      ]);

      const typedLessons = ((lessonsResult.data || []) as unknown as CourseLesson[]);
      setLessons(typedLessons);
      if (typedLessons.length > 0) setExpandedLessons(new Set([typedLessons[0].id]));

      const publishedLessonIds = new Set(typedLessons.filter(l => l.is_published).map(l => l.id));
      const typedPosts = ((postsResult.data || []) as any[]).map(p => ({
        ...p,
        lesson_id: p.lesson_id as string | null,
        post_rank: p.post_rank as string | null,
        post_type: p.post_type as string | null,
        profiles: p.profiles as { full_name: string | null },
      })).filter((p: any) => p.lesson_id === null || publishedLessonIds.has(p.lesson_id)) as Post[];
      setPosts(typedPosts);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLessonsLoading(false);
    }
  }, [toast]);

  const fetchCourseAndLessons = useCallback(async () => {
    let redirected = false;
    try {
      const showAllStatuses = isPreviewMode && (isAdmin || isModerator);

      let courseQuery = supabase
        .from("courses")
        .select("*")
        .eq("slug", courseSlug);

      if (!showAllStatuses) {
        courseQuery = courseQuery.eq("status", "published");
      }

      // maybeSingle() returns { data: null, error: null } for 0 rows instead of PGRST116,
      // cleanly separating "not found" from real DB/network errors.
      const { data: courseData, error: courseError } = await courseQuery.maybeSingle();

      if (courseError) {
        // Real DB/network error — show toast, stay on page (don't redirect)
        throw courseError;
      }

      if (!courseData) {
        // Genuinely not found — auth is already confirmed at the call site (Bug 1 guard)
        redirected = true;
        toast({
          title: "Course not found",
          description: "This course doesn't exist or isn't available.",
        });
        navigate("/careers", { replace: true });
        return;
      }

      setCourse(courseData);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from("course_lessons")
        .select("id, title, description, lesson_rank, is_published, course_id")
        .eq("course_id", courseData.id)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      if (lessonsError) throw lessonsError;

      const typedLessons = (lessonsData || []) as unknown as CourseLesson[];
      setLessons(typedLessons);

      if (typedLessons.length > 0) {
        setExpandedLessons(new Set([typedLessons[0].id]));
      }

      let postsQuery = supabase
        .from("posts")
        .select(`
          id,
          title,
          content,
          excerpt,
          slug,
          published_at,
          updated_at,
          lesson_id,
          post_rank,
          post_type,
          status,
          profiles:author_id (full_name)
        `)
        .eq("category_id", courseData.id)
        .order("post_rank", { ascending: true });

      if (!showAllStatuses) {
        postsQuery = postsQuery.eq("status", "published");
      }

      const { data: postsData, error: postsError } = await postsQuery;

      if (postsError) throw postsError;

      let typedPosts = (postsData || []).map(p => ({
        ...p,
        lesson_id: p.lesson_id as string | null,
        post_rank: p.post_rank as string | null,
        post_type: p.post_type as string | null,
        profiles: p.profiles as { full_name: string | null }
      })) as Post[];

      if (!showAllStatuses) {
        const publishedLessonIds = new Set(
          (lessonsData || [])
            .filter(lesson => lesson.is_published === true)
            .map(lesson => lesson.id)
        );
        typedPosts = typedPosts.filter(post =>
          post.lesson_id === null || publishedLessonIds.has(post.lesson_id)
        );
      }

      setPosts(typedPosts);
    } catch (error: any) {
      toast({
        title: "Error loading course",
        description: error.message || "Please try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      if (!redirected) {
        setLoading(false);
      }
    }
  }, [courseSlug, isPreviewMode, isAdmin, isModerator, navigate, toast]);

  const fetchTags = async (postId?: string) => {
    if (!postId) {
      setAllTags([]);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from("post_tags")
        .select("tags(id, name, slug)")
        .eq("post_id", postId);

      if (error) throw error;
      
      const tags = data?.map(item => (item.tags as any)) || [];
      setAllTags(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchLikeData = async (postId: string) => {
    try {
      const { count } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);
      setLikeCount(count || 0);

      if (user) {
        const { data } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        setHasLiked(!!data);
      }
    } catch (error) {
      console.error("Error fetching like data:", error);
    }
  };

  const handleLikeToggle = async () => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in to like this lesson.", variant: "destructive" });
      return;
    }
    if (!selectedPost || likingPost) return;

    setLikingPost(true);
    try {
      if (hasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", selectedPost.id).eq("user_id", user.id);
        setHasLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await supabase.from("post_likes").insert({ post_id: selectedPost.id, user_id: user.id });
        setHasLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLikingPost(false);
    }
  };

  const fetchPostContent = async (post: Post) => {
    // 1. Optimistic UI: Instantly show whatever we have in memory 
    //    (which now includes the full content thanks to our earlier query update)
    setSelectedPost(post);
    
    // 2. Fire and forget secondary data immediately
    fetchLikeData(post.id);
    if (user) {
      markLessonViewed(post.id);
    }

    try {
      const shouldUseLatestVersion = isPreviewMode && canPreview;
      const needsNetworkFetch = shouldUseLatestVersion || !post.content;
      
      // 3. Background fetch if we need a preview version or if content was somehow missing
      if (needsNetworkFetch) {
        let hydratedPost: any = { ...post };

        if (!post.content) {
          const { data, error } = await supabase
            .from("posts")
            .select(`*, profiles:author_id (full_name)`)
            .eq("id", post.id)
            .single();

          if (!error && data) {
            hydratedPost = { ...hydratedPost, ...data };
          }
        }

        if (shouldUseLatestVersion) {
          const { data: latestVersion, error: versionError } = await supabase
            .from("post_versions")
            .select("content, version_number, status")
            .eq("post_id", post.id)
            .order("version_number", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!versionError && latestVersion?.content) {
            hydratedPost = { ...hydratedPost, content: latestVersion.content };
          }
        }
        
        // Silently upgrade the UI when the background fetch completes
        setSelectedPost(hydratedPost);
      }
    } catch (error: any) {
      console.error("Failed to load background lesson content", error);
    }
  };

  const handleLessonClick = (post: Post) => {
    if (post.lesson_id) {
      setExpandedLessons(new Set([post.lesson_id]));
    }

    setActiveTab("lessons");
    setDefaultTabResolved(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "lessons");
    nextParams.set("lesson", post.slug);
    setSearchParams(nextParams);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          content,
          created_at,
          user_id,
          status,
          is_anonymous,
          display_name,
          parent_id,
          profiles:user_id (full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, isAnonymous: boolean = false, parentId?: string, content?: string) => {
    e.preventDefault();

    if (!selectedPost) return;

    const commentText = content || commentContent;

    try {
      const validated = commentSchema.parse({ content: commentText });

      setSubmittingComment(true);

      const commentData: any = {
        content: validated.content,
        post_id: selectedPost.id,
        is_anonymous: user ? isAnonymous : true,
        display_name: user && !isAnonymous ? null : "unknown_ant",
        parent_id: parentId || null,
      };

      if (user) {
        commentData.user_id = user.id;
      }

      const { error } = await supabase
        .from("comments")
        .insert(commentData);

      if (error) throw error;

      toast({
        title: "Comment Posted",
        description: "Your comment has been posted.",
      });

      if (!content) {
        setCommentContent("");
      }
      fetchComments(selectedPost.id);
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
          description: "Failed to submit comment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    try {
      const validated = commentSchema.parse({ content: newContent });

      const { error } = await supabase
        .from("comments")
        .update({ content: validated.content })
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({ title: "Comment updated" });
      if (selectedPost) fetchComments(selectedPost.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error instanceof z.ZodError ? error.errors[0].message : "Failed to update comment",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      toast({ title: "Comment deleted" });
      if (selectedPost) fetchComments(selectedPost.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const currentOrderedIndex = selectedPost 
    ? orderedPosts.findIndex(p => p.id === selectedPost.id)
    : -1;
    
  const hasPrevious = currentOrderedIndex > 0;
  const hasNext = currentOrderedIndex < orderedPosts.length - 1 && currentOrderedIndex !== -1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevPost = orderedPosts[currentOrderedIndex - 1];
      handleLessonClick(prevPost);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextPost = orderedPosts[currentOrderedIndex + 1];
      handleLessonClick(nextPost);
    }
  };

  // Toggle lesson expansion
  const toggleLessonExpansion = (lessonId: string) => {
    setExpandedLessons(prev => {
      if (prev.has(lessonId)) {
        return new Set();
      }
      return new Set([lessonId]);
    });
  };

  // Copy course URL to clipboard
  const copyUrl = async () => {
    const url = `${window.location.origin}/career-board/${careerSlugForPath}/course/${course?.slug}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
    toast({ title: "URL copied!", description: "Course URL copied to clipboard." });
  };

  // Get primary CTA button props based on user state, enrollment, progress, and role
  const getPrimaryCTAProps = () => {
    // Admin / Moderator
    if (isAdmin || isModerator) {
      return {
        label: "Manage Course",
        icon: Edit,
        onClick: () => window.open(`/admin/courses/${course?.id}`, '_blank'),
      };
    }

    // User not enrolled
    if (!courseStats.isEnrolled) {
      return {
        label: "Enroll Now",
        icon: UserPlus,
        onClick: handleEnroll,
      };
    }

    // User enrolled and completed (100%)
    if (courseProgress.isCompleted) {
      return {
        label: "Restart Course",
        icon: RefreshCw,
        onClick: () => setRestartModalOpen(true),
      };
    }

    // User enrolled and in progress (1%-99%)
    if (courseProgress.hasStarted) {
      return {
        label: "Continue Learning",
        icon: Play,
        onClick: () => {
          const next = getNextPost();
          if (next) handleLessonClick(next);
        },
      };
    }

    // User enrolled but not started (0%)
    return {
      label: "Start Course",
      icon: Play,
      onClick: () => {
        const firstPost = orderedPosts[0] ?? posts[0];
        if (!firstPost) {
          toast({
            title: "No lessons available",
            description: "This course doesn't have any published lessons yet.",
            variant: "destructive",
          });
          return;
        }
        handleLessonClick(firstPost);
      },
    };
  };

  // Handle restart course confirmation
  const handleRestartCourse = async () => {
    if (!user || !course?.id) {
      setRestartModalOpen(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('lesson_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', course.id);

      if (error) throw error;

      refetchProgress();

      toast({
        title: "Progress Reset",
        description: "Your course progress has been reset. Starting from the beginning!",
      });

      setRestartModalOpen(false);

      const firstPost = orderedPosts[0] ?? posts[0];
      if (firstPost) handleLessonClick(firstPost);
    } catch (error: any) {
      console.error("Error resetting progress:", error);
      toast({
        title: "Error",
        description: "Failed to reset course progress",
        variant: "destructive",
      });
      setRestartModalOpen(false);
    }
  };

  // Get lesson completion info — stable reference so CourseSidebar doesn't re-render needlessly
  const getLessonProgress = useCallback((lessonId: string) => {
    const lessonPosts = getPostsForLesson(lessonId);
    const completedPosts = lessonPosts.filter(p => isLessonCompleted(p.id)).length;
    const totalPosts = lessonPosts.length;
    const percentage = totalPosts > 0 ? Math.round((completedPosts / totalPosts) * 100) : 0;
    const isComplete = completedPosts === totalPosts && totalPosts > 0;
    return { completedPosts, totalPosts, percentage, isComplete };
  }, [getPostsForLesson, isLessonCompleted]);

  // Get Action Reinforcement Card content based on current state
  const getActionCardContent = () => {
    if (isAdmin || isModerator) {
      return {
        title: "Manage This Course",
        message: "View and manage course settings, structure, and metadata.",
        buttonLabel: "Manage Course",
        icon: Edit,
      };
    }

    if (!courseStats.isEnrolled) {
      return {
        title: "Ready to Get Started?",
        message: "Enroll in this course to begin your learning journey.",
        buttonLabel: "Enroll Now",
        icon: UserPlus,
      };
    }

    if (courseProgress.isCompleted) {
      return {
        title: "Course Completed 🎉",
        message: "You've completed this course. You can restart anytime to revise.",
        buttonLabel: "Restart Course",
        icon: RefreshCw,
      };
    }

    if (courseProgress.hasStarted) {
      return {
        title: "Keep going",
        message: `${courseProgress.completedCount} of ${courseProgress.totalCount} lessons completed`,
        buttonLabel: "Continue Learning",
        icon: Play,
      };
    }

    return {
      title: "You're All Set to Start",
      message: "Begin your learning journey when you're ready.",
      buttonLabel: "Start Course",
      icon: Play,
    };
  };

  const hasPrefetchedData = !!prefetchedCourse && !!prefetchedPosts;

  // Skeleton: just navigated to a new course AND no prefetch data to show immediately
  const needsFullSkeleton = stateIsStale && !hasPrefetchedData;
  // Skeleton: auth/role gates not yet resolved on FIRST load (not re-navigation)
  const needsAuthSkeleton = !stateIsStale && (authLoading || (!prefetchedCourse && (roleLoading || careerLoading)));
  // Skeleton: course data genuinely loading after state reset (no prefetch)
  const needsDataSkeleton = !stateIsStale && loading;

  const isPageLoading = needsFullSkeleton || needsAuthSkeleton || needsDataSkeleton;
  // Fast path: course known but posts still fetching (partial prefetch or slow network)
  const isFastPathLoading = !stateIsStale && !loading && lessonsLoading && posts.length === 0;

  if (isPageLoading || isFastPathLoading) {
    return (
      <div className="w-full flex flex-col lg:flex-row gap-0 lg:justify-center">
        {/* Left Sidebar Skeleton */}
        <aside className="hidden lg:flex w-[280px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
          <div className="px-4 py-3 border-b border-sidebar-border">
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="px-4 pt-3 pb-4 border-b border-sidebar-border space-y-2.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="space-y-1 p-2 pt-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-2 px-2 py-2">
                <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        </aside>
        {/* Main Content Skeleton */}
        <main className="flex-1 min-w-0 max-w-4xl lg:mx-auto lg:pl-[10px] px-4 lg:px-0">
          <div className="p-6 lg:p-8">
            <div className="text-center mb-8">
              <Skeleton className="h-10 w-3/4 mx-auto mb-4" />
              <div className="flex justify-center gap-4 mb-6">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-12 w-40 mx-auto rounded-md" />
            </div>
            <div className="flex gap-4 mb-6">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-28 rounded-md" />
              <Skeleton className="h-10 w-20 rounded-md" />
            </div>
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </main>
        {/* Right Sidebar Skeleton */}
        <aside className="hidden lg:block w-[300px] shrink-0 border-l border-border px-6 py-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 text-center py-16">
        <h1 className="text-2xl font-bold mb-4">Course not found</h1>
        {isPreviewMode && !canPreview && (
          <p className="text-muted-foreground mb-4">You don't have permission to preview this content.</p>
        )}
        <Link to="/careers">
          <Button className="bg-primary hover:bg-primary/90">Back to Arcade</Button>
        </Link>
      </div>
    );
  }

  const ctaProps = getPrimaryCTAProps();
  const CtaIcon = ctaProps.icon;

  return (
    <CodeEditProvider>
    <div className="flex flex-col">
      <SEOHead 
        title={`${course.name} - Career Learning`}
        description={course.description || `Explore ${course.name} courses and lessons. Join ${courseStats.enrollmentCount.toLocaleString()} learners in this comprehensive learning path.`}
        keywords={`${course.name}, course, learning, tutorial, lessons`}
        ogTitle={`${course.name} Course`}
        ogDescription={course.description || `Learn ${course.name} with our comprehensive course materials`}
      />
      <CourseStructuredData
        course={course}
        lessons={posts.map((p) => ({ id: p.id, title: p.title, slug: p.slug }))}
        stats={{
          enrollmentCount: courseStats.enrollmentCount,
          averageRating: courseStats.averageRating,
          reviewCount: courseStats.reviewCount,
        }}
      />
      
      {/* Preview Mode Banner */}
      {isPreviewMode && canPreview && course?.status !== 'published' && (
        <div className="bg-amber-500 text-amber-950 py-2 px-4">
          <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            <span>Preview Mode - This content is not published yet</span>
          </div>
        </div>
      )}

      {/* Main Layout - symmetric centering with equal sidebar influence */}
      <div className="w-full flex flex-col lg:flex-row gap-0 lg:justify-center">
        
        {/* LEFT SIDEBAR - Progress & Navigation */}
        <CourseSidebar
          lessons={lessons}
          posts={posts}
          selectedPost={selectedPost}
          expandedLessons={expandedLessons}
          courseProgress={courseProgress}
          isPreviewMode={isPreviewMode && (isAdmin || isModerator)}
          canPreview={canPreview}
          isHeaderVisible={isHeaderVisible}
          showAnnouncement={showAnnouncement}
          isAuthenticated={!!user}
          isCareerBoard={true}
          practiceSkillSlug={practiceSkill?.slug}
          lessonProblemCounts={lessonProblemCounts}
          lessonProblemsCompleted={lessonProblemsCompleted}
          getPostsForLesson={getPostsForLesson}
          getLessonProgress={getLessonProgress}
          isLessonCompleted={isLessonCompleted}
          toggleLessonExpansion={toggleLessonExpansion}
          handleLessonClick={handleLessonClick}
          handleHomeClick={() => {
            setSelectedPost(null);

            if (!courseSlug) {
              navigate("/careers");
              return;
            }

            const desiredTab = courseProgress.percentage > 0
              ? "lessons"
              : "details";

            setActiveTab(desiredTab);
            setDefaultTabResolved(true);

            const nextSearch = new URLSearchParams(searchParams);
            nextSearch.delete("lesson");
            nextSearch.set("tab", desiredTab);
            setSearchParams(nextSearch, { replace: true });
          }}
        />

        {/* MAIN CONTENT - centered between sidebars (280px left + 300px right = 580px total, offset by 10px) */}
        <main className="flex-1 min-w-0 max-w-4xl lg:mx-auto lg:pl-[10px] px-4 lg:px-0" data-lesson-content>
          <Card className="rounded-none border-0 shadow-none">
            <CardContent className="p-6 lg:p-8">
              {loadingPost ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : selectedPost ? (
                /* Post Content View */
                <>
                  {/* Post Header */}
                  <div className="mb-4">
                    <h1 className="text-3xl lg:text-4xl font-bold mb-2 text-foreground">{selectedPost.title}</h1>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Last updated: {new Date(selectedPost.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShareTooltip
                          title={selectedPost?.title || course?.name || ""}
                          url={window.location.href}
                          postId={selectedPost?.id}
                        >
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Share2 className="h-5 w-5" />
                          </Button>
                        </ShareTooltip>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCommentDialogOpen(true)}>
                                <MessageSquare className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{comments.length} comments</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* Bookmark */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleBookmark(undefined, selectedPost?.id)}>
                                {isBookmarked(undefined, selectedPost?.id) ? (
                                  <BookmarkCheck className="h-5 w-5 text-primary fill-primary" />
                                ) : (
                                  <Bookmark className="h-5 w-5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isBookmarked(undefined, selectedPost?.id) ? 'Remove bookmark' : 'Add bookmark'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {/* More options menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-transparent">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleLikeToggle} disabled={likingPost}>
                              <ThumbsUp className={`mr-2 h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
                              <span>{hasLiked ? 'Unlike' : 'Like'} ({likeCount})</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                              <Flag className="mr-2 h-4 w-4" />
                              <span>Report</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSuggestDialogOpen(true)}>
                              <Lightbulb className="mr-2 h-4 w-4" />
                              <span>Suggest Changes</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <Separator className="mt-2" />
                  </div>

                  {/* Lesson Content */}
                  <div className="mx-auto mt-10 w-full max-w-[720px]">
                    <ContentRenderer 
                      htmlContent={selectedPost.content || ''}
                      courseType={course?.slug?.toLowerCase()}
                      codeTheme={selectedPost.code_theme || undefined}
                      variant="article"
                    />
                  </div>

                  {/* Lesson Footer */}
                  <LessonFooter
                    isCompleted={selectedPost ? isLessonCompleted(selectedPost.id) : false}
                    isMarkingComplete={markingComplete}
                    onMarkComplete={async () => {
                      if (!selectedPost) return;
                      setMarkingComplete(true);
                      const completed = !isLessonCompleted(selectedPost.id);
                      const success = await markLessonCompleted(selectedPost.id, completed);
                      if (success) {
                        toast({
                          title: completed ? "Lesson completed!" : "Lesson marked as incomplete",
                          description: completed ? "Great job! Keep up the good work." : "You can mark it complete anytime.",
                        });
                      }
                      setMarkingComplete(false);
                    }}
                    canComplete={!!user}
                    isGuest={false}
                    completedLessonsCount={courseProgress.completedCount}
                    totalLessons={orderedPosts.length}
                    courseProgressPercentage={courseProgress.percentage}
                    isCourseComplete={courseProgress.isCompleted}
                    courseId={course?.id || ""}
                    careerSlug={careerSlugForPath}
                    courseSlug={course?.slug}
                    tags={allTags}
                    onCommentClick={() => setCommentDialogOpen(true)}
                    onSuggestChangesClick={() => setSuggestDialogOpen(true)}
                    onLikeClick={handleLikeToggle}
                    likeCount={likeCount}
                    hasLiked={hasLiked}
                    isLiking={likingPost}
                    commentCount={comments.length}
                    shareTitle={selectedPost?.title || course?.name || ""}
                    shareUrl={window.location.href}
                    postId={selectedPost?.id}
                    previousLesson={hasPrevious ? orderedPosts[currentOrderedIndex - 1] : null}
                    nextLesson={hasNext ? orderedPosts[currentOrderedIndex + 1] : null}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onFinishCourse={course && careerSlugForPath ? () => {
                      // Build lesson completion map for instant "Back to Course" render
                      const lessonMap: Record<string, boolean> = {};
                      lessonStatuses.forEach((status, id) => { lessonMap[id] = status.completed; });
                      navigate(`/career-board/${careerSlugForPath}/course/${course.slug}/completed`, {
                        state: {
                          course: { id: course.id, name: course.name, slug: course.slug, description: course.description, learning_hours: course.learning_hours },
                          lessonsCompleted: courseProgress.completedCount,
                          completionDate: new Date().toISOString(),
                          // Cache all data so "Back to Course" renders instantly
                          prefetchedPosts: posts,
                          prefetchedLessons: lessons,
                          prefetchedStats: {
                            isEnrolled: courseStats.isEnrolled,
                            enrollmentCount: courseStats.enrollmentCount,
                            averageRating: courseStats.averageRating,
                            reviewCount: courseStats.reviewCount,
                            userReview: courseStats.userReview,
                          },
                          prefetchedLessonMap: lessonMap,
                        },
                      });
                    } : undefined}
                  />

                  {/* Dialogs */}
                  {selectedPost && (
                    <>
                      <ReportSuggestDialog
                        open={reportDialogOpen}
                        onOpenChange={setReportDialogOpen}
                        contentType="post"
                        contentId={selectedPost.id}
                        contentTitle={selectedPost.title}
                        type="report"
                      />
                      <ReportSuggestDialog
                        open={suggestDialogOpen}
                        onOpenChange={setSuggestDialogOpen}
                        contentType="post"
                        contentId={selectedPost.id}
                        contentTitle={selectedPost.title}
                        type="suggestion"
                      />
                    </>
                  )}
                </>
              ) : (
                /* Course Overview View */
                <>
                  {/* PAGE HEADER */}
                  <div className="text-center mb-8">
                    <h1 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">{course.name}</h1>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
                      {courseStats.averageRating > 0 && (
                        <CourseReviewDialog
                          reviews={courseReviews}
                          averageRating={courseStats.averageRating}
                          reviewCount={courseStats.reviewCount}
                          userReview={courseStats.userReview}
                          isEnrolled={courseStats.isEnrolled}
                          isAuthenticated={!!user}
                          onSubmitReview={submitReview}
                          onDeleteReview={deleteReview}
                        >
                          <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{courseStats.averageRating.toFixed(1)}</span>
                            <span className="text-muted-foreground text-sm">({courseStats.reviewCount} reviews)</span>
                          </button>
                        </CourseReviewDialog>
                      )}
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">{courseStats.enrollmentCount.toLocaleString()} enrolled</span>
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex items-center justify-center gap-3">
                      {/* Primary CTA */}
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 gap-2 px-8 shadow-lg"
                        onClick={ctaProps.onClick}
                        disabled={posts.length === 0}
                      >
                        <CtaIcon className="h-5 w-5" />
                        {ctaProps.label}
                      </Button>
                    </div>

                    {/* Cheer Label */}
                    {courseStats.isEnrolled && (
                      <p className="text-sm text-primary/70 font-medium text-center mt-3">
                        {courseProgress.isCompleted ? (
                          "🎉 You've successfully completed this course"
                        ) : courseProgress.hasStarted && courseProgress.percentage > 0 ? (
                          "💪 You're making great progress — keep going"
                        ) : (
                          "🚀 Ready to begin — let's start building this skill"
                        )}
                      </p>
                    )}
                  </div>

                  {/* TABS */}
                  <Tabs value={activeTab ?? "details"} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="mb-6 grid w-full auto-cols-fr grid-flow-col">
                      <TabsTrigger value="details" className="w-full gap-2">
                        <Info className="h-4 w-4" />
                        Course Details
                      </TabsTrigger>
                      <TabsTrigger value="lessons" className="w-full gap-2">
                        <List className="h-4 w-4" />
                        Lessons ({lessons.filter(l => l.is_published || (isPreviewMode && (isAdmin || isModerator))).length})
                      </TabsTrigger>
                      {user && course && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {isMobile ? (
                              <Link
                                to={`/courses/${course.id}/notes`}
                                className="inline-flex w-full items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-transparent hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <StickyNote className="h-4 w-4" />
                                Notes
                              </Link>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  openNotesTab({
                                    lessonId: selectedPost?.id,
                                  entityType: selectedPost ? 'lesson' : undefined,
                                });
                              }}
                                className="inline-flex w-full items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-transparent hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                              >
                                <StickyNote className="h-4 w-4" />
                                Notes
                                <ExternalLink className="h-3 w-3 opacity-50" />
                              </button>
                            )}
                          </TooltipTrigger>
                          {!isMobile && (
                            <TooltipContent side="bottom" className="text-xs">
                              Opens notes in a new tab
                            </TooltipContent>
                          )}
                        </Tooltip>
                      )}
                      
                      {/* Certificate Tab */}
                      {isPro && (
                        <TabsTrigger value="certificate" className="w-full gap-2">
                          {!courseProgress.isCompleted && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <Award className="h-4 w-4" />
                          Certificate
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {/* Course Details Tab */}
                    <TabsContent value="details">
                      <div className="space-y-8">
                        {/* Description */}
                        {course.description && (
                          <div>
                            <h3 className="text-xl font-semibold mb-4">About This Course</h3>
                            <div className="mx-auto w-full max-w-[720px]">
                              <ContentRenderer
                                htmlContent={course.description}
                                courseType={course?.slug?.toLowerCase()}
                                variant="article"
                              />
                            </div>
                          </div>
                        )}

                        {/* Review Preview */}
                        {courseReviews.length > 0 && (
                          <ReviewPreviewCard
                            reviews={courseReviews}
                            averageRating={courseStats.averageRating}
                          />
                        )}

                        {/* Action Reinforcement Card */}
                        {posts.length > 0 && (() => {
                          const cardContent = getActionCardContent();
                          const CardIcon = cardContent.icon;
                          
                          return (
                            <div 
                              id="action-reinforcement-card" 
                              className="p-5 bg-primary/5 rounded-xl border border-primary/10 transition-all duration-300"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Left: Icon + Content */}
                                <div className="flex items-start gap-4 flex-1">
                                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Target className="h-5 w-5 text-primary" />
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <h3 className="font-semibold text-foreground text-lg leading-tight">
                                      {cardContent.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      {cardContent.message}
                                    </p>
                                  </div>
                                </div>

                                {/* Right: CTA */}
                                <div className="flex flex-col items-center gap-1.5 sm:ml-auto">
                                  <Button 
                                    onClick={ctaProps.onClick}
                                    disabled={posts.length === 0 || enrolling}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 h-10 font-medium shadow-sm"
                                  >
                                    <CardIcon className="h-4 w-4 mr-2" />
                                    {enrolling ? "Processing..." : cardContent.buttonLabel}
                                  </Button>
                                  <span className="text-xs text-muted-foreground hidden sm:block text-center">
                                    {(() => {
                                      if (isAdmin || isModerator) {
                                        const draftCount = posts.filter(p => p.status === 'draft').length;
                                        return draftCount > 0 
                                          ? `${posts.length} lesson${posts.length !== 1 ? 's' : ''} • ${draftCount} draft${draftCount !== 1 ? 's' : ''} pending`
                                          : `${posts.length} lesson${posts.length !== 1 ? 's' : ''} ready`;
                                      }
                                      if (courseProgress.hasStarted) {
                                        const nextLesson = orderedPosts.find(p => !isLessonCompleted(p.id));
                                        if (nextLesson) {
                                          return `Resume from ${nextLesson.title}`;
                                        }
                                      }
                                      return "Start your learning journey";
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </TabsContent>

                    {/* Lessons Tab */}
                    <TabsContent value="lessons">
                      <div className="mb-6">
                        <h3 className="text-xl font-semibold mb-1">Course Curriculum</h3>
                        <p className="text-muted-foreground text-sm">
                          {lessons.filter(l => l.is_published || (isPreviewMode && (isAdmin || isModerator))).length} lessons • {posts.length} posts
                        </p>
                      </div>

                      {lessons.length === 0 ? (
                        <div className="text-center py-16 bg-muted/30 rounded-xl">
                          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                          <p className="text-muted-foreground">No lessons available yet</p>
                          <p className="text-sm text-muted-foreground mt-1">Check back soon for new content!</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {lessons
                            .filter(lesson => (isPreviewMode && (isAdmin || isModerator)) || lesson.is_published)
                            .map((lesson, lessonIndex) => {
                              const lessonPosts = getPostsForLesson(lesson.id);
                              const lessonProgress = getLessonProgress(lesson.id);
                              
                              return (
                                <Card key={lesson.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                  <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                                        lessonProgress.isComplete 
                                          ? 'bg-primary text-primary-foreground' 
                                          : 'bg-muted text-muted-foreground'
                                      }`}>
                                        {lessonProgress.isComplete ? <CheckCircle className="h-4 w-4" /> : lessonIndex + 1}
                                      </div>
                                      <div>
                                        <h4 className="font-semibold">{lesson.title}</h4>
                                        {lesson.description && (
                                          <p className="text-xs text-muted-foreground">{lesson.description}</p>
                                        )}
                                      </div>
                                      {!lesson.is_published && (
                                        <Badge variant="secondary" className="text-xs">Draft</Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {lessonProgress.totalPosts > 0 && (
                                        <div className="flex items-center gap-2">
                                          <Progress value={lessonProgress.percentage} className="w-16 h-1.5" />
                                          <span className="text-xs text-muted-foreground">
                                            {lessonProgress.completedPosts} of {lessonProgress.totalPosts} posts completed
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {lessonPosts.length > 0 ? (
                                    <div className="divide-y">
                                      {lessonPosts.map((post) => {
                                        const isCompleted = isLessonCompleted(post.id);
                                        
                                        const isActive = selectedPost?.id === post.id;
                                        
                                        return (
                                          <div 
                                            key={post.id}
                                            className={cn(
                                              "relative flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors group",
                                              isActive && "bg-primary/5",
                                              shareOpenPostId === post.id && !isActive && "bg-muted/40"
                                            )}
                                            onClick={() => handleLessonClick(post)}
                                          >
                                            {/* Accent bar */}
                                            {(isActive || shareOpenPostId === post.id) && (
                                              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r" />
                                            )}
                                            
                                            <div className="px-4 py-3 flex items-center gap-3 flex-1">
                                              {isCompleted ? (
                                                <CheckCircle className="h-4 w-4 text-primary" />
                                              ) : (
                                                <Circle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                              )}
                                              <span className={`text-sm ${isActive ? "font-medium" : ""}`}>{post.title}</span>
                                              {post.post_type && post.post_type !== 'content' && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                  {post.post_type}
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-2 pr-4">
                                              {/* Estimated Time */}
                                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                ~{formatReadingTime(post.content)}
                                              </span>
                                              
                                              {/* Copy Link */}
                                              <Tooltip>
                                                <TooltipTrigger asChild>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigator.clipboard.writeText(`${window.location.origin}/career-board/${careerSlugForPath}/course/${course?.slug}?lesson=${post.slug}`);
                                                      setCopiedPostId(post.id);
                                                      toast({ title: "Link copied!" });
                                                      setTimeout(() => setCopiedPostId(null), 2000);
                                                    }}
                                                    className={`p-1 rounded text-muted-foreground hover:text-foreground transition-opacity ${
                                                      shareOpenPostId === post.id || copiedPostId === post.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                                    }`}
                                                  >
                                                    <Link2 className="h-3.5 w-3.5" />
                                                  </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top" className="text-xs">
                                                  {copiedPostId === post.id ? "Copied" : "Copy link"}
                                                </TooltipContent>
                                              </Tooltip>
                                              
                                              {/* Share */}
                                              <LessonShareMenu
                                                postId={post.id}
                                                postTitle={post.title}
                                                postSlug={post.slug}
                                                sectionName={lesson.title}
                                                side="right"
                                                vertical
                                                onOpenChange={(isOpen) =>
                                                  setShareOpenPostId((prev) =>
                                                    isOpen ? post.id : prev === post.id ? null : prev
                                                  )
                                                }
                                              />
                                              
                                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="px-4 py-6 text-center bg-muted/20">
                                      <Lock className="h-5 w-5 mx-auto mb-2 text-muted-foreground/50" />
                                      <p className="text-sm text-muted-foreground">Content coming soon</p>
                                    </div>
                                  )}
                                </Card>
                              );
                          })}
                        </div>
                      )}
                    </TabsContent>

                    {/* Certificate Tab - Pro users only */}
                    {isPro && (
                      <TabsContent value="certificate">
                        {!courseStats.isEnrolled ? (
                          /* Not enrolled state */
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center mb-4">
                              <Award className="h-7 w-7 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Enroll to Unlock Certificate</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                              Start this course to track your progress and earn a certificate upon completion.
                            </p>
                          </div>
                        ) : (
                        <div className="space-y-6 relative">
                          {/* Locked State Overlay */}
                          {!courseProgress.isCompleted && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center">
                              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm rounded-lg" />
                              
                              <div className="relative z-20 flex flex-col items-center gap-4 text-center p-8 max-w-sm">
                                <div className="w-14 h-14 rounded-full bg-muted/80 flex items-center justify-center">
                                  <Lock className="h-7 w-7 text-muted-foreground" />
                                </div>
                                
                                <div className="w-48">
                                  <Progress 
                                    value={courseProgress.percentage} 
                                    className="h-2 bg-muted" 
                                  />
                                </div>
                                
                                <p className="text-sm text-muted-foreground">
                                  {courseProgress.percentage === 0 
                                    ? "Start the course to unlock your certificate"
                                    : `You're ${courseProgress.percentage}% there — keep going`
                                  }
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Certificate Card */}
                          <div className={cn(
                            "flex flex-col lg:flex-row gap-6 lg:gap-8 items-center",
                            !courseProgress.isCompleted && "pointer-events-none select-none"
                          )}>
                            {/* Certificate Preview */}
                            <div className="w-full max-w-md aspect-[1.4/1] rounded-lg border-4 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                              <div className="absolute inset-3 border-2 border-primary/30 rounded pointer-events-none" />
                              
                              <div className="mb-3">
                                <Award className="h-12 w-12 text-primary" />
                              </div>
                              
                              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                                Certificate of Completion
                              </p>
                              
                              <p className="text-sm text-muted-foreground mb-1">
                                This is to certify that
                              </p>
                              
                              <p className="text-lg font-bold text-foreground mb-2 line-clamp-1">
                                {user?.user_metadata?.full_name || 'Learner'}
                              </p>
                              
                              <p className="text-xs text-muted-foreground mb-1">
                                has successfully completed
                              </p>
                              
                              <p className="text-sm font-semibold text-primary line-clamp-2 mb-3">
                                {course.name}
                              </p>
                              
                              <p className="text-xs text-muted-foreground">
                                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-4 flex-1">
                              <div>
                                <h3 className="text-xl font-semibold mb-1">🎉 Your Certificate is Ready!</h3>
                                <p className="text-sm text-muted-foreground">
                                  Download your certificate or share your achievement.
                                </p>
                              </div>

                              <div className="flex flex-col gap-3">
                                {/* Download Certificate Action */}
                                <Button 
                                  onClick={() => {
                                    const lessonMap: Record<string, boolean> = {};
                                    lessonStatuses.forEach((status, id) => { lessonMap[id] = status.completed; });
                                    navigate(`/career-board/${careerSlugForPath}/course/${course.slug}/completed`, {
                                      state: {
                                        course: { id: course.id, name: course.name, slug: course.slug, description: course.description, learning_hours: course.learning_hours },
                                        lessonsCompleted: courseProgress.completedCount,
                                        completionDate: new Date().toISOString(),
                                        prefetchedPosts: posts,
                                        prefetchedLessons: lessons,
                                        prefetchedStats: {
                                          isEnrolled: courseStats.isEnrolled,
                                          enrollmentCount: courseStats.enrollmentCount,
                                          averageRating: courseStats.averageRating,
                                          reviewCount: courseStats.reviewCount,
                                          userReview: courseStats.userReview,
                                        },
                                        prefetchedLessonMap: lessonMap,
                                      },
                                    });
                                  }}
                                  className="w-full sm:w-auto"
                                  size="lg"
                                  disabled={!courseProgress.isCompleted}
                                >
                                  <Award className="h-4 w-4 mr-2" />
                                  View and Download Certificate
                                </Button>

                                {/* Share actions */}
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    const text = encodeURIComponent(
                                      `I just completed "${course.name}"! 🎉\n\nExcited to share my new skills and knowledge. #Learning #Achievement`
                                    );
                                    const url = encodeURIComponent(window.location.href);
                                    window.open(
                                      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
                                      '_blank',
                                      'width=600,height=400'
                                    );
                                  }}
                                  className="w-full sm:w-auto"
                                  size="lg"
                                  disabled={!courseProgress.isCompleted}
                                >
                                  <Linkedin className="h-4 w-4 mr-2" />
                                  Share on LinkedIn
                                </Button>
                                
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    toast({
                                      title: "Link copied!",
                                      description: "Share your achievement with others.",
                                    });
                                  }}
                                  className="w-full sm:w-auto"
                                  size="lg"
                                  disabled={!courseProgress.isCompleted}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </Button>
                                
                                {/* Review CTA */}
                                {!courseStats.userReview && courseProgress.isCompleted && (
                                  <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border text-center">
                                    <p className="text-sm text-muted-foreground mb-3">
                                      💬 Your feedback helps improve this course for others
                                    </p>
                                    <CourseReviewDialog
                                      reviews={courseReviews}
                                      averageRating={courseStats.averageRating}
                                      reviewCount={courseStats.reviewCount}
                                      userReview={courseStats.userReview}
                                      isEnrolled={courseStats.isEnrolled}
                                      isAuthenticated={!!user}
                                      onSubmitReview={submitReview}
                                      onDeleteReview={deleteReview}
                                    >
                                      <Button variant="outline" size="sm">
                                        <Star className="h-4 w-4 mr-2" />
                                        Leave a Review
                                      </Button>
                                    </CourseReviewDialog>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        )}
                      </TabsContent>
                    )}
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>
        </main>

        {/* RIGHT SIDEBAR - Learning Cockpit (Pro feature, always shown in Career Board) */}
        {selectedPost ? (
          <LearningCockpit
            lessonId={selectedPost?.id}
            lessonTitle={selectedPost?.title || ""}
            courseId={course?.id}
            courseSlug={course.slug}
            userId={user?.id || ""}
            isLessonCompleted={selectedPost ? isLessonCompleted(selectedPost.id) : false}
            isHeaderVisible={isHeaderVisible}
            showAnnouncement={showAnnouncement}
            courseProgress={courseProgress}
            certificateEligible={courseProgress.isCompleted}
            onOpenNotes={() => openNotesTab()}
            isCareerBoard={true}
            careerId={careerSlugForPath}
          />
        ) : (
          /* Course overview - show metadata sidebar */
          activeTab !== "notes" && (
            <aside className="hidden xl:block w-[300px] flex-shrink-0">
              <div className={cn(
                "sticky transition-[top] duration-200 ease-out",
                // Same offset calculation as lesson view sidebar
                isHeaderVisible
                  ? (showAnnouncement ? 'top-[9.25rem]' : 'top-28')
                  : (showAnnouncement ? 'top-[5.25rem]' : 'top-12')
              )}>
                <div className="space-y-4 p-1 pb-6">
                  <CourseMetadataSidebar
                    course={course}
                    careers={careers}
                    estimatedDuration={formatTotalReadingTime(posts)}
                    lastUpdated={posts[0]?.updated_at 
                      ? new Date(posts[0].updated_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                      : undefined
                    }
                    isAdmin={isAdmin}
                    isModerator={isModerator}
                    isHeaderVisible={isHeaderVisible}
                    showAnnouncement={showAnnouncement}
                    linkedPrerequisites={linkedPrerequisites}
                    creator={courseCreator}
                    maintenanceTeam={maintenanceTeam}
                  />
                </div>
              </div>
            </aside>
          )
        )}
      </div>

      {/* Comment Dialog */}
      {selectedPost && (
        <CommentDialog
          open={commentDialogOpen}
          onOpenChange={setCommentDialogOpen}
          comments={comments}
          user={user}
          newComment={commentContent}
          setNewComment={setCommentContent}
          onSubmitComment={handleCommentSubmit}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          submitting={submittingComment}
        />
      )}

      {/* Restart Course Confirmation Modal */}
      <AlertDialog open={restartModalOpen} onOpenChange={setRestartModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restart Course?</AlertDialogTitle>
            <AlertDialogDescription>
              Restarting will reset your progress. Your completion history will be preserved. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestartCourse} className="bg-primary hover:bg-primary/90">
              Restart Course
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </CodeEditProvider>
  );
};

export default CareerCourseDetail;
