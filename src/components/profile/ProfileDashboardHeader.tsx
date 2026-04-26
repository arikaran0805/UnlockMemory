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
    <Card className={cn("card-premium card-no-lift overflow-hidden", className)}>
      {/* Subtle green top-accent bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent z-10" />
      {/* Very subtle green tint in top-left */}
      <div
        className="absolute -top-12 -left-12 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)" }}
      />

      <CardContent className="relative p-6 md:p-7 flex items-center">
        <div className="flex items-center justify-between w-full gap-4">

          {/* Left — Identity */}
          <div className="flex flex-col gap-1">
            <h2
              className="text-[22px] md:text-[24px] font-bold leading-tight"
              style={{ color: "#1D1D1F", letterSpacing: "-0.025em" }}
            >
              {fullName || "Learner"}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <p className="text-[13px] text-muted-foreground">
                Aspiring{" "}
                <span className="font-semibold text-primary">{careerName}</span>
              </p>
            </div>
          </div>

          {/* Right — Streak pill */}
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-2.5 shrink-0"
            style={{
              background: "rgba(251,146,60,0.07)",
              border: "1px solid rgba(251,146,60,0.18)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #FDBA74, #FB923C)",
                boxShadow: "0 4px 12px rgba(251,146,60,0.28)",
              }}
            >
              <Flame className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
              <span
                className="text-[15px] font-bold tabular-nums leading-tight"
                style={{ color: "#EA580C" }}
              >
                {currentStreak}{" "}
                <span className="text-[13px] font-semibold">days</span>
              </span>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                Best streak: {maxStreak}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
