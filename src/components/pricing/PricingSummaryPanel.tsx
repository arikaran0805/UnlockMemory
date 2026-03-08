import { ShieldCheck, Zap, Sparkles, Settings2 } from "lucide-react";
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
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-md">
      <h3 className="font-semibold text-foreground text-lg">Your Plan Summary</h3>

      {!selectedCareer ? (
        <div className="py-10 text-center space-y-3">
          <Settings2 className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Select a career path to see your plan summary.
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium text-foreground">{selectedCareer.name}</p>
            <p className="text-xs text-muted-foreground">{selectedCareer.duration}</p>
          </div>

          <Separator />

          {selectedCourses.length > 0 ? (
            <ul className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
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
            <span className="text-2xl font-bold text-foreground">{formatPrice(totalPrice)}</span>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your total is calculated based on the courses currently selected in your career plan.
          </p>

          <Button className="w-full h-12 text-base font-semibold" size="lg" disabled={!canEnroll}>
            <Zap className="h-4 w-4 mr-2" />
            Proceed to Enroll
          </Button>

          <p className="text-[11px] text-center text-muted-foreground">
            You're paying only for the courses you selected.
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

export default PricingSummaryPanel;
