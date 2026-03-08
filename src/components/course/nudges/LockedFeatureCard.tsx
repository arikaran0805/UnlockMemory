import { Lock, StickyNote, Sparkles, Award, HelpCircle, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLearnerMode } from "@/contexts/LearnerModeContext";

interface LockedFeatureCardProps {
  icon: LucideIcon;
  title: string;
  className?: string;
  onUpgrade?: () => void;
}

export const LockedFeatureCard = ({ 
  icon: Icon, 
  title, 
  className = "",
  onUpgrade,
}: LockedFeatureCardProps) => {
  return (
    <Card className={`border-border/50 bg-muted/20 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-muted/50">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </div>
            <p className="text-xs text-muted-foreground/70">Unlock with Pro</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface LockedSidebarSectionProps {
  className?: string;
  onUpgrade?: () => void;
}

export const LockedSidebarSection = ({ 
  className = "",
  onUpgrade,
}: LockedSidebarSectionProps) => {
  const { activateProMode } = useLearnerMode();
  
  const lockedFeatures = [
    { icon: StickyNote, title: "Quick & Deep Notes" },
    { icon: Sparkles, title: "Practice & Reinforce" },
    { icon: Award, title: "Certificate" },
  ];

  const handleUpgrade = () => {
    activateProMode();
    onUpgrade?.();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {lockedFeatures.map((feature) => (
        <LockedFeatureCard
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
        />
      ))}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full mt-3 border-primary/30 hover:bg-primary/10"
        onClick={handleUpgrade}
      >
        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        Upgrade to Pro
      </Button>
    </div>
  );
};

export default LockedFeatureCard;
