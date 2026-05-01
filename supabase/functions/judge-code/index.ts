import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const PISTON_BASE = Deno.env.get('PISTON_URL') ?? 'http://localhost:2000';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Verdict types
type Verdict = 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded' | 'compilation_error';
type ExecutionMode = 'run' | 'submit';

interface TestCase {
  id: string | number;
  inputs: Record<string, unknown>;
  expected_output: unknown;
  is_visible?: boolean;
}

interface JudgeRequest {
  code: string;
  language: string;
  function_name: string;
  parameter_names: string[];
  test_cases: TestCase[];
  mode?: ExecutionMode; // Default: 'run'
  time_limit_ms?: number;
  memory_limit_mb?: number;
}

interface TestCaseResult {
  id: string | number;
  passed: boolean;
  actual_output?: unknown;
  expected_output?: unknown;
  runtime_ms?: number;
  error?: string;
  is_visible: boolean;
}

interface JudgeResponse {
  verdict: Verdict;
  passed_count: number;
  total_count: number;
  test_results: TestCaseResult[];
  error?: string;
  total_runtime_ms: number;
}

// =============================================================================
// COMPILATION / SYNTAX ERROR DETECTION - LeetCode-style phase classification
// =============================================================================

/**
 * Normalize language name to standard format.
 */
function normalizeLanguage(language: string): string {
  const lang = language.toLowerCase().trim();
  if (lang === 'python' || lang === 'python3' || lang === 'py') return 'python';
  if (lang === 'javascript' || lang === 'js' || lang === 'node') return 'javascript';
  if (lang === 'typescript' || lang === 'ts') return 'typescript';
  if (lang === 'java') return 'java';
  if (lang === 'c' || lang === 'c11') return 'c';
  if (lang === 'cpp' || lang === 'c++' || lang === 'c++17' || lang === 'c++20') return 'cpp';
  return lang;
}

/**
 * Detect if stderr contains a compilation or syntax error.
 * Returns true if error occurred during parsing/compilation phase (before execution).
 */
function isSyntaxOrCompilationError(stderr: string, language: string): boolean {
  if (!stderr || stderr.trim().length === 0) return false;
  
  const normalizedLang = normalizeLanguage(language);
  const stderrLower = stderr.toLowerCase();
  
  switch (normalizedLang) {
    case 'python':
      // Python syntax errors occur before execution
      return (
        stderr.includes('SyntaxError') ||
        stderr.includes('IndentationError') ||
        stderr.includes('TabError') ||
        stderrLower.includes('unexpected eof') ||
        stderrLower.includes('invalid syntax') ||
        stderrLower.includes('was never closed') ||
        stderrLower.includes('expected an indented block') ||
        stderrLower.includes('unmatched')
      );
      
    case 'javascript':
    case 'typescript':
      // JavaScript/TypeScript syntax errors
      return (
        stderr.includes('SyntaxError') ||
        stderrLower.includes('unexpected token') ||
        stderrLower.includes('unexpected end of input') ||
        stderrLower.includes('unexpected identifier') ||
        stderrLower.includes('unexpected string') ||
        stderrLower.includes('unexpected number') ||
        stderrLower.includes('missing ) after') ||
        stderrLower.includes('missing } after') ||
        stderrLower.includes('missing ] after') ||
        stderrLower.includes('unterminated string') ||
        stderrLower.includes('invalid or unexpected token')
      );
      
    case 'java':
      // Java compilation errors
      return (
        stderr.includes('error:') ||
        stderrLower.includes('reached end of file while parsing') ||
        stderrLower.includes('illegal start of expression') ||
        stderrLower.includes('illegal start of type') ||
        stderrLower.includes('not a statement') ||
        stderrLower.includes('\';\' expected') ||
        stderrLower.includes('\')\' expected') ||
        stderrLower.includes('\'}\' expected') ||
        stderrLower.includes('unclosed string literal') ||
        stderrLower.includes('class, interface, or enum expected')
      );
      
    case 'c':
    case 'cpp':
      // C/C++ compilation errors
      return (
        stderr.includes('error:') ||
        stderrLower.includes('expected \';\' ') ||
        stderrLower.includes('expected \')\' ') ||
        stderrLower.includes('expected \'}\' ') ||
        stderrLower.includes('expected declaration') ||
        stderrLower.includes('expected expression') ||
        stderrLower.includes('incompatible types') ||
        stderrLower.includes('undeclared identifier') ||
        stderrLower.includes('use of undeclared') ||
        stderrLower.includes('unknown type name') ||
        stderrLower.includes('stray \'') ||
        stderrLower.includes('unterminated')
      );
      
    default:
      return false;
  }
}

