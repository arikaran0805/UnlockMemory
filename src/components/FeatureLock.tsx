/**
 * FeatureLock Component
 * 
 * Wraps restricted UI sections. When learnerMode = FREE, shows lock overlay.
 * When learnerMode = PRO, renders children normally.
 */
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearnerMode } from "@/contexts/LearnerModeContext";
import { cn } from "@/lib/utils";

interface FeatureLockProps {
  children: React.ReactNode;
  /** Custom message to display when locked */
  message?: string;
  /** Whether to show compact inline lock instead of overlay */
  inline?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Hide the upgrade button */
  hideButton?: boolean;
}

export const FeatureLock = ({
  children,
  message = "This feature is available for Pro learners.",
  inline = false,
  className,
  hideButton = false,
}: FeatureLockProps) => {
  const { isProMode, activateProMode } = useLearnerMode();

  // PRO mode: render children normally
  if (isProMode) {
    return <>{children}</>;
  }

  // FREE mode: show lock overlay or inline indicator
  if (inline) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
        <Lock className="h-3.5 w-3.5" />
        <span className="text-sm">Pro feature</span>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blurred/disabled content preview */}
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">
        {children}
      </div>
      
      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl p-6">
        <div className="flex flex-col items-center gap-3 text-center max-w-xs">
          <div className="p-3 rounded-full bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
          {!hideButton && (
            <Button 
              size="sm" 
              onClick={activateProMode}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade to Pro
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline lock indicator for small UI elements (buttons, labels)
 */
export const LockIndicator = ({ className }: { className?: string }) => {
  return (
    <span className={cn("inline-flex items-center gap-1 text-muted-foreground text-xs", className)}>
      <Lock className="h-3 w-3" />
      Pro
    </span>
  );
};

export default FeatureLock;
