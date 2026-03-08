import { useState, useMemo, useCallback, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { PricingCareer, PricingCourse } from "./pricingData";
import CareerPlanCard from "./CareerPlanCard";
import { useDebounce } from "@/hooks/useDebounce";

interface Props {
  careers: PricingCareer[];
  courses: PricingCourse[];
  selectedCareerId: string | null;
  loading?: boolean;
  onSelectCareer: (id: string) => void;
}

const CareerPlanSelectionSection = ({ careers, courses, selectedCareerId, loading, onSelectCareer }: Props) => {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<PricingCareer[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Search from DB when user types
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults(null);
      return;
    }

    const searchCareers = async () => {
      setSearching(true);
      const { data, error } = await supabase
        .from("careers")
        .select("id, name, description, icon, color, slug, discount_percentage, career_courses(course_id, courses(id, name))")
        .eq("status", "published")
        .ilike("name", `%${debouncedSearch}%`)
        .order("display_order", { ascending: true });

      if (!error && data) {
        const mapped: PricingCareer[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          duration: "Self-paced",
          icon: c.icon || "BookOpen",
          discountPercentage: Number(c.discount_percentage) || 0,
          includedCourseIds: (c.career_courses || [])
            .filter((cc: any) => cc.courses)
            .map((cc: any) => cc.courses.id),
        }));
        setSearchResults(mapped);
      }
      setSearching(false);
    };

    searchCareers();
  }, [debouncedSearch]);

  const selectedCareer = useMemo(
    () => careers.find((c) => c.id === selectedCareerId) ?? null,
    [careers, selectedCareerId]
  );

  // Determine which cards to show
  const displayCareers = useMemo(() => {
    // If a career is selected and no search, show only the selected card
    if (selectedCareerId && !search.trim()) {
      return selectedCareer ? [selectedCareer] : [];
    }
    // If searching, show search results
    if (search.trim() && searchResults) {
      return searchResults;
    }
    // Default: show first 3
    return careers.slice(0, 3);
  }, [careers, selectedCareerId, selectedCareer, search, searchResults]);

  const handleClearSelection = useCallback(() => {
    setSearch("");
    // We don't deselect here — just allow user to browse again via search
  }, []);

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
          className="pl-9 pr-9"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Show "Change career" hint when a career is selected and not searching */}
      {selectedCareerId && !search.trim() && (
        <p className="text-xs text-muted-foreground">
          Use the search above to browse and switch to a different career path.
        </p>
      )}

      {loading || searching ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : displayCareers.length > 0 ? (
        <div className={`grid gap-4 ${
          displayCareers.length === 1 
            ? "grid-cols-1" 
            : "sm:grid-cols-2 lg:grid-cols-3"
        }`}>
          {displayCareers.map((career) => (
            <CareerPlanCard
              key={career.id}
              career={career}
              courses={courses}
              isSelected={selectedCareerId === career.id}
              anySelected={!!selectedCareerId}
              onSelect={onSelectCareer}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No careers found{search ? ` matching "${search}"` : ""}.
        </p>
      )}
    </section>
  );
};

export default CareerPlanSelectionSection;
