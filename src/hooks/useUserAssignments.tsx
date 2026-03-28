import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface CareerAssignment {
  id: string;
  career_id: string;
  career: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  } | null;
}

interface CourseAssignment {
  id: string;
  course_id: string;
  role: AppRole;
  course: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  } | null;
}

interface CourseFromCareer {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  career_id: string;
}

interface UserAssignmentsState {
  careerAssignments: CareerAssignment[];
  courseAssignments: CourseAssignment[];
  coursesFromCareers: CourseFromCareer[];
  assignedCareerIds: string[];
  assignedCourseIds: string[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch user's career and course assignments.
 * Used for ownership-based access control across the application.
 * 
 * - Career Managers: See careers they're assigned to + all courses within those careers
 * - Course Managers: See courses they're directly assigned to
 * - Content Moderators: See courses they're directly assigned to
 */
export const useUserAssignments = (userId: string | null, role: AppRole | null) => {
  const [state, setState] = useState<UserAssignmentsState>({
    careerAssignments: [],
    courseAssignments: [],
    coursesFromCareers: [],
    assignedCareerIds: [],
    assignedCourseIds: [],
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    if (!userId || !role) {
      setState({
        careerAssignments: [],
        courseAssignments: [],
        coursesFromCareers: [],
        assignedCareerIds: [],
        assignedCourseIds: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    // Admins don't need assignment checks - they see everything
    if (role === "admin") {
      setState({
        careerAssignments: [],
        courseAssignments: [],
        coursesFromCareers: [],
        assignedCareerIds: [],
        assignedCourseIds: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    const fetchAssignments = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        let careerAssignments: CareerAssignment[] = [];
        let courseAssignments: CourseAssignment[] = [];
        let coursesFromCareers: CourseFromCareer[] = [];

        // Career Managers: fetch career assignments and courses within those careers
        if (role === "super_moderator") {
          const { data: careerData, error: careerError } = await supabase
            .from("career_assignments")
            .select(`
              id,
              career_id,
              career:careers(id, name, slug, icon, color)
            `)
            .eq("user_id", userId);

          if (careerError) throw careerError;
          careerAssignments = (careerData || []) as unknown as CareerAssignment[];

          // Fetch all courses within assigned careers
          const careerIds = careerAssignments.map((a) => a.career_id);
          if (careerIds.length > 0) {
            const { data: careerCoursesData, error: careerCoursesError } = await supabase
              .from("career_courses")
              .select(`
                career_id,
                course:courses(id, name, slug, icon)
              `)
              .in("career_id", careerIds)
              .is("deleted_at", null);

            if (careerCoursesError) throw careerCoursesError;

            coursesFromCareers = (careerCoursesData || [])
              .filter((cc: any) => cc.course)
              .map((cc: any) => ({
                ...cc.course,
                career_id: cc.career_id,
              }));
          }
        }

        // Senior Moderators and Moderators: fetch direct course assignments
        if (role === "senior_moderator" || role === "moderator") {
          const { data: courseData, error: courseError } = await supabase
            .from("course_assignments")
            .select(`
              id,
              course_id,
              role,
              course:courses(id, name, slug, icon)
            `)
            .eq("user_id", userId);

          if (courseError) throw courseError;
          courseAssignments = (courseData || []) as unknown as CourseAssignment[];
        }

        // Calculate unique IDs
        const assignedCareerIds = careerAssignments.map((a) => a.career_id);
        const courseIdsFromCareers = coursesFromCareers.map((c) => c.id);
        const directCourseIds = courseAssignments.map((a) => a.course_id);
        const assignedCourseIds = [...new Set([...courseIdsFromCareers, ...directCourseIds])];

        setState({
          careerAssignments,
          courseAssignments,
          coursesFromCareers,
          assignedCareerIds,
          assignedCourseIds,
          isLoading: false,
          error: null,
        });
      } catch (err: any) {
        console.error("Error fetching user assignments:", err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message,
        }));
      }
    };

    fetchAssignments();
  }, [userId, role]);

  // Helper functions
  const hasCareerAccess = (careerId: string): boolean => {
    if (role === "admin") return true;
    return state.assignedCareerIds.includes(careerId);
  };

  const hasCourseAccess = (courseId: string): boolean => {
    if (role === "admin") return true;
    return state.assignedCourseIds.includes(courseId);
  };

  const getAssignedCareers = () => {
    return state.careerAssignments.filter((a) => a.career).map((a) => a.career!);
  };

  const getAssignedCourses = () => {
    const directCourses = state.courseAssignments.filter((a) => a.course).map((a) => a.course!);
    const careerCourses = state.coursesFromCareers;
    
    // Dedupe by course ID
    const courseMap = new Map<string, typeof directCourses[0] | CourseFromCareer>();
    [...directCourses, ...careerCourses].forEach((c) => {
      if (!courseMap.has(c.id)) {
        courseMap.set(c.id, c);
      }
    });
    
    return Array.from(courseMap.values());
  };

  return {
    ...state,
    hasCareerAccess,
    hasCourseAccess,
    getAssignedCareers,
    getAssignedCourses,
  };
};
