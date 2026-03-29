import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, ArrowLeft, BookOpen, AlertCircle, Eye, Code2, GripVertical, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import UMLoader from "@/components/UMLoader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import { usePracticeProblems } from "@/hooks/usePracticeProblems";
import { useSubTopicsBySkill, SubTopic } from "@/hooks/useSubTopics";
import { useCreateProblemMapping, useAllGlobalProblems, useDeleteProblemMapping } from "@/hooks/useProblemMappings";
import { usePredictOutputProblems } from "@/hooks/usePredictOutputProblems";
import { usePredictOutputMappingsBySkill, useCreatePredictOutputMapping, useDeletePredictOutputMapping } from "@/hooks/usePredictOutputMappings";
import { useFixErrorProblems } from "@/hooks/useFixErrorProblems";
import { useFixErrorMappingsBySkill, useCreateFixErrorMapping, useDeleteFixErrorMapping } from "@/hooks/useFixErrorMappings";
import { useEliminateWrongProblems } from "@/hooks/useEliminateWrongProblems";
import { useEliminateWrongMappingsBySkill, useCreateEliminateWrongMapping, useDeleteEliminateWrongMapping } from "@/hooks/useEliminateWrongMappings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LessonProblemsSection } from "@/components/admin/practice/LessonProblemsSection";
import { AddProblemDialog, AddProblemDialogProblem } from "@/components/admin/practice/AddProblemDialog";
import { ProblemTypeSelectDialog } from "@/components/admin/practice/ProblemTypeSelectDialog";

interface CourseLesson {
  id: string;
  title: string;
  course_id: string;
  lesson_order: number;
}

