import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PricingCourse, PricingBreakdown } from "@/components/pricing/pricingData";
import { calculateBreakdown } from "@/components/pricing/pricingData";

export interface CareerPlanItem {
  careerId: string;
  careerName: string;
  careerIcon: string;
  careerDescription: string;
  discountPercentage: number;
  defaultCourseIds: string[];
  selectedCourseIds: string[];
  courses: PricingCourse[];
}

interface CareerPlanContextType {
  items: CareerPlanItem[];
  itemCount: number;
  addCareer: (career: {
    id: string;
    name: string;
    icon: string;
    description: string;
    discountPercentage: number;
    courseIds: string[];
    courses: PricingCourse[];
  }) => void;
  removeCareer: (careerId: string) => void;
  isCareerInPlan: (careerId: string) => boolean;
  toggleCourse: (careerId: string, courseId: string) => void;
  getBreakdown: () => { items: CareerPlanItem[]; totalBreakdown: PricingBreakdown };
  getAllSelectedCourses: () => PricingCourse[];
  customizingCareerId: string | null;
  setCustomizingCareerId: (id: string | null) => void;
  // Promo
  promoCode: string;
  setPromoCode: (v: string) => void;
  appliedPromo: string | null;
  promoDiscount: number;
  promoError: string | null;
  handleApplyPromo: (code: string) => Promise<void>;
  handleRemovePromo: () => void;
}

const CareerPlanContext = createContext<CareerPlanContextType | undefined>(undefined);

export const CareerPlanProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CareerPlanItem[]>([]);
  const [customizingCareerId, setCustomizingCareerId] = useState<string | null>(null);

  // Promo state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  const itemCount = items.length;

  const isCareerInPlan = useCallback(
    (careerId: string) => items.some((i) => i.careerId === careerId),
    [items]
  );

  const addCareer = useCallback(
    (career: {
      id: string;
      name: string;
      icon: string;
      description: string;
      discountPercentage: number;
      courseIds: string[];
      courses: PricingCourse[];
    }) => {
      setItems((prev) => {
        if (prev.some((i) => i.careerId === career.id)) return prev;
        return [
          ...prev,
          {
            careerId: career.id,
            careerName: career.name,
            careerIcon: career.icon,
            careerDescription: career.description,
            discountPercentage: career.discountPercentage,
            defaultCourseIds: [...career.courseIds],
            selectedCourseIds: [...career.courseIds],
            courses: career.courses,
          },
        ];
      });
    },
    []
  );

  const removeCareer = useCallback((careerId: string) => {
    setItems((prev) => prev.filter((i) => i.careerId !== careerId));
    setCustomizingCareerId((prev) => (prev === careerId ? null : prev));
  }, []);

  const toggleCourse = useCallback((careerId: string, courseId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.careerId !== careerId) return item;
        const has = item.selectedCourseIds.includes(courseId);
        if (has && item.selectedCourseIds.length <= 1) return item; // min 1
        return {
          ...item,
          selectedCourseIds: has
            ? item.selectedCourseIds.filter((id) => id !== courseId)
            : [...item.selectedCourseIds, courseId],
        };
      })
    );
  }, []);

  const getAllSelectedCourses = useCallback(() => {
    const seen = new Set<string>();
    const result: PricingCourse[] = [];
    for (const item of items) {
      for (const cid of item.selectedCourseIds) {
        if (!seen.has(cid)) {
          seen.add(cid);
          const course = item.courses.find((c) => c.id === cid);
          if (course) result.push(course);
        }
      }
    }
    return result;
  }, [items]);

  const getBreakdown = useCallback(() => {
    const allCourses = getAllSelectedCourses();
    // Aggregate discount: use average of career discounts
    const avgDiscount =
      items.length > 0
        ? items.reduce((s, i) => s + i.discountPercentage, 0) / items.length
        : 0;
    const totalBreakdown = calculateBreakdown(allCourses, promoDiscount, avgDiscount);
    return { items, totalBreakdown };
  }, [items, promoDiscount, getAllSelectedCourses]);

  const handleApplyPromo = useCallback(
    async (code: string) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) {
        setPromoError("Please enter a promo code.");
        return;
      }

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

      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        setPromoError("This promo code has expired.");
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      if (data.usage_limit && data.used_count >= data.usage_limit) {
        setPromoError("This promo code has reached its usage limit.");
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

      const allCourses = getAllSelectedCourses();
      const subtotal = allCourses.reduce((s, c) => s + c.originalPrice, 0);

      if (data.min_purchase && subtotal < data.min_purchase) {
        setPromoError(`Minimum purchase of ₹${data.min_purchase} required.`);
        setAppliedPromo(null);
        setPromoDiscount(0);
        return;
      }

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
    [getAllSelectedCourses]
  );

  const handleRemovePromo = useCallback(() => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoCode("");
    setPromoError(null);
  }, []);

  const value = useMemo(
    () => ({
      items,
      itemCount,
      addCareer,
      removeCareer,
      isCareerInPlan,
      toggleCourse,
      getBreakdown,
      getAllSelectedCourses,
      customizingCareerId,
      setCustomizingCareerId,
      promoCode,
      setPromoCode,
      appliedPromo,
      promoDiscount,
      promoError,
      handleApplyPromo,
      handleRemovePromo,
    }),
    [items, itemCount, addCareer, removeCareer, isCareerInPlan, toggleCourse, getBreakdown, getAllSelectedCourses, customizingCareerId, promoCode, appliedPromo, promoDiscount, promoError, handleApplyPromo, handleRemovePromo]
  );

  return (
    <CareerPlanContext.Provider value={value}>{children}</CareerPlanContext.Provider>
  );
};

export const useCareerPlan = () => {
  const ctx = useContext(CareerPlanContext);
  if (!ctx) throw new Error("useCareerPlan must be used within CareerPlanProvider");
  return ctx;
};
