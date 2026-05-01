/**
 * NonCareerCourseNudge
 * 
 * Shows a subtle, non-blocking nudge to Pro learners when they're viewing
 * a course outside their active purchased career (where ads are visible).
 * 
 * - Shows ONCE per session
 * - No modal, no blocking UI
 * - Low-priority, muted design
 */
import { useState, useEffect } from "react";
import { X, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NUDGE_SESSION_KEY = "lovable_non_career_nudge_shown";

interface NonCareerCourseNudgeProps {
  /** User's active career name for context */
  activeCareerName?: string;
  /** Optional CTA to switch to career track */
  onSwitchToCareer?: () => void;
  /** Additional class names */
  className?: string;
}

export const NonCareerCourseNudge = ({
  activeCareerName,
  onSwitchToCareer,
  className,
}: NonCareerCourseNudgeProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if already shown this session
    const hasShown = sessionStorage.getItem(NUDGE_SESSION_KEY);
    if (!hasShown) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem(NUDGE_SESSION_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "relative bg-muted/50 border border-border/50 rounded-lg p-4 text-sm",
        "animate-in fade-in-0 slide-in-from-top-2 duration-300",
        className
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex-shrink-0 p-1.5 rounded-md bg-muted text-muted-foreground">
          <Compass className="h-4 w-4" />
        </div>
        <div className="space-y-1.5">
          <p className="text-muted-foreground leading-relaxed">
            Your career track stays distraction-free.{" "}
            <span className="text-foreground/80">
              This course is outside your active career.
            </span>
          </p>
          {onSwitchToCareer && activeCareerName && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-primary hover:text-primary/80"
              onClick={() => {
                handleDismiss();
                onSwitchToCareer();
              }}
            >
              Switch to {activeCareerName}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NonCareerCourseNudge;
