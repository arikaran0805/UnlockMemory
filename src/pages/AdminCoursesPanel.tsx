import { useNavigate } from "react-router-dom";
import { useRoleScope } from "@/hooks/useRoleScope";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminCoursesTab from "@/components/admin/AdminCoursesTab";

const AdminCoursesPanel = () => {
  const navigate = useNavigate();
  const { role } = useRoleScope();

  const canCreateCourse = role === "admin" || role === "super_moderator";
  const newCoursePath = role === "super_moderator"
    ? "/super-moderator/courses/new"
    : "/admin/courses/new";

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground">Manage and organize learning paths and course content</p>
        </div>
        {canCreateCourse && (
          <Button onClick={() => navigate(newCoursePath)}>
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Button>
        )}
      </div>

      <div className="admin-section-spacing-top" />

      <AdminCoursesTab />
    </div>
  );
};

export default AdminCoursesPanel;
