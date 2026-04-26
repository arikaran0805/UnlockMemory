import { useNavigate } from "react-router-dom";
import {
  Play,
  Zap, Rocket, BookOpen,
  Code2, Brain, Database, Bug, BarChart3,
  Lightbulb, Target, Cpu, Globe, Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublishedPracticeSkills } from "@/hooks/usePracticeSkills";
import { useSkillsProgress } from "@/hooks/useSkillsProgress";
import { useActiveLabsProgress } from "@/hooks/useActiveLabsProgress";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────── */

interface PracticeLabProps {
  enrolledCourses: any[];
  userId?: string;
}

/* ─── Icon map ───────────────────────────────────────────────────────── */

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Brain, Database, BarChart3, Lightbulb, Code2,
  Bug, Target, Cpu, Globe, Terminal,
};

/* ─── Gradient palette (matches the reference image palette) ─────────── */

const GRADIENTS = [
  // Deep blue — like the System Design / DSA cards
  "linear-gradient(148deg, #0b1a3a 0%, #142e62 42%, #1e4490 72%, #2558b0 100%)",
  // Forest green
  "linear-gradient(148deg, #0a2a14 0%, #104828 42%, #186838 72%, #22a055 100%)",
  // Amber-orange
  "linear-gradient(148deg, #2d1200 0%, #5c2800 42%, #a04810 72%, #d86820 100%)",
  // Rich purple
  "linear-gradient(148deg, #16082a 0%, #2e1054 42%, #5228a0 72%, #7840d4 100%)",
  // Navy teal
  "linear-gradient(148deg, #041e28 0%, #0a3248 42%, #105a70 72%, #1880a0 100%)",
  // Crimson
  "linear-gradient(148deg, #28060a 0%, #500e14 42%, #941a22 72%, #c82830 100%)",
  // Slate indigo
  "linear-gradient(148deg, #0e1228 0%, #1a2050 42%, #2a3480 72%, #3c4eb0 100%)",
  // Dark teal-green
  "linear-gradient(148deg, #042820 0%, #084838 42%, #10705a 72%, #18a080 100%)",
];

const gradientFor = (index: number) => GRADIENTS[index % GRADIENTS.length];

/* ─── Main component ─────────────────────────────────────────────────── */

