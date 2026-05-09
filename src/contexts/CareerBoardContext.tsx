/**
 * Career Board Context
 * 
 * Provides career data to all components within the Career Board shell.
 * Children inherit career context implicitly - no per-course checks needed.
 * 
 * ARCHITECTURE:
 * - CareerBoardLayout sets this context once
 * - All children (CareerCourseDetail, etc.) consume it
 * - No async header decision logic anywhere in children
 */
import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserState } from "@/hooks/useUserState";
import { useCareers } from "@/hooks/useCareers";
import { useAuth } from "@/contexts/AuthContext";

interface Career {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
}

interface CareerCourse {
  id: string;
  name: string;
  slug: string;
}

interface CareerBoardContextValue {
  /** The active career for this board */
  career: Career | null;
  /** All courses in this career path */
  careerCourses: CareerCourse[];
  /** Whether career context is still loading (shell-level) */
  isLoading: boolean;
  /** Whether the context is fully initialized */
  isReady: boolean;
  /** Whether course data is ready (for redirect decisions) */
  isCoursesReady: boolean;
  /** Current course being viewed (if any) */
  currentCourseSlug: string | null;
  /** Set the current course slug (for CareerScopedHeader highlighting) */
  setCurrentCourseSlug: (slug: string | null) => void;
  /** When set, CareerScopedHeader shows "Notes — {deepNotesTitle}" instead of course nav */
  deepNotesTitle: string | null;
  /** Signal that Deep Notes is open for the given course name (null to clear) */
  setDeepNotesTitle: (title: string | null) => void;
  /** When set, CareerScopedHeader shows "Practice — {practiceTitle}" instead of course nav */
  practiceTitle: string | null;
  /** Signal that Practice Focus Mode is open for the given course name (null to clear) */
  setPracticeTitle: (title: string | null) => void;
}

const CareerBoardContext = createContext<CareerBoardContextValue | null>(null);

export const useCareerBoard = (): CareerBoardContextValue => {
  const context = useContext(CareerBoardContext);
  if (!context) {
    throw new Error("useCareerBoard must be used within CareerBoardProvider");
  }
  return context;
};

/**
 * Optional hook that returns null if not in Career Board context
 * Useful for components that may or may not be in Career Board
 */
export const useCareerBoardOptional = (): CareerBoardContextValue | null => {
  return useContext(CareerBoardContext);
};

interface CareerBoardProviderProps {
  children: ReactNode;
}

