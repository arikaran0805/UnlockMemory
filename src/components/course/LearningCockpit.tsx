import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useDoubtSystem, resolveOwner } from "@/hooks/useDoubtSystem";
import { cn } from "@/lib/utils";
import { useLessonNotes } from "@/hooks/useLessonNotes";
import { AskDoubtButton } from "@/components/doubt/AskDoubtButton";
import { useLessonFlowNavigation } from "@/hooks/useLessonFlowNavigation";
import { useMessaging } from "@/hooks/useMessaging";
import { MessagingPopup } from "@/components/messaging/MessagingPopup";
import { LessonNotesCard } from "./LessonNotesCard";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  GitBranch,
  MessageSquareCode,
  ArrowRightCircle,
  Play,
  HelpCircle,
  StickyNote,
  Dumbbell,
  Zap,
  BookOpen,
} from "lucide-react";
import { useCodeEdit } from "@/contexts/CodeEditContext";

interface LearningCockpitProps {
  lessonId: string | undefined;
  lessonTitle: string;
  courseId: string | undefined;
  courseSlug: string;
  userId: string;
  isLessonCompleted: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  courseProgress: {
    completedCount: number;
    totalCount: number;
    percentage: number;
    isCompleted: boolean;
  };
  certificateEligible: boolean;
  onOpenNotes?: () => void;
  /** If provided, clicking "Open in Deep Notes" calls this instead of navigating away */
  onOpenDeepNotes?: (lessonId?: string) => void;
  /** When true the user is in Deep Notes mode — BookOpen is idle, StickyNote is highlighted */
  isDeepNotesOpen?: boolean;
  /** Called when the BookOpen "Continue Learning" button is clicked while in Deep Notes */
  onReturnToLesson?: () => void;
  /** If true, uses Career Board header offsets (Primary + CareerScopedHeader) */
  isCareerBoard?: boolean;
  /** Career slug - threaded to LessonNotesCard so Deep Notes opens with the correct back-link */
  careerId?: string;
  /** Opens the Practice Focus Mode, optionally pre-selecting the given lesson */
  onOpenPracticeFocus?: (lessonId?: string) => void;
  /** When true the user is in Practice Focus Mode — Dumbbell is highlighted */
  isPracticeFocusOpen?: boolean;
  /** Called when the BookOpen icon is clicked while in Practice Focus Mode */
  onExitPractice?: () => void;
}

// Lesson Flow sections
const LESSON_FLOW_SECTIONS = [
  { id: "chat", label: "Chat Bubbles", icon: MessageSquareCode },
  { id: "cause", label: "Cause & Effect", icon: ArrowRightCircle },
];

type PanelId = "flow" | "notes" | "practice" | "help" | null;

/**
 * Learning Cockpit — Pro user's right sidebar for lesson view.
 * Renders as a 56px icon-only strip; clicking each icon opens a
 * flyout popover to the left with the full panel content.
 */
