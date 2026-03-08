import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type PricingCourse, type PricingCareer, calculateBreakdown } from "./pricingData";

export function usePricingState() {
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [careers, setCareers] = useState<PricingCareer[]>([]);
  const [dbCourses, setDbCourses] = useState<PricingCourse[]>([]);
  const [loading, setLoading] = useState(true);

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Fetch careers with their linked courses from DB
  useEffect(() => {
    const fetchCareers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("careers")
        .select("id, name, description, icon, color, slug, status, career_courses(course_id, is_primary, courses(id, name, description, original_price, discount_price))")
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
                const op = Number(course.original_price) || 0;
                const dp = Number(course.discount_price) || op;
                coursesMap.set(course.id, {
                  id: course.id,
                  name: course.name,
                  description: course.description || "",
                  price: dp,
                  originalPrice: op,
                  discountPrice: dp,
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

  const allCourses = useMemo(() => dbCourses, [dbCourses]);

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

  const breakdown = useMemo(
    () => calculateBreakdown(selectedCourses, promoDiscount),
    [selectedCourses, promoDiscount]
  );

  const totalPrice = breakdown.finalTotal;

  const handleSelectCareer = useCallback(
    (careerId: string) => {
      const career = careers.find((c) => c.id === careerId);
      if (!career) return;
      setSelectedCareerId(careerId);
      setSelectedCourseIds([...career.includedCourseIds]);
      setValidationError(null);
      // Reset promo on career change
      setAppliedPromo(null);
      setPromoDiscount(0);
      setPromoCode("");
      setPromoError(null);
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

  const handleApplyPromo = useCallback(
    (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        setPromoError("Please enter a promo code.");
        return;
      }
      // Simple promo logic — flat ₹500 off for GOINDIA
      if (trimmed === "GOINDIA") {
        setAppliedPromo(trimmed);
        setPromoDiscount(500);
        setPromoError(null);
      } else {
        setPromoError("Invalid promo code. Please try again.");
        setAppliedPromo(null);
        setPromoDiscount(0);
      }
    },
    []
  );

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoCode("");
    setPromoError(null);
  }, []);

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
    // Promo
    promoCode,
    setPromoCode,
    appliedPromo,
    promoDiscount,
    promoError,
    handleApplyPromo,
    handleRemovePromo,
    // Breakdown
    breakdown,
  };
}
