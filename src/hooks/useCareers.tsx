import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Career {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
}

export interface CareerSkill {
  id: string;
  career_id: string;
  skill_name: string;
  display_order: number;
  weight: number;
  icon: string;
  color: string;
}

export interface SkillContribution {
  skill_name: string;
  contribution: number; // 0-100 percentage
}

export interface CareerCourse {
  id: string;
  career_id: string;
  course_id: string;
  skill_contributions: SkillContribution[];
  course?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface Course {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  featured_image?: string | null;
}

// ─── Careers sessionStorage cache ────────────────────────────────────────────
// Careers data is static/infrequently-changing and NOT user-specific.
// Caching it means every useCareers() consumer renders instantly on revisit,
// before authLoading resolves.
const CAREERS_CACHE_KEY = 'um_careers_v1';
interface CareersCache {
  careers: Career[];
  careerSkills: Record<string, CareerSkill[]>;
  careerCourses: Record<string, CareerCourse[]>;
  allCourses: Course[];
}
function readCareersCache(): CareersCache | null {
  try { return JSON.parse(sessionStorage.getItem(CAREERS_CACHE_KEY) || 'null'); }
  catch { return null; }
}
function writeCareersCache(data: CareersCache) {
  try { sessionStorage.setItem(CAREERS_CACHE_KEY, JSON.stringify(data)); }
  catch {}
}
// ─────────────────────────────────────────────────────────────────────────────

export const useCareers = () => {
  const { isLoading: authLoading } = useAuth();

  // Synchronous cache init — all useCareers() consumers render with correct data
  // on the very first frame, before auth resolves and before any DB query fires.
  const [initCache] = useState<CareersCache | null>(() => readCareersCache());
  const [careers, setCareers] = useState<Career[]>(() => initCache?.careers ?? []);
  const [careerSkills, setCareerSkills] = useState<Record<string, CareerSkill[]>>(() => initCache?.careerSkills ?? {});
  const [careerCourses, setCareerCourses] = useState<Record<string, CareerCourse[]>>(() => initCache?.careerCourses ?? {});
  const [allCourses, setAllCourses] = useState<Course[]>(() => initCache?.allCourses ?? []);
  const [loading, setLoading] = useState(() => !initCache); // false if cache hit

  // Prevent a common refresh bug:
  // if we fetch career data BEFORE auth finishes restoring, backend policies may deny the request,
  // leaving careers empty and causing the Career Board shell to redirect to /arcade.
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Defined before the useEffect that calls it to avoid TDZ error
  const fetchCareers = useCallback(async () => {
    // Don't flip to loading=true if we already have cached data rendered.
    // A silent refresh in the background is better UX than a skeleton flash.
    if (!initCache) setLoading(true);
    try {
      const [careersRes, skillsRes, coursesRes, allCoursesRes] = await Promise.all([
        supabase.from("careers").select("*").order("display_order"),
        supabase.from("career_skills").select("*").order("display_order"),
        supabase.from("career_courses").select("*, course:course_id(id, name, slug)").is("deleted_at", null),
        supabase.from("courses").select("id, name, slug, description, featured_image"),
      ]);

      const firstError = careersRes.error || skillsRes.error || coursesRes.error || allCoursesRes.error;
      if (firstError) throw firstError;

      if (careersRes.data) setCareers(careersRes.data);
      if (allCoursesRes.data) setAllCourses(allCoursesRes.data);

      const resolvedSkillsByCareer: Record<string, CareerSkill[]> = {};
      if (skillsRes.data) {
        skillsRes.data.forEach(skill => {
          if (!resolvedSkillsByCareer[skill.career_id]) resolvedSkillsByCareer[skill.career_id] = [];
          resolvedSkillsByCareer[skill.career_id].push({
            ...skill, weight: skill.weight || 25, icon: skill.icon || 'Code2', color: skill.color || 'Emerald',
          });
        });
        setCareerSkills(resolvedSkillsByCareer);
      }

      const resolvedCoursesByCareer: Record<string, CareerCourse[]> = {};
      if (coursesRes.data) {
        coursesRes.data.forEach(cc => {
          if (!resolvedCoursesByCareer[cc.career_id]) resolvedCoursesByCareer[cc.career_id] = [];
          const skillContributions = Array.isArray(cc.skill_contributions)
            ? (cc.skill_contributions as unknown as SkillContribution[])
            : [];
          resolvedCoursesByCareer[cc.career_id].push({
            id: cc.id, career_id: cc.career_id, course_id: cc.course_id,
            skill_contributions: skillContributions, course: cc.course,
          });
        });
        setCareerCourses(resolvedCoursesByCareer);
      }

      // Persist to sessionStorage — all future useCareers() calls return instantly
      writeCareersCache({
        careers: careersRes.data ?? [],
        careerSkills: resolvedSkillsByCareer,
        careerCourses: resolvedCoursesByCareer,
        allCourses: allCoursesRes.data ?? [],
      });
    } catch (error) {
      console.error("Error fetching careers:", error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasFetchedOnce) return;
    if (authLoading) return;

    setHasFetchedOnce(true);
    fetchCareers();
  }, [authLoading, hasFetchedOnce, fetchCareers]);

  // Safety timeout: if loading takes more than 10 seconds, force it to complete
  // This prevents infinite loading states in edge cases
  useEffect(() => {
    if (!loading) return;

    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("useCareers: Loading timeout reached, forcing completion");
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const getCareerBySlug = useCallback((slug: string) => {
    return careers.find(c => c.slug === slug);
  }, [careers]);

  const getCareerById = (id: string) => {
    return careers.find(c => c.id === id);
  };

  const getCareerSkills = (careerId: string) => {
    return careerSkills[careerId] || [];
  };

  /**
   * Get course slugs for a career.
   * Returns:
   * - null: Still loading (caller should NOT redirect)
   * - []: Confirmed empty (career has no courses)
   * - string[]: List of course slugs
   */
  const getCareerCourseSlugs = (careerId: string): string[] | null => {
    // If still loading, return null to signal "unknown" state
    if (loading) return null;
    return careerCourses[careerId]?.map(cc => cc.course?.slug).filter(Boolean) as string[] || [];
  };

  const getSkillContributionsForCourse = (careerId: string, courseSlug: string): SkillContribution[] => {
    const careerCourse = careerCourses[careerId]?.find(cc => cc.course?.slug === courseSlug);
    return careerCourse?.skill_contributions || [];
  };

  const getCareerCourses = (careerId: string) => {
    return careerCourses[careerId] || [];
  };

  // Get the first course that contributes to a specific skill
  const getCourseForSkill = (careerId: string, skillName: string): { courseSlug: string; courseId: string } | null => {
    const courses = careerCourses[careerId] || [];
    for (const cc of courses) {
      const contributions = cc.skill_contributions || [];
      const hasSkill = contributions.some(c => 
        c.skill_name.toLowerCase() === skillName.toLowerCase()
      );
      if (hasSkill && cc.course?.slug) {
        return { courseSlug: cc.course.slug, courseId: cc.course.id };
      }
    }
    // If no specific contribution found, return the first course in the career path
    if (courses.length > 0 && courses[0].course?.slug) {
      return { courseSlug: courses[0].course.slug, courseId: courses[0].course.id };
    }
    return null;
  };

  /**
   * Check if a course belongs to a specific career.
   * Returns:
   * - undefined: Still loading career data (caller should NOT make decisions yet)
   * - true: Course IS in the career
   * - false: Course is NOT in the career (data loaded, definitively not found)
   */
  const isCourseInCareer = (courseId: string, careerId: string): boolean | undefined => {
    // If still loading, return undefined to signal "unknown" state
    if (loading) return undefined;
    const courses = careerCourses[careerId] || [];
    return courses.some(cc => cc.course_id === courseId);
  };

  // Check if a course belongs to any career (returns the career ID if found)
  const getCareerForCourse = (courseId: string): string | null => {
    for (const [careerId, courses] of Object.entries(careerCourses)) {
      if (courses.some(cc => cc.course_id === courseId)) {
        return careerId;
      }
    }
    return null;
  };

  return {
    careers,
    careerSkills,
    careerCourses,
    allCourses,
    loading,
    getCareerBySlug,
    getCareerById,
    getCareerSkills,
    getCareerCourseSlugs,
    getSkillContributionsForCourse,
    getCareerCourses,
    getCourseForSkill,
    isCourseInCareer,
    getCareerForCourse,
    refetch: fetchCareers,
  };
};
