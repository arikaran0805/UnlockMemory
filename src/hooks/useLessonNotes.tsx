import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useNotesSyncBridge } from "@/hooks/useNotesSyncBridge";
import { appendTipTapContent } from "@/lib/tiptapMigration";

interface UseLessonNotesOptions {
  lessonId: string | undefined;
  courseId: string | undefined;
  userId: string | undefined;
}

/**
 * FIX v2: Added proper lesson switching guards to prevent content leaking between notes.
 * 
 * Key fixes:
 * 1. Track which lessonId the debounced content belongs to
 * 2. Reset all save-related refs immediately on lesson switch
 * 3. Validate lessonId in save effect before saving
 * 4. Prevent saves during lesson transition period
 */
export function useLessonNotes({ lessonId, courseId, userId }: UseLessonNotesOptions) {
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [noteId, setNoteId] = useState<string | null>(null);
  const debouncedContent = useDebounce(content, 1000);
  const initialLoadRef = useRef(true);
  const isRemoteUpdateRef = useRef(false);
  const lastSavedContentRef = useRef<string>("");
  const contentRef = useRef<string>("");
  const pendingRemoteUpdateRef = useRef<{ content: string; updatedAt: string } | null>(null);
  
  /**
   * FIX: Track which lessonId the current content/debouncedContent belongs to
   * This prevents saving stale content to a newly selected lesson's note
   */
  const contentForLessonIdRef = useRef<string | undefined>(undefined);
  
  /**
   * FIX: Flag to prevent saves during lesson transition
   */
  const isTransitioningRef = useRef(false);

  // Keep a ref of the latest content for conflict checks inside callbacks
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Handle remote updates from other tabs (Deep Notes)
  const handleRemoteUpdate = useCallback((remoteContent: string, updatedAt: string) => {
    // CRITICAL: Ignore if we're still loading to prevent race conditions
    if (initialLoadRef.current) return;

    // SAFETY: Never overwrite unsaved local edits (prevents "content disappears" while typing)
    // If the user is actively editing, queue the remote update and apply it only after
    // local content is saved (or returns to a non-dirty state).
    const isDirty = contentRef.current !== lastSavedContentRef.current;
    if (isDirty) {
      const existing = pendingRemoteUpdateRef.current;
      const existingTime = existing ? new Date(existing.updatedAt).getTime() : 0;
      const incomingTime = new Date(updatedAt).getTime();

      if (!existing || incomingTime > existingTime) {
        pendingRemoteUpdateRef.current = { content: remoteContent, updatedAt };
      }
      setIsSyncing(true);
      return;
    }
    
    // Mark that this is a remote update to prevent broadcast echo
    isRemoteUpdateRef.current = true;
    setContent(remoteContent);
    lastSavedContentRef.current = remoteContent;
    setLastSaved(new Date(updatedAt));
    setIsSyncing(false);
    
    // Reset flag after state update
    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, []);

  // Apply any queued remote update once we are no longer dirty
  useEffect(() => {
    if (initialLoadRef.current) return;
    if (isRemoteUpdateRef.current) return;

    const pending = pendingRemoteUpdateRef.current;
    if (!pending) return;

    const isDirty = contentRef.current !== lastSavedContentRef.current;
    if (isDirty) return;

    pendingRemoteUpdateRef.current = null;
    isRemoteUpdateRef.current = true;
    setContent(pending.content);
    lastSavedContentRef.current = pending.content;
    setLastSaved(new Date(pending.updatedAt));
    setIsSyncing(false);

    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, [content]);

  // Handle note created in other tab
  const handleNoteCreated = useCallback((newNoteId: string, newLessonId: string) => {
    // Ignore if loading to prevent race conditions
    if (initialLoadRef.current) return;
    
    if (newLessonId === lessonId) {
      setNoteId(newNoteId);
      setIsSyncing(false);
    }
  }, [lessonId]);

  // Handle note deleted in other tab
  const handleNoteDeleted = useCallback((deletedNoteId: string) => {
    if (noteId === deletedNoteId) {
      setNoteId(null);
      setContent("");
      lastSavedContentRef.current = "";
      contentForLessonIdRef.current = undefined; // FIX: Clear content ownership
      setLastSaved(null);
    }
  }, [noteId]);

  // Set up cross-tab sync bridge - use state-based noteId for reactivity
  const { broadcastUpdate, broadcastCreated, updateLocalTimestamp } = useNotesSyncBridge({
    noteId,
    lessonId,
    courseId,
    userId,
    source: 'quick-notes',
    onRemoteUpdate: handleRemoteUpdate,
    onNoteCreated: handleNoteCreated,
    onNoteDeleted: handleNoteDeleted,
  });

  // Reset state immediately when lessonId changes to prevent stale data
  useEffect(() => {
    // FIX: Mark as transitioning to prevent stale saves
    isTransitioningRef.current = true;
    
    // Reset everything before loading new note
    initialLoadRef.current = true;
    setNoteId(null);
    setContent("");
    lastSavedContentRef.current = "";
    contentForLessonIdRef.current = lessonId; // FIX: Track content ownership
    setLastSaved(null);
    pendingRemoteUpdateRef.current = null;
    
    if (!lessonId || !userId) {
      setIsLoading(false);
      isTransitioningRef.current = false;
      return;
    }

    const loadNote = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("lesson_notes")
          .select("id, content, updated_at")
          .eq("lesson_id", lessonId)
          .eq("user_id", userId)
          .maybeSingle();

        if (error) throw error;

        // ROOT CAUSE 2 FIX: User navigated to a different lesson while this fetch was
        // in-flight. Committing stale results would corrupt lastSavedContentRef and
        // noteId for the lesson the user is now actually viewing.
        if (contentForLessonIdRef.current !== lessonId) return;

        if (data) {
          setNoteId(data.id);
          setContent(data.content || "");
          lastSavedContentRef.current = data.content || "";
          contentForLessonIdRef.current = lessonId;
          setLastSaved(new Date(data.updated_at));
          updateLocalTimestamp(data.updated_at);
        } else {
          setNoteId(null);
          setContent("");
          lastSavedContentRef.current = "";
          contentForLessonIdRef.current = lessonId;
          setLastSaved(null);
        }
      } catch (error) {
        console.error("Error loading lesson note:", error);
        if (contentForLessonIdRef.current !== lessonId) return;
        setNoteId(null);
        setContent("");
        lastSavedContentRef.current = "";
        contentForLessonIdRef.current = lessonId;
      } finally {
        setIsLoading(false);
        initialLoadRef.current = false;
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 100);
      }
    };

    loadNote();
  }, [lessonId, userId, updateLocalTimestamp]);

  /**
   * Auto-save on debounced content change
   */
  useEffect(() => {
    if (initialLoadRef.current || !lessonId || !courseId || !userId) return;
    if (debouncedContent === "" && !noteId) return; // Don't save empty new notes

    // ROOT CAUSE 1 FIX: debouncedContent lags 1 second behind content state.
    // When the user navigates to a new lesson, setContent("") fires and starts a
    // 1-second debounce. loadNote() completes within ~200ms and sets
    // lastSavedContentRef.current = actualContent. After the full second,
    // debouncedContent = "" fires and "" !== actualContent causes an empty-string
    // UPDATE that wipes the note. Guard: skip whenever debouncedContent is stale
    // (the live content has already moved past it).
    if (debouncedContent !== contentRef.current) return;

    if (isTransitioningRef.current) return;
    if (contentForLessonIdRef.current !== lessonId) return;
    if (isRemoteUpdateRef.current) return;
    if (debouncedContent === lastSavedContentRef.current) return;

    const saveNote = async () => {
      setIsSaving(true);
      const now = new Date().toISOString();
      
      try {
        if (noteId) {
          // Update existing note
          const { error } = await supabase
            .from("lesson_notes")
            .update({ content: debouncedContent, updated_at: now })
            .eq("id", noteId);

          if (error) throw error;
        } else if (debouncedContent.trim()) {
          // FIX: Double-check lesson hasn't changed during async gap
          if (contentForLessonIdRef.current !== lessonId) {
            console.debug('[useLessonNotes] Lesson changed before save started, aborting');
            setIsSaving(false);
            return;
          }
          
          // Create new lesson-contextual note
          const { data, error } = await supabase
            .from("lesson_notes")
            .insert({
              user_id: userId,
              lesson_id: lessonId,
              course_id: courseId,
              content: debouncedContent,
              entity_type: "lesson", // Required: lesson-contextual note
            })
            .select("id")
            .single();

          if (error) throw error;
          setNoteId(data.id);
          
          // Broadcast note creation to other tabs
          broadcastCreated(data.id, lessonId);
        }
        
        // FIX: Only update refs if we're still on the same lesson
        if (contentForLessonIdRef.current === lessonId) {
          lastSavedContentRef.current = debouncedContent;
          setLastSaved(new Date());
          
          // Broadcast update to other tabs (Deep Notes) with timestamp
          broadcastUpdate(debouncedContent, now);
        }
      } catch (error) {
        console.error("Error saving lesson note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, lessonId, courseId, userId, noteId, broadcastUpdate, broadcastCreated]);

  /**
   * FIX: Update content ownership when content changes from user input
   */
  const updateContent = useCallback((newContent: string) => {
    setContent(newContent);
    // Track that this content belongs to the currently selected lesson
    contentForLessonIdRef.current = lessonId;
  }, [lessonId]);

  /**
   * Append new content from Quick Notes scratchpad to the existing deep note.
   * Called when the Quick Notes card collapses — each session's text is added
   * as a new paragraph block below the previous accumulated content.
   */
  const appendToContent = useCallback((newContentJson: string) => {
    if (!newContentJson) return;
    const merged = appendTipTapContent(content, newContentJson);
    if (merged !== content) {
      updateContent(merged);
    }
  }, [content, updateContent]);

  return {
    content,
    updateContent,
    appendToContent,
    isSaving,
    isSyncing,
    lastSaved,
    isLoading,
    noteId,
  };
}

export default useLessonNotes;
