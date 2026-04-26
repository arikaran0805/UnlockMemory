import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Piston runtime map — language name → piston language identifier
// Piston uses the Node.js runtime for both js and ts
const PISTON_LANG: Record<string, string> = {
  python:     'python',
  javascript: 'javascript',
  typescript: 'typescript',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: 'Code and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pistonLang = PISTON_LANG[language.toLowerCase()];
    if (!pistonLang) {
      return new Response(
        JSON.stringify({ error: `Language '${language}' is not supported for execution` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Executing ${language} code via Piston API`);

    const pistonResponse = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: pistonLang,
        version: '*',           // always use latest available version
        files: [{ content: code }],
        stdin: '',
        args: [],
        run_timeout: 10000,     // 10 s hard limit
        compile_timeout: 15000,
        compile_memory_limit: -1,
        run_memory_limit: -1,
      }),
    });

    if (!pistonResponse.ok) {
      const errorText = await pistonResponse.text();
      console.error('Piston API error:', pistonResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Code execution service temporarily unavailable. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await pistonResponse.json();
    const run = result.run ?? {};

    const stdout: string = run.stdout ?? '';
    const stderr: string = run.stderr ?? '';
    const exitCode: number = run.code ?? 0;

    // Non-zero exit code or stderr → treat as a runtime error
    if (exitCode !== 0) {
      const errorOutput = (stderr || stdout || 'Runtime error').trim();
      return new Response(
        JSON.stringify({ output: errorOutput, error: errorOutput }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Zero exit code but stderr present (e.g. Python warnings) → show both
    const output = [stdout, stderr].filter(Boolean).join('\n').trim() || 'No output';

    return new Response(
      JSON.stringify({ output, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute code';
    console.error('Error in execute-code function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
