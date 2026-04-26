import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoleScope } from "@/hooks/useRoleScope";
import {
  Plus, Pencil, Trash2, Eye, MoreHorizontal,
  Code2, FileText, Link2, BookOpen, Sparkles, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePracticeSkills,
  useDeletePracticeSkill,
  useUpdatePracticeSkill,
  PracticeSkill,
} from "@/hooks/usePracticeSkills";
import { toast } from "sonner";

/* ─── SkillCard ──────────────────────────────────────────────────────── */

interface SkillCardProps {
  skill: PracticeSkill;
  isCustom: boolean;
  onEdit: () => void;
  onManageProblems: () => void;
  onDelete?: () => void;
  onViewCourse?: () => void;
  onToggleLive: (id: string, live: boolean) => void;
  isToggling: boolean;
}

function SkillCard({
  skill,
  isCustom,
  onEdit,
  onManageProblems,
  onDelete,
  onViewCourse,
  onToggleLive,
  isToggling,
}: SkillCardProps) {
  const isLive = skill.status === "published";

  return (
    <div className="group flex flex-col bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-border/80">

      {/* ── Body ── */}
      <div className="flex flex-col gap-3 p-5 flex-1">

        {/* Identity row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCustom ? "bg-amber-500/10" : "bg-primary/10"}`}>
              {isCustom
                ? <Sparkles className="h-4 w-4 text-amber-500" />
                : <Code2 className="h-4 w-4 text-primary" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-foreground leading-snug truncate">{skill.name}</p>
              <p className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{skill.slug}</p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-all duration-150">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageProblems}>
                <FileText className="h-4 w-4 mr-2" />
                Manage Problems
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        {skill.description && (
          <p className="text-[12.5px] font-light text-muted-foreground leading-relaxed line-clamp-2">
            {skill.description}
          </p>
        )}

        {/* Type label */}
        {isCustom ? (
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span className="text-[11.5px] font-medium text-amber-600 dark:text-amber-400">Custom Collection</span>
          </div>
        ) : skill.course_name && onViewCourse ? (
          <div className="flex items-center gap-1.5">
            <Link2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11.5px] text-muted-foreground">Linked to:</span>
            <button
              onClick={onViewCourse}
              className="text-[11.5px] font-medium text-primary hover:underline flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" />
              {skill.course_name}
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30 gap-3">

        {/* Left: Live toggle + problem count */}
        <div className="flex items-center gap-3 min-w-0">

          {/* Toggle group */}
          <div className="flex items-center gap-2">
            {isToggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <Switch
                checked={isLive}
                onCheckedChange={(checked) => onToggleLive(skill.id, checked)}
                disabled={isToggling}
                className="h-[18px] w-[32px] data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-muted-foreground/30"
              />
            )}

            <span
              className={`text-[11.5px] font-semibold transition-colors duration-200 ${
                isLive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              }`}
            >
              {isLive ? "Live" : "Draft"}
            </span>

            {/* Pulsing dot when live */}
            {isLive && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            )}
          </div>

          {/* Divider */}
          <span className="w-px h-4 bg-border/60 shrink-0" />

          {/* Problem count */}
          <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">
            {skill.problem_count || 0} problems
          </span>
        </div>

        {/* Right: Problems button */}
        <button
          onClick={onManageProblems}
          className="flex items-center gap-1.5 text-[12px] font-medium text-foreground bg-background border border-border rounded-lg px-3 py-1.5 transition-all duration-150 hover:border-primary/40 hover:text-primary shrink-0"
        >
          <Eye className="h-3.5 w-3.5" />
          Problems
        </button>
      </div>

    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */

export default function AdminPracticeSkills() {
  const navigate = useNavigate();
  const { data: skills, isLoading } = usePracticeSkills();
  const deleteMutation = useDeletePracticeSkill();
  const updateMutation = useUpdatePracticeSkill();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { role, courseIds } = useRoleScope();
  const isAdmin = role === "admin";
  const isSuperMod = role === "super_moderator";
  const canManageLabs = isAdmin || isSuperMod;

  // Scope skills for non-admin roles
  const scopedSkills = !isAdmin && skills
    ? skills.filter((s) => !s.course_id || courseIds.includes(s.course_id))
    : skills;

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggleLive = async (id: string, live: boolean) => {
    setTogglingId(id);
    try {
      await updateMutation.mutateAsync({ id, status: live ? "published" : "draft" });
      const skill = skills?.find((s) => s.id === id);
      toast.success(
        live
          ? `"${skill?.name}" is now live — learners can see it`
          : `"${skill?.name}" moved to draft`,
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-0">
      {/* Page header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Practice Skills</h1>
          <p className="text-muted-foreground">Manage practice skill categories</p>
        </div>
        {canManageLabs && (
          <Button onClick={() => navigate("/admin/practice/skills/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Skill
          </Button>
        )}
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        ) : scopedSkills && scopedSkills.length > 0 ? (
          <>
            {/* Custom Collections */}
            {scopedSkills.filter((s) => !s.course_id).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Custom Problem Collections</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scopedSkills.filter((s) => !s.course_id).map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isCustom
                      onEdit={() => navigate(`/admin/practice/skills/${skill.id}`)}
                      onManageProblems={() => navigate(`/admin/practice/skills/${skill.id}/problems`)}
                      onDelete={canManageLabs ? () => setDeleteId(skill.id) : undefined}
                      onViewCourse={skill.course_id ? () => navigate(`/admin/courses/${skill.course_id}`) : undefined}
                      onToggleLive={handleToggleLive}
                      isToggling={togglingId === skill.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Course-Linked Skills */}
            {scopedSkills.filter((s) => s.course_id).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-muted-foreground">Course-Linked Skills</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scopedSkills.filter((s) => s.course_id).map((skill) => (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isCustom={false}
                      onEdit={() => navigate(`/admin/practice/skills/${skill.id}`)}
                      onManageProblems={() => navigate(`/admin/practice/skills/${skill.id}/problems`)}
                      onDelete={canManageLabs ? () => setDeleteId(skill.id) : undefined}
                      onViewCourse={() => navigate(`/admin/courses/${skill.course_id}`)}
                      onToggleLive={handleToggleLive}
                      isToggling={togglingId === skill.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="relative overflow-hidden rounded-2xl border-primary/15 bg-gradient-to-b from-primary/[0.035] via-background to-background">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle at top, rgba(34, 197, 94, 0.08), transparent 36%), linear-gradient(rgba(34, 197, 94, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.05) 1px, transparent 1px)",
                backgroundSize: "100% 100%, 24px 24px, 24px 24px",
              }}
            />
            <CardContent className="relative flex min-h-[360px] items-center justify-center px-6 py-16 sm:px-10 sm:py-20">
              <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/15 bg-primary/10 shadow-sm shadow-primary/5">
                  <Code2 className="h-9 w-9 text-primary/70" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                  No practice skills yet
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-[15px]">
                  Start by creating your first skill to organise learning, practice, and progression more clearly.
                </p>
                {canManageLabs && (
                  <Button
                    onClick={() => navigate("/admin/practice/skills/new")}
                    className="mt-8 h-11 rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/15 hover:bg-primary/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first skill
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Practice Skill</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this skill and all its problems. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </div>
  );
}
