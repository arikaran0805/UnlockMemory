import { Route, Routes } from "react-router-dom";
import { ModeratorGuard } from "@/guards";
import { ModeratorLayout } from "@/components/layouts";

// Moderator Pages
import ModeratorDashboard from "@/pages/ModeratorDashboard";
import AdminPosts from "@/pages/AdminPosts";
import AdminPostEditor from "@/pages/AdminPostEditor";
import AdminApprovals from "@/pages/AdminApprovals";
import AdminComments from "@/pages/AdminComments";
import AdminModeratorActivity from "@/pages/AdminModeratorActivity";
import ModeratorCertificates from "@/pages/ModeratorCertificates";
import ModeratorMessageRequests from "@/pages/ModeratorMessageRequests";
import ConversationDetail from "@/pages/ConversationDetail";
import NotFound from "@/pages/NotFound";

/**
 * Moderator Routes Component
 * Wraps all moderator routes with ModeratorGuard and ModeratorLayout
 * URL prefix: /moderator/*
 */
const ModeratorRoutes = () => {
  return (
    <ModeratorGuard>
      <ModeratorLayout>
        <Routes>
          {/* Index route renders dashboard at /moderator */}
          <Route index element={<ModeratorDashboard />} />
          <Route path="dashboard" element={<ModeratorDashboard />} />
          <Route path="content" element={<AdminPosts />} />
          <Route path="posts/new" element={<AdminPostEditor />} />
          <Route path="posts/edit/:id" element={<AdminPostEditor />} />
          <Route path="review" element={<AdminApprovals />} />
          <Route path="certificates" element={<ModeratorCertificates />} />
          <Route path="comments" element={<AdminComments />} />
          <Route path="activity" element={<AdminModeratorActivity />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModeratorLayout>
    </ModeratorGuard>
  );
};

export default ModeratorRoutes;
