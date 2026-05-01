/**
 * PracticeFocusMode
 *
 * Full-screen practice workspace modelled after NotesFocusMode.
 *
 * LEFT SIDEBAR (260 px, fixed):
 *   – Course name
 *   – Scrollable lesson list; each row shows problem count + completion dot
 *
 * MAIN PANEL (flex-1):
 *   – Empty state when no lesson is selected
 *   – Search + filter toolbar (difficulty / solved status)
 *   – Problem table (grouped by sub-topic) when a lesson is selected
 *   – Each row links to the appropriate workspace in a new tab
 */

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dumbbell,
  CheckCircle2,
  Circle,
  Lock,
  ExternalLink,
  Code2,
  Eye,
  Wrench,
  XCircle,
  ChevronRight,
  Loader2,
  Search,
  X,
  FilterX,
} from "lucide-react";
import { useLessonProblemsForFocus, type FocusProblem, type ProblemType } from "@/hooks/useLessonProblemsForFocus";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonSummary {
  id: string;
  title: string;
}

interface PracticeFocusModeProps {
  courseId: string;
  courseName: string;
  courseSlug: string;
  careerId: string;
  lessons: LessonSummary[];
  practiceSkillSlug: string | undefined;
  lessonProblemCounts: Map<string, number> | undefined;
  lessonProblemsCompleted: Map<string, boolean> | undefined;
  onExit: () => void;
  initialLessonId?: string;
}

type DifficultyFilter = "Easy" | "Medium" | "Hard" | null;
type SolvedFilter = "solved" | "unsolved" | null;

// ─── Problem type pill ────────────────────────────────────────────────────────

const TYPE_META: Record<ProblemType, {
  label: string;
  Icon: React.ElementType;
  text: string;
  bg: string;
}> = {
  "problem-solving": {
    label: "Code",
    Icon: Code2,
    text: "text-primary",
    bg:   "bg-primary/[0.07] dark:bg-primary/[0.12]",
  },
  "predict-output": {
    label: "Predict",
    Icon: Eye,
    text: "text-violet-600 dark:text-violet-400",
    bg:   "bg-violet-50 dark:bg-violet-950/30",
  },
  "fix-error": {
    label: "Fix Error",
    Icon: Wrench,
    text: "text-amber-600 dark:text-amber-400",
    bg:   "bg-amber-50 dark:bg-amber-950/30",
  },
  "eliminate-wrong": {
    label: "Eliminate",
    Icon: XCircle,
    text: "text-rose-600 dark:text-rose-400",
    bg:   "bg-rose-50 dark:bg-rose-950/30",
  },
};

const TypePill = ({ type }: { type: ProblemType }) => {
  const meta = TYPE_META[type];
  const Icon = meta.Icon;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10.5px] font-medium leading-none",
      "px-1.5 py-[3px] rounded-md flex-shrink-0",
      meta.text,
      meta.bg,
    )}>
      <Icon className="h-2.5 w-2.5 flex-shrink-0" />
      {meta.label}
    </span>
  );
};

// ─── Difficulty badge (inline in row) ────────────────────────────────────────

const DIFFICULTY_PILL: Record<string, string> = {
  Easy:   "bg-emerald-50  text-emerald-700  border-emerald-200  dark:bg-emerald-950/40  dark:text-emerald-400  dark:border-emerald-800/50",
  Medium: "bg-amber-50    text-amber-700    border-amber-200    dark:bg-amber-950/40    dark:text-amber-400    dark:border-amber-800/50",
  Hard:   "bg-rose-50     text-rose-700     border-rose-200     dark:bg-rose-950/40     dark:text-rose-400     dark:border-rose-800/50",
};

// ─── Workspace URL builder ────────────────────────────────────────────────────

