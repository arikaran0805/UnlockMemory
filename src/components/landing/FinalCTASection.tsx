import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const FinalCTASection = () => {
  const animation = useScrollAnimation({ threshold: 0.2 });

  return (
    <section
      ref={animation.ref}
      className={`py-24 lg:py-32 transition-all duration-1000 ${
        animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="container px-6 max-w-4xl mx-auto text-center">
        <div className="relative p-12 md:p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/5 border border-primary/10">
          {/* Subtle glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-radial from-primary/8 to-transparent blur-2xl" />
          
          <div className="relative space-y-6">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground leading-tight">
              Ready to start your<br />learning journey?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Join thousands of learners building real skills with guided paths and hands-on practice. Free to start.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link to="/careers">
                <Button size="lg" className="h-13 px-8 text-base font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant hover:shadow-glow transition-all duration-300 group">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="outline" className="h-13 px-8 text-base font-semibold rounded-xl border-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-300">
                  Browse Courses
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
