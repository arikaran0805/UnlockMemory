import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { FixErrorProblem, TestCase } from "./useFixErrorProblems";

// =============================================================================
// Unified result types matching the edge function response
// =============================================================================

export type FixErrorFailureType =
  | "COMPILE_ERROR"
  | "RUNTIME_ERROR"
  | "TIMEOUT"
  | "WRONG_ANSWER"
  | "VALIDATOR_ERROR"
  | "LOCKED_REGION_MODIFIED";

export type FixErrorStatus = "PASS" | "FAIL";
export type FixErrorFailedStage = "sample" | "hidden";

// DiffLine kept for backward compat but no longer rendered in UI
export interface DiffLine {
  type: "match" | "missing" | "extra" | "incorrect";
  lineNumber: number;
  expected?: string;
  actual?: string;
}

export interface FixErrorTestResult {
  id: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
  runtime_ms?: number;
  is_visible: boolean;
}

export interface FixErrorJudgeResult {
  status: FixErrorStatus;
  failureType?: FixErrorFailureType;
  failedStage?: FixErrorFailedStage;
  hintCategory?: string;
  summaryMessage: string;
  stdout: string;
  stderr: string;
  diff?: DiffLine[];
  testResults?: FixErrorTestResult[];
  runtime_ms: number;
  passed_count: number;
  total_count: number;
}

export type FixErrorVerdict = "idle" | "running" | "completed";

interface UseFixErrorJudgeReturn {
  verdict: FixErrorVerdict;
  result: FixErrorJudgeResult | null;
  run: (code: string) => Promise<void>;
  submit: (code: string) => Promise<void>;
  reset: () => void;
}

export function useFixErrorJudge(problem: FixErrorProblem | null): UseFixErrorJudgeReturn {
  const queryClient = useQueryClient();
  const [verdict, setVerdict] = useState<FixErrorVerdict>("idle");
  const [result, setResult] = useState<FixErrorJudgeResult | null>(null);

  const execute = useCallback(
    async (code: string, mode: "run" | "submit") => {
      if (!problem) return;

      setVerdict("running");
      setResult(null);

      try {
        const payload: Record<string, unknown> = {
          code,
          language: problem.language,
          validation_type: problem.validation_type,
          comparison_mode: (problem as any).comparison_mode || "trimmed",
          mode,
          time_limit_ms: 5000,
        };

        // Attach validation-specific data
        if (problem.validation_type === "output_comparison") {
          payload.expected_output = problem.expected_output;
        } else if (problem.validation_type === "test_cases") {
          payload.test_cases = problem.test_cases;
        } else if (problem.validation_type === "custom_function") {
          payload.custom_validator = problem.custom_validator;
        }

        // Attach locked region data for anti-cheat validation
        const startLine = (problem as any).editable_start_line;
        const endLine = (problem as any).editable_end_line;
        if (startLine != null && endLine != null) {
          payload.editable_start_line = startLine;
          payload.editable_end_line = endLine;
          payload.original_code = problem.buggy_code;
        }

        const { data, error } = await supabase.functions.invoke("judge-fix-error", {
          body: payload,
        });

        if (error) {
          setResult({
            status: "FAIL",
            failureType: "RUNTIME_ERROR",
            summaryMessage: error.message || "Execution failed",
            stdout: "",
            stderr: error.message || "",
            runtime_ms: 0,
            passed_count: 0,
            total_count: 0,
          });
          setVerdict("completed");
          return;
        }

        const judgeResult = data as FixErrorJudgeResult;
        setResult(judgeResult);
        setVerdict("completed");

        // Update learner_problem_progress for checkmark tracking (submit mode only)
        if (mode === "submit" && problem) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              const isSolved = judgeResult.status === "PASS";
              const progressData: Record<string, unknown> = {
                user_id: userData.user.id,
                problem_id: problem.id,
                status: isSolved ? "solved" : "attempted",
                attempts: 1,
                updated_at: new Date().toISOString(),
              };
              if (isSolved) {
                progressData.solved_at = new Date().toISOString();
              }
              await supabase
                .from("learner_problem_progress")
                .upsert(progressData as any, { onConflict: "user_id,problem_id" });
              queryClient.invalidateQueries({ queryKey: ["learner-progress"] });
            }
          } catch {
            // Non-critical
          }
        }
      } catch (err) {
        setResult({
          status: "FAIL",
          failureType: "RUNTIME_ERROR",
          summaryMessage: err instanceof Error ? err.message : "Execution failed",
          stdout: "",
          stderr: err instanceof Error ? err.message : "",
          runtime_ms: 0,
          passed_count: 0,
          total_count: 0,
        });
        setVerdict("completed");
      }
    },
    [problem]
  );

  const run = useCallback((code: string) => execute(code, "run"), [execute]);
  const submit = useCallback((code: string) => execute(code, "submit"), [execute]);

  const reset = useCallback(() => {
    setVerdict("idle");
    setResult(null);
  }, []);

  return { verdict, result, run, submit, reset };
}
