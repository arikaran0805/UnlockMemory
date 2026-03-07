import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, StickyNote, Sparkles, GraduationCap, Ban, Shield, Zap, Lock, ArrowLeft, BookOpen, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserState } from "@/hooks/useUserState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";

const PRO_FEATURES = [
  { icon: Check, label: "Full access to all lessons" },
  { icon: StickyNote, label: "Quick & Deep Notes on every lesson" },
  { icon: Sparkles, label: "Practice & Reinforcement exercises" },
  { icon: GraduationCap, label: "Course Completion Certificates" },
  { icon: Ban, label: "No ads while learning" },
  { icon: Shield, label: "Priority support from instructors" },
];

const COURSE_BENEFITS = [
  "Access all published lessons in every course",
  "Take inline notes as you learn",
  "Earn verified certificates on completion",
  "Ad-free learning experience",
];

const CAREER_BENEFITS = [
  "Full career roadmap with skill tracking",
  "All courses within a career path unlocked",
  "Career readiness score & milestones",
  "Priority certificate approvals",
];

const PRICING = {
  monthly: { price: 499, currency: "₹", period: "month" },
  yearly: { price: 3999, currency: "₹", period: "year", savings: "33%" },
};

const Pricing = () => {
  const navigate = useNavigate();
  const { isGuest, isPro } = useUserState();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);

    if (isGuest) {
      navigate("/login?intent=upgrade");
      return;
    }

    if (user) {
      try {
        const now = new Date();
        const periodEnd = new Date();
        if (selectedPlan === "yearly") {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const { error } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: user.id,
            status: "active",
            plan: "pro",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            cancel_at_period_end: false,
          }, { onConflict: "user_id" });

        if (error) throw error;

        toast({
          title: "🎉 Welcome to Pro!",
          description: "You now have full access to all Pro features.",
        });

        window.location.reload();
      } catch (error) {
        console.error("Error creating subscription:", error);
        toast({
          title: "Error",
          description: "Failed to upgrade. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }
  };

  if (isPro) {
    return (
      <Layout>
        <SEOHead title="Pro Plan | You're already Pro" description="You already have an active Pro subscription." />
        <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
          <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">You're already on Pro!</h1>
          <p className="text-muted-foreground">You have full access to all features.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title="Upgrade to Pro | Unlock Full Learning Experience"
        description="Get unlimited access to all courses, career paths, certificates, and ad-free learning with Pro."
      />

      <div className="max-w-5xl mx-auto px-4 py-12 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Pro Plan
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Unlock the full learning experience
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Access every course, earn certificates, practice with exercises, and learn without ads.
          </p>
        </div>

        {/* Course & Career cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Courses Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {COURSE_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Careers Card */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Briefcase className="h-5 w-5 text-accent" />
                </div>
                Career Paths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {CAREER_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    <span className="text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* All Pro Features */}
        <div className="bg-muted/30 rounded-xl p-6 md:p-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Everything included in Pro</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {PRO_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-3 p-3 rounded-lg bg-background">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing Selection */}
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-lg font-semibold text-foreground text-center">Choose your plan</h2>

          {/* Yearly */}
          <button
            onClick={() => setSelectedPlan("yearly")}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left relative ${
              selectedPlan === "yearly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
              Recommended
            </span>
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold text-foreground">{PRICING.yearly.currency}{PRICING.yearly.price}</span>
                <span className="text-sm text-muted-foreground ml-1">/ {PRICING.yearly.period}</span>
              </div>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                Save {PRICING.yearly.savings}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Billed annually</p>
          </button>

          {/* Monthly */}
          <button
            onClick={() => setSelectedPlan("monthly")}
            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
              selectedPlan === "monthly"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-foreground">{PRICING.monthly.currency}{PRICING.monthly.price}</span>
              <span className="text-sm text-muted-foreground ml-1">/ {PRICING.monthly.period}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Billed monthly</p>
          </button>

          {/* CTA */}
          <Button className="w-full h-12 text-base" size="lg" onClick={handleUpgrade} disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </span>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {isGuest ? "Sign in & Upgrade" : "Upgrade to Pro"}
              </>
            )}
          </Button>

          {/* Trust */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure payment</span>
            <span>•</span>
            <span>Cancel anytime</span>
            <span>•</span>
            <span>Instant access</span>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Pricing;
