import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// =============================================================================
// TYPES
// =============================================================================

type FailureType =
  | 'COMPILE_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIMEOUT'
  | 'WRONG_ANSWER'
  | 'VALIDATOR_ERROR'
  | 'LOCKED_REGION_MODIFIED';

type Status = 'PASS' | 'FAIL';
type ValidationMode = 'output_comparison' | 'test_cases' | 'custom_function';
type ExecutionMode = 'run' | 'submit';
type ComparisonMode = 'exact' | 'trimmed' | 'numeric_tolerance' | 'json_deep';
type FailedStage = 'sample' | 'hidden';

interface TestCaseInput {
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  hint_category?: string; // e.g. "empty input", "boundary values", "duplicates", "overflow"
}

interface JudgeFixErrorRequest {
  code: string;
  language: string;
  validation_type: ValidationMode;
  mode?: ExecutionMode;
  comparison_mode?: ComparisonMode;
  // For output_comparison
  expected_output?: string;
  // For test_cases
  test_cases?: TestCaseInput[];
  // For custom_function
  custom_validator?: string;
  // Limits
  time_limit_ms?: number;
  memory_limit_mb?: number;
  // Locked region anti-cheat
  editable_start_line?: number;
  editable_end_line?: number;
  original_code?: string;
}

interface DiffLine {
  type: 'match' | 'missing' | 'extra' | 'incorrect';
  lineNumber: number;
  expected?: string;
  actual?: string;
}

interface TestCaseResult {
  id: number;
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  error?: string;
  runtime_ms?: number;
  is_visible: boolean;
}

interface JudgeFixErrorResponse {
  status: Status;
  failureType?: FailureType;
  failedStage?: FailedStage;
  hintCategory?: string;
  summaryMessage: string;
  stdout: string;
  stderr: string;
  diff?: DiffLine[];
  testResults?: TestCaseResult[];
  runtime_ms: number;
  passed_count: number;
  total_count: number;
}

// =============================================================================
// OUTPUT NORMALIZATION & COMPARISON
// =============================================================================

