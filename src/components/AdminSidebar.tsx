/**
 * AdminSidebar — Claude Desktop-style sidebar
 * Collapsed : w-14 (56px)  — icons only + tooltips
 * Expanded  : w-60 (240px) — icons + labels + section headers
 */
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Home,
  LogOut,
  Settings,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useViewAsRole } from "@/contexts/ViewAsRoleContext";
import { cn } from "@/lib/utils";
import { adminSidebarConfig } from "@/sidebar/admin.sidebar";
import { openGlobalCommandSearch } from "@/hooks/useGlobalCommandSearch";
import ViewAsRoleSelector from "@/components/ViewAsRoleSelector";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import SidebarToggleHeader from "@/components/SidebarToggleHeader";

// ─── Base colour tokens — use CSS vars so dark mode works ────────────────────
const C = {
  bg:          "var(--admin-bg)",
  hoverBg:     "var(--admin-bg-hover)",
  textPrimary: "var(--admin-text)",
  textMuted:   "var(--admin-muted)",
  border:      "var(--admin-border)",
  popupBg:     "var(--admin-popup-bg)",
  popupMuted:  "var(--admin-popup-muted)",
  popupDiv:    "var(--admin-popup-div)",
  danger:      "#FF3B30",
  tooltipBg:   "var(--admin-tooltip-bg)",
} as const;

// ─── Role-aware active-state tokens ──────────────────────────────────────────
// Left-border + subtle tint pattern (Stripe/Linear style — no solid fill).
const ROLE_ACTIVE: Record<string, { bg: string; tint: string; text: string; icon: string }> = {
  admin:            { bg: "#0F6E56", tint: "rgba(15,110,86,0.10)",  text: "#0F6E56", icon: "#0F6E56" },
  super_moderator:  { bg: "#1A7A62", tint: "rgba(26,122,98,0.10)",  text: "#1A7A62", icon: "#1A7A62" },
  senior_moderator: { bg: "#268770", tint: "rgba(38,135,112,0.10)", text: "#268770", icon: "#268770" },
  moderator:        { bg: "#33947E", tint: "rgba(51,148,126,0.10)", text: "#33947E", icon: "#33947E" },
};
const FALLBACK_ACTIVE = ROLE_ACTIVE.admin;

