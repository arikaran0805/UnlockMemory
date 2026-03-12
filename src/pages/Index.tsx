import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import {
  HeroSection,
  FeaturedCoursesSection,
  WhyChooseUsSection,
  HowItWorksSection,
  TestimonialsSection,
  FinalCTASection,
} from "@/components/landing";

interface FeaturedCourse {
  id: string;
  title: string;
  description: string;
  image: string;
  slug: string;
  level?: string;
  enrollmentCount: number;
  averageRating: number;
}

const Index = () => {
  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [heroHeadline, setHeroHeadline] = useState("Small Steps. Big Learning.");
  const [heroHighlightText, setHeroHighlightText] = useState("Big Learning.");
  const [heroHighlightColor, setHeroHighlightColor] = useState("#10b981");
  const [placeholderTexts, setPlaceholderTexts] = useState<string[]>([
    "Search courses, skills, tools, careers",
  ]);

  useEffect(() => {
    fetchFeaturedCourses();
    fetchSiteSettings();
  }, []);

  const fetchFeaturedCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, slug, description, level, featured_image, status')
      .eq('featured', true)
      .eq('status', 'published')
      .order('name', { ascending: true })
      .limit(6);

    if (!error && data) {
      const coursesWithStats = await Promise.all(
        data.map(async (course: any) => {
          const { count: enrollmentCount } = await supabase
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          const { data: reviews } = await supabase
            .from('course_reviews')
            .select('rating')
            .eq('course_id', course.id);

          const avgRating = reviews && reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0;

          return {
            id: course.id,
            title: course.name,
            description: course.description || 'Explore this course',
            image: course.featured_image || '/placeholder.svg',
            slug: course.slug,
            level: course.level,
            enrollmentCount: enrollmentCount || 0,
            averageRating: avgRating,
          };
        })
      );
      setFeaturedCourses(coursesWithStats);
    }
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('hero_headline, hero_subheadline, hero_highlight_text, hero_highlight_color, search_placeholders')
      .limit(1)
      .maybeSingle();

    if (data) {
      setHeroHeadline(data.hero_headline || "Small Steps. Big Learning.");
      setHeroHighlightText(data.hero_highlight_text || "Big Learning.");
      setHeroHighlightColor(data.hero_highlight_color || "#10b981");
      if ((data as any).search_placeholders && (data as any).search_placeholders.length > 0) {
        setPlaceholderTexts((data as any).search_placeholders);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead />
      <Header />
      <main className="flex-1 pt-16">
        <HeroSection
          heroHeadline={heroHeadline}
          heroHighlightText={heroHighlightText}
          heroHighlightColor={heroHighlightColor}
          placeholderTexts={placeholderTexts}
        />
        <FeaturedCoursesSection courses={featuredCourses} />
        <WhyChooseUsSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FinalCTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
