import "@/styles/landing.css";
import { Link } from "react-router-dom";
import { icons } from "lucide-react";

export interface PublicCourseCardCourse {
  id: string;
  name: string;
  slug: string;
  level: string | null;
  featured_image: string | null;
  icon: string | null;
  enrollmentCount: number;
  averageRating: number;
}

const COURSE_GRADIENTS = [
  "linear-gradient(145deg, #092e20 0%, #0c4a34 40%, #0f6448 72%, #147858 100%)",
  "linear-gradient(145deg, #0d1238 0%, #172064 40%, #2038a0 72%, #2d4fc0 100%)",
  "linear-gradient(145deg, #0a2e18 0%, #0d4428 40%, #115c38 72%, #166c44 100%)",
  "linear-gradient(145deg, #0c1a3c 0%, #172e72 40%, #2248a8 72%, #2e5ec4 100%)",
];

function fmtEnrolled(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}k+`;
  if (n > 0) return `${n}+`;
  return "0";
}

interface PublicCourseCardProps {
  course: PublicCourseCardCourse;
  index: number;
}

export default function PublicCourseCard({ course, index }: PublicCourseCardProps) {
  const gradient = COURSE_GRADIENTS[index % COURSE_GRADIENTS.length];
  const bannerTitle = course.name.split(" ").slice(0, 3).join(" ");
  const IconComponent = icons[course.icon as keyof typeof icons] ?? icons.BookOpen;
  const isNew = course.averageRating === 0;
  const rating = !isNew ? course.averageRating.toFixed(1) : "New";
  const enrolledLabel = `${fmtEnrolled(course.enrollmentCount)} Ants enrolled`;

  return (
    <Link to={`/course/${course.slug}`} className="l-course-card">
      <div
        className="l-course-banner"
        style={
          course.featured_image
            ? {
                backgroundImage: `url(${course.featured_image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: gradient }
        }
      >
        <div className="l-course-banner-overlay" />
        <div className="l-course-banner-light" />

        <div className={`l-course-rating${isNew ? " l-course-rating--new" : ""}`}>
          {!isNew && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="#FBBF24" stroke="none">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          )}
          {rating}
        </div>

        <div className="l-course-banner-left">
          <p className="l-course-banner-title">{bannerTitle}</p>
        </div>

        <div className="l-banner-icon-wrap">
          <IconComponent size={72} strokeWidth={1.1} color="white" />
        </div>
      </div>

      <div className="l-course-info">
        <p className="l-course-title text-foreground">{course.name}</p>

        {course.level && (
          <div className="l-course-level text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            {course.level}
          </div>
        )}

        <div className="l-course-footer">
          <div className="l-course-enrolled text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22A55D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
              <polyline points="16,7 22,7 22,13" />
            </svg>
            {enrolledLabel}
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
