import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Briefcase, Brain, BookOpen, ArrowRight, Check, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { useToast } from "@/hooks/use-toast";
import type { PricingCourse } from "@/components/pricing/pricingData";

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3,
  Briefcase,
  Brain,
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
  courses: PricingCourse[];
  courseIds: string[];
}

const Careers = () => {
  const [careers, setCareers] = useState<CareerWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
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
        const mapped: CareerWithPrice[] = data.map((c: any) => {
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
            courses,
            courseIds,
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
      title: "✔ Added to your plan",
      description: `${career.name} has been added with ${career.courseCount} courses.`,
    });
    setTimeout(() => setJustAdded(null), 2000);
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

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Choose Your Career Path
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Each career comes with a curated set of courses. Add to your plan, customize, and checkout when ready.
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
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

              return (
                <Card key={career.id} className={`h-full transition-all duration-300 hover:shadow-lg group ${inPlan ? "border-primary/40 ring-1 ring-primary/20" : "border-border hover:border-primary/40"}`}>
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex items-start gap-3 mb-4">
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

                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" /> {career.courseCount} courses
                      </span>
                      {career.discount_percentage && career.discount_percentage > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {career.discount_percentage}% bundle discount
                        </Badge>
                      )}
                    </div>

                    {/* "Added" feedback */}
                    {wasJustAdded && (
                      <div className="flex items-center gap-1.5 text-sm text-primary font-medium mb-3">
                        <Check className="h-4 w-4" />
                        Added to your plan
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground">Starts from</span>
                        <p className="text-xl font-bold text-foreground">
                          {formatPrice(career.basePrice)}
                        </p>
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
