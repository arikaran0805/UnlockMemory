import { Star } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const testimonials = [
  {
    quote: "The visual approach to learning made everything click. I went from confused to confident in weeks.",
    name: "Priya S.",
    role: "Frontend Developer",
    rating: 5,
  },
  {
    quote: "Best learning platform I've used. The career paths gave me a clear roadmap to follow.",
    name: "Alex K.",
    role: "CS Student",
    rating: 5,
  },
  {
    quote: "The practice labs are incredible. I actually retained what I learned instead of just watching videos.",
    name: "Maria L.",
    role: "Career Switcher",
    rating: 5,
  },
];

const TestimonialsSection = () => {
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
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight text-foreground">
            Loved by learners
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              style={{ transitionDelay: animation.isVisible ? `${i * 100}ms` : '0ms' }}
              className={`p-7 rounded-2xl border border-border bg-card transition-all duration-500 ${
                animation.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 text-primary fill-primary" />
                ))}
              </div>
              <p className="text-foreground leading-relaxed mb-6 text-[15px]">"{t.quote}"</p>
              <div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
