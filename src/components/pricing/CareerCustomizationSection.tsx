import { Settings2, AlertCircle } from "lucide-react";
import type { PricingCareer, PricingCourse } from "./pricingData";
import CourseSelectionCard from "./CourseSelectionCard";

interface Props {
  selectedCareer: PricingCareer | null;
  includedCourses: PricingCourse[];
  addOnCourses: PricingCourse[];
  selectedCourseIds: string[];
  validationError: string | null;
  onToggleCourse: (id: string) => void;
}

const CareerCustomizationSection = ({
  selectedCareer,
  includedCourses,
  addOnCourses,
  selectedCourseIds,
  validationError,
  onToggleCourse,
}: Props) => {
  if (!selectedCareer) {
    return (
      <section className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border-2 border-dashed border-border bg-muted/20">
        <Settings2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground text-sm text-center">
          Select a career path above to customize your learning plan.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      {/* Selected Career Header */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          Customize Your Plan
        </h2>
        <p className="text-sm text-muted-foreground">
          {selectedCareer.name} · {selectedCareer.duration} · {selectedCourseIds.length} course{selectedCourseIds.length !== 1 ? "s" : ""} selected
        </p>
        <p className="text-xs text-muted-foreground">
          Remove included courses or add extra courses to match your goals.
        </p>
      </div>

      {/* Validation */}
      {validationError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {validationError}
        </div>
      )}

      {/* Included Courses */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Included in this Career</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {includedCourses.map((c) => (
            <CourseSelectionCard
              key={c.id}
              id={c.id}
              name={c.name}
              description={c.description}
              price={c.price}
              type="included"
              isSelected={selectedCourseIds.includes(c.id)}
              onToggle={onToggleCourse}
            />
          ))}
        </div>
      </div>

      {/* Add-on Courses */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Add Extra Courses</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Strengthen your career path with additional skills.</p>
        </div>
        {addOnCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {addOnCourses.map((c) => (
              <CourseSelectionCard
                key={c.id}
                id={c.id}
                name={c.name}
                description={c.description}
                price={c.price}
                type="addon"
                isSelected={selectedCourseIds.includes(c.id)}
                onToggle={onToggleCourse}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No additional courses available for this plan right now.
          </p>
        )}
      </div>
    </section>
  );
};

export default CareerCustomizationSection;
