/**
 * LearnerModeBadge
 * 
 * Small badge for navbar showing current learner mode (FREE or PRO)
 */
import { Star, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLearnerMode } from "@/contexts/LearnerModeContext";
import { cn } from "@/lib/utils";

interface LearnerModeBadgeProps {
  className?: string;
  /** Show compact version (icon only) */
  compact?: boolean;
}

export const LearnerModeBadge = ({ className, compact = false }: LearnerModeBadgeProps) => {
  const { isProMode, toggleMode } = useLearnerMode();

  if (isProMode) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "cursor-pointer border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors gap-1",
          compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
          className
        )}
        onClick={toggleMode}
      >
        <Star className="h-3 w-3 fill-current" />
        {!compact && <span className="text-[10px] font-semibold">Pro Learner</span>}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer border-border bg-muted/50 text-muted-foreground hover:bg-muted transition-colors gap-1",
        compact ? "px-1.5 py-0.5" : "px-2 py-0.5",
        className
      )}
      onClick={toggleMode}
    >
      <User className="h-3 w-3" />
      {!compact && <span className="text-[10px] font-medium">Free Learner</span>}
    </Badge>
  );
};

export default LearnerModeBadge;
