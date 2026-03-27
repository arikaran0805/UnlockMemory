import { ReactNode, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import SuperModeratorSidebar from "@/components/SuperModeratorSidebar";
import AdminBreadcrumbHeader from "@/components/AdminBreadcrumbHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminBadgeReads } from "@/hooks/useAdminBadgeReads";
import { GlobalCommandSearch } from "@/components/GlobalCommandSearch";

interface SuperModeratorLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

const SuperModeratorLayout = ({
  children,
  defaultSidebarCollapsed = true,
}: SuperModeratorLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  const { userId, activeRole } = useAuth();
  const { notifications } = useAdminNotifications(activeRole === "super_moderator", userId);
  const { markBadgeSeen, getUnreadCount } = useAdminBadgeReads(userId);
  const location = useLocation();

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", session.user.id)
          .maybeSingle();
        setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const badgeKeyMap: Record<string, string> = {
      "/super-moderator/approvals": "approvals",
      "/super-moderator/reports":   "reports",
    };
    const badgeKey = badgeKeyMap[location.pathname];
    if (badgeKey && notifications) {
      const countMap: Record<string, number> = {
        approvals: notifications.totalApprovals || 0,
        reports:   notifications.reports || 0,
      };
      const count = countMap[badgeKey] || 0;
      if (count > 0) markBadgeSeen(badgeKey, count);
    }
  }, [location.pathname, notifications, markBadgeSeen]);

  const getBadgeCount = (path: string): number => {
    if (!notifications) return 0;
    const badgeKeyMap: Record<string, string> = {
      "/super-moderator/approvals": "approvals",
      "/super-moderator/reports":   "reports",
    };
    const badgeKey = badgeKeyMap[path];
    if (!badgeKey) return 0;
    const countMap: Record<string, number> = {
      approvals: notifications.totalApprovals || 0,
      reports:   notifications.reports || 0,
    };
    return getUnreadCount(badgeKey, countMap[badgeKey] || 0);
  };

  return (
    <>
      <GlobalCommandSearch open={commandSearchOpen} onOpenChange={setCommandSearchOpen} />
      <div className="min-h-screen bg-background flex w-full">
        <SuperModeratorSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          userProfile={userProfile}
          onProfileUpdated={setUserProfile}
          userId={userId}
          getBadgeCount={getBadgeCount}
        />
        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "pl-60" : "pl-14"}`}>
          <AdminBreadcrumbHeader />
          <div className="p-8">{children}</div>
        </main>
      </div>
    </>
  );
};

export default SuperModeratorLayout;
