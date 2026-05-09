# Career Completed Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Complete Career" CTA to the last course's completed page that validates all career courses are done, then opens a dedicated `/career-board/:careerId/completed` page with a premium career certificate and aggregate stats.

**Architecture:** Three changes: (1) add `CareerCompleted` route under the existing `CareerBoardLayout` shell, (2) append a "Complete Career" CTA section to `CareerCourseCompleted` when the current course is last in the career, (3) create `CareerCompleted.tsx` mirroring the structure of `CareerCourseCompleted.tsx` but with career-level data. No new contexts or hooks needed — all data comes from `CareerBoardContext` + direct Supabase queries.

**Tech Stack:** React 18, TypeScript, React Router v6, Supabase, Tailwind, shadcn/ui (Button, Skeleton), lucide-react, date-fns, Canvas API (certificate download)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/routes/careerBoard.routes.tsx` | Modify | Add `completed` route + import |
| `src/pages/CareerCourseCompleted.tsx` | Modify | Add "Complete Career" CTA for last course |
| `src/pages/CareerCompleted.tsx` | Create | Career-level celebration page |

---

## Task 1: Add the `/completed` Route

**Files:**
- Modify: `src/routes/careerBoard.routes.tsx`

- [ ] **Step 1: Add import and route**

Open `src/routes/careerBoard.routes.tsx`. Add the import after the existing `CareerCourseCompleted` import, then add the route before the catch-all.

```tsx
// Add import (line ~24, after CareerCourseCompleted import):
import CareerCompleted from "@/pages/CareerCompleted";
```

```tsx
// Add route (after line 45, before the catch-all):
{/* Career completion page */}
<Route path="completed" element={<CareerCompleted />} />
```

The full routes block becomes:
```tsx
<Route element={<CareerBoardLayout />}>
  <Route index element={<CareerBoardIndex />} />
  <Route path="course/:courseSlug" element={<CareerCourseDetail />} />
  <Route path="course/:courseSlug/completed" element={<CareerCourseCompleted />} />
  <Route path="completed" element={<CareerCompleted />} />
  <Route path="*" element={<Navigate to="/careers" replace />} />
