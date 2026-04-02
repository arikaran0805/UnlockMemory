import { Route, Routes, Navigate } from "react-router-dom";
import { AdminGuard } from "@/guards";
import { AdminLayout } from "@/components/layouts";

// Admin Pages
import AdminDashboard from "@/pages/AdminDashboard";
import AdminPosts from "@/pages/AdminPosts";
import AdminPostEditor from "@/pages/AdminPostEditor";
import AdminPages from "@/pages/AdminPages";
import AdminCoursesPanel from "@/pages/AdminCoursesPanel";
import AdminCourseEditor from "@/pages/AdminCourseEditor";
import AdminDifficultyLevels from "@/pages/AdminDifficultyLevels";
import AdminCareers from "@/pages/AdminCareers";
import AdminCareerEditor from "@/pages/AdminCareerEditor";
import AdminComments from "@/pages/AdminComments";
import AdminUsersRoles from "@/pages/admin/AdminUsersRoles";
import AdminMedia from "@/pages/AdminMedia";
import AdminMonetization from "@/pages/AdminMonetization";
import AdminAdvertisementEditor from "@/pages/admin/AdminAdvertisementEditor";
import AdminRedirects from "@/pages/AdminRedirects";

import AdminSettings from "@/pages/AdminSettings";
import AdminTags from "@/pages/AdminTags";
import AdminApprovals from "@/pages/AdminApprovals";
import AdminDeleteRequests from "@/pages/AdminDeleteRequests";
import AdminModeratorActivity from "@/pages/AdminModeratorActivity";
import AdminReports from "@/pages/AdminReports";
import AdminPostVersions from "@/pages/AdminPostVersions";
import AdminAnnotations from "@/pages/AdminAnnotations";
import AdminAssignmentLogs from "@/pages/AdminAssignmentLogs";
import AdminPlatformActivityLog from "@/pages/AdminPlatformActivityLog";
import AdminTeamOwnership from "@/pages/AdminTeamOwnership";
import AdminPracticeSkills from "@/pages/AdminPracticeSkills";
import AdminPracticeSkillEditor from "@/pages/AdminPracticeSkillEditor";
import AdminPracticeProblems from "@/pages/AdminPracticeProblems";
import AdminProblemEditor from "@/pages/AdminProblemEditor";
import AdminPredictOutputProblems from "@/pages/AdminPredictOutputProblems";
import AdminPredictOutputEditor from "@/pages/AdminPredictOutputEditor";
import AdminFixErrorEditor from "@/pages/AdminFixErrorEditor";
import AdminEliminateWrongEditor from "@/pages/AdminEliminateWrongEditor";
import AdminPromoCodes from "@/pages/AdminPromoCodes";
import AdminPromoCodeEditor from "@/pages/admin/AdminPromoCodeEditor";
import AdminAnnouncementBars from "@/pages/AdminAnnouncementBars";
import AdminAnnouncementBarEditor from "@/pages/admin/AdminAnnouncementBarEditor";
import NotFound from "@/pages/NotFound";

/**
 * Admin Routes Component
 * Wraps all admin routes with AdminGuard and AdminLayout
 * URL prefix: /admin/*
 */
const AdminRoutes = () => {
  return (
    <AdminGuard>
      <AdminLayout>
        <Routes>
          {/* Index route renders dashboard at /admin */}
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="approvals" element={<AdminApprovals />} />
          <Route path="delete-requests" element={<AdminDeleteRequests />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="posts/new" element={<AdminPostEditor />} />
          <Route path="posts/edit/:id" element={<AdminPostEditor />} />
          <Route path="posts/:id/versions" element={<AdminPostVersions />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="courses" element={<AdminCoursesPanel />} />
          <Route path="difficulty-levels" element={<AdminDifficultyLevels />} />
          <Route path="courses/new" element={<AdminCourseEditor />} />
          <Route path="courses/:id" element={<AdminCourseEditor />} />
          <Route path="careers" element={<AdminCareers />} />
          <Route path="careers/new" element={<AdminCareerEditor />} />
          <Route path="careers/:id" element={<AdminCareerEditor />} />
          <Route path="practice/skills" element={<AdminPracticeSkills />} />
          <Route path="practice/skills/new" element={<AdminPracticeSkillEditor />} />
          <Route path="practice/skills/:id" element={<AdminPracticeSkillEditor />} />
          <Route path="practice/skills/:skillId/problems" element={<AdminPracticeProblems />} />
          <Route path="practice/skills/:skillId/problems/new" element={<AdminProblemEditor />} />
          <Route path="practice/skills/:skillId/problems/:problemId" element={<AdminProblemEditor />} />
          <Route path="practice/skills/:skillId/predict-output" element={<AdminPredictOutputProblems />} />
          <Route path="practice/skills/:skillId/predict-output/new" element={<AdminPredictOutputEditor />} />
          <Route path="practice/skills/:skillId/predict-output/:problemId" element={<AdminPredictOutputEditor />} />
          <Route path="practice/skills/:skillId/fix-error/new" element={<AdminFixErrorEditor />} />
          <Route path="practice/skills/:skillId/fix-error/:problemId" element={<AdminFixErrorEditor />} />
          <Route path="practice/skills/:skillId/eliminate-wrong/new" element={<AdminEliminateWrongEditor />} />
          <Route path="practice/skills/:skillId/eliminate-wrong/:problemId" element={<AdminEliminateWrongEditor />} />
          <Route path="comments" element={<AdminComments />} />
          <Route path="annotations" element={<AdminAnnotations />} />
          <Route path="users" element={<AdminUsersRoles />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="authors" element={<Navigate to="/admin/users" replace />} />
          <Route path="assignments" element={<AdminAssignmentLogs />} />
          <Route path="team-ownership" element={<AdminTeamOwnership />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="monetization" element={<AdminMonetization />} />
          <Route path="monetization/new" element={<AdminAdvertisementEditor />} />
          <Route path="monetization/:id" element={<AdminAdvertisementEditor />} />
          <Route path="redirects" element={<AdminRedirects />} />

<Route path="activity" element={<AdminModeratorActivity />} />
          <Route path="activity-log" element={<AdminPlatformActivityLog />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="seo" element={<Navigate to="/admin/settings" replace />} />

          <Route path="promo-codes" element={<AdminPromoCodes />} />
          <Route path="promo-codes/new" element={<AdminPromoCodeEditor />} />
          <Route path="promo-codes/:id" element={<AdminPromoCodeEditor />} />
          <Route path="announcement-bars" element={<AdminAnnouncementBars />} />
          <Route path="announcement-bars/new" element={<AdminAnnouncementBarEditor />} />
          <Route path="announcement-bars/:id" element={<AdminAnnouncementBarEditor />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AdminLayout>
    </AdminGuard>
  );
};

export default AdminRoutes;
