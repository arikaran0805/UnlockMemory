import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, MoreHorizontal, Code2, FileText, Link2, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { usePracticeSkills, useDeletePracticeSkill, PracticeSkill } from "@/hooks/usePracticeSkills";

interface SkillCardProps {
  skill: PracticeSkill;
  isCustom: boolean;
  onEdit: () => void;
  onManageProblems: () => void;
  onDelete: () => void;
  onViewCourse?: () => void;
  getStatusBadge: (status: string) => JSX.Element;
}

function SkillCard({ skill, isCustom, onEdit, onManageProblems, onDelete, onViewCourse, getStatusBadge }: SkillCardProps) {
  return (
    <Card className={`group hover:shadow-md transition-all ${isCustom ? 'hover:border-amber-500/30 border-amber-500/10' : 'hover:border-primary/30'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isCustom ? 'bg-amber-500/10' : 'bg-primary/10'}`}>
              {isCustom ? (
                <Sparkles className="h-5 w-5 text-amber-500" />
              ) : (
                <Code2 className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <CardTitle className="text-base">{skill.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{skill.slug}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
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
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {skill.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{skill.description}</p>
        )}
        {isCustom ? (
          <div className="flex items-center gap-1.5 mb-3 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400 font-medium">Custom Collection</span>
          </div>
        ) : skill.course_name && onViewCourse ? (
          <div className="flex items-center gap-1.5 mb-3 text-xs">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Linked to:</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-medium"
              onClick={onViewCourse}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              {skill.course_name}
            </Button>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusBadge(skill.status)}
            <span className="text-xs text-muted-foreground">{skill.problem_count || 0} problems</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onManageProblems}
            className="gap-1.5 text-xs"
          >
            <Eye className="h-3.5 w-3.5" />
            Problems
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPracticeSkills() {
  const navigate = useNavigate();
  const { data: skills, isLoading } = usePracticeSkills();
  const deleteMutation = useDeletePracticeSkill();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Published</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Practice Skills</h1>
          <p className="text-muted-foreground">Manage practice skill categories</p>
        </div>
        <Button onClick={() => navigate("/admin/practice/skills/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Skill
        </Button>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      ) : skills && skills.length > 0 ? (
        <>
          {/* Custom Skills Section */}
          {skills.filter(s => !s.course_id).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-muted-foreground">Custom Problem Collections</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.filter(s => !s.course_id).map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    isCustom
                    onEdit={() => navigate(`/admin/practice/skills/${skill.id}`)}
                    onManageProblems={() => navigate(`/admin/practice/skills/${skill.id}/problems`)}
                    onDelete={() => setDeleteId(skill.id)}
                    onViewCourse={skill.course_id ? () => navigate(`/admin/courses/${skill.course_id}`) : undefined}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Course-Linked Skills Section */}
          {skills.filter(s => s.course_id).length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-muted-foreground">Course-Linked Skills</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.filter(s => s.course_id).map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    isCustom={false}
                    onEdit={() => navigate(`/admin/practice/skills/${skill.id}`)}
                    onManageProblems={() => navigate(`/admin/practice/skills/${skill.id}/problems`)}
                    onDelete={() => setDeleteId(skill.id)}
                    onViewCourse={() => navigate(`/admin/courses/${skill.course_id}`)}
                    getStatusBadge={getStatusBadge}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <Card className="bg-muted/30">
          <CardContent className="text-center py-12">
            <Code2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No practice skills yet.</p>
            <Button
              variant="link"
              onClick={() => navigate("/admin/practice/skills/new")}
              className="mt-2"
            >
              Create your first skill
            </Button>
          </CardContent>
        </Card>
      )}

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
