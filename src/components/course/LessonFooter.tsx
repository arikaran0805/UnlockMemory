import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ShareTooltip from "@/components/ShareTooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Share2,
  ThumbsUp,
  Lightbulb,
  Tag,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LessonFooterProps {
  // Completion state
  isCompleted: boolean;
  isMarkingComplete: boolean;
  onMarkComplete: () => Promise<void>;
  canComplete: boolean; // User is logged in
  isGuest: boolean; // User is not authenticated
  
  // Progress info (based on COMPLETED lessons, not position)
  completedLessonsCount: number;
  totalLessons: number;
  courseProgressPercentage: number;
  
  // Course completion state (ALL lessons completed)
  isCourseComplete: boolean;
  courseId: string;
  
  // Career Board context - if provided, navigates within career shell
  careerSlug?: string;
  courseSlug?: string;
  
  // Tags
  tags: Array<{ id: string; name: string; slug: string }>;
  
  // Action handlers
  onCommentClick: () => void;
  onSuggestChangesClick?: () => void;
  onLikeClick: () => void;
  likeCount: number;
  hasLiked: boolean;
  isLiking: boolean;
  commentCount: number;
  
  // Share props
  shareTitle: string;
  shareUrl: string;
  postId?: string;
  
  // Navigation
  previousLesson?: { title: string } | null;
  nextLesson?: { title: string } | null;
  onPrevious: () => void;
  onNext: () => void;
  onFinishCourse?: () => void;
}

