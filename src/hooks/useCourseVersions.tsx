import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export type VersionStatus = "draft" | "published" | "archived";

export interface CourseVersion {
  id: string;
  course_id: string;
  version_number: number;
  content: string;
  editor_type: string;
  edited_by: string;
  editor_role: "admin" | "moderator";
  created_at: string;
  status: VersionStatus;
  change_summary: string | null;
  versioning_note_type: string | null;
  versioning_note_locked: boolean;
  is_published: boolean | null;
  editor_profile?: {
    full_name: string | null;
    email: string;
  };
}

export interface VersionMetadata {
  hasAdminEdits: boolean;
  lastAdminEdit?: CourseVersion;
  originalAuthorRole: "admin" | "moderator" | null;
}

export const useCourseVersions = (courseId: string | undefined) => {
  const [versions, setVersions] = useState<CourseVersion[]>([]);
  const [loading, setLoading] = useState(!!courseId);
  const [currentVersion, setCurrentVersion] = useState<CourseVersion | null>(null);
  const [metadata, setMetadata] = useState<VersionMetadata>({
    hasAdminEdits: false,
    lastAdminEdit: undefined,
    originalAuthorRole: null,
  });
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  const fetchVersions = useCallback(async () => {
    if (!courseId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("course_versions")
        .select("*")
        .eq("course_id", courseId)
        .order("version_number", { ascending: false });

      if (error) throw error;

      // Fetch editor profiles separately
      const versionsWithProfiles = await Promise.all(
        (data || []).map(async (version) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", version.edited_by)
            .single();

          return {
            ...version,
            editor_role: version.editor_role || "moderator",
            editor_profile: profile || undefined,
          } as CourseVersion;
        })
      );

      setVersions(versionsWithProfiles);

      // Compute metadata
      const adminEdits = versionsWithProfiles.filter(v => v.editor_role === "admin");
      const hasAdminEdits = adminEdits.length > 0;
      const lastAdminEdit = adminEdits[0];
      
      const firstVersion = versionsWithProfiles[versionsWithProfiles.length - 1];
      const originalAuthorRole = firstVersion?.editor_role || null;

      setMetadata({
        hasAdminEdits,
        lastAdminEdit,
        originalAuthorRole,
      });
    } catch (error: any) {
      console.error("Error fetching course versions:", error);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const saveVersion = async (
    content: string,
    editorType: "rich-text" | "chat" | "canvas",
    changeSummary?: string,
    markAsPublished: boolean = false,
    versioningNoteType?: string
  ) => {
    if (!courseId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) + 1 
        : 0;

      const editorRole = isAdmin ? "admin" : "moderator";

      if (markAsPublished) {
        await supabase
          .from("course_versions")
          .update({ status: "archived" })
          .eq("course_id", courseId)
          .eq("status", "published");
      }

      const defaultSummary = markAsPublished 
        ? `Published as v${nextVersionNumber}` 
        : `Draft saved (v${nextVersionNumber})`;

      const status: VersionStatus = markAsPublished ? "published" : "draft";

      const { data, error } = await supabase
        .from("course_versions")
        .insert({
          course_id: courseId,
          version_number: nextVersionNumber,
          content,
          editor_type: editorType,
          edited_by: session.user.id,
          editor_role: editorRole,
          change_summary: changeSummary || defaultSummary,
          status,
          versioning_note_type: versioningNoteType || null,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchVersions();
      return data;
    } catch (error: any) {
      console.error("Error saving course version:", error);
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive",
      });
      return null;
    }
  };

  const saveVersionAsDraft = async (
    content: string,
    editorType: "rich-text" | "chat" | "canvas",
    changeSummary?: string,
    versioningNoteType?: string
  ) => {
    return saveVersion(content, editorType, changeSummary, false, versioningNoteType);
  };

  const saveVersionOnPublish = async (
    content: string,
    editorType: "rich-text" | "chat" | "canvas"
  ) => {
    const versionNumber = versions.length > 0 
      ? Math.max(...versions.map(v => v.version_number)) + 1 
      : 0;
    
    return saveVersion(
      content,
      editorType,
      `Published as v${versionNumber}`,
      true
    );
  };

  const createInitialVersion = async (
    content: string,
    editorType: "rich-text" | "chat" | "canvas",
    courseId: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const editorRole = isAdmin ? "admin" : "moderator";

      const { data, error } = await supabase
        .from("course_versions")
        .insert({
          course_id: courseId,
          version_number: 0,
          content,
          editor_type: editorType,
          edited_by: session.user.id,
          editor_role: editorRole,
          change_summary: "Initial version (v0)",
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error("Error creating initial course version:", error);
      return null;
    }
  };

  const publishVersion = async (versionId: string, courseContent: string) => {
    if (!courseId) return false;

    try {
      const { error: courseError } = await supabase
        .from("courses")
        .update({ 
          description: courseContent,
          status: "published",
        })
        .eq("id", courseId);

      if (courseError) throw courseError;

      await supabase
        .from("course_versions")
        .update({ status: "archived" })
        .eq("course_id", courseId)
        .eq("status", "published");

      const { error: versionError } = await supabase
        .from("course_versions")
        .update({ status: "published" })
        .eq("id", versionId);

      if (versionError) throw versionError;

      toast({
        title: "Published",
        description: "Version published successfully",
      });

      await fetchVersions();
      return true;
    } catch (error: any) {
      console.error("Error publishing course version:", error);
      toast({
        title: "Error",
        description: "Failed to publish version",
        variant: "destructive",
      });
      return false;
    }
  };

  const restoreVersion = async (version: CourseVersion) => {
    setCurrentVersion(version);
    return version.content;
  };

  const updateVersionNote = async (
    versionId: string,
    versioningNoteType: string | null,
    changeSummary: string | null
  ) => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (version?.versioning_note_locked) {
        toast({
          title: "Cannot edit",
          description: "This version's note is locked",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from("course_versions")
        .update({
          versioning_note_type: versioningNoteType,
          change_summary: changeSummary,
        })
        .eq("id", versionId);

      if (error) throw error;

      toast({
        title: "Note updated",
        description: "Version note has been updated",
      });

      await fetchVersions();
      return true;
    } catch (error: any) {
      console.error("Error updating course version note:", error);
      toast({
        title: "Error",
        description: "Failed to update version note",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    versions,
    loading,
    currentVersion,
    metadata,
    fetchVersions,
    saveVersion,
    saveVersionAsDraft,
    saveVersionOnPublish,
    createInitialVersion,
    publishVersion,
    restoreVersion,
    updateVersionNote,
  };
};
