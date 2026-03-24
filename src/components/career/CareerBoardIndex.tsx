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
  const { career, careerCourses, isLoading, isReady } = useCareerBoard();

  // Show skeleton while career context is loading
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Career not found after loading resolved - redirect to arcade (never skeleton as "not found")
  if (isReady && !career) {
    return <Navigate to="/careers" replace />;
  }

  // Still waiting for context to be ready (safety check)
  if (!isReady || !career) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Data is ready - redirect based on course availability
  const firstCourse = careerCourses[0];
  
  if (firstCourse) {
    // Use careerId from URL params (the slug) consistently
    return <Navigate to={`/career-board/${careerId}/course/${firstCourse.slug}`} replace />;
  }

  // Career has 0 courses (confirmed) - redirect to Careers
  return <Navigate to="/careers" replace />;
};

export default CareerBoardIndex;
