/**
 * Career Board Routes
 * 
 * ARCHITECTURAL GUARANTEE:
 * - All routes under /career-board/:careerId/* use CareerBoardLayout
 * - CareerBoardLayout ALWAYS renders CareerScopedHeader
 * - No conditional header logic anywhere in this route tree
 * 
 * ROUTE STRUCTURE:
 * /career-board/:careerId → Redirects to first course in career
 * /career-board/:careerId/course/:courseSlug → Course detail within career context
 * /career-board/:careerId/course/:courseSlug/completed → Course completion within career context
 * 
 * WELCOME PAGE BEHAVIOR:
 * - First-time users see CareerWelcomePage (full-page, no shell)
 * - After dismissing welcome, users are redirected to first course
 * - Welcome page is handled by CareerBoardLayout
 */
import { Routes, Route, Navigate } from "react-router-dom";
import { CareerBoardProvider } from "@/contexts/CareerBoardContext";
import CareerBoardLayout from "@/components/layouts/CareerBoardLayout";
import CareerCourseDetail from "@/pages/CareerCourseDetail";
import CareerCourseCompleted from "@/pages/CareerCourseCompleted";
import CareerBoardIndex from "@/components/career/CareerBoardIndex";

/**
 * Career Board Routes Component
 * 
 * Wraps all career board routes with:
 * 1. CareerBoardProvider - Career context for all children
 * 2. CareerBoardLayout - Shell with guaranteed CareerScopedHeader
 */
const CareerBoardRoutes = () => {
  return (
    <CareerBoardProvider>
      <Routes>
        <Route element={<CareerBoardLayout />}>
          {/* Career index - Redirects to first course */}
          <Route index element={<CareerBoardIndex />} />
          
          {/* Course detail within career context */}
          <Route path="course/:courseSlug" element={<CareerCourseDetail />} />
          
          {/* Course completion within career context */}
          <Route path="course/:courseSlug/completed" element={<CareerCourseCompleted />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/careers" replace />} />
        </Route>
      </Routes>
    </CareerBoardProvider>
  );
};

export default CareerBoardRoutes;