function normalizeOutput(raw: string): string {
  let normalized = raw.replace(/\r\n/g, '\n');
  if (normalized.endsWith('\n')) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

function trimLines(s: string): string {
  return s
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function compareOutputs(actual: string, expected: string, mode: ComparisonMode): boolean {
  switch (mode) {
    case 'exact':
      return actual === expected;

    case 'trimmed':
      return trimLines(actual) === trimLines(expected);

    case 'numeric_tolerance': {
      // Try numeric comparison first, fall back to trimmed
      const numA = parseFloat(actual.trim());
      const numB = parseFloat(expected.trim());
      if (!isNaN(numA) && !isNaN(numB)) {
        return Math.abs(numA - numB) < 1e-6;
      }
      // Multi-line: compare line by line with numeric tolerance
      const aLines = actual.trim().split('\n');
      const bLines = expected.trim().split('\n');
      if (aLines.length !== bLines.length) return false;
      return aLines.every((aLine, i) => {
        const a = parseFloat(aLine.trim());
        const b = parseFloat(bLines[i].trim());
        if (!isNaN(a) && !isNaN(b)) return Math.abs(a - b) < 1e-6;
        return aLine.trimEnd() === bLines[i].trimEnd();
      });
    }

    case 'json_deep': {
      try {
        const parsedA = JSON.parse(actual.trim());
        const parsedB = JSON.parse(expected.trim());
        return JSON.stringify(parsedA) === JSON.stringify(parsedB);
      } catch {
        // Fall back to trimmed comparison
        return trimLines(actual) === trimLines(expected);
      }
    }

    default:
      return trimLines(actual) === trimLines(expected);
  }
}

// =============================================================================
// DIFF GENERATION
// =============================================================================

function generateDiff(expected: string, actual: string): DiffLine[] {
  const expectedLines = expected.split('\n');
  const actualLines = actual.split('\n');
  const maxLen = Math.max(expectedLines.length, actualLines.length);
  const diff: DiffLine[] = [];

  for (let i = 0; i < maxLen; i++) {
    const exp = i < expectedLines.length ? expectedLines[i] : undefined;
    const act = i < actualLines.length ? actualLines[i] : undefined;

    if (exp !== undefined && act !== undefined) {
      if (exp === act) {
        diff.push({ type: 'match', lineNumber: i + 1, expected: exp, actual: act });
      } else {
        diff.push({ type: 'incorrect', lineNumber: i + 1, expected: exp, actual: act });
      }
    } else if (exp !== undefined && act === undefined) {
      diff.push({ type: 'missing', lineNumber: i + 1, expected: exp });
    } else if (act !== undefined && exp === undefined) {
      diff.push({ type: 'extra', lineNumber: i + 1, actual: act });
    }
  }

  return diff;
}

// =============================================================================
// SYNTAX/COMPILATION ERROR DETECTION
// =============================================================================

function isSyntaxOrCompilationError(stderr: string, language: string): boolean {
  if (!stderr || stderr.trim().length === 0) return false;
  const lang = language.toLowerCase().trim();
  const lower = stderr.toLowerCase();

  if (lang === 'python' || lang === 'python3') {
    return (
      stderr.includes('SyntaxError') ||
      stderr.includes('IndentationError') ||
      stderr.includes('TabError') ||
      lower.includes('invalid syntax') ||
      lower.includes('was never closed') ||
      lower.includes('expected an indented block') ||
      lower.includes('unexpected eof')
    );
  }

  if (lang === 'javascript' || lang === 'typescript') {
    return (
      stderr.includes('SyntaxError') ||
      lower.includes('unexpected token') ||
      lower.includes('unexpected end of input') ||
      lower.includes('unexpected identifier') ||
      lower.includes('invalid or unexpected token')
    );
  }

  if (lang === 'java') {
    return stderr.includes('error:') || lower.includes('reached end of file while parsing');
  }

  if (lang === 'c' || lang === 'cpp' || lang === 'c++') {
    return stderr.includes('error:');
  }

  return false;
}

// =============================================================================
// PISTON EXECUTION
// =============================================================================

interface PistonResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  compileError?: string;
}

async function executePiston(
  code: string,
  language: string,
  timeLimitMs: number
): Promise<PistonResult> {
  const pistonLang = language === 'typescript' ? 'javascript' : language;

  const pistonResponse = await fetch('https://emkc.org/api/v2/piston/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: pistonLang,
      version: '*',
      files: [{ content: code }],
      run_timeout: timeLimitMs,
    }),
  });

  if (!pistonResponse.ok) {
    const errorText = await pistonResponse.text();
    console.error('Piston API error:', errorText);
    throw new Error('Code execution service unavailable');
  }

  const result = await pistonResponse.json();

  if (result.compile?.stderr) {
    return {
      stdout: '',
      stderr: result.compile.stderr,
      exitCode: 1,
      timedOut: false,
      compileError: result.compile.stderr,
    };
  }

  const timedOut = result.run?.signal === 'SIGKILL' || result.run?.code === 137;

  return {
    stdout: result.run?.stdout || '',
    stderr: result.run?.stderr || '',
    exitCode: result.run?.code ?? 0,
    timedOut,
  };
}

// =============================================================================
// HELPERS: Execute a single test case
// =============================================================================

interface SingleTestResult {
  passed: boolean;
  actual: string;
  error?: string;
  runtime_ms: number;
  failureType?: FailureType;
  isCritical: boolean; // compile/timeout errors that should stop all execution
}