// =============================================================================
// INPUT NORMALIZATION - LeetCode-style type conversion
// =============================================================================

/**
 * Normalize a raw input value to its typed runtime equivalent.
 */
function normalizeInputValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(normalizeInputValue);
  if (typeof value === 'object') {
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      normalized[k] = normalizeInputValue(v);
    }
    return normalized;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    
    if (trimmed === '') return '';
    if (trimmed === 'true' || trimmed === 'True') return true;
    if (trimmed === 'false' || trimmed === 'False') return false;
    if (trimmed === 'null' || trimmed === 'None') return null;
    
    if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.startsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeInputValue(parsed);
      } catch {
        // Not valid JSON
      }
    }
    
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    
    if (/^-?\d+(\s*,\s*-?\d+)+$/.test(trimmed)) {
      return trimmed.split(',').map(s => {
        const n = s.trim();
        return n.includes('.') ? parseFloat(n) : parseInt(n, 10);
      });
    }
    
    if (/^-?\d+(\s+-?\d+)+$/.test(trimmed)) {
      return trimmed.split(/\s+/).map(s => {
        return s.includes('.') ? parseFloat(s) : parseInt(s, 10);
      });
    }
    
    if (trimmed.includes(',') && !/,\s+[a-z]/i.test(trimmed)) {
      const parts = trimmed.split(',').map(s => s.trim());
      if (parts.every(p => /^-?\d+(\.\d+)?$/.test(p))) {
        return parts.map(p => p.includes('.') ? parseFloat(p) : parseInt(p, 10));
      }
      return parts;
    }
    
    return trimmed;
  }

  return value;
}

/**
 * Prepare test case inputs for execution.
 */
function prepareTestCaseInputs(
  testCases: TestCase[],
  parameterNames: string[]
): { normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }>; error?: string } {
  const normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }> = [];

  for (const tc of testCases) {
    try {
      for (const param of parameterNames) {
        if (!(param in tc.inputs)) {
          return { normalizedCases: [], error: `Missing input for parameter '${param}'` };
        }
      }

      const args: unknown[] = [];
      for (const param of parameterNames) {
        const raw = tc.inputs[param];
        const normalized = normalizeInputValue(raw);
        args.push(normalized);
      }

      normalizedCases.push({
        id: tc.id,
        args,
        expected: normalizeInputValue(tc.expected_output),
        is_visible: tc.is_visible ?? true,
      });
    } catch (e) {
      return { normalizedCases: [], error: `Input normalization failed: ${e instanceof Error ? e.message : 'Unknown error'}` };
    }
  }

  return { normalizedCases };
}

// =============================================================================
// CODE GENERATION
// =============================================================================

function generatePythonCode(
  userCode: string,
  functionName: string,
  normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }>
): string {
  const casesForPython = normalizedCases.map(tc => ({
    id: tc.id,
    args: tc.args,
    expected: tc.expected,
  }));
  
  const testCasesJson = JSON.stringify(casesForPython);

  return `
import json
import time

# User submitted code
${userCode}

def _convert_json_to_python(val):
    if val is None:
        return None
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, str):
        return val
    if isinstance(val, list):
        return [_convert_json_to_python(x) for x in val]
    if isinstance(val, dict):
        return {k: _convert_json_to_python(v) for k, v in val.items()}
    return val

def _compare_outputs(actual, expected):
    if actual is None and expected is None:
        return True
    if actual is None or expected is None:
        return False
    
    if isinstance(expected, float) or isinstance(actual, float):
        try:
            return abs(float(actual) - float(expected)) < 1e-9
        except (TypeError, ValueError):
            return False
    
    if isinstance(expected, list) and isinstance(actual, list):
        if len(expected) != len(actual):
            return False
        return all(_compare_outputs(a, e) for a, e in zip(actual, expected))
    
    if isinstance(expected, dict) and isinstance(actual, dict):
        if set(expected.keys()) != set(actual.keys()):
            return False
        return all(_compare_outputs(actual[k], expected[k]) for k in expected)
    
    return actual == expected

def run_tests():
    test_cases = json.loads('''${testCasesJson}''')
    results = []
    
    for tc in test_cases:
        tc_id = tc['id']
        args = [_convert_json_to_python(a) for a in tc['args']]
        expected = _convert_json_to_python(tc['expected'])
        
        result = {
            'id': tc_id,
            'passed': False,
            'actual': None,
            'expected': expected,
            'runtime_ms': 0,
            'error': None
        }
        
        try:
            start_time = time.time()
            actual = ${functionName}(*args)
            end_time = time.time()
            
            result['runtime_ms'] = round((end_time - start_time) * 1000, 2)
            result['actual'] = actual
            result['passed'] = _compare_outputs(actual, expected)
            
        except Exception as e:
            result['error'] = type(e).__name__ + ': ' + str(e)[:200]
        
        results.append(result)
    
    print(json.dumps(results))

if __name__ == "__main__":
    run_tests()
`;
}

