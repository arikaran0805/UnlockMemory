import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLessonNotes } from "@/hooks/useLessonNotes";
import { useLessonFlowNavigation } from "@/hooks/useLessonFlowNavigation";
import { useMessaging } from "@/hooks/useMessaging";
import { MessagingPopup } from "@/components/messaging/MessagingPopup";
import { LessonNotesCard } from "./LessonNotesCard";
import {
  GitBranch,
  MessageSquareCode,
  ArrowRightCircle,
  Play,
  FileText,
  HelpCircle,
  Sparkles,
} from "lucide-react";

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
  /** If true, uses Career Board header offsets (Primary + CareerScopedHeader) */
  isCareerBoard?: boolean;
}

// Lesson Flow sections - uses data-flow attribute
const LESSON_FLOW_SECTIONS = [
  { id: "chat", label: "Chat Bubbles", icon: MessageSquareCode },
  { id: "cause", label: "Cause & Effect", icon: ArrowRightCircle },
];

// Practice items for Pro users
const PRACTICE_ITEMS = [
  {
    id: "quick-questions",
    title: "Try 2 quick questions",
    description: "Test your understanding",
    icon: Sparkles,
  },
  {
    id: "run-code",
    title: "Run this code yourself",
    description: "Practice in the playground",
    icon: Play,
  },
  {
    id: "cheat-sheet",
    title: "Cheat sheet",
    description: "Quick reference guide",
    icon: FileText,
  },
];

/**
 * Learning Cockpit - Pro user's sidebar for lesson view
 * Replaces ads with rich learning tools: flow nav, notes, practice, certificate
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
  isCareerBoard = false,
}: LearningCockpitProps) => {
  const messaging = useMessaging(userId);

  // Calculate scroll offset based on context
  // Career Board: Primary (64px) + CareerScopedHeader (48px) = 112px base
  // Standard: Primary (64px) + Secondary (40px) = 104px base
  const scrollOffset = isCareerBoard
    ? (isHeaderVisible
        ? (showAnnouncement ? 148 : 112)
        : (showAnnouncement ? 84 : 48))
    : (isHeaderVisible
        ? (showAnnouncement ? 140 : 104)
        : (showAnnouncement ? 76 : 40));

  // Lesson Flow navigation
  const {
    activeSection,
    sections: lessonFlowSections,
    scrollToSection
  } = useLessonFlowNavigation(
    LESSON_FLOW_SECTIONS.map(s => ({ id: s.id, label: s.label })),
    { scrollOffset }
  );

  // Notes hook
  const { content, updateContent, isSaving, isSyncing, lastSaved, isLoading } = useLessonNotes({
    lessonId,
    courseId,
    userId,
  });

  // Format last saved time
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 60) return "Saved just now";
    if (diff < 3600) return `Saved ${Math.floor(diff / 60)}m ago`;
    return `Saved ${Math.floor(diff / 3600)}h ago`;
  }, [lastSaved]);

  // Sticky position classes - Career Board uses different header heights
  const stickyTopClass = isCareerBoard
    ? (isHeaderVisible
        ? (showAnnouncement ? 'top-[9.25rem]' : 'top-28')
        : (showAnnouncement ? 'top-[5.25rem]' : 'top-12'))
    : (isHeaderVisible
        ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
        : (showAnnouncement ? 'top-[4.75rem]' : 'top-10'));

  return (
    <>
      <aside className="hidden xl:block w-[300px] flex-shrink-0">
        <div className={cn("sticky transition-[top] duration-200 ease-out", stickyTopClass)}>
          <div className="space-y-4 p-1 pb-6">

            {/* Lesson Flow Navigation */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  Lesson Flow
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <nav className="space-y-1" role="navigation" aria-label="Lesson sections">
                  {LESSON_FLOW_SECTIONS.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    const sectionData = lessonFlowSections.find(s => s.id === section.id);
                    const exists = sectionData?.exists ?? false;
                    const isDisabled = !exists;

                    return (
                      <button
                        key={section.id}
                        onClick={() => !isDisabled && scrollToSection(section.id)}
                        disabled={isDisabled}
                        aria-current={isActive ? "location" : undefined}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left relative overflow-hidden",
                          "transition-all duration-200 ease-out",
                          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:rounded-full",
                          "before:transition-all before:duration-200 before:ease-out",
                          isDisabled && "opacity-40 cursor-not-allowed text-muted-foreground",
                          !isDisabled && isActive && [
                            "bg-primary/8 text-primary font-medium",
                            "before:h-5 before:bg-primary before:opacity-100",
                          ],
                          !isDisabled && !isActive && [
                            "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                            "before:h-0 before:bg-primary before:opacity-0",
                          ]
                        )}
                      >
                        <Icon className={cn(
                          "h-4 w-4 flex-shrink-0 transition-colors duration-200",
                          isActive && !isDisabled && "text-primary"
                        )} />
                        <span className="flex-1 truncate">
                          {isActive && !isDisabled ? (
                            <span><span className="text-muted-foreground font-normal">You are in:</span> {section.label}</span>
                          ) : (
                            section.label
                          )}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>

            {/* Quick Notes */}
            <LessonNotesCard
              content={content}
              updateContent={updateContent}
              isSaving={isSaving}
              isSyncing={isSyncing}
              lastSavedText={lastSavedText}
              isLoading={isLoading}
              courseId={courseId}
              lessonId={lessonId}
            />

            {/* Practice & Reinforce */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Play className="h-4 w-4 text-muted-foreground" />
                  Practice & Reinforce
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0 space-y-2">
                {PRACTICE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      className="w-full flex items-start gap-3 p-2 rounded-md text-left transition-all group hover:bg-muted/50 hover:shadow-sm"
                    >
                      <div className="p-1.5 rounded-md bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Need Help */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Need help?
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  Stuck here? Ask a question about this lesson.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-sm border-border/50 hover:bg-muted/50"
                  onClick={() => messaging.openMessaging(lessonId)}
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-2" />
                  Ask a Question
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </aside>

      <MessagingPopup
        view={messaging.view}
        connections={messaging.connections}
        activeConnection={messaging.activeConnection}
        messages={messaging.messages}
        isLoading={messaging.isLoading}
        isSending={messaging.isSending}
        totalUnread={messaging.totalUnread}
        userId={userId}
        lessonId={lessonId}
        onOpenChat={messaging.openChat}
        onSendMessage={messaging.sendMessage}
        onCollapse={messaging.collapse}
        onExpand={messaging.expand}
        onClose={messaging.close}
        onBackToList={messaging.backToList}
        onSetView={messaging.setView}
        onFetchConnections={messaging.fetchConnections}
        onDeleteConnection={messaging.deleteConnection}
      />
    </>
  );
};

export default LearningCockpit;
