import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  usePracticeSkill,
  useCreatePracticeSkill,
  useUpdatePracticeSkill,
} from "@/hooks/usePracticeSkills";

const skillSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  description: z.string().optional(),
  icon: z.string().default("Code2"),
  display_order: z.coerce.number().default(0),
  status: z.enum(["draft", "published"]).default("draft"),
});

type SkillFormData = z.infer<typeof skillSchema>;

const iconOptions = [
  "Code2", "Brain", "Database", "BarChart3", "Lightbulb", "Bug", "Target", "Cpu", "Globe", "Terminal"
];

export default function AdminPracticeSkillEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id && id !== "new";

  const { data: skill, isLoading } = usePracticeSkill(isEditing ? id : undefined);
  const createMutation = useCreatePracticeSkill();
  const updateMutation = useUpdatePracticeSkill();

  const form = useForm<SkillFormData>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      icon: "Code2",
      display_order: 0,
      status: "draft",
    },
  });

  useEffect(() => {
    if (skill) {
      form.reset({
        name: skill.name,
        slug: skill.slug,
        description: skill.description || "",
        icon: skill.icon,
        display_order: skill.display_order,
        status: skill.status as "draft" | "published",
      });
    }
  }, [skill, form]);

  const onSubmit = async (data: SkillFormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({ id, ...data });
    } else {
      await createMutation.mutateAsync({
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        display_order: data.display_order,
        status: data.status,
      });
    }
    navigate("/admin/practice/skills");
  };

  const handleNameChange = (name: string) => {
    form.setValue("name", name);
    if (!isEditing) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      form.setValue("slug", slug);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="flex flex-col gap-0">
        <Skeleton className="h-10 w-48" />
        <div className="admin-section-spacing-top" />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {isEditing ? "Edit Practice Skill" : "Create Practice Skill"}
        </h1>
        <p className="text-muted-foreground">
          {isEditing ? "Update skill details" : "Add a new skill category"}
        </p>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Skill Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="e.g., Algorithms"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., algorithms" />
                    </FormControl>
                    <FormDescription>Used in URLs. Lowercase letters, numbers, and hyphens only.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Brief description of this skill category" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon} value={icon}>
                              {icon}
                            </SelectItem>
                          ))}
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

              {/* Live toggle */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => {
                  const isLive = field.value === "published";
                  return (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <FormLabel className="text-sm font-semibold leading-none cursor-pointer">
                            Publish to Practice Lab
                          </FormLabel>
                          <p className="text-[12.5px] text-muted-foreground mt-1">
                            {isLive
                              ? "Learners can see and practise this skill"
                              : "Hidden from learners — switch on to make it live"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <FormControl>
                            <Switch
                              checked={isLive}
                              onCheckedChange={(checked) => field.onChange(checked ? "published" : "draft")}
                              className="h-[18px] w-[32px] data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-muted-foreground/30"
                            />
                          </FormControl>
                          <span className={`text-[12px] font-semibold leading-none transition-colors duration-200 ${isLive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                            {isLive ? "Live" : "Draft"}
                          </span>
                          {isLive && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                            </span>
                          )}
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/practice/skills")}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="gap-2">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              <Save className="h-4 w-4" />
              {isEditing ? "Update Skill" : "Create Skill"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  </div>
);
}
