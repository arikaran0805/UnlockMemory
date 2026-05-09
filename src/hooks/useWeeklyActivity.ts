import { useQuery } from "@tanstack/react-query";
import { startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const toDayKey = (d: Date) => {
  // Use a noon anchor to avoid timezone edge cases around midnight.
  const safe = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return safe.toISOString().slice(0, 10);
};

export type WeeklyActivityData = {
  totalSeconds: number;
  activeDays: number;
  dailySeconds: Record<string, number>;
  lastWeekSeconds: number;
};

const fetchWeeklyActivity = async (userId: string): Promise<WeeklyActivityData> => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });
  const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 0 });

  // Run both week queries in parallel (was sequential — 2× round-trips → now 1×)
  const [{ data: timeData }, { data: lastWeekData }] = await Promise.all([
    supabase
      .from("lesson_time_tracking")
      .select("tracked_date, duration_seconds")
      .eq("user_id", userId)
      .gte("tracked_date", toDayKey(weekStart))
      .lte("tracked_date", toDayKey(weekEnd)),
    supabase
      .from("lesson_time_tracking")
      .select("duration_seconds")
      .eq("user_id", userId)
      .gte("tracked_date", toDayKey(lastWeekStart))
      .lte("tracked_date", toDayKey(lastWeekEnd)),
  ]);

  const dailySeconds: Record<string, number> = {};
  (timeData || []).forEach((record: any) => {
    dailySeconds[record.tracked_date] =
      (dailySeconds[record.tracked_date] || 0) + (record.duration_seconds || 0);
  });

  const totalSeconds = Object.values(dailySeconds).reduce((sum, s) => sum + s, 0);
  const activeDays = Object.values(dailySeconds).filter((s) => s > 0).length;
  const lastWeekSeconds =
    lastWeekData?.reduce((sum: number, r: any) => sum + (r.duration_seconds || 0), 0) || 0;

  return { totalSeconds, activeDays, dailySeconds, lastWeekSeconds };
};

export const useWeeklyActivity = (userId: string | null, placeholderData?: WeeklyActivityData) => {
  return useQuery({
    queryKey: ["weekly-activity", userId],
    enabled: !!userId,
    queryFn: () => fetchWeeklyActivity(userId as string),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    // placeholderData renders immediately with cached value while the fetch runs in background.
    // isLoading stays false so the card never shows its loading skeleton on revisit.
    placeholderData,
  });
};
