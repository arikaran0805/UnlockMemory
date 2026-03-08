import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check, X, Sparkles, Star, BookOpen, Settings2, Award,
  MessageSquare, Zap, Shield, Lock, ArrowRight,
} from "lucide-react";
import { useLearnerMode } from "@/contexts/LearnerModeContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FeatureRow {
  label: string;
  free: boolean | string;
  pro: boolean | string;
  category: string;
}

const features: FeatureRow[] = [
  // Learning
  { label: "Browse all career paths", free: true, pro: true, category: "Learning" },
  { label: "View course previews", free: true, pro: true, category: "Learning" },
  { label: "Add careers to plan", free: true, pro: true, category: "Learning" },
  { label: "Full course access", free: "Limited", pro: true, category: "Learning" },
  { label: "Self-paced learning", free: true, pro: true, category: "Learning" },
  // Customization
  { label: "Customize course selection", free: false, pro: true, category: "Customization" },
  { label: "Add/remove courses from bundles", free: false, pro: true, category: "Customization" },
  { label: "Real-time pricing updates", free: false, pro: true, category: "Customization" },
  { label: "Course search & discovery", free: "Basic", pro: "Advanced", category: "Customization" },
  // Pricing & Discounts
  { label: "Career bundle discounts", free: false, pro: true, category: "Pricing" },
  { label: "Promo code support", free: false, pro: true, category: "Pricing" },
  { label: "Savings breakdown", free: false, pro: true, category: "Pricing" },
  // Practice & Tools
  { label: "Practice problems", free: "Limited", pro: "Unlimited", category: "Practice" },
  { label: "Code execution", free: true, pro: true, category: "Practice" },
  { label: "Predict output challenges", free: "Limited", pro: "Unlimited", category: "Practice" },
  { label: "Fix error challenges", free: "Limited", pro: "Unlimited", category: "Practice" },
  // Certification
  { label: "Course certificates", free: false, pro: true, category: "Certification" },
  { label: "Interview preparation", free: false, pro: true, category: "Certification" },
  { label: "Career readiness tracking", free: false, pro: true, category: "Certification" },
  // Notes & Collaboration
  { label: "Quick notes", free: false, pro: true, category: "Notes" },
  { label: "Deep notes (Notion-style)", free: false, pro: true, category: "Notes" },
  { label: "Bookmarks", free: true, pro: true, category: "Notes" },
];

const categoryIcons: Record<string, React.ElementType> = {
  Learning: BookOpen,
  Customization: Settings2,
  Pricing: Zap,
  Practice: MessageSquare,
  Certification: Award,
  Notes: Star,
};

const CellValue = ({ value }: { value: boolean | string }) => {
  if (value === true) {
    return <Check className="h-4.5 w-4.5 text-primary mx-auto" />;
  }
  if (value === false) {
    return <X className="h-4.5 w-4.5 text-muted-foreground/40 mx-auto" />;
  }
  return (
    <span className="text-xs font-medium text-muted-foreground">{value}</span>
  );
};

