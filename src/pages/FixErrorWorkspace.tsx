/**
 * FixErrorWorkspace
 *
 * Learner-facing workspace for "Fix the Error" problems.
 *
 * Layout (like Solve):
 *   LEFT — Problem Description (collapsible)
 *   RIGHT-TOP — Code Editor
 *   RIGHT-BOTTOM — Result / Feedback
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
import { usePublishedFixErrorProblem } from "@/hooks/useFixErrorProblemBySlug";
import { usePublishedPracticeProblems, type ProblemWithMapping } from "@/hooks/usePracticeProblems";
import { useFixErrorJudge } from "@/hooks/useFixErrorJudge";
import { ProblemListDrawer } from "@/components/practice/ProblemListDrawer";
import { FixErrorDescriptionPanel } from "@/components/fix-error/FixErrorDescriptionPanel";
import { FixErrorCodeEditor } from "@/components/fix-error/FixErrorCodeEditor";
import { FixErrorResultPanel } from "@/components/fix-error/FixErrorResultPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type ExpandedPanel = "description" | "editor" | "result" | null;

export default function FixErrorWorkspace() {
  const { skillId, slug } = useParams<{ skillId: string; slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const descriptionPanelRef = useRef<ImperativePanelHandle>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(false);
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);

  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultPanelRef = useRef<ImperativePanelHandle>(null);

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
  const { data: problem, isLoading } = usePublishedFixErrorProblem(slug);

  // Use the new judge hook
  const { verdict, result, run, submit, reset } = useFixErrorJudge(problem ?? null);

  // Panel expand handlers
  const handleExpandDescription = () =>
    setExpandedPanel(expandedPanel === "description" ? null : "description");
  const handleExpandEditor = () =>
    setExpandedPanel(expandedPanel === "editor" ? null : "editor");
  const handleExpandResult = () =>
    setExpandedPanel(expandedPanel === "result" ? null : "result");

  // Collapse toggle for description panel
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

  // Collapse toggle for editor panel
  const handleToggleEditorCollapse = () => {
    if (isEditorCollapsed) {
      editorPanelRef.current?.expand();
    } else {
      editorPanelRef.current?.collapse();
    }
  };

  // Collapse toggle for result panel
  const handleToggleResultCollapse = () => {
    if (isResultCollapsed) {
      resultPanelRef.current?.expand();
    } else {
      resultPanelRef.current?.collapse();
    }
  };

  // Navigation
  const currentIndex = allProblemsInSkill.findIndex((p) => p.slug === slug);
  const prevProblem = currentIndex > 0 ? allProblemsInSkill[currentIndex - 1] : null;
  const nextProblem =
    currentIndex < allProblemsInSkill.length - 1
      ? allProblemsInSkill[currentIndex + 1]
      : null;

  const navigateToProblem = (p: ProblemWithMapping) => {
    reset(); // Reset judge state on navigation
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

  const handlePrevProblem = () => {
    if (prevProblem) navigateToProblem(prevProblem);
  };
  const handleNextProblem = () => {
    if (nextProblem) navigateToProblem(nextProblem);
  };

  const handleDrawerSelectProblem = (
    problemSlug: string,
    problemType?: string
  ) => {
    reset();
    if (problemType === "predict-output") {
      navigate(`/practice/${skillId}/predict/${problemSlug}`);
    } else if (problemType === "fix-error") {
      navigate(`/practice/${skillId}/fix-error/${problemSlug}`);
    } else if (problemType === "eliminate-wrong") {
      navigate(`/practice/${skillId}/eliminate/${problemSlug}`);
    } else {
      navigate(`/practice/${skillId}/problem/${problemSlug}`);
    }
  };

  // Handlers for code editor
  const handleRun = (code: string) => run(code);
  const handleSubmit = (code: string) => submit(code);

  const isRunning = verdict === "running";

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
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(`/practice/${skillId}`)}
        >
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

  // Shared result panel props
  const resultPanelProps = {
    verdict,
    result,
    successMessage: problem.success_message,
    failureMessage: problem.failure_message,
  };

  // Expanded panel views
  if (expandedPanel) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <ProblemListDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          skillName={skill?.name || "Problems"}
          problems={allProblemsInSkill}
          currentProblemSlug={slug}
          onSelectProblem={handleDrawerSelectProblem}
        />
        {topNav}
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/30 p-1.5">
          {expandedPanel === "description" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorDescriptionPanel
                problem={problem}
                isExpanded
                onToggleExpand={handleExpandDescription}
                isCollapsed={isDescriptionCollapsed}
                onToggleCollapse={handleToggleCollapseDescription}
              />
            </div>
          )}
          {expandedPanel === "editor" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorCodeEditor
                initialCode={problem.buggy_code}
                language={problem.language}
                onRun={handleRun}
                onSubmit={handleSubmit}
                isRunning={isRunning}
                isExpanded
                onToggleExpand={handleExpandEditor}
                editableStartLine={(problem as any).editable_start_line}
                editableEndLine={(problem as any).editable_end_line}
              />
            </div>
          )}
          {expandedPanel === "result" && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorResultPanel
                {...resultPanelProps}
                isExpanded
                onToggleExpand={handleExpandResult}
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
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        skillName={skill?.name || "Problems"}
        problems={allProblemsInSkill}
        currentProblemSlug={slug}
        onSelectProblem={handleDrawerSelectProblem}
      />
      {topNav}

      {/* Main Content - 3-panel layout like Solve */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
        {isMobile ? (
          <div className="h-full flex flex-col overflow-auto p-1.5 gap-1.5">
            <div className={cn(
              "bg-card rounded-lg border border-border shadow-sm overflow-hidden",
              isDescriptionCollapsed ? "min-h-[56px]" : "min-h-[25vh]"
            )}>
              <FixErrorDescriptionPanel
                problem={problem}
                onToggleExpand={handleExpandDescription}
                isCollapsed={isDescriptionCollapsed}
                onToggleCollapse={handleToggleCollapseDescription}
              />
            </div>
            <div className="min-h-[40vh] bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorCodeEditor
                initialCode={problem.buggy_code}
                language={problem.language}
                onRun={handleRun}
                onSubmit={handleSubmit}
                isRunning={isRunning}
                onToggleExpand={handleExpandEditor}
                editableStartLine={(problem as any).editable_start_line}
                editableEndLine={(problem as any).editable_end_line}
              />
            </div>
            <div className="min-h-[25vh] bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <FixErrorResultPanel
                {...resultPanelProps}
                onToggleExpand={handleExpandResult}
              />
            </div>
          </div>
        ) : (
          <div className="h-full p-1.5">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* LEFT: Problem Description (collapsible) */}
              <ResizablePanel
                ref={descriptionPanelRef}
                defaultSize={45}
                minSize={25}
                collapsible
                collapsedSize={3}
                className="min-h-0"
                onCollapse={() => setIsDescriptionCollapsed(true)}
                onExpand={() => setIsDescriptionCollapsed(false)}
              >
                <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                  <FixErrorDescriptionPanel
                    problem={problem}
                    onToggleExpand={handleExpandDescription}
                    isCollapsed={isDescriptionCollapsed}
                    onToggleCollapse={handleToggleCollapseDescription}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* RIGHT: Editor (top) + Result (bottom) */}
              <ResizablePanel defaultSize={55} minSize={30} className="min-h-0">
                <ResizablePanelGroup direction="vertical" className="h-full">
                  {/* Code Editor */}
                  <ResizablePanel
                    ref={editorPanelRef}
                    defaultSize={60}
                    minSize={25}
                    collapsible
                    collapsedSize={8}
                    className="min-h-0"
                    onCollapse={() => setIsEditorCollapsed(true)}
                    onExpand={() => setIsEditorCollapsed(false)}
                  >
                    <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      <FixErrorCodeEditor
                        initialCode={problem.buggy_code}
                        language={problem.language}
                        onRun={handleRun}
                        onSubmit={handleSubmit}
                        isRunning={isRunning}
                        onToggleExpand={handleExpandEditor}
                        isCollapsed={isEditorCollapsed}
                        onToggleCollapse={handleToggleEditorCollapse}
                        editableStartLine={(problem as any).editable_start_line}
                        editableEndLine={(problem as any).editable_end_line}
                      />
                    </div>
                  </ResizablePanel>

                  <ResizableHandle />

                  {/* Result / Feedback */}
                  <ResizablePanel
                    ref={resultPanelRef}
                    defaultSize={40}
                    minSize={15}
                    collapsible
                    collapsedSize={8}
                    className="min-h-0"
                    onCollapse={() => setIsResultCollapsed(true)}
                    onExpand={() => setIsResultCollapsed(false)}
                  >
                    <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                      <FixErrorResultPanel
                        {...resultPanelProps}
                        onToggleExpand={handleExpandResult}
                        isCollapsed={isResultCollapsed}
                        onToggleCollapse={handleToggleResultCollapse}
                      />
                    </div>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}
