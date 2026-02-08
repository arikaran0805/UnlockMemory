import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  is_visible: boolean;
}

export interface FunctionParameter {
  id: string;
  name: string;
  type: string;
}

export interface FunctionSignature {
  name: string;
  parameters: FunctionParameter[];
  return_type: string;
}

export interface PracticeProblem {
  id: string;
  skill_id: string;
  title: string;
  slug: string;
  difficulty: "Easy" | "Medium" | "Hard";
  sub_topic: string;
  description: string | null;
  examples: any[];
  constraints: string[];
  hints: string[];
  starter_code: Record<string, string>;
  solution: string | null;
  is_premium: boolean;
  display_order: number;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // LeetCode-critical fields
  test_cases: TestCase[];
  input_format: string;
  output_format: string;
  time_limit: number;
  memory_limit: number;
  supported_languages: string[];
  function_signature: FunctionSignature;
  tags: string[];
}

// Helper to transform DB row to PracticeProblem
function transformProblem(row: any): PracticeProblem {
  return {
    ...row,
    test_cases: (row.test_cases || []) as TestCase[],
    function_signature: (row.function_signature || { name: "solution", parameters: [], return_type: "int" }) as FunctionSignature,
    supported_languages: (row.supported_languages || ["python", "javascript"]) as string[],
    tags: (row.tags || []) as string[],
    constraints: (row.constraints || []) as string[],
    hints: (row.hints || []) as string[],
    examples: (row.examples || []) as any[],
    starter_code: (row.starter_code || {}) as Record<string, string>,
  };
}

export function usePracticeProblems(skillId: string | undefined) {
  return useQuery({
    queryKey: ["practice-problems", skillId],
    queryFn: async () => {
      if (!skillId) return [];

      // Get problems directly linked via skill_id
      const { data: directProblems, error: directError } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skillId)
        .order("display_order", { ascending: true });

      if (directError) throw directError;

      // Get problems mapped to sub-topics that belong to this skill
      const { data: mappedBySkill } = await supabase
        .from("problem_mappings")
        .select(`
          problem_id,
          practice_problems!inner(*),
          sub_topics!inner(skill_id)
        `)
        .eq("sub_topics.skill_id", skillId);

      // Merge and deduplicate
      const allProblems = [...(directProblems || [])];
      const existingIds = new Set(allProblems.map(p => p.id));
      
      if (mappedBySkill) {
        for (const mapping of mappedBySkill) {
          const problem = mapping.practice_problems;
          if (!existingIds.has(problem.id)) {
            allProblems.push(problem);
            existingIds.add(problem.id);
          }
        }
      }

      return allProblems.map(transformProblem);
    },
    enabled: !!skillId,
  });
}

export function usePracticeProblem(id: string | undefined) {
  return useQuery({
    queryKey: ["practice-problem", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return transformProblem(data);
    },
    enabled: !!id,
  });
}

export interface ProblemWithMapping extends PracticeProblem {
  lesson_id?: string;
  lesson_title?: string;
  sub_topic_id?: string;
  sub_topic_title?: string;
  problemType?: "problem-solving" | "predict-output" | "fix-error" | "eliminate-wrong";
}

