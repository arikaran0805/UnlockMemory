import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const steps = [
  {
    number: "01",
    title: "Choose Your Path",
    description: "Select a career path or browse individual courses that match your goals.",
  },
  {
    number: "02",
    title: "Learn at Your Pace",
    description: "Work through visual lessons, guided examples, and interactive content.",
  },
  {
    number: "03",
    title: "Practice & Build",
    description: "Solve coding problems, fix errors, and build real skills through hands-on exercises.",
  },
  {
    number: "04",
    title: "Earn & Grow",
    description: "Complete courses, earn certificates, and track your career readiness.",
  },
];

const HowItWorksSection = () => {
  const animation = useScrollAnimation({ threshold: 0.1 });

  return (
    <section
      ref={animation.ref}
      className={`py-24 lg:py-32 bg-muted/30 transition-all duration-1000 ${
        animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      <div className="container px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-primary mb-4 block">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Start learning in minutes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              style={{ transitionDelay: animation.isVisible ? `${i * 120}ms` : '0ms' }}
              className={`relative text-center transition-all duration-500 ${
                animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="text-5xl font-black text-primary/15 mb-3 font-mono">{step.number}</div>
              <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 -right-4 w-8 border-t border-dashed border-border" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
