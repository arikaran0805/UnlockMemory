/**
 * UserPickerPopover
 * Mode-aware inline popover for assigning users to role slots.
 * - career_manager: shows only super_moderator role users, fetches cross-career assignments internally
 * - course_manager: shows only senior_moderator role users, fetches cross-course context internally
 * - content_moderator: shows only moderator role users, fetches cross-course context internally
 */
import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role?: string | null;
}

type PickerMode = "career_manager" | "course_manager" | "content_moderator";

interface UserPickerPopoverProps {
  users: User[];
  assignedIds: Set<string>;
  onSelect: (userId: string) => void;
  mode: PickerMode;
  careerId?: string;
  courseId?: string;
  size?: "sm" | "md";
}

// Map mode → role value in user_roles table
const MODE_ROLE: Record<PickerMode, string> = {
  career_manager: "super_moderator",
  course_manager: "senior_moderator",
  content_moderator: "moderator",
};

const MODE_CONFIG: Record<PickerMode, {
  label: string;
  searchPlaceholder: string;
  dotColor: string;
  labelColor: string;
  avatarBg: string;
  avatarText: string;
  pillBg: string;
  pillText: string;
  pillLabel: string;
  footerNote: string;
}> = {
  career_manager: {
    label: "Assign Career Manager",
    searchPlaceholder: "Search managers...",
    dotColor: "#7c3aed",
    labelColor: "#6d28d9",
    avatarBg: "bg-purple-100",
    avatarText: "text-purple-700",
    pillBg: "bg-purple-100",
    pillText: "text-purple-700",
    pillLabel: "Super Mod",
    footerNote: "One manager per career only",
  },
  course_manager: {
    label: "Assign Course Manager",
    searchPlaceholder: "Search managers...",
    dotColor: "#d97706",
    labelColor: "#b45309",
    avatarBg: "bg-amber-100",
    avatarText: "text-amber-800",
    pillBg: "bg-amber-100",
    pillText: "text-amber-800",
    pillLabel: "Course Mgr",
    footerNote: "Can manage multiple courses",
  },
  content_moderator: {
    label: "Assign Content Moderator",
    searchPlaceholder: "Search moderators...",
    dotColor: "#3b82f6",
    labelColor: "#1d4ed8",
    avatarBg: "bg-blue-100",
    avatarText: "text-blue-800",
    pillBg: "bg-blue-100",
    pillText: "text-blue-800",
    pillLabel: "Moderator",
    footerNote: "Can moderate multiple courses",
  },
};

interface EnrichedUser extends User {
  // For career_manager: which career name this user is already managing
  careerAssignedTo?: string;
  // For course_manager/content_moderator: list of course names already assigned
  coursesAssignedTo?: string[];
  // True if assigned to THIS specific course (assignedIds)
  assignedHere: boolean;
}

