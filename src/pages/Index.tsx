import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import BlogCard from "@/components/BlogCard";
import {
  ArrowRight, BookOpen, Users, Star, Zap, Target,
  CheckCircle, BarChart3, GraduationCap, Brain,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Hero Visual Mockup ───────────────────────────────────────────────────────

const HeroVisual = () => (
  <div className="relative w-full max-w-md mx-auto select-none">
    {/* Soft glow behind the card stack */}
    <div className="absolute inset-8 bg-primary/20 rounded-3xl blur-3xl pointer-events-none" />

    {/* Background card */}
    <div className="absolute top-6 left-6 right-0 bottom-0 rounded-2xl border border-border bg-card/60 rotate-[3deg] shadow-sm" />

    {/* Main card */}
    <div className="relative rounded-2xl border border-border bg-card shadow-[0_8px_40px_rgba(0,0,0,0.10)] overflow-hidden">
      {/* Card header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/70" />
          <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wide">
            Python Fundamentals
          </span>
        </div>
        <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Beginner
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Progress block */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-foreground/70">Course Progress</span>
            <span className="text-[12px] font-bold text-primary">72%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-primary to-primary/70" />
          </div>
        </div>

        {/* Lesson list */}
        <div className="space-y-2">
          {[
            { label: "Variables & Data Types", done: true },
            { label: "Control Flow", done: true },
            { label: "Functions & Scope", done: false },
          ].map((lesson) => (
            <div
              key={lesson.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-[12px] font-medium transition-colors ${lesson.done
                  ? "border-primary/20 bg-primary/[0.04] text-foreground/60 line-through"
                  : "border-border bg-muted/30 text-foreground"
                }`}
            >
              <CheckCircle
                className={`h-3.5 w-3.5 flex-shrink-0 ${lesson.done ? "text-primary" : "text-muted-foreground/30"}`}
              />
              {lesson.label}
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>2,841 learners</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-500">
            <Star className="h-3 w-3 fill-current" />
            <span className="font-semibold">4.9</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            <span>12 lessons</span>
          </div>
        </div>
      </div>
    </div>

    {/* Floating achievement badge */}
    <div className="absolute -top-4 -right-4 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
        <span className="text-sm">🏆</span>
      </div>
      <div>
        <p className="text-[10px] font-bold text-foreground leading-tight">Achievement</p>
        <p className="text-[9.5px] text-muted-foreground leading-tight">First lesson done!</p>
      </div>
    </div>

    {/* Floating streak badge */}
    <div className="absolute -bottom-4 -left-4 flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
        <Zap className="h-3.5 w-3.5 text-primary" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-foreground leading-tight">7-Day Streak</p>
        <p className="text-[9.5px] text-muted-foreground leading-tight">Keep it up!</p>
      </div>
    </div>
  </div>
);

// ─── Page Component ───────────────────────────────────────────────────────────

const Index = () => {
  const navigate = useNavigate();
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const handleAnnouncementVisibility = useCallback((visible: boolean) => {
    setShowAnnouncement(visible);
  }, []);

  const [featuredCourses, setFeaturedCourses] = useState<FeaturedCourse[]>([]);
  const [heroHeadline, setHeroHeadline] = useState("Master Any Subject");
  const [heroSubheadline, setHeroSubheadline] = useState(
    "Learn through visuals and stories that spark clarity and deeper understanding.",
  );
  const [heroHighlightText, setHeroHighlightText] = useState("Any Subject");
  const [heroHighlightColor, setHeroHighlightColor] = useState("#10b981");

  const heroAnimation = useScrollAnimation({ threshold: 0.1 });
  const statsAnimation = useScrollAnimation({ threshold: 0.1 });
  const coursesAnimation = useScrollAnimation({ threshold: 0.1 });
  const featuresAnimation = useScrollAnimation({ threshold: 0.1 });
  const ctaAnimation = useScrollAnimation({ threshold: 0.1 });

  useEffect(() => {
    fetchFeaturedCourses();
    fetchSiteSettings();
  }, []);

  const fetchFeaturedCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("id, name, slug, description, level, featured_image, status")
      .eq("featured", true)
      .eq("status", "published")
      .order("name", { ascending: true })
      .limit(6);

    if (!error && data) {
      const coursesWithStats = await Promise.all(
        data.map(async (course: any) => {
          const { count: enrollmentCount } = await supabase
            .from("course_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("course_id", course.id);

          const { data: reviews } = await supabase
            .from("course_reviews")
            .select("rating")
            .eq("course_id", course.id);

          const avgRating =
            reviews && reviews.length > 0
              ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
              : 0;

          return {
            id: course.id,
            title: course.name,
            description: course.description || "Explore this course",
            image: course.featured_image || "/placeholder.svg",
            slug: course.slug,
            level: course.level,
            enrollmentCount: enrollmentCount || 0,
            averageRating: avgRating,
          };
        }),
      );
      setFeaturedCourses(coursesWithStats);
    }
  };

  const fetchSiteSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select(
        "hero_headline, hero_subheadline, hero_highlight_text, hero_highlight_color, search_placeholders, hero_quick_links",
      )
      .limit(1)
      .maybeSingle();

    if (data) {
      setHeroHeadline(data.hero_headline || "Master Any Subject");
      setHeroSubheadline(
        data.hero_subheadline ||
        "Learn through visuals and stories that spark clarity and deeper understanding.",
      );
      setHeroHighlightText(data.hero_highlight_text || "Any Subject");
      setHeroHighlightColor(data.hero_highlight_color || "#10b981");
    }
  };

  // Headline: inject highlight span around highlight text
  const renderHeadline = () => {
    const parts = heroHeadline.split(heroHighlightText);
    if (parts.length < 2) {
      return <span className="text-foreground">{heroHeadline}</span>;
    }
    return (
      <>
        <span className="text-foreground">{parts[0]}</span>
        <span style={{ color: heroHighlightColor }}>{heroHighlightText}</span>
        <span className="text-foreground">{parts[1]}</span>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead />

      <div className="fixed top-0 left-0 right-0 z-[60]">
        <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
      </div>
      <Header announcementVisible={showAnnouncement} />

      <main className={`flex-1 ${showAnnouncement ? "pt-[152px]" : "pt-[104px]"}`}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section
          ref={heroAnimation.ref}
          className="relative min-h-[calc(100vh-96px)] flex items-center overflow-hidden"
        >
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.5)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.5)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40 pointer-events-none" />
          {/* Green glow — bottom-left */}
          <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />
          {/* Green glow — top-right */}
          <div className="absolute -top-24 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

          <div className="container px-6 lg:px-12 xl:px-20 mx-auto relative z-10">
            <div
              className={`grid lg:grid-cols-[55fr_45fr] gap-16 xl:gap-24 items-center transition-all duration-1000 ${heroAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              {/* LEFT: Content */}
              <div className="space-y-8 max-w-2xl">
                {/* Headline */}
                <div className="space-y-2">
                  <h1 className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tight leading-[1.05]">
                    {renderHeadline()}
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-lg pt-2">
                    {heroSubheadline}
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link to="/courses">
                    <Button
                      size="lg"
                      className="h-12 px-7 text-[15px] font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_24px_hsl(var(--primary)/0.35)] hover:shadow-[0_6px_32px_hsl(var(--primary)/0.45)] transition-all duration-200 group"
                    >
                      Start Learning Free
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/courses">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 px-7 text-[15px] font-bold rounded-xl border-border hover:border-primary/40 hover:bg-muted/50 transition-all duration-200"
                    >
                      Browse Courses
                    </Button>
                  </Link>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-8 pt-4 border-t border-border/60">
                  {[
                    { value: "5,000+", label: "Active Learners" },
                    { value: "50+", label: "Courses" },
                    { value: "4.9★", label: "Avg Rating" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="text-2xl font-black text-foreground leading-tight">{stat.value}</p>
                      <p className="text-[11.5px] text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Mascot */}
              <div className="hidden lg:flex items-center justify-center py-8">
                <div className="relative w-full max-w-md mx-auto select-none">
                  {/* Soft glow behind mascot */}
                  <div className="absolute inset-12 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                  <img
                    src="/Hero_Ant.svg"
                    alt="UnlockMemory mascot"
                    className="relative w-full h-auto drop-shadow-2xl"
                    style={{ animation: "heroFloat 4s ease-in-out infinite" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF STRIP ───────────────────────────────────────────── */}
        <section
          ref={statsAnimation.ref}
          className={`border-y border-border/60 bg-muted/20 transition-all duration-700 ${statsAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
        >
          <div className="container px-6 lg:px-12 xl:px-20 mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5">
              <div className="flex items-center gap-3">
                {/* Avatar stack */}
                <div className="flex -space-x-2">
                  {["A", "K", "M", "R", "S"].map((initial, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary"
                    >
                      {initial}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">5,000+ learners</span> already enrolled
                </span>
              </div>

              <div className="flex items-center gap-6">
                {["Python", "Data Science", "AI & ML", "Database", "Web Dev"].map((tag) => (
                  <Link
                    key={tag}
                    to={`/courses`}
                    className="text-[12.5px] font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURED COURSES ─────────────────────────────────────────────── */}
        {featuredCourses.length > 0 && (
          <section
            ref={coursesAnimation.ref}
            className={`py-20 lg:py-28 transition-all duration-1000 delay-100 ${coursesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
          >
            <div className="container px-6 lg:px-12 xl:px-20 mx-auto">
              {/* Section header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-px bg-primary" />
                    <span className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-primary">
                      Featured
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                    Popular Courses
                  </h2>
                  <p className="text-muted-foreground max-w-md text-[15px]">
                    Handpicked courses to start or deepen your learning journey.
                  </p>
                </div>
                <Link
                  to="/courses"
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-all text-sm font-semibold"
                >
                  View All Courses
                  <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredCourses.map((course, index) => (
                  <div
                    key={course.id}
                    style={{
                      transitionDelay: coursesAnimation.isVisible ? `${index * 80}ms` : "0ms",
                    }}
                    className={`transition-all duration-500 ${coursesAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
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
        )}

        {/* ── WHY UNLOCKMEMORY ─────────────────────────────────────────────── */}
        <section
          ref={featuresAnimation.ref}
          className={`py-20 lg:py-28 bg-muted/20 border-y border-border/50 transition-all duration-1000 delay-100 ${featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
        >
          <div className="container px-6 lg:px-12 xl:px-20 mx-auto">
            {/* Header */}
            <div className="max-w-xl mb-14 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-px bg-primary" />
                <span className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-primary">
                  Why Us
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
                Built for how you<br />actually learn
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  Icon: Brain,
                  title: "Visual-First Content",
                  description:
                    "Every concept is explained with visuals, diagrams, and real-world examples — not walls of text.",
                },
                {
                  Icon: Target,
                  title: "Structured Paths",
                  description:
                    "Follow carefully curated learning paths from beginner to advanced. No guesswork about what to learn next.",
                },
                {
                  Icon: BarChart3,
                  title: "Track Your Progress",
                  description:
                    "See exactly where you are in each course. Checkpoints and quizzes keep you accountable.",
                },
                {
                  Icon: GraduationCap,
                  title: "Self-Paced Learning",
                  description:
                    "Learn on your schedule. Pause, rewind, and revisit any lesson as many times as you need.",
                },
                {
                  Icon: Zap,
                  title: "Instant Feedback",
                  description:
                    "Interactive checkpoints give you real-time feedback so you know exactly what you've mastered.",
                },
                {
                  Icon: BookOpen,
                  title: "Free to Start",
                  description:
                    "Access dozens of courses completely free. No credit card, no hidden fees — just start learning.",
                },
              ].map(({ Icon, title, description }, i) => (
                <div
                  key={title}
                  style={{
                    transitionDelay: featuresAnimation.isVisible ? `${i * 60}ms` : "0ms",
                  }}
                  className={`group p-6 rounded-2xl border border-border/60 bg-card hover:border-primary/30 hover:shadow-[0_4px_24px_hsl(var(--primary)/0.07)] transition-all duration-200 ${featuresAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                    }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-[15px] font-bold text-foreground mb-2">{title}</h3>
                  <p className="text-[13.5px] text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
        <section
          ref={ctaAnimation.ref}
          className={`py-20 lg:py-28 transition-all duration-1000 delay-100 ${ctaAnimation.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
        >
          <div className="container px-6 lg:px-12 xl:px-20 mx-auto">
            <div className="relative rounded-3xl overflow-hidden bg-foreground px-8 py-16 md:px-16 md:py-20 text-center">
              {/* Subtle green tint top-left */}
              <div className="absolute top-0 left-0 w-80 h-80 bg-primary/15 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
              {/* Subtle green tint bottom-right */}
              <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

              <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-background leading-tight">
                  Ready to unlock<br />
                  <span className="text-primary">your potential?</span>
                </h2>
                <p className="text-[15px] text-background/60 leading-relaxed">
                  Join thousands of learners who've already started their journey.
                  It's free — no credit card required.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link to="/courses">
                    <Button
                      size="lg"
                      className="h-12 px-8 text-[15px] font-bold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_24px_hsl(var(--primary)/0.4)] transition-all duration-200 group"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/courses">
                    <Button
                      size="lg"
                      variant="ghost"
                      className="h-12 px-8 text-[15px] font-bold rounded-xl text-background/70 hover:text-background hover:bg-white/10 transition-all duration-200"
                    >
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
