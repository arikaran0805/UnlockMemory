/**
 * NotesFocusMode - A true Notion-style writing workspace
 * 
 * Users should forget they're inside an LMS.
 * This is a personal thinking space, not a course feature.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Check, 
  StickyNote,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NotionStyleEditor } from './NotionStyleEditor';
import { getTextPreview } from '@/lib/tiptapMigration';
import { useCourseNotes } from '@/hooks/useCourseNotes';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NotesFocusModeProps {
  courseId: string | undefined;
  userId: string | undefined;
  courseName: string;
  onExit: () => void;
  onNavigateToLesson?: (lessonId: string) => void;
  /** When true, component is rendered as a standalone page (not overlay) */
  isStandalonePage?: boolean;
  /** Context to switch to (from cross-tab communication) */
  switchToContext?: {
    noteId?: string;
    lessonId?: string;
    entityType?: string;
  } | null;
  /** Callback when context switch is complete */
  onContextSwitched?: () => void;
}

export function NotesFocusMode({
  courseId,
  userId,
  courseName,
  onExit,
  onNavigateToLesson,
  isStandalonePage = false,
  switchToContext,
  onContextSwitched,
}: NotesFocusModeProps) {
  const {
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
    setEditContent,
    createUserNote,
    createLessonNote,
    deleteNote,
    updateNoteTitle,
  } = useCourseNotes({ courseId, userId });

  const [showSaving, setShowSaving] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const savingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const editorRef = useRef<any>(null);

  // Handle context switch requests from other tabs
  // Uses an async effect to handle note creation if needed
  useEffect(() => {
    if (!switchToContext || !notesReady) return;
    
    const performSwitch = async () => {
      let switched = false;
      
      // Try to switch by noteId first
      if (switchToContext.noteId) {
        switched = selectNoteById(switchToContext.noteId);
      }
      // Fallback to lessonId - find existing or create new note
      else if (switchToContext.lessonId) {
        // selectNoteByLessonId now returns the note or null
        const existingNote = selectNoteByLessonId(switchToContext.lessonId);
        if (existingNote) {
          switched = true;
        } else {
          // Note doesn't exist for this lesson - create one
          const newNote = await findOrCreateLessonNote(switchToContext.lessonId);
          switched = !!newNote;
        }
      }
      
      // Notify that we've processed the switch request
      if (onContextSwitched) {
        onContextSwitched();
      }
      
      // Focus editor after switching
      if (switched) {
        setTimeout(() => {
          editorRef.current?.focus?.();
        }, 100);
      }
    };
    
    performSwitch();
  }, [switchToContext, isLoading, selectNoteById, selectNoteByLessonId, findOrCreateLessonNote, onContextSwitched]);

  // Show "Saving…" only briefly during active writes
  useEffect(() => {
    if (isSaving) {
      setShowSaving(true);
      if (savingTimeoutRef.current) clearTimeout(savingTimeoutRef.current);
    } else {
      savingTimeoutRef.current = setTimeout(() => setShowSaving(false), 800);
    }
    return () => {
      if (savingTimeoutRef.current) clearTimeout(savingTimeoutRef.current);
    };
  }, [isSaving]);

  // Handle new user-created note (instant, no lesson selection)
  const handleCreateNewNote = async () => {
    const newNote = await createUserNote();
    if (newNote) {
      setTimeout(() => {
        editorRef.current?.focus?.();
      }, 100);
    } else {
      toast({
        title: "Couldn't create note",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Handle rename for user-created notes
  const handleStartRename = () => {
    if (selectedNote?.entity_type === 'user') {
      setRenameValue(selectedNote.display_title);
      setIsRenaming(true);
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 50);
    }
  };

  const handleRenameSubmit = async () => {
    if (!selectedNote || !renameValue.trim()) {
      setIsRenaming(false);
      return;
    }
    
    const success = await updateNoteTitle(selectedNote.id, renameValue.trim());
    if (success) {
      toast({
        title: "Note renamed",
        description: `Renamed to "${renameValue.trim()}"`,
      });
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
    }
  };

  // Group notes by date
  const groupedNotes = useMemo(() => {
    const groups: { [key: string]: typeof notes } = {};
    
    notes.forEach((note) => {
      const date = new Date(note.updated_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(note);
    });
    
    return groups;
  }, [notes]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Escape to exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // Handle note selection without triggering full reload
  const handleSelectNote = useCallback((note: typeof selectedNote) => {
    if (!note || note.id === selectedNote?.id) return; // Already selected
    selectNote(note);
  }, [selectNote, selectedNote?.id]);

  // Not authenticated
  if (!userId) {
    return (
      <div className={cn(
        "bg-surface-card dark:bg-background flex items-center justify-center",
        isStandalonePage ? "min-h-screen" : "fixed inset-0 z-50"
      )}>
        <div className="text-center max-w-xs">
          <StickyNote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-base font-medium text-foreground mb-1.5">Sign in to view notes</h3>
          <p className="text-sm text-muted-foreground mb-5">
            Your notes are private and saved automatically.
          </p>
          <Button variant="outline" size="sm" onClick={onExit}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className={cn(
        "bg-surface-card dark:bg-background",
        isStandalonePage ? "min-h-screen" : "fixed inset-0 z-50"
      )}
    >
      {/* Top Bar — 44px, readable contrast */}
      <header className="h-11 flex items-center px-4 border-b border-border/30">
        {/* Back */}
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-[13px]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Back to course</span>
        </button>
        
        {/* Title — Clear, readable */}
        <div className="flex-1 flex items-center gap-2 ml-4 min-w-0">
          <span className="text-[13px] font-medium text-foreground">Notes</span>
          <span className="text-muted-foreground/40 hidden md:inline">—</span>
          <span className="text-[13px] font-medium text-foreground/80 truncate hidden md:inline">{courseName}</span>
        </div>

        {/* Save status — Visible, reassuring */}
        <div className="flex-shrink-0">
          {selectedNote && (
            <AnimatePresence mode="wait">
              {isSyncing ? (
                <motion.span
                  key="syncing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-muted-foreground"
                >
                  Syncing…
                </motion.span>
              ) : showSaving ? (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-muted-foreground"
                >
                  Saving…
                </motion.span>
              ) : (
                <motion.span
                  key="saved"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-primary/80 flex items-center gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  Saved
                </motion.span>
              )}
            </AnimatePresence>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className={cn(
        "flex",
        isStandalonePage ? "h-[calc(100vh-2.75rem)]" : "h-[calc(100vh-2.75rem)]"
      )}>
        {/* Left Sidebar — 260px, soft tint */}
        <aside className="w-[260px] bg-[hsl(142_20%_97%)] dark:bg-muted/10 flex-shrink-0 hidden md:flex flex-col border-r border-border/20">
          {/* New Note — Instant creation, no lesson selection */}
          <div className="px-3 pt-3 pb-2">
            <button 
              onClick={handleCreateNewNote}
              className="flex items-center gap-1.5 text-[13px] text-foreground/70 hover:text-foreground transition-colors group"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New note</span>
            </button>
          </div>
          
          <ScrollArea className="flex-1 px-2">
            {isLoading ? (
              <div className="py-12 text-center">
                <span className="text-xs text-muted-foreground">Loading…</span>
              </div>
            ) : notes.length === 0 ? (
              <div className="py-12 px-3 text-center">
                <p className="text-[13px] text-muted-foreground">No notes yet</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  Click "+ New note" to start
                </p>
              </div>
            ) : (
              <div className="pb-4">
                {Object.entries(groupedNotes).map(([dateGroup, groupNotes]) => (
                  <div key={dateGroup} className="mt-4 first:mt-0">
                    {/* Section Label — Readable */}
                    <div className="px-2 mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                        {dateGroup}
                      </span>
                    </div>
                    
                    {/* Notes */}
                    <div className="space-y-0.5">
                      {groupNotes.map((note) => {
                        const isSelected = selectedNote?.id === note.id;
                        const preview = getTextPreview(note.content, 45) || "Empty note";

                        return (
                                          <button
                                            key={note.id}
                                            onClick={() => handleSelectNote(note)}
                                            className={cn(
                                              "w-full text-left px-2.5 py-2 rounded-md transition-all relative",
                                              isSelected
                                                ? "bg-primary/12"
                                                : "hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                                            )}
                                          >
                                            {/* Left accent bar for selected state */}
                            {isSelected && (
                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-primary rounded-full" />
                            )}
                            <div className={cn(
                              "text-[13px] font-medium truncate transition-colors pl-1",
                              isSelected ? "text-foreground" : "text-foreground/80"
                            )}>
                              {note.display_title}
                            </div>
                            <p className={cn(
                              "text-[11px] line-clamp-1 mt-0.5 pl-1",
                              isSelected ? "text-muted-foreground/70" : "text-muted-foreground/60"
                            )}>
                              {preview}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Writing Canvas — The heart of the experience */}
        <main className="flex-1 overflow-auto bg-surface-card dark:bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : notes.length === 0 ? (
            <EmptyState onNewNote={handleCreateNewNote} />
          ) : selectedNote ? (
            <div key={selectedNote.id} className="max-w-[740px] mx-auto px-6 md:px-10 pt-14 pb-32">
              {/* Metadata Strip — Readable secondary text */}
              <div className="mb-10 flex items-center gap-3 text-[12px]">
                {/* Title - Editable for user notes, static for lesson notes */}
                {isRenaming ? (
                  <Input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameSubmit}
                    onKeyDown={handleRenameKeyDown}
                    className="h-7 w-48 text-[12px] px-2.5 py-1"
                    placeholder="Note title..."
                  />
                ) : (
                  <div className="flex items-center gap-1.5 group">
                    <span className="text-foreground/70 bg-muted/50 px-2.5 py-1 rounded-md font-medium">
                      {selectedNote.display_title}
                    </span>
                    {/* Rename button - only for user-created notes */}
                    {selectedNote.entity_type === 'user' && (
                      <button
                        onClick={handleStartRename}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1 rounded hover:bg-muted"
                        title="Rename note"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* Only show "Go to lesson" for lesson-type notes */}
                {onNavigateToLesson && selectedNote.entity_type === 'lesson' && selectedNote.lesson_id && (
                  <button
                    onClick={() => onNavigateToLesson(selectedNote.lesson_id!)}
                    className="text-primary hover:text-primary/80 hover:underline transition-colors flex items-center gap-0.5 font-medium"
                  >
                    Go to lesson
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
                
                {/* Delete button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded hover:bg-destructive/10"
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The note "{selectedNote.display_title}" will be permanently deleted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteNote(selectedNote.id)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <span className="text-muted-foreground ml-auto">
                  {formatTime(selectedNote.updated_at)}
                </span>
              </div>

              {/* Editor - keyed by note ID to force full remount on note switch */}
              <NotionStyleEditor
                key={selectedNote.id}
                ref={editorRef}
                value={editContent}
                onChange={setEditContent}
                placeholder="Start writing your notes…"
                autoFocus
                className="min-h-[50vh]"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Select a note from the sidebar</p>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}

// Empty State — Clear invitation
function EmptyState({ onNewNote }: { onNewNote?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <StickyNote className="h-7 w-7 text-primary/60" />
      </div>
      <h2 className="text-xl font-medium text-foreground mb-2">
        Your course notes
      </h2>
      <p className="text-sm text-muted-foreground max-w-[300px] leading-relaxed mb-6">
        Notes are private and saved automatically. Create your first note to get started.
      </p>
      {/* Soft blinking cursor */}
      <div className="h-6 flex items-center">
        <div className="w-0.5 h-5 bg-primary/60 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default NotesFocusMode;
