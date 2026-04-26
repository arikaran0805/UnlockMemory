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
import { FloatingAnnotationPopup } from "@/components/annotations";
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
import { Upload, X, Image, icons, Save, Send, User, UserCog, Shield, Users, Settings, FileText, Highlighter, BookOpen, Clock } from "lucide-react";

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
  const [openSidebar] = useState<'settings'>('settings');
  const [calculatedLearningHours, setCalculatedLearningHours] = useState<number | null>(null);
  const [learningHoursOverride, setLearningHoursOverride] = useState<number | null>(null);
  const [assignedModerators, setAssignedModerators] = useState<{ id: string; full_name: string | null; email: string; role: string }[]>([]);
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

  // Auto-calculate learning hours from posts linked to this course
  useEffect(() => {
    if (!id) return;
    const fetchPostLearningHours = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("content")
          .eq("category_id", id)
          .not("content", "is", null);
        if (error) throw error;
        // Sum word counts across all posts, 200 WPM, convert minutes → hours
        const totalMinutes = (data || []).reduce((acc, post) => {
          const text = (post.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
          const wordCount = text ? text.split(" ").length : 0;
          return acc + Math.max(1, Math.ceil(wordCount / 200));
        }, 0);
        const hours = Math.round((totalMinutes / 60) * 10) / 10; // 1 decimal place
        setCalculatedLearningHours(hours);
      } catch (err) {
        // silently ignore
      }
    };
    fetchPostLearningHours();
  }, [id]);

  const displayLearningHours = learningHoursOverride ?? calculatedLearningHours ?? formData.learning_hours;

  // Fetch team-assigned moderators for this course from course_assignments
  useEffect(() => {
    if (!id) return;
    const fetchAssignedModerators = async () => {
      try {
        const { data, error } = await supabase
          .from('course_assignments')
          .select('user_id, role, profiles!course_assignments_user_id_fkey(id, full_name, email)')
          .eq('course_id', id);
        if (error) throw error;
        const mods = (data || []).map((row: any) => ({
          id: row.profiles?.id || row.user_id,
          full_name: row.profiles?.full_name || null,
          email: row.profiles?.email || '',
          role: row.role,
        }));
        setAssignedModerators(mods);
      } catch {
        // silently ignore
      }
    };
    fetchAssignedModerators();
  }, [id]);
  
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

  const handleSubmit = async (e: React.FormEvent, submitForApproval: boolean = false, statusOverride?: string) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      let status = statusOverride ?? formData.status;
      if (isModerator && !isAdmin) {
        if (submitForApproval) {
          status = "pending";
        } else {
          status = statusOverride ?? "draft";
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
        learning_hours: displayLearningHours,
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
      <div className="flex gap-4">
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


          </Tabs>
        </div>

        {/* Right Sidebar */}
        <div className="flex-shrink-0 flex sticky top-[52px] self-start h-[calc(100vh-116px)]">
          {/* Sidebar Content */}
          <Card className="flex flex-col w-72 min-h-0">
            {/* Panel header */}
            <div className="px-4 py-3 border-b flex-shrink-0">
              <div className="flex items-center">
                <h3 className="font-semibold text-sm whitespace-nowrap">Course Settings</h3>
              </div>
            </div>

            {/* Settings Panel content */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 space-y-3">

                {/* Status */}
                <div className="rounded-xl border border-border/70 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                  </div>
                  <div className="px-3 py-2.5 flex items-center justify-between bg-card">
                    {formData.status && formData.status !== 'draft' ? (
                      <ContentStatusBadge status={formData.status as ContentStatus} />
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Not set</span>
                    )}
                  </div>
                </div>

                {/* Difficulty Level */}
                <div className="rounded-xl border border-border/70 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Difficulty Level</span>
                  </div>
                  <div className="px-3 py-2.5 bg-card">
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                </div>

                {/* Learning Hours */}
                <div className="rounded-xl border border-border/70 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Learning Hours</span>
                  </div>
                  <div className="px-3 py-2.5 bg-card">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground leading-none">
                            {displayLearningHours} <span className="text-xs font-normal text-muted-foreground">hrs</span>
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {learningHoursOverride !== null ? 'Manually set' : 'Auto-calculated'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          id="learning_hours"
                          type="number"
                          min={0}
                          step={0.5}
                          value={displayLearningHours}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0) setLearningHoursOverride(val);
                          }}
                          className="h-7 text-xs w-14 text-center"
                          aria-label="Learning hours"
                        />
                        {learningHoursOverride !== null && (
                          <button
                            type="button"
                            onClick={() => setLearningHoursOverride(null)}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            Auto
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ownership & Assignment - Admin Only */}
                {isAdmin && id && (
                  <div className="rounded-xl border border-border/70 overflow-hidden">
                    <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ownership</span>
                    </div>
                    <div className="px-3 py-2.5 space-y-3 bg-card">
                      {/* Created by */}
                      {authorInfo && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Created by</p>
                          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                            <span className="text-xs font-medium">
                              {authorInfo.full_name || authorInfo.email.split("@")[0]}
                            </span>
                            {getRoleBadge(authorInfo.role)}
                          </div>
                        </div>
                      )}
                      {/* Assigned team moderators (read-only from course_assignments) */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Team Assignment</p>
                        {assignedModerators.length > 0 ? (
                          <div className="space-y-1.5">
                            {assignedModerators.map((mod) => (
                              <div key={mod.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                                <span className="text-xs font-medium">
                                  {mod.full_name || mod.email.split('@')[0]}
                                </span>
                                {getRoleBadge(mod.role)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-muted/20 border border-dashed border-border/60">
                            <span className="text-[11px] text-muted-foreground italic">No team moderators assigned</span>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">Manage via Team Ownership page</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ownership info for moderators (read-only) */}
                {!isAdmin && id && (authorInfo || assigneeInfo) && (
                  <div className="rounded-xl border border-border/70 overflow-hidden">
                    <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ownership</span>
                    </div>
                    <div className="px-3 py-2.5 space-y-2 bg-card">
                      {authorInfo && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Created by</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{authorInfo.full_name || authorInfo.email.split("@")[0]}</span>
                            {getRoleBadge(authorInfo.role)}
                          </div>
                        </div>
                      )}
                      {assigneeInfo && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Assigned to</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{assigneeInfo.full_name || assigneeInfo.email.split("@")[0]}</span>
                            {getRoleBadge(assigneeInfo.role)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Prerequisites */}
                <div className="rounded-xl border border-border/70 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prerequisites</span>
                  </div>
                  <div className="px-3 py-2.5 bg-card">
                    <CoursePrerequisiteEditor
                      courseId={id}
                      prerequisites={coursePrerequisites}
                      onChange={setCoursePrerequisites}
                    />
                  </div>
                </div>

                {/* Course Icon */}
                <div className="rounded-xl border border-border/70 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Course Icon</span>
                  </div>
                  <div className="px-3 py-2.5 bg-card">
                    <div className="grid grid-cols-5 gap-1.5">
                      {courseIcons.map((iconName) => {
                        const IconComponent = icons[iconName as keyof typeof icons];
                        return (
                          <Button
                            key={iconName}
                            type="button"
                            variant={formData.icon === iconName ? "default" : "outline"}
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setFormData({ ...formData, icon: iconName })}
                          >
                            {IconComponent && <IconComponent className="h-4 w-4" />}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Featured Toggle - Admin Only, only when course is Live */}
                {isAdmin && (
                  <div className={`rounded-xl border overflow-hidden transition-opacity duration-200 ${formData.status === "published" ? "border-border/70" : "border-border/40 opacity-50"}`}>
                    <div className="px-3 py-2.5 bg-card flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">Featured Course</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {formData.status === "published" ? "Pinned on the homepage" : "Set course to Live first"}
                        </p>
                      </div>
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        disabled={formData.status !== "published"}
                        onCheckedChange={(checked) => setFormData({ ...formData, featured: checked })}
                        className="scale-90"
                      />
                    </div>
                  </div>
                )}

                {/* Featured Image */}
                <div className="rounded-xl border border-border/70 overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 border-b border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Featured Image</span>
                  </div>
                  <div className="px-3 py-2.5 space-y-2 bg-card">
                    {formData.featured_image ? (
                      <div className="relative">
                        <img
                          src={formData.featured_image}
                          alt="Featured"
                          className="w-full h-28 object-cover rounded-lg"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1.5 right-1.5 h-6 w-6"
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
                        <Image className="h-7 w-7 mx-auto text-muted-foreground/50" />
                        <p className="mt-1 text-[11px] text-muted-foreground">Click to upload</p>
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
                        className="w-full h-8 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="mr-1.5 h-3 w-3" />
                        {uploading ? "Uploading..." : "Change Image"}
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            </ScrollArea>

            {/* ── Action CTAs (pinned footer) ── */}
            <div className="px-4 py-3 border-t border-border/60 bg-muted/20 flex-shrink-0 space-y-2">

              {/* Live / Draft toggle — admin & super-mod */}
              {canPublishDirectly && (
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-3 mb-1">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[12.5px] font-semibold leading-none text-foreground">
                      {formData.status === "published" ? "Live" : "Draft"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formData.status === "published"
                        ? "Visible to learners"
                        : "Hidden from learners"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={formData.status === "published"}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({
                          ...prev,
                          status: checked ? "published" : "draft",
                          // Clear featured if going to draft
                          featured: checked ? prev.featured : false,
                        }))
                      }
                      className="h-[18px] w-[32px] data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-muted-foreground/30"
                    />
                    {formData.status === "published" && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Admin / super-mod: save with current status */}
              {canPublishDirectly && (
                <>
                  <Button
                    onClick={(e) => handleSubmit(e, false, formData.status)}
                    disabled={loading}
                    className="w-full h-9 text-sm gap-2 font-semibold bg-[#16a34a] hover:bg-[#15803d] text-white"
                  >
                    <Save className="h-4 w-4" />
                    {id ? 'Update Course' : 'Create Course'}
                  </Button>
                </>
              )}

              {/* Moderator: submit for approval or save draft */}
              {showSubmitForApproval && (
                <Button
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading}
                  className="w-full h-9 text-sm gap-2 font-semibold"
                >
                  <Send className="h-4 w-4" />
                  Submit for Approval
                </Button>
              )}
              {!canPublishDirectly && (
                <Button
                  onClick={(e) => handleSubmit(e, false, "draft")}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-9 text-sm gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save as Draft
                </Button>
              )}

              <Button
                onClick={() => navigate(`${basePath}/courses`)}
                variant="ghost"
                className="w-full h-8 text-sm text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </Card>

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
