/**
 * ViewAsRoleBanner - Persistent banner shown when admin is viewing as another role
 * 
 * Provides clear visual indicator and quick exit from view-as mode.
 */
import { Eye, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useViewAsRole } from "@/contexts/ViewAsRoleContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Platform Manager",
  super_moderator: "Career Manager",
  senior_moderator: "Course Manager",
  moderator: "Content Moderator",
  user: "Learner",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
  super_moderator: "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400",
  senior_moderator: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
  moderator: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
  user: "bg-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-400",
};

const ViewAsRoleBanner = () => {
  const { activeRole } = useAuth();
  const { viewAsRole, isViewingAs, stopViewingAs } = useViewAsRole();
  const navigate = useNavigate();

  // Only show when admin is viewing as another role
  if (activeRole !== "admin" || !isViewingAs || !viewAsRole) {
    return null;
  }

  const handleExit = () => {
    stopViewingAs();
    navigate("/admin/dashboard");
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-2 px-4 border-b flex items-center justify-center gap-3",
        ROLE_COLORS[viewAsRole]
      )}
    >
      <Eye className="h-4 w-4" />
      <span className="text-sm font-medium">
        Viewing as: <strong>{ROLE_LABELS[viewAsRole]}</strong>
      </span>
      <span className="text-xs opacity-70">
        (Your actual role is Platform Manager — database operations use your real permissions)
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 ml-2"
        onClick={handleExit}
      >
        <X className="h-3 w-3 mr-1" />
        Exit
      </Button>
    </div>
  );
};

export default ViewAsRoleBanner;
