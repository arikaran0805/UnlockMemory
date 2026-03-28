import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  GraduationCap,
  Search,
  Plus,
  Trash2,
  User,
  Users,
  Shield,
  Crown,
  UserCog,
} from "lucide-react";
import { format } from "date-fns";

type AppRole = "admin" | "moderator" | "user" | "senior_moderator" | "super_moderator";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
}

interface Career {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
}

interface Course {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface CareerAssignment {
  id: string;
  user_id: string;
  career_id: string;
  assigned_by: string | null;
  assigned_at: string;
  user?: UserWithRole;
  career?: Career;
}

interface CourseAssignment {
  id: string;
  user_id: string;
  course_id: string;
  role: AppRole;
  assigned_by: string | null;
  assigned_at: string;
  user?: UserWithRole;
  course?: Course;
}

const AdminAssignments = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("careers");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  // Data
  const [careers, setCareers] = useState<Career[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [careerAssignments, setCareerAssignments] = useState<CareerAssignment[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<CourseAssignment[]>([]);

  // Dialog state
  const [careerDialogOpen, setCareerDialogOpen] = useState(false);
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedCourseRole, setSelectedCourseRole] = useState<AppRole>("senior_moderator");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [careersRes, coursesRes, usersRes, careerAssignRes, courseAssignRes] = await Promise.all([
        supabase.from("careers").select("id, name, slug, icon, color").order("name"),
        supabase.from("courses").select("id, name, slug, icon").is("deleted_at", null).order("name"),
        supabase.from("profiles").select("id, email, full_name"),
        supabase.from("career_assignments").select("*"),
        supabase.from("course_assignments").select("*"),
      ]);

      if (careersRes.error) throw careersRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (usersRes.error) throw usersRes.error;
      if (careerAssignRes.error) throw careerAssignRes.error;
      if (courseAssignRes.error) throw courseAssignRes.error;

      // Fetch user roles
      const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");
      const rolesMap = new Map<string, AppRole>();
      rolesData?.forEach((r) => rolesMap.set(r.user_id, r.role as AppRole));

      const usersWithRoles: UserWithRole[] = (usersRes.data || []).map((u) => ({
        ...u,
        role: rolesMap.get(u.id) || null,
      }));

      setCareers(careersRes.data || []);
      setCourses(coursesRes.data || []);
      setUsers(usersWithRoles);

      // Enrich assignments with user and entity data
      const careerMap = new Map(careersRes.data?.map((c) => [c.id, c]));
      const courseMap = new Map(coursesRes.data?.map((c) => [c.id, c]));
      const userMap = new Map(usersWithRoles.map((u) => [u.id, u]));

      const enrichedCareerAssignments: CareerAssignment[] = (careerAssignRes.data || []).map((a) => ({
        ...a,
        user: userMap.get(a.user_id),
        career: careerMap.get(a.career_id),
      }));

      const enrichedCourseAssignments: CourseAssignment[] = (courseAssignRes.data || []).map((a) => ({
        ...a,
        user: userMap.get(a.user_id),
        course: courseMap.get(a.course_id),
      }));

      setCareerAssignments(enrichedCareerAssignments);
      setCourseAssignments(enrichedCourseAssignments);
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter users by role for assignment dialogs
  const superModerators = useMemo(
    () => users.filter((u) => u.role === "super_moderator"),
    [users]
  );

  const seniorModeratorsAndModerators = useMemo(
    () => users.filter((u) => u.role === "senior_moderator" || u.role === "moderator"),
    [users]
  );

  // Filtered assignments based on search
  const filteredCareerAssignments = useMemo(() => {
    if (!searchQuery) return careerAssignments;
    const query = searchQuery.toLowerCase();
    return careerAssignments.filter(
      (a) =>
        a.user?.full_name?.toLowerCase().includes(query) ||
        a.user?.email.toLowerCase().includes(query) ||
        a.career?.name.toLowerCase().includes(query)
    );
  }, [careerAssignments, searchQuery]);

  const filteredCourseAssignments = useMemo(() => {
    if (!searchQuery) return courseAssignments;
    const query = searchQuery.toLowerCase();
    return courseAssignments.filter(
      (a) =>
        a.user?.full_name?.toLowerCase().includes(query) ||
        a.user?.email.toLowerCase().includes(query) ||
        a.course?.name.toLowerCase().includes(query)
    );
  }, [courseAssignments, searchQuery]);

  // Handlers
  const handleAssignCareer = async () => {
    if (!selectedCareer || !selectedUser) {
      toast({ title: "Please select both a career and a user", variant: "destructive" });
      return;
    }

    // Check if already assigned
    const exists = careerAssignments.some(
      (a) => a.career_id === selectedCareer && a.user_id === selectedUser
    );
    if (exists) {
      toast({ title: "This user is already assigned to this career", variant: "destructive" });
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from("career_assignments").insert({
        career_id: selectedCareer,
        user_id: selectedUser,
        assigned_by: session.session?.user.id,
      });

      if (error) throw error;

      toast({ title: "Career assigned successfully" });
      setCareerDialogOpen(false);
      setSelectedCareer("");
      setSelectedUser("");
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error assigning career", description: error.message, variant: "destructive" });
    }
  };

  const handleAssignCourse = async () => {
    if (!selectedCourse || !selectedUser || !selectedCourseRole) {
      toast({ title: "Please select a course, user, and role", variant: "destructive" });
      return;
    }

    // Check if already assigned
    const exists = courseAssignments.some(
      (a) => a.course_id === selectedCourse && a.user_id === selectedUser
    );
    if (exists) {
      toast({ title: "This user is already assigned to this course", variant: "destructive" });
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from("course_assignments").insert({
        course_id: selectedCourse,
        user_id: selectedUser,
        role: selectedCourseRole,
        assigned_by: session.session?.user.id,
      });

      if (error) throw error;

      toast({ title: "Course assigned successfully" });
      setCourseDialogOpen(false);
      setSelectedCourse("");
      setSelectedUser("");
      setSelectedCourseRole("senior_moderator");
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error assigning course", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveCareerAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from("career_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
      toast({ title: "Assignment removed" });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error removing assignment", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveCourseAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase.from("course_assignments").delete().eq("id", assignmentId);
      if (error) throw error;
      toast({ title: "Assignment removed" });
      fetchAllData();
    } catch (error: any) {
      toast({ title: "Error removing assignment", description: error.message, variant: "destructive" });
    }
  };

  const getRoleBadge = (role: AppRole | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-[#8B1E1E] text-white">Platform Manager</Badge>;
      case "super_moderator":
        return <Badge className="bg-purple-600 text-white">Career Manager</Badge>;
      case "senior_moderator":
        return <Badge className="border-[#D4AF37] text-[#D4AF37]" variant="outline">Course Manager</Badge>;
      case "moderator":
        return <Badge variant="secondary">Content Moderator</Badge>;
      default:
        return <Badge variant="outline">Learner</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assignment Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage career and course assignments for Career Managers, Course Managers, and Content Moderators
          </p>
        </div>
      </div>

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
            <div className="text-2xl font-bold">{superModerators.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              Course/Content Moderators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seniorModeratorsAndModerators.length}</div>
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
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Course Assignments
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assignments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            {activeTab === "careers" ? (
              <Button onClick={() => setCareerDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Assign Career
              </Button>
            ) : (
              <Button onClick={() => setCourseDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Assign Course
              </Button>
            )}
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
                Assign Career Managers to careers. They will have full access to all courses within their assigned careers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCareerAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No career assignments found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setCareerDialogOpen(true)}>
                    Create First Assignment
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Career</TableHead>
                        <TableHead>Assigned At</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
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
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{assignment.career?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(assignment.assigned_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCareerAssignment(assignment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                <Shield className="h-5 w-5 text-[#D4AF37]" />
                Course Manager / Content Moderator → Course Assignments
              </CardTitle>
              <CardDescription>
                Assign Course Managers and Content Moderators to specific courses. They will only have access to their assigned courses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCourseAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No course assignments found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setCourseDialogOpen(true)}>
                    Create First Assignment
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Assigned Role</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Assigned At</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
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
                          <TableCell>{getRoleBadge(assignment.role)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{assignment.course?.name || "Unknown"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(assignment.assigned_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCourseAssignment(assignment.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Career Assignment Dialog */}
      <Dialog open={careerDialogOpen} onOpenChange={setCareerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              Assign Career to Career Manager
            </DialogTitle>
            <DialogDescription>
              Select a Career Manager and a career to assign. The user will have full access to all courses within this career.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Career Manager</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Career Manager" />
                </SelectTrigger>
                <SelectContent>
                  {superModerators.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No Career Managers found. Assign the role first.
                    </div>
                  ) : (
                    superModerators.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{user.full_name || user.email.split("@")[0]}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Career</label>
              <Select value={selectedCareer} onValueChange={setSelectedCareer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a career" />
                </SelectTrigger>
                <SelectContent>
                  {careers.map((career) => (
                    <SelectItem key={career.id} value={career.id}>
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        <span>{career.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCareerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignCareer} disabled={!selectedUser || !selectedCareer}>
              Assign Career
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Assignment Dialog */}
      <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#D4AF37]" />
              Assign Course to User
            </DialogTitle>
            <DialogDescription>
              Select a Course Manager or Content Moderator, a course, and the assignment role.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {seniorModeratorsAndModerators.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No Course Managers or Content Moderators found.
                    </div>
                  ) : (
                    seniorModeratorsAndModerators.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{user.full_name || user.email.split("@")[0]}</span>
                          <span className="text-xs text-muted-foreground">({user.role})</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Course</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>{course.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Assignment Role</label>
              <Select value={selectedCourseRole} onValueChange={(v) => setSelectedCourseRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="senior_moderator">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#D4AF37]" />
                      <span>Course Manager</span>
                      <span className="text-xs text-muted-foreground">(Can approve content)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <UserCog className="h-4 w-4" />
                      <span>Content Moderator</span>
                      <span className="text-xs text-muted-foreground">(Can create content)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignCourse} disabled={!selectedUser || !selectedCourse || !selectedCourseRole}>
              Assign Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAssignments;
