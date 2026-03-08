import {
  BarChart3, Briefcase, Brain, BookOpen, ArrowRight, Check,
  Settings2, Star, Flame, Rocket, Users, ChevronDown, ChevronUp,
  ShieldCheck, Clock, Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PricingCourse } from "@/components/pricing/pricingData";

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3, Briefcase, Brain,
};

const BADGE_CONFIG: Record<string, { icon: React.ElementType; label: string; bg: string; text: string }> = {
  popular: { icon: Star, label: "Most Popular", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  trending: { icon: Flame, label: "Trending", bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  beginner: { icon: Rocket, label: "Beginner Friendly", bg: "bg-sky-50 dark:bg-sky-500/10", text: "text-sky-600 dark:text-sky-400" },
};

export interface CareerWithPrice {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  slug: string;
  discount_percentage: number | null;
  courseCount: number;
  basePrice: number;
  discountedPrice: number;
  savings: number;
  courses: PricingCourse[];
  courseIds: string[];
  badgeType: string | null;
  enrollmentCount: number;
}

interface CareerCardProps {
  career: CareerWithPrice;
  inPlan: boolean;
  wasJustAdded: boolean;
  isCurrentlyCustomizing: boolean;
  isCoursesExpanded: boolean;
  onToggleCourses: () => void;
  onAddToPlan: () => void;
  onCustomize: () => void;
  onReviewPlan: () => void;
  fmt: (n: number) => string;
}

export function CareerCard({
  career, inPlan, wasJustAdded, isCurrentlyCustomizing,
  isCoursesExpanded, onToggleCourses,
  onAddToPlan, onCustomize, onReviewPlan, fmt,
}: CareerCardProps) {
  const Icon = ICON_MAP[career.icon] || BookOpen;
  const badge = career.badgeType ? BADGE_CONFIG[career.badgeType] : null;
  const previewCourses = isCoursesExpanded ? career.courses : career.courses.slice(0, 3);
  const hasMoreCourses = career.courses.length > 3;

  return (
    <div
      className={cn(
        "relative group flex flex-col h-full rounded-[20px] border bg-card",
        "transition-all duration-[250ms] ease-out will-change-transform",
        "shadow-[0_1px_2px_0_hsl(var(--foreground)/0.03),0_2px_8px_0_hsl(var(--foreground)/0.04),0_6px_20px_0_hsl(var(--foreground)/0.03)]",
        "hover:shadow-[0_4px_12px_0_hsl(var(--foreground)/0.06),0_12px_40px_0_hsl(var(--foreground)/0.10)] hover:-translate-y-1.5",
        inPlan
          ? "border-primary/40 ring-2 ring-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.08),0_4px_16px_0_hsl(var(--primary)/0.08)]"
          : "border-border/50 hover:border-primary/25"
      )}
    >
      {/* ── Badge row ── */}
      <div className="min-h-[36px] flex items-center gap-2 px-6 pt-5">
        {badge && (
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide",
            badge.bg, badge.text
          )}>
            <badge.icon className="h-3 w-3" />
            {badge.label}
          </span>
        )}
        {inPlan && !wasJustAdded && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/8 text-primary">
            <Check className="h-3 w-3" />
            In Your Plan
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-6 pt-2 pb-6">
        {/* Header: Icon + Title + Description */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/6 text-primary shrink-0 transition-colors duration-200 group-hover:bg-primary/10">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-[1.15rem] font-bold text-foreground tracking-tight leading-snug group-hover:text-primary transition-colors duration-200">
              {career.name}
            </h2>
          </div>
          {career.description && (
            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2 pl-0.5">
              {career.description}
            </p>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3.5 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" />
            {career.courseCount} course{career.courseCount !== 1 ? "s" : ""}
          </span>
          <span className="w-px h-3 bg-border/60" />
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
            Self-paced
          </span>
          {career.enrollmentCount > 0 && (
            <>
              <span className="w-px h-3 bg-border/60" />
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground/70" />
                {career.enrollmentCount.toLocaleString("en-IN")}
              </span>
            </>
          )}
        </div>

        {/* Course preview */}
        <div className="mb-auto">
          {career.courseCount > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Includes</p>
              <ul className="space-y-1.5">
                {previewCourses.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-[13px] text-foreground/90">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{c.name}</span>
                  </li>
                ))}
              </ul>
              {hasMoreCourses && (
                <button
                  onClick={onToggleCourses}
                  className="text-xs text-primary/80 font-medium flex items-center gap-1 hover:text-primary transition-colors pt-0.5"
                >
                  {isCoursesExpanded ? (
                    <>Show less <ChevronUp className="h-3 w-3" /></>
                  ) : (
                    <>+{career.courses.length - 3} more <ChevronDown className="h-3 w-3" /></>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground/60 italic">Curriculum in progress</p>
            </div>
          )}
        </div>

        {/* ── Footer: Price + CTA (pinned to bottom) ── */}
        <div className="mt-5 pt-4 border-t border-border/40 space-y-3.5">
          {/* Price */}
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2.5">
              <span className="text-[1.6rem] font-extrabold tracking-tight text-foreground leading-none">
                {fmt(career.discountedPrice)}
              </span>
              {career.savings > 0 && (
                <span className="text-sm text-muted-foreground/70 line-through">
                  {fmt(career.basePrice)}
                </span>
              )}
            </div>
            {career.savings > 0 && (
              <p className="text-xs font-medium text-primary flex items-center gap-1">
                You save {fmt(career.savings)} with this bundle
              </p>
            )}
          </div>

          {/* Just-added state */}
          {wasJustAdded && (
            <div className="rounded-xl bg-primary/5 border border-primary/12 p-3.5 space-y-2.5 animate-fade-in">
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                Added to your plan
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={onCustomize} className="flex-1 h-9 text-xs font-semibold rounded-lg">
                  Customize Now
                </Button>
                <Button size="sm" variant="outline" onClick={onReviewPlan} className="flex-1 h-9 text-xs font-semibold rounded-lg">
                  Review Plan
                </Button>
              </div>
            </div>
          )}

          {/* CTA */}
          {!wasJustAdded && (
            <div className="space-y-2">
              {!inPlan ? (
                <Button
                  onClick={onAddToPlan}
                  className="w-full h-11 text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                >
                  Add to Plan
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={onCustomize}
                  className="w-full h-11 text-sm font-semibold rounded-xl transition-all duration-200"
                >
                  {isCurrentlyCustomizing ? (
                    <>
                      <Settings2 className="h-4 w-4 mr-1.5" />
                      Customizing…
                    </>
                  ) : (
                    <>
                      Customize Plan
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              )}
              {!inPlan && (
                <p className="text-[10px] text-muted-foreground/60 text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-primary/30" />
                  Customize courses anytime before checkout
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
