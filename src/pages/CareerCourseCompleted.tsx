/**
 * CareerCourseCompleted - Course Completion Page within Career Board Shell
 *
 * Route: /career-board/:careerId/course/:courseSlug/completed
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useOutletContext, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { format } from "date-fns";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import CourseReviewDialog from "@/components/CourseReviewDialog";
import { useCourseStats } from "@/hooks/useCourseStats";
import { cn } from "@/lib/utils";

interface CourseData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  learning_hours: number | null;
}

interface CompletionData {
  lessonsCompleted: number;
  totalHours: number;
  completionDate: Date;
  skills: string[];
}

interface OutletContext {
  setCurrentCourseSlug: (slug: string | null) => void;
}

const CareerCourseCompleted = () => {
  const params = useParams<{ careerId: string; courseSlug: string }>();
  const careerIdParam = decodeURIComponent((params.careerId ?? "").split("?")[0]).trim();
  const courseSlug = decodeURIComponent((params.courseSlug ?? "").split("?")[0]).trim();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const navState = location.state as {
    course?: CourseData;
    lessonsCompleted?: number;
    completionDate?: string;
    prefetchedPosts?: any[];
    prefetchedLessons?: any[];
    prefetchedStats?: any;
    prefetchedLessonMap?: Record<string, boolean>;
  } | null;

  const { career, careerCourses, isLoading: careerLoading } = useCareerBoard();
  const outletContext = useOutletContext<OutletContext>();
  const setCurrentCourseSlug = outletContext?.setCurrentCourseSlug;
  const careerSlugForPath = careerIdParam || career?.slug;

  const [course, setCourse] = useState<CourseData | null>(navState?.course ?? null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(
    navState?.course ? {
      lessonsCompleted: navState.lessonsCompleted ?? 0,
      totalHours: navState.course.learning_hours || 1,
      completionDate: navState.completionDate ? new Date(navState.completionDate) : new Date(),
      skills: [],
    } : null
  );
  const [dataLoading, setDataLoading] = useState(true);
  const [learnerName, setLearnerName] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const careerCoursesRef = useRef(careerCourses);
  useEffect(() => { careerCoursesRef.current = careerCourses; }, [careerCourses]);

  const { stats: courseStats, reviews: courseReviews, submitReview, deleteReview } = useCourseStats(course?.id, user);
  const [nextCourse, setNextCourse] = useState<CourseData | null>(null);
  const [nextCoursePosts, setNextCoursePosts] = useState<any[] | null>(null);
  const [nextCourseLessons, setNextCourseLessons] = useState<any[] | null>(null);

  // Safety timeout
  useEffect(() => {
    if (navState?.course || hasLoadedOnce) return;
    const timeout = setTimeout(() => {
      if (!hasLoadedOnce) { setDataLoading(false); setHasLoadedOnce(true); }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [hasLoadedOnce]);

  useEffect(() => {
    if (setCurrentCourseSlug) {
      setCurrentCourseSlug(courseSlug);
      return () => setCurrentCourseSlug(null);
    }
  }, [courseSlug, setCurrentCourseSlug]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/auth", { state: { from: `/career-board/${careerIdParam}/course/${courseSlug}/completed` }, replace: true });
      return;
    }
    if (!user || !courseSlug) return;

    const fetchData = async () => {
      try {
        let courseData: CourseData | null = navState?.course ?? null;

        if (!courseData) {
          const { data, error } = await supabase
            .from("courses").select("id, name, slug, description, learning_hours")
            .eq("slug", courseSlug).maybeSingle();
          if (error || !data) {
            navigate(`/career-board/${careerSlugForPath}/course/${courseSlug}`, { replace: true });
            return;
          }
          courseData = data;
          setCourse(courseData);
        }

        if (navState?.course) {
          setDataLoading(false);
          setHasLoadedOnce(true);

          // Fetch profile name + skills in background
          const [profileResult, careerCoursesData] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
            supabase.from("career_courses").select("skill_contributions").eq("course_id", courseData.id).is("deleted_at", null),
          ]);

          setLearnerName(profileResult.data?.full_name || user.email?.split('@')[0] || "Learner");

          let skills: string[] = [];
          careerCoursesData.data?.forEach(cc => {
            if (cc.skill_contributions && Array.isArray(cc.skill_contributions)) {
              (cc.skill_contributions as Array<{ skill_name: string; contribution: number }>).forEach(sc => {
                if (sc.skill_name && sc.contribution > 0) skills.push(sc.skill_name);
              });
            }
          });
          skills = [...new Set(skills)];
          if (skills.length === 0) skills = ["Problem Solving", "Critical Thinking", "Subject Mastery"];
          setCompletionData(prev => prev ? { ...prev, skills: skills.slice(0, 6) } : prev);
        } else {
          const [profileResult, completedLessonsResult, timeResult, progressResult, careerCoursesResult] = await Promise.all([
            supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
            supabase.from("lesson_progress").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("course_id", courseData.id).eq("completed", true),
            supabase.from("lesson_time_tracking").select("duration_seconds").eq("user_id", user.id).eq("course_id", courseData.id),
            supabase.from("lesson_progress").select("viewed_at").eq("user_id", user.id).eq("course_id", courseData.id).eq("completed", true).order("viewed_at", { ascending: false }).limit(1),
            supabase.from("career_courses").select("skill_contributions").eq("course_id", courseData.id).is("deleted_at", null),
          ]);

          setLearnerName(profileResult.data?.full_name || user.email?.split('@')[0] || "Learner");
          const completed = completedLessonsResult.count || 0;
          const totalSeconds = timeResult.data?.reduce((sum, t) => sum + t.duration_seconds, 0) || 0;
          const totalHours = totalSeconds / 3600;
          const completionDate = progressResult.data?.[0]?.viewed_at ? new Date(progressResult.data[0].viewed_at) : new Date();

          let skills: string[] = [];
          careerCoursesResult.data?.forEach(cc => {
            if (cc.skill_contributions && Array.isArray(cc.skill_contributions)) {
              (cc.skill_contributions as Array<{ skill_name: string; contribution: number }>).forEach(sc => {
                if (sc.skill_name && sc.contribution > 0) skills.push(sc.skill_name);
              });
            }
          });
          skills = [...new Set(skills)];
          if (skills.length === 0) skills = ["Problem Solving", "Critical Thinking", "Subject Mastery"];

          setCompletionData({ lessonsCompleted: completed, totalHours: totalHours > 0 ? totalHours : (courseData.learning_hours || 1), completionDate, skills: skills.slice(0, 6) });
        }

        if (careerCoursesRef.current.length > 0) {
          const currentIndex = careerCoursesRef.current.findIndex(c => c.slug === courseSlug);
          const nextInCareer = careerCoursesRef.current.find((_, index) => index > currentIndex);
          if (nextInCareer) {
            const { data: nextCourseData } = await supabase.from("courses").select("id, name, slug, description, learning_hours").eq("id", nextInCareer.id).maybeSingle();
            if (nextCourseData) {
              setNextCourse(nextCourseData);
              Promise.all([
                supabase.from("course_lessons").select("id, title, description, lesson_rank, is_published, course_id").eq("course_id", nextCourseData.id).is("deleted_at", null).order("lesson_rank", { ascending: true }),
                supabase.from("posts").select("id, title, content, excerpt, slug, published_at, updated_at, lesson_id, post_rank, post_type, status, profiles:author_id (full_name)").eq("category_id", nextCourseData.id).eq("status", "published").order("post_rank", { ascending: true }),
              ]).then(([lessonsRes, postsRes]) => {
                if (lessonsRes.data) setNextCourseLessons(lessonsRes.data);
                if (postsRes.data) setNextCoursePosts(postsRes.data);
              });
            }
          }
        }
      } catch (error) {
        console.error("Error fetching completion data:", error);
      } finally {
        setDataLoading(false);
        setHasLoadedOnce(true);
      }
    };

    fetchData();
  }, [authLoading, isAuthenticated, user, courseSlug, careerSlugForPath, navigate, toast, careerIdParam]);

  const formatHours = (hours: number) => {
    if (hours < 1) { const minutes = Math.round(hours * 60); return `${minutes} min`; }
    return `${hours.toFixed(1)} hrs`;
  };

  // Resolved display name — fast-path uses user metadata, full fetch uses DB profile
  const displayName = learnerName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Learner";

  // ── Certificate download via Canvas API ────────────────────────────────────
  const downloadCertificate = useCallback(() => {
    if (!course || !completionData) return;

    const W = 1400, H = 990;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);

    // Top accent bar (primary green)
    ctx.fillStyle = '#1a5e40';
    ctx.fillRect(0, 0, W, 7);
    ctx.fillRect(0, H - 7, W, 7);

    // Outer hairline border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 7, W - 1, H - 14);

    // Inner decorative border
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 36, W - 56, H - 72);

    // Corner squares
    const cs = 10;
    ctx.fillStyle = '#1a5e40';
    [[28, 36], [W - 28 - cs, 36], [28, H - 36 - cs], [W - 28 - cs, H - 36 - cs]].forEach(([x, y]) => {
      ctx.fillRect(x, y, cs, cs);
    });

    // Platform name
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('UNLOCKMEMORY', W / 2, 100);

    // Title
    ctx.fillStyle = '#111827';
    ctx.font = '700 56px Georgia, "Times New Roman", serif';
    ctx.fillText('Certificate of Completion', W / 2, 200);

    // Gradient divider
    const grad = ctx.createLinearGradient(W / 2 - 320, 0, W / 2 + 320, 0);
    grad.addColorStop(0, 'rgba(26,94,64,0)');
    grad.addColorStop(0.25, 'rgba(26,94,64,0.6)');
    grad.addColorStop(0.75, 'rgba(26,94,64,0.6)');
    grad.addColorStop(1, 'rgba(26,94,64,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 320, 236);
    ctx.lineTo(W / 2 + 320, 236);
    ctx.stroke();

    // "This is to certify that"
    ctx.fillStyle = '#6b7280';
    ctx.font = '22px Georgia, "Times New Roman", serif';
    ctx.fillText('This is to certify that', W / 2, 320);

    // Learner name
    ctx.fillStyle = '#111827';
    ctx.font = '700 60px Georgia, "Times New Roman", serif';
    ctx.fillText(displayName, W / 2, 430);

    // Name underline
    ctx.save();
    const nameW = ctx.measureText(displayName).width;
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameW / 2 - 24, 452);
    ctx.lineTo(W / 2 + nameW / 2 + 24, 452);
    ctx.stroke();
    ctx.restore();

    // "has successfully completed"
    ctx.fillStyle = '#6b7280';
    ctx.font = '22px Georgia, "Times New Roman", serif';
    ctx.fillText('has successfully completed', W / 2, 516);

    // Course name (auto-shrink for long titles)
    ctx.fillStyle = '#1a5e40';
    let courseFontSize = 40;
    ctx.font = `700 ${courseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    while (ctx.measureText(course.name).width > W - 240 && courseFontSize > 22) {
      courseFontSize--;
      ctx.font = `700 ${courseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    }
    ctx.fillText(course.name, W / 2, 606);

    // Completion date
    ctx.fillStyle = '#6b7280';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(`Completed on ${format(completionData.completionDate, 'MMMM d, yyyy')}`, W / 2, 694);

    // Bottom divider
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 220, 740);
    ctx.lineTo(W / 2 + 220, 740);
    ctx.stroke();

    // Footer tagline
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('Issued by UnlockMemory · Verified Achievement', W / 2, 786);

    // Download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${course.slug}-certificate.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');

    toast({ title: "Certificate downloaded!", description: "Saved as a PNG image to your device." });
  }, [course, completionData, displayName, toast]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied!", description: "Share your achievement with others." });
  };

  const handleShareLinkedIn = () => {
    if (!course) return;
    const text = encodeURIComponent(
      `I just completed "${course.name}" on UnlockMemory!\n\nExcited to apply these new skills. #Learning #Achievement #${course.name.replace(/\s+/g, '')}`
    );
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank', 'width=600,height=400');
  };

  const showLoading = hasLoadedOnce ? false : (authLoading || dataLoading);

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

  if (!course || !completionData) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => navigate(`/career-board/${careerSlugForPath}/course/${course.slug}`, {
          state: {
            prefetchedCourse: course,
            prefetchedPosts: navState?.prefetchedPosts ?? null,
            prefetchedLessons: navState?.prefetchedLessons ?? null,
            prefetchedStats: navState?.prefetchedStats ?? null,
            prefetchedLessonMap: navState?.prefetchedLessonMap ?? null,
          },
        })}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Course
      </button>

      {/* ── Celebration header ─────────────────────────────────────────────── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/8 text-primary mb-5">
          <PartyPopper className="h-9 w-9" strokeWidth={1.5} />
        </div>
        <h1 className="text-[32px] sm:text-[38px] font-bold text-foreground tracking-tight mb-2">
          Course Completed!
        </h1>
        <p className="text-lg font-semibold text-primary mb-2">{course.name}</p>
        <p className="text-sm text-muted-foreground mb-3">
          Congratulations on finishing all lessons.
        </p>
        <div className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-3.5 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          Completed on {format(completionData.completionDate, 'MMMM d, yyyy')}
        </div>
      </div>

      {/* ── Certificate ───────────────────────────────────────────────────── */}
      <section className="mb-6">
        {/* Preview */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-border/50 shadow-[0_2px_16px_rgba(0,0,0,0.06)]"
          style={{ aspectRatio: '1.414 / 1', background: '#fff' }}>

          {/* Top + bottom accent bars */}
          <div className="absolute top-0 left-0 right-0 h-[5px] bg-primary" />
          <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-primary" />

          {/* Inner border */}
          <div className="absolute inset-[18px] border border-border/30 rounded-lg pointer-events-none" />

          {/* Corner dots */}
          {[['top-[14px] left-[14px]'], ['top-[14px] right-[14px]'], ['bottom-[14px] left-[14px]'], ['bottom-[14px] right-[14px]']].map(([pos], i) => (
            <div key={i} className={cn("absolute w-2 h-2 rounded-full bg-primary/30", pos)} />
          ))}

          {/* Certificate content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 py-6">
            <p className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground/50 mb-3">
              UnlockMemory
            </p>

            <h2 className="font-serif text-[clamp(14px,3vw,22px)] font-bold text-foreground/90 mb-2 leading-tight">
              Certificate of Completion
            </h2>

            {/* Gradient rule */}
            <div className="w-32 h-px mb-3"
              style={{ background: 'linear-gradient(90deg, transparent, hsl(152 36% 33% / 0.5), transparent)' }} />

            <p className="text-[clamp(8px,1.4vw,11px)] text-muted-foreground mb-1.5">
              This is to certify that
            </p>

            <p className="font-serif text-[clamp(16px,3.5vw,26px)] font-bold text-foreground leading-tight mb-1">
              {displayName}
            </p>

            <div className="w-28 h-px bg-border/60 mb-2" />

            <p className="text-[clamp(8px,1.4vw,11px)] text-muted-foreground mb-1.5">
              has successfully completed
            </p>

            <p className="text-[clamp(11px,2.2vw,16px)] font-bold text-primary leading-tight mb-3 max-w-[80%]">
              {course.name}
            </p>

            <p className="text-[clamp(8px,1.3vw,11px)] text-muted-foreground/60">
              {format(completionData.completionDate, 'MMMM d, yyyy')}
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
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </Button>
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="h-11 w-11 flex-shrink-0 rounded-xl border-border/60 hover:bg-muted/50 p-0"
            title="Copy link"
          >
            {copiedLink
              ? <Check className="h-4 w-4 text-primary" />
              : <Copy className="h-4 w-4 text-muted-foreground" />
            }
          </Button>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 mb-4">
        <h3 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-[0.07em] mb-4">
          Course Summary
        </h3>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: BookOpen, value: String(completionData.lessonsCompleted), label: "Lessons", color: "text-foreground" },
            { icon: Clock,    value: formatHours(completionData.totalHours),   label: "Time Invested", color: "text-foreground" },
            { icon: Target,   value: String(completionData.skills.length),     label: "Skills", color: "text-foreground" },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-muted/40 border border-border/30 text-center">
              <Icon className="h-4 w-4 text-muted-foreground/60 mb-0.5" strokeWidth={1.6} />
              <span className={cn("text-xl font-bold tabular-nums", color)}>{value}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Skills */}
        {completionData.skills.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.07em] mb-2.5">
              Key Skills Learned
            </p>
            <div className="flex flex-wrap gap-1.5">
              {completionData.skills.map((skill, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40 text-[12px] font-medium text-foreground/70">
                  <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                  {skill}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Review prompt ──────────────────────────────────────────────────── */}
      {!courseStats.userReview && (
        <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-foreground mb-0.5">How was this course?</p>
              <p className="text-[12px] text-muted-foreground">Your feedback helps other learners.</p>
            </div>
            <CourseReviewDialog
              reviews={courseReviews}
              averageRating={courseStats.averageRating}
              reviewCount={courseStats.reviewCount}
              userReview={courseStats.userReview}
              isEnrolled={courseStats.isEnrolled}
              isAuthenticated={!!user}
              onSubmitReview={submitReview}
              onDeleteReview={deleteReview}
            >
              <Button variant="outline" size="sm" className="flex-shrink-0 gap-1.5 rounded-lg border-border/60 hover:bg-muted/50">
                <Star className="h-3.5 w-3.5" />
                Rate it
              </Button>
            </CourseReviewDialog>
          </div>
        </section>
      )}

      {/* ── Next course ────────────────────────────────────────────────────── */}
      {nextCourse && (
        <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.07em] mb-3">
            Continue Your Journey
          </p>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] text-muted-foreground mb-0.5">Next Course</p>
              <p className="font-semibold text-foreground truncate">{nextCourse.name}</p>
              {nextCourse.learning_hours && (
                <p className="text-[11px] text-muted-foreground mt-0.5">~{nextCourse.learning_hours} hours</p>
              )}
            </div>
            <Button
              onClick={() => navigate(`/career-board/${careerSlugForPath}/course/${nextCourse.slug}`, {
                state: { prefetchedCourse: nextCourse, prefetchedPosts: nextCoursePosts ?? null, prefetchedLessons: nextCourseLessons ?? null },
              })}
              className="flex-shrink-0 gap-1.5 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-none"
            >
              Start
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

    </div>
  );
};

export default CareerCourseCompleted;
