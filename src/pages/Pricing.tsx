import { useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import SEOHead from "@/components/SEOHead";
import PricingHeroSection from "@/components/pricing/PricingHeroSection";
import CareerPlanSelectionSection from "@/components/pricing/CareerPlanSelectionSection";
import CareerCustomizationSection from "@/components/pricing/CareerCustomizationSection";
import PricingSummaryPanel from "@/components/pricing/PricingSummaryPanel";
import { usePricingState } from "@/components/pricing/usePricingState";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const customizationRef = useRef<HTMLDivElement>(null);

  const {
    careers,
    courses,
    selectedCareerId,
    selectedCareer,
    selectedCourseIds,
    includedCourses,
    addOnCourses,
    selectedCourses,
    totalPrice,
    validationError,
    loading,
    handleSelectCareer,
    handleToggleCourse,
    // Promo
    promoCode,
    setPromoCode,
    appliedPromo,
    promoDiscount,
    promoError,
    handleApplyPromo,
    handleRemovePromo,
    // Breakdown
    breakdown,
  } = usePricingState();

  const handleCheckout = useCallback(() => {
    if (!selectedCareer || selectedCourses.length === 0) return;
    if (!user) {
      setShowAuthDialog(true);
      return;
    }
    const cartData = {
      careerId: selectedCareer.id,
      careerName: selectedCareer.name,
      courses: selectedCourses.map((c) => ({ id: c.id, name: c.name, price: c.discountPrice })),
      subtotal: breakdown.courseSubtotal,
      bundleDiscount: breakdown.bundleDiscount,
      promoCode: appliedPromo,
      promoDiscount: breakdown.promoDiscount,
      finalTotal: breakdown.finalTotal,
      savings: breakdown.savings,
    };
    sessionStorage.setItem("checkout_cart", JSON.stringify(cartData));
    navigate("/checkout");
  }, [selectedCareer, selectedCourses, breakdown, appliedPromo, navigate]);

  const onSelectCareer = (id: string) => {
    handleSelectCareer(id);
    setTimeout(() => {
      customizationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <Layout>
      <SEOHead
        title="Build Your Career Plan | Customize Your Learning Path"
        description="Choose a career path, customize courses, and pay only for what you need. Transparent pricing with flexible learning."
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
        <PricingHeroSection />

        {/* GoDaddy-style 2-column layout */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-8 mt-10 items-start">
          {/* Left: All customization */}
          <div className="space-y-10 min-w-0">
            <CareerPlanSelectionSection
              careers={careers}
              courses={courses}
              selectedCareerId={selectedCareerId}
              loading={loading}
              onSelectCareer={onSelectCareer}
            />

            <div ref={customizationRef}>
              <CareerCustomizationSection
                selectedCareer={selectedCareer}
                includedCourses={includedCourses}
                addOnCourses={addOnCourses}
                selectedCourseIds={selectedCourseIds}
                validationError={validationError}
                onToggleCourse={handleToggleCourse}
              />
            </div>
          </div>

          {/* Right: Sticky checkout summary */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <PricingSummaryPanel
                selectedCareer={selectedCareer}
                selectedCourses={selectedCourses}
                totalPrice={totalPrice}
                breakdown={breakdown}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                appliedPromo={appliedPromo}
                promoError={promoError}
                onApplyPromo={handleApplyPromo}
                onRemovePromo={handleRemovePromo}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        </div>

        {/* Mobile sticky bottom summary */}
        {selectedCareer && (
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border p-4 shadow-lg">
            <div className="flex items-center justify-between max-w-lg mx-auto">
              <div>
                <p className="text-xs text-muted-foreground">
                  {selectedCourses.length} course{selectedCourses.length !== 1 ? "s" : ""} selected
                </p>
                <p className="text-lg font-bold text-foreground">{formatPriceForMobile(totalPrice)}</p>
              </div>
              <button
                disabled={selectedCourses.length === 0}
                onClick={handleCheckout}
                className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50"
              >
                Ready for Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

function formatPriceForMobile(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default Pricing;
