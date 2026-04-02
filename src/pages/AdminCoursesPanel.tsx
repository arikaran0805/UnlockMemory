import AdminCoursesTab from "@/components/admin/AdminCoursesTab";

const AdminCoursesPanel = () => {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground">Manage all site courses</p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <AdminCoursesTab />
    </div>
  );
};

export default AdminCoursesPanel;