</Route>
```

- [ ] **Step 2: Verify TypeScript compiles (CareerCompleted doesn't exist yet — expect import error)**

```bash
cd /Users/arikarans/UnlockMemory && npx tsc --noEmit 2>&1 | grep careerBoard
```
Expected: error about `CareerCompleted` module not found. That's fine — it will be resolved in Task 3.

- [ ] **Step 3: Commit**

```bash
git add src/routes/careerBoard.routes.tsx
git commit -m "feat: add /career-board/:careerId/completed route"
```

---

## Task 2: Add "Complete Career" CTA to CareerCourseCompleted

**Files:**
- Modify: `src/pages/CareerCourseCompleted.tsx`

This section appends a CTA card at the very bottom of the last course's completed page. It replaces nothing — it appears after the `{nextCourse && (...)}` block, shown only when the current course is the last one in the career.

- [ ] **Step 1: Add new imports at top of `CareerCourseCompleted.tsx`**

Find the existing lucide imports (around line 14–26) and add `AlertCircle`, `Trophy`, `Loader2` to the destructure:

```tsx
import {
  PartyPopper,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Clock,
  Target,
  Star,
  Linkedin,
  Copy,
  ChevronRight,
  Download,
  Check,
  AlertCircle,
  Trophy,
  Loader2,
} from "lucide-react";
```

- [ ] **Step 2: Add CTA state after existing state declarations**

Find the `const [nextCoursePosts, ...]` state lines (around line 97) and add directly after:

```tsx
const [careerCtaState, setCareerCtaState] = useState<'idle' | 'checking' | 'incomplete'>('idle');
const [courseStatuses, setCourseStatuses] = useState<{
  courseId: string; name: string; slug: string; isComplete: boolean; progress: number;
}[]>([]);
```

- [ ] **Step 3: Add `isLastCourse` derived value**

Add this after the `const displayName = ...` line (around line 225):

```tsx
const isLastCourse = useMemo(() => {
  if (!careerCourses.length || !courseSlug) return false;
  const last = careerCourses[careerCourses.length - 1];
  return last.course?.slug === courseSlug;
}, [careerCourses, courseSlug]);
```

- [ ] **Step 4: Add `handleCompleteCareer` function**

Add this after the `handleShareLinkedIn` function (around line 372):

```tsx
const handleCompleteCareer = async () => {
  if (!user || !career) return;
  setCareerCtaState('checking');
  try {
    const courseIds = careerCourses.map(cc => cc.course_id);
    const [completedResult, totalResult] = await Promise.all([
      supabase
        .from('lesson_progress')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .in('course_id', courseIds),
      supabase
        .from('posts')
        .select('id, category_id')
        .in('category_id', courseIds)
        .eq('status', 'published'),
    ]);

    const completedByCourse = new Map<string, number>();
    (completedResult.data || []).forEach((p: any) => {
      completedByCourse.set(p.course_id, (completedByCourse.get(p.course_id) || 0) + 1);
    });
    const totalByCourse = new Map<string, number>();
    (totalResult.data || []).forEach((p: any) => {
      totalByCourse.set(p.category_id, (totalByCourse.get(p.category_id) || 0) + 1);
    });

    const statuses = careerCourses.map(cc => {
      const completed = completedByCourse.get(cc.course_id) || 0;
      const total = totalByCourse.get(cc.course_id) || 0;
      return {
        courseId: cc.course_id,
        name: cc.course?.name || cc.course?.slug || 'Course',
        slug: cc.course?.slug || '',
        isComplete: total > 0 && completed >= total,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    if (statuses.every(s => s.isComplete)) {
      const totalLessons = [...completedByCourse.values()].reduce((a, b) => a + b, 0);
      navigate(`/career-board/${careerSlugForPath}/completed`, {
        state: {
          completionDate: new Date().toISOString(),
          prefetchedStats: {
            totalLessons,
            totalHours: 0,
            courses: careerCourses.map(cc => cc.course).filter(Boolean),
          },
        },
      });
    } else {
      setCourseStatuses(statuses);
      setCareerCtaState('incomplete');
    }
  } catch (error) {
    console.error('Error checking career completion:', error);
    setCareerCtaState('idle');
  }
};
```

- [ ] **Step 5: Add the CTA section JSX**

Find the closing `</div>` of the entire return (the last `</div>` before `);`, around line 613). Add the CTA section JSX just before it, after the `{nextCourse && (...)}` block:

```tsx
{/* ── Complete Career CTA — shown only on last course ──────────── */}
{isLastCourse && (
  <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 mt-4">
    {careerCtaState !== 'incomplete' ? (
      <>
        <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.07em] mb-3">
          Career Journey
        </p>
        <p className="font-semibold text-foreground mb-1">You've finished all courses!</p>
        <p className="text-[12px] text-muted-foreground mb-4">
          Claim your career certificate and celebrate completing the full path.
        </p>
        <Button
          onClick={handleCompleteCareer}
          disabled={careerCtaState === 'checking'}
          className="w-full h-11 gap-2 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-none font-medium"
        >
          {careerCtaState === 'checking' ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
          ) : (
            <><Trophy className="h-4 w-4" /> Complete Career</>
          )}
        </Button>
      </>
    ) : (
      <>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
          <p className="text-[13px] font-semibold text-foreground">Complete all courses first</p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {courseStatuses.map(cs => (
            <div
              key={cs.courseId}
              className={cn(
                "flex items-center gap-2.5 p-2.5 rounded-lg border text-[12px]",
                cs.isComplete
                  ? "border-border/30 bg-muted/20"
                  : "border-amber-200/60 bg-amber-50/50"
              )}
            >
              {cs.isComplete ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-400 flex-shrink-0" />
              )}
              <span className={cn(
                "flex-1 font-medium",
                cs.isComplete ? "text-foreground/60" : "text-foreground"
              )}>
                {cs.name}
              </span>
              <span className={cn(
                "font-medium",
                cs.isComplete ? "text-primary" : "text-amber-600"
              )}>
                {cs.isComplete ? "Done" : `${cs.progress}%`}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              const firstIncomplete = courseStatuses.find(s => !s.isComplete);
              if (firstIncomplete?.slug) {
                navigate(`/career-board/${careerSlugForPath}/course/${firstIncomplete.slug}`);
              }
            }}
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-none text-[13px]"
          >
            Go to {courseStatuses.find(s => !s.isComplete)?.name}
          </Button>
          <Button
            variant="outline"
            onClick={() => setCareerCtaState('idle')}
            className="rounded-xl border-border/60 hover:bg-muted/50 text-[13px]"
          >
            Dismiss
          </Button>
        </div>
      </>
    )}
  </section>
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd /Users/arikarans/UnlockMemory && npx tsc --noEmit 2>&1 | grep CareerCourseCompleted
```
Expected: no errors from this file (CareerCompleted import error from Task 1 may still show).

- [ ] **Step 7: Commit**

```bash
git add src/pages/CareerCourseCompleted.tsx
git commit -m "feat: add Complete Career CTA to last course completed page"
```

---

## Task 3: Create `CareerCompleted.tsx`

**Files:**
- Create: `src/pages/CareerCompleted.tsx`

This mirrors `CareerCourseCompleted.tsx` in structure but shows career-level data: a premium certificate (white bg, deep-green gradient bars, "Career Certificate of Completion", "Full Career Path" badge), 4-stat summary grid (Courses / Lessons / Time / Skills), and a "Courses Covered" list.

- [ ] **Step 1: Create the file**

Create `src/pages/CareerCompleted.tsx` with this full content:

```tsx
/**
 * CareerCompleted - Career Completion Page within Career Board Shell
 *
 * Route: /career-board/:careerId/completed
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  Clock,
  Target,
  Copy,
  Download,
  Check,
  Trophy,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CompletionData {
  completionDate: Date;
  totalLessons: number;
  totalHours: number;
  totalCourses: number;
  skills: string[];
  courses: { id: string; name: string; slug: string; learning_hours?: number | null }[];
}

const CareerCompleted = () => {
  const params = useParams<{ careerId: string }>();
  const careerIdParam = decodeURIComponent((params.careerId ?? "").split("?")[0]).trim();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { career, careerCourses, isLoading: careerLoading } = useCareerBoard();

  const navState = location.state as {
    completionDate?: string;
    prefetchedStats?: {
      totalLessons: number;
      totalHours: number;
      courses: { id: string; name: string; slug: string; learning_hours?: number | null }[];
    };
  } | null;

  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [learnerName, setLearnerName] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const careerSlugForPath = careerIdParam || career?.slug;

  // Auth redirect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/auth", {
        state: { from: `/career-board/${careerIdParam}/completed` },
        replace: true,
      });
    }
  }, [authLoading, isAuthenticated, navigate, careerIdParam]);

  // Safety timeout
  useEffect(() => {
    if (hasLoadedOnce) return;
    const timeout = setTimeout(() => {
      setDataLoading(false);
      setHasLoadedOnce(true);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [hasLoadedOnce]);

  // Data fetching
  useEffect(() => {
    if (authLoading || careerLoading || !user || !career || !careerCourses.length) return;

    const fetchData = async () => {
      try {
        const courseIds = careerCourses.map(cc => cc.course_id);

        const [profileResult, lessonsResult, hoursResult, skillsResult, dateResult] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("full_name")
              .eq("id", user.id)
              .maybeSingle(),
            supabase
              .from("lesson_progress")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("completed", true)
              .in("course_id", courseIds),
            supabase
              .from("lesson_time_tracking")
              .select("duration_seconds")
              .eq("user_id", user.id)
              .in("course_id", courseIds),
            supabase
              .from("career_skills")
              .select("skill_name")
              .eq("career_id", career.id)
              .order("display_order"),
            supabase
              .from("lesson_progress")
              .select("viewed_at")
              .eq("user_id", user.id)
              .eq("completed", true)
              .in("course_id", courseIds)
              .order("viewed_at", { ascending: false })
              .limit(1),
          ]);

        setLearnerName(
          profileResult.data?.full_name || user.email?.split("@")[0] || "Learner"
        );

        const totalLessons = lessonsResult.count || 0;
        const totalSeconds =
          hoursResult.data?.reduce(
            (sum: number, t: any) => sum + (t.duration_seconds || 0),
            0
          ) || 0;
        const totalHoursFromTracking = totalSeconds / 3600;
        const totalHoursFallback = careerCourses.reduce(
          (sum, cc) => sum + (((cc as any).course?.learning_hours as number) || 0),
          0
        );
        const totalHours =
          totalHoursFromTracking > 0 ? totalHoursFromTracking : totalHoursFallback || 1;

        const skills =
          skillsResult.data?.map((s: any) => s.skill_name as string) || [];

        const completionDate = dateResult.data?.[0]?.viewed_at
          ? new Date(dateResult.data[0].viewed_at)
          : new Date();

        const courses = careerCourses.map(cc => ({
          id: cc.course_id,
          name: cc.course?.name || "",
          slug: cc.course?.slug || "",
          learning_hours: (cc as any).course?.learning_hours as number | null,
        }));

        setCompletionData({
          completionDate: navState?.completionDate
            ? new Date(navState.completionDate)
            : completionDate,
          totalLessons: navState?.prefetchedStats?.totalLessons ?? totalLessons,
          totalHours: navState?.prefetchedStats?.totalHours || totalHours,
          totalCourses: careerCourses.length,
          skills:
            skills.length > 0 ? skills : ["Problem Solving", "Critical Thinking"],
          courses: navState?.prefetchedStats?.courses ?? courses,
        });
      } catch (error) {
        console.error("Error fetching career completion data:", error);
      } finally {
        setDataLoading(false);
        setHasLoadedOnce(true);
      }
    };

    fetchData();
  }, [authLoading, careerLoading, user, career, careerCourses, careerIdParam]);

  const displayName =
    learnerName ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Learner";

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)} hrs`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied!", description: "Share your achievement with others." });
  };

  const handleShareLinkedIn = () => {
    if (!career) return;
    const text = encodeURIComponent(
      `I just completed the "${career.name}" career path on UnlockMemory! 🎉\n\n#Learning #Achievement #CareerGrowth`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`,
      "_blank",
      "width=600,height=400"
    );
  };

  const downloadCertificate = useCallback(() => {
    if (!career || !completionData) return;

    const W = 1400, H = 990;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // White background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    // Deep green gradient bars top + bottom
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, "#064e3b");
    barGrad.addColorStop(0.5, "#059669");
    barGrad.addColorStop(1, "#064e3b");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, 7);
    ctx.fillRect(0, H - 7, W, 7);

    // Outer hairline border
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 7, W - 1, H - 14);

    // Inner decorative border
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 36, W - 56, H - 72);

    // Corner squares
    const cs = 10;
    ctx.fillStyle = "#064e3b";
    [[28, 36], [W - 28 - cs, 36], [28, H - 36 - cs], [W - 28 - cs, H - 36 - cs]].forEach(
      ([x, y]) => ctx.fillRect(x, y, cs, cs)
    );

    ctx.textAlign = "center";

    // Platform name
    ctx.fillStyle = "#9ca3af";
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText("UNLOCKMEMORY", W / 2, 100);

    // Title
    ctx.fillStyle = "#111827";
    ctx.font = '700 52px Georgia, "Times New Roman", serif';
    ctx.fillText("Career Certificate of Completion", W / 2, 190);

    // "Full Career Path" badge text
    ctx.fillStyle = "#059669";
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText("Full Career Path", W / 2, 234);

    // Gradient divider
    const grad = ctx.createLinearGradient(W / 2 - 320, 0, W / 2 + 320, 0);
    grad.addColorStop(0, "rgba(6,78,59,0)");
    grad.addColorStop(0.25, "rgba(6,78,59,0.5)");
    grad.addColorStop(0.75, "rgba(6,78,59,0.5)");
    grad.addColorStop(1, "rgba(6,78,59,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 320, 262);
    ctx.lineTo(W / 2 + 320, 262);
    ctx.stroke();

    // "This is to certify that"
    ctx.fillStyle = "#6b7280";
    ctx.font = '22px Georgia, "Times New Roman", serif';
    ctx.fillText("This is to certify that", W / 2, 340);

    // Learner name
    ctx.fillStyle = "#111827";
    ctx.font = '700 60px Georgia, "Times New Roman", serif';
    ctx.fillText(displayName, W / 2, 450);

    // Name underline
    ctx.save();
    const nameW = ctx.measureText(displayName).width;
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameW / 2 - 24, 472);
    ctx.lineTo(W / 2 + nameW / 2 + 24, 472);
    ctx.stroke();
    ctx.restore();

    // "has successfully completed the"
    ctx.fillStyle = "#6b7280";
    ctx.font = '22px Georgia, "Times New Roman", serif';
    ctx.fillText("has successfully completed the", W / 2, 536);

    // Career name (auto-shrink for long titles)
    ctx.fillStyle = "#064e3b";
    let sz = 44;
    const careerText = `${career.name} Career Path`;
    ctx.font = `700 ${sz}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    while (ctx.measureText(careerText).width > W - 200 && sz > 24) {
      sz--;
      ctx.font = `700 ${sz}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    }
    ctx.fillText(careerText, W / 2, 626);

    // Completion date
    ctx.fillStyle = "#6b7280";
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(
      `Completed on ${format(completionData.completionDate, "MMMM d, yyyy")}`,
      W / 2,
      712
    );

    // Bottom divider
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 220, 756);
    ctx.lineTo(W / 2 + 220, 756);
    ctx.stroke();

    // Footer
    ctx.fillStyle = "#9ca3af";
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText("Issued by UnlockMemory · Career Achievement", W / 2, 802);

    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `${career.slug}-career-certificate.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, "image/png");

    toast({
      title: "Career certificate downloaded!",
      description: "Saved as a PNG image to your device.",
    });
  }, [career, completionData, displayName, toast]);

  const showLoading = hasLoadedOnce
    ? false
    : authLoading || dataLoading || careerLoading;

  if (showLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <Skeleton className="h-5 w-28 mb-10" />
        <div className="text-center mb-10 space-y-3">
          <Skeleton className="h-10 w-10 rounded-full mx-auto" />
          <Skeleton className="h-9 w-64 mx-auto" />
          <Skeleton className="h-5 w-48 mx-auto" />
        </div>
        <Skeleton className="h-[340px] w-full rounded-2xl mb-4" />
        <Skeleton className="h-14 w-full rounded-xl mb-8" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!career || !completionData) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">

      {/* ── Back link ──────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/career-board/${careerSlugForPath}`)}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Career Board
      </button>

      {/* ── Celebration header ─────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/8 text-primary mb-5">
          <Trophy className="h-9 w-9" strokeWidth={1.5} />
        </div>
        <h1 className="text-[32px] sm:text-[38px] font-bold text-foreground tracking-tight mb-2">
          Career Completed!
        </h1>
        <p className="text-lg font-semibold text-primary mb-2">{career.name}</p>
        <p className="text-sm text-muted-foreground mb-3">
          Congratulations on mastering the full career path.
        </p>
        <div className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-3.5 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          Completed on {format(completionData.completionDate, "MMMM d, yyyy")}
        </div>
      </div>

      {/* ── Career Certificate ─────────────────────────────────────────────── */}
      <section className="mb-6">
        <div
          className="relative w-full rounded-2xl overflow-hidden border border-border/50 shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
          style={{ aspectRatio: "1.414 / 1", background: "#fff" }}
        >
          {/* Deep green gradient bars */}
          <div
            className="absolute top-0 left-0 right-0 h-[5px]"
            style={{ background: "linear-gradient(90deg, #064e3b, #059669, #064e3b)" }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[5px]"
            style={{ background: "linear-gradient(90deg, #064e3b, #059669, #064e3b)" }}
          />

          {/* Inner border */}
          <div className="absolute inset-[18px] border border-border/30 rounded-lg pointer-events-none" />

          {/* Corner squares */}
          {(["top-[14px] left-[14px]", "top-[14px] right-[14px]", "bottom-[14px] left-[14px]", "bottom-[14px] right-[14px]"] as const).map((pos, i) => (
            <div key={i} className={cn("absolute w-2 h-2 rounded-sm bg-[#064e3b]/40", pos)} />
          ))}

          {/* Certificate content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 py-6">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 mb-2">
              UnlockMemory
            </p>
            <span className="text-lg mb-1">🎖️</span>
            <h2 className="font-serif text-[clamp(14px,3vw,22px)] font-bold text-foreground/90 mb-1.5 leading-tight">
              Career Certificate of Completion
            </h2>
            <span className="inline-block text-[clamp(7px,1.1vw,9px)] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 mb-2">
              Full Career Path
            </span>
            <div
              className="w-32 h-px mb-3"
              style={{
                background:
                  "linear-gradient(90deg, transparent, hsl(152 36% 33% / 0.4), transparent)",
              }}
            />
            <p className="text-[clamp(8px,1.4vw,11px)] text-muted-foreground mb-1.5">
              This is to certify that
            </p>
            <p className="font-serif text-[clamp(16px,3.5vw,26px)] font-bold text-foreground leading-tight mb-1">
              {displayName}
            </p>
            <div className="w-28 h-px bg-border/60 mb-2" />
            <p className="text-[clamp(8px,1.4vw,11px)] text-muted-foreground mb-1.5">
              has successfully completed the
            </p>
            <p className="text-[clamp(11px,2.2vw,16px)] font-bold text-emerald-700 leading-tight mb-3 max-w-[80%]">
              {career.name} Career Path
            </p>
            <p className="text-[clamp(8px,1.3vw,11px)] text-muted-foreground/60">
              {format(completionData.completionDate, "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* CTA row */}
        <div className="flex items-center gap-2 mt-3">
          <Button
            onClick={downloadCertificate}
            className="flex-1 h-11 gap-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-xl shadow-none"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={handleShareLinkedIn}
            className="flex-1 h-11 gap-2 font-medium rounded-xl border-border/60 hover:bg-muted/50"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            LinkedIn
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="h-11 w-11 flex-shrink-0 rounded-xl border-border/60 hover:bg-muted/50 p-0"
          >
            {copiedLink ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </section>

      {/* ── Career Summary ─────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 mb-4">
        <h3 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-[0.07em] mb-4">
          Career Summary
        </h3>
        <div className="grid grid-cols-4 gap-3 mb-5">
          {(
            [
              { icon: GraduationCap, value: String(completionData.totalCourses), label: "Courses" },
              { icon: BookOpen,      value: String(completionData.totalLessons),  label: "Lessons" },
              { icon: Clock,         value: formatHours(completionData.totalHours), label: "Time Invested" },
              { icon: Target,        value: String(completionData.skills.length), label: "Skills" },
            ] as const
          ).map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-muted/40 border border-border/30 text-center"
            >
              <Icon className="h-4 w-4 text-muted-foreground/60 mb-0.5" strokeWidth={1.6} />
              <span className="text-xl font-bold tabular-nums text-foreground">{value}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {completionData.skills.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.07em] mb-2.5">
              Key Skills Learned
            </p>
            <div className="flex flex-wrap gap-1.5">
              {completionData.skills.map((skill, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40 text-[12px] font-medium text-foreground/70"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                  {skill}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Courses Covered ────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
        <h3 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-[0.07em] mb-4">
          Courses Covered
        </h3>
        <div className="flex flex-col gap-2">
          {completionData.courses.map(c => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-medium text-[13px] text-foreground flex-1">{c.name}</span>
              {c.learning_hours && (
                <span className="text-[11px] text-muted-foreground">~{c.learning_hours}h</span>
              )}
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default CareerCompleted;
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /Users/arikarans/UnlockMemory && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Start dev server and do manual smoke test**

```bash
cd /Users/arikarans/UnlockMemory && npm run dev
```

Navigate to the last course completed page in the career board and verify:
- "Career Journey" CTA card appears at the bottom
- Clicking "Complete Career" runs the check (spinner shows)
- If all complete → navigates to `/career-board/:careerId/completed`
- Career Completed page shows: trophy header, certificate with green gradient bars + "Full Career Path" badge, 4-stat grid, courses covered list
- Download button produces a PNG certificate with correct learner name and career name
- Back button navigates to career board

- [ ] **Step 4: Commit**

```bash
git add src/pages/CareerCompleted.tsx
git commit -m "feat: add CareerCompleted page with premium certificate and career stats"
```

---

## Self-Review

**Spec coverage check:**
- ✅ "Complete Career" CTA at end of last course completed page — Task 2
- ✅ Validates all courses completed before allowing navigation — Task 2, `handleCompleteCareer`
- ✅ Shows incomplete courses with "Go to [course]" if validation fails — Task 2, `incomplete` state
- ✅ Dedicated `/career-board/:careerId/completed` route — Task 1
- ✅ Career Completed page mirrors CareerCourseCompleted structure — Task 3
- ✅ Stats: hours, courses covered, lessons, skills — Task 3, Career Summary section
- ✅ Premium career certificate (B design: white bg, green gradient bars, Full Career Path badge) — Task 3
- ✅ Certificate Canvas download — Task 3, `downloadCertificate`
- ✅ LinkedIn share — Task 3, `handleShareLinkedIn`
- ✅ Direct URL navigation guard (no location.state → falls back to DB fetch) — Task 3, data fetching with fallback

**Placeholder scan:** No TBDs, TODOs, or vague steps. All code is complete.

**Type consistency:**
- `careerCourses` → `CareerCourse[]` from `useCareerBoard()`, using `.course_id` for DB queries and `.course?.slug` for navigation — consistent across Task 2 and Task 3
- `CompletionData` interface defined at top of `CareerCompleted.tsx`, used throughout — consistent
- `careerCtaState: 'idle' | 'checking' | 'incomplete'` — consistent in state declaration and JSX conditions
- `courseStatuses` array shape `{ courseId, name, slug, isComplete, progress }` — consistent between setter in `handleCompleteCareer` and JSX render in Task 2
