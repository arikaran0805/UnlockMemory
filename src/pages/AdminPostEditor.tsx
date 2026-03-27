import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CanvasEditor, type CanvasEditorRef } from "@/components/canvas-editor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { usePostVersions, PostVersion } from "@/hooks/usePostVersions";
import { usePostAnnotations } from "@/hooks/usePostAnnotations";
import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";
import { useAdminSidebar } from "@/contexts/AdminSidebarContext";
import { sanitizeHtml } from "@/lib/sanitize";

import { AdminEditorSkeleton } from "@/components/admin/AdminEditorSkeleton";
import { ContentStatusBadge, ContentStatus } from "@/components/ContentStatusBadge";
import VersionHistoryPanel from "@/components/VersionHistoryPanel";
import { AnnotationPanel, FloatingAnnotationPopup } from "@/components/annotations";
import AdminEditBanner from "@/components/AdminEditBanner";
import SideBySideComparison from "@/components/SideBySideComparison";
import VersionDiffViewer from "@/components/VersionDiffViewer";
import { VersioningNoteDialog, VersioningNoteType } from "@/components/VersioningNoteDialog";
import { ArrowLeft, Save, X, FileText, Send, AlertCircle, Eye, Loader2, Check, Highlighter, Settings, Layers, MessageSquare } from "lucide-react";
import { AssetsSidebar } from "@/components/assets/AssetsSidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const postSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  slug: z.string().min(1, "Slug is required").max(200),
  excerpt: z.string().max(500, "Excerpt too long").optional(),
  content: z.string().min(1, "Content is required"),
  featured_image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  category_id: z.string().uuid().optional().or(z.literal("")),
  status: z.enum(["draft", "published", "pending", "rejected", "changes_requested"]),
});

interface Category {
  id: string;
  name: string;
}