export const UserPickerPopover = ({
  users,
  assignedIds,
  onSelect,
  mode,
  careerId,
  courseId,
  size = "md",
}: UserPickerPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [enrichedUsers, setEnrichedUsers] = useState<EnrichedUser[]>([]);
  const [fetchingContext, setFetchingContext] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cfg = MODE_CONFIG[mode];
  const targetRole = MODE_ROLE[mode];

  // Filter users prop to only those matching the required role
  const roleFilteredUsers = users.filter((u) => u.role === targetRole);

  // Fetch cross-assignment context when popover opens
  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }
    setTimeout(() => inputRef.current?.focus(), 50);
    fetchContext();
  }, [open]);

  const fetchContext = async () => {
    setFetchingContext(true);
    try {
      if (mode === "career_manager") {
        // Fetch all career_assignments to know which career each user manages
        const { data: allCareerAssignments } = await supabase
          .from("career_assignments")
          .select("user_id, career_id, careers(name)");

        // Build map: user_id → career name
        const userCareerMap = new Map<string, string>();
        (allCareerAssignments || []).forEach((a: any) => {
          // If assigned to a DIFFERENT career than current (or any career if careerId not provided)
          if (!careerId || a.career_id !== careerId) {
            userCareerMap.set(a.user_id, a.careers?.name || "another career");
          }
        });

        setEnrichedUsers(
          roleFilteredUsers.map((u) => ({
            ...u,
            careerAssignedTo: userCareerMap.get(u.id),
            assignedHere: assignedIds.has(u.id),
          }))
        );
      } else {
        // course_manager or content_moderator
        // Fetch all course_assignments for this role to know which courses each user is in
        const { data: allCourseAssignments } = await supabase
          .from("course_assignments")
          .select("user_id, course_id, role, courses(name)")
          .eq("role", targetRole);

        // Build map: user_id → array of course names (excluding current courseId)
        const userCoursesMap = new Map<string, string[]>();
        (allCourseAssignments || []).forEach((a: any) => {
          if (courseId && a.course_id === courseId) return; // skip current course
          const existing = userCoursesMap.get(a.user_id) || [];
          existing.push(a.courses?.name || "a course");
          userCoursesMap.set(a.user_id, existing);
        });

        setEnrichedUsers(
          roleFilteredUsers.map((u) => ({
            ...u,
            coursesAssignedTo: userCoursesMap.get(u.id),
            assignedHere: assignedIds.has(u.id),
          }))
        );
      }
    } catch (e) {
      // Fallback: no context, just show users
      setEnrichedUsers(
        roleFilteredUsers.map((u) => ({ ...u, assignedHere: assignedIds.has(u.id) }))
      );
    } finally {
      setFetchingContext(false);
    }
  };

  const handleSelect = (user: EnrichedUser) => {
    if (user.assignedHere) return;
    // Career managers are blocked if they already manage a different career
    if (mode === "career_manager" && user.careerAssignedTo) return;
    onSelect(user.id);
    setOpen(false);
  };

  // Filter by search
  const filtered = enrichedUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  // Group into sections
  const available = filtered.filter(
    (u) => !u.assignedHere && !u.careerAssignedTo && (!u.coursesAssignedTo || u.coursesAssignedTo.length === 0)
  );
  const inOtherContexts = filtered.filter(
    (u) => !u.assignedHere && (u.careerAssignedTo || (u.coursesAssignedTo && u.coursesAssignedTo.length > 0))
  );
  const assignedHere = filtered.filter((u) => u.assignedHere);

  const isSm = size === "sm";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 rounded-lg border border-dashed transition-all cursor-pointer
            ${isSm ? "px-3 py-1.5" : "px-5 py-2.5"}
            ${open
              ? mode === "career_manager"
                ? "border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-950/30"
                : mode === "course_manager"
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30"
                : "border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/30"
              : "border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
            }`}
        >
          <Plus className={isSm ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <span className={isSm ? "text-xs font-medium" : "text-sm font-medium"}>Add</span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 p-0 overflow-hidden rounded-xl border border-border/60 shadow-xl"
        align="start"
        sideOffset={8}
        avoidCollisions
      >
        {/* Header */}
        <div className="px-3 pt-3 pb-2.5 border-b border-border/50">
          {/* Mode label */}
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: cfg.dotColor }}
            />
            <span
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: cfg.labelColor }}
            >
              {cfg.label}
            </span>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 bg-muted/60 rounded-lg px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={cfg.searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
            />
          </div>
        </div>

        {/* Body */}
        <ScrollArea className="max-h-72">
          {fetchingContext ? (
            <div className="flex items-center justify-center py-10">
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: `${cfg.dotColor}40`, borderTopColor: "transparent" }}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center px-4">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center mb-2">
                <Search className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No users found</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {roleFilteredUsers.length === 0
                  ? `No users with ${cfg.pillLabel} role exist`
                  : "Try a different search"}
              </p>
            </div>
          ) : (
            <div className="py-1.5">

              {/* Available section */}
              {available.length > 0 && (
                <>
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      Available · {available.length}
                    </span>
                  </div>
                  {available.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      cfg={cfg}
                      disabled={false}
                      onClick={() => handleSelect(user)}
                    />
                  ))}
                </>
              )}

              {/* In other contexts (other career or other courses) */}
              {inOtherContexts.length > 0 && (
                <>
                  <div className="mx-3 my-1 border-t border-border/40" />
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      {mode === "career_manager"
                        ? `Managing another career · ${inOtherContexts.length}`
                        : `Also in other courses · ${inOtherContexts.length}`}
                    </span>
                  </div>
                  {inOtherContexts.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      cfg={cfg}
                      disabled={mode === "career_manager"}
                      subOverride={
                        mode === "career_manager"
                          ? `→ ${user.careerAssignedTo}`
                          : `Also in: ${user.coursesAssignedTo?.slice(0, 2).join(", ")}${(user.coursesAssignedTo?.length || 0) > 2 ? " +" + ((user.coursesAssignedTo?.length || 0) - 2) + " more" : ""}`
                      }
                      subColor={mode === "career_manager" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}
                      pillOverride={mode === "career_manager" ? { bg: "bg-muted", text: "text-muted-foreground", label: "Taken" } : undefined}
                      onClick={() => handleSelect(user)}
                    />
                  ))}
                </>
              )}

              {/* Already in THIS course/team */}
              {assignedHere.length > 0 && (
                <>
                  <div className="mx-3 my-1 border-t border-border/40" />
                  <div className="px-3 py-1.5">
                    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                      {mode === "career_manager"
                        ? `In this team · ${assignedHere.length}`
                        : `This course · ${assignedHere.length}`}
                    </span>
                  </div>
                  {assignedHere.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      cfg={cfg}
                      disabled
                      subOverride="✓ Already assigned here"
                      subColor="text-emerald-600 dark:text-emerald-400"
                      pillOverride={{ bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400", label: "Assigned" }}
                      onClick={() => {}}
                    />
                  ))}
                </>
              )}

            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-muted/30">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          <span className="text-[11px] text-muted-foreground">{cfg.footerNote}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Internal row component
interface UserRowProps {
  user: EnrichedUser;
  cfg: typeof MODE_CONFIG[PickerMode];
  disabled: boolean;
  onClick: () => void;
  subOverride?: string;
  subColor?: string;
  pillOverride?: { bg: string; text: string; label: string };
}

const UserRow = ({ user, cfg, disabled, onClick, subOverride, subColor, pillOverride }: UserRowProps) => {
  const initials = (user.full_name?.[0] || user.email[0] || "?").toUpperCase();
  const pill = pillOverride ?? { bg: cfg.pillBg, text: cfg.pillText, label: cfg.pillLabel };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left
        ${disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-muted/50 cursor-pointer"
        }`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className={`text-xs font-bold ${cfg.avatarBg} ${cfg.avatarText}`}>
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">
          {user.full_name || user.email}
        </p>
        {subOverride ? (
          <p className={`text-xs truncate leading-tight mt-0.5 font-medium ${subColor || "text-muted-foreground"}`}>
            {subOverride}
          </p>
        ) : user.full_name ? (
          <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
            {user.email}
          </p>
        ) : null}
      </div>

      {/* Role pill — flex-shrink-0 so it NEVER clips */}
      <span
        className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap
          ${pill.bg} ${pill.text}`}
      >
        {pill.label}
      </span>
    </button>
  );
};

export default UserPickerPopover;
