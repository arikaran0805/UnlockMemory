import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRoleScope } from "@/hooks/useRoleScope";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2, GraduationCap, BookOpen, Briefcase } from "lucide-react";
import * as Icons from "lucide-react";

interface Career {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: string;
}

interface Team {
  id: string;
  name: string;
  career_id: string;
  courseCount: number;
  memberCount: number;
}

interface CareerWithTeams {
  career: Career;
  teams: Team[];
  courseCount: number;
}

export default function SuperModeratorMyAssets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { careerIds, teamIds, loading: scopeLoading } = useRoleScope();
  const [assets, setAssets] = useState<CareerWithTeams[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!scopeLoading) fetchAssets();
  }, [scopeLoading]);

  const fetchAssets = async () => {
    if (careerIds.length === 0) {
      setAssets([]);
      setLoading(false);
      return;
    }

    try {
      const { data: careers, error: careersError } = await supabase
        .from("careers")
        .select("id, name, slug, description, icon, color, status")
        .in("id", careerIds)
        .order("name");

      if (careersError) throw careersError;

      const enriched: CareerWithTeams[] = await Promise.all(
        (careers || []).map(async (career) => {
          // Get teams for this career that are in the scoped teamIds
          let teamsQuery = supabase
            .from("teams")
            .select("id, name, career_id")
            .eq("career_id", career.id)
            .is("archived_at", null)
            .order("name");

          if (teamIds.length > 0) {
            teamsQuery = teamsQuery.in("id", teamIds);
          }

          const { data: teamsData } = await teamsQuery;

          const teams: Team[] = await Promise.all(
            (teamsData || []).map(async (team) => {
              const { count: courseCount } = await supabase
                .from("course_assignments")
                .select("*", { count: "exact", head: true })
                .eq("team_id", team.id);

              const { count: memberCount } = await supabase
                .from("course_assignments")
                .select("*", { count: "exact", head: true })
                .eq("team_id", team.id);

              return {
                ...team,
                courseCount: courseCount || 0,
                memberCount: memberCount || 0,
              };
            })
          );

          // Career-level course count via career_courses
          const { count: courseCount } = await supabase
            .from("career_courses")
            .select("*", { count: "exact", head: true })
            .eq("career_id", career.id);

          return { career, teams, courseCount: courseCount || 0 };
        })
      );

      setAssets(enriched);
    } catch (error: any) {
      toast({ title: "Error loading assets", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getCareerIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-5 w-5 text-white" /> : null;
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Assets</h1>
        <p className="text-muted-foreground">Your assigned careers and teams</p>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-8">
        {loading || scopeLoading ? (
          <div className="space-y-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, j) => (
                    <Skeleton key={j} className="h-36 rounded-xl" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : assets.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="text-center py-16">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium mb-1">No assets assigned</p>
              <p className="text-muted-foreground text-sm">Contact an admin to assign careers to your account.</p>
            </CardContent>
          </Card>
        ) : (
          assets.map(({ career, teams, courseCount }) => (
            <div key={career.id} className="space-y-4">
              {/* Career Header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: career.color || "hsl(var(--primary))" }}
                >
                  {getCareerIcon(career.icon) || (
                    <span className="text-white font-bold text-sm">{career.name[0]}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-foreground">{career.name}</h2>
                  {getStatusBadge(career.status)}
                </div>
                <div className="flex items-center gap-3 ml-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {courseCount} courses
                  </span>
                  <span className="flex items-center gap-1">
                    <Users2 className="h-3.5 w-3.5" />
                    {teams.length} team{teams.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Team Cards */}
              {teams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <Card
                      key={team.id}
                      className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => navigate(`/super-moderator/team-ownership?edit=${team.id}`)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: career.color || "hsl(var(--primary))" }}
                          >
                            <Users2 className="h-4 w-4 text-white" />
                          </div>
                          <CardTitle className="text-base">{team.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {team.courseCount} courses
                          </span>
                          <span className="flex items-center gap-1">
                            <Users2 className="h-3.5 w-3.5" />
                            {team.memberCount} members
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Click to manage team</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pl-1">No teams assigned for this career.</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
