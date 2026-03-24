import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UMLoader from "@/components/UMLoader";
import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, eachDayOfInterval, subDays, subWeeks } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const toDayKey = (d: Date) => {
  const safe = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return safe.toISOString().slice(0, 10);
};

interface DayActivity {
  day: string;
  shortDay: string;
  date: Date;
  hasActivity: boolean;
  totalMinutes: number;
  isBestDay: boolean;
}

interface WeeklyActivityTrackerProps {
  className?: string;
}

const formatDuration = (minutes: number): string => {
  if (minutes === 0) return "0m";
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDurationLong = (minutes: number): string => {
  if (minutes === 0) return "No activity";
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} of activity`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''} of activity`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} of activity`;
};

const fetchActivityData = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  // Get time tracking data for this week
  const { data: timeData } = await supabase
    .from('lesson_time_tracking')
    .select('tracked_date, duration_seconds')
    .eq('user_id', user.id)
    .gte('tracked_date', toDayKey(weekStart))
    .lte('tracked_date', toDayKey(weekEnd));

  // Get last week's data for comparison
  const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
  const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
  
  const { data: lastWeekData } = await supabase
    .from('lesson_time_tracking')
    .select('duration_seconds')
    .eq('user_id', user.id)
    .gte('tracked_date', toDayKey(lastWeekStart))
    .lte('tracked_date', toDayKey(lastWeekEnd));

  const lastWeekTotal = lastWeekData?.reduce((sum, t) => sum + t.duration_seconds, 0) || 0;
  const lastWeekMinutes = Math.floor(lastWeekTotal / 60);

  // Create week days with activity data
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let weekTotal = 0;
  let maxDayMinutes = 60;
  let bestDayIndex = -1;
  let bestDayMinutes = 0;

  const activityDays: DayActivity[] = daysOfWeek.map((date, index) => {
    const dateStr = toDayKey(date);
    const dayTimeRecords = timeData?.filter(t => t.tracked_date === dateStr) || [];
    const totalSeconds = dayTimeRecords.reduce((sum, t) => sum + t.duration_seconds, 0);
    const totalMinutes = Math.floor(totalSeconds / 60);
    weekTotal += totalMinutes;
    if (totalMinutes > maxDayMinutes) maxDayMinutes = totalMinutes;
    
    if (totalMinutes > bestDayMinutes) {
      bestDayMinutes = totalMinutes;
      bestDayIndex = index;
    }

    return {
      day: dayNames[index],
      shortDay: shortDayNames[index],
      date,
      hasActivity: totalSeconds > 0,
      totalMinutes,
      isBestDay: false,
    };
  });

  // Mark best day
  if (bestDayIndex >= 0 && bestDayMinutes > 0) {
    activityDays[bestDayIndex].isBestDay = true;
  }

  // Calculate streak for profile update
  const { data: allTimeData } = await supabase
    .from('lesson_time_tracking')
    .select('tracked_date, duration_seconds')
    .eq('user_id', user.id)
    .order('tracked_date', { ascending: false });

  const dailyTotals = new Map<string, number>();
  allTimeData?.forEach(record => {
    const existing = dailyTotals.get(record.tracked_date) || 0;
    dailyTotals.set(record.tracked_date, existing + record.duration_seconds);
  });

  const todayStr = toDayKey(today);
  const todaySeconds = dailyTotals.get(todayStr) || 0;
  const hasActivityToday = todaySeconds > 0;

  const { data: profile } = await supabase
    .from('profiles')
    .select('max_streak, current_streak, last_activity_date, last_freeze_date')
    .eq('id', user.id)
    .single();

  const storedMaxStreak = (profile as any)?.max_streak || 0;
  const lastFreezeDate = (profile as any)?.last_freeze_date;

  let recalculatedStreak = 0;
  let checkDate = today;
  
  const todayFrozen = lastFreezeDate === todayStr;
  if (!hasActivityToday && !todayFrozen) {
    checkDate = subDays(today, 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = toDayKey(checkDate);
    const daySeconds = dailyTotals.get(dateStr) || 0;
    const wasFrozen = lastFreezeDate === dateStr;

    if (daySeconds > 0 || wasFrozen) {
      recalculatedStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  const newMaxStreak = Math.max(recalculatedStreak, storedMaxStreak);

  await supabase
    .from('profiles')
    .update({ 
      max_streak: newMaxStreak,
      current_streak: recalculatedStreak,
      last_activity_date: hasActivityToday ? todayStr : (profile as any)?.last_activity_date
    } as any)
    .eq('id', user.id);

  return {
    weekDays: activityDays,
    totalWeekMinutes: weekTotal,
    lastWeekMinutes,
    maxMinutes: Math.max(maxDayMinutes, 60),
  };
};

export const WeeklyActivityTracker = ({ className }: WeeklyActivityTrackerProps) => {
  const [activeTouchDay, setActiveTouchDay] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['weekly-activity'],
    queryFn: fetchActivityData,
    staleTime: 30000,
  });

  const weekDays = data?.weekDays || [];
  const totalWeekMinutes = data?.totalWeekMinutes || 0;
  const lastWeekMinutes = data?.lastWeekMinutes ?? null;
  const maxMinutes = data?.maxMinutes || 60;

  // Handle touch outside to dismiss tooltip
  const handleTouchOutside = useCallback(() => {
    if (activeTouchDay !== null) {
      setTimeout(() => setActiveTouchDay(null), 150);
    }
  }, [activeTouchDay]);

  useEffect(() => {
    if (activeTouchDay !== null) {
      const handler = () => handleTouchOutside();
      document.addEventListener('touchstart', handler);
      return () => document.removeEventListener('touchstart', handler);
    }
  }, [activeTouchDay, handleTouchOutside]);

  const today = new Date();
  const currentDayIndex = today.getDay();
  const activeDays = weekDays.filter(d => d.hasActivity).length;

  // Calculate percentage change vs last week
  const percentChange = lastWeekMinutes !== null && lastWeekMinutes > 0 
    ? Math.round(((totalWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100)
    : null;

  if (isLoading) {
    return (
      <Card className={cn("border-primary/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">Weekly Activity</CardTitle>
          <p className="text-xs text-muted-foreground">Time spent per day (hrs)</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <UMLoader size={44} label="Unlocking memory…" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-primary/20 shadow-[0_0_15px_rgba(34,197,94,0.1)] transition-shadow hover:shadow-[0_0_20px_rgba(34,197,94,0.15)]",
      className
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Weekly Activity</CardTitle>
        <p className="text-xs text-muted-foreground">Time spent per day (hrs)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Bar Chart */}
        <TooltipProvider delayDuration={100}>
          <div className="flex items-end justify-between gap-2 h-40 px-1">
            {weekDays.map((day, index) => {
              const isToday = index === currentDayIndex;
              const heightPercent = maxMinutes > 0 ? (day.totalMinutes / maxMinutes) * 100 : 0;
              const ariaLabel = `${day.day}, ${formatDurationLong(day.totalMinutes)}`;
              
              return (
                <Tooltip 
                  key={day.day + index}
                  open={activeTouchDay === index ? true : undefined}
                >
                  <TooltipTrigger asChild>
                    <div 
                      className="flex-1 flex flex-col items-center gap-1.5 cursor-pointer select-none"
                      role="button"
                      aria-label={ariaLabel}
                      tabIndex={0}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setTimeout(() => setActiveTouchDay(index), 150);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setActiveTouchDay(activeTouchDay === index ? null : index);
                        }
                      }}
                    >
                      {/* Best day indicator */}
                      <div className="h-5 flex items-center justify-center">
                        {day.isBestDay && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      
                      {/* Bar container */}
                      <div 
                        className="w-full relative flex items-end justify-center"
                        style={{ height: '100px' }}
                      >
                        <div
                          className={cn(
                            "w-full max-w-7 rounded-full transition-all duration-300",
                            day.isBestDay
                              ? "bg-primary shadow-md"
                              : isToday 
                                ? "bg-primary/80" 
                                : day.hasActivity 
                                  ? "bg-primary/50" 
                                  : "bg-muted/40"
                          )}
                          style={{ 
                            height: day.hasActivity ? `${Math.max(heightPercent, 12)}%` : '8px',
                            minHeight: day.hasActivity ? '12px' : '8px'
                          }}
                        />
                      </div>
                      
                      {/* Day label */}
                      <span className={cn(
                        "text-[11px] font-medium transition-colors",
                        isToday 
                          ? "text-primary" 
                          : day.hasActivity 
                            ? "text-foreground/80" 
                            : "text-muted-foreground/70"
                      )}>
                        {day.shortDay}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="text-center px-3 py-2"
                    sideOffset={8}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      {day.day}
                      {day.isBestDay && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {day.hasActivity ? (
                        <>
                          {formatDuration(day.totalMinutes)}
                          {day.isBestDay && <span className="ml-1">· Best day</span>}
                        </>
                      ) : (
                        'No activity'
                      )}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Stats Row */}
        <div className="flex justify-between items-start pt-4 border-t border-border/50">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">Total Time</span>
            <span className="font-bold text-xl tracking-tight">
              {totalWeekMinutes > 0 ? formatDuration(totalWeekMinutes) : '0m'}
            </span>
            {percentChange !== null && totalWeekMinutes > 0 && (
              <span className={cn(
                "text-[10px] font-medium",
                percentChange >= 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {percentChange >= 0 ? '+' : ''}{percentChange}% vs last week
              </span>
            )}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-muted-foreground text-xs font-medium">Active Days</span>
            <span className="font-bold text-xl tracking-tight">
              {activeDays} / 7 {activeDays >= 5 && '🔥'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
