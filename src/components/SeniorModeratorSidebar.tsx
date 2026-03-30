/**
 * SeniorModeratorSidebar — matches AdminSidebar structure exactly
 * Collapsed: w-14 (icons only) | Expanded: w-60
 * Active color: #4A7C59 (medium forest green)
 */
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Home, LogOut } from "lucide-react";
import SidebarToggleHeader from "@/components/SidebarToggleHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { seniorModeratorSidebarConfig } from "@/sidebar/seniorModerator.sidebar";
import { openGlobalCommandSearch } from "@/hooks/useGlobalCommandSearch";
import ProfileEditDialog from "@/components/ProfileEditDialog";

const C = {
  bg:          "#EFF3EE",
  hoverBg:     "#E2EAE1",
  textPrimary: "#1A3A2A",
  textMuted:   "#6B8F71",
  border:      "#D4DDD3",
  popupBg:     "#EFF3EE",
  popupMuted:  "#6B8F71",
  popupDiv:    "#D4DDD3",
  danger:      "#FF3B30",
} as const;

// Senior Moderator active tokens — 90% of admin (#0F6E56)
const A = { bg: "#268770", text: "#FFFFFF", icon: "#FFFFFF" };

interface SeniorModeratorSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  onProfileUpdated: (updated: { full_name: string | null; avatar_url: string | null }) => void;
  userId: string | null;
  getBadgeCount?: (key: string) => number | undefined;
}

