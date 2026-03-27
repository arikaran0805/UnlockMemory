import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useAdminBadgeReads } from "@/hooks/useAdminBadgeReads";
import SeniorModeratorSidebar from "@/components/SeniorModeratorSidebar";
import AdminBreadcrumbHeader from "@/components/AdminBreadcrumbHeader";
import { GlobalCommandSearch } from "@/components/GlobalCommandSearch";

interface SeniorModeratorLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

const SeniorModeratorLayout = ({ children, defaultSidebarCollapsed = true }: SeniorModeratorLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const location = useLocation();
  const { userId } = useAuth();
  const { notifications } = useAdminNotifications(true, userId);
  const { getUnreadCount, markBadgeSeen } = useAdminBadgeReads(userId);

  const badgeKeyMap: Record<string, string> = useMemo(() => ({
    "/senior-moderator/approvals":  "totalApprovals",
    "/senior-moderator/reports":    "reports",
    "/senior-moderator/posts":      "pendingPosts",
    "/senior-moderator/courses":    "pendingCourses",
    "/senior-moderator/tags":       "pendingTags",
    "/senior-moderator/comments":   "pendingComments",
    "/senior-moderator/annotations":"openAnnotations",
  }), []);

  useEffect(() => {
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
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const badgeKey = badgeKeyMap[location.pathname];
    if (badgeKey && notifications[badgeKey as keyof typeof notifications] !== undefined) {
      const currentCount = notifications[badgeKey as keyof typeof notifications];
      if (typeof currentCount === "number" && currentCount > 0) {
        markBadgeSeen(badgeKey, currentCount);
      }
    }
  }, [location.pathname, notifications, badgeKeyMap, markBadgeSeen]);

  const getBadgeCount = (key: string): number | undefined => {
    const currentCount = notifications[key as keyof typeof notifications];
    if (typeof currentCount !== "number") return undefined;
    const unread = getUnreadCount(key, currentCount);
    return unread > 0 ? unread : undefined;
  };

  return (
    <>
      <GlobalCommandSearch open={commandSearchOpen} onOpenChange={setCommandSearchOpen} />
      <div className="min-h-screen bg-background flex w-full">
        <SeniorModeratorSidebar
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

export default SeniorModeratorLayout;
