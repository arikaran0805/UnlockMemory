import { ShieldCheck, Sparkles, Settings2, Zap, Tag, X, Package, PartyPopper, Copy, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { PricingCareer, PricingCourse, PricingBreakdown } from "./pricingData";
import { formatPrice } from "./pricingData";

interface Props {
  selectedCareer: PricingCareer | null;
  selectedCourses: PricingCourse[];
  totalPrice: number;
  breakdown: PricingBreakdown;
  promoCode: string;
  onPromoCodeChange: (v: string) => void;
  appliedPromo: string | null;
  promoError: string | null;
  onApplyPromo: (code: string) => void;
  onRemovePromo: () => void;
  onCheckout?: () => void;
}

const PricingSummaryPanel = ({
  selectedCareer,
  selectedCourses,
  breakdown,
  promoCode,
  onPromoCodeChange,
  appliedPromo,
  promoError,
  onApplyPromo,
  onRemovePromo,
  onCheckout,
}: Props) => {
  const canEnroll = selectedCourses.length > 0;
  const hasBundleDiscount = breakdown.bundleDiscount > 0;
  const hasPromo = breakdown.promoDiscount > 0;
  const hasSavings = breakdown.savings > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-md">
      {/* 1. Order Summary Header */}
      <div>
        <h3 className="font-bold text-foreground text-lg">Order Summary</h3>
        {selectedCareer && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {breakdown.itemCount} item{breakdown.itemCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {!selectedCareer ? (
        <div className="py-10 text-center space-y-3">
          <Settings2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Select a career path to see your order summary.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Selected Career */}
          <div className="rounded-lg bg-muted/40 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{selectedCareer.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedCareer.duration} · {selectedCourses.length} course{selectedCourses.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Separator />

          {/* 3. Selected Courses List with individual prices */}
          {selectedCourses.length > 0 ? (
            <ul className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
              {selectedCourses.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="text-foreground truncate mr-2">{c.name}</span>
                  <span className="text-foreground font-medium whitespace-nowrap shrink-0">
                    {formatPrice(c.discountPrice)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No courses selected.</p>
          )}

          <Separator />

          {/* 4. Subtotal */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground font-medium">Subtotal</span>
            <span className="text-foreground font-medium">{formatPrice(breakdown.courseSubtotal)}</span>
          </div>

          {/* 5. Bundle Discount */}
          {hasBundleDiscount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-primary/70" />
                Bundle Discount ({selectedCareer?.discountPercentage || 0}%)
              </span>
              <span className="text-primary font-medium">
                −{formatPrice(breakdown.bundleDiscount)}
              </span>
            </div>
          )}

          {/* 6. Promo Code */}
          <div className="space-y-2">
            {appliedPromo ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-primary/70" />
                    <span className="text-muted-foreground">Promo Code: {appliedPromo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">
                      −{formatPrice(breakdown.promoDiscount)}
                    </span>
                    <button
                      onClick={onRemovePromo}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-primary/80 leading-snug">
                  VALID PROMO CODE. You're getting the best price we've got.
                </p>
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    onClick={() => onApplyPromo(promoCode)}
                  >
                    Apply
                  </Button>
                </div>
                {promoError && (
                  <p className="text-[11px] text-destructive">{promoError}</p>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* 7. Final Total */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-base">Total</span>
            <span className="text-2xl font-bold text-primary">{formatPrice(breakdown.finalTotal)}</span>
          </div>

          {/* 8. Savings Message */}
          {hasSavings && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10">
              <PartyPopper className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs font-medium text-primary">
                You saved {formatPrice(breakdown.savings)}
              </p>
            </div>
          )}

          {/* 9. Checkout Button */}
          <Button className="w-full h-12 text-base font-semibold" size="lg" disabled={!canEnroll} onClick={onCheckout}>
            <Zap className="h-4 w-4 mr-2" />
            Ready for Checkout
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Subtotal does not include applicable taxes.
          </p>

          <Separator />

          {/* Trust microcopy */}
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
        </>
      )}
    </div>
  );
};

/* ─── Available Promo Codes list ─── */
function AvailablePromoCodes({ onApply }: { onApply: (code: string) => void }) {
  const { data: codes = [] } = useQuery({
    queryKey: ["active-promo-codes-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("code, discount_type, discount_value, max_discount, description, expiry_date")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter out expired codes client-side
      return (data ?? []).filter(
        (c: any) => !c.expiry_date || new Date(c.expiry_date) > new Date()
      );
    },
  });

  if (codes.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
        <Ticket className="h-3 w-3" /> Available Codes
      </p>
      <div className="space-y-1">
        {codes.map((c: any) => (
          <button
            key={c.code}
            type="button"
            onClick={() => onApply(c.code)}
            className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-md border border-dashed border-border hover:border-primary/40 hover:bg-accent transition-colors text-left group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs font-semibold text-foreground">{c.code}</span>
              <span className="text-[10px] text-muted-foreground truncate">
                {c.discount_type === "percentage"
                  ? `${c.discount_value}% off${c.max_discount ? ` (max ₹${c.max_discount})` : ""}`
                  : `₹${c.discount_value} off`}
              </span>
            </div>
            <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              Apply
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default PricingSummaryPanel;
