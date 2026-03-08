import { GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface CertificateTeaserProps {
  variant: "guest" | "learner";
  className?: string;
  onLearnMore?: () => void;
  onUpgrade?: () => void;
}

/**
 * Certificate teaser shown at end of lesson content
 * Guest: Encourages sign-in with "Learn more"
 * Learner: Encourages Pro upgrade
 */
export const CertificateTeaser = ({ 
  variant, 
  className = "",
  onLearnMore,
  onUpgrade,
}: CertificateTeaserProps) => {
  if (variant === "guest") {
    return (
      <Card className={`border-border/50 bg-muted/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">
                Complete this course to earn a certificate
              </p>
              <p className="text-xs text-muted-foreground">
                Available for Pro learners
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-shrink-0"
              onClick={onLearnMore}
            >
              Learn more
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Learner variant - locked state
  return (
    <Card className={`border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <GraduationCap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1">
              🎓 Certificate locked
            </p>
            <p className="text-xs text-muted-foreground">
              Upgrade to Pro to earn and download your certificate.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-shrink-0 border-amber-500/30 hover:bg-amber-500/10"
            onClick={onUpgrade}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Upgrade to Pro
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CertificateTeaser;