function buildWorkspaceUrl(skillSlug: string, problem: FocusProblem): string {
  switch (problem.problemType) {
    case "problem-solving":   return `/practice/${skillSlug}/problem/${problem.slug}`;
    case "predict-output":    return `/practice/${skillSlug}/predict/${problem.slug}`;
    case "fix-error":         return `/practice/${skillSlug}/fix-error/${problem.slug}`;
    case "eliminate-wrong":   return `/practice/${skillSlug}/eliminate/${problem.slug}`;
  }
}

// ─── Problem Row ──────────────────────────────────────────────────────────────

const ProblemRow = ({ problem, skillSlug }: { problem: FocusProblem; skillSlug: string }) => {
  const url = buildWorkspaceUrl(skillSlug, problem);
  const isLocked = problem.locked;

  return (
    <button
      onClick={() => { if (!isLocked) window.open(url, "_blank", "noopener,noreferrer"); }}
      disabled={isLocked}
      title={isLocked ? "Premium — upgrade to unlock" : problem.title}
      className={cn(
        "group w-full flex items-center gap-3.5 px-5 py-3.5 text-left",
        "transition-colors duration-150 outline-none",
        "focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-primary/30",
        isLocked
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-muted/60 active:bg-muted/80 cursor-pointer",
      )}
    >
      {/* Solved indicator */}
      <span className="flex-shrink-0 w-5 flex items-center justify-center">
        {problem.solved ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : isLocked ? (
          <Lock className="h-3.5 w-3.5 text-muted-foreground/40" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/25 group-hover:text-muted-foreground/45 transition-colors" />
        )}
      </span>

      {/* Title */}
      <span className={cn(
        "flex-1 min-w-0 text-[13.5px] tracking-[-0.005em] truncate leading-snug",
        problem.solved
          ? "font-normal text-muted-foreground/60 line-through decoration-muted-foreground/30"
          : "font-medium text-foreground/88 group-hover:text-foreground",
        "transition-colors duration-100",
      )}>
        {problem.title}
      </span>

      {/* Badges */}
      <span className="flex items-center gap-2 flex-shrink-0">
        <TypePill type={problem.problemType} />
        <span className={cn(
          "text-[10.5px] font-medium px-2 py-[3px] rounded-full border leading-none flex-shrink-0",
          DIFFICULTY_PILL[problem.difficulty] ?? DIFFICULTY_PILL.Easy,
        )}>
          {problem.difficulty}
        </span>
        {!isLocked && (
          <ExternalLink className="h-3 w-3 text-transparent group-hover:text-muted-foreground/40 transition-colors flex-shrink-0" />
        )}
      </span>
    </button>
  );
};

// ─── Filter toolbar ───────────────────────────────────────────────────────────

const DIFFICULTY_FILTER_STYLES: Record<string, { active: string; inactive: string }> = {
  Easy: {
    active:   "bg-emerald-50  text-emerald-700  border-emerald-300  dark:bg-emerald-950/50  dark:text-emerald-400  dark:border-emerald-700",
    inactive: "bg-transparent text-muted-foreground border-border hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20",
  },
  Medium: {
    active:   "bg-amber-50    text-amber-700    border-amber-300    dark:bg-amber-950/50    dark:text-amber-400    dark:border-amber-700",
    inactive: "bg-transparent text-muted-foreground border-border hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50/60 dark:hover:bg-amber-950/20",
  },
  Hard: {
    active:   "bg-rose-50     text-rose-700     border-rose-300     dark:bg-rose-950/50     dark:text-rose-400     dark:border-rose-700",
    inactive: "bg-transparent text-muted-foreground border-border hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50/60 dark:hover:bg-rose-950/20",
  },
};

interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  difficultyFilter: DifficultyFilter;
  onDifficultyChange: (v: DifficultyFilter) => void;
  solvedFilter: SolvedFilter;
  onSolvedChange: (v: SolvedFilter) => void;
  totalCount: number;
  filteredCount: number;
}

