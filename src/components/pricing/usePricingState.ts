import { useState, useMemo, useCallback } from "react";
import { SAMPLE_COURSES, SAMPLE_CAREERS, type PricingCourse, type PricingCareer } from "./pricingData";

export function usePricingState() {
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  const courses = SAMPLE_COURSES;
  const careers = SAMPLE_CAREERS;

  const selectedCareer = useMemo(
    () => careers.find((c) => c.id === selectedCareerId) ?? null,
    [selectedCareerId, careers]
  );

  const includedCourses = useMemo<PricingCourse[]>(() => {
    if (!selectedCareer) return [];
    return selectedCareer.includedCourseIds
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean) as PricingCourse[];
  }, [selectedCareer, courses]);

  const addOnCourses = useMemo<PricingCourse[]>(() => {
    if (!selectedCareer) return [];
    return courses.filter((c) => !selectedCareer.includedCourseIds.includes(c.id));
  }, [selectedCareer, courses]);

  const selectedCourses = useMemo<PricingCourse[]>(
    () => selectedCourseIds.map((id) => courses.find((c) => c.id === id)).filter(Boolean) as PricingCourse[],
    [selectedCourseIds, courses]
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
    courses,
    selectedCareerId,
    selectedCareer,
    selectedCourseIds,
    includedCourses,
    addOnCourses,
    selectedCourses,
    totalPrice,
    validationError,
    handleSelectCareer,
    handleToggleCourse,
  };
}
