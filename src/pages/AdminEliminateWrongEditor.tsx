/**
 * AdminEliminateWrongEditor
 * Admin page for creating/editing "Eliminate the Wrong Answer" problems.
 */
import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Save, Loader2, Plus, X, Check, Trash2, Lock,
  Settings, FileText, ListChecks, MessageSquare, GripVertical,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useEliminateWrongProblem,
  useCreateEliminateWrongProblem,
  useUpdateEliminateWrongProblem,
  useDeleteEliminateWrongProblem,
  type EliminateWrongOption,
} from "@/hooks/useEliminateWrongProblems";
import { usePracticeSkill } from "@/hooks/usePracticeSkills";
import { useUserRole } from "@/hooks/useUserRole";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const LANGUAGES = ["python", "javascript", "java", "sql", "c", "cpp", "r", "csharp", "typescript"];
const SUGGESTED_TAGS = ["reasoning", "debugging", "conceptual", "syntax", "logic", "output-tracing", "edge-case", "type-system", "scope", "operator"];

const formSchema = z.object({
  title: z.string().min(1, "Title required").max(80, "Max 80 characters"),
  slug: z.string().min(1, "Slug required").regex(/^[a-z0-9-]+$/, "Lowercase with hyphens"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  language: z.string().min(1, "Language required"),
  status: z.enum(["draft", "published"]).default("draft"),
  is_premium: z.boolean().default(false),
  display_order: z.coerce.number().default(0),
  selection_mode: z.enum(["single", "multiple"]).default("single"),
});

type FormData = z.infer<typeof formSchema>;
type TabId = "metadata" | "content" | "options" | "settings";

function createEmptyOption(): EliminateWrongOption {
  return {
    id: crypto.randomUUID(),
    label: "",
    content: "",
    content_type: "text",
    is_correct: false,
    explanation: "",
  };
}

export default function AdminEliminateWrongEditor() {
  const { skillId, problemId } = useParams<{ skillId: string; problemId: string }>();
  const navigate = useNavigate();
  const isEditing = !!problemId && problemId !== "new";
  const isMobile = useIsMobile();
  const { isAdmin } = useUserRole();

  const { data: skill } = usePracticeSkill(skillId);
  const { data: problem, isLoading } = useEliminateWrongProblem(isEditing ? problemId : undefined);
  const createMutation = useCreateEliminateWrongProblem();
  const updateMutation = useUpdateEliminateWrongProblem();
  const deleteMutation = useDeleteEliminateWrongProblem();

  const [activeTab, setActiveTab] = useState<TabId>("metadata");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [description, setDescription] = useState("");
  const [contextCode, setContextCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<EliminateWrongOption[]>([createEmptyOption(), createEmptyOption(), createEmptyOption(), createEmptyOption()]);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [allowPartialCredit, setAllowPartialCredit] = useState(false);
  const [allowRetry, setAllowRetry] = useState(true);
  const [hints, setHints] = useState<string[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "", slug: "", difficulty: "Easy", language: "python",
      status: "draft", is_premium: false, display_order: 0, selection_mode: "single",
    },
  });

  useEffect(() => {
    if (problem) {
      form.reset({
        title: problem.title, slug: problem.slug, difficulty: problem.difficulty as any,
        language: problem.language, status: problem.status as "draft" | "published",
        is_premium: problem.is_premium, display_order: problem.display_order,
        selection_mode: problem.selection_mode,
      });
      setTags(problem.tags);
      setDescription(problem.description);
      setContextCode(problem.context_code);
      setExplanation(problem.explanation);
      setOptions(problem.options.length > 0 ? problem.options : [createEmptyOption(), createEmptyOption(), createEmptyOption(), createEmptyOption()]);
      setShuffleOptions(problem.shuffle_options);
      setAllowPartialCredit(problem.allow_partial_credit);
      setAllowRetry(problem.allow_retry);
      setHints(problem.hints);
    }
  }, [problem, form]);

  const handleTitleChange = (title: string) => {
    form.setValue("title", title);
    if (!isEditing) {
      form.setValue("slug", title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-"));
    }
  };

  const correctCount = options.filter((o) => o.is_correct).length;

  const canPublish = useMemo(() => {
    const vals = form.getValues();
    return !!vals.title?.trim() && !!description.trim() && options.length >= 2 && correctCount >= 1
      && options.every((o) => o.content.trim() && o.explanation.trim());
  }, [form.watch("title"), description, options, correctCount]);

  const onSubmit = async (data: FormData) => {
    if (data.status === "published" && !canPublish) return;

    const payload = {
      ...data,
      skill_id: skillId!,
      tags,
      description,
      context_code: contextCode,
      explanation,
      options: options as any,
      shuffle_options: shuffleOptions,
      allow_partial_credit: allowPartialCredit,
      allow_retry: allowRetry,
      hints,
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

  const addOption = () => setOptions([...options, createEmptyOption()]);
  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));
  const updateOption = (idx: number, field: keyof EliminateWrongOption, value: any) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], [field]: value };
    setOptions(updated);
  };

  const addHint = () => setHints([...hints, ""]);
  const updateHint = (index: number, value: string) => { const u = [...hints]; u[index] = value; setHints(u); };
  const removeHint = (index: number) => setHints(hints.filter((_, i) => i !== index));

  // Tab validation
  const tabValidation = useMemo(() => {
    const v = form.getValues();
    const fe = form.formState.errors;
    const metaOk = !!v.title?.trim() && !!v.slug?.trim();
    const contentOk = !!description.trim();
    const optionsOk = options.length >= 2 && correctCount >= 1 && options.every((o) => o.content.trim());
    return {
      metadata: { complete: metaOk && !fe.title && !fe.slug, hasErrors: !!fe.title || !!fe.slug || !metaOk },
      content: { complete: contentOk, hasErrors: !contentOk },
      options: { complete: optionsOk, hasErrors: !optionsOk },
      settings: { complete: true, hasErrors: false },
    };
  }, [form.watch(), description, options, correctCount]);

  if (isEditing && isLoading) {
    return (
      <div className="flex flex-col gap-0">
        <div className="admin-section-spacing-top" />
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card><CardContent className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent></Card>
        </div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode; mobileLabel: string }[] = [
    { id: "metadata", label: "Problem Setup", icon: <Settings className="h-4 w-4" />, mobileLabel: "Setup" },
    { id: "content", label: "Prompt & Code", icon: <FileText className="h-4 w-4" />, mobileLabel: "Content" },
    { id: "options", label: "Answer Options", icon: <ListChecks className="h-4 w-4" />, mobileLabel: "Options" },
    { id: "settings", label: "Behavior & Hints", icon: <MessageSquare className="h-4 w-4" />, mobileLabel: "Settings" },
  ];

  const TabIndicator = ({ tabId }: { tabId: TabId }) => {
    const validation = tabValidation[tabId];
    if (validation.complete) return <Check className="h-3 w-3 text-primary" />;
    if (validation.hasErrors) return <span className="h-2 w-2 rounded-full bg-destructive" />;
    return null;
  };

  const OPTION_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{isEditing ? "Edit" : "Create"} Eliminate the Wrong Answer</h1>
          <p className="text-muted-foreground">{skill?.name} &gt; {isEditing ? "Edit" : "New Problem"}</p>
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
                  <AlertDialogDescription>This will permanently delete this problem.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-6">
              <TabsList className="inline-flex h-12 items-center justify-center rounded-full bg-muted/60 p-1.5 text-muted-foreground">
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                    {tab.icon}
                    <span className={isMobile ? "" : "hidden sm:inline"}>{isMobile ? tab.mobileLabel : tab.label}</span>
                    <TabIndicator tabId={tab.id} />
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ═══ TAB 1: METADATA ═══ */}
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
                      <FormControl><Input {...field} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Which output is correct?" maxLength={80} /></FormControl>
                      <FormDescription>{field.value?.length || 0}/80</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="slug" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug</FormLabel>
                        <FormControl><Input {...field} placeholder="which-output-is-correct" disabled={isEditing} /></FormControl>
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
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="language" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language / Topic</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {LANGUAGES.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="selection_mode" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selection Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="single">Single correct answer</SelectItem>
                            <SelectItem value="multiple">Multiple correct answers</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Add tag..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag(tagInput))} />
                      <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).slice(0, 6).map((tag) => (
                        <button key={tag} type="button" onClick={() => addTag(tag)} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground transition-colors">
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <FormField control={form.control} name="display_order" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
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
            </TabsContent>

            {/* ═══ TAB 2: CONTENT ═══ */}
            <TabsContent value="content" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Problem Prompt</CardTitle>
                  <CardDescription>Describe what the learner must identify or eliminate. Do not reveal the answer.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Given the following function, which of the options correctly describes its behavior when called with an empty list?"
                    rows={6}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Context Code (Optional)</CardTitle>
                  <CardDescription>Read-only code shown to learners as reference material</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={contextCode}
                    onChange={(e) => setContextCode(e.target.value)}
                    placeholder="def process(items):&#10;    result = []&#10;    for item in items:&#10;        result.append(item * 2)&#10;    return result"
                    rows={12}
                    className="font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ TAB 3: OPTIONS ═══ */}
            <TabsContent value="options" className="space-y-6 mt-0">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Answer Options</CardTitle>
                    <CardDescription>
                      {correctCount} correct option{correctCount !== 1 ? "s" : ""} marked.
                      {options.some((o) => !o.explanation.trim()) && (
                        <span className="text-destructive ml-2">Explanations required for all options.</span>
                      )}
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={options.length >= 8}>
                    <Plus className="h-4 w-4 mr-1" />Add Option
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {options.map((option, idx) => (
                    <div key={option.id} className={cn(
                      "border rounded-xl p-4 space-y-3 transition-colors",
                      option.is_correct ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold",
                            option.is_correct ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                          )}>
                            {OPTION_LABELS[idx]}
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={option.is_correct}
                              onCheckedChange={(checked) => updateOption(idx, "is_correct", checked)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {option.is_correct ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={option.content_type} onValueChange={(v) => updateOption(idx, "content_type", v)}>
                            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="code">Code</SelectItem>
                              <SelectItem value="output">Output</SelectItem>
                            </SelectContent>
                          </Select>
                          {options.length > 2 && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeOption(idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <Textarea
                        value={option.content}
                        onChange={(e) => updateOption(idx, "content", e.target.value)}
                        placeholder={option.content_type === "code" ? "print(result)" : option.content_type === "output" ? "[2, 4, 6]" : "This function returns a new list with doubled values"}
                        rows={3}
                        className={option.content_type !== "text" ? "font-mono text-sm" : "text-sm"}
                      />

                      <Textarea
                        value={option.explanation}
                        onChange={(e) => updateOption(idx, "explanation", e.target.value)}
                        placeholder={option.is_correct ? "Why this is correct..." : "Why this is wrong..."}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Overall Explanation */}
              <Card>
                <CardHeader>
                  <CardTitle>Overall Explanation (Optional)</CardTitle>
                  <CardDescription>Shown after submission with a detailed breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="The key insight here is that..."
                    rows={4}
                    className="text-sm"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ TAB 4: SETTINGS ═══ */}
            <TabsContent value="settings" className="space-y-6 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Behavior Settings</CardTitle>
                  <CardDescription>Configure how options are presented and scored</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>Shuffle Options</Label>
                      <p className="text-xs text-muted-foreground">Randomize option order for each learner</p>
                    </div>
                    <Switch checked={shuffleOptions} onCheckedChange={setShuffleOptions} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>Allow Partial Credit</Label>
                      <p className="text-xs text-muted-foreground">Score partially correct multi-select answers</p>
                    </div>
                    <Switch checked={allowPartialCredit} onCheckedChange={setAllowPartialCredit} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label>Allow Retry</Label>
                      <p className="text-xs text-muted-foreground">Let learners try again after an incorrect answer</p>
                    </div>
                    <Switch checked={allowRetry} onCheckedChange={setAllowRetry} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Hints (Optional)</CardTitle>
                    <CardDescription>Progressive hints to guide struggling learners</CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addHint}>
                    <Plus className="h-4 w-4 mr-1" />Add Hint
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hints.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">No hints added yet.</p>
                  )}
                  {hints.map((hint, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-2 shrink-0 text-xs">#{idx + 1}</Badge>
                      <Textarea value={hint} onChange={(e) => updateHint(idx, e.target.value)} rows={2} className="flex-1 text-sm" placeholder="Think about what happens when..." />
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive mt-1" onClick={() => removeHint(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-background border-t pt-4 pb-4 z-10">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: "Title", done: !!form.watch("title")?.trim() },
                  { label: "Description", done: !!description?.trim() },
                  { label: "2+ options", done: options.length >= 2 },
                  { label: "Correct answer", done: correctCount >= 1 },
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
  );
}
