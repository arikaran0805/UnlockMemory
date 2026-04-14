import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save, Loader2, Plus, X, Check, AlertCircle, Lock,
  Settings, FileText, Lightbulb, Trash2, Bug, ShieldCheck,
  MessageSquare, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useFixErrorProblem,
  useCreateFixErrorProblem,
  useUpdateFixErrorProblem,
  useDeleteFixErrorProblem,
  TestCase,
} from "@/hooks/useFixErrorProblems";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const LANGUAGES = ["python", "javascript", "java", "sql", "c", "cpp", "r", "csharp", "typescript"];
const SUGGESTED_TAGS = ["syntax", "logic", "runtime", "off-by-one", "null-reference", "type-error", "scope", "operator", "index", "infinite-loop", "comparison", "return-value"];

const formSchema = z.object({
  title: z.string().min(1, "Title required").max(80, "Max 80 characters"),
  slug: z.string().min(1, "Slug required").regex(/^[a-z0-9-]+$/, "Lowercase with hyphens"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  language: z.string().min(1, "Language required"),
  status: z.enum(["draft", "published"]).default("draft"),
  is_premium: z.boolean().default(false),
  display_order: z.coerce.number().default(0),
});

type FormData = z.infer<typeof formSchema>;
type TabId = "metadata" | "code" | "validation" | "feedback";

export default function AdminFixErrorEditor() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isEditing = !!problemId && problemId !== "new";
  const isMobile = useIsMobile();
  const { isAdmin } = useUserRole();

  const { data: skill } = usePracticeSkill(skillId);
  const { data: problem, isLoading } = useFixErrorProblem(isEditing ? problemId : undefined);
  const createMutation = useCreateFixErrorProblem();
  const updateMutation = useUpdateFixErrorProblem();
  const deleteMutation = useDeleteFixErrorProblem();

  const [activeTab, setActiveTab] = useState<TabId>("metadata");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [description, setDescription] = useState("");
  const [buggyCode, setBuggyCode] = useState("");
  const [correctCode, setCorrectCode] = useState("");
  const [validationType, setValidationType] = useState<string>("output_comparison");
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [expectedOutput, setExpectedOutput] = useState("");
  const [customValidator, setCustomValidator] = useState("");
  const [failureMessage, setFailureMessage] = useState("Your fix didn't resolve the issue. Try again!");
  const [successMessage, setSuccessMessage] = useState("Great job! You found and fixed the bug!");
  const [hints, setHints] = useState<string[]>([]);
  const [showCorrectCode, setShowCorrectCode] = useState(false);
  const [sampleOutput, setSampleOutput] = useState("");
  const [editableStartLine, setEditableStartLine] = useState<number | undefined>(undefined);
  const [editableEndLine, setEditableEndLine] = useState<number | undefined>(undefined);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", slug: "", difficulty: "Easy", language: "python",
      status: "draft", is_premium: false, display_order: 0,
    },
  });

  useEffect(() => {
    if (problem) {
      form.reset({
        title: problem.title, slug: problem.slug, difficulty: problem.difficulty as any,
        language: problem.language, status: problem.status as "draft" | "published",
        is_premium: problem.is_premium, display_order: problem.display_order,
      });
      setTags(problem.tags);
      setDescription(problem.description);
      setBuggyCode(problem.buggy_code);
      setCorrectCode(problem.correct_code);
      setValidationType(problem.validation_type);
      setTestCases(problem.test_cases);
      setExpectedOutput(problem.expected_output);
      setCustomValidator(problem.custom_validator);
      setFailureMessage(problem.failure_message);
      setSuccessMessage(problem.success_message);
      setHints(problem.hints);
      setSampleOutput((problem as any).sample_output || "");
      setEditableStartLine((problem as any).editable_start_line ?? undefined);
      setEditableEndLine((problem as any).editable_end_line ?? undefined);
    }
  }, [problem, form]);

  const handleTitleChange = (title: string) => {
    form.setValue("title", title);
    if (!isEditing) {
      form.setValue("slug", title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"));
    }
  };

  const canPublish = useMemo(() => {
    const vals = form.getValues();
    return !!vals.title?.trim() && !!buggyCode.trim() && !!correctCode.trim() && !!description.trim();
  }, [form.watch("title"), buggyCode, correctCode, description]);

  const onSubmit = async (data: FormData) => {
    if (data.status === "published" && !canPublish) return;

    const payload: Record<string, any> = {
      ...data,
      skill_id: skillId!,
      tags, description, buggy_code: buggyCode, correct_code: correctCode,
      validation_type: validationType as any,
      test_cases: testCases, expected_output: expectedOutput,
      custom_validator: customValidator,
      failure_message: failureMessage, success_message: successMessage,
      hints,
      sample_output: sampleOutput || null,
      editable_start_line: editableStartLine ?? null,
      editable_end_line: editableEndLine ?? null,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: problemId, ...payload });
    } else {
      await createMutation.mutateAsync(payload as any);
    }
    navigate(`/admin/practice/skills/${skillId}/problems`);
  };

  const handleDelete = async () => {
    if (!problemId || !skillId) return;
    await deleteMutation.mutateAsync({ id: problemId, skillId });
    navigate(`/admin/practice/skills/${skillId}/problems`);
  };

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: "", expected_output: "", is_hidden: false }]);
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const addHint = () => setHints([...hints, ""]);
  const updateHint = (index: number, value: string) => {
    const updated = [...hints];
    updated[index] = value;
    setHints(updated);
  };
  const removeHint = (index: number) => setHints(hints.filter((_, i) => i !== index));

  // Tab validation
  const tabValidation = useMemo(() => {
    const formValues = form.getValues();
    const formErrors = form.formState.errors;

    const metadataComplete = !!formValues.title?.trim() && !!formValues.slug?.trim() && !!formValues.language?.trim();
    const metadataHasErrors = !!(formErrors.title || formErrors.slug);

    const codeComplete = !!buggyCode.trim() && !!correctCode.trim() && !!description.trim();
    const validationComplete = validationType === "output_comparison" ? !!expectedOutput.trim() :
      validationType === "test_cases" ? testCases.length > 0 : !!customValidator.trim();

    return {
      metadata: { complete: metadataComplete && !metadataHasErrors, hasErrors: metadataHasErrors || !metadataComplete },
      code: { complete: codeComplete, hasErrors: !codeComplete },
      validation: { complete: validationComplete, hasErrors: !validationComplete },
      feedback: { complete: true, hasErrors: false },
    };
  }, [form.watch(), buggyCode, correctCode, description, validationType, expectedOutput, testCases, customValidator]);

  if (isEditing && isLoading) {
    return (
      <div className="flex flex-col gap-0">
        <Skeleton className="h-10 w-48" />
        <div className="admin-section-spacing-top" />
        <div className="space-y-6">
          <Card><CardContent className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent></Card>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; mobileLabel: string }[] = [
    { id: "metadata", label: "Problem Setup", icon: <Settings className="h-4 w-4" />, mobileLabel: "Setup" },
    { id: "code", label: "Code Blocks", icon: <Bug className="h-4 w-4" />, mobileLabel: "Code" },
    { id: "validation", label: "Validation", icon: <ShieldCheck className="h-4 w-4" />, mobileLabel: "Validate" },
    { id: "feedback", label: "Feedback & Hints", icon: <MessageSquare className="h-4 w-4" />, mobileLabel: "Feedback" },
  ];

  const TabIndicator = ({ tabId }: { tabId: TabId }) => {
    const validation = tabValidation[tabId];
    if (validation.complete) return <Check className="h-3 w-3 text-primary" />;
    if (validation.hasErrors) return <span className="h-2 w-2 rounded-full bg-destructive" />;
    return null;
  };

  const MobileStepper = () => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    return (
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
        {tabs.map((tab, index) => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 rounded-md transition-colors flex-1",
              activeTab === tab.id ? "bg-background shadow-sm" : "hover:bg-background/50"
            )}>
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
              activeTab === tab.id ? "bg-primary text-primary-foreground"
                : index < currentIndex ? "bg-primary/80 text-primary-foreground"
                : "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {tabValidation[tab.id].complete ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <span className={cn("text-xs font-medium", activeTab === tab.id ? "text-foreground" : "text-muted-foreground")}>
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? "Edit" : "Create"} Fix the Error
          </h1>
          <p className="text-muted-foreground">
            {skill?.name} &gt; {isEditing ? "Edit" : "New Problem"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this problem. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {isMobile && <MobileStepper />}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
            {!isMobile && (
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-6">
                <TabsList className="inline-flex h-12 items-center justify-center rounded-full bg-muted/60 p-1.5 text-muted-foreground">
                  {tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                      {tab.icon}
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.mobileLabel}</span>
                      <TabIndicator tabId={tab.id} />
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            )}

            {/* ═══ TAB 1: PROBLEM SETUP ═══ */}
            <TabsContent value="metadata" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Define the problem identity and classification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={e => handleTitleChange(e.target.value)} placeholder="Fix the broken sort function" maxLength={80} />
                      </FormControl>
                      <FormDescription>{field.value?.length || 0}/80</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="slug" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl><Input {...field} placeholder="fix-broken-sort" disabled={isEditing} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="difficulty" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="language" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {LANGUAGES.map(l => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="display_order" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl><Input {...field} type="number" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="is_premium" render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel>Premium Problem</FormLabel>
                        <FormDescription>Only accessible to premium users</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* Classification */}
              <Card>
                <CardHeader>
                  <CardTitle>Classification</CardTitle>
                  <CardDescription>Categorize for filtering and discovery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Practice Skill</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">{skill?.name || "Loading..."}</Badge>
                      <span className="text-xs text-muted-foreground">(auto-linked)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map(t => (
                        <Badge key={t} variant="secondary" className="gap-1 text-xs">
                          {t}
                          <button type="button" onClick={() => setTags(tags.filter(x => x !== t))}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag..."
                        className="flex-1" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }} />
                      <Button type="button" size="sm" variant="outline" onClick={() => addTag(tagInput)}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 8).map(t => (
                        <button key={t} type="button" onClick={() => addTag(t)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ TAB 2: CODE BLOCKS ═══ */}
            <TabsContent value="code" className="space-y-6 mt-0">
              {/* Problem Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Problem Description
                  </CardTitle>
                  <CardDescription>
                    Explain what the code <strong>should</strong> do. Do NOT reveal the fix.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="The function below is supposed to return the sum of all even numbers in a list. However, it contains a bug that causes incorrect results..."
                    className="min-h-[120px] font-mono text-sm"
                  />
                </CardContent>
              </Card>

              {/* Buggy Code */}
              <Card className="border-destructive/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <Bug className="h-5 w-5" />
                        Broken Code (Learner View)
                      </CardTitle>
                      <CardDescription>
                        This exact code is shown to learners. They must find and fix the bug.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-destructive border-destructive/30">
                      Visible to learners
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={buggyCode}
                    onChange={e => setBuggyCode(e.target.value)}
                    placeholder={`def sum_evens(numbers):\n    total = 0\n    for n in numbers:\n        if n % 2 == 1:  # Bug: should be == 0\n            total += n\n    return total`}
                    className="min-h-[200px] font-mono text-sm bg-destructive/5 border-destructive/20"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tip: Include realistic bugs — off-by-one errors, wrong operators, missing edge cases.
                  </p>
                </CardContent>
              </Card>

              {/* Editable Region & Sample Output */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    Editable Region & Sample Output
                  </CardTitle>
                  <CardDescription>
                    Lock lines outside the editable range. Learners can only modify lines within the range.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Editable Start Line</Label>
                      <Input
                        type="number" min={1}
                        value={editableStartLine ?? ""}
                        onChange={e => setEditableStartLine(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="e.g. 2 (leave empty for all editable)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Editable End Line</Label>
                      <Input
                        type="number" min={1}
                        value={editableEndLine ?? ""}
                        onChange={e => setEditableEndLine(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="e.g. 8 (leave empty for all editable)"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave both empty to allow editing the entire code. When set, lines outside this range are locked with a visual indicator.
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <Label>Sample Output</Label>
                    <Textarea
                      value={sampleOutput}
                      onChange={e => setSampleOutput(e.target.value)}
                      placeholder="The expected output shown to learners as a reference..."
                      className="min-h-[80px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shown in the Problem panel. If empty, derived from expected output or first visible test case.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Correct Code */}
              <Card className="border-primary/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="h-5 w-5" />
                        Correct Code (Hidden)
                      </CardTitle>
                      <CardDescription>
                        Used for validation and comparison. Never visible to learners.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-primary border-primary/30">
                        Admin only
                      </Badge>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => setShowCorrectCode(!showCorrectCode)}>
                            {showCorrectCode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{showCorrectCode ? "Hide code" : "Show code"}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {showCorrectCode ? (
                    <Textarea
                      value={correctCode}
                      onChange={e => setCorrectCode(e.target.value)}
                      placeholder={`def sum_evens(numbers):\n    total = 0\n    for n in numbers:\n        if n % 2 == 0:  # Fixed: check for even\n            total += n\n    return total`}
                      className="min-h-[200px] font-mono text-sm bg-primary/5 border-primary/20"
                    />
                  ) : (
                    <div
                      onClick={() => setShowCorrectCode(true)}
                      className="min-h-[100px] flex items-center justify-center border border-dashed border-muted-foreground/30 rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
                    >
                      <div className="text-center text-muted-foreground">
                        <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Solution hidden for safety</p>
                        <p className="text-xs">Click to reveal and edit</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ TAB 3: VALIDATION ═══ */}
            <TabsContent value="validation" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Validation Type</CardTitle>
                  <CardDescription>Choose how the learner's fix is validated</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: "output_comparison", label: "Output Comparison", desc: "Compare stdout output" },
                      { value: "test_cases", label: "Test Cases", desc: "Run with multiple inputs" },
                      { value: "custom_function", label: "Custom Validator", desc: "Custom validation logic" },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setValidationType(opt.value)}
                        className={cn(
                          "p-4 rounded-lg border text-left transition-all",
                          validationType === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30"
                        )}>
                        <div className="font-medium text-sm">{opt.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Output Comparison */}
                  {validationType === "output_comparison" && (
                    <div className="space-y-2">
                      <Label>Expected Output</Label>
                      <Textarea
                        value={expectedOutput}
                        onChange={e => setExpectedOutput(e.target.value)}
                        placeholder="The expected stdout when the fixed code runs correctly..."
                        className="min-h-[100px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        The learner's fixed code output will be compared against this value.
                      </p>
                    </div>
                  )}

                  {/* Test Cases */}
                  {validationType === "test_cases" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Test Cases</Label>
                        <Button type="button" size="sm" variant="outline" onClick={addTestCase} className="gap-1.5">
                          <Plus className="h-3.5 w-3.5" />Add Test Case
                        </Button>
                      </div>
                      {testCases.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                          <p className="text-sm">No test cases yet. Add one to define expected behavior.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {testCases.map((tc, i) => (
                            <Card key={i} className="bg-muted/30">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Test Case {i + 1}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <Switch checked={tc.is_hidden} onCheckedChange={v => updateTestCase(i, "is_hidden", v)} />
                                      <span className="text-xs text-muted-foreground">Hidden</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => removeTestCase(i)}>
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Input</Label>
                                    <Textarea value={tc.input} onChange={e => updateTestCase(i, "input", e.target.value)}
                                      placeholder="Function arguments..." className="font-mono text-xs min-h-[60px]" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Expected Output</Label>
                                    <Textarea value={tc.expected_output} onChange={e => updateTestCase(i, "expected_output", e.target.value)}
                                      placeholder="Expected return value..." className="font-mono text-xs min-h-[60px]" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Validator */}
                  {validationType === "custom_function" && (
                    <div className="space-y-2">
                      <Label>Custom Validator Function</Label>
                      <Textarea
                        value={customValidator}
                        onChange={e => setCustomValidator(e.target.value)}
                        placeholder={`def validate(user_output, expected_output):\n    # Return True if the fix is correct\n    return user_output.strip() == expected_output.strip()`}
                        className="min-h-[160px] font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Write a function that receives the learner's output and returns True/False.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ TAB 4: FEEDBACK & HINTS ═══ */}
            <TabsContent value="feedback" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Messages</CardTitle>
                  <CardDescription>Custom messages shown after submission</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      Failure Message
                    </Label>
                    <Textarea
                      value={failureMessage}
                      onChange={e => setFailureMessage(e.target.value)}
                      placeholder="Your fix didn't resolve the issue. Try again!"
                      className="min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      Success Message
                    </Label>
                    <Textarea
                      value={successMessage}
                      onChange={e => setSuccessMessage(e.target.value)}
                      placeholder="Great job! You found and fixed the bug!"
                      className="min-h-[60px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Hints */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-amber-500" />
                        Hints
                      </CardTitle>
                      <CardDescription>Optional hints revealed progressively. Locked behind a reveal toggle for learners.</CardDescription>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addHint} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />Add Hint
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {hints.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hints added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {hints.map((hint, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-2 shrink-0 text-xs">{i + 1}</Badge>
                          <Textarea
                            value={hint}
                            onChange={e => updateHint(i, e.target.value)}
                            placeholder={`Hint ${i + 1}: Look at the condition in the if statement...`}
                            className="min-h-[50px] text-sm flex-1"
                          />
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0"
                            onClick={() => removeHint(i)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-4 z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: "Title", done: !!form.watch("title")?.trim() },
                  { label: "Description", done: !!description?.trim() },
                  { label: "Buggy code", done: !!buggyCode?.trim() },
                  { label: "Correct code", done: !!correctCode?.trim() },
                ].map(({ label, done }) => (
                  <span key={label} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${done ? "bg-primary/8 border-primary/20 text-primary" : "bg-muted border-border text-muted-foreground"}`}>
                    {done ? <Check className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button type="button" variant="outline" onClick={() => navigate(`/admin/practice/skills/${skillId}/problems`)}>
                  Cancel
                </Button>
                <FormField control={form.control} name="status" render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-[130px] h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published" disabled={!canPublish}>
                        {!canPublish ? <span className="flex items-center gap-1.5 text-muted-foreground"><Lock className="h-3 w-3" /> Published</span> : "Published"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )} />
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEditing ? "Save Changes" : "Create Problem"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
    </div>
  </div>
);
}
