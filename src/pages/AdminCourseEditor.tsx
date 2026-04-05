import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useRoleScope } from "@/hooks/useRoleScope";
import { useCourseVersions } from "@/hooks/useCourseVersions";
import { useCourseAnnotations } from "@/hooks/useCourseAnnotations";
import { useCoursePrerequisites } from "@/hooks/useCoursePrerequisites";
import { useAdminSidebar } from "@/contexts/AdminSidebarContext";

import { AdminEditorSkeleton } from "@/components/admin/AdminEditorSkeleton";
import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";
import VersionHistoryPanel from "@/components/VersionHistoryPanel";
import { AnnotationPanel, FloatingAnnotationPopup } from "@/components/annotations";
import { VersioningNoteDialog, VersioningNoteType } from "@/components/VersioningNoteDialog";
import { CoursePrerequisiteEditor } from "@/components/course/CoursePrerequisiteEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Upload, X, Image, icons, Save, Send, User, UserCog, Shield, Users, Settings, FileText, MessageCircle, Highlighter, BookOpen, MessageSquare } from "lucide-react";
import { AssetsSidebar } from "@/components/assets/AssetsSidebar";
import LessonManager from "@/components/LessonManager";
import { CanvasEditor, type CanvasEditorRef } from "@/components/canvas-editor";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
}

interface UserWithRole extends UserProfile {
  role: string;
}

const AdminCourseEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { isAdmin, isModerator, userId, isLoading: roleLoading } = useUserRole();
  const { role: userRole, careerIds } = useRoleScope();
  const isSuperMod = userRole === "super_moderator";
  
  // Determine base path from current route
  const basePath = location.pathname.startsWith("/super-moderator")
    ? "/super-moderator"
    : location.pathname.startsWith("/senior-moderator")
    ? "/senior-moderator"
    : location.pathname.startsWith("/moderator")
    ? "/moderator"
    : "/admin";
  
  // Get sidebar context to collapse when editing/annotating
  const { collapseSidebar } = useAdminSidebar();
  
  const [loading, setLoading] = useState(!!id);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [difficultyLevels, setDifficultyLevels] = useState<{ id: string; name: string }[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<UserWithRole[]>([]);
  const [authorInfo, setAuthorInfo] = useState<UserWithRole | null>(null);
  const [assigneeInfo, setAssigneeInfo] = useState<UserWithRole | null>(null);
  const canvasEditorRef = useRef<CanvasEditorRef>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    featured: false,
    level: "Beginner",
    featured_image: "",
    icon: "BookOpen",
    learning_hours: 0,
    status: "draft" as string,
    assigned_to: "" as string,
    original_price: 0,
    discount_percentage: 0,
  });
  
  // Prerequisites hook for the new linked prerequisites system
  const { 
    prerequisites: coursePrerequisites, 
    setPrerequisites: setCoursePrerequisites, 
    savePrerequisites 
  } = useCoursePrerequisites(id);
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [didSyncLatestVersion, setDidSyncLatestVersion] = useState(false);
  const [openSidebar, setOpenSidebar] = useState<'settings' | 'assets' | 'review' | null>('settings');
  const [annotationMode, setAnnotationMode] = useState(false);
  const [showVersioningNoteDialog, setShowVersioningNoteDialog] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [selectedText, setSelectedText] = useState<{
    start: number;
    end: number;
    text: string;
    type?: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
    rect?: { top: number; left: number; width: number; height: number; bottom: number };
  } | null>(null);
  const previousContentRef = useRef<string>("");
  
  // Collapse sidebar when editing a course (has id) or when annotation mode is activated
  useEffect(() => {
    if (id) {
      collapseSidebar();
    }
  }, [id, collapseSidebar]);
  
  useEffect(() => {
    if (annotationMode) {
      collapseSidebar();
    }
  }, [annotationMode, collapseSidebar]);

  // Version and annotation hooks
  const { versions, loading: versionsLoading, saveVersionAsDraft, saveVersionOnPublish, publishVersion, restoreVersion, updateVersionNote } = useCourseVersions(id);
  const { annotations, loading: annotationsLoading, createAnnotation, createReply, deleteReply, updateAnnotationStatus, deleteAnnotation } = useCourseAnnotations(id);

  // Get a list of popular icons for courses
  const courseIcons = [
    "BookOpen", "Code", "Database", "Brain", "Cpu", "Globe", "Layers",
    "LineChart", "Palette", "Rocket", "Server", "Terminal", "Wrench", 
    "Zap", "BarChart", "Cloud", "FileCode", "GitBranch", "Lock", "Monitor"
  ];

  useEffect(() => {
    if (!roleLoading) {
      checkAccess();
    }
  }, [roleLoading]);

  useEffect(() => {
    if (!roleLoading && (isAdmin || isModerator)) {
      const loadData = async () => {
        const promises: Promise<void>[] = [fetchDifficultyLevels()];
        
        if (isAdmin) {
          promises.push(fetchAssignableUsers());
        }
        
        if (id) {
          promises.push(fetchCategory());
        }
        
        await Promise.all(promises);
        
        if (!id) {
          setLoading(false);
        }
      };
      
      loadData();
    }
  }, [id, isAdmin, isModerator, roleLoading]);

  // Reset version sync when navigating between courses
  useEffect(() => {
    setDidSyncLatestVersion(false);
  }, [id]);

  // Sync with latest version
  useEffect(() => {
    if (!id || versionsLoading || didSyncLatestVersion) return;
    if (versions.length === 0) return;

    const latest = versions[0];
    setFormData((prev) => ({ ...prev, description: latest.content }));
    setOriginalContent(latest.content);
    previousContentRef.current = latest.content;


    setDidSyncLatestVersion(true);
  }, [id, versionsLoading, versions, didSyncLatestVersion]);

  const fetchDifficultyLevels = async () => {
    try {
      const { data, error } = await supabase
        .from("difficulty_levels")
        .select("id, name")
        .order("display_order");

      if (error) throw error;
      setDifficultyLevels(data || []);
    } catch (error: any) {
      toast({ title: "Error fetching difficulty levels", description: error.message, variant: "destructive" });
    }
  };

  const fetchAssignableUsers = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const userIds = rolesData.map(r => r.user_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
          const roleInfo = rolesData.find(r => r.user_id === profile.id);
          return {
            ...profile,
            role: roleInfo?.role || "user"
          };
        });

        setAssignableUsers(usersWithRoles);
      }
    } catch (error: any) {
      console.error("Error fetching assignable users:", error);
    }
  };

  const fetchUserInfo = async (userId: string): Promise<UserWithRole | null> => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", userId)
        .single();

      if (!profile) return null;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      return {
        ...profile,
        role: roleData?.role || "user"
      };
    } catch {
      return null;
    }
  };

  const checkAccess = async () => {
    if (!isAdmin && !isModerator) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }
  };

  const fetchCategory = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      
      if (data) {
        if (isModerator && !isAdmin && data.author_id && data.author_id !== userId && data.assigned_to !== userId) {
          toast({
            title: "Access Denied",
            description: "You can only edit your own or assigned courses",
            variant: "destructive",
          });
          navigate("/admin/courses");
          return;
        }

        setOriginalAuthorId(data.author_id);
        const op = Number((data as any).original_price) || 0;
        const dp = Number((data as any).discount_price) || 0;
        const discPct = op > 0 && dp < op ? Math.round(((op - dp) / op) * 100) : 0;

        setFormData((prev) => ({
          ...prev,
          name: data.name,
          slug: data.slug,
          description: prev.description || data.description || "",
          featured: data.featured || false,
          level: data.level || "Beginner",
          featured_image: data.featured_image || "",
          icon: (data as any).icon || "BookOpen",
          learning_hours: (data as any).learning_hours || 0,
          status: data.status || "draft",
          assigned_to: (data as any).assigned_to || "",
          prerequisites: (data as any).prerequisites || [],
          original_price: op,
          discount_percentage: discPct,
        }));

        // Store original content for change detection
        setOriginalContent((prev) => prev || (data.description || ""));
        if (!previousContentRef.current) {
          previousContentRef.current = data.description || "";
        }



        if (data.author_id) {
          const author = await fetchUserInfo(data.author_id);
          setAuthorInfo(author);
        }

        if ((data as any).assigned_to) {
          const assignee = await fetchUserInfo((data as any).assigned_to);
          setAssigneeInfo(assignee);
        }
      }
    } catch (error: any) {
      toast({ title: "Error fetching course", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, submitForApproval: boolean = false) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let status = formData.status;
      if (isModerator && !isAdmin) {
        if (submitForApproval) {
          status = "pending";
        } else {
          status = "draft";
        }
      } else if (submitForApproval) {
        status = "pending";
      }

      const isPublishing = status === "published";

      const discountPrice = formData.original_price > 0 && formData.discount_percentage > 0
        ? Math.round(formData.original_price * (1 - formData.discount_percentage / 100))
        : formData.original_price;

      const courseData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        featured: formData.featured,
        level: formData.level,
        featured_image: formData.featured_image || null,
        icon: formData.icon,
        learning_hours: formData.learning_hours,
        status,
        author_id: originalAuthorId || session.user.id,
        original_price: formData.original_price || null,
        discount_price: discountPrice || null,
      };

      if (isAdmin) {
        courseData.assigned_to = formData.assigned_to || null;
      }

      let courseId = id;

      if (id) {
        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", id);
        
        if (error) throw error;

        // Save version on publish
        if (isPublishing) {
          await saveVersionOnPublish(
            formData.description,
            "canvas"
          );
        } else if (formData.description !== previousContentRef.current) {
          await saveVersionAsDraft(
            formData.description,
            "canvas"
          );
        }
        previousContentRef.current = formData.description;

        // Save prerequisites using the new linked prerequisites system
        await savePrerequisites(coursePrerequisites);

        toast({ title: "Course updated successfully" });
      } else {
        const { data: newCourse, error } = await supabase
          .from("courses")
          .insert([courseData])
          .select()
          .single();
        
        if (error) throw error;
        courseId = newCourse.id;

        // Create initial version
        if (courseId) {
          await supabase
            .from("course_versions")
            .insert({
              course_id: courseId,
              version_number: 0,
              content: formData.description,
              editor_type: "canvas",
              edited_by: session.user.id,
              editor_role: isAdmin ? "admin" : "moderator",
              change_summary: "Initial version (v0)",
              is_published: isPublishing,
            });

          // Auto-create a linked practice skill for this course
          await supabase
            .from("practice_skills")
            .insert({
              name: formData.name,
              slug: formData.slug,
              description: formData.description ? formData.description.substring(0, 200) : null,
              icon: formData.icon || "Code2",
              display_order: 0,
              status: "draft",
              course_id: courseId,
              created_by: session.user.id,
            });

          // Super moderator: auto-link course to their assigned career
          if (isSuperMod && careerIds.length > 0) {
            const { error: careerCourseError } = await supabase
              .from("career_courses")
              .insert({ career_id: careerIds[0], course_id: courseId });

            if (careerCourseError) {
              // Roll back the course creation
              await supabase.from("courses").delete().eq("id", courseId);
              throw new Error(`Failed to link course to career: ${careerCourseError.message}`);
            }
          }
        }

        toast({ title: "Course created successfully" });
      }

      if (submitForApproval && courseId) {
        await supabase.from("approval_history").insert({
          content_type: "course",
          content_id: courseId,
          action: "submitted",
          performed_by: session.user.id,
        });
        toast({ title: "Course submitted for approval" });
      }
      
      navigate(`${basePath}/courses`);
    } catch (error: any) {
      toast({ title: "Error saving course", description: error.message, variant: "destructive" });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `course-${Date.now()}.${fileExt}`;
      const filePath = `courses/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, featured_image: publicUrl });
      toast({ title: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData({ ...formData, featured_image: "" });
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      );
    }
    if (role === "moderator") {
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
          <UserCog className="h-3 w-3" />
          Moderator
        </Badge>
      );
    }
    return null;
  };

  // Handle version actions
  const handleRestoreVersion = async (version: any) => {
    const restoredContent = await restoreVersion(version);
    if (restoredContent) {
      setFormData(prev => ({ ...prev, description: restoredContent }));
      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number}`,
      });
    }
  };

  const handlePublishVersion = async (version: any) => {
    const success = await publishVersion(version.id, version.content);
    if (success) {
      setFormData(prev => ({ ...prev, description: version.content, status: "published" }));
    }
  };

  // Handle annotation creation
  const handleAddAnnotation = async (
    selectionStart: number,
    selectionEnd: number,
    selectedTextStr: string,
    comment: string,
  ) => {
    const bubbleIndex = selectedText?.bubbleIndex;
    
    await createAnnotation(
      selectionStart,
      selectionEnd,
      selectedTextStr,
      comment,
      "canvas",
      bubbleIndex
    );
  };

  const canPublishDirectly = isAdmin || isSuperMod;
  const showSubmitForApproval = isModerator && !isAdmin && !isSuperMod;

  const editorInitLoading =
    roleLoading ||
    loading ||
    (id ? versionsLoading || (versions.length > 0 && !didSyncLatestVersion) : false);

  if (editorInitLoading) {
    return <AdminEditorSkeleton type="course" />;
  }

  return (
    <>
      <div className="flex gap-4 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Main Tabs */}
          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-foreground">
                      {id ? "Edit Course" : "Create New Course"}
                    </h1>
                    {formData.status && formData.status !== "draft" && (
                      <ContentStatusBadge status={formData.status as ContentStatus} />
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs leading-none">
                    Manage course details, curriculum, and publishing status
                  </p>
                </div>
              </div>
              <TabsList>
                <TabsTrigger value="details" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course Details
                </TabsTrigger>
                <TabsTrigger value="lessons" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Lessons
                </TabsTrigger>
                <TabsTrigger value="description" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Description
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="admin-section-spacing-top" />

            {/* Open annotations indicator */}
            {annotations.filter(a => a.status === "open").length > 0 && !isAdmin && (
              <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex-shrink-0">
                <Highlighter className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-200">
                  You have {annotations.filter(a => a.status === "open").length} pending feedback comments from admin. Check the Annotations panel.
                </span>
              </div>
            )}

            {/* Course Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Course Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Course Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter course name"
                      value={formData.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData({
                          ...formData,
                          name,
                          slug: generateSlug(name),
                        });
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      placeholder="course-slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                    />
                  </div>

                  {/* Price & Discount */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                    <div className="space-y-2">
                      <Label htmlFor="original_price">Original Price (₹)</Label>
                      <Input
                        id="original_price"
                        type="number"
                        min={0}
                        placeholder="e.g. 1999"
                        value={formData.original_price || ""}
                        onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="discount_percentage">Discount %</Label>
                      <Input
                        id="discount_percentage"
                        type="number"
                        min={0}
                        max={100}
                        placeholder="e.g. 20"
                        value={formData.discount_percentage || ""}
                        onChange={(e) => setFormData({ ...formData, discount_percentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Final Price (₹)</Label>
                      <div className="flex items-center h-10 px-3 rounded-md border border-input bg-muted/50 text-sm font-medium">
                        {formData.original_price > 0 && formData.discount_percentage > 0
                          ? `₹${Math.round(formData.original_price * (1 - formData.discount_percentage / 100)).toLocaleString("en-IN")}`
                          : formData.original_price > 0
                          ? `₹${formData.original_price.toLocaleString("en-IN")}`
                          : "—"}
                        {formData.discount_percentage > 0 && (
                          <span className="ml-2 text-xs text-emerald-600 font-semibold">{formData.discount_percentage}% OFF</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lessons Tab */}
            <TabsContent value="lessons" className="space-y-6 mt-0 flex-1 overflow-y-auto">
              {id ? (
                <LessonManager courseId={id} basePath={basePath} />
              ) : (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Lesson Manager
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6 text-muted-foreground">
                      <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="text-sm font-medium mb-1">Save the course first</p>
                      <p className="text-xs">
                        Create or save this course to start adding lessons and organizing content.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Description Tab */}
            <TabsContent value="description" className="mt-4 flex-1 min-h-0 flex flex-col">
              <CanvasEditor
                ref={canvasEditorRef}
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                className="flex-1 min-h-0"
                lessonLabel={formData.name}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="flex-shrink-0 flex">
          {/* Sidebar Content */}
          <Card className="flex flex-col min-h-0 w-72">
            <div className="p-4 border-b flex-shrink-0">
              {openSidebar === 'review' ? (
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm whitespace-nowrap">Review Panel</h3>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm whitespace-nowrap">Course Settings</h3>
                </div>
              )}
              {/* Review Panel Controls */}
              {openSidebar === 'review' && (
                <div className="space-y-3">
                  {(isAdmin || isModerator) && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Highlighter className={`h-4 w-4 ${annotationMode ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-xs font-medium">Annotate</span>
                      </div>
                      <Switch
                        checked={annotationMode}
                        onCheckedChange={setAnnotationMode}
                        className="scale-75"
                      />
                    </div>
                  )}
                  <div className="[&>*]:w-full">
                    <VersionHistoryPanel
                      versions={versions as any}
                      loading={versionsLoading}
                      isAdmin={isAdmin}
                      currentContent={formData.description}
                      liveContent={originalContent}
                      onRestore={handleRestoreVersion}
                      onPublish={handlePublishVersion}
                      onPreview={() => {
                        toast({ title: "Preview", description: "Version preview coming soon" });
                      }}
                      onUpdateNote={updateVersionNote}
                    />
                  </div>
                  <div className="[&>*]:w-full">
                    <AnnotationPanel
                      annotations={annotations as any}
                      loading={annotationsLoading}
                      isAdmin={isAdmin}
                      isModerator={isModerator}
                      userId={userId}
                      onAddAnnotation={handleAddAnnotation}
                      onUpdateStatus={updateAnnotationStatus}
                      onDelete={deleteAnnotation}
                      onAddReply={createReply}
                      onDeleteReply={deleteReply}
                      selectedText={selectedText}
                      onClearSelection={() => setSelectedText(null)}
                    />
                  </div>
                </div>
              )}
              {/* Action Buttons */}
              {openSidebar !== 'review' && <div className="space-y-2">
                {canPublishDirectly ? (
                  <>
                    <Button onClick={(e) => handleSubmit(e, false)} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      {id ? "Update Course" : "Create Course"}
                    </Button>
                    {id && (
                      <Button
                        onClick={() => setShowVersioningNoteDialog(true)}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save as Draft
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button onClick={(e) => handleSubmit(e, false)} variant="outline" className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </Button>
                    {showSubmitForApproval && (
                      <Button onClick={(e) => handleSubmit(e, true)} className="w-full">
                        <Send className="mr-2 h-4 w-4" />
                        Submit for Approval
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => navigate("/admin/courses")}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>}
            </div>

            <ScrollArea className={`flex-1 min-h-0 ${openSidebar === 'review' ? 'hidden' : ''}`}>
              <div className="p-4 space-y-4">
                {/* Ownership & Assignment Card - Admin Only */}
                {isAdmin && id && (
                  <div className="space-y-4 pb-4 border-b">
                    <Label className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Ownership & Assignment
                    </Label>
                    {/* Created By */}
                    {authorInfo && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Created by
                        </Label>
                        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                          <span className="text-sm font-medium">
                            {authorInfo.full_name || authorInfo.email.split("@")[0]}
                          </span>
                          {getRoleBadge(authorInfo.role)}
                        </div>
                      </div>
                    )}

                    {/* Assign To */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <UserCog className="h-3 w-3" />
                        Assign to
                      </Label>
                      <Select
                        value={formData.assigned_to || "none"}
                        onValueChange={(value) => setFormData({ ...formData, assigned_to: value === "none" ? "" : value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user to assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not assigned</SelectItem>
                          {assignableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              <div className="flex items-center gap-2">
                                <span>{user.full_name || user.email.split("@")[0]}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({user.role})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Assigned users can edit this course
                      </p>
                    </div>
                  </div>
                )}

                {/* Show ownership info for moderators (read-only) */}
                {!isAdmin && id && (authorInfo || assigneeInfo) && (
                  <div className="space-y-3 pb-4 border-b">
                    <Label className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Ownership Info
                    </Label>
                    {authorInfo && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Created by:</span>
                        <div className="flex items-center gap-2">
                          <span>{authorInfo.full_name || authorInfo.email.split("@")[0]}</span>
                          {getRoleBadge(authorInfo.role)}
                        </div>
                      </div>
                    )}
                    {assigneeInfo && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Assigned to:</span>
                        <div className="flex items-center gap-2">
                          <span>{assigneeInfo.full_name || assigneeInfo.email.split("@")[0]}</span>
                          {getRoleBadge(assigneeInfo.role)}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status - Only show to admins */}
                {canPublishDirectly && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending Approval</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="level">Difficulty Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => setFormData({ ...formData, level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level.id} value={level.name}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="learning_hours">Learning Hours</Label>
                  <Input
                    id="learning_hours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 10"
                    value={formData.learning_hours}
                    onChange={(e) => setFormData({ ...formData, learning_hours: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">Estimated hours to complete</p>
                </div>

                {/* Prerequisites Editor */}
                <CoursePrerequisiteEditor
                  courseId={id}
                  prerequisites={coursePrerequisites}
                  onChange={setCoursePrerequisites}
                />

                <div className="space-y-2">
                  <Label>Course Icon</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {courseIcons.map((iconName) => {
                      const IconComponent = icons[iconName as keyof typeof icons];
                      return (
                        <Button
                          key={iconName}
                          type="button"
                          variant={formData.icon === iconName ? "default" : "outline"}
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => setFormData({ ...formData, icon: iconName })}
                        >
                          {IconComponent && <IconComponent className="h-5 w-5" />}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="featured" className="cursor-pointer">
                      Featured Course
                    </Label>
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                    />
                  </div>
                )}

                {/* Featured Image */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>Featured Image</Label>
                  {formData.featured_image ? (
                    <div className="relative">
                      <img
                        src={formData.featured_image}
                        alt="Featured"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={removeImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Image className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Click to upload
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {formData.featured_image && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-3 w-3" />
                      {uploading ? "Uploading..." : "Change Image"}
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </Card>

          {/* Assets Sidebar */}
          <AssetsSidebar
            isOpen={openSidebar === 'assets'}
            editorType="canvas"
            onInsert={(asset) => {
              navigator.clipboard.writeText(asset.url);
              toast({ title: "URL copied", description: "Paste it into the editor." });
            }}
          />
        </div>
      </div>

      {/* Versioning Note Dialog */}
      <VersioningNoteDialog
        open={showVersioningNoteDialog}
        onOpenChange={setShowVersioningNoteDialog}
        loading={savingDraft}
        onSave={async (noteType: VersioningNoteType, changeSummary: string) => {
          setSavingDraft(true);
          try {
            const saved = await saveVersionAsDraft(
              formData.description,
              "canvas",
              changeSummary,
              noteType
            );

            if (saved) {
              previousContentRef.current = formData.description;
              setShowVersioningNoteDialog(false);
              toast({
                title: "Draft saved",
                description: "Saved as a private draft version (not live).",
              });
            }
          } finally {
            setSavingDraft(false);
          }
        }}
      />

      {/* Floating Annotation Popup */}
      <FloatingAnnotationPopup
        selectedText={selectedText}
        onAddAnnotation={handleAddAnnotation}
        onClose={() => setSelectedText(null)}
        isAdmin={isAdmin}
        isModerator={isModerator}
      />
    </>
  );
};

export default AdminCourseEditor;
