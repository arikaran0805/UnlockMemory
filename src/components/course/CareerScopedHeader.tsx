/**
 * Career-Scoped Secondary Header for Course Detail Page
 * 
 * Pro-only header that shows:
 * - LEFT: Current course name (prominent, not clickable)
 * - RIGHT: Career-scoped course tabs for navigation
 * 
 * Reinforces: "You're learning THIS course as part of YOUR career path"
 */
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CareerCourse {
  id: string;
  name: string;
  slug: string;
}

interface Career {
  id: string;
  name: string;
  slug: string;
}

interface CareerScopedHeaderProps {
  /** Current course being viewed (optional during loading) */
  currentCourse?: {
    id: string;
    name: string;
    slug: string;
  };
  /** User's selected career */
  career: Career | null;
  /** Courses mapped to the user's career */
  careerCourses: CareerCourse[];
  /** Whether primary header is visible (for positioning) - NOT used in career flow */
  isHeaderVisible?: boolean;
  /** Whether announcement bar is visible (for positioning) */
  announcementVisible?: boolean;
  /** Loading state */
  isLoading?: boolean;
}

export const CareerScopedHeader = ({
  currentCourse,
  career,
  careerCourses,
  isHeaderVisible = false,
  announcementVisible = false,
  isLoading = false,
}: CareerScopedHeaderProps) => {
  const location = useLocation();

  // CareerScopedHeader is a SECONDARY header positioned below Global Header (64px)
  // When Global Header is visible: top-16 (64px), when hidden: top-0
  // Announcement bar adds 36px
  const getTopPosition = () => {
    if (isHeaderVisible) {
      return announcementVisible ? 'top-[6.25rem]' : 'top-16'; // 100px / 64px
    }
    return announcementVisible ? 'top-9' : 'top-0'; // 36px / 0px
  };

  // Show loading skeleton while data loads (but header structure is always present)
  if (isLoading || !currentCourse) {
    return (
      <div 
        className={cn(
          "hidden lg:block fixed left-0 right-0 z-50 bg-muted/95 backdrop-blur-sm border-b border-border transition-all duration-200 ease-out",
          getTopPosition()
        )}
      >
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-12">
            <div className="h-5 w-48 bg-muted-foreground/10 rounded animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-24 bg-muted-foreground/10 rounded-full animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "hidden lg:block fixed left-0 right-0 z-50 bg-muted/95 backdrop-blur-sm border-b border-border transition-all duration-200 ease-out",
        getTopPosition()
      )}
    >
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-12">
          {/* Left: Course Name + Career Path Label */}
          <div className="flex flex-col justify-center gap-0.5">
            <h2 className="text-sm font-semibold text-foreground leading-tight">
              {currentCourse?.name}
            </h2>
            {career && (
              <Link 
                to="?overview=true"
                className="text-xs text-muted-foreground inline-flex items-center gap-1.5 hover:text-primary transition-colors group cursor-pointer"
                title={`Back to ${career.name} Path`}
              >
                <svg className="w-4 h-4 flex-shrink-0 group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
                <span>{career.name} Path</span>
              </Link>
            )}
          </div>
          
          {/* Right: Career-Scoped Course Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {careerCourses.length > 0 && career ? (
              careerCourses.map((course) => {
                const isActive = course.slug === currentCourse.slug;
                return (
                  <Link
                    key={course.id}
                    to={`/career-board/${career.slug}/course/${course.slug}`}
                    className={cn(
                      "relative px-4 py-1.5 text-xs font-medium whitespace-nowrap rounded-full transition-all duration-200 flex-shrink-0",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
                    )}
                  >
                    {course.name}
                  </Link>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground italic">
                No courses mapped to your career
              </span>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default CareerScopedHeader;
