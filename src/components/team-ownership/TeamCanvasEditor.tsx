/**
 * Team Canvas Editor - Full team management experience
 *
 * Features:
 * - Editable team name
 * - Career display
 * - Career Manager assignments via inline UserPickerPopover
 * - Course assignments (Course Manager + Content Moderator) via inline UserPickerPopover
 * - All assignments save immediately
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Archive,
  Shield,
  GraduationCap,
  UserCog,
  Users,
  Star,
  X,
  Briefcase,
  Clock,
  Download,
  ChevronDown,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { Team, UserProfile, CourseWithAssignments, SuperModeratorAssignment } from "./types";
import UserPickerPopover from "@/components/admin/teams/UserPickerPopover";

interface UserWithRole extends UserProfile {
  role?: "admin" | "super_moderator" | "senior_moderator" | "moderator" | "user" | null;
}

interface TeamCanvasEditorProps {
  team: Team;
  onClose: () => void;
  onRefresh: () => void;
  viewerRole?: "admin" | "super_moderator";
}

const TeamCanvasEditor = ({ team, onClose, onRefresh, viewerRole = "admin" }: TeamCanvasEditorProps) => {
  const isSuperModViewer = viewerRole === "super_moderator";
  const { userId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [editedName, setEditedName] = useState(team.name);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Data states
  const [superModerators, setSuperModerators] = useState<SuperModeratorAssignment[]>([]);
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);

  // Activity log sheet
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityLog, setActivityLog] = useState<{
    id: string;
    action: string;
    user_name: string;
    role: string;
    course_name?: string;
    created_at: string;
  }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Computed set for Career Manager dedup
  const assignedSuperModeratorIds = useMemo(
    () => new Set(superModerators.map((sm) => sm.user_id)),
    [superModerators],
  );

  // Derive team status
  const teamStatus = (team as any).archived_at ? "Archived" : "Active";

  const fetchCanvasData = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      // Fetch all users with their roles
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url");

      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const rolesMap = new Map<string, string>();
      rolesData?.forEach((r) => rolesMap.set(r.user_id, r.role));

      const usersWithRoles: UserWithRole[] = (usersData || []).map((u) => ({
        ...u,
        role: (rolesMap.get(u.id) as UserWithRole["role"]) ?? null,
      }));
      setAllUsers(usersWithRoles);

      // Fetch super moderators assigned to this team
      const { data: superModsData, error: superModsError } = await supabase
        .from("career_assignments")
        .select("*")
        .eq("team_id", team.id);

      if (superModsError) throw superModsError;

      const superModeratorsList: SuperModeratorAssignment[] = (superModsData || []).map((sm) => ({
        ...sm,
        user: usersData?.find((u) => u.id === sm.user_id),
      }));
      setSuperModerators(superModeratorsList);

      // Fetch courses within this career
      const { data: careerCoursesData, error: careerCoursesError } = await supabase
        .from("career_courses")
        .select(`
          career_id,
          course:courses(id, name, slug, icon, status)
        `)
        .eq("career_id", team.career_id)
        .is("deleted_at", null);

      if (careerCoursesError) throw careerCoursesError;

      // Fetch course assignments for this team (for display)
      const { data: courseAssignmentsData, error: courseAssignmentsError } = await supabase
        .from("course_assignments")
        .select("*")
        .eq("team_id", team.id);

      if (courseAssignmentsError) throw courseAssignmentsError;

      // Build courses with assignments — show ALL courses from career
      const coursesList: CourseWithAssignments[] = (careerCoursesData || [])
        .filter((cc: any) => cc.course)
        .map((cc: any) => {
          const courseId = cc.course.id;
          const assignments = courseAssignmentsData?.filter((ca) => ca.course_id === courseId) || [];

          return {
            ...cc.course,
            career_id: cc.career_id,
            seniorModerators: assignments
              .filter((a) => a.role === "senior_moderator")
              .map((a) => ({
                ...a,
                user: usersData?.find((u) => u.id === a.user_id),
              })),
            moderators: assignments
              .filter((a) => a.role === "moderator")
              .map((a) => ({
                ...a,
                user: usersData?.find((u) => u.id === a.user_id),
              })),
          };
        });

      setCourses(coursesList);
    } catch (error: any) {
      console.error("Error fetching canvas data:", error);
      toast({
        title: "Error loading team data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanvasData();
  }, [team.id]);

  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed) return;

    if (trimmed === team.name) {
      return;
    }

    try {
      const { error } = await supabase
        .from("teams")
        .update({ name: trimmed })
        .eq("id", team.id);

      if (error) throw error;
      toast({ title: "Team name updated" });
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error updating team", description: error.message, variant: "destructive" });
    }
  };

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from("teams")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", team.id);

      if (error) throw error;
      toast({ title: "Team archived", description: "This team has been moved to the archived view." });
      onClose();
    } catch (error: any) {
      toast({ title: "Error archiving team", description: error.message, variant: "destructive" });
    }
  };

  const handleUnarchive = async () => {
    try {
      const { error } = await supabase
        .from("teams")
        .update({ archived_at: null })
        .eq("id", team.id);

      if (error) throw error;
      toast({ title: "Team restored", description: "This team is now active again." });
      onClose();
    } catch (error: any) {
      toast({ title: "Error restoring team", description: error.message, variant: "destructive" });
    }
  };

  // Handle user assignment from popover
  const handleSelectUserFromPool = async (
    selectedUserId: string,
    targetType: "super_moderator" | "senior_moderator" | "moderator",
    courseId?: string,
  ) => {
    try {
      if (targetType === "super_moderator") {
        if (assignedSuperModeratorIds.has(selectedUserId)) {
          toast({
            title: "Already assigned",
            description: "This user is already a career manager for this team.",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase
          .from("career_assignments")
          .insert({
            user_id: selectedUserId,
            career_id: team.career_id,
            team_id: team.id,
            assigned_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        const user = allUsers.find((u) => u.id === selectedUserId);
        setSuperModerators((prev) => [...prev, { ...data, user }]);
        toast({ title: "Career Manager added" });
      } else if (courseId) {
        const course = courses.find((c) => c.id === courseId);

        if (targetType === "senior_moderator" && course?.seniorModerators.some((sm) => sm.user_id === selectedUserId)) {
          toast({ title: "Already assigned", description: "This user is already a course manager for this course.", variant: "destructive" });
          return;
        }
        if (targetType === "moderator" && course?.moderators.some((m) => m.user_id === selectedUserId)) {
          toast({ title: "Already assigned", description: "This user is already a content moderator for this course.", variant: "destructive" });
          return;
        }

        const isFirstSenior = targetType === "senior_moderator" && course?.seniorModerators.length === 0;

        const { data, error } = await supabase
          .from("course_assignments")
          .insert({
            user_id: selectedUserId,
            course_id: courseId,
            team_id: team.id,
            role: targetType,
            is_default_manager: isFirstSenior,
            assigned_by: userId,
          })
          .select()
          .single();

        if (error) throw error;

        const user = allUsers.find((u) => u.id === selectedUserId);
        const newAssignment = { ...data, user };

        setCourses((prev) =>
          prev.map((c) => {
            if (c.id !== courseId) return c;
            if (targetType === "senior_moderator") {
              return { ...c, seniorModerators: [...c.seniorModerators, newAssignment] };
            } else {
              return { ...c, moderators: [...c.moderators, newAssignment] };
            }
          }),
        );

        toast({ title: `${targetType === "senior_moderator" ? "Course Manager" : "Content Moderator"} added` });
      }
    } catch (error: any) {
      toast({ title: "Error adding assignment", description: error.message, variant: "destructive" });
    }
  };

  // Remove handlers
  const handleRemoveSuperModerator = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from("career_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;
      setSuperModerators((prev) => prev.filter((sm) => sm.id !== assignmentId));
      toast({ title: "Career Manager removed" });
    } catch (error: any) {
      toast({ title: "Error removing career manager", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveModerator = async (
    assignmentId: string,
    courseId: string,
    _removedUserId: string,
    role: string,
  ) => {
    try {
      const { error } = await supabase
        .from("course_assignments")
        .delete()
        .eq("id", assignmentId);

      if (error) throw error;

      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          if (role === "senior_moderator") {
            return { ...c, seniorModerators: c.seniorModerators.filter((sm) => sm.id !== assignmentId) };
          } else {
            return { ...c, moderators: c.moderators.filter((m) => m.id !== assignmentId) };
          }
        }),
      );

      toast({ title: "Assignment removed" });
    } catch (error: any) {
      toast({ title: "Error removing assignment", description: error.message, variant: "destructive" });
    }
  };

  const handleSetDefaultManager = async (courseId: string, assignmentId: string) => {
    try {
      const { error: unsetError } = await supabase
        .from("course_assignments")
        .update({ is_default_manager: false })
        .eq("course_id", courseId)
        .eq("team_id", team.id)
        .eq("role", "senior_moderator");

      if (unsetError) throw unsetError;

      const { error: setError } = await supabase
        .from("course_assignments")
        .update({ is_default_manager: true })
        .eq("id", assignmentId);

      if (setError) throw setError;

      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            seniorModerators: c.seniorModerators.map((sm) => ({
              ...sm,
              is_default_manager: sm.id === assignmentId,
            })),
          };
        }),
      );

      toast({ title: "Default manager updated" });
    } catch (error: any) {
      toast({ title: "Error updating default manager", description: error.message, variant: "destructive" });
    }
  };

  const fetchActivityLog = async () => {
    setActivityLoading(true);
    try {
      const { data: careerAssigns } = await supabase
        .from("career_assignments")
        .select("id, user_id, assigned_at")
        .eq("team_id", team.id)
        .order("assigned_at", { ascending: false })
        .limit(50);

      const { data: courseAssigns } = await supabase
        .from("course_assignments")
        .select("id, user_id, role, course_id, assigned_at")
        .eq("team_id", team.id)
        .order("assigned_at", { ascending: false })
        .limit(50);

      const entries = [
        ...(careerAssigns || []).map((a) => {
          const user = allUsers.find((u) => u.id === a.user_id);
          return {
            id: a.id,
            action: "assigned",
            user_name: user?.full_name || user?.email || a.user_id,
            role: "Career Manager",
            course_name: undefined as string | undefined,
            created_at: a.assigned_at,
          };
        }),
        ...(courseAssigns || []).map((a) => {
          const user = allUsers.find((u) => u.id === a.user_id);
          const course = courses.find((c) => c.id === a.course_id);
          return {
            id: a.id,
            action: "assigned",
            user_name: user?.full_name || user?.email || a.user_id,
            role: a.role === "senior_moderator" ? "Course Manager" : "Content Moderator",
            course_name: course?.name,
            created_at: a.assigned_at,
          };
        }),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivityLog(entries);
    } catch (error: any) {
      toast({ title: "Error loading activity", description: error.message, variant: "destructive" });
    } finally {
      setActivityLoading(false);
    }
  };

  const handleExport = (format: "csv" | "json") => {
    const rows = [
      ...superModerators.map((sm) => ({
        role: "Career Manager",
        name: sm.user?.full_name || sm.user?.email || "",
        email: sm.user?.email || "",
        course: "",
      })),
      ...courses.flatMap((c) => [
        ...c.seniorModerators.map((sm) => ({
          role: "Course Manager",
          name: sm.user?.full_name || sm.user?.email || "",
          email: sm.user?.email || "",
          course: c.name,
        })),
        ...c.moderators.map((m) => ({
          role: "Content Moderator",
          name: m.user?.full_name || m.user?.email || "",
          email: m.user?.email || "",
          course: c.name,
        })),
      ]),
    ];

    const filename = team.name.replace(/\s+/g, "_");

    if (format === "json") {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_team.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["Role", "Name", "Email", "Course"];
      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          [r.role, r.name, r.email, r.course].map((v) => `"${v}"`).join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}_team.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast({ title: `Exported as ${format.toUpperCase()}` });
  };

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 space-y-6 p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex flex-col items-center gap-6 py-12">
            <Skeleton className="h-20 w-64 rounded-xl" />
            <Skeleton className="h-32 w-96 rounded-xl" />
            <Skeleton className="h-48 w-full max-w-4xl rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)]">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-3 px-4 h-14 border-b bg-card flex-shrink-0 relative z-10">
            {/* Left: team name + career badge + status */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Input
                value={editedName}
                onChange={(e) => !isSuperModViewer && setEditedName(e.target.value)}
                onBlur={() => !isSuperModViewer && handleSaveName()}
                onKeyDown={(e) => !isSuperModViewer && e.key === "Enter" && handleSaveName()}
                readOnly={isSuperModViewer}
                className={`h-8 text-sm font-semibold w-52 border-transparent transition-colors ${isSuperModViewer ? "cursor-default" : "hover:border-input focus:border-input"}`}
                placeholder="Team name"
              />
              <Badge
                variant="outline"
                className="shrink-0"
                style={{
                  borderColor: team.career?.color,
                  color: team.career?.color,
                  backgroundColor: `${team.career?.color}10`,
                }}
              >
                <Briefcase className="h-3 w-3 mr-1" />
                {team.career?.name}
              </Badge>
              <span
                className={[
                  "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                  teamStatus === "Active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
                ].join(" ")}
              >
                {teamStatus === "Active" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
                {teamStatus}
              </span>
            </div>

            <Separator orientation="vertical" className="h-6" />



            {/* Activity Log */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowActivityLog(true);
                    fetchActivityLog();
                  }}
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Activity log</TooltipContent>
            </Tooltip>

            {/* Export */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Export team</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("csv")}>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")}>Export as JSON</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Archive / Unarchive — admin only */}
            {!isSuperModViewer && (
              <Tooltip>
                <TooltipTrigger asChild>
                  {teamStatus === "Active" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setShowArchiveDialog(true); }}
                    >
                      <Archive className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-700 border-emerald-600/20 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:hover:bg-emerald-500/20"
                      onClick={(e) => { e.stopPropagation(); handleUnarchive(); }}
                    >
                      Restore Team
                    </Button>
                  )}
                </TooltipTrigger>
                <TooltipContent>{teamStatus === "Active" ? "Archive team" : "Restore this team"}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>

        {/* Canvas Content */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center py-8 px-6 space-y-6">
            {/* Career Node */}
            <div
              className="px-8 py-4 rounded-xl border-2 shadow-sm"
              style={{
                backgroundColor: `${team.career?.color}10`,
                borderColor: team.career?.color,
              }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wide text-center mb-1"
                style={{ color: team.career?.color }}
              >
                CAREER
              </p>
              <h2 className="text-xl font-bold text-foreground text-center">
                {team.career?.name}
              </h2>
            </div>

            {/* Connector Line */}
            <div className="w-0.5 h-6 bg-border" />

            {/* Career Managers Section */}
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-purple-500" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  CAREER MANAGERS
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {superModerators.length}
                </Badge>
              </div>

              <div className="flex flex-wrap justify-center gap-3 p-3 rounded-xl min-w-[200px]">
                {superModerators.map((sm) => (
                  <div
                    key={sm.id}
                    className="group relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-purple-500/30 bg-purple-500/5"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-purple-500/20">
                      <AvatarImage src={sm.user?.avatar_url || undefined} />
                      <AvatarFallback className="bg-purple-500/10 text-purple-600 font-semibold">
                        {sm.user?.full_name?.[0] || sm.user?.email?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {sm.user?.full_name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">{sm.user?.email}</p>
                    </div>
                    {!isSuperModViewer && (
                      <button
                        onClick={() => handleRemoveSuperModerator(sm.id)}
                        className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}

                {isSuperModViewer ? (
                  <p className="text-xs text-muted-foreground italic">Managed by admin only</p>
                ) : (
                  <UserPickerPopover
                    users={allUsers}
                    assignedIds={assignedSuperModeratorIds}
                    onSelect={(uid) => handleSelectUserFromPool(uid, "super_moderator")}
                    mode="career_manager"
                    careerId={team.career_id}
                    size="md"
                  />
                )}
              </div>
            </div>

            {/* Connector Line */}
            <div className="w-0.5 h-6 bg-border" />

            {/* Courses Section */}
            <div className="w-full max-w-5xl">
              <div className="flex items-center justify-center gap-2 mb-6">
                <GraduationCap className="h-5 w-5 text-accent" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  COURSES
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {courses.length}
                </Badge>
              </div>

              {courses.length === 0 ? (
                <div className="flex justify-center">
                  <div className="px-16 py-12 rounded-xl border-2 border-dashed border-muted-foreground/30 text-center">
                    <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No courses in this career yet</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {courses.map((course) => (
                    <div key={course.id} className="rounded-xl border bg-card p-5 space-y-4">
                      {/* Course Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{course.name}</h4>
                          <p className="text-xs text-muted-foreground">{course.slug}</p>
                        </div>
                      </div>

                      {/* Course Managers (Senior Moderators) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCog className="h-4 w-4 text-amber-500" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Course Managers
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {course.seniorModerators.length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[40px]">
                          {course.seniorModerators.map((sm) => (
                            <div
                              key={sm.id}
                              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={sm.user?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-amber-500/10 text-amber-600">
                                  {sm.user?.full_name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {sm.user?.full_name || sm.user?.email}
                              </span>
                              {sm.is_default_manager && (
                                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                                  <Star className="h-3 w-3 mr-0.5 text-amber-500" />
                                  Default
                                </Badge>
                              )}
                              <div className="absolute -top-2 -right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!sm.is_default_manager && (
                                  <button
                                    onClick={() => handleSetDefaultManager(course.id, sm.id)}
                                    className="p-1 rounded-full bg-amber-500 text-white"
                                    title="Set as default manager"
                                  >
                                    <Star className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveModerator(sm.id, course.id, sm.user_id, "senior_moderator")}
                                  className="p-1 rounded-full bg-destructive text-destructive-foreground"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                          <UserPickerPopover
                            users={allUsers}
                            assignedIds={new Set(course.seniorModerators.map((sm) => sm.user_id))}
                            onSelect={(uid) => handleSelectUserFromPool(uid, "senior_moderator", course.id)}
                            mode="course_manager"
                            courseId={course.id}
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* Connector */}
                      <div className="flex justify-center">
                        <div className="w-0.5 h-3 bg-border" />
                      </div>

                      {/* Content Moderators */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Content Moderators
                            </span>
                          </div>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {course.moderators.length}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 rounded-lg min-h-[40px]">
                          {course.moderators.map((mod) => (
                            <div
                              key={mod.id}
                              className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/20"
                            >
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={mod.user?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-blue-500/10 text-blue-600">
                                  {mod.user?.full_name?.[0] || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">
                                {mod.user?.full_name || mod.user?.email}
                              </span>
                              <button
                                onClick={() => handleRemoveModerator(mod.id, course.id, mod.user_id, "moderator")}
                                className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <UserPickerPopover
                            users={allUsers}
                            assignedIds={new Set(course.moderators.map((m) => m.user_id))}
                            onSelect={(uid) => handleSelectUserFromPool(uid, "moderator", course.id)}
                            mode="content_moderator"
                            courseId={course.id}
                            size="sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Activity Log Sheet */}
      <Sheet open={showActivityLog} onOpenChange={setShowActivityLog}>
        <SheetContent className="w-80 sm:w-96">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Activity Log
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="mt-4 h-[calc(100vh-8rem)]">
            {activityLoading ? (
              <div className="space-y-3 p-1">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : activityLog.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No assignment history yet
              </div>
            ) : (
              <div className="space-y-1 p-1">
                {activityLog.map((entry) => (
                  <div key={entry.id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/50">
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.role}{entry.course_name ? ` — ${entry.course_name}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {new Date(entry.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Team?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-muted-foreground">
                <p>
                  Archiving <strong>"{team.name}"</strong> will:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Hide the team from the active teams list</li>
                  <li>Keep all assignments intact (not deleted)</li>
                  <li>Allow the team to be restored later if needed</li>
                </ul>
                {(superModerators.length > 0 ||
                  courses.some(
                    (c) => c.seniorModerators.length > 0 || c.moderators.length > 0,
                  )) && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                    ⚠️ This team has {superModerators.length} career manager(s) and{" "}
                    {courses.reduce(
                      (acc, c) => acc + c.seniorModerators.length + c.moderators.length,
                      0,
                    )}{" "}
                    course assignment(s)
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Archive Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TeamCanvasEditor;
