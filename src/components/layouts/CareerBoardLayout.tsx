/**
 * Career Board Layout
 * 
 * ARCHITECTURAL GUARANTEE:
 * - ALWAYS renders CareerScopedHeader
 * - NEVER renders NormalHeader
 * - NEVER shows Google AdSense
 * - NEVER shows upgrade nudges
 * 
 * This is a premium, distraction-free shell for career-mapped learning.
 * Children inherit career context and are header-agnostic.
 * 
 * WELCOME SCREEN:
 * - Shows one-time Career Welcome Screen on first entry
 * - Owned by this layout, NOT by child pages
 * - Persisted per user per career in database
 */
import { useState, useCallback, useEffect } from "react";
import { Outlet, Navigate, useSearchParams } from "react-router-dom";
import { useCareerBoard } from "@/contexts/CareerBoardContext";
import { useUserState } from "@/hooks/useUserState";
import { useCareerWelcome } from "@/hooks/useCareerWelcome";
import { useCareers } from "@/hooks/useCareers";
import { CareerScopedHeader } from "@/components/course/CareerScopedHeader";
import { CareerWelcomePage } from "@/components/career/CareerWelcomePage";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import BackToTop from "@/components/BackToTop";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading skeleton that matches CareerScopedHeader dimensions
 * Prevents layout shift during initial load
 */
const CareerBoardSkeleton = () => (
  <div className="min-h-screen bg-background">
    {/* Primary header skeleton */}
    <div className="h-16 bg-background border-b" />
    {/* Secondary header skeleton */}
    <div className="h-12 bg-muted/50 border-b animate-pulse" />
    {/* Content skeleton */}
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  </div>
);

