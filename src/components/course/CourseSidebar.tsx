import { useState, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronDown,
  CheckCircle,
  Circle,
  BookOpen,
  Home,
  Search,
  X,
  Link2,
  Dumbbell,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import LessonShareMenu from "@/components/LessonShareMenu";

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
  lesson_id: string | null;
  status: string;
}

interface LessonProgress {
  totalPosts: number;
  completedPosts: number;
  percentage: number;
  isComplete: boolean;
}

interface CourseProgressData {
  percentage: number;
  completedCount: number;
  totalCount: number;
  hasStarted: boolean;
  isCompleted: boolean;
}

interface CourseSidebarProps {
  lessons: CourseLesson[];
  posts: Post[];
  selectedPost: Post | null;
  expandedLessons: Set<string>;
  courseProgress: CourseProgressData;
  isPreviewMode: boolean;
  canPreview: boolean;
  hasPreviewBanner?: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  isAuthenticated: boolean;
  /** Whether lessons/progress data is still loading (fast-path navigation) */
  isLoading?: boolean;
  /** Whether this sidebar is in the Career Board shell (different header heights) */
  isCareerBoard?: boolean;
  /** Practice skill slug for linking to problems */
  practiceSkillSlug?: string | null;
  /** Map of lessonId -> problem count */
  lessonProblemCounts?: Map<string, number>;
  /** Map of lessonId -> all problems completed */
  lessonProblemsCompleted?: Map<string, boolean>;
  getPostsForLesson: (lessonId: string) => Post[];
  getLessonProgress: (lessonId: string) => LessonProgress;
  isLessonCompleted: (postId: string) => boolean;
  toggleLessonExpansion: (lessonId: string) => void;
  handleLessonClick: (post: Post) => void;
  handleHomeClick: () => void;
  /** When provided, "Practice Problems" opens focus mode instead of navigating away */
  onOpenPracticeFocus?: (lessonId: string) => void;
  /** When provided, clicking Practice Problems will trigger this instead of navigating */
  onPracticeLockedClick?: () => void;
}