export default function AdminPracticeProblems() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const { data: skill, isLoading: skillLoading } = usePracticeSkill(skillId);
  const { data: skillProblems, isLoading: problemsLoading } = usePracticeProblems(skillId);
  const { data: allGlobalProblems, isLoading: globalProblemsLoading } = useAllGlobalProblems();
  const { data: subTopics, isLoading: subTopicsLoading } = useSubTopicsBySkill(skillId);
  
  const [addProblemSubTopicId, setAddProblemSubTopicId] = useState<string | null>(null);
  const [showTypeSelect, setShowTypeSelect] = useState(false);
  const [showTypeSelectForCreate, setShowTypeSelectForCreate] = useState(false);
  const [isStandaloneOpen, setIsStandaloneOpen] = useState(true);
  
  const createMapping = useCreateProblemMapping();
  const deleteMapping = useDeleteProblemMapping();
  const createPredictMapping = useCreatePredictOutputMapping();
  const deletePredictMapping = useDeletePredictOutputMapping();
  const createFixErrorMapping = useCreateFixErrorMapping();
  const deleteFixErrorMapping = useDeleteFixErrorMapping();
  const createEliminateWrongMapping = useCreateEliminateWrongMapping();
  const deleteEliminateWrongMapping = useDeleteEliminateWrongMapping();

  // Fetch problems for this skill (all types)
  const { data: predictProblems, isLoading: predictLoading } = usePredictOutputProblems(skillId);
  const { data: fixErrorProblems, isLoading: fixErrorLoading } = useFixErrorProblems(skillId);
  const { data: eliminateWrongProblems, isLoading: eliminateWrongLoading } = useEliminateWrongProblems(skillId);

  // Fetch lessons for the linked course
  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["course-lessons", skill?.course_id],
    queryFn: async () => {
      if (!skill?.course_id) return [];
      const { data, error } = await supabase
        .from("course_lessons")
        .select("id, title, course_id, lesson_order")
        .eq("course_id", skill.course_id)
        .is("deleted_at", null)
        .order("lesson_rank", { ascending: true });
      if (error) throw error;
      return data as CourseLesson[];
    },
    enabled: !!skill?.course_id,
  });

  // Sub-topic IDs for fetching mappings
  const subTopicIds = useMemo(() => (subTopics || []).map(st => st.id), [subTopics]);

  // Fetch all problem mappings for this skill's sub-topics
  const { data: mappings } = useQuery({
    queryKey: ["problem-mappings-by-skill", skillId],
    queryFn: async () => {
      if (!skillId || !subTopics) return [];
      const ids = subTopics.map(st => st.id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("problem_mappings")
        .select("*, practice_problems(*)")
        .in("sub_topic_id", ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!skillId && !!subTopics && subTopics.length > 0,
  });

  // Fetch type-specific mappings
  const { data: predictMappings } = usePredictOutputMappingsBySkill(skillId, subTopicIds);
  const { data: fixErrorMappings } = useFixErrorMappingsBySkill(skillId, subTopicIds);
  const { data: eliminateWrongMappings } = useEliminateWrongMappingsBySkill(skillId, subTopicIds);

  // Group sub-topics by lesson
  const subTopicsByLesson = useMemo(() => {
    if (!subTopics) return {};
    return subTopics.reduce((acc, st) => {
      if (!acc[st.lesson_id]) acc[st.lesson_id] = [];
      acc[st.lesson_id].push(st);
      return acc;
    }, {} as Record<string, SubTopic[]>);
  }, [subTopics]);

  // Group problems by sub-topic (from mappings) - unified with all types
  const problemsBySubTopic = useMemo(() => {
    const result: Record<string, any[]> = {};
    // Regular problem mappings
    if (mappings) {
      for (const m of mappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        if (m.practice_problems) {
          result[m.sub_topic_id].push({
            ...m.practice_problems,
            problemType: "problem-solving",
          });
        }
      }
    }
    // Predict output mappings
    if (predictMappings) {
      for (const m of predictMappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        if ((m as any).predict_output_problems) {
          result[m.sub_topic_id].push({
            ...(m as any).predict_output_problems,
            problemType: "predict-output",
          });
        }
      }
    }
    // Fix error mappings
    if (fixErrorMappings) {
      for (const m of fixErrorMappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        if ((m as any).fix_error_problems) {
          result[m.sub_topic_id].push({
            ...(m as any).fix_error_problems,
            problemType: "fix-error",
          });
        }
      }
    }
    // Eliminate wrong mappings
    if (eliminateWrongMappings) {
      for (const m of eliminateWrongMappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        if ((m as any).eliminate_wrong_problems) {
          result[m.sub_topic_id].push({
            ...(m as any).eliminate_wrong_problems,
            problemType: "eliminate-wrong",
          });
        }
      }
    }
    return result;
  }, [mappings, predictMappings, fixErrorMappings, eliminateWrongMappings]);

  // Group mappings by sub-topic for unlink functionality
  const mappingsBySubTopic = useMemo(() => {
    const result: Record<string, { id: string; problem_id: string; problemType: string }[]> = {};
    if (mappings) {
      for (const m of mappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        result[m.sub_topic_id].push({ id: m.id, problem_id: m.problem_id, problemType: "problem-solving" });
      }
    }
    if (predictMappings) {
      for (const m of predictMappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        result[m.sub_topic_id].push({
          id: m.id,
          problem_id: m.predict_output_problem_id,
          problemType: "predict-output",
        });
      }
    }
    if (fixErrorMappings) {
      for (const m of fixErrorMappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        result[m.sub_topic_id].push({
          id: m.id,
          problem_id: m.fix_error_problem_id,
          problemType: "fix-error",
        });
      }
    }
    if (eliminateWrongMappings) {
      for (const m of eliminateWrongMappings) {
        if (!result[m.sub_topic_id]) result[m.sub_topic_id] = [];
        result[m.sub_topic_id].push({
          id: m.id,
          problem_id: m.eliminate_wrong_problem_id,
          problemType: "eliminate-wrong",
        });
      }
    }
    return result;
  }, [mappings, predictMappings, fixErrorMappings, eliminateWrongMappings]);

  // Build combined problem list for AddProblemDialog
  const allDialogProblems = useMemo<AddProblemDialogProblem[]>(() => {
    const items: AddProblemDialogProblem[] = [];
    if (allGlobalProblems) {
      for (const p of allGlobalProblems) {
        items.push({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          status: p.status,
          sub_topic: p.sub_topic,
          problemType: "problem-solving",
        });
      }
    }
    if (predictProblems) {
      for (const p of predictProblems) {
        items.push({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          status: p.status,
          language: p.language,
          problemType: "predict-output",
        });
      }
    }
    if (fixErrorProblems) {
      for (const p of fixErrorProblems) {
        items.push({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          status: p.status,
          language: p.language,
          problemType: "fix-error",
        });
      }
    }
    if (eliminateWrongProblems) {
      for (const p of eliminateWrongProblems) {
        items.push({
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          status: p.status,
          language: p.language,
          problemType: "eliminate-wrong",
        });
      }
    }
    return items;
  }, [allGlobalProblems, predictProblems, fixErrorProblems, eliminateWrongProblems]);

  // Get mapped problem IDs for the add dialog (combining all types)
  const mappedProblemIds = useMemo(() => {
    if (!addProblemSubTopicId) return new Set<string>();
    const ids = new Set<string>();
    if (mappings) {
      mappings
        .filter(m => m.sub_topic_id === addProblemSubTopicId)
        .forEach(m => ids.add(m.problem_id));
    }
    if (predictMappings) {
      predictMappings
        .filter(m => m.sub_topic_id === addProblemSubTopicId)
        .forEach(m => ids.add(m.predict_output_problem_id));
    }
    if (fixErrorMappings) {
      fixErrorMappings
        .filter(m => m.sub_topic_id === addProblemSubTopicId)
        .forEach(m => ids.add(m.fix_error_problem_id));
    }
    if (eliminateWrongMappings) {
      eliminateWrongMappings
        .filter(m => m.sub_topic_id === addProblemSubTopicId)
        .forEach(m => ids.add(m.eliminate_wrong_problem_id));
    }
    return ids;
  }, [mappings, predictMappings, fixErrorMappings, eliminateWrongMappings, addProblemSubTopicId]);

  const handleProblemClick = (problemId: string, problemType?: string) => {
    if (problemType === "predict-output") {
      navigate(`/admin/practice/skills/${skillId}/predict-output/${problemId}`);
    } else if (problemType === "fix-error") {
      navigate(`/admin/practice/skills/${skillId}/fix-error/${problemId}`);
    } else if (problemType === "eliminate-wrong") {
      navigate(`/admin/practice/skills/${skillId}/eliminate-wrong/${problemId}`);
    } else {
      navigate(`/admin/practice/skills/${skillId}/problems/${problemId}`);
    }
  };

  const handleAddProblems = async (selections: { id: string; problemType: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong" }[]) => {
    if (!addProblemSubTopicId) return;
    for (const sel of selections) {
      if (sel.problemType === "predict-output") {
        await createPredictMapping.mutateAsync({
          predict_output_problem_id: sel.id,
          sub_topic_id: addProblemSubTopicId,
        });
      } else if (sel.problemType === "fix-error") {
        await createFixErrorMapping.mutateAsync({
          fix_error_problem_id: sel.id,
          sub_topic_id: addProblemSubTopicId,
        });
      } else if (sel.problemType === "eliminate-wrong") {
        await createEliminateWrongMapping.mutateAsync({
          eliminate_wrong_problem_id: sel.id,
          sub_topic_id: addProblemSubTopicId,
        });
      } else {
        await createMapping.mutateAsync({
          problem_id: sel.id,
          sub_topic_id: addProblemSubTopicId,
        });
      }
    }
    setAddProblemSubTopicId(null);
  };

  const handleUnlinkProblem = async (mappingId: string, subTopicId: string, problemId: string, problemType?: string) => {
    if (problemType === "predict-output") {
      await deletePredictMapping.mutateAsync({ id: mappingId, subTopicId, problemId });
    } else if (problemType === "fix-error") {
      await deleteFixErrorMapping.mutateAsync({ id: mappingId, subTopicId, problemId });
    } else if (problemType === "eliminate-wrong") {
      await deleteEliminateWrongMapping.mutateAsync({ id: mappingId, subTopicId, problemId });
    } else {
      await deleteMapping.mutateAsync({ id: mappingId, subTopicId, problemId });
    }
  };

  const isLoading = skillLoading || problemsLoading || lessonsLoading || subTopicsLoading || predictLoading || fixErrorLoading || eliminateWrongLoading;
  const hasLinkedCourse = !!skill?.course_id;

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/practice/skills")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {skill?.name || "Loading..."} Problems
            </h1>
            <p className="text-muted-foreground">
              Manage problems organized by lessons and sub-topics
            </p>
          </div>
        </div>
        <Button onClick={() => setShowTypeSelect(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Problem
        </Button>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">

      {/* Main Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <UMLoader size={44} label="Unlocking memory…" />
        </div>
      ) : !hasLinkedCourse ? (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This skill is not linked to a course. Problems can still be created but won't be organized by lessons.
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => setShowTypeSelect(true)}
              >
                Create a standalone problem
              </Button>
            </AlertDescription>
          </Alert>
          
          {/* Show standalone problems - matching course-linked style */}
          {skillProblems && skillProblems.length > 0 ? (
            <Collapsible open={isStandaloneOpen} onOpenChange={setIsStandaloneOpen}>
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                {/* Header - matching LessonProblemsSection style */}
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                    <div className="flex items-center gap-3">
                      {isStandaloneOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">Problems</span>
                      <Badge variant="secondary" className="text-xs">
                        {skillProblems.length} problems
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTypeSelect(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Problem
                    </Button>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  {/* Problem rows - matching SortableProblemRow style */}
                  <div className="divide-y divide-border/50">
                    {skillProblems.map((problem) => (
                      <div
                        key={problem.id}
                        onClick={() => handleProblemClick(problem.id)}
                        className="flex items-center gap-2 px-4 py-2.5 pl-10 hover:bg-muted/30 cursor-pointer transition-colors group bg-background"
                      >
                        <button className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:text-muted-foreground touch-none">
                          <GripVertical className="h-3.5 w-3.5" />
                        </button>
                        <Code2 className="h-4 w-4 text-primary/70 shrink-0" />
                        <span className="flex-1 text-sm">{problem.title}</span>
                        <Badge className={`text-xs ${
                          problem.difficulty === "Easy" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                          problem.difficulty === "Medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                          "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {problem.difficulty}
                        </Badge>
                        <Badge variant={problem.status === "published" ? "default" : "secondary"} className="text-xs">
                          {problem.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Problems Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first problem for this custom collection.
                </p>
                <Button onClick={() => setShowTypeSelect(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Problem
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : lessons && lessons.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Lessons Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create lessons in the course editor to organize problems.
            </p>
            <Button variant="outline" onClick={() => navigate(`/admin/courses`)}>
              Go to Courses
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lessons?.map((lesson) => (
            <LessonProblemsSection
              key={lesson.id}
              lesson={lesson}
              skillId={skillId!}
              subTopics={subTopicsByLesson[lesson.id] || []}
              problemsBySubTopic={problemsBySubTopic}
              mappingsBySubTopic={mappingsBySubTopic}
              onProblemClick={handleProblemClick}
              onAddProblem={(subTopicId) => setAddProblemSubTopicId(subTopicId)}
              onUnlinkProblem={handleUnlinkProblem}
            />
          ))}
        </div>
      )}

      {/* Add Problem Dialog */}
      <AddProblemDialog
        open={!!addProblemSubTopicId}
        onOpenChange={(open) => !open && setAddProblemSubTopicId(null)}
        allProblems={allDialogProblems}
        mappedProblemIds={mappedProblemIds}
        onAddProblems={handleAddProblems}
        onCreateNew={() => {
          setAddProblemSubTopicId(null);
          setShowTypeSelectForCreate(true);
        }}
      />

      {/* Problem Type Select Dialog - from header */}
      <ProblemTypeSelectDialog
        open={showTypeSelect}
        onOpenChange={setShowTypeSelect}
        onSelectProblemSolving={() => navigate(`/admin/practice/skills/${skillId}/problems/new`)}
        onSelectPredictOutput={() => navigate(`/admin/practice/skills/${skillId}/predict-output/new`)}
        onSelectFixError={() => navigate(`/admin/practice/skills/${skillId}/fix-error/new`)}
        onSelectEliminateWrong={() => navigate(`/admin/practice/skills/${skillId}/eliminate-wrong/new`)}
      />

      {/* Problem Type Select Dialog - from "Create New" in add dialog */}
      <ProblemTypeSelectDialog
        open={showTypeSelectForCreate}
        onOpenChange={setShowTypeSelectForCreate}
        onSelectProblemSolving={() => navigate(`/admin/practice/skills/${skillId}/problems/new`)}
        onSelectPredictOutput={() => navigate(`/admin/practice/skills/${skillId}/predict-output/new`)}
        onSelectFixError={() => navigate(`/admin/practice/skills/${skillId}/fix-error/new`)}
        onSelectEliminateWrong={() => navigate(`/admin/practice/skills/${skillId}/eliminate-wrong/new`)}
      />
      </div>
    </div>
  );
}
