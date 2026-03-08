import { BarChart3, Briefcase, Brain, Clock, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PricingCareer, PricingCourse } from "./pricingData";
import { formatPrice } from "./pricingData";

const ICON_MAP: Record<string, React.ElementType> = {
  BarChart3,
  Briefcase,
  Brain,
};

interface CareerPlanCardProps {
  career: PricingCareer;
  courses: PricingCourse[];
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const CareerPlanCard = ({ career, courses, isSelected, onSelect }: CareerPlanCardProps) => {
  const Icon = ICON_MAP[career.icon] || BookOpen;
  const includedCourses = career.includedCourseIds
    .map((id) => courses.find((c) => c.id === id))
    .filter(Boolean) as PricingCourse[];
  const basePrice = includedCourses.reduce((s, c) => s + c.price, 0);

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-300 hover:shadow-lg group",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-lg"
          : "border-border hover:border-primary/40"
      )}
      onClick={() => onSelect(career.id)}
    >
      {isSelected && (
        <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          Selected
        </div>
      )}
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-lg leading-tight">{career.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{career.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> {career.duration}
          </span>
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> {includedCourses.length} courses
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {includedCourses.slice(0, 4).map((c) => (
            <Badge key={c.id} variant="secondary" className="text-xs font-normal">
              {c.name}
            </Badge>
          ))}
          {includedCourses.length > 4 && (
            <Badge variant="secondary" className="text-xs font-normal">+{includedCourses.length - 4}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <span className="text-xs text-muted-foreground">Starts from</span>
            <p className="text-xl font-bold text-foreground">{formatPrice(basePrice)}</p>
          </div>
          <Button size="sm" variant={isSelected ? "default" : "outline"} className="shrink-0">
            {isSelected ? "Customizing" : "Customize Plan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CareerPlanCard;
