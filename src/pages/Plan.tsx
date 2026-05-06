import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BookOpen, Trash2, Settings2,
  ShoppingCart, ArrowRight, ArrowLeft, Clock,
  ShieldCheck, Sparkles, Tag, X, Package, PartyPopper, Search, Lock,
  CreditCard, ChevronUp, ChevronDown, HelpCircle, Check,
  Smartphone, Building2, Wallet, GraduationCap, Loader2,
  UserCircle, CheckCircle2, Download,
  icons as lucideIcons,
} from "lucide-react";
import { formatPrice } from "@/components/pricing/pricingData";
import type { CareerPlanItem } from "@/contexts/CareerPlanContext";
import type { PricingCourse } from "@/components/pricing/pricingData";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type PaymentMethod = "upi" | "card" | "netbanking" | "wallet";

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "upi",        label: "UPI",                icon: <Smartphone  className="h-5 w-5" />, desc: "Google Pay, PhonePe, Paytm" },
  { id: "card",       label: "Credit / Debit Card", icon: <CreditCard  className="h-5 w-5" />, desc: "Visa, Mastercard, RuPay" },
  { id: "netbanking", label: "Netbanking",           icon: <Building2   className="h-5 w-5" />, desc: "All major banks" },
  { id: "wallet",     label: "Wallet",               icon: <Wallet      className="h-5 w-5" />, desc: "Paytm, MobiKwik, FreeCharge" },
];

const STEP_META = [
  { label: "Plan",         title: "Your Career Plan",  subtitle: (savings: number) => savings > 0 ? `You're saving ${formatPrice(savings)} on this plan — review and customize before checkout.` : "Review your selected career paths and customize courses before checkout." },
  { label: "Checkout",    title: "Checkout",           subtitle: () => "Review your order, fill in billing details, and complete your purchase." },
  { label: "Confirmation", title: "Order Confirmed!",  subtitle: () => "Your courses are now unlocked. Happy learning!" },
];

