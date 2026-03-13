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
        "relative overflow-hidden border-0 card-premium",
        className
      )}
    >
      <CardContent className="relative p-5 md:p-6 h-[100px] flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* Left - Identity */}
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl leading-tight" style={{ fontWeight: 700, color: '#1C2E25', letterSpacing: '-0.02em' }}>
              {fullName || "Learner"}
            </h2>
            <p className="text-sm font-normal" style={{ color: '#6B7F73' }}>
              Aspiring{" "}
              <span className="font-semibold text-primary">{careerName}</span>
            </p>
          </div>

          {/* Right - Streak Badge */}
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FDBA74, #FB923C)',
                boxShadow: '0 8px 20px rgba(251,146,60,0.35)',
              }}
            >
              <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-lg font-bold tracking-tight tabular-nums" style={{ color: '#1C2E25' }}>
                {currentStreak} Days
              </span>
              <span className="text-[11px] font-medium" style={{ color: '#6B7F73' }}>
                Streak · max {maxStreak}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
