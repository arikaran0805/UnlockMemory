import { ReactNode, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { AnnouncementBar } from "./AnnouncementBar";
import BackToTop from "./BackToTop";
import { useUserState } from "@/hooks/useUserState";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

const Layout = ({ children, showFooter = true }: LayoutProps) => {
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const location = useLocation();
  const { isPro } = useUserState();

  // Hide secondary course header for specific pages
  const isProfilePage = location.pathname === "/profile";
  const hideOnPages = ["/choose-plan", "/careers", "/plan", "/checkout"].includes(location.pathname);
  const hideSecondaryHeader = hideOnPages || isProfilePage;

  const handleAnnouncementVisibility = useCallback((visible: boolean) => {
    setShowAnnouncement(visible);
  }, []);

  // Calculate padding-top based on header configuration
  // Primary header: 64px (pt-16), Announcement: 32px (pt-8), Secondary header: 40px (pt-10)
  const getPaddingTop = () => {
    if (hideSecondaryHeader) {
      // Pro on Profile: Only primary header (64px) + optional announcement (32px)
      return showAnnouncement ? 'pt-24' : 'pt-16';
    }
    // Default: Primary (64px) + Secondary (40px) + optional announcement (32px)
    return showAnnouncement ? 'pt-32' : 'pt-24';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Sticky Announcement Bar */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
      </div>
      <Header announcementVisible={showAnnouncement} />
      {/* Add padding-top to account for fixed header + announcement bar */}
      <main className={`flex-1 ${getPaddingTop()}`}>
        {children}
      </main>
      {showFooter && <Footer />}
      <BackToTop />
    </div>
  );
};

export default Layout;
