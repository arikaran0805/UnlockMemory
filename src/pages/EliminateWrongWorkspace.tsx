/**
 * EliminateWrongWorkspace
 * 3-panel learner workspace for "Eliminate the Wrong Answer" problems.
 * Layout: LEFT (Description top + Code bottom) | RIGHT (Options panel)
 * Left panel matches PredictOutputWorkspace style.
 */
import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
  usePublishedEliminateWrongProblem,
  useEliminateWrongAttempts,
  useSubmitEliminateWrongAttempt,
} from "@/hooks/useEliminateWrongProblems";
import { usePublishedPracticeProblems, type ProblemWithMapping } from "@/hooks/usePracticeProblems";
import { ProblemListDrawer } from "@/components/practice/ProblemListDrawer";
import {
  EliminateWrongDescriptionPanel,
  EliminateWrongCodePanel,
  EliminateWrongOptionsPanel,
} from "@/components/eliminate-wrong";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ExpandedPanel = "description" | "options" | null;

export default function EliminateWrongWorkspace() {
  const { skillId, slug } = useParams<{ skillId: string; slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const descriptionPanelRef = useRef<ImperativePanelHandle>(null);
  const codePanelRef = useRef<ImperativePanelHandle>(null);
  const optionsPanelRef = useRef<ImperativePanelHandle>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(true);
  const [isCodeCollapsed, setIsCodeCollapsed] = useState(false);
  const [isOptionsCollapsed, setIsOptionsCollapsed] = useState(false);
  const [descriptionActiveTab, setDescriptionActiveTab] = useState("description");

  // Fetch skill info
  const { data: skill } = useQuery({
    queryKey: ["practice-skill-by-slug", skillId],
    queryFn: async () => {
      if (!skillId) return null;
      const { data, error } = await supabase
        .from("practice_skills")
        .select("id, name, slug")
        .eq("slug", skillId)
        .eq("status", "published")
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!skillId,
  });

  const { data: allProblemsInSkill = [] } = usePublishedPracticeProblems(skillId);
  const { data: problem, isLoading } = usePublishedEliminateWrongProblem(slug);
  const { data: attempts = [] } = useEliminateWrongAttempts(problem?.id);
  const submitMutation = useSubmitEliminateWrongAttempt();

  // Panel expand handlers
  const handleExpandDescription = () => setExpandedPanel(expandedPanel === "description" ? null : "description");
  const handleExpandOptions = () => setExpandedPanel(expandedPanel === "options" ? null : "options");

  const handleToggleCollapseOptions = () => {
    if (isMobile) { setIsOptionsCollapsed((v) => !v); return; }
    if (isOptionsCollapsed) optionsPanelRef.current?.expand();
    else optionsPanelRef.current?.collapse();
  };

  const handleToggleCollapseDescription = () => {
    if (isMobile) { setIsDescriptionCollapsed((v) => !v); return; }
    if (isDescriptionCollapsed) descriptionPanelRef.current?.expand();
    else descriptionPanelRef.current?.collapse();
  };

  const handleToggleCollapseCode = () => {
    if (isMobile) { setIsCodeCollapsed((v) => !v); return; }
    if (isCodeCollapsed) codePanelRef.current?.expand();
    else codePanelRef.current?.collapse();
  };

  const handleCommentClick = () => {
    setDescriptionActiveTab("discuss");
    if (isDescriptionCollapsed) {
      handleToggleCollapseDescription();
    }
  };

  const handleSubmitAttempt = (selectedIds: string[], isCorrect: boolean, score: number) => {
    if (!problem) return;
    submitMutation.mutate({
      problem_id: problem.id,
      selected_options: selectedIds,
      is_correct: isCorrect,
      score,
    });
  };

  // Navigation
  const currentIndex = allProblemsInSkill.findIndex((p) => p.slug === slug);
  const prevProblem = currentIndex > 0 ? allProblemsInSkill[currentIndex - 1] : null;
  const nextProblem = currentIndex < allProblemsInSkill.length - 1 ? allProblemsInSkill[currentIndex + 1] : null;

  const navigateToProblem = (p: ProblemWithMapping) => {
    if (p.problemType === "predict-output") navigate(`/practice/${skillId}/predict/${p.slug}`);
    else if (p.problemType === "fix-error") navigate(`/practice/${skillId}/fix-error/${p.slug}`);
    else if (p.problemType === "eliminate-wrong") navigate(`/practice/${skillId}/eliminate/${p.slug}`);
    else navigate(`/practice/${skillId}/problem/${p.slug}`);
  };

  const handleDrawerSelectProblem = (problemSlug: string, problemType?: string) => {
    if (problemType === "predict-output") navigate(`/practice/${skillId}/predict/${problemSlug}`);
    else if (problemType === "fix-error") navigate(`/practice/${skillId}/fix-error/${problemSlug}`);
    else if (problemType === "eliminate-wrong") navigate(`/practice/${skillId}/eliminate/${problemSlug}`);
    else navigate(`/practice/${skillId}/problem/${problemSlug}`);
  };

  // Loading
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-32 ml-4" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Not found
  if (!problem) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/practice/${skillId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <p>Problem not found</p>
          <Button variant="link" onClick={() => navigate(`/practice/${skillId}`)}>
            Back to problem list
          </Button>
        </div>
      </div>
    );
  }

  // Top nav bar
  const topNav = (
    <div className="h-12 flex items-center px-4 border-b border-border/50 bg-card shrink-0">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/practice/${skillId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <List className="h-3.5 w-3.5" />
          <span>{skill?.name || "Problems"}</span>
        </button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => prevProblem && navigateToProblem(prevProblem)} disabled={!prevProblem}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">{problem.title}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => nextProblem && navigateToProblem(nextProblem)} disabled={!nextProblem}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Expanded panel views
  if (expandedPanel) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <ProblemListDrawer
          open={drawerOpen} onOpenChange={setDrawerOpen}
          skillName={skill?.name || "Problems"} problems={allProblemsInSkill}
          currentProblemSlug={slug} onSelectProblem={handleDrawerSelectProblem}
        />
        {topNav}
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/30 p-1.5">
          {expandedPanel === "description" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <EliminateWrongDescriptionPanel
                problem={problem}
                attempts={attempts}
                isExpanded
                onToggleExpand={handleExpandDescription}
                isCollapsed={false}
                onToggleCollapse={handleToggleCollapseDescription}
                activeTab={descriptionActiveTab}
                onTabChange={setDescriptionActiveTab}
              />
            </div>
          )}
          {expandedPanel === "options" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <EliminateWrongOptionsPanel
                problem={problem} isExpanded onToggleExpand={handleExpandOptions}
                onSubmit={handleSubmitAttempt} isSubmitting={submitMutation.isPending} pastAttempts={attempts}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div key={problem.id} className="h-screen flex flex-col bg-background">
      <ProblemListDrawer
        open={drawerOpen} onOpenChange={setDrawerOpen}
        skillName={skill?.name || "Problems"} problems={allProblemsInSkill}
        currentProblemSlug={slug} onSelectProblem={handleDrawerSelectProblem}
      />
      {topNav}

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
        {isMobile ? (
          <div className="h-full flex flex-col overflow-auto p-1.5 gap-1.5">
            {/* Description */}
            <div className={cn(
              "bg-card rounded-lg border border-border shadow-sm overflow-hidden",
              isDescriptionCollapsed ? "min-h-[56px]" : "min-h-[30vh]"
            )}>
              <EliminateWrongDescriptionPanel
                problem={problem}
                attempts={attempts}
                isExpanded={false}
                onToggleExpand={handleExpandDescription}
                isCollapsed={isDescriptionCollapsed}
                onToggleCollapse={handleToggleCollapseDescription}
                activeTab={descriptionActiveTab}
                onTabChange={setDescriptionActiveTab}
              />
            </div>
            {/* Code */}
            {problem.context_code && (
              <div className={cn(
                "bg-card rounded-lg border border-border shadow-sm overflow-hidden",
                isCodeCollapsed ? "min-h-[56px]" : "min-h-[30vh]"
              )}>
                <EliminateWrongCodePanel
                  code={problem.context_code}
                  language={problem.language}
                  problemId={problem.id}
                  problemTitle={problem.title}
                  isCollapsed={isCodeCollapsed}
                  onToggleCollapse={handleToggleCollapseCode}
                  onCommentClick={handleCommentClick}
                />
              </div>
            )}
            {/* Options */}
            <div className="flex-1 min-h-[40vh] bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <EliminateWrongOptionsPanel problem={problem} onToggleExpand={handleExpandOptions} onSubmit={handleSubmitAttempt} isSubmitting={submitMutation.isPending} pastAttempts={attempts} />
            </div>
          </div>
        ) : (
          <div className="h-full p-1.5">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel: Description (top) + Code (bottom) */}
              <ResizablePanel defaultSize={45} minSize={25} className="min-h-0">
                <ResizablePanelGroup direction="vertical" className="h-full">
                  {/* Description */}
                  <ResizablePanel
                    ref={descriptionPanelRef}
                    defaultSize={8}
                    minSize={15}
                    collapsible
                    collapsedSize={8}
                    className="min-h-0"
                    onCollapse={() => setIsDescriptionCollapsed(true)}
                    onExpand={() => setIsDescriptionCollapsed(false)}
                  >
                    <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      <EliminateWrongDescriptionPanel
                        problem={problem}
                        attempts={attempts}
                        isExpanded={false}
                        onToggleExpand={handleExpandDescription}
                        isCollapsed={isDescriptionCollapsed}
                        onToggleCollapse={handleToggleCollapseDescription}
                        activeTab={descriptionActiveTab}
                        onTabChange={setDescriptionActiveTab}
                      />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle />

                  {/* Code */}
                  <ResizablePanel
                    ref={codePanelRef}
                    defaultSize={92}
                    minSize={15}
                    collapsible
                    collapsedSize={8}
                    className="min-h-0"
                    onCollapse={() => setIsCodeCollapsed(true)}
                    onExpand={() => setIsCodeCollapsed(false)}
                  >
                    <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      <EliminateWrongCodePanel
                        code={problem.context_code}
                        language={problem.language}
                        problemId={problem.id}
                        problemTitle={problem.title}
                        isCollapsed={isCodeCollapsed}
                        onToggleCollapse={handleToggleCollapseCode}
                        onCommentClick={handleCommentClick}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle />

              {/* Right Panel: Options */}
              <ResizablePanel
                ref={optionsPanelRef}
                defaultSize={55}
                minSize={25}
                collapsible
                collapsedSize={3}
                className="min-h-0"
                onCollapse={() => setIsOptionsCollapsed(true)}
                onExpand={() => setIsOptionsCollapsed(false)}
              >
                <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <EliminateWrongOptionsPanel
                    problem={problem}
                    isExpanded={false}
                    onToggleExpand={handleExpandOptions}
                    isCollapsed={isOptionsCollapsed}
                    onToggleCollapse={handleToggleCollapseOptions}
                    collapseDirection="left"
                    onSubmit={handleSubmitAttempt}
                    isSubmitting={submitMutation.isPending}
                    pastAttempts={attempts}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}
