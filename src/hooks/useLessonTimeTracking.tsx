import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface UseLessonTimeTrackingProps {
  lessonId: string | undefined;
  courseId: string | undefined;
}

const toDayKey = (d: Date) => {
  // Use a noon "anchor" to avoid timezone edge cases around midnight.
  const safe = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return safe.toISOString().slice(0, 10);
};

export const useLessonTimeTracking = ({ lessonId, courseId }: UseLessonTimeTrackingProps) => {
  const queryClient = useQueryClient();
  const startTimeRef = useRef<number>(Date.now());
  const lastSaveRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);

  const saveTime = useCallback(async () => {
    try {
      if (!lessonId || !courseId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastSaveRef.current) / 1000);

      if (elapsedSeconds < 5) return; // Don't save if less than 5 seconds

      accumulatedTimeRef.current += elapsedSeconds;
      lastSaveRef.current = now;

      const today = toDayKey(new Date());

      // Upsert the time tracking record
      const { error } = await supabase
        .from('lesson_time_tracking')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          duration_seconds: accumulatedTimeRef.current,
          tracked_date: today,
        }, {
          onConflict: 'user_id,lesson_id,tracked_date',
        });

      if (error) {
        console.error('Error saving time tracking:', error);
        return;
      }

      // Update streak on the profile (simple, fast logic)
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_streak, max_streak, last_activity_date')
        .eq('id', user.id)
        .maybeSingle();

      const lastActivityDate = (profile as any)?.last_activity_date as string | null | undefined;
      const currentStreak = ((profile as any)?.current_streak as number | null | undefined) ?? 0;
      const maxStreak = ((profile as any)?.max_streak as number | null | undefined) ?? 0;

      if (lastActivityDate === today) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = toDayKey(yesterday);

      const nextStreak = lastActivityDate === yesterdayKey ? currentStreak + 1 : 1;
      const nextMax = Math.max(maxStreak, nextStreak);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          current_streak: nextStreak,
          max_streak: nextMax,
          last_activity_date: today,
        } as any)
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating streak:', updateError);
        return;
      }

      // Invalidate the weekly activity cache so the UI updates
      queryClient.invalidateQueries({ queryKey: ['weekly-activity'] });
    } catch (err) {
      // Silently swallow errors (e.g. expired session after long inactivity).
      // An unhandled rejection from setInterval would propagate above the Error
      // Boundary and cause a white page — we never want that from a background save.
      console.error('saveTime error (session may have expired):', err);
    }
  }, [lessonId, courseId, queryClient]);

  useEffect(() => {
    if (!lessonId || !courseId) return;

    // Reset tracking when lesson changes
    startTimeRef.current = Date.now();
    lastSaveRef.current = Date.now();
    accumulatedTimeRef.current = 0;

    // Load existing time for today
    const loadExistingTime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = toDayKey(new Date());

      const { data } = await supabase
        .from('lesson_time_tracking')
        .select('duration_seconds')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .eq('tracked_date', today)
        .maybeSingle();

      if (data) {
        accumulatedTimeRef.current = data.duration_seconds;
      }
    };

    loadExistingTime();

    // Save time every 30 seconds
    const interval = setInterval(saveTime, 30000);

    // Save on visibility change (when user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save on beforeunload
    const handleBeforeUnload = () => {
      saveTime();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      saveTime(); // Save on unmount
    };
  }, [lessonId, courseId, saveTime]);

  return { saveTime };
};