function generateJavaScriptCode(
  userCode: string,
  functionName: string,
  normalizedCases: Array<{ id: string | number; args: unknown[]; expected: unknown; is_visible: boolean }>
): string {
  const casesForJS = normalizedCases.map(tc => ({
    id: tc.id,
    args: tc.args,
    expected: tc.expected,
  }));
  
  const testCasesJson = JSON.stringify(casesForJS);

  return `
// User submitted code
${userCode}

function compareOutputs(actual, expected) {
  if (actual === null && expected === null) return true;
  if (actual === null || expected === null) return false;
  if (actual === undefined && expected === undefined) return true;
  if (actual === undefined || expected === undefined) return false;
  
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (Number.isNaN(expected) && Number.isNaN(actual)) return true;
    return Math.abs(actual - expected) < 1e-9;
  }
  
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return false;
    return expected.every((e, i) => compareOutputs(actual[i], e));
  }
  
  if (typeof expected === 'object' && typeof actual === 'object') {
    const expectedKeys = Object.keys(expected);
    const actualKeys = Object.keys(actual);
    if (expectedKeys.length !== actualKeys.length) return false;
    return expectedKeys.every(k => compareOutputs(actual[k], expected[k]));
  }
  
  return actual === expected;
}

function runTests() {
  const testCases = ${testCasesJson};
  const results = [];
  
  for (const tc of testCases) {
    const result = {
      id: tc.id,
      passed: false,
      actual: null,
      expected: tc.expected,
      runtime_ms: 0,
      error: null
    };
    
    try {
      const args = tc.args;
      
      const startTime = performance.now();
      const actual = ${functionName}(...args);
      const endTime = performance.now();
      
      result.runtime_ms = Math.round((endTime - startTime) * 100) / 100;
      result.actual = actual;
      result.passed = compareOutputs(actual, tc.expected);
      
    } catch (e) {
      result.error = (e.name || 'Error') + ': ' + (e.message || '').substring(0, 200);
    }
    
    results.push(result);
  }
  
  console.log(JSON.stringify(results));
}

runTests();
`;
}

// =============================================================================
// RESULT PARSING
// =============================================================================

function parseExecutionResults(
  output: string,
  testCases: TestCase[]
): { results: TestCaseResult[]; error?: string } {
  try {
    const jsonMatch = output.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return {
        results: testCases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: 'Failed to parse execution results'
        })),
        error: output.substring(0, 500)
      };
    }
    
    const rawResults = JSON.parse(jsonMatch[0]);
    
    return {
      results: rawResults.map((r: Record<string, unknown>, i: number) => ({
        id: r.id ?? i,
        passed: r.passed as boolean,
        actual_output: r.actual,
        expected_output: r.expected,
        runtime_ms: r.runtime_ms as number,
        error: r.error as string | undefined,
        is_visible: testCases[i]?.is_visible ?? true
      }))
    };
  } catch (e) {
    return {
      results: testCases.map(tc => ({
        id: tc.id,
        passed: false,
        is_visible: tc.is_visible ?? true,
        error: 'Failed to parse execution results'
      })),
      error: `Parse error: ${e instanceof Error ? e.message : 'Unknown error'}`
    };
  }
}

// =============================================================================
// MODE-AWARE RESPONSE SHAPING
// =============================================================================

