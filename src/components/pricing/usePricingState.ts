import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_COURSES, type PricingCourse, type PricingCareer } from "./pricingData";

export function usePricingState() {
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [careers, setCareers] = useState<PricingCareer[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch careers with their linked courses from DB
  useEffect(() => {
    const fetchCareers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("careers")
        .select("id, name, description, icon, color, slug, status, career_courses(course_id, is_primary, courses(id, name, description))")
        .eq("status", "published")
        .order("display_order", { ascending: true });

      if (!error && data) {
        const mapped: PricingCareer[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          duration: "Self-paced",
          icon: c.icon || "BookOpen",
          includedCourseIds: (c.career_courses || [])
            .filter((cc: any) => cc.courses)
            .map((cc: any) => cc.courses.id),
        }));
        setCareers(mapped);
      }
      setLoading(false);
    };
    fetchCareers();
  }, []);

  const courses = SAMPLE_COURSES;

  // Combine DB course data into the courses list so cards can resolve names
  const allCourses = useMemo(() => {
    // Collect courses from career_courses that aren't in SAMPLE_COURSES
    const dbCourseIds = new Set(courses.map((c) => c.id));
    const extraCourses: PricingCourse[] = [];
    careers.forEach((career) => {
      career.includedCourseIds.forEach((cid) => {
        if (!dbCourseIds.has(cid) && !extraCourses.find((e) => e.id === cid)) {
          // We don't have price/desc for DB courses yet, use defaults
          extraCourses.push({ id: cid, name: cid, description: "", price: 0 });
        }
      });
    });
    return [...courses, ...extraCourses];
  }, [courses, careers]);

  const selectedCareer = useMemo(
    () => careers.find((c) => c.id === selectedCareerId) ?? null,
    [selectedCareerId, careers]
  );

  const includedCourses = useMemo<PricingCourse[]>(() => {
    if (!selectedCareer) return [];
    return selectedCareer.includedCourseIds
      .map((id) => allCourses.find((c) => c.id === id))
      .filter(Boolean) as PricingCourse[];
  }, [selectedCareer, allCourses]);

  const addOnCourses = useMemo<PricingCourse[]>(() => {
    if (!selectedCareer) return [];
    return allCourses.filter((c) => !selectedCareer.includedCourseIds.includes(c.id));
  }, [selectedCareer, allCourses]);

  const selectedCourses = useMemo<PricingCourse[]>(
    () => selectedCourseIds.map((id) => allCourses.find((c) => c.id === id)).filter(Boolean) as PricingCourse[],
    [selectedCourseIds, allCourses]
  );

  const totalPrice = useMemo(
    () => selectedCourses.reduce((sum, c) => sum + c.price, 0),
    [selectedCourses]
  );

  const handleSelectCareer = useCallback(
    (careerId: string) => {
      const career = careers.find((c) => c.id === careerId);
      if (!career) return;
      setSelectedCareerId(careerId);
      setSelectedCourseIds([...career.includedCourseIds]);
      setValidationError(null);
    },
    [careers]
  );

  const handleToggleCourse = useCallback(
    (courseId: string) => {
      setSelectedCourseIds((prev) => {
        if (prev.includes(courseId)) {
          if (prev.length <= 1) {
            setValidationError("At least one course must remain in your learning plan.");
            return prev;
          }
          setValidationError(null);
          return prev.filter((id) => id !== courseId);
        }
        setValidationError(null);
        return [...prev, courseId];
      });
    },
    []
  );

  return {
    careers,
    courses: allCourses,
    selectedCareerId,
    selectedCareer,
    selectedCourseIds,
    includedCourses,
    addOnCourses,
    selectedCourses,
    totalPrice,
    validationError,
    loading,
    handleSelectCareer,
    handleToggleCourse,
  };
}
