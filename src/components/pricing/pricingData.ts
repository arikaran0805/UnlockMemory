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
}

export interface PricingBreakdown {
  courseSubtotal: number;
  discountTotal: number;
  subtotal: number;
  promoDiscount: number;
  finalTotal: number;
  savings: number;
  itemCount: number;
}

export const SAMPLE_COURSES: PricingCourse[] = [];
export const SAMPLE_CAREERS: PricingCareer[] = [];

export const formatPrice = (amount: number): string => `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const formatPriceShort = (amount: number): string => `₹${amount.toLocaleString("en-IN")}`;

export function calculateBreakdown(
  selectedCourses: PricingCourse[],
  promoDiscount: number
): PricingBreakdown {
  const courseSubtotal = selectedCourses.reduce((sum, c) => sum + c.originalPrice, 0);
  const discountTotal = selectedCourses.reduce((sum, c) => sum + (c.originalPrice - c.discountPrice), 0);
  const subtotal = selectedCourses.reduce((sum, c) => sum + c.discountPrice, 0);
  const finalTotal = Math.max(0, subtotal - promoDiscount);
  const savings = courseSubtotal - finalTotal;

  return {
    courseSubtotal,
    discountTotal,
    subtotal,
    promoDiscount,
    finalTotal,
    savings,
    itemCount: selectedCourses.length,
  };
}
