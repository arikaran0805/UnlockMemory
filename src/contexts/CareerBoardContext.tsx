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
  const { isLoading: authLoading } = useAuth();
  const { isPro, isLoading: userStateLoading } = useUserState();
  const { careers, getCareerBySlug, getCareerCourses, loading: careersLoading, refetch: refetchCareers } = useCareers();
  
  const [currentCourseSlug, setCurrentCourseSlug] = useState<string | null>(null);
  const [career, setCareer] = useState<Career | null>(null);
  const [isReady, setIsReady] = useState(false);
  
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

  // Get courses for this career
  const careerCourses = useMemo((): CareerCourse[] => {
    if (!career?.id) return [];
    
    const courses = getCareerCourses(career.id);
    return courses
      .filter(cc => cc.course)
      .map(cc => ({
        id: cc.course!.id,
        name: cc.course!.name,
        slug: cc.course!.slug,
      }));
  }, [career?.id, getCareerCourses]);

  // Calculate loading state - but once loaded, stay loaded
  const isCurrentlyLoading = !authChecked || userStateLoading || careersLoading || !isReady;
  
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
  };

  return (
    <CareerBoardContext.Provider value={value}>
      {children}
    </CareerBoardContext.Provider>
  );
};

export default CareerBoardContext;
