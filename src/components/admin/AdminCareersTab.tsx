import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { Pencil, Trash2, BookOpen, Target } from "lucide-react";
import * as Icons from "lucide-react";

interface Career {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  display_order: number;
}

interface CareerSkill {
  id: string;
  career_id: string;
  skill_name: string;
  display_order: number;
  weight: number;
}

interface SkillContribution {
  skill_name: string;
  contribution: number;
}

interface CareerCourse {
  id: string;
  career_id: string;
  course_id: string;
  skill_contributions: SkillContribution[];
  course?: {
    id: string;
    name: string;
    slug: string;
  };
}

const AdminCareersTab = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [careers, setCareers] = useState<Career[]>([]);
  const [careerSkills, setCareerSkills] = useState<Record<string, CareerSkill[]>>({});
  const [careerCourses, setCareerCourses] = useState<Record<string, CareerCourse[]>>({});
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [careerToDelete, setCareerToDelete] = useState<Career | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [careersRes, skillsRes, careerCoursesRes] = await Promise.all([
        supabase.from("careers").select("*").order("display_order"),
        supabase.from("career_skills").select("*").order("display_order"),
        supabase.from("career_courses").select("*, course:course_id(id, name, slug)"),
      ]);

      if (careersRes.error) throw careersRes.error;
      
      setCareers(careersRes.data || []);

      // Group skills by career
      const skillsByCareer: Record<string, CareerSkill[]> = {};
      (skillsRes.data || []).forEach(skill => {
        if (!skillsByCareer[skill.career_id]) {
          skillsByCareer[skill.career_id] = [];
        }
        skillsByCareer[skill.career_id].push(skill);
      });
      setCareerSkills(skillsByCareer);

      // Group courses by career with skill contributions
      const coursesByCareer: Record<string, CareerCourse[]> = {};
      (careerCoursesRes.data || []).forEach(cc => {
        if (!coursesByCareer[cc.career_id]) {
          coursesByCareer[cc.career_id] = [];
        }
        const skillContributions = Array.isArray(cc.skill_contributions) 
          ? (cc.skill_contributions as unknown as SkillContribution[])
          : [];
        coursesByCareer[cc.career_id].push({
          id: cc.id,
          career_id: cc.career_id,
          course_id: cc.course_id,
          skill_contributions: skillContributions,
          course: cc.course,
        });
      });
      setCareerCourses(coursesByCareer);
    } catch (error: any) {
      toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (career: Career) => {
    setCareerToDelete(career);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!careerToDelete) return;
    try {
      const { error } = await supabase.from("careers").delete().eq("id", careerToDelete.id);
      if (error) throw error;
      toast({ title: "Career deleted successfully" });
      setDeleteDialogOpen(false);
      setCareerToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error deleting career", description: error.message, variant: "destructive" });
    }
  };

  const getIcon = (iconName: string, size = "h-9 w-9") => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className={size} /> : <Icons.Briefcase className={size} />;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {careers.map((career) => (
          <div
            key={career.id}
            className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm group"
          >
            {/* ── Color band ── */}
            <div className={`relative h-24 flex items-center justify-center overflow-hidden ${career.color}`}>
              {/* Edit / Delete — fade in on hover */}
              <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                <button
                  onClick={() => navigate(`/admin/careers/${career.id}?name=${encodeURIComponent(career.name)}`)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5 opacity-60" />
                </button>
                <button
                  onClick={() => handleDeleteClick(career)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-black/10 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive opacity-70" />
                </button>
              </div>

              {/* Large icon */}
              <div className="opacity-80">
                {getIcon(career.icon)}
              </div>
            </div>

            {/* ── Card body ── */}
            <div className="p-5">
              {/* Name + slug */}
              <div className="mb-3">
                <h3 className="font-semibold text-base text-foreground leading-tight">{career.name}</h3>
                <span className="text-xs text-muted-foreground">/{career.slug}</span>
              </div>

              {/* Description */}
              {career.description ? (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                  {career.description}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground/50 italic mb-4">No description</p>
              )}

              {/* ── Stats row ── */}
              <div className="flex items-center gap-5 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {careerCourses[career.id]?.length || 0}
                    </span>{" "}
                    Courses
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {careerSkills[career.id]?.length || 0}
                    </span>{" "}
                    Skills
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this career?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-foreground">"{careerToDelete?.name}"</span>{" "}
              and all its associated skills and course mappings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Career
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCareersTab;