/**
 * Shape the response based on execution mode.
 * - Run mode: Full details for debugging
 * - Submit mode: Minimal details, hide sensitive data
 */
function shapeResponseForMode(
  verdict: Verdict,
  testResults: TestCaseResult[],
  mode: ExecutionMode,
  totalRuntime: number,
  parseError?: string
): JudgeResponse {
  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;

  // RUN MODE: Full transparency for learning
  if (mode === 'run') {
    return {
      verdict,
      passed_count: passedCount,
      total_count: totalCount,
      test_results: testResults,
      error: parseError,
      total_runtime_ms: Math.round(totalRuntime * 100) / 100
    };
  }

  // SUBMIT MODE: Minimal details, protect hidden test data
  // Shape test results to hide sensitive information
  const shapedResults: TestCaseResult[] = testResults.map(r => {
    // For hidden tests: never reveal actual/expected output or specific errors
    if (!r.is_visible) {
      return {
        id: r.id,
        passed: r.passed,
        is_visible: false,
        runtime_ms: r.runtime_ms,
        // Hide everything else for hidden tests
        actual_output: undefined,
        expected_output: undefined,
        error: r.error ? 'Runtime Error' : undefined, // Generic error only
      };
    }
    
    // For visible tests in submit mode: show basic info but not detailed errors
    return {
      id: r.id,
      passed: r.passed,
      is_visible: true,
      runtime_ms: r.runtime_ms,
      actual_output: r.actual_output,
      expected_output: r.expected_output,
      // In submit mode, simplify error messages
      error: r.error ? getGenericErrorType(r.error) : undefined,
    };
  });

  // In submit mode with non-accepted verdict, provide minimal response
  if (verdict !== 'accepted') {
    return {
      verdict,
      passed_count: passedCount,
      total_count: totalCount,
      test_results: shapedResults,
      // Don't expose parse errors in submit mode
      error: undefined,
      total_runtime_ms: Math.round(totalRuntime * 100) / 100
    };
  }

  return {
    verdict,
    passed_count: passedCount,
    total_count: totalCount,
    test_results: shapedResults,
    error: undefined,
    total_runtime_ms: Math.round(totalRuntime * 100) / 100
  };
}

/**
 * Extract generic error type from detailed error message.
 */
