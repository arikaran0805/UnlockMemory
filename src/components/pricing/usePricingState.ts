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
        .select("id, name, description, icon, color, slug, status, discount_percentage, career_courses(course_id, is_primary, courses(id, name, description, original_price, discount_price))")
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
          discountPercentage: Number(c.discount_percentage) || 0,
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
    () => calculateBreakdown(selectedCourses, promoDiscount, selectedCareer?.discountPercentage ?? 0),
    [selectedCourses, promoDiscount, selectedCareer]
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
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        setPromoError("Please enter a promo code.");
        return;
      }

      // Look up promo code from database
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", trimmed)
        .eq("is_active", true)
        .maybeSingle();

      if (error || !data) {
        setPromoError("Invalid promo code. Please try again.");
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      // Check expiry
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        setPromoError("This promo code has expired.");
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.used_count >= data.usage_limit) {
        setPromoError("This promo code has reached its usage limit.");
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      // Check minimum purchase
      const subtotal = selectedCourses.reduce((s, c) => s + c.originalPrice, 0);
      if (data.min_purchase && subtotal < data.min_purchase) {
        setPromoError(`Minimum purchase of ₹${data.min_purchase} required.`);
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      // Calculate discount
      let discount = 0;
      if (data.discount_type === "percentage") {
        discount = Math.round(subtotal * (data.discount_value / 100));
        if (data.max_discount && discount > data.max_discount) {
          discount = data.max_discount;
        }
      } else {
        discount = data.discount_value;
      }

      setAppliedPromo(trimmed);
      setPromoDiscount(discount);
      setPromoError(null);
    },
    [selectedCourses]
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
