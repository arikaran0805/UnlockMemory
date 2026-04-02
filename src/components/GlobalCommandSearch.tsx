import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { COMMAND_SEARCH_EVENT } from "@/hooks/useGlobalCommandSearch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Briefcase,
  Tags,
  FileText,
  MessageSquare,
  Image,
  MessageSquarePlus,
  CheckSquare,
  BarChart3,
  Users,
  Gavel,
  Activity,
  UserCog,
  Settings,
  Shield,
  DollarSign,
  Link2,
  Trash2,
  ClipboardCheck,
  Share2,
  Files,
  LogOut,
  Plus,
  Edit,
  Crown,
  Lock,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAssignments } from "@/hooks/useUserAssignments";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItemData {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  path?: string;
  action?: () => void;
  category: "navigation" | "content" | "actions";
  keywords?: string[];
  isAdminOnly?: boolean;
  isPremium?: boolean;
}

// Forest Green #0F2A1D in HSL for theming
const FOREST_GREEN = "142 50% 11%";
// Champagne Gold #C9A24D in HSL
const CHAMPAGNE_GOLD = "43 50% 55%";

// Role-based command definitions
const getCommandsForRole = (
  role: AppRole | null,
  onLogout: () => void
): CommandItemData[] => {
  const baseCommands: CommandItemData[] = [
    {
      id: "logout",
      label: "Logout",
      description: "Sign out of your account",
      icon: LogOut,
      action: onLogout,
      category: "actions",
      keywords: ["sign out", "exit", "leave"],
    },
  ];

  if (!role || role === "user") {
    return baseCommands;
  }

  // Admin commands - full system access
  if (role === "admin") {
    return [
      // Navigation
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard", category: "navigation", keywords: ["home", "overview"] },
      { id: "careers", label: "Careers", icon: Briefcase, path: "/admin/careers", category: "navigation", keywords: ["paths", "tracks"] },
      { id: "courses", label: "Courses", icon: GraduationCap, path: "/admin/courses", category: "navigation", keywords: ["classes", "lessons"] },
      { id: "posts", label: "Posts", icon: BookOpen, path: "/admin/posts", category: "navigation", keywords: ["articles", "content"] },
      { id: "tags", label: "Tags", icon: Tags, path: "/admin/tags", category: "navigation", keywords: ["labels", "categories"] },
      { id: "pages", label: "Pages", icon: Files, path: "/admin/pages", category: "navigation", keywords: ["static", "landing"] },
      { id: "media", label: "Media Library", icon: Image, path: "/admin/media", category: "navigation", keywords: ["images", "files", "uploads"] },
      { id: "comments", label: "Comments", icon: MessageSquare, path: "/admin/comments", category: "navigation", keywords: ["feedback", "replies"] },
      { id: "annotations", label: "Annotations", icon: MessageSquarePlus, path: "/admin/annotations", category: "navigation", keywords: ["notes", "highlights"] },
      { id: "approvals", label: "Approval Queue", icon: ClipboardCheck, path: "/admin/approvals", category: "navigation", keywords: ["review", "pending"] },
      { id: "delete-requests", label: "Delete Requests", icon: Trash2, path: "/admin/delete-requests", category: "navigation", keywords: ["remove", "trash"] },
      { id: "reports", label: "Reports", icon: Gavel, path: "/admin/reports", category: "navigation", keywords: ["flags", "issues"] },
      { id: "users", label: "Users", icon: Users, path: "/admin/users", category: "navigation", keywords: ["accounts", "members"] },
      { id: "authors", label: "Roles & Permissions", icon: Shield, path: "/admin/authors", category: "navigation", keywords: ["access", "permissions"], isAdminOnly: true },
      { id: "analytics", label: "Analytics", icon: BarChart3, path: "/admin/analytics", category: "navigation", keywords: ["stats", "metrics"] },
      { id: "social-analytics", label: "Social Analytics", icon: Share2, path: "/admin/social-analytics", category: "navigation", keywords: ["shares", "engagement"] },
      { id: "activity", label: "Activity Log", icon: Activity, path: "/admin/activity", category: "navigation", keywords: ["audit", "history"] },
      { id: "monetization", label: "Monetization", icon: DollarSign, path: "/admin/monetization", category: "navigation", keywords: ["billing", "revenue"], isAdminOnly: true },
      { id: "redirects", label: "Redirects", icon: Link2, path: "/admin/redirects", category: "navigation", keywords: ["urls", "links"] },

      { id: "settings", label: "Settings", icon: Settings, path: "/admin/settings", category: "navigation", keywords: ["config", "preferences"] },
      // Actions
      { id: "create-career", label: "Create Career", description: "Add a new career path", icon: Plus, path: "/admin/careers/new", category: "actions", keywords: ["add career", "new path"] },
      { id: "create-course", label: "Create Course", description: "Add a new course", icon: Plus, path: "/admin/courses/new", category: "actions", keywords: ["add course", "new class"] },
      { id: "create-post", label: "Create Post", description: "Write a new post", icon: Plus, path: "/admin/posts/new", category: "actions", keywords: ["add post", "new article"] },
      ...baseCommands,
    ];
  }

  // Career Manager commands - career-scoped authority
  if (role === "super_moderator") {
    return [
      // Navigation
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/super-moderator/dashboard", category: "navigation", keywords: ["home", "overview"] },
      { id: "careers", label: "My Careers", icon: Briefcase, path: "/super-moderator/careers", category: "navigation", keywords: ["paths", "tracks"] },
      { id: "courses", label: "Courses", icon: GraduationCap, path: "/super-moderator/courses", category: "navigation", keywords: ["classes", "lessons"] },
      { id: "posts", label: "Posts", icon: BookOpen, path: "/super-moderator/posts", category: "navigation", keywords: ["articles", "content"] },
      { id: "tags", label: "Tags", icon: Tags, path: "/super-moderator/tags", category: "navigation", keywords: ["labels", "categories"] },
      { id: "pages", label: "Pages", icon: FileText, path: "/super-moderator/pages", category: "navigation", keywords: ["static", "landing"] },
      { id: "media", label: "Media Library", icon: Image, path: "/super-moderator/media", category: "navigation", keywords: ["images", "files"] },
      { id: "comments", label: "Comments", icon: MessageSquare, path: "/super-moderator/comments", category: "navigation", keywords: ["feedback", "replies"] },
      { id: "annotations", label: "Annotations", icon: MessageSquarePlus, path: "/super-moderator/annotations", category: "navigation", keywords: ["notes", "highlights"] },
      { id: "approvals", label: "Approvals", icon: CheckSquare, path: "/super-moderator/approvals", category: "navigation", keywords: ["review", "pending"] },
      { id: "reports", label: "Reports", icon: Gavel, path: "/super-moderator/reports", category: "navigation", keywords: ["flags", "issues"] },
      { id: "assignments", label: "Assignments", icon: UserCog, path: "/super-moderator/assignments", category: "navigation", keywords: ["team", "assign"] },
      { id: "users", label: "Users", icon: Users, path: "/super-moderator/users", category: "navigation", keywords: ["accounts", "members"] },
      { id: "analytics", label: "Content Analytics", icon: BarChart3, path: "/super-moderator/analytics", category: "navigation", keywords: ["stats", "metrics"] },
      { id: "activity", label: "Activity Log", icon: Activity, path: "/super-moderator/activity", category: "navigation", keywords: ["audit", "history"] },
      // Actions
      { id: "create-career", label: "Create Career", description: "Add a new career path", icon: Plus, path: "/super-moderator/careers/new", category: "actions", keywords: ["add career"], isPremium: true },
      { id: "create-course", label: "Create Course", description: "Add a new course", icon: Plus, path: "/super-moderator/courses/new", category: "actions", keywords: ["add course"] },
      { id: "create-post", label: "Create Post", description: "Write a new post", icon: Plus, path: "/super-moderator/posts/new", category: "actions", keywords: ["add post"] },
      ...baseCommands,
    ];
  }

  // Course Manager commands - course-level authority
  if (role === "senior_moderator") {
    return [
      // Navigation
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/senior-moderator/dashboard", category: "navigation", keywords: ["home", "overview"] },
      { id: "courses", label: "Courses", icon: GraduationCap, path: "/senior-moderator/courses", category: "navigation", keywords: ["classes", "lessons"] },
      { id: "posts", label: "Posts", icon: BookOpen, path: "/senior-moderator/posts", category: "navigation", keywords: ["articles", "content"] },
      { id: "tags", label: "Tags", icon: Tags, path: "/senior-moderator/tags", category: "navigation", keywords: ["labels", "categories"] },
      { id: "pages", label: "Pages", icon: FileText, path: "/senior-moderator/pages", category: "navigation", keywords: ["static", "landing"] },
      { id: "media", label: "Media Library", icon: Image, path: "/senior-moderator/media", category: "navigation", keywords: ["images", "files"] },
      { id: "comments", label: "Comments", icon: MessageSquare, path: "/senior-moderator/comments", category: "navigation", keywords: ["feedback", "replies"] },
      { id: "annotations", label: "Annotations", icon: MessageSquarePlus, path: "/senior-moderator/annotations", category: "navigation", keywords: ["notes", "highlights"] },
      { id: "approvals", label: "Approvals", icon: CheckSquare, path: "/senior-moderator/approvals", category: "navigation", keywords: ["review", "pending"] },
      { id: "reports", label: "Reports", icon: Gavel, path: "/senior-moderator/reports", category: "navigation", keywords: ["flags", "issues"] },
      { id: "users", label: "Users", icon: Users, path: "/senior-moderator/users", category: "navigation", keywords: ["accounts", "members"] },
      { id: "analytics", label: "Content Analytics", icon: BarChart3, path: "/senior-moderator/analytics", category: "navigation", keywords: ["stats", "metrics"] },
      { id: "activity", label: "Activity Log", icon: Activity, path: "/senior-moderator/activity", category: "navigation", keywords: ["audit", "history"] },
      // Actions
      { id: "create-post", label: "Create Post", description: "Write a new post", icon: Plus, path: "/senior-moderator/posts/new", category: "actions", keywords: ["add post"] },
      ...baseCommands,
    ];
  }

  // Content Moderator commands - task-focused contributor
  if (role === "moderator") {
    return [
      // Navigation
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/moderator/dashboard", category: "navigation", keywords: ["home", "overview"] },
      { id: "content", label: "My Content", icon: BookOpen, path: "/moderator/content", category: "navigation", keywords: ["posts", "drafts"] },
      { id: "review", label: "Review Queue", icon: ClipboardCheck, path: "/moderator/review", category: "navigation", keywords: ["pending", "submissions"] },
      { id: "comments", label: "Comments", icon: MessageSquare, path: "/moderator/comments", category: "navigation", keywords: ["feedback", "replies"] },
      { id: "activity", label: "My Activity", icon: Activity, path: "/moderator/activity", category: "navigation", keywords: ["history", "log"] },
      // Actions
      { id: "create-post", label: "Create Post", description: "Write a new draft", icon: Plus, path: "/moderator/content/new", category: "actions", keywords: ["add post", "new draft"], isPremium: true },
      ...baseCommands,
    ];
  }

  return baseCommands;
};

