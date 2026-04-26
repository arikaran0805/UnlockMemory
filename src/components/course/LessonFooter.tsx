import { useState, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ShareTooltip from "@/components/ShareTooltip";
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
                  className="text-[12.5px] font-medium text-primary/90 bg-primary/[0.08] px-3 py-1 rounded-full hover:bg-primary/[0.15] hover:text-primary transition-colors whitespace-nowrap"
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
            <div className="text-left min-w-0">
              <div className="text-xs text-muted-foreground">Previous</div>
              <div className="font-medium truncate">{previousLesson.title}</div>
            </div>
          </Button>
        ) : (
          <div className="flex-1 max-w-xs" />
        )}

        {/* Next Button OR Finish Course Button */}
        {isCourseComplete && isCompleted && !nextLesson ? (
          /* ALL lessons completed - Show "Finish Course" CTA */
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
            <div className="text-right min-w-0">
              <div className="text-xs opacity-80">🎉 Complete</div>
              <div className="font-medium">Finish Course</div>
            </div>
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
