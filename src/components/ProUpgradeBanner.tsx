/**
 * ProUpgradeBanner
 * 
 * Promotional banner shown to FREE learners encouraging upgrade to PRO.
 * Integrates seamlessly with page design.
 */
import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLearnerMode } from "@/contexts/LearnerModeContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ProUpgradeBannerProps {
  className?: string;
  /** Variant: 'full' for page-wide, 'compact' for smaller sections */
  variant?: "full" | "compact";
  /** Allow dismissing the banner temporarily */
  dismissible?: boolean;
}

const benefits = [
  "Customize courses",
  "Unlock full career bundles",
  "Interview preparation",
  "Certificates",
];

export const ProUpgradeBanner = ({
  className,
  variant = "full",
  dismissible = false,
}: ProUpgradeBannerProps) => {
  const { isProMode, activateProMode } = useLearnerMode();
  const [dismissed, setDismissed] = useState(false);

  // Don't show for PRO users or if dismissed
  if (isProMode || dismissed) {
    return null;
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-3 rounded-xl",
          "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20",
          className
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-foreground font-medium truncate">
            Upgrade to Pro for full customization
          </p>
        </div>
        <Button size="sm" onClick={activateProMode} className="shrink-0 gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "bg-gradient-to-br from-primary/5 via-primary/10 to-accent/10",
        "border border-primary/20",
        "p-6 sm:p-8",
        className
      )}
    >
      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Icon */}
        <div className="shrink-0">
          <div className="p-4 rounded-2xl bg-primary/10 w-fit">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Upgrade to Pro Learner
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unlock premium features and accelerate your learning journey.
            </p>
          </div>

          {/* Benefits */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-1.5 text-sm text-foreground">
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="shrink-0">
          <Button onClick={activateProMode} size="lg" className="gap-2 w-full sm:w-auto">
            <Sparkles className="h-4 w-4" />
            Upgrade to Pro
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProUpgradeBanner;