export const CareerBoardLayout = () => {
  const { career, careerCourses, isLoading: careerContextLoading, isReady, currentCourseSlug, setCurrentCourseSlug } = useCareerBoard();
  const { isPro } = useUserState();
  const { getCareerSkills, loading: careersLoading } = useCareers();
  const [searchParams, setSearchParams] = useSearchParams();
  const showOverview = searchParams.get('overview') === 'true';
  
  // Welcome screen state - check if user has seen welcome for this career
  const { hasSeenWelcome, loading: welcomeLoading, markWelcomeSeen } = useCareerWelcome(career?.id);
  
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  
  // Track if welcome was just dismissed (to skip skeleton after welcome)
  const [welcomeJustDismissed, setWelcomeJustDismissed] = useState(false);
  
  // Track if we've completed initial shell load - prevents skeleton on tab refocus
  const [hasShellLoaded, setHasShellLoaded] = useState(false);

  // Track header visibility for sticky positioning
  const { isHeaderVisible } = useScrollDirection({
    threshold: 10,
    showOnlyAtTop: true,
    enabled: true,
  });

  const handleAnnouncementVisibility = useCallback((visible: boolean) => {
    setShowAnnouncement(visible);
  }, []);

  /**
   * Handle Welcome Screen CTA click
   * - Mark welcome as seen (persists to DB)
   * - Skip skeleton on transition (welcomeJustDismissed flag)
   */
  const handleWelcomeStart = useCallback(async () => {
    // Mark that we're transitioning from welcome - skip skeleton
    setWelcomeJustDismissed(true);
    setHasShellLoaded(true); // Prevent skeleton after welcome dismissal
    
    if (showOverview) {
      // User is manually viewing overview - just remove the param to resume
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('overview');
      setSearchParams(nextParams, { replace: true });
    } else {
      // First-time welcome completion
      await markWelcomeSeen();
    }
  }, [markWelcomeSeen, showOverview, searchParams, setSearchParams]);

  // Get skills for welcome page (needed before early returns)
  const careerSkills = career ? getCareerSkills(career.id) : [];

  // SHELL loading state - ONLY depends on career context loading
  // Pro-check redirect happens via CareerBoardContext effect, NOT here
  // Course data loading is handled by child pages with local skeletons
  const isShellLoading = careerContextLoading;
  
  // Safety timeout for shell loading
  useEffect(() => {
    if (hasShellLoaded) return;
    
    const timeout = setTimeout(() => {
      if (!hasShellLoaded) {
        console.warn("CareerBoardLayout: Shell loading timeout, forcing completion");
        setHasShellLoaded(true);
      }
    }, 8000);
    
    return () => clearTimeout(timeout);
  }, [hasShellLoaded]);
  
  // Mark shell as loaded once loading completes
  useEffect(() => {
    if (!isShellLoading && !hasShellLoaded) {
      setHasShellLoaded(true);
    }
  }, [isShellLoading, hasShellLoaded]);

  /**
   * WELCOME PAGE GATE - Check BEFORE shell skeleton
   * 
   * If user has NOT seen welcome, show full-page welcome immediately.
   * This bypasses ALL shell loading states - welcome page is standalone.
   */
  
  // First: Check if we're still determining welcome status (and not just dismissed)
  if (career && welcomeLoading && !welcomeJustDismissed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Second: If user hasn't seen welcome (and didn't just dismiss it), OR they explicitly requested overview
  if (((hasSeenWelcome === false && !welcomeJustDismissed) || showOverview) && career) {
    return (
      <CareerWelcomePage 
        career={career as any}
        skills={careerSkills}
        onStart={handleWelcomeStart}
      />
    );
  }

  /**
   * SHELL RENDERING - For returning users OR after welcome dismissal
   * 
   * Skip skeleton if:
   * - Shell has already loaded once (tab refocus)
   * - Welcome was just dismissed (smooth transition)
   */
  const shouldShowSkeleton = (hasShellLoaded || welcomeJustDismissed) ? false : isShellLoading;

  if (shouldShowSkeleton) {
    return <CareerBoardSkeleton />;
  }

  // Career not found - only check when fully ready (never show skeleton as "not found")
  // Pro-check redirect is handled by CareerBoardContext effect
  if (isReady && !career) {
    return <Navigate to="/careers" replace />;
  }

  // Build current course object for header highlighting
  const currentCourse = currentCourseSlug
    ? careerCourses.find(c => c.slug === currentCourseSlug) || null
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Announcement Bar - Sticky at very top */}
      <div className="fixed top-0 left-0 right-0 z-[60]">
        <AnnouncementBar onVisibilityChange={handleAnnouncementVisibility} />
      </div>

      {/* Primary Header - Auto-hides on scroll (same as CourseDetail) */}
      <Header 
        announcementVisible={showAnnouncement}
        autoHideOnScroll={true}
        showCourseSecondaryHeader={false} // NEVER show normal secondary header
      />

      {/* CareerScopedHeader - ALWAYS RENDERED (Architecture Guarantee) */}
      <CareerScopedHeader
        currentCourse={currentCourse || undefined}
        career={career}
        careerCourses={careerCourses}
        isHeaderVisible={isHeaderVisible}
        announcementVisible={showAnnouncement}
        isLoading={false} // Never show loading state - we already handled it above
      />

      {/* Main Content Area */}
      <main 
        className={cn(
          "flex-1 transition-[padding-top] duration-200 ease-out",
          // Dynamic padding based on header visibility (matches CourseDetail pattern)
          // Header visible: Primary (64px) + CareerScoped (48px) + optional Announcement (36px)
          // Header hidden: CareerScoped (48px) + optional Announcement (36px)
          isHeaderVisible
            ? (showAnnouncement ? 'pt-[9.25rem]' : 'pt-28')   // 148px / 112px
            : (showAnnouncement ? 'pt-[5.25rem]' : 'pt-12')   // 84px / 48px
        )}
      >
        <Outlet context={{ setCurrentCourseSlug, isHeaderVisible, showAnnouncement }} />
      </main>

      {/* Back to top button */}
      <BackToTop />
    </div>
  );
};

export default CareerBoardLayout;
