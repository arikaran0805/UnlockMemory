import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save, Loader2, Plus, X, Check, AlertCircle, Lock,
  Settings, FileText, Lightbulb, Trash2,
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
  usePredictOutputProblem,
  useCreatePredictOutputProblem,
  useUpdatePredictOutputProblem,
  useDeletePredictOutputProblem,
} from "@/hooks/usePredictOutputProblems";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const LANGUAGES = ["python", "javascript", "java", "sql", "c", "cpp", "r", "csharp", "typescript"];
const SUGGESTED_TAGS = ["loops", "scope", "strings", "nulls", "joins", "recursion", "operators", "type-coercion", "closures", "hoisting", "list-comprehension", "slicing", "mutability", "references"];

const formSchema = z.object({
  title: z.string().min(1, "Title required").max(60, "Max 60 characters"),
  slug: z.string().min(1, "Slug required").regex(/^[a-z0-9-]+$/, "Lowercase with hyphens"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  language: z.string().min(1, "Language required"),
  prompt: z.string().max(160, "Max 160 characters").optional().or(z.literal("")),
  code: z.string().min(1, "Code is required"),
  expected_output: z.string().min(1, "Expected output is required"),
  status: z.enum(["draft", "published"]).default("draft"),
  is_premium: z.boolean().default(false),
  display_order: z.coerce.number().default(0),
});

type FormData = z.infer<typeof formSchema>;
type TabId = "setup" | "content" | "explanation";

export default function AdminPredictOutputEditor() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isEditing = !!problemId && problemId !== "new";
  const isMobile = useIsMobile();
  const { isAdmin } = useUserRole();

  const { data: skill } = usePracticeSkill(skillId);
  const { data: problem, isLoading } = usePredictOutputProblem(isEditing ? problemId : undefined);
  const createMutation = useCreatePredictOutputProblem();
  const updateMutation = useUpdatePredictOutputProblem();
  const deleteMutation = useDeletePredictOutputProblem();

  const [activeTab, setActiveTab] = useState<TabId>("setup");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [acceptedOutputs, setAcceptedOutputs] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [stepByStep, setStepByStep] = useState<string[]>([]);
  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [matchMode, setMatchMode] = useState<string>("strict");
  const [outputType, setOutputType] = useState<string>("single_line");
  const [revealAllowed, setRevealAllowed] = useState(true);
  const [revealTiming, setRevealTiming] = useState("anytime");
  const [revealPenalty, setRevealPenalty] = useState("no_xp");
  const [xpValue, setXpValue] = useState(10);
  const [streakEligible, setStreakEligible] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", slug: "", difficulty: "Easy", language: "python",
      prompt: "", code: "", expected_output: "", status: "draft",
      is_premium: false, display_order: 0,
    },
  });

  useEffect(() => {
    if (problem) {
      form.reset({
        title: problem.title, slug: problem.slug, difficulty: problem.difficulty,
        language: problem.language, prompt: problem.prompt || "",
        code: problem.code, expected_output: problem.expected_output,
        status: problem.status as "draft" | "published",
        is_premium: problem.is_premium, display_order: problem.display_order,
      });
      setTags(problem.tags);
      setAcceptedOutputs(problem.accepted_outputs);
      setHints(problem.hints);
      setStepByStep(problem.step_by_step);
      setCommonMistakes(problem.common_mistakes);
      setExplanation(problem.explanation || "");
      setMatchMode(problem.match_mode);
      setOutputType(problem.output_type);
      setRevealAllowed(problem.reveal_allowed);
      setRevealTiming(problem.reveal_timing);
      setRevealPenalty(problem.reveal_penalty);
      setXpValue(problem.xp_value);
      setStreakEligible(problem.streak_eligible);
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
    return !!vals.code?.trim() && !!vals.expected_output?.trim() && !!explanation?.trim();
  }, [form.watch("code"), form.watch("expected_output"), explanation]);

  const onSubmit = async (data: FormData) => {
    if (data.status === "published" && !canPublish) return;

    const payload = {
      ...data,
      skill_id: skillId!,
      tags, accepted_outputs: acceptedOutputs, hints, step_by_step: stepByStep,
      common_mistakes: commonMistakes, explanation, match_mode: matchMode as any,
      output_type: outputType as any, reveal_allowed: revealAllowed,
      reveal_timing: revealTiming as any, reveal_penalty: revealPenalty as any,
      xp_value: xpValue, streak_eligible: streakEligible,
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

  // Tab validation
  const tabValidation = useMemo(() => {
    const formValues = form.getValues();
    const formErrors = form.formState.errors;

    const setupComplete =
      !!formValues.title?.trim() &&
      !!formValues.slug?.trim() &&
      !!formValues.language?.trim();
    const setupHasErrors = !!(formErrors.title || formErrors.slug);

    const contentComplete =
      !!formValues.code?.trim() &&
      !!formValues.expected_output?.trim();
    const contentHasErrors = !!(formErrors.code || formErrors.expected_output);

    const explanationComplete = !!explanation?.trim();

    return {
      setup: { complete: setupComplete && !setupHasErrors, hasErrors: setupHasErrors || !setupComplete },
      content: { complete: contentComplete && !contentHasErrors, hasErrors: contentHasErrors || !contentComplete },
      explanation: { complete: explanationComplete, hasErrors: !explanationComplete },
    };
  }, [form.watch(), explanation]);

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
    { id: "content", label: "Code & Output", icon: <FileText className="h-4 w-4" />, mobileLabel: "Content" },
    { id: "explanation", label: "Explanation & Settings", icon: <Lightbulb className="h-4 w-4" />, mobileLabel: "Explain" },
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
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditing ? "Edit" : "Create"} Predict Output
          </h1>
          <p className="text-muted-foreground">
            {skill?.name} &gt; {isEditing ? "Edit" : "New Problem"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Problem</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this problem and all attempts. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
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
          {/* Mobile Stepper */}
          {isMobile && <MobileStepper />}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
            {/* Desktop Tab List — Pill Style */}
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
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Define the problem identity and access level</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} onChange={e => handleTitleChange(e.target.value)} placeholder="What does this code print?" maxLength={60} />
                      </FormControl>
                      <FormDescription>{field.value?.length || 0}/60</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="slug" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="what-does-this-print" disabled={isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="difficulty" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger></FormControl>
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
                  <CardDescription>Categorize for organization and discovery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Practice Skill</label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm">{skill?.name || "Loading..."}</Badge>
                      <span className="text-xs text-muted-foreground">(auto-linked)</span>
                    </div>
                  </div>

                  {/* Tags */}
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
                      <Input
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        placeholder="Add tag..."
                        className="flex-1"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                      />
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

              {/* Matching & Scoring Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Matching & Scoring</CardTitle>
                  <CardDescription>Configure how output is compared and scored</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Match Mode</Label>
                      <Select value={matchMode} onValueChange={setMatchMode}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strict">Strict (exact match)</SelectItem>
                          <SelectItem value="trim">Trim-tolerant</SelectItem>
                          <SelectItem value="normalized">Normalized</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Output Type</Label>
                      <Select value={outputType} onValueChange={setOutputType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single_line">Single line</SelectItem>
                          <SelectItem value="multi_line">Multi-line</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>XP Value</Label>
                      <Input type="number" min={0} max={100} value={xpValue} onChange={e => setXpValue(Number(e.target.value))} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <Label>Streak Eligible</Label>
                        <p className="text-xs text-muted-foreground">Counts towards daily streak</p>
                      </div>
                      <Switch checked={streakEligible} onCheckedChange={setStreakEligible} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reveal Rules */}
              <Card>
                <CardHeader>
                  <CardTitle>Reveal Rules</CardTitle>
                  <CardDescription>Control when and how the answer can be revealed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label>Reveal Allowed</Label>
                      <p className="text-xs text-muted-foreground">Allow learners to reveal the answer</p>
                    </div>
                    <Switch checked={revealAllowed} onCheckedChange={setRevealAllowed} />
                  </div>
                  {revealAllowed && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Reveal Timing</Label>
                        <Select value={revealTiming} onValueChange={setRevealTiming}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anytime">Anytime</SelectItem>
                            <SelectItem value="after_1">After 1 attempt</SelectItem>
                            <SelectItem value="after_2">After 2 attempts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reveal Penalty</Label>
                        <Select value={revealPenalty} onValueChange={setRevealPenalty}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_xp">No XP</SelectItem>
                            <SelectItem value="half_xp">-50% XP</SelectItem>
                            <SelectItem value="viewed_solution">Mark as "Viewed solution"</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: Code & Output */}
            <TabsContent value="content" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Prompt</CardTitle>
                  <CardDescription>Optional short prompt shown above the code</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField control={form.control} name="prompt" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="What is the output of the following code?" {...field} maxLength={160} />
                      </FormControl>
                      <FormDescription>{field.value?.length || 0}/160</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Code Snippet</CardTitle>
                  <CardDescription>The code learners will analyze</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder={"x = [1, 2, 3]\nprint(x[::-1])"}
                          className="font-mono text-sm min-h-[220px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value?.split("\n").length || 0} line(s)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Expected Output</CardTitle>
                  <CardDescription>The exact output the program produces</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="expected_output" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Output <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Textarea placeholder="[3, 2, 1]" className="font-mono text-sm min-h-[120px]" {...field} />
                      </FormControl>
                      <FormDescription>
                        {field.value?.split("\n").length || 0} line(s) · {field.value?.length || 0} char(s)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {/* Accepted Alternatives */}
                  <div className="space-y-2">
                    <Label>Accepted Outputs (alternatives)</Label>
                    <p className="text-xs text-muted-foreground">Additional valid outputs that should also be marked correct</p>
                    {acceptedOutputs.map((o, i) => (
                      <div key={i} className="flex gap-2">
                        <Textarea
                          className="font-mono text-sm min-h-[60px] flex-1"
                          value={o}
                          onChange={e => {
                            const u = [...acceptedOutputs];
                            u[i] = e.target.value;
                            setAcceptedOutputs(u);
                          }}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => setAcceptedOutputs(acceptedOutputs.filter((_, j) => j !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setAcceptedOutputs([...acceptedOutputs, ""])}>
                      <Plus className="h-4 w-4 mr-1" />Add Alternative
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: Explanation & Hints */}
            <TabsContent value="explanation" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Explanation <span className="text-destructive">*</span></CardTitle>
                  <CardDescription>Required before publishing — explain why the output is what it is</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={explanation}
                    onChange={e => setExplanation(e.target.value)}
                    placeholder="Explain why the output is what it is..."
                    className="min-h-[150px]"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Step-by-Step Reasoning</CardTitle>
                  <CardDescription>Walk through the code execution line by line</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stepByStep.map((s, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs text-muted-foreground mt-2.5 w-5 shrink-0">{i + 1}.</span>
                      <Input value={s} onChange={e => { const u = [...stepByStep]; u[i] = e.target.value; setStepByStep(u); }} placeholder={`Step ${i + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setStepByStep(stepByStep.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setStepByStep([...stepByStep, ""])}>
                    <Plus className="h-4 w-4 mr-1" />Add Step
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Common Mistakes</CardTitle>
                  <CardDescription>Typical errors learners make on this problem</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {commonMistakes.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={s} onChange={e => { const u = [...commonMistakes]; u[i] = e.target.value; setCommonMistakes(u); }} placeholder={`Mistake ${i + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setCommonMistakes(commonMistakes.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setCommonMistakes([...commonMistakes, ""])}>
                    <Plus className="h-4 w-4 mr-1" />Add Mistake
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hints (progressive)</CardTitle>
                  <CardDescription>Shown to learners one at a time before they answer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hints.map((s, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-xs text-muted-foreground mt-2.5 w-5 shrink-0">💡</span>
                      <Input value={s} onChange={e => { const u = [...hints]; u[i] = e.target.value; setHints(u); }} placeholder={`Hint ${i + 1}`} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => setHints(hints.filter((_, j) => j !== i))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setHints([...hints, ""])}>
                    <Plus className="h-4 w-4 mr-1" />Add Hint
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-4 z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: "Code entered", done: !!form.watch("code")?.trim() },
                  { label: "Expected output", done: !!form.watch("expected_output")?.trim() },
                  { label: "Explanation", done: !!explanation?.trim() },
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
                  {isEditing ? "Update Problem" : "Create Problem"}
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