const ComparePlans = () => {
  const { confirmProMode, isProMode } = useLearnerMode();
  const navigate = useNavigate();

  // Group features by category
  const categories = [...new Set(features.map((f) => f.category))];

  return (
    <Layout>
      <SEOHead
        title="Free vs Pro Learner | Compare Plans"
        description="Compare Free and Pro learner plans. See which features unlock with Pro to accelerate your learning journey."
      />

      <div className="max-w-4xl mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-20">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <Badge variant="outline" className="border-primary/30 text-primary gap-1 mb-2">
            <Sparkles className="h-3 w-3" />
            Choose Your Plan
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            Free vs Pro Learner
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Start free and upgrade anytime. Pro unlocks the full experience — customization, discounts, certificates, and more.
          </p>
        </div>

        {/* Plan Cards (top) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {/* Free Card */}
          <div className={cn(
            "rounded-2xl border p-6 space-y-4 transition-all",
            !isProMode ? "border-primary/40 ring-2 ring-primary/10 bg-card" : "border-border bg-card"
          )}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Free Learner</h3>
                {!isProMode && (
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Current</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Explore careers and start learning</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-foreground">₹0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
            <ul className="space-y-2">
              {["Browse all career paths", "Add careers to plan", "Self-paced learning", "Code execution"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/careers")}
            >
              Start Learning Free
            </Button>
          </div>

          {/* Pro Card */}
          <div className={cn(
            "rounded-2xl border p-6 space-y-4 transition-all relative overflow-hidden",
            isProMode
              ? "border-primary/40 ring-2 ring-primary/10 bg-card"
              : "border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5"
          )}>
            {/* Subtle glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-primary fill-primary" />
                  Pro Learner
                </h3>
                {isProMode && (
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Active</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Full access to everything</p>
            </div>
            <div className="relative flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-foreground">Pro</span>
              <span className="text-sm text-muted-foreground">per career plan</span>
            </div>
            <ul className="relative space-y-2">
              {["Everything in Free", "Course customization", "Bundle discounts & promos", "Certificates & interview prep"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Button className="w-full gap-1.5" onClick={() => navigate("/careers")}>
              <ArrowRight className="h-4 w-4" />
              Browse Careers
            </Button>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_140px_140px] bg-muted/50 border-b border-border">
            <div className="px-5 py-3.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feature</span>
            </div>
            <div className="px-3 py-3.5 text-center border-l border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Free</span>
            </div>
            <div className="px-3 py-3.5 text-center border-l border-primary/20 bg-primary/5">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center justify-center gap-1">
                <Star className="h-3 w-3 fill-current" />
                Pro
              </span>
            </div>
          </div>

          {/* Table Body - grouped by category */}
          {categories.map((category) => {
            const CatIcon = categoryIcons[category] || BookOpen;
            const categoryFeatures = features.filter((f) => f.category === category);

            return (
              <div key={category}>
                {/* Category Header */}
                <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_140px_140px] bg-muted/30 border-b border-border">
                  <div className="px-5 py-2.5 flex items-center gap-2">
                    <CatIcon className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wide">{category}</span>
                  </div>
                  <div className="border-l border-border" />
                  <div className="border-l border-primary/20 bg-primary/5" />
                </div>

                {/* Feature Rows */}
                {categoryFeatures.map((feature, i) => (
                  <div
                    key={feature.label}
                    className={cn(
                      "grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_140px_140px] border-b border-border last:border-b-0",
                      i % 2 === 0 ? "bg-card" : "bg-card/50"
                    )}
                  >
                    <div className="px-5 py-3 flex items-center">
                      <span className="text-sm text-foreground">{feature.label}</span>
                    </div>
                    <div className="px-3 py-3 flex items-center justify-center border-l border-border">
                      <CellValue value={feature.free} />
                    </div>
                    <div className="px-3 py-3 flex items-center justify-center border-l border-primary/20 bg-primary/[0.02]">
                      <CellValue value={feature.pro} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 text-center space-y-4">
          {isProMode ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Star className="h-4 w-4 fill-current" />
                You're a Pro Learner
              </div>
              <p className="text-sm text-muted-foreground">All features are unlocked. Explore career paths and start building your plan.</p>
              <Button size="lg" onClick={() => navigate("/careers")} className="gap-2">
                Browse Careers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-foreground">Ready to unlock the full experience?</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Upgrade to Pro and get course customization, bundle discounts, certificates, and more.
              </p>
              <Button size="lg" onClick={activateProMode} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            </>
          )}
        </div>

        {/* Trust */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
          {[
            { icon: Shield, text: "No hidden fees" },
            { icon: Zap, text: "Instant activation" },
            { icon: Settings2, text: "Change anytime" },
          ].map((item) => (
            <span key={item.text} className="flex items-center gap-1.5">
              <item.icon className="h-3.5 w-3.5 text-primary/50" />
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ComparePlans;
