import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, Compass } from "lucide-react";

interface HeroSectionProps {
  heroHeadline: string;
  heroHighlightText: string;
  heroHighlightColor: string;
  placeholderTexts: string[];
}

const HeroSection = ({ heroHeadline, heroHighlightText, heroHighlightColor, placeholderTexts }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
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

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border)/0.4)_1px,transparent_1px)] bg-[size:100px_100px] opacity-20" />
      
      {/* Soft radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-radial from-primary/8 via-primary/3 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-accent/5 to-transparent rounded-full blur-3xl" />

      <div className="container px-6 relative z-10">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/60 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Personalized learning for modern careers
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
              <span className="text-foreground">{heroHeadline.replace(heroHighlightText, '')}</span>
              <span className="relative inline-block" style={{ color: heroHighlightColor }}>
                {heroHighlightText}
                <svg className="absolute -bottom-1.5 left-0 w-full h-3" viewBox="0 0 200 10" preserveAspectRatio="none">
                  <path d="M0,7 Q50,0 100,7 T200,7" fill="none" stroke={heroHighlightColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                </svg>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
              Build job-ready skills with guided learning paths, practical projects, and premium course experiences.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="w-full max-w-xl mt-2">
            <div className="relative flex items-center h-14 md:h-[60px] rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-card)] transition-all duration-300 focus-within:shadow-elegant focus-within:border-primary/40">
              <Search className="absolute left-5 h-5 w-5 text-muted-foreground/60" />
              <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-full pl-13 pr-5 text-base bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link to="/careers">
              <Button size="lg" className="h-13 px-8 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant hover:shadow-glow transition-all duration-300 group">
                <Compass className="h-4.5 w-4.5 mr-2" />
                Find Your Learning Path
                <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link to="/courses">
              <Button size="lg" variant="outline" className="h-13 px-8 text-base font-semibold rounded-xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-300">
                Explore Courses
              </Button>
            </Link>
          </div>

          {/* Trust Row */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">10,000+</span> learners
            </span>
            <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
            <span>Career-focused paths</span>
            <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
            <span>Instant access</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
