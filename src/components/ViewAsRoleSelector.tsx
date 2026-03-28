/**
 * ViewAsRoleSelector - Inline expandable role switcher inside the admin profile popup
 */
import { useState } from "react";
import { Eye, EyeOff, Shield, Users, UserCog, User, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth, getRoleDashboardPath, type AppRole } from "@/hooks/useAuth";
import { useViewAsRole } from "@/contexts/ViewAsRoleContext";
import { cn } from "@/lib/utils";

const VIEW_AS_ROLES: { role: AppRole; label: string; icon: typeof Shield }[] = [
  { role: "super_moderator", label: "Career Manager", icon: Shield },
  { role: "senior_moderator", label: "Course Manager", icon: UserCog },
  { role: "moderator", label: "Content Moderator", icon: Users },
  { role: "user", label: "Learner", icon: User },
];

// Colour tokens matching AdminSidebar's dark popup
const C = {
  popupBg: "#EFF3EE",
  popupMuted: "#6B8F71",
  popupDiv: "rgba(0,0,0,0.10)",
  activeBg: "#2D5A3D",
} as const;

interface ViewAsRoleSelectorProps {
  onOpenDialog?: () => void; // kept for API compat, unused
}

const ViewAsRoleSelector = ({ onOpenDialog: _onOpenDialog }: ViewAsRoleSelectorProps) => {
  const [expanded, setExpanded] = useState(false);
  const { activeRole } = useAuth();
  const { viewAsRole, isViewingAs, startViewingAs, stopViewingAs } = useViewAsRole();
  const navigate = useNavigate();

  if (activeRole !== "admin") return null;

  const currentViewingLabel = VIEW_AS_ROLES.find(r => r.role === viewAsRole)?.label;

  const handleViewAs = (role: AppRole) => {
    startViewingAs(role);
    setExpanded(false);
    navigate(getRoleDashboardPath(role));
  };

  const handleExit = () => {
    stopViewingAs();
    setExpanded(false);
    navigate("/admin/dashboard");
  };

  return (
    <div className="flex flex-col-reverse">
      {/* ── Fixed trigger button ── */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-black/5 transition-colors cursor-pointer"
        style={{ color: "#1A3A2A" }}
      >
        <Eye className={cn("h-4 w-4 shrink-0", isViewingAs && "animate-pulse")} style={{ color: C.popupMuted }} />
        <span className="flex-1 text-left truncate">
          {isViewingAs ? `Viewing: ${currentViewingLabel}` : "View as Role"}
        </span>
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-out"
          style={{ 
            color: C.popupMuted, 
            transform: expanded ? "rotate(-90deg)" : "rotate(0deg)" 
          }}
        />
      </button>

      {/* ── Upward expanding accordion role list ── */}
      <div 
        className={cn(
          "mx-1 rounded-xl overflow-hidden transition-all duration-200 ease-out",
          expanded 
            ? "max-h-[400px] opacity-100 translate-y-0 mb-1.5" 
            : "max-h-0 opacity-0 translate-y-4 pointer-events-none"
        )} 
        style={{ backgroundColor: "rgba(0,0,0,0.06)" }}
      >
        <div className="py-1">
          {VIEW_AS_ROLES.map(({ role, label, icon: Icon }) => {
            const active = viewAsRole === role;
            return (
              <button
                key={role}
                onClick={() => handleViewAs(role)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-black/10 transition-colors cursor-pointer"
                style={active ? { backgroundColor: C.activeBg, color: "#fff" } : { color: "#1A3A2A" }}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "#fff" : C.popupMuted }} />
                <span className="flex-1 text-left">{label}</span>
                {active && (
                  <span className="text-[10px] opacity-70">active</span>
                )}
              </button>
            );
          })}

          {/* Exit view mode */}
          {isViewingAs && (
            <>
              <div className="mx-2 h-px" style={{ backgroundColor: C.popupDiv }} />
              <button
                onClick={handleExit}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-black/5 transition-colors cursor-pointer"
                style={{ color: "#FF3B30" }}
              >
                <EyeOff className="h-4 w-4 shrink-0" style={{ color: "#FF3B30" }} />
                <span>Exit View Mode</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewAsRoleSelector;