const FilterToolbar = ({
  searchQuery, onSearchChange,
  difficultyFilter, onDifficultyChange,
  solvedFilter, onSolvedChange,
  totalCount, filteredCount,
}: FilterToolbarProps) => {
  const hasFilters = searchQuery.trim() || difficultyFilter || solvedFilter;
  const isFiltered = hasFilters && filteredCount < totalCount;

  return (
    <div className="flex-shrink-0 bg-background">
      <div className="max-w-5xl mx-auto px-10 py-3 flex items-center gap-2 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search problems…"
            className={cn(
              "w-full h-8 pl-8 pr-7 text-[12.5px] tracking-[-0.005em]",
              "rounded-full border border-border bg-transparent",
              "placeholder:text-muted-foreground/40 text-foreground",
              "transition-all duration-150 outline-none",
              "focus:border-primary/50 focus:ring-2 focus:ring-primary/[0.08]",
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground rounded-full transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border/60 flex-shrink-0" />

        {/* Difficulty pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {(["Easy", "Medium", "Hard"] as const).map(d => {
            const styles = DIFFICULTY_FILTER_STYLES[d];
            const isActive = difficultyFilter === d;
            return (
              <button
                key={d}
                onClick={() => onDifficultyChange(isActive ? null : d)}
                className={cn(
                  "h-8 px-3 text-[11.5px] font-semibold rounded-full border transition-all duration-150",
                  isActive ? styles.active : styles.inactive,
                )}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border/60 flex-shrink-0" />

        {/* Solved / Unsolved */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onSolvedChange(solvedFilter === "solved" ? null : "solved")}
            className={cn(
              "h-8 px-3 text-[11.5px] font-semibold rounded-full border transition-all duration-150 flex items-center gap-1.5",
              solvedFilter === "solved"
                ? "bg-primary/[0.09] text-primary border-primary/40"
                : "bg-transparent text-muted-foreground border-border hover:bg-primary/[0.05] hover:text-primary/80 hover:border-primary/30",
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
            Solved
          </button>
          <button
            onClick={() => onSolvedChange(solvedFilter === "unsolved" ? null : "unsolved")}
            className={cn(
              "h-8 px-3 text-[11.5px] font-semibold rounded-full border transition-all duration-150 flex items-center gap-1.5",
              solvedFilter === "unsolved"
                ? "bg-muted text-foreground/80 border-border"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground/70",
            )}
          >
            <Circle className="h-3 w-3" />
            Unsolved
          </button>
        </div>

        {/* Result count + clear */}
        {hasFilters && (
          <>
            <div className="h-4 w-px bg-border/60 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11.5px] text-muted-foreground/70 tabular-nums">
                {isFiltered
                  ? <><span className="font-semibold text-foreground/80">{filteredCount}</span> of {totalCount}</>
                  : <span className="font-semibold text-foreground/80">{totalCount}</span>
                }{" "}problem{totalCount !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => { onSearchChange(""); onDifficultyChange(null); onSolvedChange(null); }}
                className="h-7 px-2.5 text-[11px] font-medium rounded-full border border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1"
              >
                <FilterX className="h-3 w-3" />
                Clear
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export function PracticeFocusMode({
  courseId: _courseId,
  courseName,
  lessons,
  practiceSkillSlug,
  lessonProblemCounts,
  lessonProblemsCompleted,
  onExit,
  initialLessonId,
}: PracticeFocusModeProps) {
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(initialLessonId ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(null);
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>(null);

  useEffect(() => {
    if (initialLessonId) setSelectedLessonId(initialLessonId);
  }, [initialLessonId]);

  useEffect(() => {
    setSearchQuery("");
    setDifficultyFilter(null);
    setSolvedFilter(null);
  }, [selectedLessonId]);

  const selectedLesson = useMemo(
    () => lessons.find((l) => l.id === selectedLessonId) ?? null,
    [lessons, selectedLessonId],
  );

  const { problems, isLoading, skillSlug } = useLessonProblemsForFocus(
    practiceSkillSlug,
    selectedLessonId ?? undefined,
  );

  const totalForLesson = selectedLessonId ? (lessonProblemCounts?.get(selectedLessonId) ?? 0) : 0;
  const solvedCount = useMemo(() => problems.filter((p) => p.solved).length, [problems]);

  const filteredProblems = useMemo(() => {
    let result = problems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (difficultyFilter) result = result.filter((p) => p.difficulty === difficultyFilter);
    if (solvedFilter === "solved")   result = result.filter((p) => p.solved);
    if (solvedFilter === "unsolved") result = result.filter((p) => !p.solved);
    return result;
  }, [problems, searchQuery, difficultyFilter, solvedFilter]);

  const filteredGrouped = useMemo(() => {
    const map = new Map<string, FocusProblem[]>();
    filteredProblems.forEach((p) => {
      const bucket = map.get(p.subTopic) ?? [];
      bucket.push(p);
      map.set(p.subTopic, bucket);
    });
    return map;
  }, [filteredProblems]);

  return (
    <div className="flex w-full h-full bg-background overflow-hidden">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className="w-[260px] flex-shrink-0 flex flex-col border-r border-border bg-sidebar dark:bg-muted/10">

        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/55 leading-none mb-0.5">
                Practice & Reinforce
              </p>
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight tracking-[-0.01em]">
                {courseName}
              </p>
            </div>
          </div>
        </div>

        {/* Lesson list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="py-3 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 px-2 mb-2 select-none">
              Lessons
            </p>
            <nav className="space-y-0.5">
              {lessons.map((lesson) => {
                const count = lessonProblemCounts?.get(lesson.id) ?? 0;
                const completed = lessonProblemsCompleted?.get(lesson.id) ?? false;
                const isSelected = lesson.id === selectedLessonId;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left",
                      "transition-colors duration-150 outline-none group cursor-pointer",
                      "focus-visible:ring-1 focus-visible:ring-primary/40",
                      isSelected
                        ? "bg-primary/[0.10] dark:bg-primary/[0.15] text-foreground"
                        : "hover:bg-muted/70 text-foreground/65 hover:text-foreground/90",
                    )}
                  >
                    <span className="flex-shrink-0 w-4 flex justify-center">
                      {completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Circle className={cn(
                          "h-3.5 w-3.5 transition-colors",
                          isSelected ? "text-primary/50" : "text-muted-foreground/30 group-hover:text-muted-foreground/55",
                        )} />
                      )}
                    </span>

                    <span className={cn(
                      "flex-1 min-w-0 text-[12.5px] leading-tight truncate tracking-[-0.005em]",
                      isSelected ? "font-semibold text-foreground" : "font-medium",
                    )}>
                      {lesson.title}
                    </span>

                    {count > 0 && (
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <span className={cn(
                          "text-[10px] font-semibold tabular-nums leading-none px-1.5 py-[3px] rounded-md border",
                          isSelected
                            ? "bg-primary/[0.12] text-primary border-primary/25"
                            : "bg-muted text-muted-foreground/70 border-border group-hover:bg-muted/80",
                        )}>
                          {count}
                        </span>
                        <ChevronRight className={cn(
                          "h-3 w-3 transition-all duration-150",
                          isSelected ? "text-primary/60 translate-x-0.5" : "text-muted-foreground/20 group-hover:text-muted-foreground/45",
                        )} />
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </ScrollArea>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-background">

        {!selectedLesson ? (

          /* Empty state */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/[0.07] flex items-center justify-center mx-auto mb-5">
                <Dumbbell className="h-7 w-7 text-primary/60" />
              </div>
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground mb-2">
                Pick a lesson to practice
              </h3>
              <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
                Select a lesson from the sidebar to see its practice problems.
                Problems are mapped directly to lesson concepts — tackle them right after you read.
              </p>
            </div>
          </div>

        ) : (

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

            {/* Lesson header */}
            <div className="flex-shrink-0 bg-background">
            <div className="max-w-5xl mx-auto px-10 pt-6 pb-5 border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/55 mb-1.5">
                    Practice problems
                  </p>
                  <h2 className="text-[20px] font-bold tracking-[-0.02em] text-foreground leading-tight">
                    {selectedLesson.title}
                  </h2>
                </div>

                {totalForLesson > 0 && (
                  <div className="flex-shrink-0 mt-1">
                    <span className={cn(
                      "text-[12px] font-semibold px-3 py-1.5 rounded-full border tabular-nums",
                      solvedCount === totalForLesson && totalForLesson > 0
                        ? "bg-primary/[0.08] text-primary border-primary/25"
                        : "bg-muted/50 text-muted-foreground/75 border-border/70",
                    )}>
                      {solvedCount} / {totalForLesson} solved
                    </span>
                  </div>
                )}
              </div>
            </div>
            </div>

            {/* Filter toolbar */}
            {!isLoading && problems.length > 0 && (
              <FilterToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                difficultyFilter={difficultyFilter}
                onDifficultyChange={setDifficultyFilter}
                solvedFilter={solvedFilter}
                onSolvedChange={setSolvedFilter}
                totalCount={problems.length}
                filteredCount={filteredProblems.length}
              />
            )}

            {/* Problems body */}
            <ScrollArea className="flex-1 min-h-0 bg-background">
              <div className="max-w-5xl mx-auto px-10 py-6">

                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
                  </div>

                ) : problems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted/70 flex items-center justify-center mb-4">
                      <Dumbbell className="h-5 w-5 text-muted-foreground/45" />
                    </div>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      No practice problems for this lesson yet
                    </p>
                    <p className="text-[12px] text-muted-foreground/55 mt-1">
                      Check back later or pick another lesson
                    </p>
                  </div>

                ) : filteredProblems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted/70 flex items-center justify-center mb-4">
                      <FilterX className="h-5 w-5 text-muted-foreground/45" />
                    </div>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      No problems match your filters
                    </p>
                    <button
                      onClick={() => { setSearchQuery(""); setDifficultyFilter(null); setSolvedFilter(null); }}
                      className="mt-3 text-[12px] font-medium text-primary/70 hover:text-primary underline underline-offset-2 transition-colors"
                    >
                      Clear all filters
                    </button>
                  </div>

                ) : (
                  /* Card container */
                  <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-[0_1px_2px_hsl(220_20%_15%/0.06),0_4px_16px_hsl(220_20%_15%/0.06)]">

                    {/* Card header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60 bg-card">
                      <span className="w-[3px] h-[18px] rounded-full bg-primary flex-shrink-0" />
                      <h3 className="flex-1 min-w-0 text-[14px] font-semibold tracking-[-0.01em] text-foreground truncate">
                        {selectedLesson.title}
                      </h3>
                      <span className="text-[11.5px] font-medium tabular-nums text-muted-foreground/60 flex-shrink-0">
                        {filteredProblems.length} problem{filteredProblems.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Sub-topic sections */}
                    {Array.from(filteredGrouped.entries()).map(([subTopic, probs], sectionIdx) => (
                      <div key={subTopic}>
                        {/* Sub-topic label */}
                        <div className={cn(
                          "px-5 py-2 bg-muted/40",
                          sectionIdx > 0 && "border-t border-border/50",
                        )}>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/65">
                            {subTopic}
                          </span>
                        </div>

                        {/* Problem rows */}
                        <div className="divide-y divide-border/40">
                          {probs.map((problem) => (
                            skillSlug ? (
                              <ProblemRow key={problem.id} problem={problem} skillSlug={skillSlug} />
                            ) : null
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </main>
    </div>
  );
}

export default PracticeFocusMode;
