import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PricingCareer, PricingCourse } from "./pricingData";
import CareerPlanCard from "./CareerPlanCard";

interface Props {
  careers: PricingCareer[];
  courses: PricingCourse[];
  selectedCareerId: string | null;
  onSelectCareer: (id: string) => void;
}

const CareerPlanSelectionSection = ({ careers, courses, selectedCareerId, onSelectCareer }: Props) => {
  const [search, setSearch] = useState("");

  const filteredCareers = useMemo(() => {
    if (!search.trim()) return careers;
    const q = search.toLowerCase();
    return careers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  }, [careers, search]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Choose a Career Path</h2>
        <p className="text-sm text-muted-foreground mt-1">Select a career to see included courses and customize your plan.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search careers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredCareers.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCareers.map((career) => (
            <CareerPlanCard
              key={career.id}
              career={career}
              courses={courses}
              isSelected={selectedCareerId === career.id}
              onSelect={onSelectCareer}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-6 text-center">No careers found matching "{search}"</p>
      )}
    </section>
  );
};

export default CareerPlanSelectionSection;
