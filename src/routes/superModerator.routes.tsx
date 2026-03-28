import { Route, Routes } from "react-router-dom";
import { SuperModeratorGuard } from "@/guards";
import { SuperModeratorLayout } from "@/components/layouts";

// Career Manager Pages
import SuperModeratorDashboard from "@/pages/SuperModeratorDashboard";
import AdminApprovals from "@/pages/AdminApprovals";
import AdminReports from "@/pages/AdminReports";
import AdminCareers from "@/pages/AdminCareers";
import AdminCareerEditor from "@/pages/AdminCareerEditor";
import AdminPosts from "@/pages/AdminPosts";
import AdminPostEditor from "@/pages/AdminPostEditor";
import AdminCoursesPanel from "@/pages/AdminCoursesPanel";
import AdminCourseEditor from "@/pages/AdminCourseEditor";
import AdminTags from "@/pages/AdminTags";
import AdminPages from "@/pages/AdminPages";
import AdminComments from "@/pages/AdminComments";
import AdminAnnotations from "@/pages/AdminAnnotations";
import AdminMedia from "@/pages/AdminMedia";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminModeratorActivity from "@/pages/AdminModeratorActivity";
import AdminUsers from "@/pages/AdminUsers";
import NotFound from "@/pages/NotFound";

/**
 * Career Manager Routes Component
 * Wraps all career manager routes with SuperModeratorGuard and SuperModeratorLayout
 * URL prefix: /super-moderator/*
 * 
 * Career Manager is a CAREER OWNER - manages assigned careers
 * and all courses/posts within those careers.
 */
const SuperModeratorRoutes = () => {
  return (
    <SuperModeratorGuard>
      <SuperModeratorLayout>
        <Routes>
          {/* Index route renders dashboard at /super-moderator */}
          <Route index element={<SuperModeratorDashboard />} />
          <Route path="dashboard" element={<SuperModeratorDashboard />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="reports" element={<AdminReports />} />
          {/* Career Management - Career Manager's primary scope */}
          <Route path="careers" element={<AdminCareers />} />
          <Route path="careers/new" element={<AdminCareerEditor />} />
          <Route path="careers/:id" element={<AdminCareerEditor />} />
          <Route path="courses" element={<AdminCoursesPanel />} />
          <Route path="courses/new" element={<AdminCourseEditor />} />
          <Route path="courses/:id" element={<AdminCourseEditor />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="posts/new" element={<AdminPostEditor />} />
          <Route path="posts/edit/:id" element={<AdminPostEditor />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="comments" element={<AdminComments />} />
          <Route path="annotations" element={<AdminAnnotations />} />
          <Route path="media" element={<AdminMedia />} />
          {/* Team Management */}
          <Route path="assignments" element={<AdminUsers />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="activity" element={<AdminModeratorActivity />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SuperModeratorLayout>
    </SuperModeratorGuard>
  );
};

export default SuperModeratorRoutes;