const SeniorModeratorSidebar = ({
  isOpen,
  onToggle,
  userProfile,
  onProfileUpdated,
  getBadgeCount,
}: SeniorModeratorSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [profileOpen,     setProfileOpen]     = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setProfileOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown",   onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown",   onKey);
    };
  }, [profileOpen]);

  const isActive = (path: string) => {
    if (path === "/senior-moderator/dashboard")
      return location.pathname === "/senior-moderator/dashboard" || location.pathname === "/senior-moderator";
    return location.pathname.startsWith(path);
  };

  const getItemBadge = (path: string): number | undefined => {
    if (!getBadgeCount) return undefined;
    const key = path.split("/").pop() || "";
    const val = getBadgeCount(key);
    return val && val > 0 ? val : undefined;
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await supabase.auth.signOut();
      toast({ title: "Logged out successfully" });
      navigate("/auth");
    } catch (err: any) {
      toast({ title: "Error logging out", description: err.message, variant: "destructive" });
    }
  };

  const displayName = userProfile?.full_name || user?.email?.split("@")[0] || "Course Manager";
  const userEmail   = user?.email || "";
  const initials    = displayName.charAt(0).toUpperCase();

  const NavRow = ({
    icon: Icon, label, path, onClick, active = false, badge, danger = false,
  }: {
    icon: React.ElementType; label: string; path?: string; onClick?: () => void;
    active?: boolean; badge?: number; danger?: boolean;
  }) => {
    const inner = (
      <div
        onClick={onClick}
        className={cn(
          "group relative flex items-center rounded-xl cursor-pointer select-none transition-colors duration-150",
          isOpen ? "gap-3 px-3 py-[11px]" : "justify-center w-10 mx-auto py-[11px]",
          active ? "" : "hover:bg-[#E2EAE1]",
        )}
        style={active ? { backgroundColor: A.bg } : undefined}
      >
        <Icon className="shrink-0 h-5 w-5" style={{ color: active ? A.icon : danger ? C.danger : C.textMuted }} />
        {isOpen && (
          <span className="flex-1 text-sm font-medium truncate" style={{ color: active ? A.text : danger ? C.danger : C.textPrimary }}>
            {label}
          </span>
        )}
        {isOpen && badge && badge > 0 && (
          <span className="ml-auto text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none" style={{ backgroundColor: A.bg, color: A.text }}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
        {!isOpen && badge && badge > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full" style={{ backgroundColor: A.bg }} />
        )}
        {!isOpen && (
          <span className="pointer-events-none absolute left-full ml-3 z-[200] flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ backgroundColor: C.popupBg, color: C.textPrimary }}>
            {label}
            {badge && badge > 0 && (
              <span className="text-[10px] rounded-full px-1.5 py-0.5 leading-none" style={{ backgroundColor: A.bg, color: A.text }}>{badge}</span>
            )}
          </span>
        )}
      </div>
    );
    return path ? <Link to={path} className="block">{inner}</Link> : inner;
  };

  return (
    <aside
      className={cn("fixed left-0 top-0 z-50 h-screen flex flex-col border-r transition-all duration-300 ease-in-out", isOpen ? "w-60" : "w-14")}
      style={{ backgroundColor: C.bg, borderColor: C.border }}
    >
      {/* Toggle + Search */}
      <div className="flex-shrink-0 pt-0 pb-1 px-2 space-y-0.5">
        <SidebarToggleHeader isOpen={isOpen} onToggle={onToggle} />
        <button onClick={openGlobalCommandSearch} className={cn("group relative flex items-center w-full rounded-xl cursor-pointer transition-colors duration-150 hover:bg-[#E2EAE1]", isOpen ? "gap-3 px-3 py-[11px]" : "justify-center w-10 mx-auto py-[11px]")}>
          <Search className="h-5 w-5 shrink-0" style={{ color: C.textMuted }} />
          {isOpen && <span className="text-sm font-medium" style={{ color: C.textPrimary }}>Search</span>}
          {!isOpen && <span className="pointer-events-none absolute left-full ml-3 z-[200] px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ backgroundColor: C.popupBg, color: C.textPrimary }}>Search</span>}
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
        {seniorModeratorSidebarConfig.sections.map((section, si) => (
          <div key={section.title} className={cn(si > 0 && "mt-3")}>
            {isOpen ? (
              <div className="px-3 mb-1 mt-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.textMuted }}>{section.title}</span>
              </div>
            ) : si > 0 ? (
              <div className="mx-2 my-2 h-px" style={{ backgroundColor: C.border }} />
            ) : null}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavRow key={item.path} icon={item.icon} label={item.label} path={item.path} active={isActive(item.path)} badge={getItemBadge(item.path)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Profile */}
      <div ref={profileRef} className="flex-shrink-0 relative p-2 border-t" style={{ borderColor: C.border }}>
        {profileOpen && (
          <div className="absolute bottom-full left-2 mb-2 z-[200] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150" style={{ backgroundColor: C.popupBg, width: 224 }}>
            <button onClick={() => { setProfileOpen(false); setProfileEditOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors text-left">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt={displayName} className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-black/10" />
              ) : (
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ring-2 ring-black/10" style={{ backgroundColor: A.bg }}>{initials}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.textPrimary }}>{displayName}</p>
                <p className="text-xs truncate leading-tight" style={{ color: C.popupMuted }}>{userEmail}</p>
              </div>
            </button>
            <div className="mx-3 h-px" style={{ backgroundColor: C.popupDiv }} />
            <div className="py-1.5 px-1.5 space-y-0.5">
              <button onClick={() => { setProfileOpen(false); navigate("/"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-black/5 transition-colors cursor-pointer" style={{ color: C.textPrimary }}>
                <Home className="h-4 w-4 shrink-0" style={{ color: C.popupMuted }} />
                <span>Back to Site</span>
              </button>
            </div>
            <div className="mx-3 h-px" style={{ backgroundColor: C.popupDiv }} />
            <div className="py-1.5 px-1.5">
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm hover:bg-black/5 transition-colors cursor-pointer" style={{ color: C.danger }}>
                <LogOut className="h-4 w-4 shrink-0" style={{ color: C.danger }} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
        <button onClick={() => setProfileOpen((p) => !p)} className={cn("w-full flex items-center rounded-xl transition-colors duration-150 hover:bg-[#E2EAE1]", isOpen ? "gap-3 px-3 py-2" : "justify-center py-2")}>
          {userProfile?.avatar_url ? (
            <img src={userProfile.avatar_url} alt={displayName} className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-white/40" />
          ) : (
            <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ring-2 ring-white/40" style={{ backgroundColor: A.bg }}>{initials}</div>
          )}
          {isOpen && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold leading-tight truncate" style={{ color: C.textPrimary }}>{displayName}</p>
              <p className="text-xs leading-tight" style={{ color: C.textMuted }}>Course Manager</p>
            </div>
          )}
        </button>
      </div>

      <ProfileEditDialog open={profileEditOpen} onOpenChange={setProfileEditOpen} userProfile={userProfile} onProfileUpdated={onProfileUpdated} />
    </aside>
  );
};

export default SeniorModeratorSidebar;