export function usePublishedPracticeProblems(skillSlug: string | undefined) {
  return useQuery({
    queryKey: ["published-practice-problems", skillSlug],
    queryFn: async () => {
      if (!skillSlug) return [];
      
      // First get the skill by slug
      const { data: skill, error: skillError } = await supabase
        .from("practice_skills")
        .select("id, course_id")
        .eq("slug", skillSlug)
        .eq("status", "published")
        .single();

      if (skillError || !skill) return [];

      // Get sub-topics for this skill with lesson info
      const { data: subTopics } = await supabase
        .from("sub_topics")
        .select(`
          id,
          title,
          lesson_id,
          display_order,
          course_lessons!inner(id, title, lesson_rank, lesson_order)
        `)
        .eq("skill_id", skill.id)
        .order("display_order", { ascending: true });
      
      // Sort sub-topics by lesson_order then by sub-topic display_order
      const sortedSubTopics = (subTopics || []).sort((a, b) => {
        const lessonA = a.course_lessons as any;
        const lessonB = b.course_lessons as any;
        const orderA = lessonA?.lesson_order ?? 0;
        const orderB = lessonB?.lesson_order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.display_order || 0) - (b.display_order || 0);
      });

      // Get problem mappings for these sub-topics
      const subTopicIds = sortedSubTopics.map(st => st.id);
      
      let problemsWithMappings: ProblemWithMapping[] = [];
      
      if (subTopicIds.length > 0) {
        // Fetch regular problem mappings
        const { data: mappings } = await supabase
          .from("problem_mappings")
          .select(`
            problem_id,
            sub_topic_id,
            display_order,
            practice_problems!inner(*)
          `)
          .in("sub_topic_id", subTopicIds)
          .eq("practice_problems.status", "published")
          .order("display_order", { ascending: true });

        // Fetch predict output mappings
        const { data: predictMappings } = await supabase
          .from("predict_output_mappings")
          .select(`
            predict_output_problem_id,
            sub_topic_id,
            display_order,
            predict_output_problems!inner(*)
          `)
          .in("sub_topic_id", subTopicIds)
          .eq("predict_output_problems.status", "published")
          .order("display_order", { ascending: true });

        // Fetch fix error mappings
        const { data: fixErrorMappings } = await supabase
          .from("fix_error_mappings")
          .select(`
            fix_error_problem_id,
            sub_topic_id,
            display_order,
            fix_error_problems!inner(*)
          `)
          .in("sub_topic_id", subTopicIds)
          .eq("fix_error_problems.status", "published")
          .order("display_order", { ascending: true });

        // Fetch eliminate wrong mappings
        const { data: eliminateWrongMappings } = await supabase
          .from("eliminate_wrong_mappings")
          .select(`
            eliminate_wrong_problem_id,
            sub_topic_id,
            display_order,
            eliminate_wrong_problems!inner(*)
          `)
          .in("sub_topic_id", subTopicIds)
          .eq("eliminate_wrong_problems.status", "published")
          .order("display_order", { ascending: true });
        
        if (sortedSubTopics) {
          // Create a map of sub-topic info with lesson order for sorting
          const subTopicMap = new Map(sortedSubTopics.map((st, index) => [st.id, { ...st, sortIndex: index }]));
          
          // Group all mappings by sub-topic
          const problemsBySubTopic = new Map<string, any[]>();
          if (mappings) {
            for (const mapping of mappings) {
              const existing = problemsBySubTopic.get(mapping.sub_topic_id) || [];
              existing.push({ ...mapping, problemType: "problem-solving" as const });
              problemsBySubTopic.set(mapping.sub_topic_id, existing);
            }
          }

          // Group predict output mappings by sub-topic
          if (predictMappings) {
            for (const mapping of predictMappings) {
              const existing = problemsBySubTopic.get(mapping.sub_topic_id) || [];
              existing.push({ ...mapping, problemType: "predict-output" as const });
              problemsBySubTopic.set(mapping.sub_topic_id, existing);
            }
          }

          // Group fix error mappings by sub-topic
          if (fixErrorMappings) {
            for (const mapping of fixErrorMappings) {
              const existing = problemsBySubTopic.get(mapping.sub_topic_id) || [];
              existing.push({ ...mapping, problemType: "fix-error" as const });
              problemsBySubTopic.set(mapping.sub_topic_id, existing);
            }
          }

          // Group eliminate wrong mappings by sub-topic
          if (eliminateWrongMappings) {
            for (const mapping of eliminateWrongMappings) {
              const existing = problemsBySubTopic.get(mapping.sub_topic_id) || [];
              existing.push({ ...mapping, problemType: "eliminate-wrong" as const });
              problemsBySubTopic.set(mapping.sub_topic_id, existing);
            }
          }
          
          // Iterate through sorted sub-topics to maintain lesson order
          for (const subTopic of sortedSubTopics) {
            const subTopicMappings = problemsBySubTopic.get(subTopic.id) || [];
            const lesson = subTopic.course_lessons as any;
            
            // Sort by display_order within sub-topic
            subTopicMappings.sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
            
            for (const mapping of subTopicMappings) {
              if (mapping.problemType === "predict-output") {
                const predictProblem = mapping.predict_output_problems;
                problemsWithMappings.push({
                  ...transformProblem({
                    ...predictProblem,
                    sub_topic: "",
                    description: predictProblem.prompt || "",
                    examples: [],
                    constraints: [],
                    starter_code: {},
                    is_premium: predictProblem.is_premium || false,
                    test_cases: [],
                    input_format: "",
                    output_format: "",
                    time_limit: 0,
                    memory_limit: 0,
                    supported_languages: [predictProblem.language],
                    function_signature: { name: "solution", parameters: [], return_type: "str" },
                  }),
                  lesson_id: subTopic.lesson_id,
                  lesson_title: lesson?.title || "General",
                  sub_topic_id: subTopic.id,
                  sub_topic_title: subTopic.title,
                  problemType: "predict-output",
                });
              } else if (mapping.problemType === "fix-error") {
                const fixProblem = mapping.fix_error_problems;
                problemsWithMappings.push({
                  ...transformProblem({
                    ...fixProblem,
                    sub_topic: "",
                    description: fixProblem.description || "",
                    examples: [],
                    constraints: [],
                    starter_code: {},
                    is_premium: fixProblem.is_premium || false,
                    test_cases: [],
                    input_format: "",
                    output_format: "",
                    time_limit: 0,
                    memory_limit: 0,
                    supported_languages: [fixProblem.language],
                    function_signature: { name: "solution", parameters: [], return_type: "str" },
                  }),
                  lesson_id: subTopic.lesson_id,
                  lesson_title: lesson?.title || "General",
                  sub_topic_id: subTopic.id,
                  sub_topic_title: subTopic.title,
                  problemType: "fix-error",
                });
              } else if (mapping.problemType === "eliminate-wrong") {
                const ewProblem = mapping.eliminate_wrong_problems;
                problemsWithMappings.push({
                  ...transformProblem({
                    ...ewProblem,
                    sub_topic: "",
                    description: ewProblem.description || "",
                    examples: [],
                    constraints: [],
                    starter_code: {},
                    is_premium: ewProblem.is_premium || false,
                    test_cases: [],
                    input_format: "",
                    output_format: "",
                    time_limit: 0,
                    memory_limit: 0,
                    supported_languages: [ewProblem.language],
                    function_signature: { name: "solution", parameters: [], return_type: "str" },
                  }),
                  lesson_id: subTopic.lesson_id,
                  lesson_title: lesson?.title || "General",
                  sub_topic_id: subTopic.id,
                  sub_topic_title: subTopic.title,
                  problemType: "eliminate-wrong",
                });
              } else {
                problemsWithMappings.push({
                  ...transformProblem(mapping.practice_problems),
                  lesson_id: subTopic.lesson_id,
                  lesson_title: lesson?.title || "General",
                  sub_topic_id: subTopic.id,
                  sub_topic_title: subTopic.title,
                  problemType: "problem-solving",
                });
              }
            }
          }
        }
      }

      // Also get problems directly linked via skill_id (fallback for unmapped problems)
      const { data: directProblems } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skill.id)
        .eq("status", "published")
        .order("display_order", { ascending: true });

      // Add direct problems that aren't already mapped
      const mappedProblemIds = new Set(problemsWithMappings.map(p => p.id));
      
      if (directProblems) {
        for (const problem of directProblems) {
          if (!mappedProblemIds.has(problem.id)) {
            problemsWithMappings.push({
              ...transformProblem(problem),
              lesson_title: "General",
              sub_topic_title: problem.sub_topic || "Uncategorized",
              problemType: "problem-solving",
            });
          }
        }
      }

      return problemsWithMappings;
    },
    enabled: !!skillSlug,
  });
}