export const CareerBoardProvider = ({ children }: CareerBoardProviderProps) => {
  const { careerId } = useParams<{ careerId: string }>();
  const navigate = useNavigate();
  const { isLoading: authLoading, user } = useAuth();
  const { isPro, isLoading: userStateLoading } = useUserState();
  const { careers, getCareerBySlug, getCareerCourses, loading: careersLoading, refetch: refetchCareers } = useCareers();
  
  const [currentCourseSlug, setCurrentCourseSlug] = useState<string | null>(null);
  const [deepNotesTitle, setDeepNotesTitle] = useState<string | null>(null);
  const [practiceTitle, setPracticeTitle] = useState<string | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [userSelectedCourseIds, setUserSelectedCourseIds] = useState<string[] | null>(null);
  // Add-on courses: selected by the user from outside this career's course list
  const [addonCourses, setAddonCourses] = useState<CareerCourse[]>([]);
  
  // Track if auth has been checked at least once (like CourseDetail's authReady)
  // This prevents premature redirects during page refresh
  const [authChecked, setAuthChecked] = useState(false);
  
  // Track if we've successfully loaded once - prevents re-showing skeleton on tab focus
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // If the first careers fetch happens during an unlucky refresh window and returns empty,
  // the layout would otherwise immediately redirect to /arcade ("career not found").
  // We retry once before declaring the career missing.
  const hasRetriedCareerResolveRef = useRef(false);

  // Safety timeout: if loading takes more than 8 seconds, force ready state
  useEffect(() => {
    if (hasLoadedOnce) return;
    
    const timeout = setTimeout(() => {
      if (!hasLoadedOnce) {
        console.warn("CareerBoardContext: Loading timeout reached, forcing ready state");
        setIsReady(true);
        setHasLoadedOnce(true);
      }
    }, 8000);
    
    return () => clearTimeout(timeout);
  }, [hasLoadedOnce]);
  
  useEffect(() => {
    if (!authLoading) {
      setAuthChecked(true);
    }
  }, [authLoading]);

  // Resolve career from careerId param (which is the slug)
  useEffect(() => {
    if (careersLoading || !careerId) return;

    const resolved = getCareerBySlug(careerId);

    if (resolved) {
      hasRetriedCareerResolveRef.current = false;
      setCareer({
        id: resolved.id,
        name: resolved.name,
        slug: resolved.slug,
        description: resolved.description ?? null,
        icon: resolved.icon,
        color: resolved.color,
      });
      setIsReady(true);
      return;
    }

    // If careers came back empty, retry once before marking as "not found".
    if (careers.length === 0 && !hasRetriedCareerResolveRef.current) {
      hasRetriedCareerResolveRef.current = true;
      refetchCareers();
      return;
    }

    setCareer(null);
    setIsReady(true);
  }, [careerId, careersLoading, careers.length, getCareerBySlug, refetchCareers]);

  // Fetch this user's planned course selections for the active career
  useEffect(() => {
    if (!user?.id || !career?.id) {
      setUserSelectedCourseIds(null);
      return;
    }
    supabase
      .from("user_career_selections")
      .select("selected_course_ids")
      .eq("user_id", user.id)
      .eq("career_id", career.id)
      .maybeSingle()
      .then(({ data }) => {
        setUserSelectedCourseIds(data?.selected_course_ids ?? null);
      });
  }, [user?.id, career?.id]);

  // Redirect non-Pro users away from Career Board to Arcade (career roadmap)
  // CRITICAL: Wait for BOTH authChecked AND userStateLoading to complete
  // This matches CourseDetail's pattern of waiting for authReady
  useEffect(() => {
    // Wait for auth to be checked first (prevents redirect during session restore)
    if (!authChecked) return;
    
    // Then wait for user state (subscription check) to complete
    if (userStateLoading) return;
    
    // Only redirect if confirmed not Pro - send to Arcade (career roadmap) not /courses
    if (!isPro) {
      navigate("/careers", { replace: true });
    }
  }, [authChecked, isPro, userStateLoading, navigate]);

  // Build the flat list of native career courses. Recomputes only when career or
  // careers data changes — intentionally NOT depending on the unstable
  // getCareerCourses function reference (it is redefined on every useCareers render).
  const nativeCourses = useMemo((): CareerCourse[] => {
    if (!career?.id) return [];
    return getCareerCourses(career.id)
      .filter(cc => cc.course)
      .map(cc => ({
        id: cc.course!.id,
        name: cc.course!.name,
        slug: cc.course!.slug,
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [career?.id, careersLoading]); // careersLoading flips once when data arrives — stable trigger

  // Fetch add-on courses: IDs in the user's plan that are NOT native career courses.
  // Runs only when userSelectedCourseIds or nativeCourses changes — both are stable.
  useEffect(() => {
    if (!userSelectedCourseIds || userSelectedCourseIds.length === 0) {
      // Use functional update to avoid setting a new [] reference when already empty
      setAddonCourses(prev => (prev.length === 0 ? prev : []));
      return;
    }
    const nativeIds = new Set(nativeCourses.map(c => c.id));
    const addonIds = userSelectedCourseIds.filter(id => !nativeIds.has(id));
    if (addonIds.length === 0) {
      setAddonCourses([]);
      return;
    }
    supabase
      .from("courses")
      .select("id, name, slug")
      .in("id", addonIds)
      .then(({ data }) => {
        if (!data) return;
        const byId = new Map(data.map(c => [c.id, c]));
        setAddonCourses(
          addonIds
            .map(id => byId.get(id))
            .filter(Boolean)
            .map(c => ({ id: c!.id, name: c!.name, slug: c!.slug }))
        );
      });
  }, [userSelectedCourseIds, nativeCourses]);

  // Get courses for this career, filtered to the user's planned selection.
  // Includes both career-native courses AND add-ons chosen during planning.
  // Falls back to all native courses if no selection saved yet.
  const careerCourses = useMemo((): CareerCourse[] => {
    // No saved selection yet — show native courses only (nothing planned)
    if (!userSelectedCourseIds || userSelectedCourseIds.length === 0) return nativeCourses;

    // Pool of all available courses: native + fetched add-ons
    const allAvailable = new Map<string, CareerCourse>([
      ...nativeCourses.map(c => [c.id, c] as [string, CareerCourse]),
      ...addonCourses.map(c => [c.id, c] as [string, CareerCourse]),
    ]);

    // Render in plan order; skip IDs not yet resolved (add-ons still loading)
    return userSelectedCourseIds
      .map(id => allAvailable.get(id))
      .filter(Boolean) as CareerCourse[];
  }, [nativeCourses, userSelectedCourseIds, addonCourses]);

  // Calculate loading state - but once loaded, stay loaded.
  // NOTE: userStateLoading is intentionally excluded. The subscription check can take
  // up to 5 seconds post-purchase (session refresh + new subscription row), which would
  // leave the header in skeleton state. The redirect guard already waits for
  // userStateLoading separately before calling navigate(), so excluding it here
  // lets the shell render as soon as auth + careers are ready.
  const isCurrentlyLoading = !authChecked || careersLoading || !isReady;
  
  // Mark as loaded once all initial loading is complete
  useEffect(() => {
    if (!isCurrentlyLoading && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [isCurrentlyLoading, hasLoadedOnce]);
  
  // Only show loading if we haven't loaded successfully before
  const isLoading = hasLoadedOnce ? false : isCurrentlyLoading;

  // Course data readiness - separate from shell loading
  const isCoursesReady = !careersLoading && isReady;

  const value: CareerBoardContextValue = {
    career,
    careerCourses,
    isLoading,
    isReady,
    isCoursesReady,
    currentCourseSlug,
    setCurrentCourseSlug,
    deepNotesTitle,
    setDeepNotesTitle,
    practiceTitle,
    setPracticeTitle,
  };

  return (
    <CareerBoardContext.Provider value={value}>
      {children}
    </CareerBoardContext.Provider>
  );
};

export default CareerBoardContext;
