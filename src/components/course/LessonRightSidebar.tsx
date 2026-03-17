import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLessonNotes } from "@/hooks/useLessonNotes";
import { useLessonFlowNavigation } from "@/hooks/useLessonFlowNavigation";
import { useCodeEdit } from "@/contexts/CodeEditContext";
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
  User,
  Sparkles,
  Zap,
} from "lucide-react";

interface LessonRightSidebarProps {
  lessonId: string | undefined;
  lessonTitle: string;
  courseId: string | undefined;
  courseSlug: string;
  userId: string | undefined;
  isLessonCompleted: boolean;
  isHeaderVisible: boolean;
  showAnnouncement: boolean;
  assignedModerator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
}

// Lesson Flow sections - now uses data-flow attribute
const LESSON_FLOW_SECTIONS = [
  { id: "chat", label: "Chat Bubbles", icon: MessageSquareCode },
  { id: "cause", label: "Cause & Effect", icon: ArrowRightCircle },
];

// Practice items
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

export function LessonRightSidebar({
  lessonId,
  lessonTitle,
  courseId,
  courseSlug,
  userId,
  isLessonCompleted,
  isHeaderVisible,
  showAnnouncement,
  assignedModerator,
}: LessonRightSidebarProps) {
  
  // Get code edit context to detect when learners edit code
  let codeEditContext: ReturnType<typeof useCodeEdit> | null = null;
  try {
    codeEditContext = useCodeEdit();
  } catch {
    // Context not available
  }
  
  const hasEditedCode = codeEditContext?.hasEditedCode ?? false;
  const editedCodeBlock = codeEditContext?.editedCodeBlock ?? null;

  // Messaging system
  const messaging = useMessaging(userId);

  // Calculate scroll offset based on header visibility
  const scrollOffset = isHeaderVisible
    ? (showAnnouncement ? 140 : 104)
    : (showAnnouncement ? 76 : 40);

  // Lesson Flow navigation with scroll-spy and scroll-to
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

  // Calculate sticky top position based on header visibility (matching left sidebar)
  const stickyTopClass = isHeaderVisible
    ? (showAnnouncement ? 'top-[8.75rem]' : 'top-[6.5rem]')
    : (showAnnouncement ? 'top-[4.75rem]' : 'top-10');

  return (
    <aside className="hidden xl:block w-[300px] flex-shrink-0">
      <div className={cn("sticky transition-[top] duration-200 ease-out", stickyTopClass)}>
        <div className="space-y-4 p-1 pb-6">
        {/* SECTION 1: Lesson Flow (Semantic Navigation) */}
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
                      // Base styles with smooth transitions
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left relative overflow-hidden",
                      "transition-all duration-200 ease-out",
                      // Left border indicator container
                      "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:rounded-full",
                      "before:transition-all before:duration-200 before:ease-out",
                      // Disabled state
                      isDisabled && "opacity-40 cursor-not-allowed text-muted-foreground",
                      // Active state - soft highlight with left border
                      !isDisabled && isActive && [
                        "bg-primary/8 text-primary font-medium",
                        "before:h-5 before:bg-primary before:opacity-100",
                      ],
                      // Inactive state - subtle and calm
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

        {/* SECTION 2: Quick Notes (Inline) */}
        {userId && (
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
        )}

        {/* SECTION 3: Practice & Reinforcement */}
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
              const isRunCode = item.id === "run-code";
              const isActivated = isRunCode && hasEditedCode;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isRunCode && editedCodeBlock) {
                      // TODO: Open playground with edited code
                      console.log("Open playground with:", editedCodeBlock);
                    }
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-2 rounded-md text-left transition-all group",
                    isActivated
                      ? "bg-primary/10 shadow-sm"
                      : "hover:bg-muted/50 hover:shadow-sm"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-md transition-colors",
                    isActivated
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    {isActivated ? <Zap className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isActivated ? "text-primary" : "text-foreground"
                    )}>
                      {item.title}
                    </p>
                    <p className={cn(
                      "text-xs truncate",
                      isActivated ? "text-primary/70" : "text-muted-foreground"
                    )}>
                      {isActivated 
                        ? `Your ${editedCodeBlock?.language || 'code'} is ready to run`
                        : item.description
                      }
                    </p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* SECTION 4: Ask / Confusion Box */}
        {userId && (
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
        )}

        {/* SECTION 5: Instructor / Moderator Presence */}
        {assignedModerator && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Instructor Support
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-border/50">
                  <AvatarImage src={assignedModerator.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                    {assignedModerator.full_name?.charAt(0)?.toUpperCase() || "M"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {assignedModerator.full_name || "Instructor"}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0 h-5 bg-muted/50"
                    >
                      {assignedModerator.role === "senior_moderator"
                        ? "Senior Moderator"
                        : "Moderator"}
                    </Badge>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Usually replies in 2–4 hrs
              </p>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
      {/* Messaging Popup */}
      {userId && (
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
        />
      )}
    </aside>
  );
}

export default LessonRightSidebar;
