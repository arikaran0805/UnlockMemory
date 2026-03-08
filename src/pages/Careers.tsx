import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, Briefcase, Brain, BookOpen, ArrowRight, Check,
  Settings2, Star, Flame, Rocket, Users, ChevronDown, ChevronUp,
  ShieldCheck, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { useToast } from "@/hooks/use-toast";
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

interface CareerWithPrice {
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

const Careers = () => {
  const [careers, setCareers] = useState<CareerWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<string | null>(null);
  const { addCareer, isCareerInPlan, customizingCareerId, setCustomizingCareerId } = useCareerPlan();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCareers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("careers")
        .select("id, name, description, icon, color, slug, discount_percentage, career_courses(course_id, courses(id, name, description, original_price, discount_price))")
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (!error && data) {
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("course_id");

        const mapped: CareerWithPrice[] = data.map((c: any, index: number) => {
          const coursesRaw = (c.career_courses || [])
            .filter((cc: any) => cc.courses)
            .map((cc: any) => cc.courses);
          const basePrice = coursesRaw.reduce((s: number, co: any) => s + (Number(co.original_price) || 0), 0);
          const discountedPrice = coursesRaw.reduce((s: number, co: any) => s + (Number(co.discount_price) || Number(co.original_price) || 0), 0);
          const savings = basePrice - discountedPrice;
          const courseIds = coursesRaw.map((co: any) => co.id);
          const courses: PricingCourse[] = coursesRaw.map((co: any) => ({
            id: co.id,
            name: co.name,
            description: co.description || "",
            price: Number(co.discount_price) || Number(co.original_price) || 0,
            originalPrice: Number(co.original_price) || 0,
            discountPrice: Number(co.discount_price) || Number(co.original_price) || 0,
          }));
          const enrollCount = enrollments
            ? enrollments.filter((e: any) => courseIds.includes(e.course_id)).length
            : 0;

          let badgeType: string | null = null;
          if (index === 0) badgeType = "popular";
          else if (index === 1) badgeType = "trending";
          else if (coursesRaw.length > 0 && coursesRaw.length <= 4) badgeType = "beginner";

          return {
            id: c.id, name: c.name, description: c.description,
            icon: c.icon || "BookOpen", color: c.color, slug: c.slug,
            discount_percentage: c.discount_percentage,
            courseCount: coursesRaw.length, basePrice, discountedPrice, savings,
            courses, courseIds, badgeType, enrollmentCount: enrollCount,
          };
        });
        setCareers(mapped);
      }
      setLoading(false);
    };
    fetchCareers();
  }, []);

  const fmt = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

  const handleAddToPlan = (career: CareerWithPrice) => {
    addCareer({
      id: career.id, name: career.name, icon: career.icon,
      description: career.description || "",
      discountPercentage: Number(career.discount_percentage) || 0,
      courseIds: career.courseIds, courses: career.courses,
    });
    setJustAdded(career.id);
    toast({
      title: `✔ ${career.name} added to your plan`,
      description: `${career.courseCount} courses included. Customize anytime.`,
    });
  };

  const handleCustomize = (careerId: string) => {
    setCustomizingCareerId(careerId);
    navigate(`/plan`);
  };

  return (
    <Layout>
      <SEOHead
        title="Career Paths | Choose Your Learning Journey"
        description="Explore career paths with curated courses. Pick a career, customize your plan, and start learning."
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16">
        {/* ── Page Header ── */}
        <div className="text-center mb-14 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Choose Your Career Path
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Curated career bundles with everything you need. Add to your plan, customize courses, and start learning.
          </p>

        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[420px] rounded-2xl" />
            ))}
          </div>
        ) : careers.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No career paths available yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {careers.map((career) => (
              <CareerCard
                key={career.id}
                career={career}
                inPlan={isCareerInPlan(career.id)}
                wasJustAdded={justAdded === career.id}
                isCurrentlyCustomizing={customizingCareerId === career.id}
                isCoursesExpanded={expandedCourses === career.id}
                onToggleCourses={() => setExpandedCourses(expandedCourses === career.id ? null : career.id)}
                onAddToPlan={() => handleAddToPlan(career)}
                onCustomize={() => handleCustomize(career.id)}
                onReviewPlan={() => navigate("/plan")}
                fmt={fmt}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

/* ─────────────────────── Career Card ─────────────────────── */
function CareerCard({
  career, inPlan, wasJustAdded, isCurrentlyCustomizing,
  isCoursesExpanded, onToggleCourses,
  onAddToPlan, onCustomize, onReviewPlan, fmt,
}: {
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
}) {
  const Icon = ICON_MAP[career.icon] || BookOpen;
  const badge = career.badgeType ? BADGE_CONFIG[career.badgeType] : null;
  const previewCourses = isCoursesExpanded ? career.courses : career.courses.slice(0, 3);
  const hasMoreCourses = career.courses.length > 3;

  return (
    <div
      className={cn(
        "relative group flex flex-col rounded-[20px] border bg-card transition-all duration-[250ms]",
        "shadow-[0_1px_3px_0_hsl(var(--foreground)/0.04),0_4px_12px_0_hsl(var(--foreground)/0.03)]",
        "hover:shadow-[0_8px_30px_0_hsl(var(--foreground)/0.08)] hover:-translate-y-1",
        inPlan
          ? "border-primary/50 ring-2 ring-primary/15"
          : "border-border/60 hover:border-primary/30"
      )}
    >
      {/* ── Badge row ── */}
      {(badge || (inPlan && !wasJustAdded)) && (
        <div className="flex items-center gap-2 px-7 pt-5 pb-0">
          {badge && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold",
              badge.bg, badge.text
            )}>
              <badge.icon className="h-3 w-3" />
              {badge.label}
            </span>
          )}
          {inPlan && !wasJustAdded && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
              <Check className="h-3 w-3" />
              In Your Plan
            </span>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 px-7 pt-5 pb-7 space-y-5">
        {/* Title + Icon */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/8 text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors duration-200">
              {career.name}
            </h2>
          </div>
          {career.description && (
            <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
              {career.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" />
            {career.courseCount} courses
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Self-paced
          </span>
          {career.enrollmentCount > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {career.enrollmentCount.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Course preview */}
        {career.courseCount > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Includes</p>
            <ul className="space-y-1.5">
              {previewCourses.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-[13px] text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{c.name}</span>
                </li>
              ))}
            </ul>
            {hasMoreCourses && (
              <button
                onClick={onToggleCourses}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline pt-0.5"
              >
                {isCoursesExpanded ? (
                  <>Show less <ChevronUp className="h-3 w-3" /></>
                ) : (
                  <>+{career.courses.length - 3} more <ChevronDown className="h-3 w-3" /></>
                )}
              </button>
            )}
          </div>
        )}

        {/* Spacer to push footer down */}
        <div className="flex-1" />

        {/* ── Price Section ── */}
        <div className="space-y-1 pt-4 border-t border-border/50">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl font-extrabold tracking-tight text-foreground">
              {fmt(career.discountedPrice)}
            </span>
            {career.savings > 0 && (
              <span className="text-sm text-muted-foreground line-through">
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

        {/* ── Just-added actions ── */}
        {wasJustAdded && (
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 space-y-3 animate-fade-in">
            <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
              <Check className="h-4 w-4" />
              Added to your plan
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onCustomize} className="flex-1 h-9 text-xs font-semibold">
                Customize Now
              </Button>
              <Button size="sm" variant="outline" onClick={onReviewPlan} className="flex-1 h-9 text-xs font-semibold">
                Review Plan
              </Button>
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        {!wasJustAdded && (
          <div className="space-y-2.5">
            {!inPlan ? (
              <Button
                onClick={onAddToPlan}
                className="w-full h-11 text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-md"
              >
                Add to Plan
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={onCustomize}
                disabled={isCurrentlyCustomizing}
                className="w-full h-11 text-sm font-semibold rounded-xl"
              >
                {isCurrentlyCustomizing ? (
                  <>
                    <Settings2 className="h-4 w-4 mr-1.5" />
                    Customizing
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
              <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <ShieldCheck className="h-3 w-3 text-primary/40" />
                Customize courses anytime before checkout
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Careers;
