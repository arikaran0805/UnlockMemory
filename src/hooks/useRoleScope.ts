import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "super_moderator" | "senior_moderator" | "moderator" | "user" | null;

interface RoleScope {
  role: AppRole;
  careerIds: string[];
  teamIds: string[];
  courseIds: string[];
  courseNames: string[];
  loading: boolean;
}

export const useRoleScope = (): RoleScope => {
  const { userId } = useAuth();
  const [scope, setScope] = useState<RoleScope>({
    role: null,
    careerIds: [],
    teamIds: [],
    courseIds: [],
    courseNames: [],
    loading: true,
  });

  useEffect(() => {
    if (!userId) {
      setScope({ role: null, careerIds: [], teamIds: [], courseIds: [], courseNames: [], loading: false });
      return;
    }
    fetchScope();
  }, [userId]);

  const fetchScope = async () => {
    try {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const role = (roleData?.role as AppRole) || "user";

      if (role === "admin") {
        setScope({ role: "admin", careerIds: [], teamIds: [], courseIds: [], courseNames: [], loading: false });
        return;
      }

      if (role === "super_moderator") {
        const { data: careerData } = await supabase
          .from("career_assignments")
          .select("career_id, team_id")
          .eq("user_id", userId);

        const careerIds = [...new Set((careerData || []).map((r) => r.career_id))];
        const teamIds = [...new Set((careerData || []).map((r) => r.team_id).filter(Boolean) as string[])];

        const { data: careerCoursesData } = await supabase
          .from("career_courses")
          .select("course_id, courses(name)")
          .in("career_id", careerIds.length > 0 ? careerIds : ["__none__"]);

        const courseIds = [...new Set((careerCoursesData || []).map((r: any) => r.course_id))];
        const courseNames = (careerCoursesData || [])
          .map((r: any) => r.courses?.name)
          .filter(Boolean) as string[];

        setScope({ role, careerIds, teamIds, courseIds, courseNames, loading: false });
        return;
      }

      if (role === "senior_moderator" || role === "moderator") {
        const { data: courseData } = await supabase
          .from("course_assignments")
          .select("course_id, courses(name)")
          .eq("user_id", userId)
          .eq("role", role);

        const courseIds = [...new Set((courseData || []).map((r: any) => r.course_id))];
        const courseNames = (courseData || [])
          .map((r: any) => r.courses?.name)
          .filter(Boolean) as string[];

        setScope({ role, careerIds: [], teamIds: [], courseIds, courseNames, loading: false });
        return;
      }

      setScope({ role, careerIds: [], teamIds: [], courseIds: [], courseNames: [], loading: false });
    } catch {
      setScope({ role: null, careerIds: [], teamIds: [], courseIds: [], courseNames: [], loading: false });
    }
  };

  return scope;
};