export function usePublishedPracticeProblem(skillSlug: string | undefined, problemSlug: string | undefined) {
  return useQuery({
    queryKey: ["published-practice-problem", skillSlug, problemSlug],
    queryFn: async () => {
      if (!skillSlug || !problemSlug) return null;
      
      // First get the skill by slug
      const { data: skill, error: skillError } = await supabase
        .from("practice_skills")
        .select("id")
        .eq("slug", skillSlug)
        .eq("status", "published")
        .single();

      if (skillError || !skill) return null;

      // Try direct skill_id match first
      const { data: directProblem } = await supabase
        .from("practice_problems")
        .select("*")
        .eq("skill_id", skill.id)
        .eq("slug", problemSlug)
        .eq("status", "published")
        .single();

      if (directProblem) {
        return transformProblem(directProblem);
      }

      // If not found directly, check via problem_mappings (problem linked from another skill)
      const { data: mappedProblem } = await supabase
        .from("problem_mappings")
        .select(`
          practice_problems!inner(*)
        `)
        .eq("practice_problems.slug", problemSlug)
        .eq("practice_problems.status", "published")
        .limit(1)
        .single();

      if (mappedProblem?.practice_problems) {
        return transformProblem(mappedProblem.practice_problems);
      }

      return null;
    },
    enabled: !!skillSlug && !!problemSlug,
  });
}

