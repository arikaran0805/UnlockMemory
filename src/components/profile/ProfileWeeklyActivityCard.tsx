import { useCallback, useEffect, useMemo, useState } from "react";
import { startOfWeek, eachDayOfInterval } from "date-fns";
import { Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WeeklyActivityData } from "@/hooks/useWeeklyActivity";

const toDayKey = (d: Date) => {
  const safe = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return safe.toISOString().slice(0, 10);
};

const formatDuration = (seconds: number) => {
  if (!seconds) return "0m";
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDurationLong = (seconds: number) => {
  if (!seconds) return "No activity";
  const minutes = Math.floor(seconds / 60);
  if (minutes === 0) return "Less than 1 minute of activity";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} of activity`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins > 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""} ${mins} minute${mins !== 1 ? "s" : ""} of activity`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""} of activity`;
};

type Props = {
  className?: string;
  loading?: boolean;
  weeklyActivityData: WeeklyActivityData;
};

export const ProfileWeeklyActivityCard = ({
  className,
  loading,
  weeklyActivityData,
}: Props) => {
  const [activeTouchDay, setActiveTouchDay] = useState<number | null>(null);

  const handleTouchOutside = useCallback(() => {
    if (activeTouchDay !== null) {
      setTimeout(() => setActiveTouchDay(null), 150);
    }
  }, [activeTouchDay]);

  useEffect(() => {
    if (activeTouchDay !== null) {
      const handler = () => handleTouchOutside();
      document.addEventListener("touchstart", handler);
      return () => document.removeEventListener("touchstart", handler);
    }
  }, [activeTouchDay, handleTouchOutside]);

  const { days, daySecondsByIndex, maxSeconds, bestIndex } = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: weekStart, end: new Date(weekStart.getTime() + 6 * 86400000) });

    const daySecondsByIndex = days.map((d) => weeklyActivityData.dailySeconds[toDayKey(d)] || 0);
    const bestSeconds = daySecondsByIndex.length ? Math.max(...daySecondsByIndex) : 0;
    const bestIndex = bestSeconds > 0 ? daySecondsByIndex.indexOf(bestSeconds) : -1;
    const maxSeconds = Math.max(bestSeconds, 60 * 5);

    return { days, daySecondsByIndex, maxSeconds, bestIndex };
  }, [weeklyActivityData.dailySeconds]);

  const percentChange =
    weeklyActivityData.lastWeekSeconds > 0
      ? Math.round(
          ((weeklyActivityData.totalSeconds - weeklyActivityData.lastWeekSeconds) /
            weeklyActivityData.lastWeekSeconds) *
            100,
        )
      : null;

  if (loading) {
    return (
      <Card className={cn("card-premium rounded-xl", className)}>
        <CardContent className="p-5">
          <div className="space-y-1">
            <h3 className="text-lg font-bold">Weekly Activity</h3>
            <p className="text-xs text-muted-foreground">Time spent per day (hrs)</p>
          </div>
          <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">
            Loading activity...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("card-premium rounded-xl", className)}>
      <CardContent className="p-5">
        <div className="space-y-1 mb-4">
          <h3 className="text-lg font-bold">Weekly Activity</h3>
          <p className="text-xs text-muted-foreground">Time spent per day (hrs)</p>
        </div>

        <TooltipProvider delayDuration={100}>
          <div className="flex items-end justify-between gap-2 h-28 px-1">
            {days.map((date, index) => {
              const daySeconds = daySecondsByIndex[index] || 0;
              const hasActivity = daySeconds > 0;
              const isBestDay = index === bestIndex;
              const isToday = index === new Date().getDay();
              const heightPercent = maxSeconds > 0 ? (daySeconds / maxSeconds) * 100 : 0;

              const longDay = date.toLocaleDateString(undefined, { weekday: "long" });
              const ariaLabel = `${longDay}, ${formatDurationLong(daySeconds)}`;
              const shortDayNames = ["S", "M", "T", "W", "T", "F", "S"];

              return (
                <Tooltip key={toDayKey(date)} open={activeTouchDay === index ? true : undefined}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer select-none"
                      role="button"
                      aria-label={ariaLabel}
                      tabIndex={0}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setTimeout(() => setActiveTouchDay(index), 160);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setActiveTouchDay(activeTouchDay === index ? null : index);
                        }
                      }}
                    >
                      <div className="h-5 flex items-center justify-center">
                        {isBestDay && (
                          <Star 
                            className="h-3.5 w-3.5 text-amber-500 fill-amber-500 drop-shadow-[0_0_3px_rgba(245,179,1,0.3)]" 
                            aria-label="Best activity day"
                          />
                        )}
                      </div>

                      <div className="w-full relative flex items-end justify-center" style={{ height: "70px" }}>
                        <div
                          className={cn(
                            "w-full max-w-7 rounded-full transition-all duration-300",
                            isBestDay
                              ? "bg-primary shadow-md"
                              : isToday
                                ? "bg-primary/80"
                                : hasActivity
                                  ? "bg-primary/50"
                                  : "bg-muted/40",
                          )}
                          style={{
                            height: hasActivity ? `${Math.max(heightPercent, 12)}%` : "8px",
                            minHeight: hasActivity ? "12px" : "8px",
                          }}
                        />
                      </div>

                      <span
                        className={cn(
                          "text-[11px] font-medium transition-colors",
                          isToday
                            ? "text-primary"
                            : hasActivity
                              ? "text-foreground/80"
                              : "text-muted-foreground/70",
                        )}
                      >
                        {shortDayNames[index]}
                      </span>
                    </div>
                  </TooltipTrigger>

                  <TooltipContent side="top" className="text-center px-3 py-2" sideOffset={8}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      {longDay}
                      {isBestDay && <Star className="h-2.5 w-2.5 text-amber-500 fill-amber-500" aria-label="Best activity day" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {hasActivity ? (
                        <>
                          {formatDuration(daySeconds)}
                          {isBestDay && <span className="ml-1">· Best day</span>}
                        </>
                      ) : (
                        "No activity"
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <div className="pt-4 border-t border-border/50">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground text-xs font-medium">Total Time</span>
              <span className="font-bold text-xl tracking-tight">
                {formatDuration(weeklyActivityData.totalSeconds)}
              </span>
              {percentChange !== null && weeklyActivityData.totalSeconds > 0 && (
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    percentChange >= 0 ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {percentChange >= 0 ? "+" : ""}
                  {percentChange}% vs last week
                </span>
              )}
            </div>

            <div className="flex flex-col items-end gap-0.5">
              <span className="text-muted-foreground text-xs font-medium">Active Days This Week</span>
              <span className="font-bold text-xl tracking-tight">
                {weeklyActivityData.activeDays} / 7{weeklyActivityData.activeDays >= 5 ? " 🔥" : ""}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