// ─── Props ────────────────────────────────────────────────────────────────────
interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userProfile: { full_name: string | null; avatar_url: string | null } | null;
  onProfileUpdated: (updated: { full_name: string | null; avatar_url: string | null }) => void;
  userId: string | null;
  notifications: {
    totalApprovals: number;
    deleteRequests: number;
    reports: number;
    pendingPosts: number;
    pendingCourses: number;
    pendingTags: number;
    pendingComments: number;
    mediaLibrary: number;
    newUsers: number;
    openAnnotations: number;
  };
  getBadgeCount: (badgeKey: string, currentCount: number) => number | undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminSidebar = ({
  isOpen,
  onToggle,
  userProfile,
  onProfileUpdated,
  notifications,
  getBadgeCount,
}: AdminSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, activeRole } = useAuth();
  const { isViewingAs, viewAsRole } = useViewAsRole();

  // Derive the active-state tokens from the effective role
  const effectiveRole = (isViewingAs && viewAsRole ? viewAsRole : activeRole) ?? "admin";
  const A = ROLE_ACTIVE[effectiveRole] ?? FALLBACK_ACTIVE;

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile popup on outside-click or Escape
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setProfileOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);


  // ── Helpers ────────────────────────────────────────────────────────────────
  const notificationMap: Record<string, number> = {
    approvals: notifications.totalApprovals,
    "delete-requests": notifications.deleteRequests,
    reports: notifications.reports,
    posts: notifications.pendingPosts,
    courses: notifications.pendingCourses,
    tags: notifications.pendingTags,
    comments: notifications.pendingComments,
    media: notifications.mediaLibrary,
    users: notifications.newUsers,
    annotations: notifications.openAnnotations,
  };

  const isActive = (path: string) => {
    if (path === "/admin/dashboard")
      return location.pathname === "/admin/dashboard" || location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  const getItemBadge = (path: string) => {
    const key = path.split("/").pop() || "";
    const count = notificationMap[key] || 0;
    return getBadgeCount ? getBadgeCount(key, count) : count > 0 ? count : undefined;
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

  const displayName = userProfile?.full_name || user?.email?.split("@")[0] || "Admin";
  const userEmail = user?.email || "";
  const initials = displayName.charAt(0).toUpperCase();

  // ── Reusable nav-row renderer ──────────────────────────────────────────────
  const NavRow = ({
    icon: Icon,
    label,
    path,
    onClick,
    active = false,
    badge,
    danger = false,
    tooltip,
  }: {
    icon: React.ElementType;
    label: string;
    path?: string;
    onClick?: () => void;
    active?: boolean;
    badge?: number;
    danger?: boolean;
    tooltip?: string;
  }) => {
    const inner = (
      <div
        onClick={onClick}
        className={cn(
          "group relative flex items-center rounded-lg cursor-pointer select-none",
          "transition-all duration-150",
          isOpen
            ? "gap-3 px-3 py-[10px]"
            : "justify-center w-10 mx-auto py-[10px]",
          active ? "" : "admin-nav-hover",
        )}
        style={active ? {
          backgroundColor: A.tint,
          borderLeft: isOpen ? `2.5px solid ${A.bg}` : undefined,
          paddingLeft: isOpen ? "10px" : undefined,
        } : undefined}
      >
        {/* Icon */}
        <Icon
          className="shrink-0 h-[17px] w-[17px]"
          style={{
            color: active ? A.icon : danger ? C.danger : C.textMuted,
            opacity: active ? 1 : danger ? 1 : 0.55,
          }}
        />

        {/* Label (expanded only) */}
        {isOpen && (
          <span
            className="flex-1 text-sm font-medium truncate"
            style={{ color: active ? A.text : danger ? C.danger : C.textPrimary }}
          >
            {label}
          </span>
        )}

        {/* Badge pill (expanded) */}
        {isOpen && badge && badge > 0 && (
          <span
            className="ml-auto text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none"
            style={{ backgroundColor: A.bg, color: "#FFFFFF" }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}

        {/* Badge dot (collapsed) */}
        {!isOpen && badge && badge > 0 && (
          <span
            className="absolute top-1 right-1 h-2 w-2 rounded-full"
            style={{ backgroundColor: A.bg }}
          />
        )}

        {/* Tooltip (collapsed only) */}
        {!isOpen && (
          <span
            className={cn(
              "pointer-events-none absolute left-full ml-3 z-[200]",
              "flex items-center gap-2",
              "px-2.5 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap",
              "shadow-xl opacity-0 group-hover:opacity-100",
              "transition-opacity duration-150",
            )}
            style={{ backgroundColor: C.tooltipBg }}
          >
            {tooltip ?? label}
            {badge && badge > 0 && (
              <span
                className="text-[10px] rounded-full px-1.5 py-0.5 leading-none"
                style={{ backgroundColor: A.bg, color: "#FFFFFF" }}
              >
                {badge}
              </span>
            )}
          </span>
        )}
      </div>
    );

    return path ? (
      <Link to={path} className="block">{inner}</Link>
    ) : (
      inner
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 h-screen flex flex-col border-r",
        "transition-all duration-300 ease-in-out",
        isOpen ? "w-60" : "w-14",
      )}
      style={{ backgroundColor: C.bg, borderColor: C.border }}
    >

      {/* ── 1. Toggle + Search ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 pt-0 pb-1 px-2 space-y-0.5">

        {/* ChatGPT-style toggle header */}
        <SidebarToggleHeader isOpen={isOpen} onToggle={onToggle} />

        {/* Search */}
        <button
          onClick={openGlobalCommandSearch}
          className={cn(
            "group relative flex items-center w-full rounded-lg cursor-pointer",
            "transition-all duration-150 admin-nav-hover",
            isOpen
              ? "gap-3 px-3 py-[10px]"
              : "justify-center w-10 mx-auto py-[10px]",
          )}
        >
          <Search className="h-[17px] w-[17px] shrink-0" style={{ color: C.textMuted, opacity: 0.55 }} />
          {isOpen && (
            <span className="text-sm font-medium" style={{ color: C.textPrimary }}>
              Search
            </span>
          )}
          {!isOpen && (
            <span
              className="pointer-events-none absolute left-full ml-3 z-[200] px-2.5 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ backgroundColor: C.tooltipBg }}
            >
              Search
            </span>
          )}
        </button>
      </div>

      {/* ── 2. Scrollable nav ───────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1"
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {adminSidebarConfig.sections.map((section, si) => (
          <div key={section.title} className={cn(si > 0 && "mt-3")}>

            {/* Section header */}
            {isOpen ? (
              <div className="px-3 mb-1 mt-4">
                <span
                  className="text-[11px] font-medium uppercase"
                  style={{ color: C.textMuted, letterSpacing: "0.08em" }}
                >
                  {section.title}
                </span>
              </div>
            ) : si > 0 ? (
              <div className="mx-2 my-2 h-px" style={{ backgroundColor: C.border }} />
            ) : null}

            {/* Items */}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavRow
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  active={isActive(item.path)}
                  badge={getItemBadge(item.path)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Bottom: profile button + popup ──────────────────────────────── */}
      <div
        ref={profileRef}
        className="flex-shrink-0 relative p-2 border-t"
        style={{ borderColor: C.border }}
      >

        {/* ── Profile popup (above button) ──────────────────────────────── */}
        {profileOpen && (
          <div
            className="absolute bottom-full left-2 mb-2 z-[200] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
            style={{ backgroundColor: C.popupBg, width: 224 }}
          >
            {/* User header — click to open profile editor */}
            <button
              onClick={() => { setProfileOpen(false); setProfileEditOpen(true); }}
              className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left admin-nav-hover"
            >
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={displayName}
                  className="h-9 w-9 rounded-full object-cover shrink-0 ring-2 ring-black/10"
                />
              ) : (
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ring-2 ring-black/10"
                  style={{ backgroundColor: A.bg }}
                >
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: C.textPrimary }}>{displayName}</p>
                <p className="text-xs truncate leading-tight" style={{ color: C.popupMuted }}>{userEmail}</p>
              </div>
            </button>

            <div className="mx-3 h-px" style={{ backgroundColor: C.popupDiv }} />

            {/* Menu items */}
            <div className="py-1.5 px-1.5 space-y-0.5">
              <ViewAsRoleSelector onOpenDialog={() => setProfileOpen(false)} />
              <button
                onClick={() => { setProfileOpen(false); navigate("/admin/settings"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm admin-nav-hover transition-colors cursor-pointer"
                style={{ color: C.textPrimary }}
              >
                <Settings className="h-4 w-4 shrink-0" style={{ color: C.popupMuted }} />
                <span>Settings</span>
              </button>
              <button
                onClick={() => { setProfileOpen(false); navigate("/"); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm admin-nav-hover transition-colors cursor-pointer"
                style={{ color: C.textPrimary }}
              >
                <Home className="h-4 w-4 shrink-0" style={{ color: C.popupMuted }} />
                <span>Back to Site</span>
              </button>
            </div>

            <div className="mx-3 h-px" style={{ backgroundColor: C.popupDiv }} />

            <div className="py-1.5 px-1.5">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm admin-nav-hover transition-colors cursor-pointer"
                style={{ color: C.danger }}
              >
                <LogOut className="h-4 w-4 shrink-0" style={{ color: C.danger }} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Avatar button ─────────────────────────────────────────────── */}
        <button
          onClick={() => setProfileOpen((p) => !p)}
          className={cn(
            "w-full flex items-center rounded-xl",
            "transition-colors duration-150 admin-nav-hover",
            isOpen ? "gap-3 px-3 py-2" : "justify-center py-2",
          )}
        >
          {/* Avatar */}
          {userProfile?.avatar_url ? (
            <img
              src={userProfile.avatar_url}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover shrink-0 ring-2 ring-white/40"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold ring-2 ring-white/40"
              style={{ backgroundColor: A.bg }}
            >
              {initials}
            </div>
          )}

          {/* Name + badge (expanded only) */}
          {isOpen && (
            <div className="flex-1 min-w-0 text-left">
              <p
                className="text-sm font-semibold leading-tight truncate"
                style={{ color: C.textPrimary }}
              >
                {displayName}
              </p>
              <p className="text-xs leading-tight" style={{ color: C.textMuted }}>
                Platform Manager
              </p>
            </div>
          )}
        </button>
      </div>

      {/* ── Profile edit dialog ─────────────────────────────────────────── */}
      <ProfileEditDialog
        open={profileEditOpen}
        onOpenChange={setProfileEditOpen}
        userProfile={userProfile}
        onProfileUpdated={onProfileUpdated}
      />
    </aside>
  );
};

export default AdminSidebar;