export function PracticeLab({ enrolledCourses, userId }: PracticeLabProps) {
  const navigate = useNavigate();

  /* Skills — only published (Live) skills are shown to users */
  const { data: skills, isLoading: skillsLoading } = usePublishedPracticeSkills();
  const skillIds = useMemo(() => (skills ?? []).map((s) => s.id), [skills]);
  const { data: progressMap } = useSkillsProgress(userId, skillIds);

  /* Active labs */
  const enrolledCourseIds = useMemo(
    () => enrolledCourses.map((e) => e.courses?.id).filter(Boolean) as string[],
    [enrolledCourses],
  );
  const { data: labProgressMap, isLoading: labProgressLoading } =
    useActiveLabsProgress(userId, enrolledCourseIds);

  /* Labs where 0 < progress < 100 */
  const activeLabs = useMemo(() => {
    if (!labProgressMap) return [];
    return enrolledCourses.filter((enrollment) => {
      const courseId = enrollment.courses?.id;
      if (!courseId) return false;
      const p = labProgressMap.get(courseId);
      return p && p.percentage > 0 && p.percentage < 100;
    });
  }, [enrolledCourses, labProgressMap]);

  /* Active labs sorted by most recently practiced first */
  const sortedActiveLabs = useMemo(() => {
    if (!activeLabs.length) return [];
    return [...activeLabs].sort((a, b) => {
      const at = labProgressMap?.get(a.courses?.id)?.lastPracticedAt;
      const bt = labProgressMap?.get(b.courses?.id)?.lastPracticedAt;
      return (bt ? new Date(bt).getTime() : 0) - (at ? new Date(at).getTime() : 0);
    });
  }, [activeLabs, labProgressMap]);

  /* Guest / unauthenticated */
  if (!userId) return <EmptyState />;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="space-y-8">

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <PracticeHero
        skillCount={skills?.length ?? 0}
        labCount={activeLabs.length}
        loading={skillsLoading}
      />

      {/* ── Ongoing Labs ───────────────────────────────────────────── */}
      {!labProgressLoading && sortedActiveLabs.length > 0 && (
        <section>
          <h2 className="text-[15px] font-bold tracking-tight text-foreground mb-3">
            Ongoing
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedActiveLabs.map((enrollment, idx) => {
              const course = enrollment.courses;
              if (!course) return null;
              const lp = labProgressMap?.get(course.id);
              return (
                <ExploreCard
                  key={enrollment.id}
                  category="Practice Lab"
                  title={course.name}
                  gradient={gradientFor(idx)}
                  chapters={lp?.total}
                  items={lp?.completed ?? 0}
                  progress={lp?.percentage ?? 0}
                  continueBadge={idx === 0}
                  onClick={() => navigate(`/course/${course.slug}`)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── Featured Skills ────────────────────────────────────────── */}
      <section>
        <h2 className="text-[15px] font-bold tracking-tight text-foreground mb-3">Featured</h2>

        {skillsLoading ? (
          <SkeletonGrid />
        ) : skills && skills.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {skills.map((skill, idx) => {
              const sp = progressMap?.get(skill.id);
              return (
                <ExploreCard
                  key={skill.id}
                  category="Practice Skill"
                  title={skill.name}
                  gradient={gradientFor(idx + 1)}
                  items={sp?.totalProblems ?? 0}
                  progress={sp?.percentage ?? 0}
                  solved={sp?.solvedProblems ?? 0}
                  onClick={() => navigate(`/practice/${skill.slug}`)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No practice skills available yet.
          </p>
        )}
      </section>
    </div>
  );
}

/* ─── ExploreCard ────────────────────────────────────────────────────── */

interface ExploreCardProps {
  category: string;
  title: string;
  gradient: string;
  /** lesson / chapter count */
  chapters?: number;
  /** problems / items count */
  items: number;
  /** 0-100 */
  progress: number;
  /** solved count (skills only) */
  solved?: number;
  /** show "Continue" badge on this card */
  continueBadge?: boolean;
  onClick: () => void;
}

function ExploreCard({
  category,
  title,
  gradient,
  chapters,
  items,
  progress,
  continueBadge,
  onClick,
}: ExploreCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "rounded-xl overflow-hidden cursor-pointer",
        "border border-border/40",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05)]",
        "hover:shadow-[0_8px_24px_rgba(0,0,0,0.10),0_24px_48px_rgba(0,0,0,0.08)]",
        "hover:-translate-y-[4px] active:translate-y-0",
        "transition-all duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
      )}
    >
      {/* ── Banner ─────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ background: gradient, height: 150 }}
      >
        {/* Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />

        {/* Top-left radial light */}
        <div
          className="absolute -top-6 -left-6 w-32 h-32 rounded-full pointer-events-none opacity-35 group-hover:opacity-55 transition-opacity duration-300"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }}
        />

        {/* Decorative circles */}
        <span className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/[0.05] pointer-events-none" />
        <span className="absolute right-4 top-10 w-16 h-16 rounded-full bg-white/[0.04] pointer-events-none" />

        {/* Continue badge */}
        {continueBadge && (
          <div
            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{
              background: "rgba(34,165,93,0.90)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <Play className="w-2.5 h-2.5 text-white fill-white translate-x-[0.5px]" />
            <span className="text-[9px] font-bold text-white tracking-wide uppercase">Continue</span>
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 p-3 h-full flex flex-col">
          {/* Category label */}
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/50 leading-none mb-1.5">
            {category}
          </p>

          {/* Title */}
          <h3 className="text-[16px] font-bold text-white leading-[1.25] line-clamp-3 flex-1">
            {title}
          </h3>
        </div>
      </div>

      {/* ── Progress bar ───────────────────────────────────────────── */}
      <div className="h-[3px] bg-border/30 w-full">
        <div
          className="h-full bg-[#22A55D] transition-all duration-500"
          style={{ width: `${Math.max(progress, progress > 0 ? 4 : 0)}%` }}
        />
      </div>

      {/* ── Progress bar ───────────────────────────────────────────── */}
      <div className="w-full h-[3px] bg-muted/60">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg, #4CAF82, #22C55E)",
          }}
        />
      </div>

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="bg-background px-3 py-3 flex items-center gap-0">
        {chapters !== undefined && (
          <>
            <StatCol value={chapters} label="Chapters" />
            <StatDivider />
          </>
        )}
        <StatCol value={items} label="Items" />
        <StatDivider />
        <StatCol value={`${progress}%`} label="Done" />
      </div>
    </div>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────── */

function PracticeHero({
  skillCount,
  labCount,
  loading,
}: {
  skillCount: number;
  labCount: number;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-border/40 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #edf5ef 0%, #f4f9f5 55%, #f9fbf9 100%)",
      }}
    >
      <div className="px-6 py-7 flex flex-col items-center text-center">
        {/* Eyebrow */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4"
          style={{
            background: "rgba(34,165,93,0.08)",
            border: "1px solid rgba(34,165,93,0.18)",
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full bg-[#22A55D]"
            style={{ boxShadow: "0 0 4px rgba(34,165,93,0.6)" }}
          />
          <span style={{ fontSize: 11, fontWeight: 600, color: "#1a9050", letterSpacing: "0.025em" }}>
            Hands-on skill drills
          </span>
        </div>

        {/* Headline + sub */}
        <h1
          className="text-foreground leading-[1.08] mb-2"
          style={{ fontSize: "clamp(26px, 3.5vw, 36px)", fontWeight: 800, letterSpacing: "-0.03em" }}
        >
          Practice Lab
        </h1>
        <p
          className="text-muted-foreground mb-5 max-w-[480px]"
          style={{ fontSize: 14, lineHeight: 1.65 }}
        >
          Strengthen your skills through targeted exercises and coding challenges —
          tailored to your learning path.
        </p>

        {/* Stats */}
        {!loading && (
          <div className="flex items-center justify-center gap-5">
            <HeroStat value={skillCount} label="Skills" />
            <div className="w-px h-7 rounded-full bg-border/60" />
            <HeroStat value={labCount} label="Labs" />
            <div className="w-px h-7 rounded-full bg-border/60" />
            <HeroStat value="Self-paced" label="Learning" />
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-5">
            {[36, 28, 56].map((w, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="h-4 rounded bg-muted/50 animate-pulse" style={{ width: w }} />
                <div className="h-2.5 w-8 rounded bg-muted/30 animate-pulse" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-foreground font-bold leading-none" style={{ fontSize: 19, letterSpacing: "-0.025em" }}>
        {value}
      </span>
      <span className="font-medium" style={{ fontSize: 11, color: "#22A55D", letterSpacing: "0.01em" }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Stat helpers ───────────────────────────────────────────────────── */

function StatCol({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <span className="text-[18px] font-bold text-foreground tabular-nums leading-none tracking-tight">
        {value}
      </span>
      <span className="text-[9.5px] text-muted-foreground mt-1 leading-none truncate">
        {label || "\u00A0"}
      </span>
    </div>
  );
}

function StatDivider() {
  return <div className="w-px self-stretch bg-border/50 mx-0.5 my-0.5 shrink-0" />;
}

/* ─── Skeleton ───────────────────────────────────────────────────────── */

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden border border-border/30 animate-pulse">
      <div className="bg-muted" style={{ height: 150 }} />
      <div className="bg-background px-3 py-2.5 flex items-center gap-2">
        <div className="h-3.5 w-8 bg-muted rounded flex-1" />
        <div className="w-px h-4 bg-border/40" />
        <div className="h-3.5 w-8 bg-muted rounded flex-1" />
        <div className="w-px h-4 bg-border/40" />
        <div className="h-3.5 w-7 bg-muted rounded flex-1" />
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────── */

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-sm mx-auto px-4">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: GRADIENTS[0] }}>
          <Zap className="h-9 w-9 text-white" />
        </div>

        <h1 className="text-[22px] font-extrabold mb-2 tracking-tight">
          Welcome to Practice Lab
        </h1>
        <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
          Strengthen your skills through hands-on exercises, coding challenges,
          and real-world projects — all personalised to your learning path.
        </p>

        <div className="space-y-2.5">
          <Button size="lg" className="w-full gap-2 rounded-xl h-11">
            <Rocket className="h-4 w-4" />
            Start your first practice
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full gap-2 rounded-xl h-11"
            onClick={() => navigate("/courses")}
          >
            <BookOpen className="h-4 w-4" />
            Explore courses first
          </Button>
        </div>

        {/* What you'll find */}
        <div className="mt-8 pt-7 border-t border-border/50">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/60 mb-4">
            What's inside
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Brain, label: "Quick Drills" },
              { icon: Code2, label: "Code Challenges" },
              { icon: Rocket, label: "Mini Projects" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                  <Icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug text-center">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PracticeLab;
