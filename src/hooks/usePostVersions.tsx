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
    markAsPublished: boolean = false
  ) => {
    if (!postId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");

      // Determine editor role
      const editorRole = isAdmin ? "admin" : "moderator";
      const normalizedContent = content.trim();

      // Draft path: keep a dedicated draft version separate from published ones.
      if (!markAsPublished) {
        const { data: latestDraftRows, error: latestDraftError } = await supabase
          .from("post_versions")
          .select("id, content, version_number")
          .eq("post_id", postId)
          .eq("status", "draft")
          .order("version_number", { ascending: false })
          .limit(1);

        if (latestDraftError) throw latestDraftError;

        const latestDraft = latestDraftRows?.[0];

        // No-op when draft content hasn't changed.
        if (latestDraft && (latestDraft.content || "").trim() === normalizedContent) {
          return latestDraft as any;
        }

        // If a draft already exists, update that draft instead of creating duplicates.
        if (latestDraft) {
          const { data, error } = await supabase
            .from("post_versions")
            .update({
              content,
              editor_type: editorType,
              edited_by: session.user.id,
              editor_role: editorRole,
              status: "draft",
              is_published: false,
            })
            .eq("id", latestDraft.id)
            .select()
            .single();

          if (error) throw error;
          await fetchVersions();
          return data;
        }

        // Otherwise create a new draft version.
        const { data: maxVersionRow } = await supabase
          .from("post_versions")
          .select("version_number")
          .eq("post_id", postId)
          .order("version_number", { ascending: false })
          .limit(1);
        const nextVersionNumber = (maxVersionRow?.[0]?.version_number ?? 0) + 1;

        const { data, error } = await supabase
          .from("post_versions")
          .insert({
            post_id: postId,
            version_number: nextVersionNumber,
            content,
            editor_type: editorType,
            edited_by: session.user.id,
            editor_role: editorRole,
            status: "draft",
            is_published: false,
          })
          .select()
          .single();

        if (error) throw error;
        await fetchVersions();
        return data;
      }

      // Publish path: promote the latest draft in place when available.
      const { data: latestDraftRows, error: latestDraftError } = await supabase
        .from("post_versions")
        .select("id, version_number")
        .eq("post_id", postId)
        .eq("status", "draft")
        .order("version_number", { ascending: false })
        .limit(1);

      if (latestDraftError) throw latestDraftError;

      const latestDraft = latestDraftRows?.[0];

      await supabase
        .from("post_versions")
        .update({ status: "archived", is_published: false })
        .eq("post_id", postId)
        .eq("status", "published");

      let data;
      let error;

      if (latestDraft) {
        const result = await supabase
          .from("post_versions")
          .update({
            content,
            editor_type: editorType,
            edited_by: session.user.id,
            editor_role: editorRole,
            status: "published",
            is_published: true,
          })
          .eq("id", latestDraft.id)
          .select()
          .single();

        data = result.data;
        error = result.error;
      } else {
        const { data: maxVersionRow2 } = await supabase
          .from("post_versions")
          .select("version_number")
          .eq("post_id", postId)
          .order("version_number", { ascending: false })
          .limit(1);
        const nextVersionNumber2 = (maxVersionRow2?.[0]?.version_number ?? 0) + 1;

        const result = await supabase
          .from("post_versions")
          .insert({
            post_id: postId,
            version_number: nextVersionNumber2,
            content,
            editor_type: editorType,
            edited_by: session.user.id,
            editor_role: editorRole,
            status: "published",
            is_published: true,
          })
          .select()
          .single();

        data = result.data;
        error = result.error;
      }

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
    editorType: "rich-text" | "chat" | "canvas"
  ) => {
    return saveVersion(content, editorType, false);
  };

  // Save version on publish (creates a new version and marks it as published)
  const saveVersionOnPublish = async (
    content: string,
    editorType: "rich-text" | "chat" | "canvas"
  ) => {
    return saveVersion(content, editorType, true);
  };

  // Create initial v1 when post is first saved
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
          version_number: 1,
          content,
          editor_type: editorType,
          edited_by: session.user.id,
          editor_role: editorRole,
          status: "draft",
          is_published: false,
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
        .update({ status: "archived", is_published: false })
        .eq("post_id", postId)
        .eq("status", "published");

      // Mark this version as published
      const { error: versionError } = await supabase
        .from("post_versions")
        .update({ status: "published", is_published: true })
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
    getAdminChangesAfterVersion,
    wasEditedByAdmin,
  };
};
