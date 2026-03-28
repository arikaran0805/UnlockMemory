/**
 * Team Canvas Editor - Full team management experience
 * 
 * Features:
 * - Editable team name
 * - Career display
 * - Career Manager assignments
 * - Course assignments with Course/Content Moderator roles
 * - Persistent User Pool sidebar for drag-drop style selections
 * - All assignments save immediately
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor, useDroppable } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ArrowLeft,
  Archive,
  Shield,
  GraduationCap,
  UserCog,
  Users,
  Plus,
  Star,
  X,
  Briefcase,
  CheckCircle2,
} from "lucide-react";
import type { Team, UserProfile, CourseWithAssignments, SuperModeratorAssignment } from "./types";
import UserPoolSidebar from "./UserPoolSidebar";

// Droppable zone component
const DroppableZone = ({ 
  id, 
  children, 
  className,
  activeClassName,
}: { 
  id: string; 
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`${className} ${isOver ? activeClassName : ''}`}
    >
      {children}
    </div>
  );
};

interface UserWithRole extends UserProfile {
  role?: "admin" | "super_moderator" | "senior_moderator" | "moderator" | "user" | null;
}

interface TeamCanvasEditorProps {
  team: Team;
  onClose: () => void;
  onRefresh: () => void;
}

const TeamCanvasEditor = ({ team, onClose, onRefresh }: TeamCanvasEditorProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [editedName, setEditedName] = useState(team.name);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);

  // Data states
  const [superModerators, setSuperModerators] = useState<SuperModeratorAssignment[]>([]);
  const [courses, setCourses] = useState<CourseWithAssignments[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);

  // State for all existing course assignments (to prevent duplicates across teams)
  const [allCourseAssignments, setAllCourseAssignments] = useState<{ user_id: string; course_id: string; role: string }[]>([]);

  // User Pool selection state
  const [selectedTarget, setSelectedTarget] = useState<{
    type: "super_moderator" | "senior_moderator" | "moderator";
    courseId?: string;
  } | null>(null);

  // Active dragging user for DragOverlay
  const [activeDragUser, setActiveDragUser] = useState<UserWithRole | null>(null);

  // Ref for click-outside detection on add buttons
  const addButtonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  // Handle click outside to reset selection
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (!selectedTarget) return;
    
    const target = event.target as HTMLElement;
    
    // Check if click is inside sidebar (has the user pool area)
    const sidebar = document.querySelector('[data-user-pool-sidebar]');
    if (sidebar?.contains(target)) return;
    
    // Check if click is on any add button
    let clickedOnAddButton = false;
    addButtonRefs.current.forEach((buttonEl) => {
      if (buttonEl?.contains(target)) {
        clickedOnAddButton = true;
      }
    });
    
    if (!clickedOnAddButton) {
      setSelectedTarget(null);
    }
  }, [selectedTarget]);

  useEffect(() => {
    if (selectedTarget) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedTarget, handleClickOutside]);

  // Computed sets for sidebar
  const assignedSuperModeratorIds = useMemo(() => {
    return new Set(superModerators.map((sm) => sm.user_id));
  }, [superModerators]);

  const assignedSeniorModeratorIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    courses.forEach((course) => {
      const ids = new Set(course.seniorModerators.map((sm) => sm.user_id));
      // Also add from allCourseAssignments (global)
      allCourseAssignments
        .filter((a) => a.course_id === course.id && a.role === "senior_moderator")
        .forEach((a) => ids.add(a.user_id));
      map.set(course.id, ids);
    });
    return map;
  }, [courses, allCourseAssignments]);

  const assignedModeratorIds = useMemo(() => {
    const map = new Map<string, Set<string>>();
    courses.forEach((course) => {
      const ids = new Set(course.moderators.map((m) => m.user_id));
      // Also add from allCourseAssignments (global)
      allCourseAssignments
        .filter((a) => a.course_id === course.id && a.role === "moderator")
        .forEach((a) => ids.add(a.user_id));
      map.set(course.id, ids);
    });
    return map;
  }, [courses, allCourseAssignments]);

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
        role: rolesMap.get(u.id) as any || null,
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

      // Get course IDs for this career
      const courseIds = (careerCoursesData || [])
        .filter((cc: any) => cc.course)
        .map((cc: any) => cc.course.id);

      // Fetch ALL course assignments for these courses (across all teams) to prevent duplicates
      let allAssignmentsData: { user_id: string; course_id: string; role: string }[] = [];
      if (courseIds.length > 0) {
        const { data: allAssignments, error: allAssignmentsError } = await supabase
          .from("course_assignments")
          .select("user_id, course_id, role")
          .in("course_id", courseIds);

        if (allAssignmentsError) throw allAssignmentsError;
        allAssignmentsData = allAssignments || [];
      }
      setAllCourseAssignments(allAssignmentsData);

      // Fetch course assignments for this team (for display)
      const { data: courseAssignmentsData, error: courseAssignmentsError } = await supabase
        .from("course_assignments")
        .select("*")
        .eq("team_id", team.id);

      if (courseAssignmentsError) throw courseAssignmentsError;

      // Build courses with assignments - show ALL courses from career
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
      toast({
        title: "No pending changes",
        description: "Team roles are saved automatically.",
      });
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
      toast({
        title: "Error updating team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from("teams")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team archived" });
      onClose();
    } catch (error: any) {
      toast({
        title: "Error archiving team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle user selection from the sidebar
  const handleSelectUserFromPool = async (
    selectedUserId: string,
    targetType: "super_moderator" | "senior_moderator" | "moderator",
    courseId?: string
  ) => {
    try {
      if (targetType === "super_moderator") {
        const { data, error } = await supabase.from("career_assignments").insert({
          user_id: selectedUserId,
          career_id: team.career_id,
          team_id: team.id,
          assigned_by: userId,
        }).select().single();

        if (error) throw error;

        const user = allUsers.find((u) => u.id === selectedUserId);
        setSuperModerators((prev) => [...prev, { ...data, user }]);
        toast({ title: "Career Manager added" });
      } else if (courseId) {
        const course = courses.find((c) => c.id === courseId);
        const isFirstSenior = targetType === "senior_moderator" && course?.seniorModerators.length === 0;

        const { data, error } = await supabase.from("course_assignments").insert({
          user_id: selectedUserId,
          course_id: courseId,
          team_id: team.id,
          role: targetType,
          is_default_manager: isFirstSenior,
          assigned_by: userId,
        }).select().single();

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
          })
        );

        setAllCourseAssignments((prev) => [...prev, { user_id: selectedUserId, course_id: courseId, role: targetType }]);
        toast({ title: `${targetType === "senior_moderator" ? "Course Manager" : "Content Moderator"} added` });
      }

      setSelectedTarget(null);
    } catch (error: any) {
      toast({
        title: "Error adding assignment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle drag start for DnD - show overlay
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.user) {
      setActiveDragUser(active.data.current.user as UserWithRole);
    }
  };

  // Handle drag end for DnD
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Always clear the active drag user
    setActiveDragUser(null);
    
    if (!over || !active.data.current?.user) return;

    const draggedUser = active.data.current.user as UserWithRole;
    const droppableId = over.id as string;

    // Parse the droppable ID to determine target
    if (droppableId === "drop-super-moderator") {
      // Check if already assigned
      if (assignedSuperModeratorIds.has(draggedUser.id)) {
        toast({
          title: "Already assigned",
          description: "This user is already a career manager for this team.",
          variant: "destructive",
        });
        return;
      }
      handleSelectUserFromPool(draggedUser.id, "super_moderator");
    } else if (droppableId.startsWith("drop-senior-")) {
      const courseId = droppableId.replace("drop-senior-", "");
      // Check if already assigned
      if (assignedSeniorModeratorIds.get(courseId)?.has(draggedUser.id)) {
        toast({
          title: "Already assigned",
          description: "This user is already a course manager for this course.",
          variant: "destructive",
        });
        return;
      }
      handleSelectUserFromPool(draggedUser.id, "senior_moderator", courseId);
    } else if (droppableId.startsWith("drop-mod-")) {
      const courseId = droppableId.replace("drop-mod-", "");
      // Check if already assigned
      if (assignedModeratorIds.get(courseId)?.has(draggedUser.id)) {
        toast({
          title: "Already assigned",
          description: "This user is already a content moderator for this course.",
          variant: "destructive",
        });
        return;
      }
      handleSelectUserFromPool(draggedUser.id, "moderator", courseId);
    }
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveDragUser(null);
  };

  // DnD sensors with activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
      toast({
        title: "Error removing career manager",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveModerator = async (assignmentId: string, courseId: string, removedUserId: string, role: string) => {
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
        })
      );

      setAllCourseAssignments((prev) =>
        prev.filter((a) => !(a.user_id === removedUserId && a.course_id === courseId && a.role === role))
      );

      toast({ title: "Assignment removed" });
    } catch (error: any) {
      toast({
        title: "Error removing assignment",
        description: error.message,
        variant: "destructive",
      });
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
        })
      );

      toast({ title: "Default manager updated" });
    } catch (error: any) {
      toast({
        title: "Error updating default manager",
        description: error.message,
        variant: "destructive",
      });
    }
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
        <div className="w-72 border-l bg-muted/30">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
    <div className="flex h-full min-h-[calc(100vh-8rem)]">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-xl font-bold w-64 border-transparent hover:border-input focus:border-input transition-colors"
              placeholder="Team name"
            />
            <Badge
              variant="outline"
              style={{
                borderColor: team.career?.color,
                color: team.career?.color,
                backgroundColor: `${team.career?.color}10`,
              }}
            >
              <Briefcase className="h-3 w-3 mr-1" />
              {team.career?.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSaveName} disabled={!editedName.trim()}>
              Update Team
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setShowArchiveDialog(true)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          </div>
        </div>

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
              <p className="text-xs font-medium uppercase tracking-wide text-center mb-1" style={{ color: team.career?.color }}>
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

              <DroppableZone 
                id="drop-super-moderator" 
                className="flex flex-wrap justify-center gap-3 p-3 rounded-xl border-2 border-transparent transition-all min-w-[200px]"
                activeClassName="border-purple-500 bg-purple-500/5 border-dashed"
              >
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
                    <button
                      onClick={() => handleRemoveSuperModerator(sm.id)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}

                {/* Add Career Manager Button */}
                <button
                  ref={(el) => addButtonRefs.current.set('super_moderator', el)}
                  onClick={() => setSelectedTarget(
                    selectedTarget?.type === "super_moderator" ? null : { type: "super_moderator" }
                  )}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                    selectedTarget?.type === "super_moderator"
                      ? "border-purple-500 bg-purple-500/10 text-purple-600"
                      : "border-muted-foreground/30 text-muted-foreground hover:border-purple-500/50 hover:text-purple-500"
                  }`}
                >
                  {selectedTarget?.type === "super_moderator" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Select from pool →</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span className="text-sm">Add</span>
                    </>
                  )}
                </button>
              </DroppableZone>
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

                      {/* Senior Moderators */}
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
                        <DroppableZone 
                          id={`drop-senior-${course.id}`}
                          className="flex flex-wrap gap-2 p-2 rounded-lg border-2 border-transparent transition-all min-h-[40px]"
                          activeClassName="border-amber-500 bg-amber-500/5 border-dashed"
                        >
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
                          <button
                            ref={(el) => addButtonRefs.current.set(`senior_${course.id}`, el)}
                            onClick={() => setSelectedTarget(
                              selectedTarget?.type === "senior_moderator" && selectedTarget?.courseId === course.id 
                                ? null 
                                : { type: "senior_moderator", courseId: course.id }
                            )}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                              selectedTarget?.type === "senior_moderator" && selectedTarget?.courseId === course.id
                                ? "border-amber-500 bg-amber-500/10 text-amber-600"
                                : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-amber-500/50 hover:text-amber-500"
                            }`}
                          >
                            {selectedTarget?.type === "senior_moderator" && selectedTarget?.courseId === course.id ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-sm">Select →</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span className="text-sm">Add</span>
                              </>
                            )}
                          </button>
                        </DroppableZone>
                      </div>

                      {/* Connector */}
                      <div className="flex justify-center">
                        <div className="w-0.5 h-3 bg-border" />
                      </div>

                      {/* Moderators */}
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
                        <DroppableZone 
                          id={`drop-mod-${course.id}`}
                          className="flex flex-wrap gap-2 p-2 rounded-lg border-2 border-transparent transition-all min-h-[40px]"
                          activeClassName="border-blue-500 bg-blue-500/5 border-dashed"
                        >
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
                          <button
                            ref={(el) => addButtonRefs.current.set(`mod_${course.id}`, el)}
                            onClick={() => setSelectedTarget(
                              selectedTarget?.type === "moderator" && selectedTarget?.courseId === course.id 
                                ? null 
                                : { type: "moderator", courseId: course.id }
                            )}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                              selectedTarget?.type === "moderator" && selectedTarget?.courseId === course.id
                                ? "border-blue-500 bg-blue-500/10 text-blue-600"
                                : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-blue-500/50 hover:text-blue-500"
                            }`}
                          >
                            {selectedTarget?.type === "moderator" && selectedTarget?.courseId === course.id ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="text-sm">Select →</span>
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                <span className="text-sm">Add</span>
                              </>
                            )}
                          </button>
                        </DroppableZone>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* User Pool Sidebar */}
      <UserPoolSidebar
        allUsers={allUsers}
        assignedSuperModeratorIds={assignedSuperModeratorIds}
        assignedSeniorModeratorIds={assignedSeniorModeratorIds}
        assignedModeratorIds={assignedModeratorIds}
        selectedTarget={selectedTarget}
        onSelectUser={handleSelectUserFromPool}
        onClearSelection={() => setSelectedTarget(null)}
      />

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
                {(superModerators.length > 0 || courses.some(c => c.seniorModerators.length > 0 || c.moderators.length > 0)) && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm font-medium">
                    ⚠️ This team has {superModerators.length} career manager(s) and{" "}
                    {courses.reduce((acc, c) => acc + c.seniorModerators.length + c.moderators.length, 0)} course assignment(s)
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

    {/* DragOverlay - Shows dragged user card outside its container */}
    <DragOverlay dropAnimation={null}>
      {activeDragUser ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border-2 border-primary shadow-lg">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={activeDragUser.avatar_url || undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {activeDragUser.full_name?.[0] || activeDragUser.email[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {activeDragUser.full_name || activeDragUser.email}
            </p>
          </div>
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
};

export default TeamCanvasEditor;