async function executeSingleTest(
  code: string,
  tc: TestCaseInput,
  language: string,
  comparisonMode: ComparisonMode,
  timeLimitMs: number,
): Promise<SingleTestResult> {
  const fullCode = `${code}\n\n# Test\n${tc.input}`;
  const startTime = Date.now();
  const result = await executePiston(fullCode, language, timeLimitMs);
  const runtime = Date.now() - startTime;

  // Compile error → critical stop
  if (result.compileError) {
    const isCompile = isSyntaxOrCompilationError(result.compileError, language);
    return {
      passed: false,
      actual: '',
      error: result.compileError.substring(0, 1000),
      runtime_ms: 0,
      failureType: isCompile ? 'COMPILE_ERROR' : 'RUNTIME_ERROR',
      isCritical: true,
    };
  }

  // Timeout → critical stop
  if (result.timedOut) {
    return {
      passed: false,
      actual: '',
      error: 'Time Limit Exceeded',
      runtime_ms: timeLimitMs,
      failureType: 'TIMEOUT',
      isCritical: true,
    };
  }

  // Runtime error (stderr + no stdout)
  if (result.exitCode !== 0 && result.stderr && !result.stdout.trim()) {
    const isCompile = isSyntaxOrCompilationError(result.stderr, language);
    return {
      passed: false,
      actual: '',
      error: result.stderr.substring(0, 500),
      runtime_ms: runtime,
      failureType: isCompile ? 'COMPILE_ERROR' : 'RUNTIME_ERROR',
      isCritical: isCompile,
    };
  }

  // Compare outputs
  const actualOutput = normalizeOutput(result.stdout);
  const expectedOutput = normalizeOutput(tc.expected_output);
  const passed = compareOutputs(actualOutput, expectedOutput, comparisonMode);

  return {
    passed,
    actual: actualOutput,
    runtime_ms: runtime,
    failureType: passed ? undefined : 'WRONG_ANSWER',
    isCritical: false,
  };
}

// =============================================================================
// VALIDATION: OUTPUT COMPARISON
// =============================================================================

