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

export function calculateBreakdown(
  selectedCourses: PricingCourse[],
  promoDiscount: number,
  careerDiscountPercent: number = 0
): PricingBreakdown {
  const courseSubtotal = selectedCourses.reduce((sum, c) => sum + c.discountPrice, 0);

  // Bundle discount uses the career's discount_percentage
  const bundleDiscount =
    careerDiscountPercent > 0 && selectedCourses.length >= 2
      ? Math.round(courseSubtotal * (careerDiscountPercent / 100))
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