function getGenericErrorType(error: string): string {
  if (error.includes('TypeError')) return 'TypeError';
  if (error.includes('ValueError')) return 'ValueError';
  if (error.includes('IndexError')) return 'IndexError';
  if (error.includes('KeyError')) return 'KeyError';
  if (error.includes('ZeroDivisionError')) return 'ZeroDivisionError';
  if (error.includes('AttributeError')) return 'AttributeError';
  if (error.includes('NameError')) return 'NameError';
  if (error.includes('SyntaxError')) return 'SyntaxError';
  if (error.includes('ReferenceError')) return 'ReferenceError';
  if (error.includes('RangeError')) return 'RangeError';
  return 'Runtime Error';
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: JudgeRequest = await req.json();
    
    const {
      code,
      language,
      function_name,
      parameter_names,
      test_cases,
      mode = 'run', // Default to run mode
      time_limit_ms = 5000,
    } = body;

    // Validate required fields
    if (!code || !language || !function_name || !test_cases?.length) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: code, language, function_name, test_cases' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${mode.toUpperCase()}] Judging ${language} code for function: ${function_name}`);
    console.log(`Test cases: ${test_cases.length}, Time limit: ${time_limit_ms}ms`);

    // =========================================================================
    // STEP 1: Select test cases based on mode
    // =========================================================================
    const activeTestCases = mode === 'run'
      ? test_cases.filter(tc => tc.is_visible !== false)
      : test_cases;

    console.log(`Active test cases for ${mode} mode: ${activeTestCases.length}`);

    // =========================================================================
    // STEP 2: Normalize inputs
    // =========================================================================
    const { normalizedCases, error: normalizationError } = prepareTestCaseInputs(
      activeTestCases,
      parameter_names || []
    );

    if (normalizationError) {
      const response: JudgeResponse = {
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: activeTestCases.length,
        test_results: activeTestCases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: mode === 'run' ? 'Invalid input format.' : 'Runtime Error'
        })),
        error: mode === 'run' ? 'Invalid input format.' : undefined,
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 3: Generate execution code
    // =========================================================================
    let executionCode: string;
    
    if (language === 'python') {
      executionCode = generatePythonCode(code, function_name, normalizedCases);
    } else if (language === 'javascript' || language === 'typescript') {
      executionCode = generateJavaScriptCode(code, function_name, normalizedCases);
    } else {
      return new Response(
        JSON.stringify({ error: `Unsupported language: ${language}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 4: Execute via Piston API
    // =========================================================================
    const pistonResponse = await fetch(`${PISTON_BASE}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: language === 'typescript' ? 'javascript' : language,
        version: '*',
        files: [{ content: executionCode }],
        run_timeout: time_limit_ms,
      }),
    });

    if (!pistonResponse.ok) {
      const errorText = await pistonResponse.text();
      console.error('Piston API error:', errorText);
      
      const response: JudgeResponse = {
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: activeTestCases.length,
        test_results: activeTestCases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: 'Code execution service unavailable'
        })),
        error: mode === 'run' ? 'Code execution service unavailable' : undefined,
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pistonResult = await pistonResponse.json();
    console.log('Piston result:', JSON.stringify(pistonResult).substring(0, 500));

    // Check for compilation errors (non-Python)
    if (pistonResult.compile?.stderr && language !== 'python') {
      const errorMsg = pistonResult.compile.stderr.substring(0, 500);
      const response: JudgeResponse = {
        verdict: 'compilation_error',
        passed_count: 0,
        total_count: activeTestCases.length,
        test_results: activeTestCases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: mode === 'run' ? errorMsg : 'Compilation Error'
        })),
        error: mode === 'run' ? errorMsg : undefined,
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for timeout
    if (pistonResult.run?.signal === 'SIGKILL' || pistonResult.run?.code === 137) {
      const response: JudgeResponse = {
        verdict: 'time_limit_exceeded',
        passed_count: 0,
        total_count: activeTestCases.length,
        test_results: activeTestCases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: 'Time Limit Exceeded'
        })),
        error: 'Time Limit Exceeded',
        total_runtime_ms: time_limit_ms
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get output
    const stdout = pistonResult.run?.stdout || '';
    const stderr = pistonResult.run?.stderr || '';

    // Classify error phase: compilation/syntax vs runtime
    // Only process if there's stderr AND no valid JSON output
    if (stderr && !stdout.trim()) {
      const errorMsg = stderr.substring(0, 500);
      
      // Check if this is a compilation/syntax error (before execution)
      const isCompilationError = isSyntaxOrCompilationError(stderr, language);
      const verdict: Verdict = isCompilationError ? 'compilation_error' : 'runtime_error';
      
      const response: JudgeResponse = {
        verdict,
        passed_count: 0,
        total_count: activeTestCases.length,
        test_results: activeTestCases.map(tc => ({
          id: tc.id,
          passed: false,
          is_visible: tc.is_visible ?? true,
          error: mode === 'run' ? errorMsg : (isCompilationError ? 'Compilation Error' : 'Runtime Error')
        })),
        error: mode === 'run' ? errorMsg : undefined,
        total_runtime_ms: 0
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 5: Parse results and determine verdict
    // =========================================================================
    const { results: testResults, error: parseError } = parseExecutionResults(stdout, activeTestCases);

    const passedCount = testResults.filter(r => r.passed).length;
    const totalCount = testResults.length;
    const hasRuntimeError = testResults.some(r => r.error && !r.passed);
    const totalRuntime = testResults.reduce((sum, r) => sum + (r.runtime_ms || 0), 0);

    let verdict: Verdict;
    if (parseError) {
      verdict = 'runtime_error';
    } else if (passedCount === totalCount) {
      verdict = 'accepted';
    } else if (hasRuntimeError) {
      verdict = 'runtime_error';
    } else {
      verdict = 'wrong_answer';
    }

    // =========================================================================
    // STEP 6: Shape response based on mode
    // =========================================================================
    const response = shapeResponseForMode(
      verdict,
      testResults,
      mode,
      totalRuntime,
      parseError
    );

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to judge code';
    console.error('Error judging code:', error);
    
    return new Response(
      JSON.stringify({ 
        verdict: 'runtime_error',
        passed_count: 0,
        total_count: 0,
        test_results: [],
        error: errorMessage,
        total_runtime_ms: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
