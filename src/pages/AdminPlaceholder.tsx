import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface AdminPlaceholderProps {
  title: string;
  description: string;
}

const AdminPlaceholder = ({ title, description }: AdminPlaceholderProps) => {
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

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          </div>
        </div>
        
        <Card className="max-w-2xl mx-auto mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center text-primary">
              <Construction className="h-6 w-6" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">{description}</p>
            <p className="text-sm text-muted-foreground mt-4">
              This module is under development and will be available soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminPlaceholder;
