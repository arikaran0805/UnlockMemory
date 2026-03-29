import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Layers } from "lucide-react";
import AdminCoursesTab from "@/components/admin/AdminCoursesTab";
import AdminDifficultyTab from "@/components/admin/AdminDifficultyTab";

const AdminCoursesPanel = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const currentTab = searchParams.get("tab") || "courses";

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    // Moderators should not access the difficulty tab
    if (!isAdmin && currentTab === "difficulty") {
      setSearchParams({ tab: "courses" });
    }
  }, [isAdmin, currentTab, setSearchParams]);

  const checkAdminAccess = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: rolesData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "senior_moderator", "moderator"]);

    if (roleError || !rolesData || rolesData.length === 0) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    setIsAdmin(rolesData.some((r) => r.role === "admin"));
    setLoading(false);
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Courses Panel</h1>
          <p className="text-muted-foreground">Manage all site courses and their difficulty configurations</p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <div className="space-y-6">

        <Tabs value={currentTab} onValueChange={handleTabChange}>
          {isAdmin && (
            <TabsList className="grid w-full max-w-xs grid-cols-2">
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Courses
              </TabsTrigger>
              <TabsTrigger value="difficulty" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Difficulty
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="courses" className="mt-6">
            <AdminCoursesTab />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="difficulty" className="mt-6">
              <AdminDifficultyTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
    </>
  );
};

export default AdminCoursesPanel;
