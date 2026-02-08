/**
 * PredictOutputWorkspace
 * Full-page workspace for Predict the Output problems.
 * Layout: Left (Description top + Code bottom) | Right (Output top + Result bottom)
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
import { usePublishedPredictOutputProblem } from "@/hooks/usePredictOutputProblems";
import { usePredictOutputAttempts } from "@/hooks/usePredictOutputAttempts";
import { usePublishedPracticeProblems, type ProblemWithMapping } from "@/hooks/usePracticeProblems";
import { PredictDescriptionPanel } from "@/components/predict-output/PredictDescriptionPanel";
import { PredictCodePanel } from "@/components/predict-output/PredictCodePanel";
import { PredictEditorPanel } from "@/components/predict-output/PredictEditorPanel";
import { ProblemListDrawer } from "@/components/practice/ProblemListDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ExpandedPanel = "description" | "code" | "editor" | "result" | null;

export default function PredictOutputWorkspace() {
  const { skillId, problemSlug } = useParams<{ skillId: string; problemSlug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const descriptionPanelRef = useRef<ImperativePanelHandle>(null);
  const codePanelRef = useRef<ImperativePanelHandle>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(true);
  const [isCodeCollapsed, setIsCodeCollapsed] = useState(false);
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
  const { data: problem, isLoading } = usePublishedPredictOutputProblem(problemSlug);
  const { data: attempts = [] } = usePredictOutputAttempts(problem?.id);

  // Panel expand handlers
  const handleExpandDescription = () => setExpandedPanel(expandedPanel === "description" ? null : "description");
  const handleExpandCode = () => setExpandedPanel(expandedPanel === "code" ? null : "code");
  const handleExpandEditor = () => setExpandedPanel(expandedPanel === "editor" ? null : "editor");
  const handleExpandResult = () => setExpandedPanel(expandedPanel === "result" ? null : "result");

  const handleToggleCollapseDescription = () => {
    if (isMobile) {
      setIsDescriptionCollapsed((v) => !v);
      return;
    }
    if (isDescriptionCollapsed) {
      descriptionPanelRef.current?.expand();
    } else {
      descriptionPanelRef.current?.collapse();
    }
  };

  const handleToggleCollapseCode = () => {
    if (isMobile) {
      setIsCodeCollapsed((v) => !v);
      return;
    }
    if (isCodeCollapsed) {
      codePanelRef.current?.expand();
    } else {
      codePanelRef.current?.collapse();
    }
  };

  const handleCommentClick = () => {
    setDescriptionActiveTab("discuss");
    if (isDescriptionCollapsed) {
      handleToggleCollapseDescription();
    }
  };

  // On submit: expand desc panel and show attempts tab
  const handleSubmitExpandDescription = () => {
    setDescriptionActiveTab("attempts");
    if (isMobile) {
      setIsDescriptionCollapsed(false);
    } else {
      descriptionPanelRef.current?.expand();
      descriptionPanelRef.current?.resize(50);
    }
  };

  // On retry: collapse desc panel back
  const handleRetryCollapseDescription = () => {
    if (!isDescriptionCollapsed) {
      if (isMobile) {
        setIsDescriptionCollapsed(true);
      } else {
        descriptionPanelRef.current?.collapse();
      }
    }
  };

  // Navigation
  const currentIndex = allProblemsInSkill.findIndex((p) => p.slug === problemSlug);
  const prevProblem = currentIndex > 0 ? allProblemsInSkill[currentIndex - 1] : null;
  const nextProblem = currentIndex < allProblemsInSkill.length - 1 ? allProblemsInSkill[currentIndex + 1] : null;

  const navigateToProblem = (p: ProblemWithMapping) => {
    if (p.problemType === "predict-output") {
      navigate(`/practice/${skillId}/predict/${p.slug}`);
    } else if (p.problemType === "fix-error") {
      navigate(`/practice/${skillId}/fix-error/${p.slug}`);
    } else if (p.problemType === "eliminate-wrong") {
      navigate(`/practice/${skillId}/eliminate/${p.slug}`);
    } else {
      navigate(`/practice/${skillId}/problem/${p.slug}`);
    }
  };

  const handlePrevProblem = () => { if (prevProblem) navigateToProblem(prevProblem); };
  const handleNextProblem = () => { if (nextProblem) navigateToProblem(nextProblem); };

  const handleDrawerSelectProblem = (slug: string) => {
    const p = allProblemsInSkill.find((pr) => pr.slug === slug);
    if (p) navigateToProblem(p);
    else navigate(`/practice/${skillId}/problem/${slug}`);
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevProblem} disabled={!prevProblem}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2">{problem.title}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextProblem} disabled={!nextProblem}>
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
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          skillName={skill?.name || "Problems"}
          problems={allProblemsInSkill}
          currentProblemSlug={problemSlug}
          onSelectProblem={handleDrawerSelectProblem}
        />
        {topNav}
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/30 p-1.5">
          {expandedPanel === "description" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <PredictDescriptionPanel
                problem={problem}
                attempts={attempts}
                isExpanded={true}
                onToggleExpand={handleExpandDescription}
                isCollapsed={false}
                onToggleCollapse={handleToggleCollapseDescription}
                activeTab={descriptionActiveTab}
                onTabChange={setDescriptionActiveTab}
              />
            </div>
          )}
          {expandedPanel === "code" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <PredictCodePanel
                problem={problem}
                isExpanded={true}
                onToggleExpand={handleExpandCode}
                onCommentClick={handleCommentClick}
              />
            </div>
          )}
          {(expandedPanel === "editor" || expandedPanel === "result") && (
            <PredictEditorPanel
              problem={problem}
              attempts={attempts}
              expandedPanel={expandedPanel}
              onExpandEditor={handleExpandEditor}
              onExpandResult={handleExpandResult}
              onTabSwitchToAttempts={() => setDescriptionActiveTab("attempts")}
              onSubmitExpandDescription={handleSubmitExpandDescription}
              onRetryCollapseDescription={handleRetryCollapseDescription}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div key={problem.id} className="h-screen flex flex-col bg-background">
      <ProblemListDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        skillName={skill?.name || "Problems"}
        problems={allProblemsInSkill}
        currentProblemSlug={problemSlug}
        onSelectProblem={handleDrawerSelectProblem}
      />
      {topNav}

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
        {isMobile ? (
          <div className="h-full flex flex-col overflow-auto p-1.5 gap-1.5">
            {/* Description */}
            <div
              className={cn(
                "bg-card rounded-lg border border-border shadow-sm overflow-hidden",
                isDescriptionCollapsed ? "min-h-[56px]" : "min-h-[30vh]"
              )}
            >
              <PredictDescriptionPanel
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
            <div
              className={cn(
                "bg-card rounded-lg border border-border shadow-sm overflow-hidden",
                isCodeCollapsed ? "min-h-[56px]" : "min-h-[30vh]"
              )}
            >
              <PredictCodePanel
                problem={problem}
                isCollapsed={isCodeCollapsed}
                onToggleCollapse={handleToggleCollapseCode}
                onToggleExpand={handleExpandCode}
                onCommentClick={handleCommentClick}
              />
            </div>
            {/* Output + Result */}
            <div className="flex-1 min-h-[40vh]">
              <PredictEditorPanel
                problem={problem}
                attempts={attempts}
                expandedPanel={null}
                onExpandEditor={handleExpandEditor}
                onExpandResult={handleExpandResult}
                onTabSwitchToAttempts={() => setDescriptionActiveTab("attempts")}
                onSubmitExpandDescription={handleSubmitExpandDescription}
                onRetryCollapseDescription={handleRetryCollapseDescription}
              />
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
                      <PredictDescriptionPanel
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
                      <PredictCodePanel
                        problem={problem}
                        isCollapsed={isCodeCollapsed}
                        onToggleCollapse={handleToggleCollapseCode}
                        onToggleExpand={handleExpandCode}
                        onCommentClick={handleCommentClick}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>

              <ResizableHandle />

              {/* Right Panel: Output (top) + Result (bottom) */}
              <ResizablePanel defaultSize={55} minSize={30} className="min-h-0">
                <PredictEditorPanel
                  problem={problem}
                  attempts={attempts}
                  expandedPanel={null}
                  onExpandEditor={handleExpandEditor}
                  onExpandResult={handleExpandResult}
                  onTabSwitchToAttempts={() => setDescriptionActiveTab("attempts")}
                  onSubmitExpandDescription={handleSubmitExpandDescription}
                  onRetryCollapseDescription={handleRetryCollapseDescription}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}
