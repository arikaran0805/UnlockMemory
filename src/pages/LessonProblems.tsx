 import { useState, useMemo } from "react";
 import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, CheckCircle, Circle } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Skeleton } from "@/components/ui/skeleton";
 import { Toggle } from "@/components/ui/toggle";
 import { ProblemFilters } from "@/components/practice/ProblemFilters";
 import { useProblemBookmarks } from "@/hooks/useProblemBookmarks";
 import { useLearnerProgress } from "@/hooks/useLearnerProblemProgress";
 import { useAuth } from "@/contexts/AuthContext";
 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
import { cn } from "@/lib/utils";
 
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
   subTopicId?: string;
   problemType?: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong";
  }
 
 export default function LessonProblems() {
   const { skillId, lessonId } = useParams<{ skillId: string; lessonId: string }>();
   const navigate = useNavigate();
   
   const [difficulty, setDifficulty] = useState<DifficultyFilter>('all');
   const [status, setStatus] = useState<StatusFilter>('all');
   const [search, setSearch] = useState('');
   const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
   
   const { isBookmarked, isAuthenticated } = useProblemBookmarks();
   const { user } = useAuth();
   const { data: progressData } = useLearnerProgress(user?.id);
 
   // Create a lookup set for solved problems
   const solvedProblems = useMemo(() => {
     return new Set(
       (progressData || [])
         .filter((p) => p.status === "solved")
         .map((p) => p.problem_id)
     );
   }, [progressData]);
 
   // Fetch lesson info
   const { data: lesson, isLoading: lessonLoading } = useQuery({
     queryKey: ["course-lesson", lessonId],
     queryFn: async () => {
       if (!lessonId) return null;
       const { data, error } = await supabase
         .from("course_lessons")
         .select("id, title, course_id")
         .eq("id", lessonId)
         .single();
       if (error) return null;
       return data;
     },
     enabled: !!lessonId,
   });
 
   // Fetch skill info for navigation
   const { data: skill } = useQuery({
     queryKey: ["skill-by-slug", skillId],
     queryFn: async () => {
       if (!skillId) return null;
       const { data, error } = await supabase
         .from("practice_skills")
         .select("id, slug, name")
         .eq("slug", skillId)
         .single();
       if (error) return null;
       return data;
     },
     enabled: !!skillId,
   });
 
    // Fetch problems for this specific lesson
    const { data: problems, isLoading: problemsLoading } = useQuery({
      queryKey: ["lesson-problems", skillId, lessonId],
      queryFn: async () => {
        if (!skillId || !lessonId) return [];
        
        // First get skill by slug
        const { data: skillData } = await supabase
          .from("practice_skills")
          .select("id")
          .eq("slug", skillId)
          .single();
        
        if (!skillData) return [];
  
        // Get sub-topics for this lesson
        const { data: subTopics } = await supabase
          .from("sub_topics")
          .select("id, title")
          .eq("skill_id", skillData.id)
          .eq("lesson_id", lessonId)
          .order("display_order", { ascending: true });
  
        if (!subTopics || subTopics.length === 0) return [];
  
        const subTopicIds = subTopics.map(st => st.id);
  
        // Get regular problem mappings
        const { data: mappings } = await supabase
          .from("problem_mappings")
          .select(`
            problem_id,
            sub_topic_id,
            display_order,
            practice_problems (
              id, title, slug, difficulty, is_premium, solution, status
            )
          `)
          .in("sub_topic_id", subTopicIds)
          .order("display_order", { ascending: true });

        // Get predict output mappings
        const { data: predictMappings } = await supabase
          .from("predict_output_mappings")
          .select(`
            predict_output_problem_id,
            sub_topic_id,
            display_order,
            predict_output_problems (
              id, title, slug, difficulty, is_premium, status, language
            )
          `)
          .in("sub_topic_id", subTopicIds)
          .order("display_order", { ascending: true });

         // Get fix error mappings
         const { data: fixErrorMappings } = await supabase
           .from("fix_error_mappings")
           .select(`
             fix_error_problem_id,
             sub_topic_id,
             display_order,
             fix_error_problems (
               id, title, slug, difficulty, is_premium, status, language
             )
           `)
           .in("sub_topic_id", subTopicIds)
           .order("display_order", { ascending: true });

         // Get eliminate wrong mappings
         const { data: eliminateWrongMappings } = await supabase
           .from("eliminate_wrong_mappings")
           .select(`
             eliminate_wrong_problem_id,
             sub_topic_id,
             display_order,
             eliminate_wrong_problems (
               id, title, slug, difficulty, is_premium, status, language
             )
           `)
           .in("sub_topic_id", subTopicIds)
           .order("display_order", { ascending: true });
  
        // Build sub-topic title lookup
        const subTopicMap = new Map(subTopics.map(st => [st.id, { title: st.title, id: st.id }]));
  
        const results: any[] = [];

        // Add regular problems
        if (mappings) {
          mappings
            .filter((m: any) => m.practice_problems?.status === "published")
            .forEach((m: any) => {
              results.push({
                ...m.practice_problems,
                subTopicTitle: subTopicMap.get(m.sub_topic_id)?.title || "General",
                subTopicId: m.sub_topic_id,
                problemType: "problem-solving",
                displayOrder: m.display_order,
              });
            });
        }

        // Add predict output problems
        if (predictMappings) {
          predictMappings
            .filter((m: any) => m.predict_output_problems?.status === "published")
            .forEach((m: any) => {
              results.push({
                ...m.predict_output_problems,
                subTopicTitle: subTopicMap.get(m.sub_topic_id)?.title || "General",
                subTopicId: m.sub_topic_id,
                problemType: "predict-output",
                displayOrder: m.display_order,
              });
            });
        }

        // Add fix error problems
        if (fixErrorMappings) {
          fixErrorMappings
            .filter((m: any) => m.fix_error_problems?.status === "published")
            .forEach((m: any) => {
              results.push({
                ...m.fix_error_problems,
                subTopicTitle: subTopicMap.get(m.sub_topic_id)?.title || "General",
                subTopicId: m.sub_topic_id,
                problemType: "fix-error",
                displayOrder: m.display_order,
              });
            });
        }

        // Add eliminate wrong problems
        if (eliminateWrongMappings) {
          eliminateWrongMappings
            .filter((m: any) => m.eliminate_wrong_problems?.status === "published")
            .forEach((m: any) => {
              results.push({
                ...m.eliminate_wrong_problems,
                subTopicTitle: subTopicMap.get(m.sub_topic_id)?.title || "General",
                subTopicId: m.sub_topic_id,
                problemType: "eliminate-wrong",
                displayOrder: m.display_order,
              });
            });
        }

        return results;
      },
      enabled: !!skillId && !!lessonId,
    });
 
    // Convert to display format
    const displayProblems: DisplayProblem[] = useMemo(() => {
      if (!problems) return [];
      return problems.map((p: any) => ({
        id: p.id,
        title: p.title,
        difficulty: p.difficulty,
        solved: solvedProblems.has(p.id),
        locked: p.is_premium,
        subTopic: p.subTopicTitle || "General",
        hasSolution: !!p.solution,
        slug: p.slug,
       subTopicId: p.subTopicId,
       problemType: p.problemType,
      }));
    }, [problems, solvedProblems]);
 
   // Filter problems
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
 
  // Group problems by sub-topic
  const groupedBySubTopic = useMemo(() => {
    const groups: Record<string, DisplayProblem[]> = {};
    filteredProblems.forEach((p) => {
      const key = p.subTopic;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(p);
    });
    return groups;
  }, [filteredProblems]);

  const difficultyColors: Record<string, string> = {
    Easy: "text-green-500",
    Medium: "text-yellow-500",
    Hard: "text-red-500",
  };

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
 
   const isLoading = lessonLoading || problemsLoading;
 
   return (
     <div className="min-h-screen bg-background">
       <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
         {/* Back Button */}
         <Button
           variant="ghost"
           size="sm"
           onClick={() => navigate(-1)}
           className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
         >
           <ArrowLeft className="h-4 w-4 mr-2" />
           Back
         </Button>
 
         {/* Header - Shows Lesson Name */}
         <div className="mb-6">
           {isLoading ? (
             <>
               <Skeleton className="h-8 w-48 mb-2" />
               <Skeleton className="h-4 w-64" />
             </>
           ) : (
             <>
               <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                 {lesson?.title || "Practice Problems"}
               </h1>
               <p className="text-muted-foreground">
                 {displayProblems.length} problem{displayProblems.length !== 1 ? 's' : ''} to practice
               </p>
             </>
           )}
         </div>
 
         {/* Filters */}
         <div className="flex items-center gap-3">
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
               className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
             >
               <Bookmark className={`h-4 w-4 ${showBookmarkedOnly ? 'fill-current' : ''}`} />
             </Toggle>
           )}
         </div>
 
         {/* Problem List */}
         <div className="mt-6">
           {isLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
           ) : filteredProblems.length > 0 ? (
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
              {/* Card Header - Lesson Title */}
              <div className="px-5 py-4 bg-muted/40 border-b border-border/50">
                <h2 className="text-base font-semibold text-foreground">
                  {lesson?.title || "Practice Problems"}
                </h2>
              </div>

              {/* Sub-Topics and Problems */}
              <div className="divide-y divide-border/30">
                {Object.entries(groupedBySubTopic).map(([subTopicTitle, subTopicProblems]) => (
                  <div key={subTopicTitle}>
                    {/* Sub-Topic Header - only show if multiple sub-topics or different from lesson */}
                    {(Object.keys(groupedBySubTopic).length > 1 || subTopicTitle !== lesson?.title) && (
                      <div className="px-5 py-2.5 bg-muted/20 border-b border-border/30">
                        <span className="text-sm text-muted-foreground">{subTopicTitle}</span>
                      </div>
                    )}

                    {/* Problems in this Sub-Topic */}
                    <div className="divide-y divide-border/20">
                      {subTopicProblems.map((problem) => (
                        <button
                          key={problem.id}
                          onClick={() => handleProblemClick(problem)}
                          className={cn(
                            "w-full flex items-center justify-between px-5 py-3.5",
                            "hover:bg-muted/30 transition-colors duration-150",
                            "text-left"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {problem.solved ? (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-foreground">
                              {problem.title}
                            </span>
                          </div>
                          <span className={cn("text-sm font-medium", difficultyColors[problem.difficulty])}>
                            {problem.difficulty}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
             </div>
           ) : displayProblems.length > 0 ? (
             <div className="text-center py-12 text-muted-foreground">
               <p>No problems match your filters.</p>
               <Button
                 variant="link"
                 onClick={() => {
                   setDifficulty('all');
                   setStatus('all');
                   setSearch('');
                   setShowBookmarkedOnly(false);
                 }}
                 className="mt-2"
               >
                 Clear filters
               </Button>
             </div>
           ) : (
             <div className="text-center py-12 text-muted-foreground">
               <p>No problems available for this lesson yet.</p>
             </div>
           )}
         </div>
       </div>
     </div>
   );
 }