async function validateOutputComparison(
  code: string,
  language: string,
  expectedOutput: string,
  comparisonMode: ComparisonMode,
  timeLimitMs: number,
): Promise<JudgeFixErrorResponse> {
  const result = await executePiston(code, language, timeLimitMs);

  if (result.compileError) {
    return {
      status: 'FAIL',
      failureType: 'COMPILE_ERROR',
      failedStage: 'sample',
      summaryMessage: 'Your code has a compilation/syntax error.',
      stdout: '',
      stderr: result.compileError.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  if (result.timedOut) {
    return {
      status: 'FAIL',
      failureType: 'TIMEOUT',
      failedStage: 'sample',
      summaryMessage: 'Your code exceeded the time limit.',
      stdout: result.stdout,
      stderr: '',
      runtime_ms: timeLimitMs,
      passed_count: 0,
      total_count: 1,
    };
  }

  if (result.exitCode !== 0 && result.stderr && !result.stdout.trim()) {
    const isCompile = isSyntaxOrCompilationError(result.stderr, language);
    return {
      status: 'FAIL',
      failureType: isCompile ? 'COMPILE_ERROR' : 'RUNTIME_ERROR',
      failedStage: 'sample',
      summaryMessage: isCompile
        ? 'Your code has a syntax error.'
        : 'Your code produced a runtime error.',
      stdout: '',
      stderr: result.stderr.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  const normalizedActual = normalizeOutput(result.stdout);
  const normalizedExpected = normalizeOutput(expectedOutput);

  if (compareOutputs(normalizedActual, normalizedExpected, comparisonMode)) {
    return {
      status: 'PASS',
      summaryMessage: 'Output matches expected result.',
      stdout: result.stdout,
      stderr: result.stderr,
      runtime_ms: 0,
      passed_count: 1,
      total_count: 1,
    };
  }

  const diff = generateDiff(normalizedExpected, normalizedActual);

  return {
    status: 'FAIL',
    failureType: 'WRONG_ANSWER',
    failedStage: 'sample',
    summaryMessage: 'Your output does not match the expected result.',
    stdout: result.stdout,
    stderr: result.stderr,
    diff,
    runtime_ms: 0,
    passed_count: 0,
    total_count: 1,
  };
}

// =============================================================================
// VALIDATION: TEST CASES — TWO-STAGE PIPELINE
// =============================================================================

async function validateTestCases(
  code: string,
  language: string,
  testCases: TestCaseInput[],
  mode: ExecutionMode,
  comparisonMode: ComparisonMode,
  timeLimitMs: number,
): Promise<JudgeFixErrorResponse> {
  const visibleTests = testCases.filter(tc => !tc.is_hidden);
  const hiddenTests = testCases.filter(tc => tc.is_hidden);

  // ─── RUN MODE: only visible tests, full transparency ────────────────
  if (mode === 'run') {
    return await runVisibleTests(code, language, visibleTests, comparisonMode, timeLimitMs);
  }

  // ─── SUBMIT MODE: Two-stage pipeline ────────────────────────────────

  // STAGE 1: Run all visible (sample) tests first
  console.log(`[STAGE-1] Running ${visibleTests.length} sample tests`);
  const stage1 = await runVisibleTests(code, language, visibleTests, comparisonMode, timeLimitMs);

  // If any sample test fails, stop immediately — do NOT run hidden tests
  if (stage1.status === 'FAIL') {
    return {
      ...stage1,
      failedStage: 'sample',
      // total_count includes all tests for context
      total_count: testCases.length,
    };
  }

  // STAGE 2: All samples passed — now run hidden tests
  console.log(`[STAGE-2] Running ${hiddenTests.length} hidden tests`);
  const stage2Results: TestCaseResult[] = [];
  let allHiddenPassed = true;
  let hiddenFailureType: FailureType = 'WRONG_ANSWER';
  let firstFailedHintCategory: string | undefined;
  let totalRuntime = stage1.runtime_ms;

  for (let i = 0; i < hiddenTests.length; i++) {
    const tc = hiddenTests[i];
    try {
      const testResult = await executeSingleTest(code, tc, language, comparisonMode, timeLimitMs);
      totalRuntime += testResult.runtime_ms;

      if (!testResult.passed) {
        allHiddenPassed = false;
        hiddenFailureType = testResult.failureType || 'WRONG_ANSWER';
        if (!firstFailedHintCategory && tc.hint_category) {
          firstFailedHintCategory = tc.hint_category;
        }
      }

      // Redact ALL hidden test details
      stage2Results.push({
        id: visibleTests.length + i,
        passed: testResult.passed,
        input: '[hidden]',
        expected: '[hidden]',
        actual: '[hidden]',
        error: testResult.error ? 'Hidden test failed' : undefined,
        runtime_ms: testResult.runtime_ms,
        is_visible: false,
      });

      // Stop on critical failures (compile/timeout)
      if (testResult.isCritical) break;

    } catch (err) {
      allHiddenPassed = false;
      if (!firstFailedHintCategory && tc.hint_category) {
        firstFailedHintCategory = tc.hint_category;
      }
      stage2Results.push({
        id: visibleTests.length + i,
        passed: false,
        input: '[hidden]',
        expected: '[hidden]',
        actual: '[hidden]',
        error: 'Execution failed',
        runtime_ms: 0,
        is_visible: false,
      });
      break;
    }
  }

  // Combine visible (passed) + hidden results
  const allResults = [
    ...(stage1.testResults || []),
    ...stage2Results,
  ];
  const passedCount = allResults.filter(r => r.passed).length;

  if (allHiddenPassed) {
    return {
      status: 'PASS',
      summaryMessage: `All ${allResults.length} test cases passed.`,
      stdout: '',
      stderr: '',
      testResults: allResults,
      runtime_ms: totalRuntime,
      passed_count: passedCount,
      total_count: allResults.length,
    };
  }

  // Hidden tests failed — generic message + optional hint category
  const summaryMessages: Record<FailureType, string> = {
    COMPILE_ERROR: 'Your code has a compilation/syntax error on edge cases.',
    RUNTIME_ERROR: 'Your code produced a runtime error on edge cases.',
    TIMEOUT: 'Your code exceeded the time limit on edge cases.',
    WRONG_ANSWER: 'Sample tests passed, but your solution fails on edge cases.',
    VALIDATOR_ERROR: 'Validation error.',
    LOCKED_REGION_MODIFIED: 'Locked code was modified.',
  };

  return {
    status: 'FAIL',
    failureType: hiddenFailureType,
    failedStage: 'hidden',
    hintCategory: firstFailedHintCategory,
    summaryMessage: summaryMessages[hiddenFailureType],
    stdout: '',
    stderr: '',
    testResults: allResults,
    runtime_ms: totalRuntime,
    passed_count: passedCount,
    total_count: allResults.length,
  };
}

// Helper: run visible tests with full transparency
async function runVisibleTests(
  code: string,
  language: string,
  visibleTests: TestCaseInput[],
  comparisonMode: ComparisonMode,
  timeLimitMs: number,
): Promise<JudgeFixErrorResponse> {
  const results: TestCaseResult[] = [];
  let allPassed = true;
  let globalError: string | undefined;
  let totalRuntime = 0;
  let failureType: FailureType = 'WRONG_ANSWER';

  for (let i = 0; i < visibleTests.length; i++) {
    const tc = visibleTests[i];

    try {
      const testResult = await executeSingleTest(code, tc, language, comparisonMode, timeLimitMs);
      totalRuntime += testResult.runtime_ms;

      if (!testResult.passed) {
        allPassed = false;
        failureType = testResult.failureType || 'WRONG_ANSWER';
        if (testResult.isCritical) {
          globalError = testResult.error;
        }
      }

      results.push({
        id: i,
        passed: testResult.passed,
        input: tc.input,
        expected: tc.expected_output,
        actual: testResult.actual,
        error: testResult.error,
        runtime_ms: testResult.runtime_ms,
        is_visible: true,
      });

      // Stop on first failure or critical error
      if (!testResult.passed) break;

    } catch (err) {
      allPassed = false;
      results.push({
        id: i,
        passed: false,
        input: tc.input,
        expected: tc.expected_output,
        actual: '',
        error: err instanceof Error ? err.message : 'Execution failed',
        runtime_ms: 0,
        is_visible: true,
      });
      break;
    }
  }

  const passedCount = results.filter(r => r.passed).length;

  if (allPassed) {
    return {
      status: 'PASS',
      summaryMessage: `All ${results.length} sample tests passed.`,
      stdout: '',
      stderr: '',
      testResults: results,
      runtime_ms: totalRuntime,
      passed_count: passedCount,
      total_count: results.length,
    };
  }

  const summaryMessages: Record<FailureType, string> = {
    COMPILE_ERROR: 'Your code has a compilation/syntax error.',
    RUNTIME_ERROR: 'Your code produced a runtime error.',
    TIMEOUT: 'Your code exceeded the time limit.',
    WRONG_ANSWER: `${passedCount} / ${results.length} sample tests passed.`,
    VALIDATOR_ERROR: 'Validation error.',
    LOCKED_REGION_MODIFIED: 'Locked code was modified.',
  };

  return {
    status: 'FAIL',
    failureType,
    summaryMessage: summaryMessages[failureType],
    stdout: '',
    stderr: globalError || '',
    testResults: results,
    runtime_ms: totalRuntime,
    passed_count: passedCount,
    total_count: results.length,
  };
}

// =============================================================================
// VALIDATION: CUSTOM VALIDATOR
// =============================================================================

async function validateCustom(
  code: string,
  language: string,
  customValidator: string,
  timeLimitMs: number,
): Promise<JudgeFixErrorResponse> {
  const learnerResult = await executePiston(code, language, timeLimitMs);

  if (learnerResult.compileError) {
    return {
      status: 'FAIL',
      failureType: 'COMPILE_ERROR',
      failedStage: 'sample',
      summaryMessage: 'Your code has a compilation/syntax error.',
      stdout: '',
      stderr: learnerResult.compileError.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  if (learnerResult.timedOut) {
    return {
      status: 'FAIL',
      failureType: 'TIMEOUT',
      failedStage: 'sample',
      summaryMessage: 'Your code exceeded the time limit.',
      stdout: learnerResult.stdout,
      stderr: '',
      runtime_ms: timeLimitMs,
      passed_count: 0,
      total_count: 1,
    };
  }

  if (learnerResult.exitCode !== 0 && learnerResult.stderr && !learnerResult.stdout.trim()) {
    const isCompile = isSyntaxOrCompilationError(learnerResult.stderr, language);
    return {
      status: 'FAIL',
      failureType: isCompile ? 'COMPILE_ERROR' : 'RUNTIME_ERROR',
      failedStage: 'sample',
      summaryMessage: isCompile
        ? 'Your code has a syntax error.'
        : 'Your code produced a runtime error.',
      stdout: '',
      stderr: learnerResult.stderr.substring(0, 1000),
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }

  const validatorCode = buildValidatorCode(
    code,
    customValidator,
    learnerResult.stdout,
    language
  );

  try {
    const validatorResult = await executePiston(validatorCode, language, timeLimitMs);

    if (validatorResult.compileError || validatorResult.timedOut) {
      return {
        status: 'FAIL',
        failureType: 'VALIDATOR_ERROR',
        summaryMessage: 'Internal validation error. Please report this problem.',
        stdout: learnerResult.stdout,
        stderr: 'Validator failed to execute.',
        runtime_ms: 0,
        passed_count: 0,
        total_count: 1,
      };
    }

    const validatorStdout = normalizeOutput(validatorResult.stdout);
    try {
      const validatorOutput = JSON.parse(validatorStdout);

      if (validatorOutput.pass) {
        return {
          status: 'PASS',
          summaryMessage: validatorOutput.message || 'Custom validation passed.',
          stdout: learnerResult.stdout,
          stderr: '',
          runtime_ms: 0,
          passed_count: 1,
          total_count: 1,
        };
      }

      return {
        status: 'FAIL',
        failureType: 'WRONG_ANSWER',
        summaryMessage: validatorOutput.message || 'Custom validation failed.',
        stdout: learnerResult.stdout,
        stderr: '',
        runtime_ms: 0,
        passed_count: 0,
        total_count: 1,
      };
    } catch {
      return {
        status: 'FAIL',
        failureType: 'VALIDATOR_ERROR',
        summaryMessage: 'Internal validation error. Please report this problem.',
        stdout: learnerResult.stdout,
        stderr: 'Validator returned invalid output.',
        runtime_ms: 0,
        passed_count: 0,
        total_count: 1,
      };
    }
  } catch (err) {
    return {
      status: 'FAIL',
      failureType: 'VALIDATOR_ERROR',
      summaryMessage: 'Internal validation error. Please report this problem.',
      stdout: learnerResult.stdout,
      stderr: err instanceof Error ? err.message : 'Validator execution failed',
      runtime_ms: 0,
      passed_count: 0,
      total_count: 1,
    };
  }
}

function buildValidatorCode(
  learnerCode: string,
  customValidator: string,
  learnerStdout: string,
  language: string,
): string {
  const escapedStdout = JSON.stringify(learnerStdout);

  if (language === 'python' || language === 'python3') {
    return `
import json

# Learner's code (executed in namespace)
${learnerCode}

# Validator
_learner_stdout = ${escapedStdout}

${customValidator}

# Run validator
try:
    _result = validate(_learner_stdout, dir())
    if isinstance(_result, dict):
        print(json.dumps(_result))
    elif isinstance(_result, bool):
        print(json.dumps({"pass": _result, "message": "Passed" if _result else "Failed"}))
    else:
        print(json.dumps({"pass": False, "message": "Invalid validator return type"}))
except Exception as e:
    print(json.dumps({"pass": False, "message": f"Validator error: {str(e)}"}))
`;
  }

  // JavaScript / TypeScript
  return `
// Learner's code (executed in namespace)
${learnerCode}

// Validator
const _learnerStdout = ${escapedStdout};

${customValidator}

// Run validator
try {
  const _result = validate(_learnerStdout, globalThis);
  if (typeof _result === 'object' && _result !== null) {
    console.log(JSON.stringify(_result));
  } else if (typeof _result === 'boolean') {
    console.log(JSON.stringify({ pass: _result, message: _result ? 'Passed' : 'Failed' }));
  } else {
    console.log(JSON.stringify({ pass: false, message: 'Invalid validator return type' }));
  }
} catch (e) {
  console.log(JSON.stringify({ pass: false, message: 'Validator error: ' + (e.message || e) }));
}
`;
}

// =============================================================================
// LOCKED REGION VALIDATION
// =============================================================================

function validateLockedRegions(
  code: string,
  originalCode: string,
  editableStartLine: number,
  editableEndLine: number,
): boolean {
  const codeLines = code.split('\n');
  const originalLines = originalCode.split('\n');

  for (let i = 0; i < editableStartLine - 1; i++) {
    if ((codeLines[i] ?? '') !== (originalLines[i] ?? '')) {
      return false;
    }
  }

  const origAfterCount = originalLines.length - editableEndLine;
  const codeAfterCount = codeLines.length - editableEndLine;

  if (origAfterCount !== codeAfterCount) return false;

  for (let i = 0; i < origAfterCount; i++) {
    const origIdx = originalLines.length - 1 - i;
    const codeIdx = codeLines.length - 1 - i;
    if ((codeLines[codeIdx] ?? '') !== (originalLines[origIdx] ?? '')) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: JudgeFixErrorRequest = await req.json();

    const {
      code,
      language,
      validation_type,
      mode = 'run',
      comparison_mode = 'trimmed',
      expected_output,
      test_cases,
      custom_validator,
      time_limit_ms = 5000,
      editable_start_line,
      editable_end_line,
      original_code,
    } = body;

    if (!code || !language || !validation_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: code, language, validation_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Locked region anti-cheat check
    if (editable_start_line && editable_end_line && original_code) {
      const lockedValid = validateLockedRegions(code, original_code, editable_start_line, editable_end_line);
      if (!lockedValid) {
        const lockedResponse: JudgeFixErrorResponse = {
          status: 'FAIL',
          failureType: 'LOCKED_REGION_MODIFIED',
          summaryMessage: 'Locked code regions were modified. Only edit within the allowed range.',
          stdout: '',
          stderr: '',
          runtime_ms: 0,
          passed_count: 0,
          total_count: 0,
        };
        return new Response(
          JSON.stringify(lockedResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[JUDGE-FIX-ERROR][${mode.toUpperCase()}] ${validation_type} | ${language} | comparison=${comparison_mode}`);

    let response: JudgeFixErrorResponse;

    switch (validation_type) {
      case 'output_comparison': {
        if (expected_output === undefined || expected_output === null) {
          return new Response(
            JSON.stringify({ error: 'expected_output is required for output_comparison' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await validateOutputComparison(code, language, expected_output, comparison_mode, time_limit_ms);
        break;
      }

      case 'test_cases': {
        if (!test_cases || test_cases.length === 0) {
          return new Response(
            JSON.stringify({ error: 'test_cases are required for test_cases validation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await validateTestCases(code, language, test_cases, mode, comparison_mode, time_limit_ms);
        break;
      }

      case 'custom_function': {
        if (!custom_validator) {
          return new Response(
            JSON.stringify({ error: 'custom_validator is required for custom_function validation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        response = await validateCustom(code, language, custom_validator, time_limit_ms);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown validation_type: ${validation_type}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to judge fix-error code';
    console.error('Error in judge-fix-error:', error);

    const fallback: JudgeFixErrorResponse = {
      status: 'FAIL',
      failureType: 'RUNTIME_ERROR',
      summaryMessage: errorMessage,
      stdout: '',
      stderr: errorMessage,
      runtime_ms: 0,
      passed_count: 0,
      total_count: 0,
    };

    return new Response(
      JSON.stringify(fallback),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
