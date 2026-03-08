import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatPrice } from "./pricingData";

interface CourseSelectionCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discountPrice?: number;
  type: "default" | "included" | "addon";
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const CourseSelectionCard = ({
  id,
  name,
  price,
  originalPrice,
  discountPrice,
  type,
  isSelected,
  onToggle,
}: CourseSelectionCardProps) => {
  const op = originalPrice ?? price;
  const dp = discountPrice ?? price;
  const hasDiscount = op > dp;

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left group",
        isSelected
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(id)}
        className="shrink-0 mt-0.5"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{name}</span>
          <Badge
            variant={type === "addon" ? "secondary" : "default"}
            className={cn(
              "text-[10px] px-1.5 py-0",
              type !== "addon" ? "bg-primary/15 text-primary border-0" : ""
            )}
          >
            {type === "default" ? "Default" : type === "included" ? "Included" : "Add-on"}
          </Badge>
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
};

export default CourseSelectionCard;
