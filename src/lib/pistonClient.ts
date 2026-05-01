/**
 * pistonClient.ts
 * Thin typed client for a self-hosted Piston code execution engine.
 *
 * Base URL:  VITE_PISTON_URL env var  (fallback: http://localhost:2000)
 * API docs:  https://github.com/engineer-man/piston#api-endpoints
 */

// In development, route through Vite's proxy (/piston-api → localhost:2000).
// This avoids CORS — self-hosted Piston is server-to-server only and doesn't
// send Access-Control-Allow-Origin headers for browser-direct requests.
// In production, call VITE_PISTON_URL directly (configure CORS on your reverse proxy).
const BASE_URL = import.meta.env.DEV
  ? '/piston-api'
  : ((import.meta.env.VITE_PISTON_URL as string | undefined) ?? 'http://localhost:2000');

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface PistonRuntime {
  language: string;
  version: string;
  aliases: string[];
}

export interface PistonResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: string | null;
  output: string;
  language: string;
  version: string;
}

// ── Runtime cache (1-hour TTL) ────────────────────────────────────────────────

let _runtimeCache: PistonRuntime[] | null = null;
let _runtimeCachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getRuntimes(): Promise<PistonRuntime[]> {
  const now = Date.now();
  if (_runtimeCache && now - _runtimeCachedAt < CACHE_TTL_MS) {
    return _runtimeCache;
  }
  const res = await fetch(`${BASE_URL}/api/v2/runtimes`);
  if (!res.ok) {
    throw new Error(`Piston: failed to fetch runtimes (${res.status} ${res.statusText})`);
  }
  _runtimeCache = (await res.json()) as PistonRuntime[];
  _runtimeCachedAt = now;
  return _runtimeCache;
}

// ── Language normalisation ────────────────────────────────────────────────────
// Maps common shorthand names to the identifier Piston expects.

const LANG_ALIASES: Record<string, string> = {
  js:         'javascript',
  ts:         'typescript',
  py:         'python',
  py3:        'python',
  rb:         'ruby',
  rs:         'rust',
  sh:         'bash',
  shell:      'bash',
  'c++':      'c++',
  cpp:        'c++',
  cs:         'csharp',
  csharp:     'csharp',
};

function normalizeLang(language: string): string {
  const lower = language.toLowerCase().trim();
  return LANG_ALIASES[lower] ?? lower;
}

// ── executeCode ───────────────────────────────────────────────────────────────

/**
 * Executes `code` in `language` on the self-hosted Piston instance.
 *
 * - Auto-picks the latest installed version for the requested language.
 * - Throws a descriptive error if the language is not installed.
 *
 * @param language  Any language name or alias (e.g. "python", "js", "ts")
 * @param code      Source code to run
 * @param stdin     Optional stdin string (default: empty)
 */
export async function executeCode(
  language: string,
  code: string,
  stdin = '',
): Promise<PistonResult> {
  const runtimes = await getRuntimes();
  const lang = normalizeLang(language);

  // Pick the latest installed version for this language
  const matching = runtimes.filter(
    (r) => r.language === lang || (r.aliases ?? []).includes(lang),
  );

  if (matching.length === 0) {
    const available = [...new Set(runtimes.map((r) => r.language))].sort().join(', ');
    throw new Error(
      `Language '${language}' is not installed on this Piston instance.\n` +
      `Available languages: ${available}`,
    );
  }

  // Sort descending by version so index 0 is the newest
  const runtime = matching.sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true }),
  )[0];

  const res = await fetch(`${BASE_URL}/api/v2/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language:             runtime.language,
      version:              runtime.version,
      files:                [{ content: code }],
      stdin,
      args:                 [],
      run_timeout:          10000,
      compile_timeout:      15000,
      run_memory_limit:     134217728, // 128 MiB
      compile_memory_limit: -1,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Piston execute failed (${res.status}): ${text}`);
  }

  const json = await res.json();
  const run = json.run ?? {};
  const compile = json.compile ?? {};

  return {
    stdout:   run.stdout  ?? '',
    stderr:   run.stderr  ?? compile.stderr ?? '',
    code:     run.code    ?? null,
    signal:   run.signal  ?? null,
    output:   run.output  ?? run.stdout ?? '',
    language: runtime.language,
    version:  runtime.version,
  };
}