export const CourseSidebar = memo(({
  lessons,
  posts,
  selectedPost,
  expandedLessons,
  courseProgress,
  isPreviewMode,
  canPreview,
  hasPreviewBanner = false,
  isHeaderVisible,
  showAnnouncement,
  isAuthenticated,
  isLoading = false,
  isCareerBoard = false,
  practiceSkillSlug,
  lessonProblemCounts,
  lessonProblemsCompleted,
  getPostsForLesson,
  getLessonProgress,
  isLessonCompleted,
  toggleLessonExpansion,
  handleLessonClick,
  handleHomeClick,
  onOpenPracticeFocus,
  onPracticeLockedClick,
}: CourseSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [shareOpenPostId, setShareOpenPostId] = useState<string | null>(null);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  // Get the currently expanded lesson ID (single-open accordion)
  const expandedLessonId = useMemo(() => {
    const expandedArray = Array.from(expandedLessons);
    return expandedArray.length > 0 ? expandedArray[0] : null;
  }, [expandedLessons]);

  // Filter lessons based on search query
  const filteredLessons = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return lessons.filter(lesson => isPreviewMode || lesson.is_published);
    }

    return lessons
      .filter(lesson => isPreviewMode || lesson.is_published)
      .filter(lesson => {
        const lessonMatches =
          lesson.title.toLowerCase().includes(query) ||
          (lesson.description?.toLowerCase().includes(query) ?? false);

        const lessonPosts = getPostsForLesson(lesson.id);
        const hasMatchingPosts = lessonPosts.some(post =>
          post.title.toLowerCase().includes(query) ||
          (post.excerpt?.toLowerCase().includes(query) ?? false)
        );

        return lessonMatches || hasMatchingPosts;
      });
  }, [lessons, searchQuery, isPreviewMode, getPostsForLesson]);

  const expandedLessonIndex = useMemo(() => {
    if (!expandedLessonId || searchQuery) return -1;
    return filteredLessons.findIndex(l => l.id === expandedLessonId);
  }, [filteredLessons, expandedLessonId, searchQuery]);

  const getFilteredPostsForLesson = useCallback((lessonId: string) => {
    const allPosts = getPostsForLesson(lessonId);
    const query = searchQuery.toLowerCase().trim();

    if (!query) return allPosts;

    const lesson = lessons.find(l => l.id === lessonId);
    const lessonMatches = lesson && (
      lesson.title.toLowerCase().includes(query) ||
      (lesson.description?.toLowerCase().includes(query) ?? false)
    );

    if (lessonMatches) return allPosts;

    return allPosts.filter(post =>
      post.title.toLowerCase().includes(query) ||
      (post.excerpt?.toLowerCase().includes(query) ?? false)
    );
  }, [getPostsForLesson, lessons, searchQuery]);

  // Sticky top position (unchanged logic)
  const stickyTopClass = isPreviewMode && canPreview && hasPreviewBanner
    ? isHeaderVisible
      ? (showAnnouncement ? 'top-[10.5rem]' : 'top-[8.5rem]')
      : (showAnnouncement ? 'top-[7.25rem]' : 'top-20')
    : isCareerBoard
      ? isHeaderVisible
        ? (showAnnouncement ? 'top-[9.25rem]' : 'top-28')
        : (showAnnouncement ? 'top-[5.25rem]' : 'top-12')
      : isHeaderVisible
        ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
        : (showAnnouncement ? 'top-[4.75rem]' : 'top-10');

  const noResults = searchQuery && filteredLessons.length === 0;

  const heightOffset = isPreviewMode && canPreview && hasPreviewBanner
    ? isHeaderVisible
      ? (showAnnouncement ? '10.5rem' : '8.5rem')
      : (showAnnouncement ? '7.25rem' : '5rem')
    : isCareerBoard
      ? isHeaderVisible
        ? (showAnnouncement ? '9.25rem' : '7rem')
        : (showAnnouncement ? '5.25rem' : '3rem')
      : isHeaderVisible
        ? (showAnnouncement ? '8.75rem' : '6.5rem')
        : (showAnnouncement ? '4.75rem' : '2.5rem');

  return (
    <aside className="lg:w-[280px] bg-sidebar border-r border-sidebar-border flex-shrink-0">
      <div className={cn("sticky transition-[top] duration-200 ease-out", stickyTopClass)} style={{ height: `calc(100vh - ${heightOffset})` }}>

        {/* ═══ SECTION 1: HEADER — VS Code panel header ═══ */}
        <div className="flex items-center justify-between h-[34px] px-2 border-b border-sidebar-border/70 flex-shrink-0 bg-sidebar-accent/25 select-none">
          <h2 className="text-[11px] font-semibold text-muted-foreground/50 tracking-[0.09em] uppercase leading-none pl-1">
            {isAuthenticated ? "Course Progress" : "Course Outline"}
          </h2>

          <div className="flex items-center gap-0.5">
            {/* Search toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setIsSearchFocused(!isSearchFocused);
                    if (isSearchFocused) setSearchQuery("");
                  }}
                  className={cn(
                    "h-[26px] w-[26px] flex items-center justify-center rounded-[3px] transition-all duration-150",
                    isSearchFocused
                      ? "text-sidebar-primary bg-sidebar-accent"
                      : "text-muted-foreground/45 hover:text-foreground hover:bg-sidebar-accent"
                  )}
                  aria-label="Search lessons"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Search lessons</TooltipContent>
            </Tooltip>

            {/* Home — authenticated only */}
            {isAuthenticated && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleHomeClick}
                    className="h-[26px] w-[26px] flex items-center justify-center rounded-[3px] text-muted-foreground/45 hover:text-foreground hover:bg-sidebar-accent transition-all duration-150"
                    aria-label="Go to course home"
                  >
                    <Home className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Course home</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ═══ SECTION 2: SEARCH (collapsible) ═══ */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-in-out",
            isSearchFocused ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-2 py-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search lessons…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full h-[32px] pl-8 pr-7 text-[13px] rounded-[3px]",
                  "bg-background border border-sidebar-border",
                  "placeholder:text-muted-foreground/40",
                  "transition-colors duration-150",
                  "focus:outline-none focus:border-sidebar-primary/50"
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-[2px] text-muted-foreground/50 hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <div className="h-px bg-sidebar-border/60" />
        </div>

        {/* ═══ SECTION 3: PROGRESS ═══ */}
        {isAuthenticated ? (
          <>
            <div className="px-3 pt-2.5 pb-2.5">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-2.5 w-20 rounded-[2px]" />
                    <Skeleton className="h-3 w-8 rounded-[2px]" />
                  </div>
                  <Skeleton className="h-[2px] w-full rounded-none" />
                  <Skeleton className="h-2.5 w-28 rounded-[2px]" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Stats row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-muted-foreground/60 tabular-nums font-mono">
                      {courseProgress.percentage > 0
                        ? `${courseProgress.completedCount}/${courseProgress.totalCount} lessons`
                        : `${courseProgress.totalCount} lesson${courseProgress.totalCount !== 1 ? "s" : ""}`}
                    </span>
                    <span className={cn(
                      "text-[13px] font-bold leading-none tabular-nums font-mono",
                      courseProgress.percentage === 0
                        ? "text-muted-foreground/35"
                        : "text-sidebar-primary"
                    )}>
                      {courseProgress.percentage}%
                    </span>
                  </div>

                  {/* Progress bar — thin flat line, tool style */}
                  <div className="h-[2px] w-full bg-sidebar-border/80 rounded-none overflow-hidden">
                    <div
                      className="h-full bg-sidebar-primary transition-all duration-700 ease-out"
                      style={{ width: `${courseProgress.percentage}%` }}
                      aria-label={`Course progress: ${courseProgress.percentage}%`}
                    />
                  </div>

                </div>
              )}
            </div>
            <div className="h-px bg-sidebar-border/60" />
          </>
        ) : (
          /* Guest sign-in prompt */
          <div className="px-4 py-3">
            <p className="text-[12px] text-muted-foreground/65">
              <a
                href={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="text-sidebar-primary hover:underline"
              >
                Sign in
              </a>{" "}
              to track your progress
            </p>
          </div>
        )}

        {/* ═══ SECTION 4: LESSON TREE ═══ */}
        <ScrollArea className="flex-1 h-[calc(100%-16rem)]">
          <nav className="py-1" aria-label="Course lessons" role="region">

            {noResults ? (
              /* No search results */
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Search className="h-6 w-6 text-muted-foreground/25 mb-2.5" />
                <p className="text-[12px] text-muted-foreground/60">No lessons found</p>
                <p className="text-[11px] text-muted-foreground/40 mt-1">Try a different keyword</p>
              </div>

            ) : filteredLessons.length > 0 ? (
              <div role="group" aria-label="Lesson modules">
                {filteredLessons.map((lesson, index) => {
                  const lessonPosts   = getFilteredPostsForLesson(lesson.id);
                  const isExpanded    = expandedLessons.has(lesson.id);
                  const hasActivePost = lessonPosts.some(p => p.id === selectedPost?.id);
                  const lessonProgress = getLessonProgress(lesson.id);
                  const panelId  = `lesson-panel-${lesson.id}`;
                  const headerId = `lesson-header-${lesson.id}`;

                  const isAboveExpanded = expandedLessonIndex !== -1 && index < expandedLessonIndex;
                  const isTheExpanded   = lesson.id === expandedLessonId;

                  return (
                    <div
                      key={lesson.id}
                      className={cn(
                        "transition-all duration-300 ease-out overflow-hidden",
                        isAboveExpanded
                          ? "max-h-0 opacity-0 mb-0"
                          : "max-h-[500px] opacity-100",
                        isTheExpanded && "relative z-10"
                      )}
                      role="presentation"
                    >
                      {/* ── Module accordion trigger — VS Code section row ── */}
                      <button
                        id={headerId}
                        onClick={() => toggleLessonExpansion(lesson.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleLessonExpansion(lesson.id);
                          }
                        }}
                        className={cn(
                          "w-full rounded-xl transition-all duration-200 text-left relative overflow-hidden",
                          "focus:outline-none focus:ring-2 focus:ring-sidebar-ring/40",
                          hasActivePost
                            ? "bg-sidebar-accent/80"
                            : "hover:bg-sidebar-accent/60"
                        )}
                        aria-expanded={isExpanded}
                        aria-controls={panelId}
                      >
                        {/* Left accent bar — centred on active module */}
                        {hasActivePost && (
                          <div className="absolute left-0 top-[20%] bottom-[20%] w-[2.5px] bg-sidebar-primary/55 rounded-r" />
                        )}

                        <div className="pl-3 pr-2 py-[7px] flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Chevron — tree disclosure */}
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 text-muted-foreground/50 transition-transform duration-150 flex-shrink-0",
                                !isExpanded && "-rotate-90"
                              )}
                            />
                            {/* Module status icon */}
                            {isAuthenticated ? (
                              lessonProgress.isComplete ? (
                                <CheckCircle className="h-3.5 w-3.5 text-sidebar-primary flex-shrink-0" />
                              ) : lessonProgress.completedPosts > 0 ? (
                                <div className="h-3.5 w-3.5 rounded-full border-[1.5px] border-sidebar-primary flex items-center justify-center flex-shrink-0">
                                  <div className="h-1 w-1 rounded-full bg-sidebar-primary/60" />
                                </div>
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-muted-foreground/35 flex-shrink-0" />
                              )
                            ) : (
                              <BookOpen className="h-3.5 w-3.5 text-muted-foreground/35 flex-shrink-0" />
                            )}
                            <span className="text-[14px] font-medium text-sidebar-foreground/90 truncate leading-normal">
                              {lesson.title}
                            </span>
                          </div>

                          {/* Module progress count */}
                          {isAuthenticated && lessonProgress.totalPosts > 0 && (
                            <span className="text-[11px] font-medium text-muted-foreground/40 tabular-nums font-mono flex-shrink-0 ml-2">
                              {lessonProgress.completedPosts}/{lessonProgress.totalPosts}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* ── Lesson posts — flat compact list ── */}
                      {isExpanded && (
                        <div
                          id={panelId}
                          role="region"
                          aria-labelledby={headerId}
                          className={cn(
                            "ml-[39px] mt-0.5 border-l pl-1 pb-1",
                            hasActivePost ? "border-sidebar-primary/30" : "border-border/50"
                          )}
                        >
                          {lessonPosts.length > 0 ? (
                            lessonPosts.map((post) => {
                              const isActive    = selectedPost?.id === post.id;
                              const isCompleted = isLessonCompleted(post.id);

                              return (
                                <button
                                  key={post.id}
                                  onClick={() => handleLessonClick(post)}
                                  className={cn(
                                    "w-full rounded-xl transition-all duration-200 text-left group/lesson relative",
                                    "focus:outline-none focus:ring-2 focus:ring-sidebar-ring/40",
                                    isActive
                                      ? "bg-sidebar-primary/[0.17] ring-1 ring-inset ring-sidebar-primary/[0.14]"
                                      : shareOpenPostId === post.id
                                        ? "bg-sidebar-accent/70"
                                        : "hover:bg-sidebar-accent/60"
                                  )}
                                >
                                  {/* Share-open accent bar */}
                                  {shareOpenPostId === post.id && !isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-sidebar-primary rounded-r" />
                                  )}

                                  <div className="pl-2 pr-2 py-[6px] flex items-center gap-2">
                                    {/* Completion status */}
                                    {isAuthenticated ? (
                                      isCompleted ? (
                                        <CheckCircle className="h-3 w-3 flex-shrink-0 text-sidebar-primary" />
                                      ) : (
                                        <Circle className={cn(
                                          "h-3 w-3 flex-shrink-0",
                                          isActive ? "text-sidebar-primary/50" : "text-muted-foreground/25"
                                        )} />
                                      )
                                    ) : null}

                                    <span className={cn(
                                      "text-[14px] flex-1 truncate transition-colors leading-normal",
                                      isActive
                                        ? "text-sidebar-primary font-medium"
                                        : "text-sidebar-foreground/80 group-hover/lesson:text-sidebar-foreground"
                                    )}>
                                      {post.title}
                                    </span>

                                    {/* Hover actions */}
                                    {isAuthenticated && (
                                      <div className={cn(
                                        "flex items-center gap-1 transition-opacity duration-150",
                                        isActive || shareOpenPostId === post.id
                                          ? "opacity-100"
                                          : "opacity-0 group-hover/lesson:opacity-100"
                                      )}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigator.clipboard.writeText(`${window.location.origin}/courses/${post.slug}`);
                                                setCopiedPostId(post.id);
                                                toast.success("Link copied!");
                                                setTimeout(() => setCopiedPostId(null), 2000);
                                              }}
                                              className="p-0.5 rounded-[2px] text-muted-foreground/50 hover:text-foreground transition-colors"
                                            >
                                              <Link2 className="h-2.5 w-2.5" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="text-xs">
                                            {copiedPostId === post.id ? "Copied!" : "Copy link"}
                                          </TooltipContent>
                                        </Tooltip>

                                        <LessonShareMenu
                                          postId={post.id}
                                          postTitle={post.title}
                                          postSlug={post.slug}
                                          sectionName={lesson.title}
                                          alwaysVisible
                                          side="right"
                                          vertical
                                          onOpenChange={(isOpen) =>
                                            setShareOpenPostId((prev) =>
                                              isOpen ? post.id : prev === post.id ? null : prev
                                            )
                                          }
                                          sidebarVariant
                                          isActive={false}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="pl-4 py-2 text-[11px] text-muted-foreground/40 italic">
                              Content coming soon…
                            </div>
                          )}

                          {/* Practice problems — focus mode in career board, link elsewhere */}
                          {practiceSkillSlug ? (
                            onPracticeLockedClick ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPracticeLockedClick();
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 pl-3 pr-2 py-[5px]",
                                  "text-[11.5px] font-medium text-left",
                                  "text-muted-foreground hover:bg-sidebar-accent/40",
                                  "transition-colors duration-100"
                                )}
                              >
                                <Dumbbell className="h-3 w-3 flex-shrink-0 opacity-50" />
                                <span>Practice Problems</span>
                                <Lock className="h-2.5 w-2.5 text-muted-foreground/60 ml-auto" />
                              </button>
                            ) : onOpenPracticeFocus ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenPracticeFocus(lesson.id);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 pl-3 pr-2 py-[5px]",
                                  "text-[11.5px] font-medium text-left",
                                  "text-sidebar-primary/60 hover:text-sidebar-primary hover:bg-sidebar-accent/40",
                                  "transition-colors duration-100"
                                )}
                              >
                                {isAuthenticated && lessonProblemsCompleted?.get(lesson.id) ? (
                                  <CheckCircle className="h-3 w-3 text-sidebar-primary flex-shrink-0" />
                                ) : (
                                  <Dumbbell className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span>Practice Problems</span>
                              </button>
                            ) : (
                              <Link
                                to={lessonProblemCounts?.get(lesson.id)
                                  ? `/practice/${practiceSkillSlug}/lesson/${lesson.id}`
                                  : `/practice/${practiceSkillSlug}`
                                }
                                className={cn(
                                  "flex items-center gap-2 pl-3 pr-2 py-[5px]",
                                  "text-[11.5px] font-medium",
                                  "text-sidebar-primary/60 hover:text-sidebar-primary hover:bg-sidebar-accent/40",
                                  "transition-colors duration-100"
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isAuthenticated && lessonProblemsCompleted?.get(lesson.id) ? (
                                  <CheckCircle className="h-3 w-3 text-sidebar-primary flex-shrink-0" />
                                ) : (
                                  <Dumbbell className="h-3 w-3 flex-shrink-0" />
                                )}
                                <span>Practice Problems</span>
                              </Link>
                            )
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            ) : isLoading ? (
              /* Loading skeleton */
              <div className="space-y-0.5 py-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-2 px-3 py-[7px]">
                    <Skeleton className="h-3 w-3 rounded-full flex-shrink-0" />
                    <Skeleton className="h-2.5 flex-1 rounded-[2px]" />
                  </div>
                ))}
              </div>

            ) : (
              /* No lessons */
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <BookOpen className="h-6 w-6 text-muted-foreground/25 mb-2.5" />
                <p className="text-[12px] text-muted-foreground/60">No lessons yet</p>
              </div>
            )}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
});

export default CourseSidebar;