export const LearningCockpit = ({
  lessonId,
  lessonTitle,
  courseId,
  courseSlug,
  userId,
  isLessonCompleted,
  isHeaderVisible,
  showAnnouncement,
  courseProgress,
  certificateEligible,
  onOpenNotes,
  onOpenDeepNotes,
  isDeepNotesOpen = false,
  onReturnToLesson,
  isCareerBoard = false,
  careerId,
  onOpenPracticeFocus,
  isPracticeFocusOpen = false,
  onExitPractice,
}: LearningCockpitProps) => {
  const messaging = useMessaging(userId);
  const { routeDoubt } = useDoubtSystem(userId);
  const [activePanel, setActivePanel] = useState<PanelId>(null);

  // Code edit context (optional — may not be available on every lesson)
  let codeEditContext: ReturnType<typeof useCodeEdit> | null = null;
  try { codeEditContext = useCodeEdit(); } catch { /* not available */ }
  const hasEditedCode = codeEditContext?.hasEditedCode ?? false;
  const editedCodeBlock = codeEditContext?.editedCodeBlock ?? null;

  const handleStartMentorChat = useCallback(async () => {
    if (!messaging.mentorPreview) return;
    const context = {
      source_type: messaging.mentorPreview.context.source_type as any,
      source_id: lessonId || "",
      source_title: messaging.mentorPreview.context.source_title,
      course_id: courseId,
      lesson_id: lessonId,
    };
    const result = await routeDoubt(context);
    if (result) {
      messaging.fetchConnections();
      messaging.openChat(result.connectionId);
    }
  }, [messaging, routeDoubt, lessonId, courseId]);

  useEffect(() => {
    if (!lessonId || !courseId) return;
    const ctx = {
      source_type: "lesson" as const,
      source_id: lessonId,
      source_title: lessonTitle,
      course_id: courseId,
      lesson_id: lessonId,
    };
    resolveOwner(ctx).then((resolved) => {
      if (resolved) {
        messaging.setSuggestedMentor({ mentor: resolved, context: { source_type: "lesson", source_title: lessonTitle } });
      } else {
        messaging.setSuggestedMentor(null);
      }
    });
  }, [lessonId, courseId, lessonTitle]);

  const handleAskSuggestedMentor = useCallback(() => {
    if (!messaging.suggestedMentor) return;
    messaging.showMentorPreview(messaging.suggestedMentor.mentor, messaging.suggestedMentor.context);
  }, [messaging]);

  // Scroll offset for lesson flow spy
  const scrollOffset = isCareerBoard
    ? (isHeaderVisible ? (showAnnouncement ? 148 : 112) : (showAnnouncement ? 84 : 48))
    : (isHeaderVisible ? (showAnnouncement ? 140 : 104) : (showAnnouncement ? 76 : 40));

  const { activeSection, sections: lessonFlowSections, scrollToSection } = useLessonFlowNavigation(
    LESSON_FLOW_SECTIONS.map((s) => ({ id: s.id, label: s.label })),
    { scrollOffset }
  );

  // Notes
  const { content, updateContent, appendToContent, isSaving, isSyncing, lastSaved, isLoading: notesLoading } = useLessonNotes({
    lessonId,
    courseId,
    userId,
  });

  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
    if (diff < 60) return "Saved just now";
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved ${Math.floor(diff / 3600)}h ago`;
  }, [lastSaved]);

  // Sticky top offset
  const stickyTopClass = isCareerBoard
    ? (isHeaderVisible ? (showAnnouncement ? "top-[9.25rem]" : "top-28") : (showAnnouncement ? "top-[5.25rem]" : "top-12"))
    : (isHeaderVisible ? (showAnnouncement ? "top-[8.75rem]" : "top-[6.5rem]") : (showAnnouncement ? "top-[4.75rem]" : "top-10"));

  const toggle = (id: PanelId) =>
    setActivePanel((prev) => (prev === id ? null : id));

  const inFocusMode = isDeepNotesOpen || isPracticeFocusOpen;

  // Lesson Flow is post-specific — suppress it in any focus mode.
  // Notes and Help remain openable from anywhere.
  const effectivePanel: PanelId = (inFocusMode && activePanel === "flow") ? null : activePanel;

  // Force-remount TooltipProvider when leaving any focus mode so stale hover
  // state is cleared and no tooltip fires immediately after the transition.
  const [tooltipKey, setTooltipKey] = useState(0);
  const prevFocusMode = useRef(inFocusMode);
  useEffect(() => {
    if (prevFocusMode.current && !inFocusMode) {
      setTooltipKey((k) => k + 1);
    }
    prevFocusMode.current = inFocusMode;
  }, [inFocusMode]);

  // Clear any open panel when leaving focus modes
  useEffect(() => {
    if (!inFocusMode && activePanel !== null) {
      setActivePanel(null);
    }
  }, [isDeepNotesOpen]);

  // ── Shared icon-button style ──────────────────────────────────────────────────
  const btnBase =
    "relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
  const btnIdle = "text-muted-foreground/70 hover:text-foreground hover:bg-muted/60";
  const btnActive = "bg-muted text-foreground shadow-sm ring-1 ring-border/60";

  return (
    <>
      <aside className="hidden xl:flex w-14 flex-shrink-0 flex-col border-l border-border/40 bg-background">
        <TooltipProvider key={tooltipKey} delayDuration={300}>
          <div className={cn("sticky flex flex-col items-center gap-1 px-2 py-3", stickyTopClass)}>

            {/* ── Continue Learning — active on lesson view; idle + clickable in focus modes ── */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label="Continue Learning"
                  onClick={
                    isPracticeFocusOpen ? onExitPractice
                    : isDeepNotesOpen   ? onReturnToLesson
                    : undefined
                  }
                  className={cn(
                    btnBase,
                    // Highlighted ONLY when in normal lesson view (not in any focus mode)
                    (isPracticeFocusOpen || isDeepNotesOpen) ? btnIdle : btnActive
                  )}
                >
                  <BookOpen className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {isPracticeFocusOpen ? "Back to Lessons"
                  : isDeepNotesOpen  ? "Continue Learning"
                  : "Learning"}
              </TooltipContent>
            </Tooltip>

            {/* ── Lesson Flow — only interactive when on a post page, not in focus modes ── */}
            <Popover open={effectivePanel === "flow"} onOpenChange={(o) => toggle(o ? "flow" : null)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {inFocusMode ? (
                    // Disabled in focus modes — not a lesson-level action
                    <button
                      aria-label="Lesson Flow"
                      disabled
                      className={cn(btnBase, "opacity-30 cursor-not-allowed text-muted-foreground/50")}
                    >
                      <GitBranch className="h-[18px] w-[18px]" />
                    </button>
                  ) : (
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Lesson Flow"
                        className={cn(btnBase, effectivePanel === "flow" ? btnActive : btnIdle)}
                      >
                        <GitBranch className="h-[18px] w-[18px]" />
                      </button>
                    </PopoverTrigger>
                  )}
                </TooltipTrigger>
                {!inFocusMode && effectivePanel !== "flow" && (
                  <TooltipContent side="left" className="text-xs">Lesson Flow</TooltipContent>
                )}
              </Tooltip>

              <PopoverContent
                side="left"
                sideOffset={10}
                align="start"
                className="w-[268px] p-0 overflow-hidden shadow-lg border-border/60"
              >
                <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                  <GitBranch className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[13px] font-semibold text-foreground">Lesson Flow</span>
                </div>
                <nav className="px-3 py-2.5 space-y-0.5" role="navigation" aria-label="Lesson sections">
                  {LESSON_FLOW_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    const sectionData = lessonFlowSections.find((s) => s.id === section.id);
                    const isDisabled = !(sectionData?.exists ?? false);
                    return (
                      <button
                        key={section.id}
                        onClick={() => { if (!isDisabled) { scrollToSection(section.id); setActivePanel(null); } }}
                        disabled={isDisabled}
                        aria-current={isActive ? "location" : undefined}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left relative overflow-hidden",
                          "transition-all duration-150",
                          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:rounded-full before:transition-all before:duration-150",
                          isDisabled && "opacity-35 cursor-not-allowed text-muted-foreground",
                          !isDisabled && isActive && "bg-muted/70 text-foreground font-medium before:h-5 before:bg-primary",
                          !isDisabled && !isActive && "text-muted-foreground hover:text-foreground hover:bg-muted/40 before:h-0"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && !isDisabled && "text-primary")} />
                        <span className="flex-1 truncate">
                          {isActive && !isDisabled
                            ? <span><span className="font-normal text-muted-foreground">In: </span>{section.label}</span>
                            : section.label}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </PopoverContent>
            </Popover>

            {/* ── Quick Notes ─────────────────────────────────────────── */}
            <Popover open={effectivePanel === "notes"} onOpenChange={(o) => toggle(o ? "notes" : null)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  {isDeepNotesOpen ? (
                    // Already in Deep Notes — highlighted/inert (you're there)
                    <button
                      aria-label="Notes (Deep Notes open)"
                      className={cn(btnBase, btnActive)}
                      disabled
                    >
                      <StickyNote className="h-[18px] w-[18px]" />
                    </button>
                  ) : (
                    // Normal + Practice Focus mode — popover always accessible
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Quick Notes"
                        className={cn(btnBase, effectivePanel === "notes" ? btnActive : btnIdle)}
                      >
                        <StickyNote className="h-[18px] w-[18px]" />
                      </button>
                    </PopoverTrigger>
                  )}
                </TooltipTrigger>
                {effectivePanel !== "notes" && !isDeepNotesOpen && (
                  <TooltipContent side="left" className="text-xs">Quick Notes</TooltipContent>
                )}
                {isDeepNotesOpen && (
                  <TooltipContent side="left" className="text-xs">Deep Notes open</TooltipContent>
                )}
              </Tooltip>

              <PopoverContent
                side="left"
                sideOffset={10}
                align="start"
                className="w-[300px] p-0 overflow-hidden shadow-lg border-border/60"
                onInteractOutside={() => setActivePanel(null)}
              >
                <LessonNotesCard
                  content={content}
                  updateContent={updateContent}
                  appendContent={appendToContent}
                  isSaving={isSaving}
                  isSyncing={isSyncing}
                  lastSavedText={lastSavedText}
                  isLoading={notesLoading}
                  courseId={courseId}
                  lessonId={lessonId}
                  careerId={careerId}
                  onOpenDeepNotes={onOpenDeepNotes ? () => {
                    // If switching from practice focus → deep notes, exit practice first
                    if (isPracticeFocusOpen && onExitPractice) onExitPractice();
                    setActivePanel(null);
                    onOpenDeepNotes(lessonId);
                  } : undefined}
                />
              </PopoverContent>
            </Popover>

            {/* ── Practice & Reinforce ─────────────────────────────────── */}
            {onOpenPracticeFocus ? (
              /* Direct-entry: click goes straight to focus mode from anywhere */
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    aria-label="Practice & Reinforce"
                    onClick={() => {
                      if (isPracticeFocusOpen) return; // already there
                      // Switching from deep notes → practice: exit notes first
                      if (isDeepNotesOpen && onReturnToLesson) onReturnToLesson();
                      onOpenPracticeFocus(lessonId);
                    }}
                    className={cn(btnBase, isPracticeFocusOpen ? btnActive : btnIdle)}
                  >
                    <Dumbbell className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                {!isPracticeFocusOpen && (
                  <TooltipContent side="left" className="text-xs">Practice & Reinforce</TooltipContent>
                )}
              </Tooltip>
            ) : (
              /* Fallback popover when focus mode is unavailable */
              <Popover open={effectivePanel === "practice"} onOpenChange={(o) => toggle(o ? "practice" : null)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Practice & Reinforce"
                        className={cn(
                          btnBase,
                          effectivePanel === "practice" ? btnActive : btnIdle,
                          hasEditedCode && effectivePanel !== "practice" && "text-primary"
                        )}
                      >
                        {hasEditedCode
                          ? <Zap className="h-[18px] w-[18px]" />
                          : <Dumbbell className="h-[18px] w-[18px]" />
                        }
                        {hasEditedCode && (
                          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
                        )}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  {effectivePanel !== "practice" && (
                    <TooltipContent side="left" className="text-xs">Practice & Reinforce</TooltipContent>
                  )}
                </Tooltip>
                <PopoverContent
                  side="left"
                  sideOffset={10}
                  align="start"
                  className="w-[268px] p-0 overflow-hidden shadow-lg border-border/60"
                >
                  <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                    <Dumbbell className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[13px] font-semibold text-foreground">Practice & Reinforce</span>
                  </div>
                  <div className="p-3">
                    <button
                      onClick={() => {
                        if (hasEditedCode && editedCodeBlock) {
                          console.log("Open playground with:", editedCodeBlock);
                        }
                        setActivePanel(null);
                      }}
                      className={cn(
                        "w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all group",
                        hasEditedCode ? "bg-muted/60 shadow-sm" : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors flex-shrink-0",
                        hasEditedCode
                          ? "bg-muted text-foreground"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted text-muted-foreground"
                      )}>
                        {hasEditedCode ? <Zap className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">Run this code yourself</p>
                        <p className="text-xs mt-0.5 text-muted-foreground">
                          {hasEditedCode
                            ? `Your ${editedCodeBlock?.language || "code"} is ready to run`
                            : "Practice in the playground"}
                        </p>
                      </div>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* ── Divider ─────────────────────────────────────────────── */}

            {/* ── Ask a Doubt ─────────────────────────────────────────── */}
            <Popover open={effectivePanel === "help"} onOpenChange={(o) => toggle(o ? "help" : null)}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      aria-label="Ask a Doubt"
                      className={cn(btnBase, effectivePanel === "help" ? btnActive : btnIdle)}
                    >
                      <HelpCircle className="h-[18px] w-[18px]" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                {effectivePanel !== "help" && (
                  <TooltipContent side="left" className="text-xs">Ask a Doubt</TooltipContent>
                )}
              </Tooltip>

              <PopoverContent
                side="left"
                sideOffset={10}
                align="start"
                className="w-[268px] p-0 overflow-hidden shadow-lg border-border/60"
              >
                <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[13px] font-semibold text-foreground">Need help?</span>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    Stuck here? Ask a question about this lesson.
                  </p>
                  <AskDoubtButton
                    context={{
                      source_type: "lesson",
                      source_id: lessonId || "",
                      source_title: lessonTitle,
                      course_id: courseId,
                      lesson_id: lessonId,
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full text-sm border-border/60 bg-background hover:bg-muted/60 hover:text-foreground transition-colors duration-150"
                    label="Ask a Doubt"
                    messaging={messaging}
                  />
                </div>
              </PopoverContent>
            </Popover>

          </div>
        </TooltipProvider>
      </aside>

      <MessagingPopup
        view={messaging.view}
        connections={messaging.connections}
        activeConnection={messaging.activeConnection}
        activeConversationId={messaging.activeConversationId}
        activeThreadId={messaging.activeThreadId}
        typingChannelId={messaging.typingChannelId}
        messages={messaging.messages}
        isLoading={messaging.isLoading}
        isSending={messaging.isSending}
        totalUnread={messaging.totalUnread}
        userId={userId}
        lessonId={lessonId}
        courseId={courseId}
        onOpenChat={messaging.openChat}
        onSendMessage={messaging.sendMessage}
        onSendVoice={messaging.sendVoiceMessage}
        onSendAttachment={messaging.sendAttachment}
        onEditMessage={messaging.editMessage}
        onDeleteMessage={messaging.deleteMessage}
        onCollapse={messaging.collapse}
        onExpand={messaging.expand}
        onClose={messaging.close}
        onBackToList={messaging.backToList}
        onSetView={messaging.setView}
        onFetchConnections={messaging.fetchConnections}
        onDeleteConnection={messaging.deleteConnection}
        mentorPreview={messaging.mentorPreview}
        suggestedMentor={messaging.suggestedMentor}
        onStartMentorChat={handleStartMentorChat}
        onAskSuggestedMentor={handleAskSuggestedMentor}
        pastMessages={messaging.pastMessages}
        viewingPastConvoId={messaging.viewingPastConvoId}
        onLoadPastConversation={messaging.loadPastConversation}
        onClearPastConversation={messaging.clearPastConversation}
        onReopenConversation={messaging.reopenConversation}
      />
    </>
  );
};

export default LearningCockpit;