interface Post {
  id: string;
  title: string;
  category_id: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

const AdminPostEditor = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isModerator, userId, isLoading: roleLoading } = useUserRole();
  
  // Get sidebar context to collapse when editing/annotating
  const { collapseSidebar } = useAdminSidebar();
  
  const [loading, setLoading] = useState(!!id);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courseLessons, setCourseLessons] = useState<{ id: string; title: string; lesson_rank: string | null }[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    featured_image: "",
    category_id: "",
    lesson_id: "" as string,
    status: "draft" as "draft" | "published" | "pending" | "rejected" | "changes_requested",
    code_theme: "" as string,
  });
  const [originalAuthorId, setOriginalAuthorId] = useState<string | null>(null);
  const [postDbContent, setPostDbContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [didSyncLatestVersion, setDidSyncLatestVersion] = useState(false);
  const [selectedText, setSelectedText] = useState<{
    start: number;
    end: number;
    text: string;
    type?: "paragraph" | "code" | "conversation";
    bubbleIndex?: number;
    rect?: { top: number; left: number; width: number; height: number; bottom: number };
  } | null>(null);
  const [previewVersion, setPreviewVersion] = useState<any>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showAdminChangesDialog, setShowAdminChangesDialog] = useState(false);
  const [showPublishPreviewDialog, setShowPublishPreviewDialog] = useState(false);
  const [showVersioningNoteDialog, setShowVersioningNoteDialog] = useState(false);
  const [dismissedAdminBanner, setDismissedAdminBanner] = useState(false);
  const [openSidebar, setOpenSidebar] = useState<'settings' | 'assets' | 'review' | null>('assets');
  const rightSidebarOpen = openSidebar === 'settings' || openSidebar === 'review';
  const canvasEditorRef = useRef<CanvasEditorRef>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const previousContentRef = useRef<string>("");

  // Version and annotation hooks
  const { versions, loading: versionsLoading, metadata, saveVersion, saveVersionAsDraft, saveVersionOnPublish, createInitialVersion, publishVersion, restoreVersion, updateVersionNote } = usePostVersions(id);
  const { annotations, loading: annotationsLoading, createAnnotation, createReply, deleteReply, updateAnnotationStatus, deleteAnnotation } = usePostAnnotations(id);

  // Auto-save draft hook - saves content to localStorage with debounce
  const draftKey = id ? `post_${id}` : `new_post_${formData.slug || 'untitled'}`;
  
  // Collapse sidebar when editing a post (has id) or when annotation mode is activated
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
  const { loadDraft, clearDraft, status: autoSaveStatus } = useAutoSaveDraft(draftKey, formData.content, true);

  // Load draft on mount for new posts or if content is empty
  useEffect(() => {
    if (!loading && !formData.content) {
      const savedDraft = loadDraft();
      if (savedDraft) {
        setFormData(prev => ({ ...prev, content: savedDraft }));
        toast({
          title: "Draft restored",
          description: "Your previous work has been recovered",
        });
      }
    }
  }, [loading, loadDraft]);

  // Check if moderator should see admin edit banner
  const shouldShowAdminBanner = !isAdmin && isModerator && metadata.hasAdminEdits && !dismissedAdminBanner && metadata.lastAdminEdit;

  useEffect(() => {
    if (!roleLoading && !isAdmin && !isModerator) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [roleLoading, isAdmin, isModerator]);

  useEffect(() => {
    if (!roleLoading && (isAdmin || isModerator)) {
      const loadData = async () => {
        // Fetch all data in parallel
        const promises = [fetchCategories(), fetchTags()];

        if (id) {
          promises.push(fetchPost(id));
          promises.push(fetchPostTags(id));
        }

        await Promise.all(promises);

        // Only set loading to false after all data is loaded (for new posts)
        if (!id) {
          setLoading(false);
        }
      };

      loadData();
    }
  }, [id, isAdmin, isModerator, roleLoading]);

  // Auto-populate course and lesson from URL query params (when navigating from LessonManager)
  useEffect(() => {
    if (!id && !roleLoading && (isAdmin || isModerator)) {
      const courseIdFromUrl = searchParams.get('courseId');
      const lessonIdFromUrl = searchParams.get('lessonId');
      
      if (courseIdFromUrl || lessonIdFromUrl) {
        setFormData(prev => ({
          ...prev,
          category_id: courseIdFromUrl || prev.category_id,
          lesson_id: lessonIdFromUrl || prev.lesson_id,
        }));
      }
    }
  }, [id, searchParams, roleLoading, isAdmin, isModerator]);

  // Fetch lessons when course changes
  useEffect(() => {
    if (formData.category_id) {
      fetchCourseLessons(formData.category_id);
    } else {
      setCourseLessons([]);
    }
  }, [formData.category_id]);

  // Reset version sync when navigating between posts
  useEffect(() => {
    setDidSyncLatestVersion(false);
  }, [id]);

  // By default, load the most recently edited version into the editor
  useEffect(() => {
    if (!id || versionsLoading || didSyncLatestVersion) return;
    if (versions.length === 0) return;

    const latest = versions[0];
    setFormData((prev) => ({ ...prev, content: latest.content }));
    setOriginalContent(latest.content);
    previousContentRef.current = latest.content;

    setDidSyncLatestVersion(true);
  }, [id, versionsLoading, versions, didSyncLatestVersion]);
  const fetchCategories = async () => {
    try {
      let query = supabase
        .from("courses")
        .select("*")
        .order("name");

      // For moderators (non-admins), only show courses they created or are assigned to
      if (isModerator && !isAdmin && userId) {
        query = query.or(`author_id.eq.${userId},assigned_to.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
    }
  };


  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");

      if (error) throw error;
      setAllTags(data || []);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchCourseLessons = async (courseId: string) => {
    if (!courseId) {
      setCourseLessons([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, title, lesson_rank")
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("lesson_rank");

      if (error) throw error;
      setCourseLessons(data || []);
    } catch (error: any) {
      console.error("Error fetching course lessons:", error);
      setCourseLessons([]);
    }
  };

  const fetchPostTags = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("post_tags")
        .select("tag_id, tags(id, name, slug)")
        .eq("post_id", postId);

      if (error) throw error;
      
      const tags = data?.map(item => (item.tags as any)) || [];
      setSelectedTags(tags);
    } catch (error: any) {
      console.error("Error fetching post tags:", error);
    }
  };

  const fetchPost = async (postId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) throw error;
      
      if (data) {
        // Check if moderator is trying to edit someone else's post
        if (isModerator && !isAdmin && data.author_id !== userId) {
          toast({
            title: "Access Denied",
            description: "You can only edit your own posts",
            variant: "destructive",
          });
          navigate("/admin/posts");
          return;
        }

        setOriginalAuthorId(data.author_id);

        // Avoid overwriting content if the editor already synced the latest version.
        // This prevents the editor from briefly showing the DB content and then swapping.
        setFormData((prev) => ({
          ...prev,
          title: data.title || "",
          slug: data.slug || "",
          excerpt: data.excerpt || "",
          content: prev.content ? prev.content : (data.content || ""),
          featured_image: data.featured_image || "",
          category_id: data.category_id || "",
          lesson_id: data.lesson_id || "",
          status: (data.status as any) || "draft",
          code_theme: data.code_theme || "",
        }));

        // Store original post content (used to infer the live/published version in history)
        setPostDbContent(data.content || "");

        // Store original content for change detection (don't override if versions already set it)
        setOriginalContent((prev) => prev || (data.content || ""));
        if (!previousContentRef.current) {
          previousContentRef.current = data.content || "";
        }

      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load post",
        variant: "destructive",
      });
      navigate("/admin/posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (submitForApproval: boolean = false) => {
    try {
      setLoading(true);
      
      // Determine status - Moderators can only create drafts or submit for approval
      let status = formData.status;
      if (isModerator && !isAdmin) {
        // Moderators can only set draft or pending status
        if (submitForApproval) {
          status = "pending";
        } else {
          status = "draft";
        }
      } else if (submitForApproval) {
        status = "pending";
      }

      const validated = postSchema.parse({ ...formData, status });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const postData = {
        title: validated.title,
        slug: validated.slug,
        excerpt: validated.excerpt || null,
        content: validated.content,
        featured_image: validated.featured_image || null,
        category_id: validated.category_id || null,
        lesson_id: formData.lesson_id || null,
        status: validated.status,
        author_id: originalAuthorId || session.user.id,
        published_at: validated.status === "published" ? new Date().toISOString() : null,
        code_theme: formData.code_theme || null,
      };

      let postId = id;
      const isPublishing = validated.status === "published";

      if (id) {
        // Update existing post
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", id);

        if (error) throw error;

        // Save version on publish (every publish creates a new version)
        if (isPublishing) {
          await saveVersionOnPublish(
            formData.content,
            "canvas"
          );
        } else if (formData.content !== previousContentRef.current) {
          // Save draft version if content changed but not publishing
          await saveVersionAsDraft(
            formData.content,
            "canvas"
          );
        }
        previousContentRef.current = formData.content;
      } else {
        // Create new post - ensure unique slug
        const uniqueSlug = await generateUniqueSlug(validated.slug, validated.category_id || null);
        postData.slug = uniqueSlug;
        
        const { data: newPost, error } = await supabase
          .from("posts")
          .insert([postData])
          .select()
          .single();

        if (error) throw error;
        postId = newPost.id;

        // Always create v0 as initial version
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession?.user && postId) {
          await supabase
            .from("post_versions")
            .insert({
              post_id: postId,
              version_number: 0,
              content: formData.content,
              editor_type: "canvas",
              edited_by: currentSession.user.id,
              editor_role: isAdmin ? "admin" : "moderator",
              change_summary: "Initial version (v0)",
              is_published: isPublishing,
            });
        }
      }

      // Save tags
      if (postId) {
        await savePostTags(postId);
      }

      // Auto-create sub_topic for the lesson when post is assigned to a lesson
      if (formData.lesson_id && postId) {
        // Get the course_id from the lesson
        const { data: lessonData } = await supabase
          .from("course_lessons")
          .select("course_id")
          .eq("id", formData.lesson_id)
          .single();

        if (lessonData?.course_id) {
          // Check if a sub_topic already exists for this lesson
          const { data: existingSubTopic } = await supabase
            .from("sub_topics")
            .select("id")
            .eq("lesson_id", formData.lesson_id)
            .limit(1)
            .single();

          // Only create if no sub_topic exists for this lesson
          if (!existingSubTopic) {
            // Get the linked practice skill for this course
            const { data: linkedSkill } = await supabase
              .from("practice_skills")
              .select("id")
              .eq("course_id", lessonData.course_id)
              .single();

            if (linkedSkill) {
              // Use the post title for the sub-topic name
              await supabase.from("sub_topics").insert({
                lesson_id: formData.lesson_id,
                skill_id: linkedSkill.id,
                title: validated.title,
                display_order: 0,
                is_default: true,
                created_by: session.user.id,
              });
            }
          }
        }
      }

      // Record approval history if submitting for approval
      if (submitForApproval && postId) {
        await supabase.from("approval_history").insert({
          content_type: "post",
          content_id: postId,
          action: "submitted",
          performed_by: session.user.id,
        });
      }

      // Clear auto-saved draft on successful save
      clearDraft();

      toast({
        title: "Success",
        description: submitForApproval 
          ? "Post submitted for approval" 
          : (id ? "Post updated successfully" : "Post created successfully"),
      });

      navigate("/admin/posts");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const savePostTags = async (postId: string) => {
    try {
      // Delete existing tags
      await supabase
        .from("post_tags")
        .delete()
        .eq("post_id", postId);

      // Insert new tags
      if (selectedTags.length > 0) {
        const postTagsData = selectedTags.map(tag => ({
          post_id: postId,
          tag_id: tag.id,
        }));

        const { error } = await supabase
          .from("post_tags")
          .insert(postTagsData);

        if (error) throw error;
      }
    } catch (error: any) {
      console.error("Error saving post tags:", error);
      throw error;
    }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim()) return;

    const tagName = tagInput.trim();
    const tagSlug = generateSlug(tagName);

    // Check if tag already exists
    let tag = allTags.find(t => t.slug === tagSlug);

    if (!tag) {
      // Create new tag
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase
          .from("tags")
          .insert([{ 
            name: tagName, 
            slug: tagSlug,
            author_id: session?.user.id,
            status: isAdmin ? "approved" : "pending"
          }])
          .select()
          .single();

        if (error) throw error;
        tag = data;
        setAllTags([...allTags, data]);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to create tag",
          variant: "destructive",
        });
        return;
      }
    }

    // Add tag to selected tags if not already added
    if (tag && !selectedTags.find(t => t.id === tag.id)) {
      setSelectedTags([...selectedTags, tag]);
    }

    setTagInput("");
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(t => t.id !== tagId));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Generate a unique slug by appending a suffix if the slug already exists within the same course
  const generateUniqueSlug = async (baseSlug: string, courseId: string | null): Promise<string> => {
    if (!courseId) {
      return baseSlug; // No course means no duplicate check needed
    }

    // Check if the slug already exists in this course
    const { data: existingPost } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", baseSlug)
      .eq("category_id", courseId)
      .maybeSingle();

    if (!existingPost) {
      return baseSlug;
    }

    // Find posts with similar slugs in this course (baseSlug or baseSlug-N pattern)
    const { data: similarPosts } = await supabase
      .from("posts")
      .select("slug")
      .eq("category_id", courseId)
      .ilike("slug", `${baseSlug}%`);

    if (!similarPosts || similarPosts.length === 0) {
      return baseSlug;
    }

    // Extract numbers from existing slugs and find the highest
    const suffixPattern = new RegExp(`^${baseSlug}-(\\d+)$`);
    let maxSuffix = 0;

    similarPosts.forEach(post => {
      const match = post.slug.match(suffixPattern);
      if (match) {
        maxSuffix = Math.max(maxSuffix, parseInt(match[1], 10));
      }
    });

    return `${baseSlug}-${maxSuffix + 1}`;
  };

  // Check if moderator can only save as draft or submit for approval
  const canPublishDirectly = isAdmin;
  const showSubmitForApproval = isModerator && !isAdmin;

  // Handle text selection for annotations (admin only)
  // Handle text selection for annotations (admin and moderators)
  const handleTextSelection = useCallback((type: "paragraph" | "code" | "conversation" = "paragraph", bubbleIndex?: number) => {
    // Admins and moderators can annotate anything
    if (!isAdmin && !isModerator) return;
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      setSelectedText({
        start: range.startOffset,
        end: range.endOffset,
        text,
        type,
        bubbleIndex,
      });
    }
  }, [isAdmin, isModerator]);

  // Handle version actions
  const handleRestoreVersion = async (version: any) => {
    const restoredContent = await restoreVersion(version);
    if (restoredContent) {
      setFormData(prev => ({ ...prev, content: restoredContent }));
      toast({
        title: "Version Restored",
        description: `Restored to version ${version.version_number}`,
      });
    }
  };

  const handlePublishVersion = async (version: any) => {
    const success = await publishVersion(version.id, version.content);
    if (success) {
      setFormData(prev => ({ ...prev, content: version.content, status: "published" }));
    }
  };

  const handlePreviewVersion = (version: any) => {
    setPreviewVersion(version);
    setShowPreviewDialog(true);
  };

  // Get the currently published version for comparison
  const publishedVersion = versions.find(v => v.status === "published");
  const hasContentChanges = formData.content !== originalContent && originalContent !== "";

  // Create a mock version object for the current editor content
  const currentEditorVersion = {
    id: "current",
    post_id: id || "",
    version_number: versions.length > 0 ? Math.max(...versions.map(v => v.version_number)) + 1 : 1,
    content: formData.content,
    editor_type: "canvas",
    edited_by: userId || "",
    editor_role: isAdmin ? "admin" : "moderator",
    created_at: new Date().toISOString(),
    status: "draft",
    change_summary: null,
    versioning_note_type: null,
    versioning_note_locked: false,
    editor_profile: undefined,
  } as PostVersion;

  // Handle publish with preview
  const handlePublishWithPreview = () => {
    if (hasContentChanges && publishedVersion) {
      setShowPublishPreviewDialog(true);
    } else {
      // No changes to show, just publish directly
      handleConfirmPublish();
    }
  };

  const handleConfirmPublish = async () => {
    setShowPublishPreviewDialog(false);
    setFormData(prev => ({ ...prev, status: "published" }));
    // Wait for state update then submit
    setTimeout(() => {
      handleSubmit(false);
    }, 0);
  };

  // Handle annotation creation with type support
  const handleAddAnnotation = async (
    selectionStart: number,
    selectionEnd: number,
    selectedTextStr: string,
    comment: string,
    annotationType?: "paragraph" | "code" | "conversation"
  ) => {
    // Get bubble index from selected text if it's a conversation annotation
    const bubbleIndex = selectedText?.bubbleIndex;
    
    await createAnnotation(
      selectionStart,
      selectionEnd,
      selectedTextStr,
      comment,
      "rich-text",
      bubbleIndex
    );
  };

  // Check if content has admin edits (different from original)
  const hasAdminEdits = isAdmin && id && formData.content !== originalContent && originalContent !== "";

  const editorInitLoading =
    roleLoading ||
    loading ||
    (id ? versionsLoading || (versions.length > 0 && !didSyncLatestVersion) : false);

  if (editorInitLoading) {
    return (
      <AdminEditorSkeleton type="post" />
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-4rem)] overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <Tabs defaultValue={id ? "content" : "details"} className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/admin/posts")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Posts
              </Button>
              <h1 className="text-3xl font-bold">
                {id ? "Edit Post" : "Create New Post"}
              </h1>
              {formData.status && formData.status !== "draft" && (
                <ContentStatusBadge status={formData.status as ContentStatus} />
              )}
              {/* Autosave Status Indicator */}
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving…</span>
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </div>
              )}
            </div>
            <TabsList>
              <TabsTrigger value="details" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Post Details
              </TabsTrigger>
              <TabsTrigger value="content" className="gap-1.5">
                Content
                {annotationMode && <Highlighter className="h-3 w-3 text-primary" />}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Admin edit notification banner for moderators */}
          {shouldShowAdminBanner && metadata.lastAdminEdit && (
            <AdminEditBanner
              lastAdminEdit={metadata.lastAdminEdit}
              onViewChanges={() => setShowAdminChangesDialog(true)}
              onDismiss={() => setDismissedAdminBanner(true)}
            />
          )}


          {/* Open annotations indicator */}
          {annotations.filter(a => a.status === "open").length > 0 && !isAdmin && (
            <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-red-800 dark:text-red-200">
                You have {annotations.filter(a => a.status === "open").length} pending feedback comments from admin. Check the Annotations panel.
              </span>
            </div>
          )}

          <TabsContent value="details" className="space-y-4 mt-0 flex-1 overflow-y-auto">
              <div>
                <Label htmlFor="title" className="text-base">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (!id) {
                      setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                    }
                  }}
                  placeholder="Enter post title..."
                  className="text-lg h-12"
                />
              </div>

              <div>
                <Label htmlFor="slug" className="text-base">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="post-url-slug"
                />
              </div>

              <div>
                <Label htmlFor="excerpt" className="text-base">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Brief description of the post..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Course</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value === "none" ? "" : value, lesson_id: "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No course</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.category_id && courseLessons.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="lesson">Lesson</Label>
                  <Select
                    value={formData.lesson_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, lesson_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a lesson" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No lesson</SelectItem>
                      {courseLessons.map((lesson, index) => (
                        <SelectItem key={lesson.id} value={lesson.id}>
                          #{index + 1} - {lesson.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            <TabsContent value="content" className="mt-4 flex-1 min-h-0 flex flex-col">
              <CanvasEditor
                ref={canvasEditorRef}
                value={formData.content}
                onChange={(value) => setFormData({ ...formData, content: value })}
                className="flex-1 min-h-0"
                lessonLabel={categories.find(c => c.id === formData.category_id)?.name}
              />
            </TabsContent>
          </Tabs>
          </div>

        {/* Right Sidebar with Vertical Tab Toggle */}
        <div className="flex-shrink-0 flex">
          {/* Vertical Tab Strip - Settings + Assets + Review */}
          <div className="flex flex-col bg-muted/50 border-y border-l rounded-l-md overflow-hidden divide-y">
            <button
              onClick={() => setOpenSidebar(openSidebar === 'settings' ? null : 'settings')}
              className={`flex flex-col items-center justify-start gap-1 py-3 px-1 transition-colors cursor-pointer ${openSidebar === 'settings' ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
                Settings
              </span>
            </button>
            <button
              onClick={() => setOpenSidebar(openSidebar === 'assets' ? null : 'assets')}
              className={`flex flex-col items-center justify-start gap-1 py-3 px-1 transition-colors cursor-pointer ${openSidebar === 'assets' ? 'bg-muted' : 'hover:bg-muted'}`}
            >
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
                Assets
              </span>
            </button>
            {id && (
              <button
                onClick={() => setOpenSidebar(openSidebar === 'review' ? null : 'review')}
                className={`flex flex-col items-center justify-start gap-1 py-3 px-1 transition-colors cursor-pointer ${openSidebar === 'review' ? 'bg-muted' : 'hover:bg-muted'}`}
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
                  Review
                </span>
              </button>
            )}
          </div>

          {/* Sidebar Content */}
          <Card className={`flex flex-col min-h-0 rounded-l-none border-l-0 ${rightSidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-0 p-0'}`}>
            <div className={`p-4 border-b flex-shrink-0 ${!rightSidebarOpen ? 'hidden' : ''}`}>
              {openSidebar === 'review' ? (
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm whitespace-nowrap">Review Panel</h3>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm whitespace-nowrap">Post Settings</h3>
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
                      versions={versions}
                      loading={versionsLoading}
                      isAdmin={isAdmin}
                      currentContent={formData.content}
                      liveContent={postDbContent}
                      onRestore={handleRestoreVersion}
                      onPublish={handlePublishVersion}
                      onPreview={handlePreviewVersion}
                      onUpdateNote={updateVersionNote}
                    />
                  </div>
                  <div className="[&>*]:w-full">
                    <AnnotationPanel
                      annotations={annotations}
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
                    {id && hasContentChanges && formData.status === "published" ? (
                      <Button
                        onClick={handlePublishWithPreview}
                        disabled={loading}
                        className="w-full"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Publish Changes
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                        className="w-full"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {id ? "Update" : "Publish"}
                      </Button>
                    )}
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
                    <Button
                      onClick={() => handleSubmit(false)}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save Draft
                    </Button>
                    {showSubmitForApproval && (
                      <Button
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                        className="w-full"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Submit for Approval
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  onClick={() => navigate("/admin/posts")}
                  disabled={loading}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>}
            </div>

            <ScrollArea className={`flex-1 min-h-0 ${!rightSidebarOpen || openSidebar === 'review' ? 'hidden' : ''}`}>
              <div className="p-4 space-y-4">
                {/* Status - Only show to admins */}
                {canPublishDirectly && (
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending Approval</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="changes_requested">Changes Requested</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="featured_image">Featured Image URL</Label>
                  <Input
                    id="featured_image"
                    value={formData.featured_image}
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                    placeholder="https://..."
                  />
                </div>


                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                      placeholder="Add a tag..."
                    />
                    <Button type="button" onClick={handleAddTag} size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="gap-1">
                        {tag.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveTag(tag.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </Card>

          {/* Assets Sidebar */}
          <AssetsSidebar
            isOpen={openSidebar === 'assets'}
            editorType="canvas"
            onInsert={(asset) => {
              if (asset.type === 'block' && asset.blockKind && canvasEditorRef.current) {
                canvasEditorRef.current.addBlock(asset.blockKind);
              } else {
                navigator.clipboard.writeText(asset.url);
                toast({ title: "URL copied", description: "Paste it into the editor." });
              }
            }}
          />
        </div>

      {/* Version Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Version {previewVersion?.version_number} Preview</DialogTitle>
            <DialogDescription>
              Preview of content from this version
            </DialogDescription>
          </DialogHeader>
          <div className="prose dark:prose-invert max-w-none mt-4">
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewVersion?.content || "") }} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Changes Side-by-Side Dialog */}
      <Dialog open={showAdminChangesDialog} onOpenChange={setShowAdminChangesDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Admin Changes Review</DialogTitle>
            <DialogDescription>
              Compare the previous version with the admin's updates
            </DialogDescription>
          </DialogHeader>
          {metadata.lastAdminEdit && versions.length >= 2 && (
            <SideBySideComparison
              oldVersion={versions.find(v => v.version_number === metadata.lastAdminEdit!.version_number - 1) || versions[1]}
              newVersion={metadata.lastAdminEdit}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Publish Changes Preview Dialog */}
      <Dialog open={showPublishPreviewDialog} onOpenChange={setShowPublishPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Review Changes Before Publishing
            </DialogTitle>
            <DialogDescription>
              Review the differences between the current published version and your changes
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="side-by-side" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-fit">
              <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
              <TabsTrigger value="inline">Inline Diff</TabsTrigger>
            </TabsList>
            
            <TabsContent value="side-by-side" className="flex-1 overflow-hidden mt-4">
              {publishedVersion && (
                <SideBySideComparison
                  oldVersion={publishedVersion}
                  newVersion={currentEditorVersion}
                />
              )}
            </TabsContent>
            
            <TabsContent value="inline" className="flex-1 overflow-hidden mt-4">
              {publishedVersion && (
                <VersionDiffViewer
                  currentVersion={currentEditorVersion}
                  compareVersion={publishedVersion}
                />
              )}
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPublishPreviewDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPublish}
              disabled={loading}
            >
              <Send className="mr-2 h-4 w-4" />
              Confirm & Publish
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Versioning Note Dialog */}
      <VersioningNoteDialog
        open={showVersioningNoteDialog}
        onOpenChange={setShowVersioningNoteDialog}
        loading={savingDraft}
        onSave={async (noteType: VersioningNoteType, changeSummary: string) => {
          setSavingDraft(true);
          try {
            const saved = await saveVersionAsDraft(
              formData.content,
              "canvas",
              changeSummary,
              noteType
            );

            if (saved) {
              previousContentRef.current = formData.content;
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
    </div>
  );
};

export default AdminPostEditor;
