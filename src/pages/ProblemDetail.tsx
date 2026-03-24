import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, List, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import UMLoader from "@/components/UMLoader";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ProblemDescriptionPanel } from "@/components/practice/ProblemDescriptionPanel";
import { ProblemWorkspace } from "@/components/practice/ProblemWorkspace";
import { ProblemListDrawer } from "@/components/practice/ProblemListDrawer";
import { TestResult } from "@/components/practice/TestCasePanel";
import { usePublishedPracticeProblem, usePublishedPracticeProblems } from "@/hooks/usePracticeProblems";
import { useCodeJudge, convertTestCasesToJudgeFormat, getVerdictDisplay } from "@/hooks/useCodeJudge";
import { useProblemSubmissions, Submission } from "@/hooks/useProblemSubmissions";
import { useUpdateLearnerProgress } from "@/hooks/useLearnerProblemProgress";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { ImperativePanelHandle } from "react-resizable-panels";

// Function signature types
interface FunctionSignatureObj {
  name: string;
  parameters?: { name: string; type: string }[];
  return_type?: string;
}

type FunctionSignature = string | FunctionSignatureObj | null;

function getFunctionName(signature: FunctionSignature): string {
  if (!signature) return 'solution';
  if (typeof signature === 'object' && 'name' in signature) {
    return signature.name;
  }
  if (typeof signature === 'string') {
    const funcMatch = signature.match(/^(\w+)\s*\(/);
    return funcMatch ? funcMatch[1] : 'solution';
  }
  return 'solution';
}

function getParameterNames(signature: FunctionSignature): string[] {
  if (!signature) return [];
  if (typeof signature === 'object' && 'parameters' in signature && Array.isArray(signature.parameters)) {
    return signature.parameters.map(p => p.name);
  }
  if (typeof signature === 'string') {
    const match = signature.match(/\(([^)]*)\)/);
    if (!match) return [];
    return match[1].split(',').map(arg => arg.trim().split(/[:\s]/)[0]).filter(Boolean);
  }
  return [];
}

type ExpandedPanel = 'description' | 'editor' | 'testcase' | null;

