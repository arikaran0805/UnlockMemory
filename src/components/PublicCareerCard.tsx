import "@/styles/landing.css";
import { useNavigate } from "react-router-dom";
import { icons } from "lucide-react";
import { useCareerPlan } from "@/contexts/CareerPlanContext";
import type { PricingCourse } from "@/components/pricing/pricingData";

export interface PublicCareerCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  courseCount: number;
  enrollmentCount: number;
  averageRating: number;
  courses: { id: string; name: string; description: string; originalPrice: number; discountPrice: number }[];
  discountPercentage: number | null;
  isFeatured: boolean;
  price: number;
}

const CAREER_GRADIENTS = [
  "linear-gradient(145deg, #0b1a3a 0%, #142e62 35%, #1e4490 65%, #2558b0 100%)",
  "linear-gradient(145deg, #092e20 0%, #0c4a34 40%, #0f6448 72%, #147858 100%)",
  "linear-gradient(145deg, #1a0b2e 0%, #2e1462 40%, #4a1a8c 72%, #5c2ec0 100%)",
  "linear-gradient(145deg, #2e1a0b 0%, #5a3414 40%, #8b5220 72%, #a86828 100%)",
];

function fmtEnrolled(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}k+`;
  if (n > 0) return `${n}+`;
  return "New";
}

interface PublicCareerCardProps {
  career: PublicCareerCardData;
  index: number;
}

export default function PublicCareerCard({ career, index }: PublicCareerCardProps) {
  const gradient = CAREER_GRADIENTS[index % CAREER_GRADIENTS.length];
  const IconComponent = icons[career.icon as keyof typeof icons] ?? icons.Briefcase;
  const ratingLabel = career.averageRating > 0 ? career.averageRating.toFixed(1) : null;

  const navigate = useNavigate();
  const { addCareer, isCareerInPlan, isCareerOwned, hasActiveCareer } = useCareerPlan();
  const owned = isCareerOwned(career.id);
  // User already owns another career they haven't been blocked from buying more of
  const locked = !owned && hasActiveCareer;
  const inCart = !owned && !locked && isCareerInPlan(career.id);

  const finalPrice = career.price > 0 && career.discountPercentage != null && career.discountPercentage > 0
    ? Math.round(career.price * (1 - career.discountPercentage / 100))
    : career.price;

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (owned || locked) return; // inert states
    if (inCart) {
      navigate("/plan");
    } else {
      const pricingCourses: PricingCourse[] = career.courses.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        price: c.discountPrice || c.originalPrice,
        originalPrice: c.originalPrice,
        discountPrice: c.discountPrice || c.originalPrice,
      }));
      addCareer({
        id: career.id,
        name: career.name,
        icon: career.icon,
        description: career.description || "",
        discountPercentage: career.discountPercentage ?? 0,
        courseIds: career.courses.map((c) => c.id),
        courses: pricingCourses,
      });
    }
  };

  return (
    <div className="l-course-card lcc-card">

      {/* ── Thumbnail ── */}
      <div className="lcc-thumb lcc-cp-thumb" style={{ background: gradient, height: 185 }}>
        <div className="lcc-cp-pattern" />
        <div className="lcc-cp-light" />

        {/* Course count badge — top left */}
        <span className="lcc-cp-badge">
          {career.courseCount} Course{career.courseCount !== 1 ? "s" : ""}
        </span>

        {/* Large faded icon — centered */}
        <div className="lcc-cp-icon-tr">
          <IconComponent size={112} strokeWidth={1.1} color="white" />
        </div>

        {/* Stats strip — bottom */}
        <div className="lcc-cp-thumb-stats">
          {ratingLabel && (
            <>
              <span className="lcc-cp-thumb-stat">
                <span style={{ fontSize: 11 }}>⭐</span>
                {ratingLabel} rating
              </span>
              <span className="lcc-cp-thumb-stat-sep">•</span>
            </>
          )}
          <span className="lcc-cp-thumb-stat">
            {fmtEnrolled(career.enrollmentCount)} learners
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="lcc-body">

        {/* Title + course count pill */}
        <div className="lcc-title-row">
          <p className="lcc-title">{career.name}</p>
          <div className="lcc-cp-count">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>{career.courseCount}</span>
          </div>
        </div>

        {/* Description */}
        {career.description && (
          <p className="lcc-desc">{career.description}</p>
        )}

        {/* UnlockMemory curator row */}
        <div className="lcc-instructor">
          <div className="lcc-avatar lcc-cp-av">UM</div>
          <div className="lcc-instructor-info">
            <span className="lcc-instructor-name">UnlockMemory</span>
            <span className="lcc-instructor-sub">Career Track Curator</span>
          </div>
        </div>

        {/* Footer — price + cart CTA */}
        <div className="lcc-footer">
          {career.price > 0 ? (
            <div className="lcc-cp-price-block">
              {career.discountPercentage != null && career.discountPercentage > 0 && (
                <span className="lcc-cp-price-original">
                  ₹{career.price.toLocaleString("en-IN")}
                </span>
              )}
              <span className="lcc-cp-price-final">
                ₹{finalPrice.toLocaleString("en-IN")}
              </span>
            </div>
          ) : (
            <span className="lcc-cp-price-free">Free</span>
          )}

          <button
            className={`lcc-cp-cart-btn${owned ? " lcc-cp-cart-btn--owned" : locked ? " lcc-cp-cart-btn--locked" : inCart ? " lcc-cp-cart-btn--active" : ""}`}
            onClick={handleCartClick}
            disabled={owned || locked}
            title={locked ? "Complete your active career first" : undefined}
            aria-label={owned ? "Unlocked" : locked ? "Complete active career first" : inCart ? "View in cart" : "Add to cart"}
          >
            {owned ? (
              <>
                {/* Shield-check — signals ownership */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                Unlocked
              </>
            ) : locked ? (
              <>
                {/* Lock — finish active career first */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                1 Career at a Time
              </>
            ) : inCart ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                View in Cart
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
