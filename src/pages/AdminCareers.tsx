import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import AdminCareersTab from "@/components/admin/AdminCareersTab";

const AdminCareers = () => {
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: rolesData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .in("role", ["admin", "super_moderator", "moderator"]);

    if (roleError || !rolesData || rolesData.length === 0) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }

    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <>
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Career Paths</h1>
          <p className="text-muted-foreground">Manage learning tracks and career progression paths</p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <AdminCareersTab />
    </div>
    </>
  );
};

export default AdminCareers;