/**
 * Assignment Logs (Read-Only Audit Log)
 * 
 * Shows historical assignment data for auditing purposes.
 * No editing or creation allowed - all assignment management
 * happens through the Team Ownership page.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Briefcase,
  GraduationCap,
  Search,
  User,
  Users,
  Shield,
  Crown,
  UserCog,
  Info,
  History,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";

type AppRole = "admin" | "moderator" | "user" | "senior_moderator" | "super_moderator";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
}

interface CareerAssignment {
  id: string;
  user_id: string;
  career_id: string;
  team_id: string | null;
  assigned_by: string | null;
  assigned_at: string;
  user?: UserWithRole;
  career?: { id: string; name: string; slug: string; icon: string; color: string };
  team?: { id: string; name: string } | null;
  assignedByUser?: UserWithRole | null;
}

interface CourseAssignment {
  id: string;
  user_id: string;
  course_id: string;
  team_id: string | null;
  role: AppRole;
  is_default_manager: boolean;
  assigned_by: string | null;
  assigned_at: string;
  user?: UserWithRole;
  course?: { id: string; name: string; slug: string; icon: string | null };
  team?: { id: string; name: string } | null;
  assignedByUser?: UserWithRole | null;
}

const AdminAssignmentLogs = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("careers");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const [careerAssignments, setCareerAssignments] = useState<CareerAssignment[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch careers
      const { data: careersData } = await supabase
        .from("careers")
        .select("id, name, slug, icon, color");

      // Fetch courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, name, slug, icon")
        .is("deleted_at", null);

      // Fetch teams
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name");

      // Fetch users with roles
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = new Map<string, AppRole>();
      rolesData?.forEach((r) => rolesMap.set(r.user_id, r.role as AppRole));

      const usersWithRoles: UserWithRole[] = (usersData || []).map((u) => ({
        ...u,
        role: rolesMap.get(u.id) || null,
      }));

      const userMap = new Map(usersWithRoles.map((u) => [u.id, u]));
      const careerMap = new Map(careersData?.map((c) => [c.id, c]));
      const courseMap = new Map(coursesData?.map((c) => [c.id, c]));
      const teamMap = new Map(teamsData?.map((t) => [t.id, t]));

      // Fetch career assignments
      const { data: careerAssignData } = await supabase
        .from("career_assignments")
        .select("*")
        .order("assigned_at", { ascending: false });

      const enrichedCareerAssignments: CareerAssignment[] = (careerAssignData || []).map((a) => ({
        ...a,
        user: userMap.get(a.user_id),
        career: careerMap.get(a.career_id),
        team: a.team_id ? teamMap.get(a.team_id) : null,
        assignedByUser: a.assigned_by ? userMap.get(a.assigned_by) : null,
      }));

      // Fetch course assignments
      const { data: courseAssignData } = await supabase
        .from("course_assignments")
        .select("*")
        .order("assigned_at", { ascending: false });

      const enrichedCourseAssignments: CourseAssignment[] = (courseAssignData || []).map((a) => ({
        ...a,
        user: userMap.get(a.user_id),
        course: courseMap.get(a.course_id),
        team: a.team_id ? teamMap.get(a.team_id) : null,
        assignedByUser: a.assigned_by ? userMap.get(a.assigned_by) : null,
      }));

      setCareerAssignments(enrichedCareerAssignments);
      setCourseAssignments(enrichedCourseAssignments);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredCareerAssignments = useMemo(() => {
    if (!searchQuery) return careerAssignments;
    const query = searchQuery.toLowerCase();
    return careerAssignments.filter(
      (a) =>
        a.user?.full_name?.toLowerCase().includes(query) ||
        a.user?.email.toLowerCase().includes(query) ||
        a.career?.name.toLowerCase().includes(query) ||
        a.team?.name.toLowerCase().includes(query)
    );
  }, [careerAssignments, searchQuery]);

  const filteredCourseAssignments = useMemo(() => {
    if (!searchQuery) return courseAssignments;
    const query = searchQuery.toLowerCase();
    return courseAssignments.filter(
      (a) =>
        a.user?.full_name?.toLowerCase().includes(query) ||
        a.user?.email.toLowerCase().includes(query) ||
        a.course?.name.toLowerCase().includes(query) ||
        a.team?.name.toLowerCase().includes(query)
    );
  }, [courseAssignments, searchQuery]);

  const getRoleBadge = (role: AppRole | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-[#8B1E1E]/10 text-[#8B1E1E] border-[#8B1E1E]/20">Platform Manager</Badge>;
      case "super_moderator":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Career Manager</Badge>;
      case "senior_moderator":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Course Manager</Badge>;
      case "moderator":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Content Moderator</Badge>;
      default:
        return <Badge variant="outline">Learner</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment Logs</h1>
          <p className="text-muted-foreground">
            Read-only view of all career and course assignments for auditing purposes
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/team-ownership">
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage in Team Ownership
          </Link>
        </Button>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">
        {/* Info Alert */}
        <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This is a read-only audit log. To create, edit, or remove assignments, use the{" "}
          <Link to="/admin/team-ownership" className="font-medium text-primary hover:underline">
            Team Ownership
          </Link>{" "}
          page.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Career Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{careerAssignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Course Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseAssignments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Career Managers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(careerAssignments.map((a) => a.user_id)).size}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Course Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(courseAssignments.map((a) => a.user_id)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="careers" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Career Assignments
              <Badge variant="secondary" className="ml-1">{careerAssignments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Course Assignments
              <Badge variant="secondary" className="ml-1">{courseAssignments.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>

        {/* Career Assignments Tab */}
        <TabsContent value="careers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                Career Manager → Career Assignments
              </CardTitle>
              <CardDescription>
                Historical log of all career manager assignments to careers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCareerAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No career assignments found</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Career</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Assigned By</TableHead>
                        <TableHead>Assigned At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCareerAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{assignment.user?.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{assignment.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(assignment.user?.role || null)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                                style={{ backgroundColor: assignment.career?.color || "hsl(var(--primary))" }}
                              >
                                {assignment.career?.icon || assignment.career?.name?.[0]}
                              </div>
                              <span className="font-medium">{assignment.career?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.team ? (
                              <Badge variant="outline">{assignment.team.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {assignment.assignedByUser?.full_name || assignment.assignedByUser?.email || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(assignment.assigned_at), "MMM d, yyyy 'at' h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Assignments Tab */}
        <TabsContent value="courses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-accent" />
                Course Assignments
              </CardTitle>
              <CardDescription>
                Historical log of all course manager and content moderator assignments to courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCourseAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No course assignments found</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Assignment Role</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Team</TableHead>
                        <TableHead>Default Manager</TableHead>
                        <TableHead>Assigned By</TableHead>
                        <TableHead>Assigned At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCourseAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{assignment.user?.full_name || "Unknown"}</p>
                                <p className="text-xs text-muted-foreground">{assignment.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.role === "senior_moderator" ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Course Manager</Badge>
                            ) : (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Content Moderator</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{assignment.course?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.team ? (
                              <Badge variant="outline">{assignment.team.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {assignment.is_default_manager ? (
                              <Badge className="bg-amber-500/10 text-amber-600">
                                <Shield className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {assignment.assignedByUser?.full_name || assignment.assignedByUser?.email || "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(assignment.assigned_at), "MMM d, yyyy 'at' h:mm a")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default AdminAssignmentLogs;
