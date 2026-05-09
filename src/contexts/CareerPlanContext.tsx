import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PricingCourse, PricingBreakdown } from "@/components/pricing/pricingData";

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
  loading: boolean;
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
  /** True if the user has already purchased this career (Pro + in user_career_selections) */
  isCareerOwned: (careerId: string) => boolean;
  /** True if the user owns at least one career — blocks purchasing additional ones */
  hasActiveCareer: boolean;
  toggleCourse: (careerId: string, courseId: string, courseData?: PricingCourse) => void;
  getBreakdown: () => { items: CareerPlanItem[]; totalBreakdown: PricingBreakdown };
  getAllSelectedCourses: () => PricingCourse[];
  customizingCareerId: string | null;
  setCustomizingCareerId: (id: string | null) => void;
  promoCode: string;
  setPromoCode: (v: string) => void;
  appliedPromo: string | null;
  promoDiscount: number;
  promoError: string | null;
  handleApplyPromo: (code: string) => Promise<void>;
  handleRemovePromo: () => void;
}

const CareerPlanContext = createContext<CareerPlanContextType | undefined>(undefined);

// Synchronously detect whether Supabase has a cached session in localStorage.
// Avoids showing the loading skeleton to guests during the auth resolution delay.
// Safe: if the check is wrong (e.g. stale token), the auth effect corrects it.
function hasCachedSession(): boolean {
  try {
    return Object.keys(localStorage).some(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token") && !!localStorage.getItem(k)
    );
  } catch {
    return true; // can't read storage → assume logged-in to avoid empty flash
  }
}

