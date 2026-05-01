import "@/styles/landing.css";
import { Link } from "react-router-dom";
import { icons } from "lucide-react";
import { PublicCareerCardData } from "./PublicCareerCard";

// Maps career color class (from DB) → thumbnail gradient
const COLOR_GRADIENT_MAP: Record<string, string> = {
  purple: "linear-gradient(145deg, #1a0b2e 0%, #2e1462 40%, #4a1a8c 72%, #5c2ec0 100%)",
  blue:   "linear-gradient(145deg, #0b1a3a 0%, #142e62 35%, #1e4490 65%, #2558b0 100%)",
  orange: "linear-gradient(145deg, #2e1a0b 0%, #5a3414 40%, #8b5220 72%, #a86828 100%)",
  green:  "linear-gradient(145deg, #092e20 0%, #0c4a34 40%, #0f6448 72%, #147858 100%)",
  pink:   "linear-gradient(145deg, #2e0b1a 0%, #5a1434 40%, #8b2052 72%, #a82868 100%)",
  teal:   "linear-gradient(145deg, #0b2e2e 0%, #14534a 40%, #1a6e64 72%, #20887c 100%)",
};

const FALLBACK_GRADIENTS = [
  "linear-gradient(145deg, #0b1a3a 0%, #142e62 35%, #1e4490 65%, #2558b0 100%)",
  "linear-gradient(145deg, #092e20 0%, #0c4a34 40%, #0f6448 72%, #147858 100%)",
  "linear-gradient(145deg, #1a0b2e 0%, #2e1462 40%, #4a1a8c 72%, #5c2ec0 100%)",
  "linear-gradient(145deg, #2e1a0b 0%, #5a3414 40%, #8b5220 72%, #a86828 100%)",
];

function getGradient(colorClass: string, index: number): string {
  for (const [key, gradient] of Object.entries(COLOR_GRADIENT_MAP)) {
    if (colorClass.includes(key)) return gradient;
  }
  return FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
}

function fmtEnrolled(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}k+`;
  if (n > 0) return `${n}+`;
  return "New";
}

interface FeaturedCareerCardProps {
  career: PublicCareerCardData;
  index: number;
}

export default function FeaturedCareerCard({ career, index }: FeaturedCareerCardProps) {
  const gradient = getGradient(career.color, index);
  const IconComponent = icons[career.icon as keyof typeof icons] ?? icons.Briefcase;
  // Show up to 4 skill pills on featured card
  const skillPills = career.courses.slice(0, 4).map((c) => c.name);
  const extraCount = career.courses.length - 4;

  return (
    <Link
      to={`/career/${career.slug}`}
      className="lcc-featured-wrap"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {/* ── Left: gradient thumbnail ── */}
      <div className="lcc-featured-thumb" style={{ background: gradient }}>
        <div className="lcc-cp-pattern" />
        <div className="lcc-cp-light" />

        {/* Course count badge — top-left */}
        <span className="lcc-cp-badge">
          {career.courseCount} Course{career.courseCount !== 1 ? "s" : ""}
        </span>

        {/* Featured star badge — top-right */}
        <span className="lcc-featured-star-badge">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Featured
        </span>

        {/* Large centred icon */}
        <div className="lcc-cp-icon-tr">
          <IconComponent size={100} strokeWidth={1.1} color="white" />
        </div>

        {/* Skill pills — bottom strip */}
        <div className="lcc-cp-skills">
          {skillPills.map((s) => (
            <span key={s} className="lcc-cp-skill-pill">{s}</span>
          ))}
          {extraCount > 0 && (
            <span className="lcc-cp-skill-pill lcc-cp-skill-pill--more">+{extraCount}</span>
          )}
        </div>
      </div>

      {/* ── Right: content ── */}
      <div className="lcc-featured-body">

        {/* Eyebrow */}
        <div className="lcc-featured-eyebrow">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#d97706" stroke="#d97706" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Featured Path
        </div>

        {/* Title */}
        <h3 className="lcc-featured-title">{career.name}</h3>

        {/* Description — full, 3-line clamp */}
        {career.description && (
          <p className="lcc-featured-desc">{career.description}</p>
        )}

        {/* Meta row: course count · enrolled · discount */}
        <div className="lcc-featured-meta">
          <span className="lcc-featured-meta-item">
            {/* book icon */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {career.courseCount} course{career.courseCount !== 1 ? "s" : ""}
          </span>

          <span className="lcc-featured-meta-sep" />

          <span className="lcc-featured-meta-item">
            {/* trending-up icon */}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/><polyline points="16,7 22,7 22,13"/>
            </svg>
            {fmtEnrolled(career.enrollmentCount)} enrolled
          </span>

          {career.discountPercentage != null && career.discountPercentage > 0 && (
            <>
              <span className="lcc-featured-meta-sep" />
              <span className="lcc-featured-discount-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 9h.01M15 15h.01M3 9a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6v6a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V9z"/><line x1="9" y1="15" x2="15" y2="9"/>
                </svg>
                {career.discountPercentage}% off bundle
              </span>
            </>
          )}
        </div>

        {/* Footer: curator + CTA */}
        <div className="lcc-featured-footer">
          <div className="lcc-instructor">
            <div className="lcc-avatar lcc-cp-av">UM</div>
            <div className="lcc-instructor-info">
              <span className="lcc-instructor-name">UnlockMemory</span>
              <span className="lcc-instructor-sub">Career Track Curator</span>
            </div>
          </div>

          <span className="lcc-featured-cta">
            Explore Path
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
