import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, CheckCircle2, ChevronLeft } from "lucide-react";
import UMLoader from "@/components/UMLoader";
import { Toggle } from "@/components/ui/toggle";
import { ProblemFilters } from "@/components/practice/ProblemFilters";
import { LessonProblemSection } from "@/components/practice/LessonProblemSection";
import { usePublishedPracticeProblems, ProblemWithMapping } from "@/hooks/usePracticeProblems";
import { useProblemBookmarks } from "@/hooks/useProblemBookmarks";
import { useLearnerProgress } from "@/hooks/useLearnerProblemProgress";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DifficultyFilter = 'all' | 'Easy' | 'Medium' | 'Hard';
type StatusFilter = 'all' | 'solved' | 'unsolved';

interface DisplayProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  solved: boolean;
  locked: boolean;
  subTopic: string;
  hasSolution: boolean;
  slug: string;
  lessonId?: string;
  lessonTitle?: string;
  subTopicId?: string;
  subTopicTitle?: string;
  problemType?: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong";
}

export default function SkillProblems() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();

  const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  const { isBookmarked, isAuthenticated } = useProblemBookmarks();
  const { user } = useAuth();
  const { data: progressData } = useLearnerProgress(user?.id);

  const solvedProblems = useMemo(() => {
    return new Set(
      (progressData || [])
        .filter((p) => p.status === "solved")
        .map((p) => p.problem_id)
    );
  }, [progressData]);

  const { data: skill, isLoading: skillLoading } = useQuery({
    queryKey: ["skill-by-slug", skillId],
    queryFn: async () => {
      if (!skillId) return null;
      const { data, error } = await supabase
        .from("practice_skills")
        .select("*")
        .eq("slug", skillId)
        .eq("status", "published")
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!skillId,
  });

  const { data: problems, isLoading: problemsLoading } = usePublishedPracticeProblems(skillId);

  const displayProblems: DisplayProblem[] = useMemo(() => {
    if (!problems) return [];
    return problems.map((p: ProblemWithMapping) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      solved: solvedProblems.has(p.id),
      locked: p.is_premium,
      subTopic: p.sub_topic,
      hasSolution: !!p.solution,
      slug: p.slug,
      lessonId: p.lesson_id,
      lessonTitle: p.lesson_title,
      subTopicId: p.sub_topic_id,
      subTopicTitle: p.sub_topic_title,
      problemType: p.problemType,
    }));
  }, [problems, solvedProblems]);

  const filteredProblems = useMemo(() => {
    return displayProblems.filter((p) => {
      if (difficulty !== 'all' && p.difficulty !== difficulty) return false;
      if (status === 'solved' && !p.solved) return false;
      if (status === 'unsolved' && p.solved) return false;
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (showBookmarkedOnly && !isBookmarked(p.id)) return false;
      return true;
    });
  }, [displayProblems, difficulty, status, search, showBookmarkedOnly, isBookmarked]);

  const groupedByLesson = useMemo(() => {
    const lessons: Record<string, {
      lessonId?: string;
      lessonTitle: string;
      subTopics: Record<string, DisplayProblem[]>;
    }> = {};

    filteredProblems.forEach((p) => {
      const lessonKey = p.lessonId || p.lessonTitle || "General";
      const subTopicKey = p.subTopicTitle || p.subTopic || "Uncategorized";

      if (!lessons[lessonKey]) {
        lessons[lessonKey] = {
          lessonId: p.lessonId,
          lessonTitle: p.lessonTitle || "General",
          subTopics: {},
        };
      }

      if (!lessons[lessonKey].subTopics[subTopicKey]) {
        lessons[lessonKey].subTopics[subTopicKey] = [];
      }

      lessons[lessonKey].subTopics[subTopicKey].push(p);
    });

    return lessons;
  }, [filteredProblems]);

  const handleProblemClick = (problem: DisplayProblem) => {
    if (problem.locked) {
      toast.info("This is a premium problem. Upgrade to unlock!", {
        description: "Get access to all problems and solutions.",
      });
      return;
    }
    if (problem.problemType === "predict-output") {
      navigate(`/practice/${skillId}/predict/${problem.slug}`);
    } else if (problem.problemType === "fix-error") {
      navigate(`/practice/${skillId}/fix-error/${problem.slug}`);
    } else if (problem.problemType === "eliminate-wrong") {
      navigate(`/practice/${skillId}/eliminate/${problem.slug}`);
    } else {
      navigate(`/practice/${skillId}/problem/${problem.slug}`);
    }
  };

  const isLoading = skillLoading || problemsLoading;
  const totalCount = displayProblems.length;
  const solvedCount = displayProblems.filter((p) => p.solved).length;
  const solvedPct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

        {/* Back button — premium pill */}
        <button
          onClick={() => navigate('/profile?tab=practice')}
          className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-muted-foreground hover:text-foreground transition-all duration-150 hover:bg-white hover:shadow-sm border border-transparent hover:border-border/40 -ml-1 mb-7"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
          Back to Practice
        </button>

        {/* ── Skill Hero Header ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <UMLoader size={48} dark label={null} />
            <p className="text-[11px] text-muted-foreground tracking-[0.06em] uppercase">Loading skill</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-border/50 overflow-hidden mb-6 shadow-sm">
              <div className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Eyebrow */}
                    <p className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-primary/70 mb-1.5">
                      Practice Skill
                    </p>
                    <h1
                      className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-foreground mb-1.5"
                    >
                      {skill?.name || "Skill"}
                    </h1>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {skill?.description || "Practice problems for this skill"}
                    </p>
                  </div>

                  {/* Stat pills */}
                  {totalCount > 0 && (
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold"
                          style={{ background: "rgba(34,197,94,0.08)", color: "#15803D" }}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {solvedCount} / {totalCount} Solved
                        </span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="w-28 h-1.5 rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${solvedPct}%`,
                            background: "linear-gradient(90deg, #4CAF82, #22C55E)",
                          }}
                        />
                      </div>
                      <span className="text-[10.5px] text-muted-foreground">{solvedPct}% complete</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-xl border border-border/50 shadow-sm mb-5 px-4">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <ProblemFilters
                    difficulty={difficulty}
                    status={status}
                    search={search}
                    onDifficultyChange={setDifficulty}
                    onStatusChange={setStatus}
                    onSearchChange={setSearch}
                  />
                </div>
                {isAuthenticated && (
                  <Toggle
                    pressed={showBookmarkedOnly}
                    onPressedChange={setShowBookmarkedOnly}
                    aria-label="Show bookmarked only"
                    className="shrink-0 data-[state=on]:bg-primary/10 data-[state=on]:text-primary rounded-lg h-8 w-8"
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${showBookmarkedOnly ? 'fill-current' : ''}`} />
                  </Toggle>
                )}
              </div>
            </div>

            {/* ── Problem list ── */}
            <div className="space-y-4">
              {Object.keys(groupedByLesson).length > 0 ? (
                Object.entries(groupedByLesson).map(([lessonKey, lessonData]) => (
                  <LessonProblemSection
                    key={lessonKey}
                    lessonTitle={lessonData.lessonTitle}
                    subTopics={Object.entries(lessonData.subTopics).map(([title, problems]) => ({
                      title,
                      problems,
                    }))}
                    onProblemClick={handleProblemClick}
                  />
                ))
              ) : filteredProblems.length === 0 && displayProblems.length > 0 ? (
                <div className="bg-white rounded-xl border border-border/50 shadow-sm px-6 py-14 flex flex-col items-center gap-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted-foreground/60" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                  <p className="text-[13.5px] font-medium text-foreground/70">No problems match your filters</p>
                  <button
                    onClick={() => { setDifficulty('all'); setStatus('all'); setSearch(''); setShowBookmarkedOnly(false); }}
                    className="text-[12.5px] font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-border/50 shadow-sm px-6 py-14 flex flex-col items-center gap-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
                    <svg className="w-5 h-5 text-muted-foreground/60" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
                    </svg>
                  </div>
                  <p className="text-[13.5px] font-medium text-foreground/70">No problems available yet</p>
                  <p className="text-[12px] text-muted-foreground max-w-[240px] leading-relaxed">
                    Problems for this skill are being prepared. Check back soon.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
