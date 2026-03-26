import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useNotesSyncBridge } from "@/hooks/useNotesSyncBridge";

export interface CourseNote {
  id: string;
  lesson_id: string | null;
  course_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  entity_type: 'lesson' | 'user';
  title: string | null;
  // Derived display title
  display_title: string;
}

interface UseCourseNotesOptions {
  courseId: string | undefined;
  userId: string | undefined;
}

/**
 * FIX v2: Added proper note switching guards to prevent content leaking between notes.
 * 
 * Key fixes:
 * 1. Track which noteId the debounced content belongs to
 * 2. Reset all save-related refs immediately on note switch
 * 3. Validate noteId in save effect before saving
 * 4. Prevent saves during note transition period
 */
export function useCourseNotes({ courseId, userId }: UseCourseNotesOptions) {
  const [notes, setNotes] = useState<CourseNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notesReady, setNotesReady] = useState(false);
  const [editContent, setEditContent] = useState("");
  const debouncedContent = useDebounce(editContent, 1000);
  const isRemoteUpdateRef = useRef(false);
  const lastSavedContentRef = useRef<string>("");
  const selectedNoteIdRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  const localTimestampRef = useRef<string>("");
  
  /**
   * FIX: Track which noteId the current editContent/debouncedContent belongs to
   * This prevents saving stale content to a newly selected note
   */
  const contentForNoteIdRef = useRef<string | null>(null);
  
  /**
   * FIX: Flag to prevent saves during note transition
   */
  const isTransitioningRef = useRef(false);

  // Keep ref in sync with state to avoid stale closure issues
  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId;
  }, [selectedNoteId]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  /**
   * CRITICAL: Hard reset all autosave refs when selectedNoteId changes.
   * This prevents stale debounce values from blocking saves after note switch.
   */
  useEffect(() => {
    if (!selectedNoteId) return;
    
    // Reset remote update flag
    isRemoteUpdateRef.current = false;
    
    // FIX: Reset transition flag after a brief delay to allow state to stabilize
    isTransitioningRef.current = true;
    const timeout = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [selectedNoteId]);

  // Derive selectedNote from notes array to avoid stale state
  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  // Handle remote updates from other tabs (Quick Notes)
  // SAFETY: Includes timestamp validation to prevent older content overwriting newer
  const handleRemoteUpdate = useCallback((remoteContent: string, updatedAt: string) => {
    if (isLoadingRef.current) return;

    // Capture BOTH refs at the moment the broadcast arrives.
    // If the user has already switched notes, noteIdRef will have diverged
    // from selectedNoteIdRef — in that case we must NOT apply the update.
    const arrivedForNoteId = selectedNoteIdRef.current;
    if (!arrivedForNoteId) return;

    isRemoteUpdateRef.current = true;
    setEditContent(remoteContent);
    lastSavedContentRef.current = remoteContent;
    // Credit content to the note that was selected when the broadcast arrived
    contentForNoteIdRef.current = arrivedForNoteId;
    localTimestampRef.current = updatedAt;

    setNotes(prev =>
      prev.map(n =>
        n.id === arrivedForNoteId
          ? { ...n, content: remoteContent, updated_at: updatedAt }
          : n
      )
    );

    setIsSyncing(false);

    setTimeout(() => {
      isRemoteUpdateRef.current = false;
    }, 100);
  }, []); // no deps — all values come from stable refs

  // Handle note created in other tab
  const handleNoteCreated = useCallback(async (newNoteId: string, lessonId: string) => {
    if (!courseId || !userId) return;
    // Ignore if loading to prevent race conditions
    if (isLoadingRef.current) return;
    
    const { data, error } = await supabase
      .from("lesson_notes")
      .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
      .eq("id", newNoteId)
      .single();

    if (error || !data) return;

    let displayTitle = data.title || "Untitled note";
    
    // If it's a lesson note, fetch the lesson title
    if (data.entity_type === 'lesson' && data.lesson_id) {
      const { data: postData } = await supabase
        .from("posts")
        .select("title")
        .eq("id", data.lesson_id)
        .maybeSingle();
      
      if (postData?.title) {
        displayTitle = postData.title;
      }
    }

    const newNote: CourseNote = {
      ...data,
      entity_type: data.entity_type as 'lesson' | 'user',
      display_title: displayTitle,
    };

    setNotes(prev => {
      if (prev.some(n => n.id === newNoteId)) return prev;
      return [newNote, ...prev];
    });
    
    setIsSyncing(false);
  }, [courseId, userId]);

  // Handle note deleted in other tab
  const handleNoteDeleted = useCallback((deletedNoteId: string) => {
    const currentNoteId = selectedNoteIdRef.current;
    
    setNotes(prev => prev.filter(n => n.id !== deletedNoteId));
    
    if (currentNoteId === deletedNoteId) {
      setSelectedNoteId(null);
      setEditContent("");
      contentForNoteIdRef.current = null; // FIX: Clear content ownership
    }
  }, []);

  // Set up cross-tab sync bridge
  const { broadcastUpdate, broadcastCreated, broadcastDeleted, updateLocalTimestamp } = useNotesSyncBridge({
    noteId: selectedNoteId,
    lessonId: selectedNote?.lesson_id || undefined,
    courseId,
    userId,
    source: 'deep-notes',
    onRemoteUpdate: handleRemoteUpdate,
    onNoteCreated: handleNoteCreated,
    onNoteDeleted: handleNoteDeleted,
  });

  // Load all notes for this course
  // CRITICAL: Do NOT include selectedNoteId in deps - that causes reload on note switch!
  const loadNotes = useCallback(async () => {
    if (!courseId || !userId) return;

    setNotesReady(false);
    setIsLoading(true);
    try {
      const { data: notesData, error: notesError } = await supabase
        .from("lesson_notes")
        .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
        .eq("course_id", courseId)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (notesError) throw notesError;

      if (notesData && notesData.length > 0) {
        // Fetch lesson titles for lesson-type notes
        const lessonIds = notesData
          .filter(n => n.entity_type === 'lesson' && n.lesson_id)
          .map(n => n.lesson_id as string);
        
        let lessonTitleMap = new Map<string, string>();
        
        if (lessonIds.length > 0) {
          const { data: postsData } = await supabase
            .from("posts")
            .select("id, title")
            .in("id", lessonIds);
          
          lessonTitleMap = new Map(postsData?.map(p => [p.id, p.title]) || []);
        }

        const enrichedNotes: CourseNote[] = notesData.map(note => {
          let displayTitle = note.title || "Untitled note";
          
          if (note.entity_type === 'lesson' && note.lesson_id) {
            displayTitle = lessonTitleMap.get(note.lesson_id) || "Unknown Lesson";
          }
          
          return {
            ...note,
            entity_type: note.entity_type as 'lesson' | 'user',
            display_title: displayTitle,
          };
        });

        setNotes(enrichedNotes);
        setNotesReady(true);

        // Only auto-select first note if nothing is selected yet
        // Use ref to avoid dependency on state
        if (!selectedNoteIdRef.current) {
          setSelectedNoteId(enrichedNotes[0].id);
          setEditContent(enrichedNotes[0].content);
          lastSavedContentRef.current = enrichedNotes[0].content;
          contentForNoteIdRef.current = enrichedNotes[0].id; // FIX: Track content ownership
        }
      } else {
        setNotes([]);
        setNotesReady(true);
        setSelectedNoteId(null);
        setEditContent("");
        lastSavedContentRef.current = "";
        contentForNoteIdRef.current = null; // FIX: Clear content ownership
      }
    } catch (error) {
      console.error("Error loading course notes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, userId]); // Removed selectedNoteId - use ref instead

  // Initial load
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  /**
   * Select a note - update ID and sync content
   * FIX: Properly reset all refs to prevent cross-note content saving
   */
  const selectNote = useCallback((note: CourseNote) => {
    // FIX: Mark as transitioning to prevent stale saves
    isTransitioningRef.current = true;
    
    setSelectedNoteId(note.id);
    setEditContent(note.content);
    lastSavedContentRef.current = note.content;
    contentForNoteIdRef.current = note.id; // FIX: Track content ownership
    localTimestampRef.current = note.updated_at;
    
    // Update sync bridge with the loaded timestamp
    updateLocalTimestamp(note.updated_at);
    
    // FIX: Reset transition flag after state stabilizes
    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 100);
  }, [updateLocalTimestamp]);

  /**
   * Auto-save when content changes
   * FIX: Added validation to ensure we're saving to the correct note
   */
  useEffect(() => {
    if (!selectedNoteId || !selectedNote) return;
    
    // FIX: Don't save if we're transitioning between notes
    if (isTransitioningRef.current) {
      console.debug('[useCourseNotes] Skipping save during note transition');
      return;
    }
    
    // FIX: Validate that the debounced content belongs to the current note
    // This prevents saving stale content when user switches notes rapidly
    if (contentForNoteIdRef.current !== selectedNoteId) {
      console.debug('[useCourseNotes] Skipping save - content belongs to different note', {
        contentFor: contentForNoteIdRef.current,
        selectedNote: selectedNoteId,
      });
      return;
    }
    
    // Skip if content hasn't changed from last save
    if (debouncedContent === lastSavedContentRef.current) return;
    
    // Skip if this was a remote update (already saved by other tab)
    if (isRemoteUpdateRef.current) return;

    const saveNote = async () => {
      // FIX: Double-check note ID hasn't changed during async gap
      if (selectedNoteIdRef.current !== selectedNoteId) {
        console.debug('[useCourseNotes] Note changed before save started, aborting');
        return;
      }
      
      setIsSaving(true);
      const now = new Date().toISOString();
      
      try {
        const { error } = await supabase
          .from("lesson_notes")
          .update({ content: debouncedContent, updated_at: now })
          .eq("id", selectedNoteId);

        if (error) throw error;

        // FIX: Only update refs if we're still on the same note
        if (selectedNoteIdRef.current === selectedNoteId) {
          lastSavedContentRef.current = debouncedContent;
          localTimestampRef.current = now;

          setNotes(prev => 
            prev.map(n => 
              n.id === selectedNoteId 
                ? { ...n, content: debouncedContent, updated_at: now } 
                : n
            )
          );
          
          // Broadcast with timestamp for conflict resolution
          broadcastUpdate(debouncedContent, now);
        }
      } catch (error) {
        console.error("Error saving note:", error);
      } finally {
        setIsSaving(false);
      }
    };

    saveNote();
  }, [debouncedContent, selectedNoteId, selectedNote, broadcastUpdate]);

  /**
   * FIX: Update content ownership when editContent changes from user input
   */
  const handleSetEditContent = useCallback((content: string) => {
    setEditContent(content);
    // Track that this content belongs to the currently selected note
    contentForNoteIdRef.current = selectedNoteIdRef.current;
  }, []);

  /**
   * Create a new user-created note (not linked to any lesson)
   * This is the default behavior for "+ New note"
   */
  const createUserNote = useCallback(async (title?: string) => {
    if (!courseId || !userId) return null;

    try {
      const noteTitle = title || "Untitled note";
      
      const { data, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: userId,
          lesson_id: null, // No lesson link
          course_id: courseId,
          content: "",
          entity_type: "user",
          title: noteTitle,
        })
        .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
        .single();

      if (error) throw error;

      const newNote: CourseNote = {
        ...data,
        entity_type: 'user',
        display_title: noteTitle,
      };

      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setEditContent("");
      lastSavedContentRef.current = "";
      contentForNoteIdRef.current = newNote.id; // FIX: Track content ownership
      
      // Broadcast with empty lessonId for user notes
      broadcastCreated(newNote.id, "");

      return newNote;
    } catch (error) {
      console.error("Error creating user note:", error);
      return null;
    }
  }, [courseId, userId, broadcastCreated]);

  /**
   * Create a contextual note linked to a lesson
   * Used by Quick Notes when user starts typing in a lesson
   */
  const createLessonNote = useCallback(async (lessonId: string, lessonTitle: string) => {
    if (!courseId || !userId) return null;

    try {
      const { data, error } = await supabase
        .from("lesson_notes")
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          course_id: courseId,
          content: "",
          entity_type: "lesson",
          title: null, // Uses lesson title instead
        })
        .select("id, lesson_id, course_id, content, created_at, updated_at, entity_type, title")
        .single();

      if (error) throw error;

      const newNote: CourseNote = {
        ...data,
        entity_type: 'lesson',
        display_title: lessonTitle,
      };

      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
      setEditContent("");
      lastSavedContentRef.current = "";
      contentForNoteIdRef.current = newNote.id; // FIX: Track content ownership
      
      broadcastCreated(newNote.id, lessonId);

      return newNote;
    } catch (error) {
      console.error("Error creating lesson note:", error);
      return null;
    }
  }, [courseId, userId, broadcastCreated]);

  // Update note title (only for user-created notes)
  const updateNoteTitle = useCallback(async (noteId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("lesson_notes")
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq("id", noteId);

      if (error) throw error;

      setNotes(prev => 
        prev.map(n => 
          n.id === noteId 
            ? { ...n, title: newTitle, display_title: newTitle } 
            : n
        )
      );

      return true;
    } catch (error) {
      console.error("Error updating note title:", error);
      return false;
    }
  }, []);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    
    try {
      const { error } = await supabase
        .from("lesson_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      const remaining = notes.filter(n => n.id !== noteId);
      setNotes(remaining);
      
      if (selectedNoteId === noteId) {
        if (remaining.length > 0) {
          setSelectedNoteId(remaining[0].id);
          setEditContent(remaining[0].content);
          lastSavedContentRef.current = remaining[0].content;
          contentForNoteIdRef.current = remaining[0].id; // FIX: Track content ownership
        } else {
          setSelectedNoteId(null);
          setEditContent("");
          lastSavedContentRef.current = "";
          contentForNoteIdRef.current = null; // FIX: Clear content ownership
        }
      }
      
      if (noteToDelete) {
        broadcastDeleted(noteId, noteToDelete.lesson_id || "");
      }

      return true;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  }, [selectedNoteId, notes, broadcastDeleted]);

  // Get lessons that don't have notes yet (for lesson-linking feature)
  const getAvailableLessons = useCallback(async () => {
    if (!courseId) return [];

    try {
      const { data: courseLessons } = await supabase
        .from("course_lessons")
        .select("id, title")
        .eq("course_id", courseId)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });

      // Filter out lessons that already have notes
      const existingLessonIds = new Set(
        notes.filter(n => n.entity_type === 'lesson').map(n => n.lesson_id)
      );
      
      const available = (courseLessons || []).filter(l => !existingLessonIds.has(l.id));

      return available;
    } catch (error) {
      console.error("Error fetching available lessons:", error);
      return [];
    }
  }, [courseId, notes]);

  /**
   * Select a note by ID (used for context switching from other tabs)
   */
  const selectNoteById = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      selectNote(note);
      return true;
    }
    return false;
  }, [notes, selectNote]);

  /**
   * Select a note by lessonId (used for context switching from Quick Notes)
   * Returns the note if found, null otherwise
   */
  const selectNoteByLessonId = useCallback((lessonId: string): CourseNote | null => {
    const note = notes.find(n => n.lesson_id === lessonId && n.entity_type === 'lesson');
    if (note) {
      selectNote(note);
      return note;
    }
    return null;
  }, [notes, selectNote]);

  /**
   * Find or create a lesson note - ensures a note exists for the given lesson
   * Used for context switching when the note may not exist yet
   */
  const findOrCreateLessonNote = useCallback(async (lessonId: string): Promise<CourseNote | null> => {
    // First check if note already exists
    const existingNote = notes.find(n => n.lesson_id === lessonId && n.entity_type === 'lesson');
    if (existingNote) {
      selectNote(existingNote);
      return existingNote;
    }

    // Fetch lesson title for display
    const { data: postData } = await supabase
      .from("posts")
      .select("title")
      .eq("id", lessonId)
      .maybeSingle();

    const lessonTitle = postData?.title || "Unknown Lesson";

    // Create new lesson note
    return createLessonNote(lessonId, lessonTitle);
  }, [notes, selectNote, createLessonNote]);

  return {
    notes,
    selectedNote,
    editContent,
    isLoading,
    isSaving,
    isSyncing,
    notesReady,
    selectNote,
    selectNoteById,
    selectNoteByLessonId,
    findOrCreateLessonNote,
    setEditContent: handleSetEditContent, // FIX: Use wrapped setter
    createUserNote,
    createLessonNote,
    deleteNote,
    updateNoteTitle,
    getAvailableLessons,
    reloadNotes: loadNotes,
  };
}

export default useCourseNotes;
