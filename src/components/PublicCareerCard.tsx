import "@/styles/landing.css";
import { Link } from "react-router-dom";
import { icons } from "lucide-react";

export interface PublicCareerCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  courseCount: number;
  enrollmentCount: number;
  courses: { name: string }[];
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
  const skillPills = career.courses.slice(0, 3).map((c) => c.name);
  const extraCount = career.courses.length - 3;

  return (
    <Link to={`/career/${career.slug}`} className="l-course-card lcc-card" style={{ textDecoration: "none", color: "inherit" }}>

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

        {/* Skill pills — bottom */}
        <div className="lcc-cp-skills">
          {skillPills.map((s) => (
            <span key={s} className="lcc-cp-skill-pill">{s}</span>
          ))}
          {extraCount > 0 && (
            <span className="lcc-cp-skill-pill lcc-cp-skill-pill--more">+{extraCount}</span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="lcc-body">

        {/* Title + course count pill */}
        <div className="lcc-title-row">
          <p className="lcc-title">{career.name}</p>
          <div className="lcc-cp-count">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22A55D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* Footer — enrolled + Explore CTA */}
        <div className="lcc-footer">
          <div className="lcc-meta">
            <span className="lcc-meta-item">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22A55D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
                <polyline points="16,7 22,7 22,13" />
              </svg>
              {fmtEnrolled(career.enrollmentCount)} enrolled
            </span>
          </div>
          <span className="l-course-explore">
            Explore
            <svg className="l-course-explore-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
