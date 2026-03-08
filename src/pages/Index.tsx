import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import BlogCard from "@/components/BlogCard";
import { ArrowRight, Compass, Search, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

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
  const navigate = useNavigate();
  const [featuredCourses, setFeaturedCourses] = useState<any[]>([]);
  const [heroHeadline, setHeroHeadline] = useState("Master Any Subject");
  const [heroSubheadline, setHeroSubheadline] = useState("Learn through emojis, visuals, and stories that spark clarity and deeper understanding.");
  const [heroHighlightText, setHeroHighlightText] = useState("Any Subject");
  const [heroHighlightColor, setHeroHighlightColor] = useState("#10b981");
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [placeholderTexts, setPlaceholderTexts] = useState<string[]>(["Search courses...", "Find lessons...", "Explore topics...", "Learn something new..."]);
  const [heroQuickLinks, setHeroQuickLinks] = useState<{label: string; slug: string; highlighted: boolean}[]>([]);
  const placeholderIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);

  useEffect(() => {
    const typewriterInterval = setInterval(() => {
      if (placeholderTexts.length === 0) return;
      const currentText = placeholderTexts[placeholderIndex.current];
      
      if (!isDeleting.current) {
        setPlaceholder(currentText.slice(0, charIndex.current + 1));
        charIndex.current++;
        
        if (charIndex.current === currentText.length) {
          isDeleting.current = true;
          setTimeout(() => {}, 1500);
        }
      } else {
        setPlaceholder(currentText.slice(0, charIndex.current - 1));
        charIndex.current--;
        
        if (charIndex.current === 0) {
          isDeleting.current = false;
          placeholderIndex.current = (placeholderIndex.current + 1) % placeholderTexts.length;
        }
      }
    }, isDeleting.current ? 50 : 100);

    return () => clearInterval(typewriterInterval);
  }, [placeholderTexts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Scroll animation hooks
  const heroAnimation = useScrollAnimation({ threshold: 0.2 });
  const coursesAnimation = useScrollAnimation({ threshold: 0.1 });
  const ctaAnimation = useScrollAnimation({ threshold: 0.2 });

  useEffect(() => {
    fetchFeaturedCourses();
    fetchSiteSettings();
  }, []);

  const fetchFeaturedCourses = async () => {
    // Only show published featured courses on public pages
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, slug, description, level, featured_image, status')
      .eq('featured', true)
      .eq('status', 'published')
      .order('name', { ascending: true })
      .limit(6);

    if (!error && data) {
      // Fetch enrollment counts and ratings for each course
      const coursesWithStats = await Promise.all(
        data.map(async (course: any) => {
          // Get enrollment count
          const { count: enrollmentCount } = await supabase
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          // Get average rating
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
            averageRating: avgRating
          };
        })
      );
      setFeaturedCourses(coursesWithStats);
    }
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('hero_headline, hero_subheadline, hero_highlight_text, hero_highlight_color, search_placeholders, hero_quick_links')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setHeroHeadline(data.hero_headline || "Master Any Subject");
      setHeroSubheadline(data.hero_subheadline || "Learn through emojis, visuals, and stories that spark clarity and deeper understanding.");
      setHeroHighlightText(data.hero_highlight_text || "Any Subject");
      setHeroHighlightColor(data.hero_highlight_color || "#10b981");
      if ((data as any).search_placeholders && (data as any).search_placeholders.length > 0) {
        setPlaceholderTexts((data as any).search_placeholders);
      }
      if ((data as any).hero_quick_links && (data as any).hero_quick_links.length > 0) {
        setHeroQuickLinks((data as any).hero_quick_links);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden flex flex-col">
      <SEOHead />
      <Header />
      <main className="flex-1 pt-24">
      <section 
        ref={heroAnimation.ref}
        className={`relative min-h-[90vh] flex items-center overflow-hidden transition-all duration-1000 ${
          heroAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Geometric Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient orbs */}
          <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-gradient-radial from-primary/8 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-gradient-radial from-accent/5 to-transparent rounded-full blur-3xl" />
          
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
        </div>

        <div className="container px-4 relative z-10">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            {/* Main Headline with Curved Line */}
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight">
                <span className="text-foreground">{heroHeadline.replace(heroHighlightText, '')}</span>
                <span 
                  className="relative inline-block"
                  style={{ color: heroHighlightColor }}
                >
                  {heroHighlightText}
                  <svg className="absolute -bottom-2 left-0 w-full h-4" viewBox="0 0 200 12" preserveAspectRatio="none">
                    <path d="M0,8 Q50,0 100,8 T200,8" fill="none" stroke={heroHighlightColor} strokeWidth="3" strokeLinecap="round" className="animate-[dash_2s_ease-in-out_infinite]" />
                  </svg>
                </span>
              </h1>
            </div>

            {/* Search Bar with Green Border */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl mt-4">
              <div className="relative flex items-center h-14 md:h-16 rounded-full border border-border bg-card transition-all duration-300 focus-within:shadow-[0_0_20px_hsl(var(--primary)/0.2)] focus-within:border-primary">
                <input
                  type="text"
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-full pl-6 pr-14 text-lg bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground"
                />
                <button type="submit" className="absolute right-3 p-2 rounded-full text-muted-foreground hover:text-primary hover:ring-1 hover:ring-primary transition-all group/search flex items-center gap-2">
                  <span className="hidden group-hover/search:inline text-sm font-medium">Search Lessons</span>
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Quick Course Links */}
            {heroQuickLinks.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {heroQuickLinks.map((link) => (
                  <Link
                    key={link.slug}
                    to={`/course/${link.slug}`}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      link.highlighted
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="flex justify-center pt-4">
              <Link to="/careers">
                <Button size="lg" className="h-14 px-10 text-lg font-bold rounded-full group bg-gradient-to-r from-primary via-emerald-500 to-teal-500 text-primary-foreground hover:opacity-90 shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300">
                  <span className="flex items-center gap-2">
                    <Compass className="h-5 w-5" />
                    Find Learning Path
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-muted-foreground to-transparent" />
        </div>
      </section>

      {/* Featured Courses - Clean Card Grid */}
      <section 
        ref={coursesAnimation.ref}
        className={`py-12 lg:py-16 relative transition-all duration-1000 delay-200 px-6 md:px-16 lg:px-32 xl:px-52 ${
          coursesAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
        }`}
      >
        <div className="max-w-[1600px] mx-auto">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-3">
                <div className="w-10 h-px bg-primary" />
                <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary">Featured</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                Popular Courses
              </h2>
              <p className="text-muted-foreground max-w-md">
                Start your learning journey with our most popular courses
              </p>
            </div>
            <Link to="/courses" className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
              <span className="font-medium text-foreground">View All Courses</span>
              <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Course Grid - Using BlogCard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCourses.map((course, index) => (
              <div 
                key={course.id}
                style={{ transitionDelay: coursesAnimation.isVisible ? `${index * 100}ms` : '0ms' }}
                className={`transition-all duration-500 ${
                  coursesAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
              >
                <BlogCard
                  title={course.title}
                  excerpt={course.description}
                  category=""
                  image={course.image}
                  date=""
                  author=""
                  slug={course.slug}
                  views={course.enrollmentCount}
                  linkType="category"
                  rating={course.averageRating}
                  level={course.level}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey CTA - Split Layout */}
      <section 
        ref={ctaAnimation.ref}
        className={`relative py-12 lg:py-16 overflow-hidden transition-all duration-1000 delay-300 px-6 md:px-16 lg:px-32 xl:px-52 ${
          ctaAnimation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
        }`}
      >
        <div className="max-w-[1600px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Side - Illustration */}
            <div className="relative order-2 lg:order-1">
              <div className="relative aspect-square max-w-lg mx-auto">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl" />
                
                {/* Main illustration container */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Central card stack */}
                  <div className="relative w-64 h-80">
                    {/* Back cards */}
                    <div className="absolute -left-4 top-4 w-full h-full bg-muted/50 rounded-2xl border border-border rotate-[-8deg]" />
                    <div className="absolute -right-4 top-2 w-full h-full bg-muted/30 rounded-2xl border border-border rotate-[5deg]" />
                    
                    {/* Main card */}
                    <div className="relative w-full h-full bg-card rounded-2xl border-2 border-primary/20 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
                      <div className="relative p-6 h-full flex flex-col">
                        {/* Card header */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-3 h-3 rounded-full bg-primary/60" />
                          <div className="w-3 h-3 rounded-full bg-accent/60" />
                          <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                        </div>
                        
                        {/* Content lines */}
                        <div className="space-y-3 flex-1">
                          <div className="h-4 bg-foreground/10 rounded w-3/4" />
                          <div className="h-4 bg-foreground/10 rounded w-full" />
                          <div className="h-4 bg-foreground/10 rounded w-5/6" />
                          <div className="h-4 bg-foreground/10 rounded w-2/3" />
                        </div>
                        
                        {/* Card emoji */}
                        <div className="absolute bottom-6 right-6 text-6xl opacity-20">📚</div>
                        
                        {/* Progress bar */}
                        <div className="mt-auto">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full w-3/4 bg-gradient-to-r from-primary to-accent rounded-full" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">75% Complete</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating elements */}
                  <div className="absolute top-8 right-8 w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center animate-[bounce_3s_ease-in-out_infinite]">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <div className="absolute bottom-12 left-4 w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center animate-[bounce_4s_ease-in-out_infinite_0.5s]">
                    <span className="text-2xl">✨</span>
                  </div>
                  <div className="absolute top-1/4 left-0 w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center shadow-lg animate-[bounce_3.5s_ease-in-out_infinite_1s]">
                    <span className="text-xl">💡</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Side - Content */}
            <div className="order-1 lg:order-2 space-y-8">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-3">
                <div className="w-12 h-px bg-primary" />
                <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary">Start Today</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Begin Your<br />
                <span className="text-primary">Learning Journey</span>
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
                Join a community of curious minds exploring knowledge through engaging visual experiences. Start for free and unlock your potential.
              </p>
              
              {/* Features list */}
              <div className="grid grid-cols-2 gap-4">
                {["Free to Start", "Self-Paced Learning", "Visual Content", "Track Progress"].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Star className="w-4 h-4 text-primary fill-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
              
              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/courses">
                  <Button size="lg" className="h-14 px-8 text-base font-bold bg-foreground text-background hover:bg-foreground/90 rounded-xl group">
                    Start Learning Free
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link to="/courses">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-xl border-2 border-border hover:bg-muted transition-colors">
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
