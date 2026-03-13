import { Card, CardContent } from "@/components/ui/card";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  fullName: string;
  careerName: string;
  currentStreak: number;
  maxStreak: number;
};

export const ProfileDashboardHeader = ({
  className,
  fullName,
  careerName,
  currentStreak,
  maxStreak,
}: Props) => {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-0",
        "card-premium",
        className
      )}
    >
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/4 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-56 h-56 bg-accent/4 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />

      <CardContent className="relative p-5 md:p-6 h-[100px] flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* Left - Identity */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight tracking-[-0.02em]">
              {fullName || "Learner"}
            </h2>
            <p className="text-sm text-muted-foreground font-normal tracking-wide">
              Aspiring{" "}
              <span className="text-primary font-semibold">{careerName}</span>
            </p>
          </div>

          {/* Right - Streak Badge */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-orange-500/30 rounded-full blur-lg" />
              <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold text-foreground tracking-tight tabular-nums">
                {currentStreak} Days
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                Streak · max {maxStreak}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
