import { Sparkles, Target, Layers, Eye } from "lucide-react";

const TRUST_BULLETS = [
  { icon: Target, text: "Industry-focused learning" },
  { icon: Layers, text: "Flexible course selection" },
  { icon: Eye, text: "Transparent pricing" },
];

const PricingHeroSection = () => (
  <section className="text-center space-y-6 pt-8 pb-4">
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
      <Sparkles className="h-4 w-4" />
      Customize Your Plan
    </div>

    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
      Build Your Career Plan
    </h1>

    <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
      Choose a career path and customize it by adding or removing courses based on your learning goals.
    </p>

    <div className="flex flex-wrap justify-center gap-6 pt-2">
      {TRUST_BULLETS.map((b) => (
        <div key={b.text} className="flex items-center gap-2 text-sm text-muted-foreground">
          <b.icon className="h-4 w-4 text-primary" />
          {b.text}
        </div>
      ))}
    </div>
  </section>
);

export default PricingHeroSection;
