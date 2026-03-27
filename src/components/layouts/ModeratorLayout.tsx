import { ReactNode, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ModeratorSidebar from "@/components/ModeratorSidebar";
import AdminBreadcrumbHeader from "@/components/AdminBreadcrumbHeader";
import { GlobalCommandSearch } from "@/components/GlobalCommandSearch";

interface ModeratorLayoutProps {
  children: ReactNode;
  defaultSidebarCollapsed?: boolean;
}

const ModeratorLayout = ({ children, defaultSidebarCollapsed = true }: ModeratorLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(!defaultSidebarCollapsed);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [commandSearchOpen, setCommandSearchOpen] = useState(false);
  const { userId } = useAuth();

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

  return (
    <>
      <GlobalCommandSearch open={commandSearchOpen} onOpenChange={setCommandSearchOpen} />
      <div className="min-h-screen bg-background flex w-full">
        <ModeratorSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          userProfile={userProfile}
          onProfileUpdated={setUserProfile}
          userId={userId}
        />
        <main className={`flex-1 min-w-0 transition-all duration-300 ${sidebarOpen ? "pl-60" : "pl-14"}`}>
          <AdminBreadcrumbHeader />
          <div className="p-8">{children}</div>
        </main>
      </div>
    </>
  );
};

export default ModeratorLayout;
