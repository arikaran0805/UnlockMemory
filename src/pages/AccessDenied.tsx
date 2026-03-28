import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX, Home, ArrowLeft, LogIn } from "lucide-react";
import { useAuth, getRoleDashboardPath, AppRole } from "@/hooks/useAuth";

/**
 * AccessDenied / Unauthorized Page
 * 
 * Shown when:
 * - User tries to access a role-protected route without proper activeRole
 * - Cross-role access is attempted (e.g., admin trying to access /moderator/*)
 * 
 * SECURITY: Does not expose what role is required, only shows user's current role
 */
const AccessDenied = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRole, isAuthenticated, userId } = useAuth();

  // Get the role-appropriate dashboard path
  const getDashboardPath = (): string => {
    return getRoleDashboardPath(activeRole);
  };

  // Format role name for display
  const formatRoleName = (role: AppRole | null): string => {
    if (!role) return "Learner";
    const labels: Record<string, string> = {
      admin: "Platform Manager",
      super_moderator: "Career Manager",
      senior_moderator: "Course Manager",
      moderator: "Content Moderator",
      user: "Learner",
    };
    return labels[role] || "Learner";
  };

  // Determine which role route was attempted (for user-friendly messaging)
  const getAttemptedArea = (): string | null => {
    const pathname = location.state?.from?.pathname || "";
    if (pathname.startsWith("/admin")) return "Platform Manager";
    if (pathname.startsWith("/super-moderator")) return "Career Manager";
    if (pathname.startsWith("/senior-moderator")) return "Course Manager";
    if (pathname.startsWith("/moderator")) return "Content Moderator";
    return null;
  };

  const attemptedArea = getAttemptedArea();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="w-12 h-12 text-destructive" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
          
          {/* Role information for authenticated users */}
          {isAuthenticated && userId && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="text-muted-foreground">Your role:</span>
                <span className="font-semibold text-foreground">
                  {formatRoleName(activeRole)}
                </span>
              </div>
              {attemptedArea && (
                <p className="text-xs text-muted-foreground">
                  The {attemptedArea} area requires a different role.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>
          
          {isAuthenticated ? (
            <Button asChild className="gap-2">
              <Link to={getDashboardPath()}>
                <Home className="w-4 h-4" />
                {activeRole ? "Go to Dashboard" : "Go Home"}
              </Link>
            </Button>
          ) : (
            <Button asChild className="gap-2">
              <Link to="/auth" state={{ from: location.state?.from }}>
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </Button>
          )}
        </div>

        {/* Help text */}
        <p className="text-sm text-muted-foreground">
          If you believe this is an error, please contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default AccessDenied;