export function useCreatePracticeProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (problem: {
      skill_id?: string;
      title: string;
      slug: string;
      difficulty: "Easy" | "Medium" | "Hard";
      sub_topic: string;
      description?: string;
      examples?: any[];
      constraints?: string[];
      hints?: string[];
      starter_code?: Record<string, string>;
      solution?: string;
      is_premium?: boolean;
      display_order?: number;
      status?: string;
      // LeetCode-critical fields
      test_cases?: TestCase[];
      input_format?: string;
      output_format?: string;
      time_limit?: number;
      memory_limit?: number;
      supported_languages?: string[];
      function_signature?: FunctionSignature;
      tags?: string[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("practice_problems")
        .insert({
          skill_id: problem.skill_id!,
          title: problem.title,
          slug: problem.slug,
          difficulty: problem.difficulty,
          sub_topic: problem.sub_topic,
          description: problem.description,
          examples: problem.examples || [],
          constraints: problem.constraints || [],
          hints: problem.hints || [],
          starter_code: problem.starter_code || {},
          solution: problem.solution,
          is_premium: problem.is_premium || false,
          display_order: problem.display_order || 0,
          status: problem.status || "draft",
          created_by: userData.user?.id,
          // LeetCode-critical fields
          test_cases: (problem.test_cases || []) as unknown as any,
          input_format: problem.input_format || "",
          output_format: problem.output_format || "",
          time_limit: problem.time_limit || 1000,
          memory_limit: problem.memory_limit || 256,
          supported_languages: problem.supported_languages || ["python", "javascript"],
          function_signature: (problem.function_signature || { name: "solution", parameters: [], return_type: "int" }) as unknown as any,
          tags: problem.tags || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["practice-problems", data.skill_id] });
      toast.success("Problem created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create problem: ${error.message}`);
    },
  });
}

export function useUpdatePracticeProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      title?: string;
      slug?: string;
      difficulty?: "Easy" | "Medium" | "Hard";
      sub_topic?: string;
      description?: string;
      examples?: any[];
      constraints?: string[];
      hints?: string[];
      starter_code?: Record<string, string>;
      solution?: string;
      is_premium?: boolean;
      display_order?: number;
      status?: string;
      test_cases?: TestCase[];
      input_format?: string;
      output_format?: string;
      time_limit?: number;
      memory_limit?: number;
      supported_languages?: string[];
      function_signature?: FunctionSignature;
      tags?: string[];
    }) => {
      // Build update object, converting complex types
      const updatePayload: Record<string, any> = {};
      
      if (updates.title !== undefined) updatePayload.title = updates.title;
      if (updates.slug !== undefined) updatePayload.slug = updates.slug;
      if (updates.difficulty !== undefined) updatePayload.difficulty = updates.difficulty;
      if (updates.sub_topic !== undefined) updatePayload.sub_topic = updates.sub_topic;
      if (updates.description !== undefined) updatePayload.description = updates.description;
      if (updates.examples !== undefined) updatePayload.examples = updates.examples;
      if (updates.constraints !== undefined) updatePayload.constraints = updates.constraints;
      if (updates.hints !== undefined) updatePayload.hints = updates.hints;
      if (updates.starter_code !== undefined) updatePayload.starter_code = updates.starter_code;
      if (updates.solution !== undefined) updatePayload.solution = updates.solution;
      if (updates.is_premium !== undefined) updatePayload.is_premium = updates.is_premium;
      if (updates.display_order !== undefined) updatePayload.display_order = updates.display_order;
      if (updates.status !== undefined) updatePayload.status = updates.status;
      if (updates.test_cases !== undefined) updatePayload.test_cases = updates.test_cases;
      if (updates.input_format !== undefined) updatePayload.input_format = updates.input_format;
      if (updates.output_format !== undefined) updatePayload.output_format = updates.output_format;
      if (updates.time_limit !== undefined) updatePayload.time_limit = updates.time_limit;
      if (updates.memory_limit !== undefined) updatePayload.memory_limit = updates.memory_limit;
      if (updates.supported_languages !== undefined) updatePayload.supported_languages = updates.supported_languages;
      if (updates.function_signature !== undefined) updatePayload.function_signature = updates.function_signature;
      if (updates.tags !== undefined) updatePayload.tags = updates.tags;

      const { data, error } = await supabase
        .from("practice_problems")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["practice-problems", data.skill_id] });
      queryClient.invalidateQueries({ queryKey: ["practice-problem", variables.id] });
      toast.success("Problem updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update problem: ${error.message}`);
    },
  });
}

export function useDeletePracticeProblem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, skillId }: { id: string; skillId: string }) => {
      const { error } = await supabase
        .from("practice_problems")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { skillId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["practice-problems", data.skillId] });
      toast.success("Problem deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete problem: ${error.message}`);
    },
  });
}
