import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { useToast } from "@/hooks/use-toast";
import { CareerCard, type CareerWithPrice } from "@/components/career/CareerCard";
import type { PricingCourse } from "@/components/pricing/pricingData";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const Careers = () => {
  const [careers, setCareers] = useState<CareerWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const [expandedCourses, setExpandedCourses] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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
          // Sum of all course discount prices
          const courseDiscountSum = coursesRaw.reduce((s: number, co: any) => s + (Number(co.discount_price) || Number(co.original_price) || 0), 0);
          // Sum of all original prices (for showing savings)
          const basePrice = coursesRaw.reduce((s: number, co: any) => s + (Number(co.original_price) || 0), 0);
          // Apply career discount_percentage on top of course discount sum
          const discountPct = Number(c.discount_percentage) || 0;
          const bundleDiscount = discountPct > 0 && coursesRaw.length >= 2
            ? Math.round(courseDiscountSum * (discountPct / 100))
            : 0;
          const discountedPrice = courseDiscountSum - bundleDiscount;
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

  const filteredCareers = useMemo(() => {
    if (!searchQuery.trim()) return careers;
    const q = searchQuery.toLowerCase();
    return careers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        c.courses.some((course) => course.name.toLowerCase().includes(q))
    );
  }, [careers, searchQuery]);

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

      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-20">
        {/* ── Page Header ── */}
        <div className="text-center mb-12 sm:mb-16 space-y-3">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Choose Your Career Path
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Curated career bundles with everything you need. Add to your plan, customize courses, and start learning.
          </p>
        </div>

        {/* ── Search ── */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search careers or courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-xl border-border/60 bg-card shadow-sm text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8 items-stretch">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[460px] rounded-[20px]" />
            ))}
          </div>
        ) : filteredCareers.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            {searchQuery ? `No careers matching "${searchQuery}"` : "No career paths available yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8 items-stretch">
            {filteredCareers.map((career) => (
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

export default Careers;
