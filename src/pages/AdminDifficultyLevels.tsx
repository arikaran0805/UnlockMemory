import AdminDifficultyTab from "@/components/admin/AdminDifficultyTab";

const AdminDifficultyLevels = () => {
  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Difficulty Levels</h1>
          <p className="text-muted-foreground">
            Manage and reorder course difficulty levels
          </p>
        </div>
      </div>

      <div className="admin-section-spacing-top" />

      <AdminDifficultyTab />
    </div>
  );
};

export default AdminDifficultyLevels;
