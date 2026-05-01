import { useState, useEffect } from "react";
import { Rocket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NUDGE_SHOWN_PREFIX = "completion_nudge_shown_";

interface CompletionNudgeProps {
  courseId: string;
  progressPercentage: number;
  className?: string;
  onUpgrade?: () => void;
}

/**
 * Smart trigger nudge shown when learner completes 40-60% of course
 * Only shown once per course
 */
export const CompletionNudge = ({ 
  courseId, 
  progressPercentage,
  className = "",
  onUpgrade,
}: CompletionNudgeProps) => {
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = `${NUDGE_SHOWN_PREFIX}${courseId}`;

  useEffect(() => {
    // Check if already shown for this course
    const shown = localStorage.getItem(storageKey) === "true";
    setHasBeenShown(shown);
  }, [storageKey]);

  // Check if within trigger range (40-60%)
  const shouldShow = progressPercentage >= 40 && progressPercentage <= 60;

  // Mark as shown when displayed
  useEffect(() => {
    if (shouldShow && !hasBeenShown && !dismissed) {
      localStorage.setItem(storageKey, "true");
    }
  }, [shouldShow, hasBeenShown, dismissed, storageKey]);

  // Don't show if already shown before, dismissed, or outside range
  if (hasBeenShown || dismissed || !shouldShow) {
    return null;
  }

  return (
    <div className={`bg-muted/50 border border-border/50 rounded-lg px-4 py-3 ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Rocket className="h-5 w-5 text-primary flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              You're halfway there! 🚀
            </p>
            <p className="text-xs text-muted-foreground">
              Unlock Pro to access notes, practice, and your certificate.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex-shrink-0 border-border/60 hover:bg-muted/70"
          onClick={() => {
            setDismissed(true);
            onUpgrade?.();
          }}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Unlock Pro
        </Button>
      </div>
    </div>
  );
};

export default CompletionNudge;