export const CareerPlanProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CareerPlanItem[]>([]);
  // Start loading only if there's evidence of a session — guests get instant render
  const [loading, setLoading] = useState(hasCachedSession);
  const [customizingCareerId, setCustomizingCareerId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const syncingRef = useRef(false);
  // Career IDs the user has already paid for (Pro + in user_career_selections)
  const [ownedCareerIds, setOwnedCareerIds] = useState<Set<string>>(new Set());

  // Promo state
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);

  const itemCount = items.length;

  // Listen for auth changes.
  // Supabase v2 fires INITIAL_SESSION immediately on subscribe — getSession() is
  // redundant and would cause a second setUserId call (extra render + loadCart).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load cart from DB when user logs in
  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const loadCart = async () => {
      setLoading(true);

      // Fetch subscription status and purchased career selections in parallel
      const [{ data: subData }, { data: selections }, { data: cartRows, error }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("status")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("user_career_selections")
          .select("career_id")
          .eq("user_id", userId),
        supabase
          .from("cart_items")
          .select(`
            career_id,
            selected_course_ids,
            careers (
              id, name, description, icon, discount_percentage,
              career_courses (
                course_id,
                courses (id, name, description, original_price, discount_price)
              )
            )
          `)
          .eq("user_id", userId),
      ]);

      // Determine owned careers: Pro user whose careers are recorded in user_career_selections
      const userIsPro = !!subData;
      const purchasedIds = new Set<string>(
        userIsPro ? (selections || []).map((s: any) => s.career_id) : []
      );
      setOwnedCareerIds(purchasedIds);

      // Strip owned careers from cart_items so they don't linger in the cart after purchase
      if (purchasedIds.size > 0 && cartRows) {
        const ownedInCart = cartRows
          .filter((row: any) => purchasedIds.has(row.career_id))
          .map((row: any) => row.career_id);
        if (ownedInCart.length > 0) {
          supabase
            .from("cart_items")
            .delete()
            .eq("user_id", userId)
            .in("career_id", ownedInCart)
            .then(() => {});
        }
      }

      // Only non-owned careers remain in the cart view
      const activeCartRows = (cartRows || []).filter(
        (row: any) => !purchasedIds.has(row.career_id)
      );

      if (error || activeCartRows.length === 0) {
        setLoading(false);
        return;
      }

      const loadedItems: CareerPlanItem[] = (activeCartRows as any[])
        .filter((row) => row.careers)
        .map((row) => {
          const c = row.careers;
          const coursesRaw = (c.career_courses || [])
            .filter((cc: any) => cc.courses)
            .map((cc: any) => cc.courses);
          const courses: PricingCourse[] = coursesRaw.map((co: any) => ({
            id: co.id,
            name: co.name,
            description: co.description || "",
            price: Number(co.discount_price) || Number(co.original_price) || 0,
            originalPrice: Number(co.original_price) || 0,
            discountPrice: Number(co.discount_price) || Number(co.original_price) || 0,
          }));
          const defaultCourseIds = coursesRaw.map((co: any) => co.id);
          const savedIds: string[] = row.selected_course_ids || [];

          // Auto-include any career courses added since the user last saved their selection.
          // Keeps existing user deselections intact; only new (previously absent) courses are added.
          const newCourseIds = defaultCourseIds.filter((id: string) => !savedIds.includes(id));
          const selectedCourseIds: string[] = savedIds.length > 0
            ? [
                ...savedIds.filter((id: string) => defaultCourseIds.includes(id)), // remove stale IDs
                ...newCourseIds,                                                     // add new defaults
              ]
            : defaultCourseIds;

          // Persist the merged selection back so future loads are consistent
          if (newCourseIds.length > 0 && savedIds.length > 0) {
            supabase
              .from("cart_items")
              .upsert(
                { user_id: userId, career_id: c.id, selected_course_ids: selectedCourseIds },
                { onConflict: "user_id,career_id" }
              )
              .then(() => {});
          }

          return {
            careerId: c.id,
            careerName: c.name,
            careerIcon: c.icon || "BookOpen",
            careerDescription: c.description || "",
            discountPercentage: Number(c.discount_percentage) || 0,
            defaultCourseIds,
            selectedCourseIds,
            courses,
          };
        });

      syncingRef.current = true;
      setItems(loadedItems);
      setLoading(false);
    };

    loadCart();
  }, [userId]);

  // Sync to DB helper
  const upsertCartItem = useCallback(async (careerId: string, selectedCourseIds: string[]) => {
    if (!userId) return;
    await supabase.from("cart_items").upsert(
      { user_id: userId, career_id: careerId, selected_course_ids: selectedCourseIds },
      { onConflict: "user_id,career_id" }
    );
  }, [userId]);

  const syncCareerSelection = useCallback(async (careerId: string, selectedCourseIds: string[]) => {
    if (!userId) return;
    await supabase.from("user_career_selections").upsert(
      { user_id: userId, career_id: careerId, selected_course_ids: selectedCourseIds },
      { onConflict: "user_id,career_id" }
    );
  }, [userId]);

  const deleteCartItem = useCallback(async (careerId: string) => {
    if (!userId) return;
    await supabase.from("cart_items").delete().eq("user_id", userId).eq("career_id", careerId);
  }, [userId]);

  const isCareerInPlan = useCallback(
    (careerId: string) => items.some((i) => i.careerId === careerId),
    [items]
  );

  const isCareerOwned = useCallback(
    (careerId: string) => ownedCareerIds.has(careerId),
    [ownedCareerIds]
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
        const newItem: CareerPlanItem = {
          careerId: career.id,
          careerName: career.name,
          careerIcon: career.icon,
          careerDescription: career.description,
          discountPercentage: career.discountPercentage,
          defaultCourseIds: [...career.courseIds],
          selectedCourseIds: [...career.courseIds],
          courses: career.courses,
        };
        // Sync to cart + persistent selections
        upsertCartItem(career.id, career.courseIds);
        syncCareerSelection(career.id, career.courseIds);
        return [...prev, newItem];
      });
    },
    [upsertCartItem, syncCareerSelection]
  );

  const removeCareer = useCallback((careerId: string) => {
    setItems((prev) => prev.filter((i) => i.careerId !== careerId));
    setCustomizingCareerId((prev) => (prev === careerId ? null : prev));
    deleteCartItem(careerId);
  }, [deleteCartItem]);

  const toggleCourse = useCallback((careerId: string, courseId: string, courseData?: PricingCourse) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.careerId !== careerId) return item;
        const has = item.selectedCourseIds.includes(courseId);
        if (has && item.selectedCourseIds.length <= 1) return item;
        const newSelected = has
          ? item.selectedCourseIds.filter((id) => id !== courseId)
          : [...item.selectedCourseIds, courseId];

        // For add-on courses (not in item.courses), add/remove their data so the
        // order summary and breakdown can resolve them by ID.
        let newCourses = item.courses;
        const isAddon = !item.courses.some((c) => c.id === courseId);
        if (!has && isAddon && courseData) {
          // Adding an add-on: append its PricingCourse data
          newCourses = [...item.courses, courseData];
        } else if (has && !item.defaultCourseIds.includes(courseId)) {
          // Removing an add-on: drop it from courses so it doesn't linger
          newCourses = item.courses.filter((c) => c.id !== courseId);
        }

        // Sync to cart + persistent selections
        upsertCartItem(careerId, newSelected);
        syncCareerSelection(careerId, newSelected);
        return { ...item, selectedCourseIds: newSelected, courses: newCourses };
      })
    );
  }, [upsertCartItem, syncCareerSelection]);

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
    // Calculate bundle discount per career individually, then sum
    let totalSubtotal = 0;
    let totalBundleDiscount = 0;
    const seen = new Set<string>();

    for (const item of items) {
      const selectedCourses = item.selectedCourseIds
        .map((id) => item.courses.find((c) => c.id === id))
        .filter(Boolean) as PricingCourse[];

      for (const c of selectedCourses) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          totalSubtotal += c.discountPrice;
        }
      }

      const itemSubtotal = selectedCourses.reduce((s, c) => s + c.discountPrice, 0);
      if (item.discountPercentage > 0 && selectedCourses.length >= 2) {
        totalBundleDiscount += Math.round(itemSubtotal * (item.discountPercentage / 100));
      }
    }

    const subtotalAfterBundle = totalSubtotal - totalBundleDiscount;
    const finalTotal = Math.max(0, subtotalAfterBundle - promoDiscount);
    const savings = totalSubtotal - finalTotal;

    const totalBreakdown: PricingBreakdown = {
      courseSubtotal: totalSubtotal,
      bundleDiscount: totalBundleDiscount,
      subtotalAfterBundle,
      promoDiscount,
      finalTotal,
      savings,
      itemCount: seen.size,
    };

    return { items, totalBreakdown };
  }, [items, promoDiscount]);

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
      loading,
      addCareer,
      removeCareer,
      isCareerInPlan,
      isCareerOwned,
      hasActiveCareer: ownedCareerIds.size > 0,
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
    [items, itemCount, loading, addCareer, removeCareer, isCareerInPlan, isCareerOwned, ownedCareerIds, toggleCourse, getBreakdown, getAllSelectedCourses, customizingCareerId, promoCode, appliedPromo, promoDiscount, promoError, handleApplyPromo, handleRemovePromo]
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
