import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Loader2, Plus, X, Check, AlertCircle, Settings, FileText, FlaskConical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import {
  usePracticeProblem,
  useCreatePracticeProblem,
  useUpdatePracticeProblem,
  useDeletePracticeProblem,
} from "@/hooks/usePracticeProblems";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  TestCasesSection,
  LimitsSection,
  SupportedLanguagesSection,
  FunctionSignatureSection,
  ProblemTagsSection,
  ProblemPreviewDialog,
  ProblemLessonMappings,
  type TestCase,
  type SupportedLanguage,
  type FunctionSignature,
} from "@/components/admin/problem-editor";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FullEditor } from "@/components/tiptap/FullEditor";
import { LightEditor } from "@/components/tiptap/LightEditor";
import { Label } from "@/components/ui/label";

const problemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  sub_topic: z.string().min(1, "Sub-topic is required"),
  description: z.string().optional(),
  is_premium: z.boolean().default(false),
  display_order: z.coerce.number().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
  solution: z.string().optional(),
});

type ProblemFormData = z.infer<typeof problemSchema>;

type TabId = "setup" | "content" | "evaluation";

export default function AdminProblemEditor() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isEditing = !!problemId && problemId !== "new";
  const isMobile = useIsMobile();
  const { isAdmin, isSuperModerator, isSeniorModerator, isModerator } = useUserRole();

  const { data: skill } = usePracticeSkill(skillId);
  const { data: problem, isLoading } = usePracticeProblem(isEditing ? problemId : undefined);
  const createMutation = useCreatePracticeProblem();
  const updateMutation = useUpdatePracticeProblem();
  const deleteMutation = useDeletePracticeProblem();

  const handleDelete = async () => {
    if (!problemId || !skillId) return;
    await deleteMutation.mutateAsync({ id: problemId, skillId });
    navigate(`/admin/practice/skills/${skillId}/problems`);
  };

  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [examples, setExamples] = useState<{ input: string; output: string; explanation?: string }[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [starterCode, setStarterCode] = useState<Record<string, string>>({
    python: "",
    javascript: "",
    sql: "",
    java: "",
    cpp: "",
  });

  // LeetCode-critical fields
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [inputFormat, setInputFormat] = useState("");
  const [outputFormat, setOutputFormat] = useState("");
  const [timeLimit, setTimeLimit] = useState(1000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [selectedLanguages, setSelectedLanguages] = useState<SupportedLanguage[]>(["python", "javascript"]);
  const selectedLanguagesSafe: SupportedLanguage[] = Array.isArray(selectedLanguages)
    ? selectedLanguages
    : [];
  const [functionSignature, setFunctionSignature] = useState<FunctionSignature>({
    name: "solution",
    parameters: [],
    return_type: "int",
  });
  const [tags, setTags] = useState<string[]>([]);

  // Role-based permissions
  const canEditTestCases = isAdmin;
  const canEditLimits = isAdmin || isSuperModerator;
  const canEditAll = isAdmin || isSuperModerator || isSeniorModerator;
  const isViewOnly = isModerator && !isSeniorModerator && !isSuperModerator && !isAdmin;

  const form = useForm<ProblemFormData>({
    resolver: zodResolver(problemSchema),
    defaultValues: {
      title: "",
      slug: "",
      difficulty: "Easy",
      sub_topic: "",
      description: "",
      is_premium: false,
      display_order: 0,
      status: "draft",
      solution: "",
    },
  });

  useEffect(() => {
    if (problem) {
      form.reset({
        title: problem.title,
        slug: problem.slug,
        difficulty: problem.difficulty,
        sub_topic: problem.sub_topic,
        description: problem.description || "",
        is_premium: problem.is_premium,
        display_order: problem.display_order,
        status: problem.status as "draft" | "published",
        solution: problem.solution || "",
      });
      setExamples(problem.examples || []);
      setConstraints(problem.constraints || []);
      setHints(problem.hints || []);
      setStarterCode(problem.starter_code || { python: "", javascript: "", sql: "", java: "", cpp: "" });
      setTestCases(problem.test_cases || []);
      setInputFormat(problem.input_format || "");
      setOutputFormat(problem.output_format || "");
      setTimeLimit(problem.time_limit || 1000);
      setMemoryLimit(problem.memory_limit || 256);
      setSelectedLanguages((problem.supported_languages || ["python", "javascript"]) as SupportedLanguage[]);
      setFunctionSignature(problem.function_signature || { name: "solution", parameters: [], return_type: "int" });
      setTags(problem.tags || []);
    }
  }, [problem, form]);

  const onSubmit = async (data: ProblemFormData) => {
    const problemData = {
      title: data.title,
      slug: data.slug,
      difficulty: data.difficulty,
      sub_topic: data.sub_topic,
      description: data.description,
      is_premium: data.is_premium,
      display_order: data.display_order,
      status: data.status,
      solution: data.solution,
      examples,
      constraints,
      hints,
      starter_code: starterCode,
      test_cases: testCases,
      input_format: inputFormat,
      output_format: outputFormat,
      time_limit: timeLimit,
      memory_limit: memoryLimit,
      supported_languages: selectedLanguagesSafe,
      function_signature: functionSignature,
      tags,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: problemId,
        ...problemData,
      });
    } else {
      await createMutation.mutateAsync({
        skill_id: skillId,
        ...problemData,
      });
    }
    navigate(`/admin/practice/skills/${skillId}/problems`);
  };

  const handleTitleChange = (title: string) => {
    form.setValue("title", title);
    if (!isEditing) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      form.setValue("slug", slug);
    }
  };

  const addExample = () => setExamples([...examples, { input: "", output: "", explanation: "" }]);
  const removeExample = (index: number) => setExamples(examples.filter((_, i) => i !== index));
  const updateExample = (index: number, field: string, value: string) => {
    const updated = [...examples];
    updated[index] = { ...updated[index], [field]: value };
    setExamples(updated);
  };

  const addConstraint = () => setConstraints([...constraints, ""]);
  const removeConstraint = (index: number) => setConstraints(constraints.filter((_, i) => i !== index));
  const updateConstraint = (index: number, value: string) => {
    const updated = [...constraints];
    updated[index] = value;
    setConstraints(updated);
  };

  const addHint = () => setHints([...hints, ""]);
  const removeHint = (index: number) => setHints(hints.filter((_, i) => i !== index));
  const updateHint = (index: number, value: string) => {
    const updated = [...hints];
    updated[index] = value;
    setHints(updated);
  };

  // Tab validation logic
  const hiddenTestCasesCount = testCases.filter((tc) => !tc.is_visible).length;
  const canPublish = hiddenTestCasesCount >= 1 && selectedLanguagesSafe.length >= 1 && examples.length >= 1;

  const tabValidation = useMemo(() => {
    const formValues = form.getValues();
    const formErrors = form.formState.errors;
    
    // Setup tab validation
    const setupComplete = 
      !!formValues.title?.trim() && 
      !!formValues.slug?.trim() && 
      !!formValues.sub_topic?.trim() &&
      selectedLanguagesSafe.length >= 1;
    const setupHasErrors = !!(formErrors.title || formErrors.slug || formErrors.sub_topic);

    // Content tab validation
    const contentComplete = examples.length >= 1;
    const contentHasErrors = false; // No required form fields in content tab

    // Evaluation tab validation
    const evaluationComplete = hiddenTestCasesCount >= 1;
    const evaluationHasErrors = false;

    return {
      setup: { complete: setupComplete && !setupHasErrors, hasErrors: setupHasErrors || !setupComplete },
      content: { complete: contentComplete, hasErrors: !contentComplete },
      evaluation: { complete: evaluationComplete, hasErrors: !evaluationComplete },
    };
  }, [form.watch(), selectedLanguagesSafe, examples, hiddenTestCasesCount]);

  if (isEditing && isLoading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card>
            <CardContent className="p-6 space-y-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; mobileLabel: string }[] = [
    { id: "setup", label: "Problem Setup", icon: <Settings className="h-4 w-4" />, mobileLabel: "Setup" },
    { id: "content", label: "Problem Content", icon: <FileText className="h-4 w-4" />, mobileLabel: "Content" },
    { id: "evaluation", label: "Evaluation & Solution", icon: <FlaskConical className="h-4 w-4" />, mobileLabel: "Evaluation" },
  ];

  const TabIndicator = ({ tabId }: { tabId: TabId }) => {
    const validation = tabValidation[tabId];
    if (validation.complete) {
      return <Check className="h-3 w-3 text-primary" />;
    }
    if (validation.hasErrors) {
      return <span className="h-2 w-2 rounded-full bg-destructive" />;
    }
    return null;
  };

  // Mobile Stepper Component
  const MobileStepper = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    return (
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 rounded-md transition-colors flex-1",
              activeTab === tab.id ? "bg-background shadow-sm" : "hover:bg-background/50"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground" 
                : index < currentIndex 
                  ? "bg-primary/80 text-primary-foreground"
                  : "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {tabValidation[tab.id].complete ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={cn(
              "text-xs font-medium",
              activeTab === tab.id ? "text-foreground" : "text-muted-foreground"
            )}>
              {tab.mobileLabel}
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/practice/skills/${skillId}/problems`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isEditing ? "Edit Problem" : "Create Problem"}
            </h1>
            <p className="text-muted-foreground">
              {skill?.name} &gt; {isEditing ? "Edit" : "New Problem"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this problem? This will permanently remove the problem and all its mappings to sub-topics. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <ProblemPreviewDialog
            title={form.watch("title")}
            difficulty={form.watch("difficulty")}
            description={form.watch("description") || ""}
            inputFormat={inputFormat}
            outputFormat={outputFormat}
            examples={examples}
            constraints={constraints}
            hints={hints}
            tags={tags}
            testCases={testCases}
            starterCode={starterCode}
            selectedLanguages={selectedLanguages}
            timeLimit={timeLimit}
            memoryLimit={memoryLimit}
          />
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Mobile Stepper */}
          {isMobile && <MobileStepper />}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
            {/* Desktop Tab List - Pill Style */}
            {!isMobile && (
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-6">
                <TabsList className="inline-flex h-12 items-center justify-center rounded-full bg-muted/60 p-1.5 text-muted-foreground">
                  {tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                    >
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.mobileLabel}</span>
                      <TabIndicator tabId={tab.id} />
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            )}

            {/* TAB 1: Problem Setup */}
            <TabsContent value="setup" className="space-y-6 mt-0">
              {/* Basic Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Define the problem identity and access level</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            onChange={(e) => handleTitleChange(e.target.value)}
                            placeholder="e.g., Two Sum"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., two-sum" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="difficulty"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Difficulty</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select difficulty" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Easy">Easy</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published" disabled={!canPublish}>
                                Published {!canPublish && "(incomplete)"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="display_order"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Order</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_premium"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>Premium Problem</FormLabel>
                          <FormDescription>Only accessible to premium users</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Classification Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Classification</CardTitle>
                  <CardDescription>Categorize the problem for organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Practice Skill (read-only) */}
                  <div>
                    <label className="text-sm font-medium">Practice Skill</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">
                        {skill?.name || "Loading..."}
                      </Badge>
                      <span className="text-xs text-muted-foreground">(auto-linked)</span>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="sub_topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub-Topic</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Arrays, Sorting" />
                        </FormControl>
                        <FormDescription>
                          Group similar problems under a common sub-topic
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Problem Tags */}
                  <ProblemTagsSection
                    tags={tags}
                    onChange={setTags}
                    disabled={isViewOnly}
                  />
                </CardContent>
              </Card>

              {/* Limits & Languages Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Limits & Languages</CardTitle>
                  <CardDescription>Configure execution constraints and supported languages</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <LimitsSection
                    timeLimit={timeLimit}
                    memoryLimit={memoryLimit}
                    onTimeLimitChange={setTimeLimit}
                    onMemoryLimitChange={setMemoryLimit}
                    disabled={!canEditLimits}
                  />

                  <SupportedLanguagesSection
                    selectedLanguages={selectedLanguages}
                    onChange={setSelectedLanguages}
                    disabled={isViewOnly}
                  />
                </CardContent>
              </Card>

              {/* Lesson Mappings */}
              <ProblemLessonMappings 
                problemId={isEditing ? problemId : undefined} 
                disabled={isViewOnly}
              />
            </TabsContent>

            {/* TAB 2: Problem Content */}
            <TabsContent value="content" className="space-y-6 mt-0">
              {/* Problem Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Problem Description</CardTitle>
                  <CardDescription>Describe the problem for learners using the rich text editor</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <div className="border rounded-md min-h-[300px]">
                            <FullEditor
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="Describe the problem..."
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Input/Output Format */}
              <Card>
                <CardHeader>
                  <CardTitle>Input / Output Format</CardTitle>
                  <CardDescription>Defines how input is received and output is returned</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Input Format</Label>
                    <div className="mt-1 border rounded-md min-h-[120px]">
                      <LightEditor
                        value={inputFormat}
                        onChange={setInputFormat}
                        placeholder="The first line contains an integer n — the number of elements..."
                        disabled={isViewOnly}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Output Format</Label>
                    <div className="mt-1 border rounded-md min-h-[120px]">
                      <LightEditor
                        value={outputFormat}
                        onChange={setOutputFormat}
                        placeholder="Return a single integer — the sum of all elements..."
                        disabled={isViewOnly}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Examples */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Examples
                      {examples.length === 0 && (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Add at least one example for learners</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addExample}>
                    <Plus className="h-4 w-4 mr-1" /> Add Example
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {examples.map((example, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Example {index + 1}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeExample(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Input</label>
                          <Textarea
                            value={example.input}
                            onChange={(e) => updateExample(index, "input", e.target.value)}
                            rows={2}
                            className="mt-1 font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Output</label>
                          <Textarea
                            value={example.output}
                            onChange={(e) => updateExample(index, "output", e.target.value)}
                            rows={2}
                            className="mt-1 font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Explanation (optional)</label>
                        <Input
                          value={example.explanation || ""}
                          onChange={(e) => updateExample(index, "explanation", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ))}
                  {examples.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No examples yet. Add at least one example.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Constraints */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Constraints</CardTitle>
                    <CardDescription>Define input/output boundaries</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addConstraint}>
                    <Plus className="h-4 w-4 mr-1" /> Add Constraint
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {constraints.map((constraint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                      <Input
                        value={constraint}
                        onChange={(e) => updateConstraint(index, e.target.value)}
                        placeholder="e.g., 1 <= nums.length <= 10^4"
                        className="font-mono text-sm"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeConstraint(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {constraints.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No constraints yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Hints */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Hints</CardTitle>
                    <CardDescription>Progressive hints to help stuck learners</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addHint}>
                    <Plus className="h-4 w-4 mr-1" /> Add Hint
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hints.map((hint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline" className="shrink-0">Hint {index + 1}</Badge>
                      <Input
                        value={hint}
                        onChange={(e) => updateHint(index, e.target.value)}
                        placeholder="Add a helpful hint..."
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeHint(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {hints.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No hints yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Evaluation & Solution */}
            <TabsContent value="evaluation" className="space-y-6 mt-0">
              {/* Function Signature */}
              <FunctionSignatureSection
                signature={functionSignature}
                onChange={setFunctionSignature}
                disabled={isViewOnly}
              />

              {/* Starter Code */}
              <Card>
                <CardHeader>
                  <CardTitle>Starter Code</CardTitle>
                  <CardDescription>
                    Provide initial code templates for each selected language
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedLanguagesSafe.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed rounded-lg">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Select languages in the Setup tab first.
                      </p>
                    </div>
                  ) : (
                    <>
                      {selectedLanguagesSafe.includes("python") && (
                        <div>
                          <label className="text-sm font-medium">Python</label>
                          <Textarea
                            value={starterCode.python || ""}
                            onChange={(e) => setStarterCode({ ...starterCode, python: e.target.value })}
                            rows={4}
                            className="mt-1 font-mono text-sm"
                            placeholder="def solution():\n    pass"
                            disabled={isViewOnly}
                          />
                        </div>
                      )}
                      {selectedLanguagesSafe.includes("javascript") && (
                        <div>
                          <label className="text-sm font-medium">JavaScript</label>
                          <Textarea
                            value={starterCode.javascript || ""}
                            onChange={(e) => setStarterCode({ ...starterCode, javascript: e.target.value })}
                            rows={4}
                            className="mt-1 font-mono text-sm"
                            placeholder="function solution() {\n    \n}"
                            disabled={isViewOnly}
                          />
                        </div>
                      )}
                      {selectedLanguagesSafe.includes("java") && (
                        <div>
                          <label className="text-sm font-medium">Java</label>
                          <Textarea
                            value={starterCode.java || ""}
                            onChange={(e) => setStarterCode({ ...starterCode, java: e.target.value })}
                            rows={4}
                            className="mt-1 font-mono text-sm"
                            placeholder="class Solution {\n    public void solution() {\n    }\n}"
                            disabled={isViewOnly}
                          />
                        </div>
                      )}
                      {selectedLanguagesSafe.includes("cpp") && (
                        <div>
                          <label className="text-sm font-medium">C++</label>
                          <Textarea
                            value={starterCode.cpp || ""}
                            onChange={(e) => setStarterCode({ ...starterCode, cpp: e.target.value })}
                            rows={4}
                            className="mt-1 font-mono text-sm"
                            placeholder="class Solution {\npublic:\n    void solution() {\n    }\n};"
                            disabled={isViewOnly}
                          />
                        </div>
                      )}
                      {selectedLanguagesSafe.includes("sql") && (
                        <div>
                          <label className="text-sm font-medium">SQL</label>
                          <Textarea
                            value={starterCode.sql || ""}
                            onChange={(e) => setStarterCode({ ...starterCode, sql: e.target.value })}
                            rows={4}
                            className="mt-1 font-mono text-sm"
                            placeholder="SELECT * FROM table;"
                            disabled={isViewOnly}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Test Cases */}
              <div className="relative">
                {hiddenTestCasesCount === 0 && (
                  <Badge variant="destructive" className="absolute -top-2 right-4 z-10">
                    Required: Add hidden test cases
                  </Badge>
                )}
                <TestCasesSection
                  testCases={testCases}
                  onChange={setTestCases}
                  disabled={!canEditTestCases}
                />
              </div>

              {/* Solution */}
              <Card>
                <CardHeader>
                  <CardTitle>Solution</CardTitle>
                  <CardDescription>Provide the solution code or explanation (Markdown supported)</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="solution"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea {...field} rows={10} className="font-mono text-sm" placeholder="Provide the solution..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t pt-6 sticky bottom-0 bg-background pb-4">
            <div className="text-sm text-muted-foreground">
              {!canPublish && form.watch("status") === "published" && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>Cannot publish: requires language, example, and hidden test case.</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(`/admin/practice/skills/${skillId}/problems`)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending || isViewOnly}
                className="gap-2"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {isEditing ? "Update Problem" : "Create Problem"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  </div>
);
}
