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
          ? "border-muted-foreground/35 bg-muted/40"
          : "border-border bg-card hover:border-muted-foreground/20 hover:bg-muted/20"
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
            variant="secondary"
            className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-0"
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
