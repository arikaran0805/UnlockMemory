import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useViewAsRole } from "@/contexts/ViewAsRoleContext";

interface SeniorModeratorGuardProps {
  children: ReactNode;
}

const SeniorModeratorGuard = ({ children }: SeniorModeratorGuardProps) => {
  const { activeRole, isLoading, isAuthenticated, userId } = useAuth();
  const { viewAsRole, isViewingAs } = useViewAsRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Verifying access...</div>
      </div>
    );
  }

  if (!isAuthenticated || !userId) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (activeRole === "admin" && isViewingAs && viewAsRole === "senior_moderator") {
    return <>{children}</>;
  }

  if (activeRole !== "senior_moderator") {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SeniorModeratorGuard;