const LessonFooter = ({
  isCompleted,
  isMarkingComplete,
  onMarkComplete,
  canComplete,
  isGuest,
  completedLessonsCount,
  totalLessons,
  courseProgressPercentage,
  isCourseComplete,
  courseId,
  careerSlug,
  courseSlug,
  tags,
  onCommentClick,
  onSuggestChangesClick,
  onLikeClick,
  likeCount,
  hasLiked,
  isLiking,
  commentCount,
  shareTitle,
  shareUrl,
  postId,
  previousLesson,
  nextLesson,
  onPrevious,
  onNext,
  onFinishCourse,
}: LessonFooterProps) => {
  const navigate = useNavigate();
  const [justCompleted, setJustCompleted] = useState(false);

  const handleGoogleSignIn = useCallback(async () => {
    const redirectTo = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }, []);

  const handleMarkComplete = useCallback(async () => {
    // Only allow marking complete, not unmarking
    if (isCompleted) return;
    
    await onMarkComplete();
    setJustCompleted(true);
    // Reset animation state after a short delay
    setTimeout(() => setJustCompleted(false), 2000);
  }, [isCompleted, onMarkComplete]);

  // Progress text for completed state - based on COMPLETED lessons count
  const progressText = useMemo(() => {
    return `${completedLessonsCount} of ${totalLessons} lessons completed • ${courseProgressPercentage}% of course done`;
  }, [completedLessonsCount, totalLessons, courseProgressPercentage]);

  return (
    <div className="mt-8 space-y-0">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 1. COMPLETION CTA OR STATUS (TOP) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {canComplete && (
        <div className="flex flex-col items-center justify-center py-6">
          {!isCompleted ? (
            /* STATE A: Before Completion */
            <Button
              size="lg"
              className={cn(
                "gap-2 px-8 py-5 text-base font-semibold rounded-2xl",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "transition-all duration-200"
              )}
              disabled={isMarkingComplete}
              onClick={handleMarkComplete}
            >
              {isMarkingComplete ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Circle className="h-5 w-5" />
                  Mark Lesson as Complete
                </>
              )}
            </Button>
          ) : (
            /* STATE B: After Completion - Non-interactive status display */
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-2 px-6 py-3 text-[15px] font-semibold rounded-xl",
                  "border border-primary/70 text-primary",
                  "transition-all duration-200",
                  justCompleted && "animate-scale-in"
                )}
              >
                <CheckCircle className={cn(
                  "h-5 w-5",
                  justCompleted && "animate-[pulse_0.5s_ease-in-out]"
                )} />
                Lesson Completed
              </div>
              <p className="text-sm text-muted-foreground">
                You're making great progress
              </p>
              <p className="text-xs text-muted-foreground/70">
                {progressText}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 1b. GUEST SIGN-IN BAR                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isGuest && (
        <div className="flex items-center gap-4 py-5">
          {/* Progress track — shows a tiny green start-cap to suggest progress is waiting */}
          <div className="flex-1 h-[5px] bg-muted/50 rounded-full overflow-hidden min-w-0 hidden sm:block">
            <div className="h-full w-10 bg-primary rounded-full" />
          </div>

          {/* Sign-in prompt */}
          <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
            <span className="text-sm whitespace-nowrap select-none">
              <button
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
                className="text-primary font-semibold hover:underline underline-offset-2 transition-opacity hover:opacity-80"
              >
                Sign in
              </button>
              <span className="text-muted-foreground"> to track your progress</span>
            </span>

            <div className="w-px h-4 bg-border flex-shrink-0" />

            {/* OAuth icon buttons */}
            <div className="flex items-center gap-2">
              {/* Google */}
              <button
                onClick={handleGoogleSignIn}
                aria-label="Sign in with Google"
                className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-all duration-150 hover:scale-105"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </button>

              {/* GitHub */}
              <button
                onClick={() => navigate("/login")}
                aria-label="Sign in with GitHub"
                className="h-8 w-8 rounded-full flex items-center justify-center bg-[#24292e] hover:bg-[#1b1f23] transition-all duration-150 hover:scale-105"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 2. SEPARATOR LINE */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <Separator className="my-4" />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 3. METADATA ROW (Tags + Icons) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center justify-between gap-4 py-4">
        {/* Tags on left */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {tags.length > 0 ? (
            <>
              <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                <Tag className="h-4 w-4" />
                <span className="text-base font-medium">Tags:</span>
              </div>
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/tag/${tag.slug}`}
                  className="text-[12.5px] font-medium text-foreground/70 bg-muted/60 border border-border/40 px-3 py-1 rounded-full hover:bg-muted hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {tag.name}
                </Link>
              ))}
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No tags</div>
          )}
        </div>
        
        {/* Action icons on right */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <TooltipProvider>
            {/* Comment - Always visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={onCommentClick}
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{commentCount} comments</p>
              </TooltipContent>
            </Tooltip>

            {/* Share - Always visible */}
            <ShareTooltip
              title={shareTitle}
              url={shareUrl}
              postId={postId}
            >
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Share2 className="h-5 w-5" />
              </Button>
            </ShareTooltip>

            {/* Like - Always visible for guests, visible after completion for logged-in users */}
            {(isGuest || isCompleted) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={onLikeClick}
                    disabled={isLiking}
                  >
                    <ThumbsUp className={cn(
                      "h-5 w-5",
                      hasLiked && "fill-current text-primary"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hasLiked ? 'Unlike' : 'Like'} ({likeCount})</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Suggest Changes - Only for logged-in users after completion */}
            {!isGuest && isCompleted && onSuggestChangesClick && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={onSuggestChangesClick}
                  >
                    <Lightbulb className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Suggest Changes</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 4. NAVIGATION ROW (Previous / Next / Finish Course) */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex items-center justify-between gap-4 pt-4">
        {/* Previous Button */}
        {previousLesson ? (
          <Button
            variant="outline"
            size="lg"
            className="gap-2 flex-1 max-w-xs rounded-xl"
            onClick={onPrevious}
          >
            <ChevronLeft className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium truncate min-w-0">
              Previous: {previousLesson.title}
            </span>
          </Button>
        ) : (
          <div className="flex-1 max-w-xs" />
        )}

        {/* Next Button OR Finish Course Button */}
        {isCompleted && !nextLesson ? (
          /* Last lesson completed - Show "Finish Course" CTA */
          <Button
            size="lg"
            variant="default"
            className={cn(
              "gap-2 flex-1 max-w-xs rounded-xl",
              "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
            onClick={() => {
              if (onFinishCourse) {
                onFinishCourse();
              } else if (careerSlug && courseSlug) {
                navigate(`/career-board/${careerSlug}/course/${courseSlug}/completed`);
              }
            }}
          >
            <span className="font-medium whitespace-nowrap">Completed - Finish Course</span>
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          </Button>
        ) : nextLesson ? (
          /* Has next lesson - Show regular navigation */
          <Button
            size="lg"
            variant={isCompleted ? "default" : "outline"}
            className={cn(
              "gap-2 flex-1 max-w-xs rounded-xl",
              isCompleted 
                ? "bg-primary hover:bg-primary/90 text-primary-foreground" 
                : "border-border"
            )}
            onClick={onNext}
          >
            <span className="font-medium truncate min-w-0">
              {isCompleted ? `Continue: ${nextLesson.title}` : nextLesson.title}
            </span>
            <ChevronRight className="h-5 w-5 flex-shrink-0" />
          </Button>
        ) : (
          /* No next lesson and not marked as last - empty space */
          <div className="flex-1 max-w-xs" />
        )}
      </div>
    </div>
  );
};

export default LessonFooter;
