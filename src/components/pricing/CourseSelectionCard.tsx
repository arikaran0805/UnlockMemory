import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatPrice } from "./pricingData";

interface CourseSelectionCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  type: "default" | "included" | "addon";
  isSelected: boolean;
  onToggle: (id: string) => void;
}

const CourseSelectionCard = ({ id, name, description, price, type, isSelected, onToggle }: CourseSelectionCardProps) => (
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
          variant={type === "included" ? "default" : "secondary"}
          className={cn(
            "text-[10px] px-1.5 py-0",
            type === "included" ? "bg-primary/15 text-primary border-0" : ""
          )}
        >
          {type === "included" ? "Included" : "Add-on"}
        </Badge>
      </div>
      
    </div>

    <span className="font-semibold text-foreground whitespace-nowrap shrink-0">{formatPrice(price)}</span>
  </button>
);

export default CourseSelectionCard;
