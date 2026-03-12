import { BookOpen, Target, Zap, Award } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Target,
    title: "Career-Focused Paths",
    description: "Structured learning journeys designed around real job roles and industry demands.",
  },
  {
    icon: BookOpen,
    title: "Visual-First Content",
    description: "Learn through emojis, visuals, and stories that make complex topics click instantly.",
  },
  {
    icon: Zap,
    title: "Hands-On Practice",
    description: "Solve real coding challenges, fix errors, and predict outputs to reinforce every concept.",
  },
  {
    icon: Award,
    title: "Verified Certificates",
    description: "Earn certificates that showcase your skills and stand out to potential employers.",
  },
];

const WhyChooseUsSection = () => {
  const animation = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      ref={animation.ref}
      className={`py-24 lg:py-32 transition-all duration-1000 ${
        animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="container px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-4 block">
            Why Learners Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Everything you need to grow
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            A modern learning platform built for clarity, depth, and career impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              style={{ transitionDelay: animation.isVisible ? `${i * 100}ms` : '0ms' }}
              className={`group relative p-7 rounded-2xl border border-border bg-card hover:border-primary/20 hover:shadow-[var(--shadow-premium-hover)] transition-all duration-500 ${
                animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary/15 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUsSection;