export default function ProblemDetail() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const descriptionPanelRef = useRef<ImperativePanelHandle>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [output, setOutput] = useState("");
  const [globalError, setGlobalError] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<ExpandedPanel>(null);
  const [isDescriptionCollapsed, setIsDescriptionCollapsed] = useState(false);
  const [isSubmit, setIsSubmit] = useState(false);
  
  // Tab state for panels
  const [descriptionActiveTab, setDescriptionActiveTab] = useState("description");
  const [testCaseActiveTab, setTestCaseActiveTab] = useState("testcase");
  
  const { judge } = useCodeJudge();
  const updateProgress = useUpdateLearnerProgress();
  
  // Submissions hook
  const { submissions, addSubmission } = useProblemSubmissions(
    problemId ? `${skillId}_${problemId}` : undefined
  );
  
  // Problem ID for persistence
  const persistenceProblemId = problemId ? `${skillId}_${problemId}` : "";

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

  // Fetch all problems in this skill
  const { data: allProblemsInSkill = [] } = usePublishedPracticeProblems(skillId);

  // Fetch problem from database
  const { data: dbProblem, isLoading } = usePublishedPracticeProblem(skillId, problemId);

  // Convert database problem to display format
  const allTestCases = dbProblem?.test_cases || [];
  const visibleTestCases = allTestCases.filter((tc: any) => tc.is_visible);
  
  const functionSignature = (dbProblem as any)?.function_signature || null;
  const functionName = getFunctionName(functionSignature);
  const parameterNames = getParameterNames(functionSignature);
  
  const problem = dbProblem ? {
    id: dbProblem.id,
    title: dbProblem.title,
    difficulty: dbProblem.difficulty,
    description: dbProblem.description || "",
    inputFormat: (dbProblem as any).input_format || "",
    outputFormat: (dbProblem as any).output_format || "",
    examples: (dbProblem.examples || []).map((ex: any, i: number) => ({
      id: i + 1,
      input: ex.input || "",
      output: ex.output || "",
      explanation: ex.explanation,
    })),
    constraints: dbProblem.constraints || [],
    hints: dbProblem.hints || [],
    starterCode: dbProblem.starter_code || {},
    supportedLanguages: dbProblem.supported_languages || [],
    functionSignature,
    testCases: visibleTestCases.map((tc: any, i: number) => ({
      id: tc.id || i + 1,
      input: tc.input || "",
      expected: tc.expected_output || "",
    })),
    allTestCases: allTestCases.map((tc: any, i: number) => ({
      id: tc.id || i + 1,
      input: tc.input || "",
      expected: tc.expected_output || "",
      isVisible: tc.is_visible ?? true,
    })),
  } : null;

  // Panel expand handlers
  const handleExpandDescription = () => {
    setExpandedPanel(expandedPanel === 'description' ? null : 'description');
  };

  const handleExpandEditor = () => {
    setExpandedPanel(expandedPanel === 'editor' ? null : 'editor');
  };

  const handleExpandTestcase = () => {
    setExpandedPanel(expandedPanel === 'testcase' ? null : 'testcase');
  };

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

  // RUN: Execute code against visible test cases
  const handleRun = async (code: string, language: string) => {
    if (!problem) return;
    
    setIsRunning(true);
    setIsSubmit(false);
    setResults([]);
    setGlobalError(undefined);
    setOutput(`Running ${language}...\n`);
    // Switch to result tab when running
    setTestCaseActiveTab("result");
    
    try {
      const judgeTestCases = convertTestCasesToJudgeFormat(
        problem.testCases.map(tc => ({
          id: tc.id,
          input: tc.input,
          expected_output: tc.expected,
          is_visible: true
        })),
        parameterNames
      );

      const judgeResult = await judge({
        code,
        language,
        function_name: functionName,
        parameter_names: parameterNames,
        test_cases: judgeTestCases,
        time_limit_ms: 5000
      });

      const testResults: TestResult[] = judgeResult.test_results.map((tr, i) => ({
        id: i,
        input: problem.testCases[i]?.input || '',
        expected: JSON.stringify(tr.expected_output),
        actual: tr.error || JSON.stringify(tr.actual_output) || "No output",
        passed: tr.passed,
        runtime: tr.passed ? `${tr.runtime_ms || 0}ms` : undefined,
      }));

      const verdictDisplay = getVerdictDisplay(judgeResult.verdict);
      let outputLog = `Running ${language}...\n\n`;
      
      testResults.forEach((tr, i) => {
        outputLog += `Test ${i + 1}: ${tr.passed ? '✓ Passed' : '✗ Failed'}`;
        if (tr.runtime) outputLog += ` (${tr.runtime})`;
        outputLog += '\n';
      });

      outputLog += `\n${judgeResult.passed_count}/${judgeResult.total_count} test cases passed`;
      outputLog += `\nTotal Runtime: ${judgeResult.total_runtime_ms}ms`;
      outputLog += `\nVerdict: ${verdictDisplay.label}`;

      if (judgeResult.error) {
        outputLog += `\n\n❌ Error: ${judgeResult.error}`;
        setGlobalError(judgeResult.error);
      }

      setResults(testResults);
      setOutput(outputLog);

      if (judgeResult.verdict === 'accepted') {
        toast.success("All visible test cases passed!");
      } else if (judgeResult.verdict === 'compilation_error') {
        toast.error("Compilation Error", { description: judgeResult.error?.substring(0, 100) });
      } else if (judgeResult.verdict === 'runtime_error') {
        toast.error("Runtime Error", { description: judgeResult.error?.substring(0, 100) });
      } else if (judgeResult.verdict === 'time_limit_exceeded') {
        toast.error("Time Limit Exceeded");
      } else {
        toast.error(`${judgeResult.total_count - judgeResult.passed_count} test case(s) failed`);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Execution failed";
      setOutput(`Running ${language}...\n\n❌ Error: ${errorMsg}`);
      toast.error("Execution Failed", { description: errorMsg });
    }
    
    setIsRunning(false);
  };

  // SUBMIT: Execute code against ALL test cases
  const handleSubmit = async (code: string, language: string) => {
    if (!problem) return;
    
    setIsRunning(true);
    setIsSubmit(true);
    setResults([]);
    setGlobalError(undefined);
    setOutput(`Submitting ${language}...\n`);
    // Switch to result tab when submitting
    setTestCaseActiveTab("result");
    
    try {
      const judgeTestCases = convertTestCasesToJudgeFormat(
        problem.allTestCases.map(tc => ({
          id: tc.id,
          input: tc.input,
          expected_output: tc.expected,
          is_visible: tc.isVisible
        })),
        parameterNames
      );

      const judgeResult = await judge({
        code,
        language,
        function_name: functionName,
        parameter_names: parameterNames,
        test_cases: judgeTestCases,
        time_limit_ms: 5000
      });

      // Include ALL test results (visible and hidden)
      // Hidden cases are only visually redacted in the UI; we keep the raw values here so the
      // "Show Output" toggle can reveal input/expected/output.
      const testResults: TestResult[] = judgeResult.test_results.map((tr, i) => {
        const originalTc = problem.allTestCases[i];
        const isHidden = !tr.is_visible;

        const actualOutput = tr.error || (tr.actual_output !== undefined ? JSON.stringify(tr.actual_output) : "");

        return {
          id: i,
          input: originalTc?.input || "",
          expected: JSON.stringify(tr.expected_output),
          actual: actualOutput,
          passed: tr.passed,
          runtime: `${tr.runtime_ms || 0}ms`,
          isHidden,
        };
      });

      const verdictDisplay = getVerdictDisplay(judgeResult.verdict);
      const hiddenCount = problem.allTestCases.filter(tc => !tc.isVisible).length;
      const visibleCount = problem.allTestCases.length - hiddenCount;
      
      let outputLog = `Submitting ${language}...\n\n`;
      outputLog += `Total test cases: ${judgeResult.total_count} (${visibleCount} visible, ${hiddenCount} hidden)\n`;
      outputLog += `Passed: ${judgeResult.passed_count}/${judgeResult.total_count}\n`;
      outputLog += `Total Runtime: ${judgeResult.total_runtime_ms}ms\n`;
      outputLog += `\nVerdict: ${verdictDisplay.label}`;

      if (judgeResult.error) {
        outputLog += `\n\n❌ Error: ${judgeResult.error}`;
      }

      setResults(testResults);
      setOutput(outputLog);

      // Map verdict to submission status
      const statusMap: Record<string, Submission["status"]> = {
        accepted: "accepted",
        wrong_answer: "wrong_answer",
        runtime_error: "runtime_error",
        time_limit_exceeded: "time_limit_exceeded",
        compilation_error: "compilation_error",
      };

      // Save submission
      addSubmission({
        code,
        language,
        status: statusMap[judgeResult.verdict] || "wrong_answer",
        passed_count: judgeResult.passed_count,
        total_count: judgeResult.total_count,
        runtime_ms: judgeResult.total_runtime_ms,
      });

      // Switch to submissions tab in description panel
      setDescriptionActiveTab("submissions");

      if (judgeResult.verdict === 'accepted') {
        // Update learner progress when problem is solved
        if (dbProblem?.id) {
          updateProgress.mutate({
            problem_id: dbProblem.id,
            status: "solved",
            best_runtime_ms: judgeResult.total_runtime_ms,
          });
        }
        
        toast.success("🎉 Congratulations! All test cases passed!", {
          description: `You solved this problem in ${judgeResult.total_runtime_ms}ms. Great job!`,
          duration: 5000,
          icon: <PartyPopper className="h-5 w-5 text-green-500" />,
        });
      } else if (judgeResult.verdict === 'compilation_error') {
        toast.error("Compilation Error", { description: "Fix errors before submitting" });
      } else if (judgeResult.verdict === 'runtime_error') {
        // Update progress to attempted
        if (dbProblem?.id) {
          updateProgress.mutate({
            problem_id: dbProblem.id,
            status: "attempted",
          });
        }
        toast.error("Runtime Error", { description: judgeResult.error?.substring(0, 100) });
      } else if (judgeResult.verdict === 'time_limit_exceeded') {
        // Update progress to attempted
        if (dbProblem?.id) {
          updateProgress.mutate({
            problem_id: dbProblem.id,
            status: "attempted",
          });
        }
        toast.error("Time Limit Exceeded");
      } else {
        // Update progress to attempted for wrong answers
        if (dbProblem?.id) {
          updateProgress.mutate({
            problem_id: dbProblem.id,
            status: "attempted",
          });
        }
        const failedIndex = judgeResult.test_results.findIndex(tr => !tr.passed);
        const failedIsHidden = failedIndex >= 0 && !judgeResult.test_results[failedIndex].is_visible;
        toast.error("Wrong Answer", {
          description: `Failed on test case ${failedIndex + 1}/${judgeResult.total_count}${failedIsHidden ? " (hidden)" : ""}`,
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Submission failed";
      setOutput(`Submitting ${language}...\n\n❌ Error: ${errorMsg}`);
      toast.error("Submission Failed", { description: errorMsg });
    }
    
    setIsRunning(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <UMLoader size={56} dark label="Loading…" />
      </div>
    );
  }

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

  // Calculate previous/next problems for navigation
  const currentIndex = allProblemsInSkill.findIndex((p) => p.slug === problemId);
  const prevProblem = currentIndex > 0 ? allProblemsInSkill[currentIndex - 1] : null;
  const nextProblem = currentIndex < allProblemsInSkill.length - 1 ? allProblemsInSkill[currentIndex + 1] : null;

  const navigateToProblem = (p: typeof prevProblem) => {
    if (!p) return;
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

  const handlePrevProblem = () => navigateToProblem(prevProblem);
  const handleNextProblem = () => navigateToProblem(nextProblem);

  // Render fullscreen panel if expanded
  if (expandedPanel) {
    return (
      <div className="h-screen flex flex-col bg-background">
        {/* Problem List Drawer */}
        <ProblemListDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          skillName={skill?.name || "Problems"}
          problems={allProblemsInSkill}
          currentProblemSlug={problemId}
          onSelectProblem={(slug, problemType) => {
            if (problemType === "predict-output") {
              navigate(`/practice/${skillId}/predict/${slug}`);
            } else if (problemType === "fix-error") {
              navigate(`/practice/${skillId}/fix-error/${slug}`);
            } else if (problemType === "eliminate-wrong") {
              navigate(`/practice/${skillId}/eliminate/${slug}`);
            } else {
              navigate(`/practice/${skillId}/problem/${slug}`);
            }
          }}
        />

        {/* Top Navigation Bar */}
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handlePrevProblem}
                disabled={!prevProblem}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">{problem.title}</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={handleNextProblem}
                disabled={!nextProblem}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Fullscreen Panel Content */}
        <div className="flex-1 min-h-0 overflow-hidden bg-muted/30 p-1.5">
          {expandedPanel === 'description' && (
            <div className="h-full bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <ProblemDescriptionPanel
                title={problem.title}
                difficulty={problem.difficulty}
                description={problem.description}
                inputFormat={problem.inputFormat}
                outputFormat={problem.outputFormat}
                examples={problem.examples}
                constraints={problem.constraints}
                hints={problem.hints}
                problemId={problem.id}
                isExpanded={true}
                onToggleExpand={handleExpandDescription}
                isCollapsed={isDescriptionCollapsed}
                onToggleCollapse={handleToggleCollapseDescription}
                activeTab={descriptionActiveTab}
                onTabChange={setDescriptionActiveTab}
                submissions={submissions}
              />
            </div>
          )}
          {(expandedPanel === 'editor' || expandedPanel === 'testcase') && (
            <ProblemWorkspace
              problemId={persistenceProblemId}
              starterCode={problem.starterCode}
              supportedLanguages={problem.supportedLanguages}
              testCases={problem.testCases}
              onRun={handleRun}
              onSubmit={handleSubmit}
              results={results}
              isRunning={isRunning}
              output={output}
              expandedPanel={expandedPanel}
              onExpandEditor={handleExpandEditor}
              onExpandTestcase={handleExpandTestcase}
              testCaseActiveTab={testCaseActiveTab}
              onTestCaseTabChange={setTestCaseActiveTab}
              globalError={globalError}
              isSubmit={isSubmit}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Problem List Drawer */}
      <ProblemListDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        skillName={skill?.name || "Problems"}
        problems={allProblemsInSkill}
        currentProblemSlug={problemId}
        onSelectProblem={(slug, problemType) => {
          if (problemType === "predict-output") {
            navigate(`/practice/${skillId}/predict/${slug}`);
          } else if (problemType === "fix-error") {
            navigate(`/practice/${skillId}/fix-error/${slug}`);
          } else if (problemType === "eliminate-wrong") {
            navigate(`/practice/${skillId}/eliminate/${slug}`);
          } else {
            navigate(`/practice/${skillId}/problem/${slug}`);
          }
        }}
      />

      {/* Top Navigation Bar */}
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
          
          {/* Skill Name - clickable to open drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <List className="h-3.5 w-3.5" />
            <span>{skill?.name || "Problems"}</span>
          </button>

          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handlePrevProblem}
              disabled={!prevProblem}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-2">{problem.title}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleNextProblem}
              disabled={!nextProblem}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 min-h-0 overflow-hidden bg-muted/30">
        {isMobile ? (
          // Mobile: Stack vertically
          <div className="h-full flex flex-col overflow-auto p-1.5 gap-1.5">
            <div className={cn(
              "bg-card rounded-lg border border-border shadow-sm overflow-hidden",
              isDescriptionCollapsed ? "min-h-[56px]" : "min-h-[50vh]"
            )}>
              <ProblemDescriptionPanel
                title={problem.title}
                difficulty={problem.difficulty}
                description={problem.description}
                inputFormat={problem.inputFormat}
                outputFormat={problem.outputFormat}
                examples={problem.examples}
                constraints={problem.constraints}
                hints={problem.hints}
                problemId={problem.id}
                isExpanded={false}
                onToggleExpand={handleExpandDescription}
                isCollapsed={isDescriptionCollapsed}
                onToggleCollapse={handleToggleCollapseDescription}
                activeTab={descriptionActiveTab}
                onTabChange={setDescriptionActiveTab}
                submissions={submissions}
              />
            </div>
            <div className="flex-1 min-h-[50vh]">
              <ProblemWorkspace
                problemId={persistenceProblemId}
                starterCode={problem.starterCode}
                supportedLanguages={problem.supportedLanguages}
                testCases={problem.testCases}
                onRun={handleRun}
                onSubmit={handleSubmit}
                results={results}
                isRunning={isRunning}
                output={output}
                expandedPanel={null}
                onExpandEditor={handleExpandEditor}
                onExpandTestcase={handleExpandTestcase}
                testCaseActiveTab={testCaseActiveTab}
                onTestCaseTabChange={setTestCaseActiveTab}
                isSubmit={isSubmit}
              />
            </div>
          </div>
        ) : (
          // Desktop: Horizontal split with padding
          <div className="h-full p-1.5">
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left Panel - Problem Description */}
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
                  <ProblemDescriptionPanel
                    title={problem.title}
                    difficulty={problem.difficulty}
                    description={problem.description}
                    inputFormat={problem.inputFormat}
                    outputFormat={problem.outputFormat}
                    examples={problem.examples}
                    constraints={problem.constraints}
                    hints={problem.hints}
                    problemId={problem.id}
                    isExpanded={false}
                    onToggleExpand={handleExpandDescription}
                    isCollapsed={isDescriptionCollapsed}
                    onToggleCollapse={handleToggleCollapseDescription}
                    activeTab={descriptionActiveTab}
                    onTabChange={setDescriptionActiveTab}
                    submissions={submissions}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle />

              {/* Right Panel - Code Editor + Test Cases */}
              <ResizablePanel defaultSize={55} minSize={30} className="min-h-0">
                <ProblemWorkspace
                  problemId={persistenceProblemId}
                  starterCode={problem.starterCode}
                  supportedLanguages={problem.supportedLanguages}
                  testCases={problem.testCases}
                  onRun={handleRun}
                  onSubmit={handleSubmit}
                  results={results}
                  isRunning={isRunning}
                  output={output}
                  expandedPanel={null}
                  onExpandEditor={handleExpandEditor}
                  onExpandTestcase={handleExpandTestcase}
                  testCaseActiveTab={testCaseActiveTab}
                  onTestCaseTabChange={setTestCaseActiveTab}
                  globalError={globalError}
                  isSubmit={isSubmit}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        )}
      </div>
    </div>
  );
}