/* ═══════════════════════════════════════════════════════ MAIN COMPONENT ══ */
const Plan = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Step state ─────────────────────────────────────────────────────────────
  const [step, setStep] = useState<0 | 1 | 2>(0);

  // ── Billing / payment state ────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("upi");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [purchasedCourses, setPurchasedCourses] = useState<PricingCourse[]>([]);
  const [purchasedTotal, setPurchasedTotal] = useState(0);

  // ── Auth dialog ────────────────────────────────────────────────────────────
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const {
    items,
    loading,
    addCareer,
    removeCareer,
    toggleCourse,
    customizingCareerId,
    setCustomizingCareerId,
    getBreakdown,
    getAllSelectedCourses,
    promoCode,
    setPromoCode,
    appliedPromo,
    promoError,
    handleApplyPromo,
    handleRemovePromo,
  } = useCareerPlan();

  const { totalBreakdown } = getBreakdown();
  const allCourses = getAllSelectedCourses();
  const hasSavings = totalBreakdown.savings > 0;

  // Prefill billing email from auth (only once when email becomes available)
  useEffect(() => {
    if (user?.email) setBillingEmail((prev) => prev || user.email!);
  }, [user?.email]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleProceedToCheckout = () => {
    if (allCourses.length === 0) return;
    if (!user) { setShowAuthDialog(true); return; }
    setStep(1);
  };

  const handlePay = async () => {
    if (!user) { setShowAuthDialog(true); return; }
    setPaymentLoading(true);

    const snapshot = [...allCourses];
    const finalTotal = totalBreakdown.finalTotal;

    try {
      // Create/update Pro subscription
      const now = new Date();
      const periodEnd = new Date();
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);

      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          status: "active",
          plan: "pro",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
        }, { onConflict: "user_id" });

      if (subError) throw subError;

      // Record each purchased career's course selection
      for (const item of items) {
        const { error: selError } = await supabase
          .from("user_career_selections")
          .upsert({
            user_id: user.id,
            career_id: item.careerId,
            selected_course_ids: item.selectedCourseIds,
          }, { onConflict: "user_id,career_id" });
        if (selError) throw selError;
      }

      // Clear cart and advance to confirmation
      setPurchasedCourses(snapshot);
      setPurchasedTotal(finalTotal);
      items.forEach((item) => removeCareer(item.careerId));
      setStep(2);
    } catch (err) {
      console.error("Purchase failed:", err);
      toast.error("Purchase failed. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <Layout>
        <SEOHead title="Your Career Plan" description="Review your selected career paths and customize courses before checkout." />
        <div
          className="border-b border-border/40"
          style={{
            background:
              "linear-gradient(180deg, #edf5ef 0%, #f4f9f5 50%, #f9fbf9 100%)",
          }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-10 pb-8">
            <div className="h-4 w-48 bg-muted/40 rounded-full animate-pulse mb-5" />
            <div className="h-10 w-64 bg-muted/40 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-80 bg-muted/30 rounded animate-pulse" />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
          <div className="grid lg:grid-cols-[1fr_380px] gap-8">
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-2xl border border-border/40 p-6 space-y-4" style={{ opacity: 1 - i * 0.2 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/40 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-48 bg-muted/40 rounded animate-pulse" />
                      <div className="h-3 w-64 bg-muted/30 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-px bg-border/40" />
                  <div className="flex justify-between">
                    <div className="h-7 w-24 bg-muted/40 rounded animate-pulse" />
                    <div className="h-8 w-32 bg-muted/30 rounded-lg animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block">
              <div className="rounded-2xl border border-border p-6 space-y-4" style={{ borderTop: "3px solid hsl(var(--primary))" }}>
                <div className="h-6 w-36 bg-muted/40 rounded animate-pulse" />
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex justify-between" style={{ opacity: 1 - i * 0.2 }}>
                      <div className="h-3.5 w-40 bg-muted/30 rounded animate-pulse" />
                      <div className="h-3.5 w-16 bg-muted/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
                <div className="h-px bg-border/40" />
                <div className="h-12 w-full bg-muted/40 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  /* ── Empty state (only when not on confirmation step) ── */
  if (items.length === 0 && step !== 2) {
    return (
      <Layout>
        <SEOHead title="Your Career Plan" description="Review your selected career paths and customize courses before checkout." />
        <div className="max-w-3xl mx-auto px-6 py-28 flex flex-col items-center text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: "hsl(var(--primary) / 0.07)", border: "1.5px solid hsl(var(--primary) / 0.18)" }}
          >
            <ShoppingCart className="h-9 w-9" style={{ color: "hsl(var(--primary))", opacity: 0.8 }} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Your plan is empty</h1>
          <p className="text-muted-foreground mb-2 max-w-sm" style={{ lineHeight: 1.7 }}>
            Start building your career learning path by adding a career plan.
          </p>
          <p className="text-sm text-muted-foreground/50 mb-8">
            No commitment · Customize before checkout · Bundle discounts available
          </p>
          <Button asChild size="lg" className="h-12 px-8 text-base font-semibold rounded-xl">
            <Link to="/careers">
              Browse Career Paths
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const meta = STEP_META[step];

  return (
    <Layout>
      <SEOHead title="Your Career Plan" description="Review your selected career paths and customize courses before checkout." />

      {/* ── Auth Dialog ── */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="max-w-sm text-center p-8">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "hsl(var(--primary) / 0.1)" }}>
            <Lock className="h-7 w-7" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h2 className="text-xl font-bold text-foreground">Sign in to continue</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create an account or sign in to complete your purchase and unlock your courses.
          </p>
          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={() => { setShowAuthDialog(false); navigate("/signup?redirect=/plan"); }}>Create Account</Button>
            <Button variant="outline" onClick={() => { setShowAuthDialog(false); navigate("/login?redirect=/plan"); }}>Sign In</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Hero ── */}
      <div
        className="border-b border-border/40 relative"
        style={{
          background:
            "linear-gradient(180deg, #edf5ef 0%, #f4f9f5 50%, #f9fbf9 100%)",
        }}
      >
        {/* Back button — only on checkout step */}
        {step === 1 && (
          <button
            onClick={() => setStep(0)}
            className="absolute left-6 sm:left-8 lg:left-10 top-9 group inline-flex items-center gap-2.5"
          >
            {/* Icon badge — keyboard-key aesthetic */}
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:shadow-md"
              style={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border) / 0.65)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.09), 0 0 0 0.5px rgba(0,0,0,0.04)",
              }}
            >
              <ArrowLeft
                className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
                style={{ color: "hsl(var(--primary))" }}
              />
            </span>
            {/* Text floats free — no outer box */}
            <span className="text-[13px] font-semibold text-foreground/70 group-hover:text-foreground transition-colors duration-200">
              Back to Plan
            </span>
          </button>
        )}

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-10 pb-8 flex flex-col items-center text-center">
          <ProgressStepper step={step} />

          {step < 2 && (
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mt-5 mb-4"
              style={{ background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.18)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))]" style={{ boxShadow: "0 0 4px hsl(var(--primary) / 0.6)" }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "hsl(var(--primary))", letterSpacing: "0.025em" }}>
                {step === 0
                  ? `${items.length} career${items.length !== 1 ? "s" : ""} · ${items.reduce((s, i) => s + i.selectedCourseIds.length, 0)} courses${hasSavings ? ` · Saving ${formatPrice(totalBreakdown.savings)}` : ""}`
                  : `${allCourses.length} course${allCourses.length !== 1 ? "s" : ""} · ${formatPrice(totalBreakdown.finalTotal)} total`}
              </span>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`hero-${step}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-foreground leading-tight mb-2" style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, letterSpacing: "-0.03em" }}>
                {meta.title}
              </h1>
              <p className="text-muted-foreground max-w-lg" style={{ fontSize: 15, lineHeight: 1.6 }}>
                {meta.subtitle(totalBreakdown.savings)}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step-plan" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
              <PlanStep
                items={items}
                allCourses={allCourses}
                breakdown={totalBreakdown}
                customizingCareerId={customizingCareerId}
                setCustomizingCareerId={setCustomizingCareerId}
                addCareer={addCareer}
                removeCareer={removeCareer}
                toggleCourse={toggleCourse}
                promoCode={promoCode}
                setPromoCode={setPromoCode}
                appliedPromo={appliedPromo}
                promoError={promoError}
                onApplyPromo={handleApplyPromo}
                onRemovePromo={handleRemovePromo}
                onCheckout={handleProceedToCheckout}
                showMobileSummary={showMobileSummary}
                setShowMobileSummary={setShowMobileSummary}
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step-checkout" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
              <CheckoutStep
                user={user}
                items={items}
                allCourses={allCourses}
                breakdown={totalBreakdown}
                fullName={fullName}
                setFullName={setFullName}
                billingEmail={billingEmail}
                setBillingEmail={setBillingEmail}
                selectedPayment={selectedPayment}
                setSelectedPayment={setSelectedPayment}
                paymentLoading={paymentLoading}
                onPay={handlePay}
              />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step-confirm" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.25 }}>
              <ConfirmationStep
                purchasedCourses={purchasedCourses}
                finalTotal={purchasedTotal}
                onGoToLearning={() => { window.location.href = "/profile"; }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

/* ═══════════════════════════════════════════════════════ PROGRESS STEPPER ══ */
function ProgressStepper({ step }: { step: number }) {
  const steps = ["Plan", "Checkout", "Confirmation"];
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
              style={{
                background: i <= step ? "hsl(var(--primary))" : "hsl(var(--muted)/0.5)",
                color: i <= step ? "white" : "hsl(var(--muted-foreground)/0.5)",
                boxShadow: i === step ? "0 0 8px hsl(var(--primary) / 0.4)" : "none",
              }}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className="text-xs font-semibold" style={{ color: i <= step ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground)/0.45)" }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="w-8 h-px mx-2" style={{ background: i < step ? "hsl(var(--primary))" : "hsl(var(--border)/0.6)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ STEP 0: PLAN ══ */
function PlanStep({
  items, allCourses, breakdown, customizingCareerId, setCustomizingCareerId,
  addCareer, removeCareer, toggleCourse,
  promoCode, setPromoCode, appliedPromo, promoError, onApplyPromo, onRemovePromo,
  onCheckout, showMobileSummary, setShowMobileSummary,
}: {
  items: CareerPlanItem[];
  allCourses: PricingCourse[];
  breakdown: { courseSubtotal: number; bundleDiscount: number; promoDiscount: number; finalTotal: number; savings: number; itemCount: number };
  customizingCareerId: string | null;
  setCustomizingCareerId: (id: string | null) => void;
  addCareer: (career: { id: string; name: string; icon: string; description: string; discountPercentage: number; courseIds: string[]; courses: PricingCourse[] }) => void;
  removeCareer: (id: string) => void;
  toggleCourse: (careerId: string, courseId: string) => void;
  promoCode: string;
  setPromoCode: (v: string) => void;
  appliedPromo: string | null;
  promoError: string | null;
  onApplyPromo: (code: string) => Promise<void>;
  onRemovePromo: () => void;
  onCheckout: () => void;
  showMobileSummary: boolean;
  setShowMobileSummary: (v: (prev: boolean) => boolean) => void;
}) {
  const hasSavings = breakdown.savings > 0;

  return (
    <div>
      <div className="mb-6" />
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Left: Career items */}
        <div className="space-y-6">
          {items.map((item) => (
            <CareerCartCard
              key={item.careerId}
              item={item}
              isCustomizing={customizingCareerId === item.careerId}
              onCustomize={() => setCustomizingCareerId(customizingCareerId === item.careerId ? null : item.careerId)}
              onRemove={() => {
                const removed = item;
                removeCareer(item.careerId);
                toast("Career removed", {
                  description: removed.careerName,
                  action: {
                    label: "Undo",
                    onClick: () => addCareer({
                      id: removed.careerId,
                      name: removed.careerName,
                      icon: removed.careerIcon,
                      description: removed.careerDescription,
                      discountPercentage: removed.discountPercentage,
                      courseIds: removed.defaultCourseIds,
                      courses: removed.courses,
                    }),
                  },
                  duration: 5000,
                });
              }}
              onToggleCourse={(courseId, courseData) => toggleCourse(item.careerId, courseId, courseData)}
            />
          ))}
        </div>

        {/* Right: Order Summary */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <OrderSummaryCard
              items={items}
              allCourses={allCourses}
              breakdown={breakdown}
              promoCode={promoCode}
              onPromoCodeChange={setPromoCode}
              appliedPromo={appliedPromo}
              promoError={promoError}
              onApplyPromo={onApplyPromo}
              onRemovePromo={onRemovePromo}
              itemCount={items.length}
              onCheckout={onCheckout}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-xl">
        <div style={{ display: "grid", gridTemplateRows: showMobileSummary ? "1fr" : "0fr", transition: "grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
          <div style={{ overflow: "hidden" }}>
            <div className="border-b border-border/60 px-5 py-4 space-y-2 max-h-52 overflow-y-auto">
              {items.map((item) => {
                const selected = item.courses.filter((c) => item.selectedCourseIds.includes(c.id));
                return (
                  <div key={item.careerId}>
                    {items.length > 1 && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">{item.careerName}</p>}
                    {selected.map((c) => (
                      <div key={c.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-foreground/80 truncate mr-2">{c.name}</span>
                        <span className="text-foreground font-medium shrink-0">{formatPrice(c.discountPrice)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              <Separator className="my-1" />
              <div className="flex justify-between text-sm font-bold pt-0.5">
                <span>Total</span>
                <span style={{ color: "hsl(var(--primary))" }}>{formatPrice(breakdown.finalTotal)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4 gap-4 max-w-lg mx-auto">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-lg font-bold text-foreground">{formatPrice(breakdown.finalTotal)}</p>
              <button onClick={() => setShowMobileSummary((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Toggle order summary">
                {showMobileSummary ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
            {hasSavings && <p className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>Saving {formatPrice(breakdown.savings)}</p>}
          </div>
          <Button disabled={allCourses.length === 0} onClick={onCheckout} className="h-11 px-6 rounded-xl text-sm font-semibold flex-1 max-w-[200px]" style={{ background: "hsl(var(--primary))", color: "white" }}>
            <CreditCard className="h-4 w-4 mr-2" />
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ STEP 1: CHECKOUT ══ */
function CheckoutStep({
  user, items, allCourses, breakdown,
  fullName, setFullName, billingEmail, setBillingEmail,
  selectedPayment, setSelectedPayment,
  paymentLoading, onPay,
}: {
  user: { email?: string } | null;
  items: CareerPlanItem[];
  allCourses: PricingCourse[];
  breakdown: { courseSubtotal: number; bundleDiscount: number; promoDiscount: number; finalTotal: number; savings: number; itemCount: number };
  fullName: string;
  setFullName: (v: string) => void;
  billingEmail: string;
  setBillingEmail: (v: string) => void;
  selectedPayment: PaymentMethod;
  setSelectedPayment: (v: PaymentMethod) => void;
  paymentLoading: boolean;
  onPay: () => void;
}) {
  return (
    <div>
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* ── Left: Stepped form ── */}
        <div className="space-y-0">

          {/* ── Section 1: Account ── */}
          <CheckoutSection number={1} title="Account">
            {user ? (
              <div
                className="flex items-center gap-3 p-4 rounded-xl"
                style={{ background: "hsl(var(--muted)/0.35)", border: "1px solid hsl(var(--border)/0.6)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.12)" }}
                >
                  <UserCircle className="h-5 w-5" style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Signed in to your account</p>
                </div>
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.1)", color: "hsl(var(--primary))", border: "1px solid hsl(var(--primary) / 0.2)" }}
                >
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              </div>
            ) : (
              <div
                className="p-4 rounded-xl space-y-3"
                style={{ background: "hsl(var(--muted)/0.35)", border: "1px solid hsl(var(--border)/0.6)" }}
              >
                <p className="text-sm text-muted-foreground">Sign in or create an account to continue.</p>
                <div className="flex gap-3">
                  <Button size="sm" style={{ background: "hsl(var(--primary))", color: "white" }}>Sign In</Button>
                  <Button size="sm" variant="outline">Create Account</Button>
                </div>
              </div>
            )}
          </CheckoutSection>

          <SectionDivider />

          {/* ── Section 2: Billing ── */}
          <CheckoutSection number={2} title="Billing Information">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                  style={{ border: "1.5px solid hsl(var(--border)/0.7)" }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingEmail" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={billingEmail}
                  onChange={(e) => setBillingEmail(e.target.value)}
                  className="h-11 rounded-xl text-sm"
                  style={{ border: "1.5px solid hsl(var(--border)/0.7)" }}
                />
              </div>
            </div>
          </CheckoutSection>

          <SectionDivider />

          {/* ── Section 3: Payment ── */}
          <CheckoutSection number={3} title="Payment Method">
            <div className="space-y-2.5">
              {paymentMethods.map((method) => {
                const active = selectedPayment === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPayment(method.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left"
                    style={
                      active
                        ? { borderColor: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.03)" }
                        : { borderColor: "hsl(var(--border)/0.7)", background: "hsl(var(--card))" }
                    }
                  >
                    {/* Icon box */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: active ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted)/0.5)",
                        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {method.icon}
                    </div>
                    {/* Labels */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{method.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{method.desc}</p>
                    </div>
                    {/* Radio dot */}
                    <div
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{ borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))" }}
                    >
                      {active && <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--primary))]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CheckoutSection>

          <div className="mt-8 space-y-4">
            {/* Pay button */}
            <Button
              size="lg"
              className="w-full h-14 text-base font-semibold rounded-xl transition-all"
              disabled={paymentLoading || allCourses.length === 0}
              onClick={onPay}
              style={{
                background: paymentLoading ? "hsl(var(--primary))" : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 100%)",
                color: "white",
                boxShadow: paymentLoading ? "none" : "0 4px 24px hsl(var(--primary) / 0.32)",
              }}
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2.5 animate-spin" />
                  Processing payment…
                </>
              ) : (
                <>
                  <GraduationCap className="h-5 w-5 mr-2.5" />
                  Unlock Your Growth — {formatPrice(breakdown.finalTotal)}
                </>
              )}
            </Button>

            {/* Trust strip */}
            <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1.5"><Lock className="h-3 w-3" /> Secure Payment</span>
              <span className="w-px h-3 bg-border/60" />
              <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> Instant Access</span>
              <span className="w-px h-3 bg-border/60" />
              <span className="flex items-center gap-1.5"><CreditCard className="h-3 w-3" /> UPI / Cards</span>
            </div>
          </div>
        </div>

        {/* ── Right: Order summary — same UI as plan page ── */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <CheckoutOrderSummary items={items} allCourses={allCourses} breakdown={breakdown} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Checkout section wrapper ── */
function CheckoutSection({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="py-6 first:pt-0">
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ background: "hsl(var(--primary))", color: "white" }}
        >
          {number}
        </div>
        <h2 className="font-semibold text-foreground text-base">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px bg-border/40" />;
}

/* ── Checkout right-column order summary (matches plan page OrderSummaryCard) ── */
function CheckoutOrderSummary({
  items, allCourses, breakdown,
}: {
  items: CareerPlanItem[];
  allCourses: { id: string; name: string; originalPrice: number; discountPrice: number }[];
  breakdown: { courseSubtotal: number; bundleDiscount: number; promoDiscount: number; finalTotal: number; savings: number; itemCount: number };
}) {
  const itemCount = items.length;

  // Per-career labeled bundle discounts (same logic as OrderSummaryCard)
  const careerDiscounts = items
    .map((item) => {
      const selected = item.courses.filter((c) => item.selectedCourseIds.includes(c.id));
      const subtotal = selected.reduce((s, c) => s + c.discountPrice, 0);
      const discount =
        item.discountPercentage > 0 && selected.length >= 2
          ? Math.round(subtotal * (item.discountPercentage / 100))
          : 0;
      return { name: item.careerName, discount };
    })
    .filter((c) => c.discount > 0);

  return (
    <div
      className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-md"
      style={{ borderTop: "3px solid hsl(var(--primary))" }}
    >
      {/* Header */}
      <div>
        <h3 className="font-bold text-foreground text-lg">Order Summary</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {allCourses.length} course{allCourses.length !== 1 ? "s" : ""} · {itemCount} career{itemCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Grouped course list with scroll fade */}
      {allCourses.length > 0 ? (
        <div className="relative">
          <div className="space-y-3 max-h-[260px] overflow-y-auto pb-4" style={{ scrollbarWidth: "thin" }}>
            {items.map((item) => {
              const selected = item.courses.filter((c) => item.selectedCourseIds.includes(c.id));
              if (selected.length === 0) return null;
              return (
                <div key={item.careerId}>
                  {itemCount > 1 && (
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {item.careerName}
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {selected.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground/80 truncate mr-1">{c.name}</span>
                        <div className="shrink-0">
                          {c.originalPrice > c.discountPrice ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground/50 line-through">{formatPrice(c.originalPrice)}</span>
                              <span className="text-xs font-semibold text-foreground">{formatPrice(c.discountPrice)}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-foreground">{formatPrice(c.discountPrice)}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {/* Bottom scroll fade */}
          <div
            className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--card)))" }}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">No courses selected.</p>
      )}

      <Separator />

      {/* Price breakdown */}
      <div className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-foreground font-medium">Subtotal</span>
          <span className="text-foreground font-medium">{formatPrice(breakdown.courseSubtotal)}</span>
        </div>
        {careerDiscounts.map((cd) => (
          <div key={cd.name} className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))", opacity: 0.7 }} />
              {itemCount > 1 ? `Bundle · ${cd.name}` : "Bundle Discount"}
            </span>
            <span className="font-medium" style={{ color: "hsl(var(--primary))" }}>−{formatPrice(cd.discount)}</span>
          </div>
        ))}
        {breakdown.promoDiscount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))", opacity: 0.7 }} />
              Promo Code
            </span>
            <span className="font-medium" style={{ color: "hsl(var(--primary))" }}>−{formatPrice(breakdown.promoDiscount)}</span>
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground text-base">Total</span>
        <span className="text-2xl font-bold" style={{ color: "hsl(var(--primary))" }}>{formatPrice(breakdown.finalTotal)}</span>
      </div>

      {breakdown.savings > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
          style={{ background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.15)" }}
        >
          <PartyPopper className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
          <p className="text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>
            You saved {formatPrice(breakdown.savings)} on this plan.
          </p>
        </div>
      )}

      {/* Trust badges */}
      <Separator />
      <div className="space-y-2.5">
        {[
          { icon: ShieldCheck, text: "Transparent pricing. No hidden fees." },
          { icon: Sparkles, text: "Flexible learning plan" },
          { icon: Settings2, text: "Customize anytime before checkout" },
        ].map((badge) => (
          <div key={badge.text} className="flex items-center gap-2.5 text-xs text-muted-foreground/75">
            <badge.icon className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))", opacity: 0.65 }} />
            {badge.text}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center text-muted-foreground/45 pt-1">
        Subtotal does not include applicable taxes.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ STEP 2: CONFIRMATION ══ */
function ConfirmationStep({
  purchasedCourses, finalTotal, onGoToLearning,
}: {
  purchasedCourses: PricingCourse[];
  finalTotal: number;
  onGoToLearning: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto py-8">
      <motion.div
        className="rounded-2xl border border-border bg-card p-8 text-center shadow-md"
        style={{ borderTop: "3px solid hsl(var(--primary))" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Animated checkmark */}
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "hsl(var(--primary))" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
        >
          <Check className="h-8 w-8 text-white" strokeWidth={3} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h2 className="text-2xl font-bold text-foreground">Payment Successful</h2>
          <p className="text-muted-foreground mt-1 mb-1">Your courses are now unlocked.</p>
          <p className="text-sm font-semibold mb-6" style={{ color: "hsl(var(--primary))" }}>
            {formatPrice(finalTotal)} paid
          </p>
        </motion.div>

        {/* Course list */}
        <motion.ul
          className="space-y-2 text-left mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          {purchasedCourses.map((c) => (
            <li key={c.id} className="flex items-center gap-2.5 text-sm py-2 px-3 rounded-xl" style={{ background: "hsl(var(--primary) / 0.05)", border: "1px solid hsl(var(--primary) / 0.1)" }}>
              <BookOpen className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-foreground truncate">{c.name}</span>
            </li>
          ))}
        </motion.ul>

        <motion.div
          className="flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Button
            className="flex-1 h-11 font-semibold rounded-xl"
            onClick={onGoToLearning}
            style={{ background: "hsl(var(--primary))", color: "white" }}
          >
            <GraduationCap className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="outline" className="flex-1 h-11 rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Download Invoice
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ CAREER CART CARD ══ */
function CareerCartCard({
  item, isCustomizing, onCustomize, onRemove, onToggleCourse,
}: {
  item: CareerPlanItem;
  isCustomizing: boolean;
  onCustomize: () => void;
  onRemove: () => void;
  onToggleCourse: (courseId: string, courseData?: PricingCourse) => void;
}) {
  const Icon = (lucideIcons as Record<string, React.ElementType>)[item.careerIcon] || BookOpen;

  const subtotal = item.courses
    .filter((c) => item.selectedCourseIds.includes(c.id))
    .reduce((s, c) => s + c.discountPrice, 0);
  const discountPct = item.discountPercentage || 0;
  const bundleDiscount =
    discountPct > 0 && item.selectedCourseIds.length >= 2
      ? Math.round(subtotal * (discountPct / 100))
      : 0;
  const discountedTotal = subtotal - bundleDiscount;

  const selectedCourseNames = item.courses.filter((c) => item.selectedCourseIds.includes(c.id)).map((c) => c.name);
  const previewNames = selectedCourseNames.slice(0, 2).join(", ");
  const remaining = selectedCourseNames.length - 2;

  return (
    <div className="space-y-0">
      <Card
        className={cn("relative transition-all duration-300", isCustomizing ? "border-muted-foreground/30 shadow-sm" : "border-border hover:border-muted-foreground/20")}
        style={isCustomizing ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : {}}
      >
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl shrink-0 bg-muted text-muted-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-lg leading-tight">{item.careerName}</h3>
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{item.careerDescription}</p>
                {selectedCourseNames.length > 0 && (
                  <p className="text-xs text-muted-foreground/60 mt-1 truncate">
                    {previewNames}{remaining > 0 && <span className="ml-1">+{remaining} more</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Self-paced</span>
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {item.selectedCourseIds.length} course{item.selectedCourseIds.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <p className="text-xl font-bold text-foreground">{formatPrice(discountedTotal)}</p>
              {bundleDiscount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                  Save {formatPrice(bundleDiscount)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isCustomizing ? "default" : "outline"}
                onClick={onCustomize}
                className="shrink-0 rounded-lg h-8 px-3 text-xs font-semibold"
                style={isCustomizing ? { background: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--muted-foreground))", color: "white" } : { borderColor: "hsl(var(--muted-foreground) / 0.35)", color: "hsl(var(--muted-foreground))" }}
              >
                <Settings2 className="h-3 w-3 mr-1" />
                {isCustomizing ? "Customizing" : "Customize"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={onRemove} aria-label="Remove career">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animated customization panel */}
      <div style={{ display: "grid", gridTemplateRows: isCustomizing ? "1fr" : "0fr", transition: "grid-template-rows 0.35s cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ overflow: "hidden" }}>
          <div className="border border-t-0 border-muted-foreground/15 rounded-b-xl p-6 bg-muted/20">
            <CustomizationSection item={item} onToggleCourse={onToggleCourse} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ CUSTOMIZATION SECTION ══ */
function CustomizationSection({ item, onToggleCourse }: { item: CareerPlanItem; onToggleCourse: (courseId: string, courseData?: PricingCourse) => void }) {
  const [courseSearch, setCourseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PricingCourse[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const debouncedSearch = useDebounce(courseSearch, 300);

  const isAtMinimum = item.selectedCourseIds.length <= 1;
  const allSelected = item.courses.every((c) => item.selectedCourseIds.includes(c.id));

  useEffect(() => {
    if (!debouncedSearch.trim()) { setSearchResults(null); return; }
    const search = async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, description, original_price, discount_price")
        .ilike("name", `%${debouncedSearch}%`)
        .eq("status", "published")
        .limit(10);
      if (!error && data) {
        setSearchResults(data.map((c) => ({
          id: c.id,
          name: c.name,
          description: (c as { description?: string }).description || "",
          price: Number((c as { discount_price?: number }).discount_price) || Number((c as { original_price?: number }).original_price) || 0,
          originalPrice: Number((c as { original_price?: number }).original_price) || 0,
          discountPrice: Number((c as { discount_price?: number }).discount_price) || Number((c as { original_price?: number }).original_price) || 0,
        })));
      }
      setSearching(false);
    };
    search();
  }, [debouncedSearch]);

  const handleSelectAll = () => item.courses.forEach((c) => { if (!item.selectedCourseIds.includes(c.id)) onToggleCourse(c.id); });
  const handleDeselectAll = () => item.selectedCourseIds.slice(1).forEach((id) => onToggleCourse(id));

  const includedIds = new Set(item.courses.map((c) => c.id));
  const addOnResults = searchResults ? searchResults.filter((c) => !includedIds.has(c.id) && !item.selectedCourseIds.includes(c.id)) : [];

  const handleAddAddon = (c: PricingCourse) => {
    onToggleCourse(c.id, c);
    setLastAdded(c.id);
    setTimeout(() => setLastAdded(null), 1500);
  };

  return (
    <TooltipProvider>
      <section className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              Customize Your Plan
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.careerName} · {item.selectedCourseIds.length} course{item.selectedCourseIds.length !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button onClick={allSelected ? handleDeselectAll : handleSelectAll} className="text-xs font-semibold shrink-0 transition-colors text-muted-foreground hover:text-foreground">
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>

        {isAtMinimum && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.22)", color: "#a16207" }}>
            <span>⚠</span>
            <span>At least one course must remain selected in your plan.</span>
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Included in this Career</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {item.courses.map((course) => {
              const isSelected = item.selectedCourseIds.includes(course.id);
              const isDefault = item.defaultCourseIds.includes(course.id);
              const hasDiscount = course.originalPrice > course.discountPrice;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onToggleCourse(course.id)}
                  className={cn("w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left", isSelected ? "border-muted-foreground/35 bg-muted/40" : "border-border bg-card hover:border-muted-foreground/20 hover:bg-muted/20")}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => onToggleCourse(course.id)} className="shrink-0" onClick={(e) => e.stopPropagation()} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{course.name}</span>
                      {isDefault && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-0.5 cursor-help">
                              <Badge className="text-[10px] px-1.5 py-0 select-none bg-muted text-muted-foreground border-0">Default</Badge>
                              <HelpCircle className="h-2.5 w-2.5 text-muted-foreground/40" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[180px] text-center">
                            Originally bundled with this career. Bundle discount applies when 2+ default courses are selected.
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {hasDiscount ? (
                      <><span className="text-[11px] text-muted-foreground line-through block">{formatPrice(course.originalPrice)}</span><span className="text-sm font-semibold text-foreground">{formatPrice(course.discountPrice)}</span></>
                    ) : (
                      <span className="text-sm font-semibold text-foreground">{formatPrice(course.discountPrice)}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Add Extra Courses</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Strengthen your career path with additional skills.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search courses to add…" value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)} className="pl-9 pr-9 h-9 text-sm" />
            {courseSearch && (
              <button onClick={() => setCourseSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
          {!courseSearch && <p className="text-xs text-muted-foreground/50 text-center py-1">Type a course name to search all available courses</p>}
          {searching && <p className="text-sm text-muted-foreground py-3 text-center">Searching…</p>}
          {!searching && courseSearch && addOnResults.length === 0 && <p className="text-sm text-muted-foreground py-3 text-center">No courses found matching "{courseSearch}".</p>}
          {!searching && addOnResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {addOnResults.map((c) => {
                const isJustAdded = lastAdded === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => handleAddAddon(c)} className={cn("w-full flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 text-left", isJustAdded ? "border-muted-foreground/35 bg-muted/40" : "border-border bg-card hover:border-muted-foreground/20 hover:bg-muted/20")}>
                    <div className="mt-0.5 w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition-all" style={{ borderColor: isJustAdded ? "hsl(var(--muted-foreground))" : "hsl(var(--border))", background: isJustAdded ? "hsl(var(--muted-foreground))" : "transparent" }}>
                      {isJustAdded && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{c.name}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Add-on</Badge>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">{c.description}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      {c.originalPrice > c.discountPrice ? (
                        <><span className="text-[11px] text-muted-foreground line-through block">{formatPrice(c.originalPrice)}</span><span className="text-sm font-semibold text-foreground">{formatPrice(c.discountPrice)}</span></>
                      ) : (
                        <span className="text-sm font-semibold text-foreground">{formatPrice(c.discountPrice)}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </TooltipProvider>
  );
}

/* ═══════════════════════════════════════════════════════ ORDER SUMMARY CARD ══ */
function OrderSummaryCard({
  items, allCourses, breakdown, promoCode, onPromoCodeChange,
  appliedPromo, promoError, onApplyPromo, onRemovePromo, itemCount, onCheckout,
}: {
  items: CareerPlanItem[];
  allCourses: { id: string; name: string; originalPrice: number; discountPrice: number }[];
  breakdown: { courseSubtotal: number; bundleDiscount: number; promoDiscount: number; finalTotal: number; savings: number; itemCount: number };
  promoCode: string;
  onPromoCodeChange: (v: string) => void;
  appliedPromo: string | null;
  promoError: string | null;
  onApplyPromo: (code: string) => Promise<void>;
  onRemovePromo: () => void;
  itemCount: number;
  onCheckout?: () => void;
}) {
  const hasSavings = breakdown.savings > 0;
  const [promoLoading, setPromoLoading] = useState(false);

  const handleApply = async () => {
    setPromoLoading(true);
    await onApplyPromo(promoCode);
    setPromoLoading(false);
  };

  const careerDiscounts = items
    .map((item) => {
      const selectedCourses = item.courses.filter((c) => item.selectedCourseIds.includes(c.id));
      const subtotal = selectedCourses.reduce((s, c) => s + c.discountPrice, 0);
      const discount = item.discountPercentage > 0 && selectedCourses.length >= 2 ? Math.round(subtotal * (item.discountPercentage / 100)) : 0;
      return { name: item.careerName, discount };
    })
    .filter((c) => c.discount > 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-md" style={{ borderTop: "3px solid hsl(var(--primary))" }}>
      <div>
        <h3 className="font-bold text-foreground text-lg">Order Summary</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{allCourses.length} course{allCourses.length !== 1 ? "s" : ""} · {itemCount} career{itemCount !== 1 ? "s" : ""}</p>
      </div>

      {allCourses.length > 0 ? (
        <div className="relative">
          <div className="space-y-3 max-h-[260px] overflow-y-auto pb-4" style={{ scrollbarWidth: "thin" }}>
            {items.map((item) => {
              const selected = item.courses.filter((c) => item.selectedCourseIds.includes(c.id));
              if (selected.length === 0) return null;
              return (
                <div key={item.careerId}>
                  {itemCount > 1 && <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{item.careerName}</p>}
                  <ul className="space-y-1.5">
                    {selected.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground/80 truncate mr-1">{c.name}</span>
                        <div className="shrink-0">
                          {c.originalPrice > c.discountPrice ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground/50 line-through">{formatPrice(c.originalPrice)}</span>
                              <span className="text-xs font-semibold text-foreground">{formatPrice(c.discountPrice)}</span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-foreground">{formatPrice(c.discountPrice)}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none" style={{ background: "linear-gradient(to bottom, transparent, hsl(var(--card)))" }} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">No courses selected.</p>
      )}

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">Subtotal</span>
        <span className="text-foreground font-medium">{formatPrice(breakdown.courseSubtotal)}</span>
      </div>

      {careerDiscounts.map((cd) => (
        <div key={cd.name} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))", opacity: 0.7 }} />
            {itemCount > 1 ? `Bundle · ${cd.name}` : "Bundle Discount"}
          </span>
          <span className="font-medium" style={{ color: "hsl(var(--primary))" }}>−{formatPrice(cd.discount)}</span>
        </div>
      ))}

      <div className="space-y-2">
        {appliedPromo ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" style={{ color: "hsl(var(--primary))", opacity: 0.7 }} />
                <span className="text-muted-foreground">Promo: {appliedPromo}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium" style={{ color: "hsl(var(--primary))" }}>−{formatPrice(breakdown.promoDiscount)}</span>
                <button onClick={onRemovePromo} className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Remove promo code"><X className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: "hsl(var(--primary))" }}>✔ Valid promo code applied</p>
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input placeholder="Enter promo code" value={promoCode} onChange={(e) => onPromoCodeChange(e.target.value)} className="h-9 text-sm" onKeyDown={(e) => e.key === "Enter" && handleApply()} disabled={promoLoading} />
              <Button variant="outline" size="sm" className="h-9 shrink-0 min-w-[60px]" onClick={handleApply} disabled={promoLoading || !promoCode.trim()}>
                {promoLoading ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : "Apply"}
              </Button>
            </div>
            {promoError && <p className="text-[11px] text-destructive">{promoError}</p>}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground text-base">Total</span>
        <span className="text-2xl font-bold" style={{ color: "hsl(var(--primary))" }}>{formatPrice(breakdown.finalTotal)}</span>
      </div>

      {hasSavings && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.15)" }}>
          <PartyPopper className="h-4 w-4 shrink-0" style={{ color: "hsl(var(--primary))" }} />
          <p className="text-xs font-medium" style={{ color: "hsl(var(--primary))" }}>You saved {formatPrice(breakdown.savings)} on this plan.</p>
        </div>
      )}

      <Button className="w-full h-12 text-base font-semibold rounded-xl" size="lg" disabled={allCourses.length === 0} onClick={onCheckout} style={{ background: "hsl(var(--primary))", color: "white" }}>
        <CreditCard className="h-4 w-4 mr-2" />
        Proceed to Checkout
      </Button>

      <Separator />

      <div className="space-y-2.5">
        {[
          { icon: ShieldCheck, text: "Transparent pricing. No hidden fees." },
          { icon: Sparkles, text: "Flexible learning plan" },
          { icon: Settings2, text: "Customize anytime before checkout" },
        ].map((badge) => (
          <div key={badge.text} className="flex items-center gap-2.5 text-xs text-muted-foreground/75">
            <badge.icon className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--primary))", opacity: 0.65 }} />
            {badge.text}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-center text-muted-foreground/45 pt-1">Subtotal does not include applicable taxes.</p>
    </div>
  );
}

export default Plan;
