import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Briefcase, Brain, BookOpen, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
}

const Careers = () => {
  const [careers, setCareers] = useState<CareerWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCareers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("careers")
        .select("id, name, description, icon, color, slug, discount_percentage, career_courses(course_id, courses(id, original_price))")
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (!error && data) {
        const mapped: CareerWithPrice[] = data.map((c: any) => {
          const courses = (c.career_courses || [])
            .filter((cc: any) => cc.courses)
            .map((cc: any) => cc.courses);
          const basePrice = courses.reduce((s: number, co: any) => s + (Number(co.original_price) || 0), 0);
          return {
            id: c.id,
            name: c.name,
            description: c.description,
            icon: c.icon || "BookOpen",
            color: c.color,
            slug: c.slug,
            discount_percentage: c.discount_percentage,
            courseCount: courses.length,
            basePrice,
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
            Each career comes with a curated set of courses. Pick a path and customize your learning plan.
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
              return (
                <Link key={career.id} to={`/pricing?career=${career.id}`}>
                  <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/40 group">
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

                      <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                        <div>
                          <span className="text-xs text-muted-foreground">Starts from</span>
                          <p className="text-xl font-bold text-foreground">
                            {formatPrice(career.basePrice)}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          Customize
                          <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Careers;
