import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_COURSES, type PricingCourse, type PricingCareer } from "./pricingData";

export function usePricingState() {
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [careers, setCareers] = useState<PricingCareer[]>([]);
  const [dbCourses, setDbCourses] = useState<PricingCourse[]>([]);
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
        const coursesMap = new Map<string, PricingCourse>();

        const mapped: PricingCareer[] = data.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description || "",
          duration: "Self-paced",
          icon: c.icon || "BookOpen",
          includedCourseIds: (c.career_courses || [])
            .filter((cc: any) => cc.courses)
            .map((cc: any) => {
              const course = cc.courses;
              if (!coursesMap.has(course.id)) {
                coursesMap.set(course.id, {
                  id: course.id,
                  name: course.name,
                  description: course.description || "",
                  price: 0,
                });
              }
              return course.id;
            }),
        }));

        setCareers(mapped);
        setDbCourses(Array.from(coursesMap.values()));
      }
      setLoading(false);
    };
    fetchCareers();
  }, []);

  // Merge sample courses with DB courses (DB courses override if same id)
  const allCourses = useMemo(() => {
    const merged = new Map<string, PricingCourse>();
    SAMPLE_COURSES.forEach((c) => merged.set(c.id, c));
    dbCourses.forEach((c) => {
      if (!merged.has(c.id)) merged.set(c.id, c);
    });
    return Array.from(merged.values());
  }, [dbCourses]);

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
