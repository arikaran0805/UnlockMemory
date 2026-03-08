import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, Briefcase, Brain, BookOpen, Trash2, Settings2,
  ShoppingCart, ArrowRight, Clock,
  ShieldCheck, Sparkles, Zap, Tag, X, Package, PartyPopper, Search,
} from "lucide-react";
import { formatPrice } from "@/components/pricing/pricingData";
import type { CareerPlanItem } from "@/contexts/CareerPlanContext";
import type { PricingCourse } from "@/components/pricing/pricingData";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

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
          <div className="space-y-8">
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

/* ─── Career Cart Card (matching screenshot UI) ─── */
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
  const basePrice = item.courses.reduce((s, c) => s + c.originalPrice, 0);

  return (
    <div className="space-y-8">
      {/* Career Card */}
      <Card className={cn(
        "relative transition-all duration-300",
        isCustomizing
          ? "border-primary ring-2 ring-primary/20 shadow-lg"
          : "border-border hover:border-primary/40"
      )}>
        {/* Selected badge */}
        <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          Selected
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground text-lg leading-tight">{item.careerName}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.careerDescription}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Self-paced
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> {item.selectedCourseIds.length} courses
              </span>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Starts from</span>
              <p className="text-xl font-bold text-foreground">{formatPrice(basePrice)}</p>
            </div>
            <div className="flex items-center gap-2">
              {isCustomizing ? (
                <Button size="sm" variant="default" disabled className="shrink-0">
                  Customizing
                </Button>
              ) : (
                <Button size="sm" variant="default" onClick={onCustomize} className="shrink-0">
                  Customize
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customization Section */}
      {isCustomizing && (
        <CustomizationSection item={item} onToggleCourse={onToggleCourse} />
      )}
    </div>
  );
}

/* ─── Customization Section (matching screenshot UI) ─── */
function CustomizationSection({
  item, onToggleCourse,
}: {
  item: CareerPlanItem;
  onToggleCourse: (courseId: string) => void;
}) {
  const [courseSearch, setCourseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PricingCourse[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debouncedSearch = useDebounce(courseSearch, 300);

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults(null);
      return;
    }
    const search = async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, description, original_price, discount_price")
        .ilike("name", `%${debouncedSearch}%`)
        .eq("status", "published")
        .limit(10);
      if (!error && data) {
        const mapped: PricingCourse[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          price: Number(c.discount_price) || Number(c.original_price) || 0,
          originalPrice: Number(c.original_price) || 0,
          discountPrice: Number(c.discount_price) || Number(c.original_price) || 0,
        }));
        setSearchResults(mapped);
      }
      setSearching(false);
    };
    search();
  }, [debouncedSearch]);

  // Included courses (selected ones from default + any add-ons)
  const includedCourses = item.courses.filter((c) => item.selectedCourseIds.includes(c.id));

  // Add-on search results (exclude already included)
  const includedIds = new Set(item.courses.map((c) => c.id));
  const addOnResults = searchResults
    ? searchResults.filter((c) => !includedIds.has(c.id) && !item.selectedCourseIds.includes(c.id))
    : [];

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Customize Your Plan
        </h2>
        <p className="text-sm text-muted-foreground">
          {item.careerName} · {item.selectedCourseIds.length} course{item.selectedCourseIds.length !== 1 ? "s" : ""} selected
        </p>
        <p className="text-xs text-muted-foreground">
          Remove included courses or add extra courses to match your goals.
        </p>
      </div>

      {/* Included Courses */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Included in this Career</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {item.courses.map((course) => {
            const isSelected = item.selectedCourseIds.includes(course.id);
            const isDefault = item.defaultCourseIds.includes(course.id);
            const op = course.originalPrice;
            const dp = course.discountPrice;
            const hasDiscount = op > dp;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => onToggleCourse(course.id)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                  isSelected
                    ? "border-primary/60 bg-primary/5"
                    : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleCourse(course.id)}
                  className="shrink-0 mt-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{course.name}</span>
                    {isDefault && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-0">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {hasDiscount ? (
                    <>
                      <span className="text-xs text-muted-foreground line-through block">{formatPrice(op)}</span>
                      <span className="font-semibold text-foreground">{formatPrice(dp)}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-foreground whitespace-nowrap">{formatPrice(dp)}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Extra Courses */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Add Extra Courses</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Strengthen your career path with additional skills.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses to add..."
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {courseSearch && (
            <button
              onClick={() => setCourseSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {searching ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Searching...</p>
        ) : addOnResults.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {addOnResults.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggleCourse(c.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/30 hover:bg-muted/30 transition-all duration-200 text-left group"
              >
                <Checkbox checked={false} className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{c.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Add-on</Badge>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {c.originalPrice > c.discountPrice ? (
                    <>
                      <span className="text-xs text-muted-foreground line-through block">{formatPrice(c.originalPrice)}</span>
                      <span className="font-semibold text-foreground">{formatPrice(c.discountPrice)}</span>
                    </>
                  ) : (
                    <span className="font-semibold text-foreground whitespace-nowrap">{formatPrice(c.discountPrice)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {courseSearch ? `No courses found matching "${courseSearch}".` : "No additional courses available for this plan right now."}
          </p>
        )}
      </div>
    </section>
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
