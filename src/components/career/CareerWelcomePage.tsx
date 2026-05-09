/**
 * Career Welcome Page
 *
 * One-time onboarding experience shown the first time a learner enters a career.
 * Design matches CareerCompleted: white cards, primary accents, clean typography.
 */
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Target,
  Award,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Compass,
} from "lucide-react";
import { Career, CareerSkill, useCareers } from "@/hooks/useCareers";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { cn } from "@/lib/utils";

interface CareerWelcomePageProps {
  career: Career;
  skills: CareerSkill[];
  onStart: () => void;
  hasStarted?: boolean;
}

const journeySteps = [
  { icon: BookOpen,   label: "Learn",    description: "Master core concepts through structured courses" },
  { icon: Target,     label: "Practice", description: "Apply skills with hands-on exercises" },
  { icon: TrendingUp, label: "Track",    description: "Monitor your progress with skill metrics" },
  { icon: Award,      label: "Certify",  description: "Earn your career certificate" },
];

const achievements = [
  "Job-ready career competency",
  "Measurable skill proficiency",
  "Official career certificate",
];

const trackingItems = [
  { emoji: "📊", label: "Skill-by-skill progress" },
  { emoji: "🎯", label: "Career readiness score" },
  { emoji: "🏆", label: "Certificate at completion" },
];

export const CareerWelcomePage = ({ career, skills, onStart, hasStarted = false }: CareerWelcomePageProps) => {
  const { careerCourses } = useCareerBoard();
  const { getCareerCourses } = useCareers();

  // Skills from the user's selected plan courses only (via skill_contributions).
  // Falls back to the career_skills prop when courses haven't loaded yet.
  const derivedSkills = useMemo(() => {
    if (!careerCourses.length) return [];
    const selectedIds = new Set(careerCourses.map(c => c.id));
    const seen = new Set<string>();
    const result: string[] = [];
    getCareerCourses(career.id).forEach(cc => {
      if (!selectedIds.has(cc.course?.id ?? '')) return;
      (cc.skill_contributions || []).forEach(s => {
        if (s.skill_name && !seen.has(s.skill_name)) {
          seen.add(s.skill_name);
          result.push(s.skill_name);
        }
      });
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [career.id, careerCourses]);

  const activeSkills = derivedSkills.length > 0 ? derivedSkills : skills.map(s => s.skill_name);
  const displaySkills = activeSkills.slice(0, 4);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl mx-auto px-0 py-10 sm:py-14">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/8 text-primary mb-5">
            <Compass className="h-9 w-9" strokeWidth={1.5} />
          </div>
          <h1 className="text-[32px] sm:text-[38px] font-bold text-foreground tracking-tight mb-3">
            Welcome to {career.name}
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
            {career.description || `Your structured path to becoming a ${career.name} professional.`}
          </p>
        </div>

        {/* ── Journey Steps ────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 mb-4">
          <h3 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-[0.07em] mb-4">
            Your Journey
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {journeySteps.map((step, i) => (
              <div
                key={step.label}
                className="relative flex flex-col items-center text-center p-4 rounded-xl bg-muted/40 border border-border/30"
              >
                <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <step.icon className="h-5 w-5 text-primary mb-2 mt-1" strokeWidth={1.6} />
                <span className="font-semibold text-[13px] text-foreground mb-1">{step.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{step.description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Skills & Achievements ────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {/* Skills You'll Master */}
          <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-[0.07em] mb-4">
              Skills You'll Master
            </h3>
            {displaySkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {displaySkills.map((skillName) => (
                  <div
                    key={skillName}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 border border-border/40 text-[12px] font-medium text-foreground/70"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                    {skillName}
                  </div>
                ))}
                {activeSkills.length > 4 && (
                  <span className="text-[12px] text-muted-foreground self-center">
                    + {activeSkills.length - 4} more skills
                  </span>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">Core skills tailored to this career path</p>
            )}
          </section>

          {/* What You'll Achieve */}
          <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5">
            <h3 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-[0.07em] mb-4">
              What You'll Achieve
            </h3>
            <div className="flex flex-col gap-2.5">
              {achievements.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[13px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="text-foreground/80">{item}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Progress Tracking ────────────────────────────────────────── */}
        <section className="rounded-2xl border border-border/50 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-5 mb-8">
          <h3 className="text-[13px] font-semibold text-foreground/60 uppercase tracking-[0.07em] mb-4">
            How We Track Your Progress
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {trackingItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl bg-muted/40 border border-border/30 text-center"
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <div className="text-center">
          <p className="text-[13px] text-muted-foreground mb-5">
            Move at your own pace — we'll guide you step by step.
          </p>
          <Button
            size="lg"
            onClick={onStart}
            className="h-12 px-8 text-[15px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-none gap-2"
          >
            {hasStarted ? "Continue Your Career Journey" : "Start My Career Journey"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </div>
  );
};

export default CareerWelcomePage;
