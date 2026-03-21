import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTextPreview } from "@/lib/tiptapMigration";
import { useCourseNotes } from "@/hooks/useCourseNotes";
import {
  StickyNote,
  FileText,
  Calendar,
  Clock,
  Loader2,
  Check,
  Trash2,
  BookOpen,
} from "lucide-react";
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
} from "@/components/ui/alert-dialog";

interface CourseNotesTabProps {
  courseId: string | undefined;
  userId: string | undefined;
  onNavigateToLesson?: (lessonId: string) => void;
}

export function CourseNotesTab({
  courseId,
  userId,
  onNavigateToLesson,
}: CourseNotesTabProps) {
  const {
    notes,
    selectedNote,
    editContent,
    isLoading,
    isSaving,
    selectNote,
    setEditContent,
    deleteNote,
  } = useCourseNotes({ courseId, userId });

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
        groupKey = date.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
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

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <StickyNote className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Sign in to view your notes</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Create notes while learning and access them here anytime.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <StickyNote className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">No notes yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start taking notes while reading lessons. Your notes will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Left Panel - Notes List */}
      <div className="w-[300px] flex-shrink-0">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Your Notes</h3>
          <p className="text-sm text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""} in this course
          </p>
        </div>

        <ScrollArea className="h-[450px] pr-3">
          <div className="space-y-4">
            {Object.entries(groupedNotes).map(([dateGroup, groupNotes]) => (
              <div key={dateGroup}>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {dateGroup}
                  </span>
                </div>
                <div className="space-y-2">
                  {groupNotes.map((note) => {
                    const isSelected = selectedNote?.id === note.id;
                    const preview = getTextPreview(note.content, 60) || "Empty note";

                    return (
                      <button
                        key={note.id}
                        onClick={() => selectNote(note)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border/50 hover:border-border hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {note.display_title}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 ml-5.5">
                          {preview}
                        </p>
                        <div className="flex items-center gap-1 mt-1.5 ml-5.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(note.updated_at)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Vertical Separator */}
      <Separator orientation="vertical" className="h-auto" />

      {/* Right Panel - Note Content */}
      <div className="flex-1 min-w-0">
        {selectedNote ? (
          <div className="h-full flex flex-col">
            {/* Note Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {selectedNote.entity_type === 'lesson' ? (
                      <>
                        <BookOpen className="h-3 w-3 mr-1" />
                        Lesson
                      </>
                    ) : (
                      <>
                        <StickyNote className="h-3 w-3 mr-1" />
                        Note
                      </>
                    )}
                  </Badge>
                  {isSaving && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  {!isSaving && selectedNote.content === editContent && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Saved
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold truncate">
                  {selectedNote.display_title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last updated:{" "}
                  {new Date(selectedNote.updated_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at {formatTime(selectedNote.updated_at)}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Only show Go to Lesson for lesson-type notes */}
                {onNavigateToLesson && selectedNote.entity_type === 'lesson' && selectedNote.lesson_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToLesson(selectedNote.lesson_id!)}
                  >
                    <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                    Go to Lesson
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
              </div>
            </div>

            {/* Note Editor */}
            <div className="flex-1">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Your notes will appear here..."
                className="min-h-[350px] resize-none border-border/50 bg-background/50 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div>
              <FileText className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Select a note to view and edit
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseNotesTab;
