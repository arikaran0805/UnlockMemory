import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, Briefcase, Brain, BookOpen, ArrowRight, Check,
  Settings2, Star, Flame, Rocket, Users, ChevronDown, ChevronUp,
  ShieldCheck, ArrowUpRight, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { PricingCourse } from "@/components/pricing/pricingData";

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3, Briefcase, Brain,
};

const BADGE_CONFIG: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  popular: { icon: Star, label: "Most Popular", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  trending: { icon: Flame, label: "Trending", className: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  beginner: { icon: Rocket, label: "Beginner Friendly", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
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
        // Fetch enrollment counts
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("course_id");

        const mapped: CareerWithPrice[] = data.map((c: any, index: number) => {
          const coursesRaw = (c.career_courses || [])
            .filter((cc: any) => cc.courses)
            .map((cc: any) => cc.courses);
          const basePrice = coursesRaw.reduce((s: number, co: any) => s + (Number(co.original_price) || 0), 0);
          const courseIds = coursesRaw.map((co: any) => co.id);
          const courses: PricingCourse[] = coursesRaw.map((co: any) => ({
            id: co.id,
            name: co.name,
            description: co.description || "",
            price: Number(co.discount_price) || Number(co.original_price) || 0,
            originalPrice: Number(co.original_price) || 0,
            discountPrice: Number(co.discount_price) || Number(co.original_price) || 0,
          }));

          const discountPct = Number(c.discount_percentage) || 0;
          const savings = discountPct > 0 ? Math.round(basePrice * (discountPct / 100)) : 0;
          const discountedPrice = basePrice - savings;

          // Count enrollments for this career's courses
          const enrollCount = enrollments
            ? enrollments.filter((e: any) => courseIds.includes(e.course_id)).length
            : 0;

          // Assign badge based on index/data (first = popular, etc.)
          let badgeType: string | null = null;
          if (index === 0) badgeType = "popular";
          else if (index === 1) badgeType = "trending";
          else if (coursesRaw.length > 0 && coursesRaw.length <= 4) badgeType = "beginner";

          return {
            id: c.id,
            name: c.name,
            description: c.description,
            icon: c.icon || "BookOpen",
            color: c.color,
            slug: c.slug,
            discount_percentage: c.discount_percentage,
            courseCount: coursesRaw.length,
            basePrice,
            discountedPrice,
            savings,
            courses,
            courseIds,
            badgeType,
            enrollmentCount: enrollCount,
          };
        });
        setCareers(mapped);
      }
      setLoading(false);
    };
    fetchCareers();
  }, []);

  const formatPrice = (amount: number) =>
    `₹${amount.toLocaleString("en-IN")}`;

  const handleAddToPlan = (career: CareerWithPrice) => {
    addCareer({
      id: career.id,
      name: career.name,
      icon: career.icon,
      description: career.description || "",
      discountPercentage: Number(career.discount_percentage) || 0,
      courseIds: career.courseIds,
      courses: career.courses,
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

  const handleReviewPlan = () => {
    navigate("/plan");
  };

  return (
    <Layout>
      <SEOHead
        title="Career Paths | Choose Your Learning Journey"
        description="Explore career paths with curated courses. Pick a career, customize your plan, and start learning."
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Choose Your Career Path
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Each career comes with a curated set of courses. Add to your plan, customize, and checkout when ready.
          </p>

          {/* Compare Careers link */}
          {careers.length > 1 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="link" className="mt-3 text-primary">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Compare Careers
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Compare Career Paths</DialogTitle>
                </DialogHeader>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Career</TableHead>
                      <TableHead className="text-center">Courses</TableHead>
                      <TableHead className="text-center">Bundle Discount</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {careers.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-center">{c.courseCount}</TableCell>
                        <TableCell className="text-center">
                          {c.discount_percentage ? `${c.discount_percentage}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatPrice(c.basePrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        ) : careers.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No career paths available yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {careers.map((career) => {
              const Icon = ICON_MAP[career.icon] || BookOpen;
              const inPlan = isCareerInPlan(career.id);
              const wasJustAdded = justAdded === career.id;
              const isCurrentlyCustomizing = customizingCareerId === career.id;
              const isCoursesExpanded = expandedCourses === career.id;
              const badge = career.badgeType ? BADGE_CONFIG[career.badgeType] : null;

              return (
                <Card
                  key={career.id}
                  className={cn(
                    "h-full transition-all duration-300 hover:shadow-xl group relative overflow-visible",
                    inPlan
                      ? "border-primary ring-2 ring-primary/20 shadow-lg"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {/* Highlight badge */}
                  {badge && (
                    <div className={cn(
                      "absolute -top-2.5 right-4 px-2.5 py-0.5 text-[11px] font-semibold rounded-full border flex items-center gap-1 z-10",
                      badge.className
                    )}>
                      <badge.icon className="h-3 w-3" />
                      {badge.label}
                    </div>
                  )}

                  {/* Added badge */}
                  {inPlan && !wasJustAdded && (
                    <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-primary text-primary-foreground text-[11px] font-medium rounded-full z-10">
                      ✔ In Your Plan
                    </div>
                  )}

                  <CardContent className="p-6 flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-semibold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                          {career.name}
                        </h2>
                        {career.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {career.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Meta row: courses, social proof */}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" /> {career.courseCount} courses
                      </span>
                      {career.enrollmentCount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> {career.enrollmentCount.toLocaleString("en-IN")} learners
                        </span>
                      )}
                    </div>

                    {/* Savings / discount badge */}
                    {career.savings > 0 && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                          {career.discount_percentage}% bundle discount
                        </Badge>
                        <span className="text-xs text-primary font-medium">
                          Save {formatPrice(career.savings)}
                        </span>
                      </div>
                    )}

                    {/* Course preview expandable */}
                    {career.courseCount > 0 && (
                      <div className="mb-3">
                        <button
                          onClick={() => setExpandedCourses(isCoursesExpanded ? null : career.id)}
                          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
                        >
                          {isCoursesExpanded ? "Hide" : "View"} Courses
                          {isCoursesExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {isCoursesExpanded && (
                          <ul className="mt-2 space-y-1.5 pl-1">
                            {career.courses.map((c) => (
                              <li key={c.id} className="flex items-center gap-2 text-sm text-foreground">
                                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">{c.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Just-added overlay */}
                    {wasJustAdded && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3 space-y-2">
                        <p className="text-sm font-medium text-primary flex items-center gap-1.5">
                          <Check className="h-4 w-4" />
                          {career.name} added to your plan
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="default" onClick={() => handleCustomize(career.id)} className="text-xs h-7">
                            Customize Now
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleReviewPlan} className="text-xs h-7">
                            Review Plan
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Footer: Price + CTA */}
                    <div className="mt-auto pt-4 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-xs text-muted-foreground">Starts from</span>
                          <div className="flex items-center gap-2">
                            <p className="text-xl font-bold text-foreground">
                              {formatPrice(career.discountedPrice)}
                            </p>
                            {career.savings > 0 && (
                              <span className="text-sm text-muted-foreground line-through">
                                {formatPrice(career.basePrice)}
                              </span>
                            )}
                          </div>
                        </div>

                        {!inPlan ? (
                          <Button
                            size="sm"
                            onClick={() => handleAddToPlan(career)}
                            className="shrink-0"
                          >
                            Add to Plan
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        ) : isCurrentlyCustomizing ? (
                          <Button size="sm" variant="outline" disabled className="shrink-0">
                            <Settings2 className="h-4 w-4 mr-1" />
                            Customizing
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCustomize(career.id)}
                            className="shrink-0"
                          >
                            Customize
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>

                      {/* Confidence text */}
                      {!inPlan && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-primary/50" />
                          You can customize courses anytime before checkout.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Careers;
