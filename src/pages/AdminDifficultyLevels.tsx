import { useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminDifficultyTab, { type AdminDifficultyTabRef } from "@/components/admin/AdminDifficultyTab";

const AdminDifficultyLevels = () => {
  const difficultyTabRef = useRef<AdminDifficultyTabRef>(null);

  return (
    <div className="flex flex-col gap-0">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Difficulty Levels</h1>
          <p className="text-muted-foreground">
            Manage and reorder course difficulty levels
          </p>
        </div>

        <Button onClick={() => difficultyTabRef.current?.openCreateDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New Level
        </Button>
      </div>

      <div className="admin-section-spacing-top" />

      <AdminDifficultyTab ref={difficultyTabRef} />
    </div>
  );
};

export default AdminDifficultyLevels;
