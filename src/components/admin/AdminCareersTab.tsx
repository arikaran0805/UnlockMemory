import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, BookOpen } from "lucide-react";
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this career?")) return;

    try {
      const { error } = await supabase.from("careers").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Career deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error deleting career", description: error.message, variant: "destructive" });
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <Icons.Briefcase className="h-5 w-5" />;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {careers.map((career) => (
          <Card key={career.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${career.color}`}>
                    {getIcon(career.icon)}
                  </div>
                  <div>
                    <span className="block">{career.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">/{career.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/careers/${career.id}`)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(career.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {career.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{career.description}</p>
              )}
              
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {careerSkills[career.id]?.slice(0, 5).map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-xs">
                      {skill.skill_name} ({skill.weight}%)
                    </Badge>
                  ))}
                  {(careerSkills[career.id]?.length || 0) > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{(careerSkills[career.id]?.length || 0) - 5} more
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Courses & Skill Contributions:</p>
                <div className="space-y-2">
                  {careerCourses[career.id]?.slice(0, 3).map((cc) => {
                    const totalContribution = cc.skill_contributions?.reduce((sum, s) => sum + s.contribution, 0) || 0;
                    const avgContribution = cc.skill_contributions?.length ? Math.round(totalContribution / cc.skill_contributions.length) : 0;
                    return (
                      <div key={cc.id} className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {cc.course?.name}
                        </Badge>
                        {cc.skill_contributions?.length > 0 ? (
                          <span className="text-xs text-muted-foreground">
                            {cc.skill_contributions.length} skills · avg {avgContribution}%
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500">No skills mapped</span>
                        )}
                      </div>
                    );
                  })}
                  {(careerCourses[career.id]?.length || 0) > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{(careerCourses[career.id]?.length || 0) - 3} more courses
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminCareersTab;
