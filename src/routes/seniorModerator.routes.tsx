import { Route, Routes } from "react-router-dom";
import { SeniorModeratorGuard } from "@/guards";
import { SeniorModeratorLayout } from "@/components/layouts";

// Senior Moderator Pages
import SeniorModeratorDashboard from "@/pages/SeniorModeratorDashboard";
import AdminApprovals from "@/pages/AdminApprovals";
import AdminReports from "@/pages/AdminReports";
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
import SeniorModeratorMessageRequests from "@/pages/SeniorModeratorMessageRequests";
import ConversationDetail from "@/pages/ConversationDetail";
import StaffDoubts from "@/pages/StaffDoubts";
import NotFound from "@/pages/NotFound";

/**
 * Senior Moderator Routes Component
 * Wraps all senior moderator routes with SeniorModeratorGuard and SeniorModeratorLayout
 * URL prefix: /senior-moderator/*
 */
const SeniorModeratorRoutes = () => {
  return (
    <SeniorModeratorGuard>
      <SeniorModeratorLayout>
        <Routes>
          {/* Index route renders dashboard at /senior-moderator */}
          <Route index element={<SeniorModeratorDashboard />} />
          <Route path="dashboard" element={<SeniorModeratorDashboard />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="posts/new" element={<AdminPostEditor />} />
          <Route path="posts/edit/:id" element={<AdminPostEditor />} />
          <Route path="courses" element={<AdminCoursesPanel />} />
          <Route path="courses/new" element={<AdminCourseEditor />} />
          <Route path="courses/:id" element={<AdminCourseEditor />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="comments" element={<AdminComments />} />
          <Route path="annotations" element={<AdminAnnotations />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="activity" element={<AdminModeratorActivity />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="message-requests" element={<SeniorModeratorMessageRequests />} />
          <Route path="message-requests/:id" element={<ConversationDetail />} />
          <Route path="doubts" element={<StaffDoubts />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SeniorModeratorLayout>
    </SeniorModeratorGuard>
  );
};

export default SeniorModeratorRoutes;
