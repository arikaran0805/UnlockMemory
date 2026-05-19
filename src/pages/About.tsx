import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Brain, Code2, RefreshCw } from "lucide-react";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Brain,
    title: "Learn Deeply",
    description:
      "Structured lessons built around how memory actually works — not just what sounds good.",
  },
  {
    icon: Code2,
    title: "Practice Actively",
    description:
      "Real problems with instant feedback. You only remember what you actually do.",
  },
  {
    icon: RefreshCw,
    title: "Remember Forever",
    description:
      "Spaced repetition surfaces exactly what you're about to forget, right before you forget it.",
  },
];

const VALUES = [
  {
    title: "Quality First",
    description:
      "Every lesson is well-researched, reviewed, and built to last — we ship nothing we wouldn't learn from ourselves.",
  },
  {
    title: "Community Driven",
    description:
      "Learners and instructors shape what gets built next. The best ideas come from the people using the platform.",
  },
  {
    title: "Continuous Learning",
    description:
      "We believe growth never stops — for our users or our team. We practice what we teach.",
  },
  {
    title: "Innovation",
    description:
      "We apply the latest in learning science, not just technology. If the research says it works, we build it.",
  },
];

const About = () => {
  useEffect(() => {
    document.title = "UnlockMemory - About Us";
  }, []);

  return (
    <Layout>
      <SEOHead
        title="About Us - Our Story and Mission"
        description="Learn about UnlockMemory's mission to democratize knowledge and inspire curious minds. Discover our values, team, and commitment to quality content."
        keywords="about us, our mission, our story, company values, team"
      />

      {/* ── 1. Hero ───────────────────────────────────────────────────── */}
      <section className="bg-gradient-primary min-h-[65vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-primary-foreground/60 text-xs font-semibold tracking-widest uppercase mb-6">
            About UnlockMemory
          </p>
          <h1 className="text-5xl font-bold text-primary-foreground leading-tight">
            Most learning is forgotten within a week.
          </h1>
          <p className="text-xl text-primary-foreground/80 mt-5 font-medium leading-relaxed">
            We built the system that changes that.
          </p>
        </div>
      </section>

      {/* ── 2. Problem / Answer ──────────────────────────────────────── */}
      <section className="bg-background">
        <div className="max-w-5xl mx-auto px-4 py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-16 items-start">
            {/* Stat */}
            <div>
              <p className="text-8xl font-bold text-primary leading-none">70%</p>
              <p className="text-lg text-foreground mt-3">
                of information is forgotten within 24 hours
              </p>
              <p className="text-sm text-muted-foreground mt-2 italic">
                — Hermann Ebbinghaus, 1885
              </p>
            </div>

            {/* Narrative */}
            <div>
              <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-5">
                Our Answer
              </p>
              <div className="space-y-4 text-base text-muted-foreground leading-relaxed">
                <p>
                  Forgetting isn't a personal failure — it's how brains work by default.
                  Without reinforcement, most of what you read today will be gone tomorrow.
                </p>
                <p>
                  UnlockMemory is built around the science of durable learning: structured
                  knowledge paths, active practice with real feedback, and spaced repetition
                  that surfaces the right content at the right time.
                </p>
                <p>
                  Whether you're a developer learning new skills, a student preparing for
                  exams, or a professional staying sharp — this platform is designed to make
                  your effort stick.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. How We're Different ───────────────────────────────────── */}
      <section className="bg-muted/40">
        <div className="max-w-5xl mx-auto px-4 py-24">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">
            Not just a course platform.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-background rounded-2xl p-8 shadow-card border border-border/50"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-5 mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Values ────────────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="max-w-5xl mx-auto px-4 py-24">
          <h2 className="text-3xl font-bold text-foreground mb-12">What we stand for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {VALUES.map(({ title, description }) => (
              <div
                key={title}
                className="rounded-2xl p-7 border-l-4 border-primary bg-muted/30"
              >
                <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CTA Strip ─────────────────────────────────────────────── */}
      <section className="bg-primary/5">
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Ready to learn something that sticks?
          </h2>
          <p className="text-base text-muted-foreground mb-8">
            Join thousands of learners building lasting knowledge.
          </p>
          <Button size="lg" asChild>
            <Link to="/courses">Start Learning →</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default About;