export function GlobalCommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { activeRole, signOut, user } = useAuth();

  // Fetch user's assignments for ownership-based visibility
  const {
    getAssignedCareers,
    getAssignedCourses,
    isLoading: assignmentsLoading,
  } = useUserAssignments(user?.id || null, activeRole);

  // Get role-aware commands
  const commands = useMemo(() => {
    return getCommandsForRole(activeRole, async () => {
      await signOut();
      navigate("/");
      onOpenChange(false);
    });
  }, [activeRole, signOut, navigate, onOpenChange]);

  // Generate dynamic content commands based on assignments
  const contentCommands = useMemo((): CommandItemData[] => {
    if (activeRole === "admin" || !activeRole || activeRole === "user") {
      return [];
    }

    const contentItems: CommandItemData[] = [];

    // Career Managers: show assigned careers and courses within those careers
    if (activeRole === "super_moderator") {
      const careers = getAssignedCareers();
      const courses = getAssignedCourses();

      careers.forEach((career) => {
        contentItems.push({
          id: `career-${career.id}`,
          label: career.name,
          description: "Career",
          icon: Briefcase,
          path: `/super-moderator/careers/${career.id}`,
          category: "content",
          keywords: ["career", career.slug],
        });
      });

      courses.forEach((course) => {
        contentItems.push({
          id: `course-${course.id}`,
          label: course.name,
          description: "Course",
          icon: GraduationCap,
          path: `/super-moderator/courses/${course.id}`,
          category: "content",
          keywords: ["course", course.slug],
        });
      });
    }

    // Course Managers and Content Moderators: show assigned courses only
    if (activeRole === "senior_moderator" || activeRole === "moderator") {
      const courses = getAssignedCourses();
      const basePath = activeRole === "senior_moderator" ? "/senior-moderator" : "/moderator";

      courses.forEach((course) => {
        contentItems.push({
          id: `course-${course.id}`,
          label: course.name,
          description: "Assigned Course",
          icon: GraduationCap,
          path: `${basePath}/courses/${course.id}`,
          category: "content",
          keywords: ["course", course.slug],
        });
      });
    }

    return contentItems;
  }, [activeRole, getAssignedCareers, getAssignedCourses]);

  // Combine all commands
  const allCommands = useMemo(() => {
    return [...commands, ...contentCommands];
  }, [commands, contentCommands]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return allCommands;
    
    const query = search.toLowerCase();
    return allCommands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const descMatch = cmd.description?.toLowerCase().includes(query);
      const keywordMatch = cmd.keywords?.some((k) => k.toLowerCase().includes(query));
      return labelMatch || descMatch || keywordMatch;
    });
  }, [allCommands, search]);

  // Group commands by category
  const navigationCommands = filteredCommands.filter((c) => c.category === "navigation");
  const contentFilteredCommands = filteredCommands.filter((c) => c.category === "content");
  const actionCommands = filteredCommands.filter((c) => c.category === "actions");

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  // Listen for custom event to open command search (from sidebars, etc.)
  useEffect(() => {
    const handleCustomOpen = () => {
      onOpenChange(true);
    };

    window.addEventListener(COMMAND_SEARCH_EVENT, handleCustomOpen);
    return () => window.removeEventListener(COMMAND_SEARCH_EVENT, handleCustomOpen);
  }, [onOpenChange]);

  const handleSelect = useCallback(
    (item: CommandItemData) => {
      if (item.action) {
        item.action();
      } else if (item.path) {
        navigate(item.path);
      }
      onOpenChange(false);
      setSearch("");
    },
    [navigate, onOpenChange]
  );

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const shortcutKey = isMac ? "⌘" : "Ctrl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden p-0 shadow-2xl",
          "sm:max-w-[560px] rounded-2xl",
          "bg-white dark:bg-card",
          "border border-border/50",
          "backdrop-blur-xl"
        )}
      >
        <Command
          className="bg-transparent"
          shouldFilter={false}
        >
          {/* Search Input */}
          <div className="relative">
            <CommandInput
              placeholder="Search anything…"
              value={search}
              onValueChange={setSearch}
              className={cn(
                "h-14 text-base border-0 pr-14",
                "placeholder:text-muted-foreground/60",
                "focus:ring-0 focus:outline-none"
              )}
              style={{
                caretColor: `hsl(${FOREST_GREEN})`,
              }}
            />
            <span className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50 font-medium">
              {shortcutKey} + K
            </span>
          </div>

          {/* Results */}
          <CommandList className="max-h-[400px] overflow-y-auto p-2">
            <CommandEmpty className="py-12 text-center text-muted-foreground">
              No results found.
            </CommandEmpty>

            {/* Navigation Group */}
            {navigationCommands.length > 0 && (
              <CommandGroup heading="Navigation">
                {navigationCommands.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
                      "transition-all duration-150",
                      "aria-selected:bg-[hsl(142_50%_11%/0.08)]",
                      "dark:aria-selected:bg-[hsl(142_50%_11%/0.15)]"
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">
                      <item.icon className="h-4 w-4 text-foreground/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.label}</span>
                        {item.isAdminOnly && (
                          <Crown
                            className="h-3 w-3"
                            style={{ color: `hsl(${CHAMPAGNE_GOLD})` }}
                          />
                        )}
                      </div>
                      {item.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Content Group - Assigned Careers/Courses */}
            {contentFilteredCommands.length > 0 && (
              <>
                {navigationCommands.length > 0 && <CommandSeparator className="my-2" />}
                <CommandGroup heading="Your Content">
                  {contentFilteredCommands.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
                        "transition-all duration-150",
                        "aria-selected:bg-[hsl(142_50%_11%/0.08)]",
                        "dark:aria-selected:bg-[hsl(142_50%_11%/0.15)]"
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">
                        <item.icon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.label}</span>
                          <FolderOpen
                            className="h-3 w-3"
                            style={{ color: `hsl(${CHAMPAGNE_GOLD})` }}
                          />
                        </div>
                        {item.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Actions Group */}
            {actionCommands.length > 0 && (
              <>
                {(navigationCommands.length > 0 || contentFilteredCommands.length > 0) && <CommandSeparator className="my-2" />}
                <CommandGroup heading="Actions">
                  {actionCommands.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer",
                        "transition-all duration-150",
                        "aria-selected:bg-[hsl(142_50%_11%/0.08)]",
                        "dark:aria-selected:bg-[hsl(142_50%_11%/0.15)]"
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60">
                        <item.icon className="h-4 w-4 text-foreground/70" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{item.label}</span>
                          {item.isPremium && (
                            <Lock
                              className="h-3 w-3"
                              style={{ color: `hsl(${CHAMPAGNE_GOLD})` }}
                            />
                          )}
                        </div>
                        {item.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          {/* Footer */}
          <div className="border-t border-border/50 px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground/60 bg-muted/20">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border/50 font-mono text-[10px]">esc</kbd>
                close
              </span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default GlobalCommandSearch;
