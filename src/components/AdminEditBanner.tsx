import { AlertTriangle, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PostVersion } from "@/hooks/usePostVersions";
import { format } from "date-fns";

interface AdminEditBannerProps {
  lastAdminEdit: PostVersion;
  onViewChanges: () => void;
  onDismiss: () => void;
}

const AdminEditBanner = ({
  lastAdminEdit,
  onViewChanges,
  onDismiss,
}: AdminEditBannerProps) => {
  return (
    <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30 mb-4">
      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
        This post was updated by an Admin
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <div className="flex items-center justify-between flex-wrap gap-2 mt-2">
          <div className="text-sm">
            <span className="font-medium">
              {lastAdminEdit.editor_profile?.full_name || lastAdminEdit.editor_profile?.email || "Admin"}
            </span>
            {" "}made changes on{" "}
            <span className="font-medium">
              {format(new Date(lastAdminEdit.created_at), "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onViewChanges}
              className="gap-1 border-amber-500 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900"
            >
              <Eye className="h-3 w-3" />
              View Changes
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-amber-600 hover:text-amber-800 dark:text-amber-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default AdminEditBanner;
