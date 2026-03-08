import type { PricingCareer, PricingCourse } from "./pricingData";
import CareerPlanCard from "./CareerPlanCard";

interface Props {
  careers: PricingCareer[];
  courses: PricingCourse[];
  selectedCareerId: string | null;
  onSelectCareer: (id: string) => void;
}

const CareerPlanSelectionSection = ({ careers, courses, selectedCareerId, onSelectCareer }: Props) => (
  <section className="space-y-4">
    <div>
      <h2 className="text-xl font-semibold text-foreground">Choose a Career Path</h2>
      <p className="text-sm text-muted-foreground mt-1">Select a career to see included courses and customize your plan.</p>
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {careers.map((career) => (
        <CareerPlanCard
          key={career.id}
          career={career}
          courses={courses}
          isSelected={selectedCareerId === career.id}
          onSelect={onSelectCareer}
        />
      ))}
    </div>
  </section>
);

export default CareerPlanSelectionSection;
