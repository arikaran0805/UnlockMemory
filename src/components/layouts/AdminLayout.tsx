import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminBadgeReads } from "@/hooks/useAdminBadgeReads";
import AdminSidebar from "@/components/AdminSidebar";
import AdminBreadcrumbHeader from "@/components/AdminBreadcrumbHeader";
import { AdminSidebarProvider, useAdminSidebar } from "@/contexts/AdminSidebarContext";
import { GlobalCommandSearch } from "@/components/GlobalCommandSearch";

interface AdminLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

const getPageTitle = (pathname: string): string => {
  const pageTitles: Record<string, string> = {
    "/admin/dashboard": "Dashboard",
    "/admin/posts": "Posts",
    "/admin/courses": "Courses",
    "/admin/tags": "Tags",
    "/admin/authors": "Roles & Permissions",
    "/admin/users": "Users",
    "/admin/comments": "Comments",
    "/admin/media": "Media Library",
    "/admin/monetization": "Monetization",
    "/admin/pages": "Pages",
    "/admin/redirects": "Redirects",
    "/admin/api": "API & Integrations",
    "/admin/careers": "Careers",
    "/admin/settings": "Settings",
    "/admin/analytics": "Analytics",
    "/admin/social-analytics": "Social Analytics",
    "/admin/approvals": "Approval Queue",
    "/admin/delete-requests": "Delete Requests",
    "/admin/activity": "Moderator Activity",
    "/admin/reports": "Reports",
    "/admin/annotations": "Annotations",
  };

  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/admin/posts/")) return "Edit Post";
  if (pathname.startsWith("/admin/courses/")) return "Edit Course";
  if (pathname.startsWith("/admin/careers/")) return "Edit Career";

  return "Admin";
};

const getPageSubtitle = (pathname: string): string => {
  const subtitles: Record<string, string> = {
    "/admin/dashboard": "Platform overview & system control",
    "/admin/approvals": "Review and approve content submissions",
    "/admin/delete-requests": "Manage content deletion requests",
    "/admin/reports": "Review user reports and feedback",
    "/admin/posts": "Manage blog posts and articles",
    "/admin/courses": "Manage educational courses",
    "/admin/careers": "Manage career paths",
    "/admin/tags": "Organize content with tags",
    "/admin/pages": "Manage static pages",
    "/admin/media": "Upload and manage media files",
    "/admin/comments": "Moderate user comments",
    "/admin/annotations": "Review content annotations",
    "/admin/analytics": "Track performance metrics",
    "/admin/social-analytics": "Social media insights",
    "/admin/users": "Manage platform users",
    "/admin/authors": "Manage roles and permissions",
    "/admin/monetization": "Revenue and payments",
    "/admin/redirects": "URL redirect management",
    "/admin/api": "API keys and integrations",
    "/admin/settings": "Platform configuration",
  };

  return subtitles[pathname] || "";
};

const AdminLayoutContent = ({ children }: { children: ReactNode }) => {
  const { sidebarOpen, toggleSidebar } = useAdminSidebar();
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const location = useLocation();
  const { userId } = useAuth();
  const { notifications } = useAdminNotifications(true, userId);
  const { getUnreadCount, markBadgeSeen } = useAdminBadgeReads(userId);

  // Map paths to badge keys (must match what AdminSidebar uses in getItemBadge)
  // AdminSidebar extracts path.split('/').pop() as the key, so we must use the same keys
  const pathToBadgeKey: Record<string, string> = useMemo(() => ({
    "/admin/approvals": "approvals",
    "/admin/delete-requests": "delete-requests",
    "/admin/reports": "reports",
    "/admin/posts": "posts",
    "/admin/courses": "courses",
    "/admin/tags": "tags",
    "/admin/comments": "comments",
    "/admin/media": "media",
    "/admin/users": "users",
    "/admin/annotations": "annotations",
  }), []);

  // Map badge keys to notification property names
  const badgeKeyToNotificationProp: Record<string, keyof typeof notifications> = useMemo(() => ({
    "approvals": "totalApprovals",
    "delete-requests": "deleteRequests",
    "reports": "reports",
    "posts": "pendingPosts",
    "courses": "pendingCourses",
    "tags": "pendingTags",
    "comments": "pendingComments",
    "media": "mediaLibrary",
    "users": "newUsers",
    "annotations": "openAnnotations",
  }), []);

  useEffect(() => {
    const badgeKey = pathToBadgeKey[location.pathname];
    if (badgeKey) {
      const notificationProp = badgeKeyToNotificationProp[badgeKey];
      if (notificationProp) {
        const currentCount = notifications[notificationProp];
        if (typeof currentCount === "number" && currentCount > 0) {
          markBadgeSeen(badgeKey, currentCount);
        }
      }
    }
  }, [location.pathname, notifications, pathToBadgeKey, badgeKeyToNotificationProp, markBadgeSeen]);

  const getBadgeCount = (badgeKey: string, currentCount: number): number | undefined => {
    const unread = getUnreadCount(badgeKey, currentCount);
    return unread > 0 ? unread : undefined;
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const pageTitle = getPageTitle(location.pathname);
  const pageSubtitle = getPageSubtitle(location.pathname);

  return (
    <>
      <GlobalCommandSearch open={commandSearchOpen} onOpenChange={setCommandSearchOpen} />
      <div className="min-h-screen bg-background flex w-full">
        <AdminSidebar
          isOpen={sidebarOpen}
          onToggle={toggleSidebar}
          userProfile={userProfile}
          onProfileUpdated={setUserProfile}
          userId={userId}
          notifications={notifications}
          getBadgeCount={getBadgeCount}
        />

        <main
          className={`flex-1 min-w-0 transition-all duration-300 ${
            sidebarOpen ? "pl-60" : "pl-14"
          }`}
        >
          <AdminBreadcrumbHeader />
          <div className="p-8">{children}</div>
        </main>
      </div>
    </>
  );
};

const AdminLayout = ({ children, defaultSidebarCollapsed = true }: AdminLayoutProps) => {
  return (
    <AdminSidebarProvider defaultOpen={!defaultSidebarCollapsed}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminSidebarProvider>
  );
};

export default AdminLayout;
