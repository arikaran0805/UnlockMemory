import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, GraduationCap, BookOpen, Users, CheckSquare, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

interface CareerAssignment {
  id: string;
  career_id: string;
  career: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
}

interface DashboardStats {
  assignedCareers: number;
  coursesInCareers: number;
  postsInCareers: number;
  pendingApprovals: number;
  teamMembers: number;
}

const SuperModeratorDashboard = () => {
  const { userId } = useUserRole();
  const [assignments, setAssignments] = useState<CareerAssignment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assignedCareers: 0,
    coursesInCareers: 0,
    postsInCareers: 0,
    pendingApprovals: 0,
    teamMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch career assignments for this super moderator
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("career_assignments")
        .select(`
          id,
          career_id,
          career:careers(id, name, slug, icon, color)
        `)
        .eq("user_id", userId);

      if (assignmentError) throw assignmentError;

      const careerIds = assignmentData?.map((a) => a.career_id) || [];
      setAssignments(assignmentData as unknown as CareerAssignment[] || []);

      if (careerIds.length > 0) {
        // Fetch courses under assigned careers
        const { data: careerCourses } = await supabase
          .from("career_courses")
          .select("course_id")
          .in("career_id", careerIds);

        const courseIds = careerCourses?.map((cc) => cc.course_id) || [];

        // Fetch posts under those courses
        let postCount = 0;
        if (courseIds.length > 0) {
          const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .in("category_id", courseIds);
          postCount = count || 0;
        }

        // Fetch pending approvals in scope
        let pendingCount = 0;
        if (courseIds.length > 0) {
          const { count } = await supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .in("category_id", courseIds)
            .eq("status", "pending");
          pendingCount = count || 0;
        }

        setStats({
          assignedCareers: careerIds.length,
          coursesInCareers: courseIds.length,
          postsInCareers: postCount,
          pendingApprovals: pendingCount,
          teamMembers: 0, // Can be expanded later
        });
      } else {
        setStats({
          assignedCareers: 0,
          coursesInCareers: 0,
          postsInCareers: 0,
          pendingApprovals: 0,
          teamMembers: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Career Manager</h1>
          <p className="text-muted-foreground">
            Oversee and manage assigned careers and their complete content structure
          </p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned Careers
            </CardTitle>
            <Briefcase className="h-4 w-4 text-[#8B5CF6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedCareers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Courses in Scope
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-[#8B5CF6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coursesInCareers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posts in Scope
            </CardTitle>
            <BookOpen className="h-4 w-4 text-[#8B5CF6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.postsInCareers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
            <CheckSquare className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Careers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-[#8B5CF6]" />
            Your Assigned Careers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No careers assigned yet. Contact an administrator to get careers assigned.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="border-l-4" style={{ borderLeftColor: assignment.career?.color || "#8B5CF6" }}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: assignment.career?.color || "#8B5CF6" }}
                      >
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{assignment.career?.name}</h3>
                        <p className="text-sm text-muted-foreground">/{assignment.career?.slug}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#8B5CF6]" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="/super-moderator/approvals"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <CheckSquare className="h-5 w-5 text-[#8B5CF6]" />
              <div>
                <p className="font-medium">Review Approvals</p>
                <p className="text-sm text-muted-foreground">
                  {stats.pendingApprovals} pending
                </p>
              </div>
            </a>
            <a
              href="/super-moderator/courses"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <GraduationCap className="h-5 w-5 text-[#8B5CF6]" />
              <div>
                <p className="font-medium">Manage Courses</p>
                <p className="text-sm text-muted-foreground">
                  {stats.coursesInCareers} courses
                </p>
              </div>
            </a>
            <a
              href="/super-moderator/assignments"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <Users className="h-5 w-5 text-[#8B5CF6]" />
              <div>
                <p className="font-medium">Team Assignments</p>
                <p className="text-sm text-muted-foreground">Manage team</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default SuperModeratorDashboard;
