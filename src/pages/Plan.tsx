import { useRef } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, Briefcase, Brain, BookOpen, Trash2, Settings2,
  ShoppingCart, ArrowRight, ChevronDown, ChevronUp,
  ShieldCheck, Sparkles, Zap, Tag, X, Package, PartyPopper,
} from "lucide-react";
import { formatPrice } from "@/components/pricing/pricingData";
import type { CareerPlanItem } from "@/contexts/CareerPlanContext";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3, Briefcase, Brain,
};

const Plan = () => {
  const {
    items, removeCareer, toggleCourse,
    customizingCareerId, setCustomizingCareerId,
    getBreakdown, getAllSelectedCourses,
    promoCode, setPromoCode, appliedPromo, promoDiscount, promoError,
    handleApplyPromo, handleRemovePromo,
  } = useCareerPlan();

  const { totalBreakdown } = getBreakdown();
  const allCourses = getAllSelectedCourses();

  if (items.length === 0) {
    return (
      <Layout>
        <SEOHead title="Your Career Plan" description="Review your selected career paths and customize courses before checkout." />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-6">
          <ShoppingCart className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Your plan is empty.</h1>
          <p className="text-muted-foreground">Start building your career learning path by adding a career plan.</p>
          <Button asChild size="lg">
            <Link to="/careers">
              Browse Careers
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead title="Your Career Plan" description="Review your selected career paths and customize courses before checkout." />
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Your Career Plan</h1>
          <p className="text-muted-foreground mt-2">Review your selected career paths and customize courses before checkout.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Left: Career items */}
          <div className="space-y-6">
            {items.map((item) => (
              <CareerCartCard
                key={item.careerId}
                item={item}
                isCustomizing={customizingCareerId === item.careerId}
                onCustomize={() =>
                  setCustomizingCareerId(customizingCareerId === item.careerId ? null : item.careerId)
                }
                onRemove={() => removeCareer(item.careerId)}
                onToggleCourse={(courseId) => toggleCourse(item.careerId, courseId)}
              />
            ))}

            <div className="text-center pt-4">
              <Button variant="outline" asChild>
                <Link to="/careers">
                  + Add Another Career
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <OrderSummaryCard
                allCourses={allCourses}
                breakdown={totalBreakdown}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                appliedPromo={appliedPromo}
                promoError={promoError}
                onApplyPromo={handleApplyPromo}
                onRemovePromo={handleRemovePromo}
                itemCount={items.length}
              />
            </div>
          </div>
        </div>

        {/* Mobile sticky bottom */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border p-4 shadow-lg">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <p className="text-xs text-muted-foreground">
                {allCourses.length} course{allCourses.length !== 1 ? "s" : ""} · {items.length} career{items.length !== 1 ? "s" : ""}
              </p>
              <p className="text-lg font-bold text-foreground">{formatPrice(totalBreakdown.finalTotal)}</p>
            </div>
            <Button disabled={allCourses.length === 0}>
              <Zap className="h-4 w-4 mr-2" />
              Ready for Checkout
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

/* ─── Career Cart Card ─── */
function CareerCartCard({
  item, isCustomizing, onCustomize, onRemove, onToggleCourse,
}: {
  item: CareerPlanItem;
  isCustomizing: boolean;
  onCustomize: () => void;
  onRemove: () => void;
  onToggleCourse: (courseId: string) => void;
}) {
  const Icon = ICON_MAP[item.careerIcon] || BookOpen;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-lg leading-tight">{item.careerName}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {item.selectedCourseIds.length} course{item.selectedCourseIds.length !== 1 ? "s" : ""} included
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onCustomize}>
              {isCustomizing ? (
                <>Collapse <ChevronUp className="h-3.5 w-3.5 ml-1" /></>
              ) : (
                <>Customize <ChevronDown className="h-3.5 w-3.5 ml-1" /></>
              )}
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onRemove}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isCustomizing && (
          <div className="pt-2 border-t border-border space-y-3">
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">Courses</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {item.courses.map((course) => {
                const isSelected = item.selectedCourseIds.includes(course.id);
                return (
                  <button
                    key={course.id}
                    onClick={() => onToggleCourse(course.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-left transition-all",
                      isSelected
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className="min-w-0 mr-3">
                      <p className={cn("text-sm font-medium truncate", isSelected ? "text-foreground" : "text-muted-foreground")}>
                        {course.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium text-foreground">{formatPrice(course.originalPrice)}</span>
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                      )}>
                        {isSelected && (
                          <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Order Summary Card ─── */
function OrderSummaryCard({
  allCourses, breakdown, promoCode, onPromoCodeChange,
  appliedPromo, promoError, onApplyPromo, onRemovePromo, itemCount,
}: {
  allCourses: { id: string; name: string; originalPrice: number }[];
  breakdown: { courseSubtotal: number; bundleDiscount: number; promoDiscount: number; finalTotal: number; savings: number; itemCount: number };
  promoCode: string;
  onPromoCodeChange: (v: string) => void;
  appliedPromo: string | null;
  promoError: string | null;
  onApplyPromo: (code: string) => void;
  onRemovePromo: () => void;
  itemCount: number;
}) {
  const hasBundleDiscount = breakdown.bundleDiscount > 0;
  const hasSavings = breakdown.savings > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-md">
      <div>
        <h3 className="font-bold text-foreground text-lg">Order Summary</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {allCourses.length} course{allCourses.length !== 1 ? "s" : ""} · {itemCount} career{itemCount !== 1 ? "s" : ""}
        </p>
      </div>

      {allCourses.length > 0 ? (
        <ul className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
          {allCourses.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-sm gap-2">
              <span className="text-foreground truncate mr-2">{c.name}</span>
              <span className="text-foreground font-medium whitespace-nowrap shrink-0">
                {formatPrice(c.originalPrice)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">No courses selected.</p>
      )}

      <Separator />

      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">Subtotal</span>
        <span className="text-foreground font-medium">{formatPrice(breakdown.courseSubtotal)}</span>
      </div>

      {hasBundleDiscount && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-primary/70" />
            Bundle Discount
          </span>
          <span className="text-primary font-medium">−{formatPrice(breakdown.bundleDiscount)}</span>
        </div>
      )}

      {/* Promo code */}
      <div className="space-y-2">
        {appliedPromo ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary/70" />
                <span className="text-muted-foreground">Promo: {appliedPromo}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-primary font-medium">−{formatPrice(breakdown.promoDiscount)}</span>
                <button onClick={onRemovePromo} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="text-[11px] text-primary/80">✔ Valid promo code</p>
          </>
        ) : (
          <div className="space-y-1.5">
            <div className="flex gap-2">
              <Input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => onPromoCodeChange(e.target.value)}
                className="h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && onApplyPromo(promoCode)}
              />
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={() => onApplyPromo(promoCode)}>
                Apply
              </Button>
            </div>
            {promoError && <p className="text-[11px] text-destructive">{promoError}</p>}
          </div>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <span className="font-bold text-foreground text-base">Total</span>
        <span className="text-2xl font-bold text-primary">{formatPrice(breakdown.finalTotal)}</span>
      </div>

      {hasSavings && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10">
          <PartyPopper className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs font-medium text-primary">You saved {formatPrice(breakdown.savings)} on this plan.</p>
        </div>
      )}

      <Button className="w-full h-12 text-base font-semibold" size="lg" disabled={allCourses.length === 0}>
        <Zap className="h-4 w-4 mr-2" />
        Ready for Checkout
      </Button>

      <p className="text-[10px] text-center text-muted-foreground">Subtotal does not include applicable taxes.</p>

      <Separator />

      <div className="space-y-2">
        {[
          { icon: ShieldCheck, text: "Transparent pricing. No hidden fees." },
          { icon: Sparkles, text: "Flexible learning plan" },
          { icon: Settings2, text: "Customize anytime before checkout" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <item.icon className="h-3 w-3 shrink-0 text-primary/60" />
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Plan;
