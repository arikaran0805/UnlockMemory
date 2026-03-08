import { ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { PricingCareer, PricingCourse } from "./pricingData";
import { formatPrice } from "./pricingData";

interface Props {
  selectedCareer: PricingCareer | null;
  selectedCourses: PricingCourse[];
  totalPrice: number;
}

const PricingSummaryPanel = ({ selectedCareer, selectedCourses, totalPrice }: Props) => {
  const canEnroll = selectedCourses.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-sm">
      <h3 className="font-semibold text-foreground text-lg">Your Plan Summary</h3>

      {!selectedCareer ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Select a career path to see your plan summary.
        </p>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium text-foreground">{selectedCareer.name}</p>
            <p className="text-xs text-muted-foreground">{selectedCareer.duration}</p>
          </div>

          <Separator />

          {selectedCourses.length > 0 ? (
            <ul className="space-y-2.5">
              {selectedCourses.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate mr-2">{c.name}</span>
                  <span className="text-muted-foreground whitespace-nowrap">{formatPrice(c.price)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No courses selected.</p>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">Total Price</span>
            <span className="text-xl font-bold text-foreground">{formatPrice(totalPrice)}</span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your total is calculated based on the courses currently selected in your career plan.
          </p>

          <Button className="w-full h-11" size="lg" disabled={!canEnroll}>
            <Zap className="h-4 w-4 mr-2" />
            Proceed to Enroll
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Transparent pricing. No hidden fees.
          </div>
        </>
      )}
    </div>
  );
};

export default PricingSummaryPanel;
