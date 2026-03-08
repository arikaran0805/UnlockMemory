export interface PricingCourse {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPrice: number;
}

export interface PricingCareer {
  id: string;
  name: string;
  description: string;
  duration: string;
  icon: string;
  includedCourseIds: string[];
  discountPercentage: number;
}

export interface PricingBreakdown {
  courseSubtotal: number;
  bundleDiscount: number;
  subtotalAfterBundle: number;
  promoDiscount: number;
  finalTotal: number;
  savings: number;
  itemCount: number;
}

export const SAMPLE_COURSES: PricingCourse[] = [];
export const SAMPLE_CAREERS: PricingCareer[] = [];

export const formatPrice = (amount: number): string =>
  `₹${amount.toLocaleString("en-IN")}`;

/** Bundle discount: 33% off when 2+ courses selected in a career plan */
const BUNDLE_DISCOUNT_PERCENT = 33;
const BUNDLE_MIN_COURSES = 2;

export function calculateBreakdown(
  selectedCourses: PricingCourse[],
  promoDiscount: number
): PricingBreakdown {
  const courseSubtotal = selectedCourses.reduce((sum, c) => sum + c.originalPrice, 0);

  // Bundle discount applies when 2+ courses
  const bundleDiscount =
    selectedCourses.length >= BUNDLE_MIN_COURSES
      ? Math.round(courseSubtotal * (BUNDLE_DISCOUNT_PERCENT / 100))
      : 0;

  const subtotalAfterBundle = courseSubtotal - bundleDiscount;
  const finalTotal = Math.max(0, subtotalAfterBundle - promoDiscount);
  const savings = courseSubtotal - finalTotal;

  return {
    courseSubtotal,
    bundleDiscount,
    subtotalAfterBundle,
    promoDiscount,
    finalTotal,
    savings,
    itemCount: selectedCourses.length,
  };
}
