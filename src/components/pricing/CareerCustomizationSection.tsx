import { useState, useEffect, useMemo } from "react";
import { Settings2, AlertCircle, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
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
  const [courseSearch, setCourseSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PricingCourse[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debouncedSearch = useDebounce(courseSearch, 300);

  // Search courses from DB
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults(null);
      return;
    }

    const searchCourses = async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, name, description")
        .ilike("name", `%${debouncedSearch}%`)
        .eq("status", "published")
        .limit(10);

      if (!error && data) {
        const mapped: PricingCourse[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          price: 0,
        }));
        setSearchResults(mapped);
      }
      setSearching(false);
    };

    searchCourses();
  }, [debouncedSearch]);

  // Split courses: selected add-ons go to included, rest stay as add-ons
  const selectedAddOnIds = useMemo(() => {
    if (!selectedCareer) return new Set<string>();
    const includedSet = new Set(selectedCareer.includedCourseIds);
    return new Set(selectedCourseIds.filter((id) => !includedSet.has(id)));
  }, [selectedCareer, selectedCourseIds]);

  // Included = original included + selected add-ons
  const displayIncluded = useMemo(() => {
    const selectedAddOns = addOnCourses.filter((c) => selectedAddOnIds.has(c.id));
    // Also include search result courses that were selected but aren't in addOnCourses
    const searchSelectedIds = [...selectedAddOnIds].filter(
      (id) => !addOnCourses.some((c) => c.id === id) && !includedCourses.some((c) => c.id === id)
    );
    const searchSelected = searchResults
      ? searchResults.filter((c) => searchSelectedIds.includes(c.id))
      : [];
    return [...includedCourses, ...selectedAddOns, ...searchSelected];
  }, [includedCourses, addOnCourses, selectedAddOnIds, searchResults]);

  // Add-ons to display: only 3 related, exclude selected ones
  const displayAddOns = useMemo(() => {
    if (courseSearch.trim() && searchResults) {
      // When searching, show search results excluding already-included and already-selected
      const includedSet = new Set(selectedCareer?.includedCourseIds || []);
      return searchResults.filter(
        (c) => !includedSet.has(c.id) && !selectedAddOnIds.has(c.id)
      );
    }
    // Default: show first 3 add-ons that aren't selected
    return addOnCourses
      .filter((c) => !selectedAddOnIds.has(c.id))
      .slice(0, 3);
  }, [addOnCourses, selectedAddOnIds, courseSearch, searchResults, selectedCareer]);

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
          {selectedCareer.name} · {selectedCourseIds.length} course{selectedCourseIds.length !== 1 ? "s" : ""} selected
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
          {displayIncluded.map((c) => (
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

        {/* Course Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses to add..."
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {courseSearch && (
            <button
              onClick={() => setCourseSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {searching ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Searching...</p>
        ) : displayAddOns.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displayAddOns.map((c) => (
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
            {courseSearch ? `No courses found matching "${courseSearch}".` : "No additional courses available for this plan right now."}
          </p>
        )}
      </div>
    </section>
  );
};

export default CareerCustomizationSection;
