/**
 * useMediaLibrary – Supabase-backed media library hook
 *
 * Single source of truth for media assets in the editor sidebar.
 * Uses the existing `media` table + `site-assets` storage bucket
 * (same infrastructure as AdminMedia.tsx).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MediaItem {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  /** Set to true for items just uploaded in this session */
  isNew?: boolean;
}

interface UseMediaLibraryReturn {
  mediaItems: MediaItem[];
  isLoading: boolean;
  isUploading: boolean;
  uploadError: string | null;
  uploadMedia: (file: File) => Promise<MediaItem | null>;
  deleteMedia: (item: MediaItem) => Promise<boolean>;
  refreshLibrary: () => Promise<void>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export function useMediaLibrary(): UseMediaLibraryReturn {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const fetchedRef = useRef(false);

  // Resolve userId once
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        userIdRef.current = session.user.id;
        if (!fetchedRef.current) {
          fetchedRef.current = true;
          fetchMedia(session.user.id);
        }
      } else {
        setIsLoading(false);
      }
    });
  }, []);

  const fetchMedia = useCallback(async (userId?: string) => {
    const uid = userId || userIdRef.current;
    if (!uid) { setIsLoading(false); return; }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('user_id', uid)
      .like('file_type', 'image/%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setMediaItems(data.map(row => ({
        id: row.id,
        fileName: row.file_name,
        fileUrl: row.file_url,
        fileType: row.file_type,
        fileSize: row.file_size,
        createdAt: row.created_at,
      })));
    }
    setIsLoading(false);
  }, []);

  const refreshLibrary = useCallback(async () => {
    await fetchMedia();
  }, [fetchMedia]);

  const uploadMedia = useCallback(async (file: File): Promise<MediaItem | null> => {
    setUploadError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(`Unsupported file type: ${file.type.split('/')[1] || 'unknown'}. Use JPG, PNG, GIF, WebP, or SVG.`);
      return null;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 10MB.`);
      return null;
    }

    const userId = userIdRef.current;
    if (!userId) {
      setUploadError('Not authenticated.');
      return null;
    }

    setIsUploading(true);

    try {
      // Generate unique filename (same pattern as AdminMedia.tsx)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from('site-assets')
        .upload(filePath, file);

      if (uploadErr) {
        setUploadError(`Upload failed: ${uploadErr.message}`);
        setIsUploading(false);
        return null;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      // Insert into media table
      const { data: dbData, error: dbErr } = await supabase
        .from('media')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          user_id: userId,
        })
        .select()
        .single();

      if (dbErr) {
        setUploadError(`Failed to save: ${dbErr.message}`);
        setIsUploading(false);
        return null;
      }

      const newItem: MediaItem = {
        id: dbData.id,
        fileName: dbData.file_name,
        fileUrl: dbData.file_url,
        fileType: dbData.file_type,
        fileSize: dbData.file_size,
        createdAt: dbData.created_at,
        isNew: true,
      };

      // Optimistic prepend — new item appears at top instantly
      setMediaItems(prev => [newItem, ...prev]);
      setIsUploading(false);
      return newItem;
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed unexpectedly.');
      setIsUploading(false);
      return null;
    }
  }, []);

  const deleteMedia = useCallback(async (item: MediaItem): Promise<boolean> => {
    // Optimistic remove from local state
    setMediaItems(prev => prev.filter(m => m.id !== item.id));

    try {
      // Remove from storage
      const urlParts = item.fileUrl.split('/site-assets/');
      if (urlParts.length > 1) {
        await supabase.storage.from('site-assets').remove([urlParts[1]]);
      }

      // Remove from DB
      const { error } = await supabase.from('media').delete().eq('id', item.id);
      if (error) {
        // Re-fetch on failure to restore state
        await fetchMedia();
        return false;
      }
      return true;
    } catch {
      await fetchMedia();
      return false;
    }
  }, [fetchMedia]);

  return {
    mediaItems,
    isLoading,
    isUploading,
    uploadError,
    uploadMedia,
    deleteMedia,
    refreshLibrary,
  };
}
