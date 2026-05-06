/**
 * CareerCompleted - Career Completion Page within Career Board Shell
 *
 * Route: /career-board/:careerId/completed
 */
import { useEffect, useState, useCallback } from "react";
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
        const courseIds = careerCourses.map(cc => cc.id);

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
        const totalHours = totalHoursFromTracking > 0 ? totalHoursFromTracking : 1;

        const skills: string[] =
          skillsResult.data?.map((s: any) => s.skill_name as string) || [];

        const completionDate = dateResult.data?.[0]?.viewed_at
          ? new Date(dateResult.data[0].viewed_at)
          : new Date();

        const courses = careerCourses.map(cc => ({
          id: cc.id,
          name: cc.name,
          slug: cc.slug,
          learning_hours: null as number | null,
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

    // Outer border
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 7, W - 1, H - 14);

    // Inner border
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

    ctx.fillStyle = "#9ca3af";
    ctx.font = '500 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText("UNLOCKMEMORY", W / 2, 100);

    ctx.fillStyle = "#111827";
    ctx.font = '700 52px Georgia, "Times New Roman", serif';
    ctx.fillText("Career Certificate of Completion", W / 2, 190);

    ctx.fillStyle = "#059669";
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText("Full Career Path", W / 2, 234);

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

    ctx.fillStyle = "#6b7280";
    ctx.font = '22px Georgia, "Times New Roman", serif';
    ctx.fillText("This is to certify that", W / 2, 340);

    ctx.fillStyle = "#111827";
    ctx.font = '700 60px Georgia, "Times New Roman", serif';
    ctx.fillText(displayName, W / 2, 450);

    ctx.save();
    const nameW = ctx.measureText(displayName).width;
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - nameW / 2 - 24, 472);
    ctx.lineTo(W / 2 + nameW / 2 + 24, 472);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#6b7280";
    ctx.font = '22px Georgia, "Times New Roman", serif';
    ctx.fillText("has successfully completed the", W / 2, 536);

    ctx.fillStyle = "#064e3b";
    let sz = 44;
    const careerText = `${career.name} Career Path`;
    ctx.font = `700 ${sz}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    while (ctx.measureText(careerText).width > W - 200 && sz > 24) {
      sz--;
      ctx.font = `700 ${sz}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    }
    ctx.fillText(careerText, W / 2, 626);

    ctx.fillStyle = "#6b7280";
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(
      `Completed on ${format(completionData.completionDate, "MMMM d, yyyy")}`,
      W / 2,
      712
    );

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 220, 756);
    ctx.lineTo(W / 2 + 220, 756);
    ctx.stroke();

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
          <div
            className="absolute top-0 left-0 right-0 h-[5px]"
            style={{ background: "linear-gradient(90deg, #064e3b, #059669, #064e3b)" }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[5px]"
            style={{ background: "linear-gradient(90deg, #064e3b, #059669, #064e3b)" }}
          />
          <div className="absolute inset-[18px] border border-border/30 rounded-lg pointer-events-none" />
          {["top-[14px] left-[14px]", "top-[14px] right-[14px]", "bottom-[14px] left-[14px]", "bottom-[14px] right-[14px]"].map((pos, i) => (
            <div key={i} className={cn("absolute w-2 h-2 rounded-sm bg-[#064e3b]/40", pos)} />
          ))}

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
              style={{ background: "linear-gradient(90deg, transparent, hsl(152 36% 33% / 0.4), transparent)" }}
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
          {[
            { icon: GraduationCap, value: String(completionData.totalCourses), label: "Courses" },
            { icon: BookOpen,      value: String(completionData.totalLessons),  label: "Lessons" },
            { icon: Clock,         value: formatHours(completionData.totalHours), label: "Time Invested" },
            { icon: Target,        value: String(completionData.skills.length), label: "Skills" },
          ].map(({ icon: Icon, value, label }) => (
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
