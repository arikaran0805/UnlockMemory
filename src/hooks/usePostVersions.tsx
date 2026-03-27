import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export type VersionStatus = "draft" | "published" | "archived";

export interface PostVersion {
  id: string;
  post_id: string;
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
  lastAdminEdit?: PostVersion;
  originalAuthorRole: "admin" | "moderator" | null;
}

export const usePostVersions = (postId: string | undefined) => {
  const [versions, setVersions] = useState<PostVersion[]>([]);
  // Start in loading state when editing an existing post to prevent UI flicker
  // while the latest version is fetched and synced.
  const [loading, setLoading] = useState(!!postId);
  const [currentVersion, setCurrentVersion] = useState<PostVersion | null>(null);
  const [metadata, setMetadata] = useState<VersionMetadata>({
    hasAdminEdits: false,
    lastAdminEdit: undefined,
    originalAuthorRole: null,
  });
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  const fetchVersions = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_versions")
        .select("*")
        .eq("post_id", postId)
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
          } as PostVersion;
        })
      );

      setVersions(versionsWithProfiles);

      // Compute metadata
      const adminEdits = versionsWithProfiles.filter(v => v.editor_role === "admin");
      const hasAdminEdits = adminEdits.length > 0;
      const lastAdminEdit = adminEdits[0];
      
      // First version determines original author role
      const firstVersion = versionsWithProfiles[versionsWithProfiles.length - 1];
      const originalAuthorRole = firstVersion?.editor_role || null;

      setMetadata({
        hasAdminEdits,
        lastAdminEdit,
        originalAuthorRole,
      });
    } catch (error: any) {
      console.error("Error fetching versions:", error);
    } finally {
      setLoading(false);
    }
  }, [postId]);

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
    if (!postId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      // Get the next version number (start at 0)
      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) + 1 
        : 0;

      // Determine editor role
      const editorRole = isAdmin ? "admin" : "moderator";

      // If marking as published, archive other published versions first
      if (markAsPublished) {
        await supabase
          .from("post_versions")
          .update({ status: "archived" })
          .eq("post_id", postId)
          .eq("status", "published");
      }

      // Default change summary based on action
      const defaultSummary = markAsPublished 
        ? `Published as v${nextVersionNumber}` 
        : `Draft saved (v${nextVersionNumber})`;

      // Determine status
      const status: VersionStatus = markAsPublished ? "published" : "draft";

      const { data, error } = await supabase
        .from("post_versions")
        .insert({
          post_id: postId,
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
      console.error("Error saving version:", error);
      toast({
        title: "Error",
        description: "Failed to save version",
        variant: "destructive",
      });
      return null;
    }
  };

  // Save version as draft (not published)
  const saveVersionAsDraft = async (
    content: string,
    editorType: "rich-text" | "chat" | "canvas",
    changeSummary?: string,
    versioningNoteType?: string
  ) => {
    return saveVersion(content, editorType, changeSummary, false, versioningNoteType);
  };

  // Save version on publish (creates a new version and marks it as published)
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

  // Create initial v0 when post is first saved
  const createInitialVersion = async (
    content: string,
    editorType: "rich-text" | "chat" | "canvas",
    postId: string
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      const editorRole = isAdmin ? "admin" : "moderator";

      const { data, error } = await supabase
        .from("post_versions")
        .insert({
          post_id: postId,
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
      console.error("Error creating initial version:", error);
      return null;
    }
  };

  const publishVersion = async (versionId: string, postContent: string) => {
    if (!postId) return false;

    try {
      // Update post content with this version's content
      const { error: postError } = await supabase
        .from("posts")
        .update({ 
          content: postContent,
          status: "published",
          published_at: new Date().toISOString()
        })
        .eq("id", postId);

      if (postError) throw postError;

      // Archive any currently published versions
      await supabase
        .from("post_versions")
        .update({ status: "archived" })
        .eq("post_id", postId)
        .eq("status", "published");

      // Mark this version as published
      const { error: versionError } = await supabase
        .from("post_versions")
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
      console.error("Error publishing version:", error);
      toast({
        title: "Error",
        description: "Failed to publish version",
        variant: "destructive",
      });
      return false;
    }
  };

  const restoreVersion = async (version: PostVersion) => {
    setCurrentVersion(version);
    return version.content;
  };

  // Update versioning note for a specific version
  const updateVersionNote = async (
    versionId: string,
    versioningNoteType: string | null,
    changeSummary: string | null
  ) => {
    try {
      // Check if the note is locked
      const version = versions.find(v => v.id === versionId);
      if (version?.versioning_note_locked) {
        toast({
          title: "Cannot edit",
          description: "This version's note is locked (published versions cannot be edited)",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from("post_versions")
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
      console.error("Error updating version note:", error);
      toast({
        title: "Error",
        description: "Failed to update version note",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get versions with admin changes after a specific version
  const getAdminChangesAfterVersion = (versionNumber: number): PostVersion[] => {
    return versions.filter(
      v => v.version_number > versionNumber && v.editor_role === "admin"
    );
  };

  // Check if moderator's content was edited by admin
  const wasEditedByAdmin = (moderatorVersionNumber: number): boolean => {
    return versions.some(
      v => v.version_number > moderatorVersionNumber && v.editor_role === "admin"
    );
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
    getAdminChangesAfterVersion,
    wasEditedByAdmin,
  };
};
