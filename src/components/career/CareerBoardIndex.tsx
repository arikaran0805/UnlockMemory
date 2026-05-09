/**
 * Career Board Index - Redirect Component
 * 
 * Redirects users to the first course in their career path.
 * This component is rendered at /career-board/:careerId (index route).
 * 
 * LOADING CONTRACT:
 * - Uses ONLY useCareerBoard() context (single source of truth)
 * - isLoading true → show skeleton
 * - isReady true + career null → redirect to arcade (not found)
 * - careerCourses.length > 0 → redirect to first course
 * - careerCourses.length === 0 (confirmed) → redirect to arcade
 */
import { Navigate, useParams } from "react-router-dom";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { Skeleton } from "@/components/ui/skeleton";

const CareerBoardIndex = () => {
  const { careerId } = useParams<{ careerId: string }>();
  const { career, careerCourses, isLoading, isReady, isCoursesReady } = useCareerBoard();

  const skeleton = (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  // Show skeleton while shell + auth + careers data are loading
  if (isLoading) return skeleton;

  // Career not found after loading resolved - redirect to Careers
  if (isReady && !career) return <Navigate to="/careers" replace />;

  // Context not yet resolved
  if (!isReady || !career) return skeleton;

  // Wait for course data specifically — isCoursesReady = !careersLoading && isReady.
  // When true, nativeCourses is guaranteed to be computed from loaded careers data.
  // This prevents a race where careerCourses is momentarily [] while addon courses load.
  if (!isCoursesReady) return skeleton;

  // Course data confirmed ready — redirect to first course
  const firstCourse = careerCourses[0];
  if (firstCourse) {
    return <Navigate to={`/career-board/${careerId}/course/${firstCourse.slug}`} replace />;
  }

  // Career has 0 courses (confirmed after isCoursesReady) — fall back to Careers
  return <Navigate to="/careers" replace />;
};

export default CareerBoardIndex;
