/**
 * AdminUsersRoles.tsx
 * Merged Users & Roles management page.
 * Replaces AdminUsers.tsx and AdminAuthors.tsx.
 * Features:
 * - Supabase-style data grid with column toggles, filter bar, pagination, export CSV
 * - Manage Role dialog (from AdminAuthors)
 * - Delete user action (from AdminUsers)
 * - Invite User dialog (from AdminUsers)
 * - Admin-only access guard
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Columns,
  Download,
  Filter,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
  Crown,
  GraduationCap,
  Shield,
} from "lucide-react";
import UMLoader from "@/components/UMLoader";
import InviteUserDialog from "@/components/admin/InviteUserDialog";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: { id: string; role: string }[];
}

type FilterOperator = "contains" | "equals" | "starts_with" | "ends_with";
type FilterColumn = "email" | "full_name" | "role" | "created_at";

interface ActiveFilter {
  id: string;
  column: FilterColumn;
  operator: FilterOperator;
  value: string;
}

const COLUMN_LABELS: Record<string, string> = {
  user: "User",
  email: "Email",
  role: "Role",
  joined: "Joined",
  actions: "Actions",
};

const FILTER_COLUMN_OPTIONS: { value: FilterColumn; label: string }[] = [
  { value: "full_name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "role", label: "Role" },
  { value: "created_at", label: "Joined date" },
];

const FILTER_OPERATOR_OPTIONS: { value: FilterOperator; label: string }[] = [
  { value: "contains", label: "contains" },
  { value: "equals", label: "equals" },
  { value: "starts_with", label: "starts with" },
  { value: "ends_with", label: "ends with" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ROLE_OPTIONS = [
  { value: "user", label: "User", description: "Basic platform access" },
  { value: "moderator", label: "Moderator", description: "Can create posts only" },
  { value: "senior_moderator", label: "Senior Moderator", description: "Can edit assigned courses" },
  { value: "super_moderator", label: "Super Moderator", description: "Can manage assigned team and courses" },
  { value: "admin", label: "Admin", description: "Full system access" },
];

const getRoleBadgeStyle = (role: string): { variant: "default" | "secondary" | "outline"; className: string } => {
  switch (role) {
    case "admin":
      return { variant: "default", className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400" };
    case "super_moderator":
      return { variant: "outline", className: "border-purple-400 text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950/30" };
    case "senior_moderator":
      return { variant: "outline", className: "border-amber-400 text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30" };
    case "moderator":
      return { variant: "secondary", className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400" };
    default:
      return { variant: "outline", className: "" };
  }
};

const formatRoleLabel = (role: string) => {
  if (!role) return "";
  switch (role) {
    case "super_moderator": return "Super Moderator";
    case "senior_moderator": return "Senior Moderator";
    case "admin": return "Admin";
    case "user": return "User";
    default: return role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, " ");
  }
};

const AVATAR_COLORS = [
  { bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400" },
  { bg: "bg-amber-100 dark:bg-amber-950/40",   text: "text-amber-700 dark:text-amber-400" },
  { bg: "bg-blue-100 dark:bg-blue-950/40",     text: "text-blue-700 dark:text-blue-400" },
  { bg: "bg-teal-100 dark:bg-teal-950/40",     text: "text-teal-700 dark:text-teal-400" },
  { bg: "bg-rose-100 dark:bg-rose-950/40",     text: "text-rose-700 dark:text-rose-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-700 dark:text-emerald-400" },
];

const getAvatarColor = (name: string | null | undefined, email: string) => {
  const seed = name || email;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const AdminUsersRoles = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    user: true,
    email: true,
    role: true,
    joined: true,
    actions: true,
  });

  const [filterOpen, setFilterOpen] = useState(false);
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [pendingFilter, setPendingFilter] = useState<{
    column: FilterColumn;
    operator: FilterOperator;
    value: string;
  }>({ column: "email", operator: "contains", value: "" });

  useEffect(() => {
    if (filterOpen) {
      if (activeFilters.length === 0) {
        setIsAddingFilter(true);
      } else {
        setIsAddingFilter(false);
      }
    }
  }, [filterOpen, activeFilters.length]);

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const [roleLoading, setRoleLoading] = useState(false);

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({ title: "Access Denied", variant: "destructive" });
      navigate("/");
      return;
    }
    fetchUsers();
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`*, user_roles!user_roles_user_id_fkey (id, role)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: UserWithRole[] = (data || []).map((u: any) => ({
        ...u,
        roles: u.user_roles || [],
      }));
      setUsers(mapped);
    } catch (error: any) {
      toast({ title: "Error fetching users", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    let careerManagers = 0;
    let courseManagers = 0;
    let moderators = 0;
    let admins = 0;
    let learners = 0;

    users.forEach((u) => {
      const roles = u.roles.map((r) => r.role);
      if (roles.includes("admin")) admins++;
      else if (roles.includes("super_moderator")) careerManagers++;
      else if (roles.includes("senior_moderator")) courseManagers++;
      else if (roles.includes("moderator")) moderators++;
      else learners++;
    });

    return { careerManagers, courseManagers, moderators, admins, learners };
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name?.toLowerCase().includes(q) ?? false)
      );
    }

    activeFilters.forEach((f) => {
      const val = f.value.toLowerCase();
      result = result.filter((u) => {
        let valuesToMatch: string[] = [];
        if (f.column === "email") {
          valuesToMatch = [u.email.toLowerCase()];
        } else if (f.column === "full_name") {
          valuesToMatch = [(u.full_name || "").toLowerCase()];
        } else if (f.column === "role") {
          valuesToMatch = u.roles && u.roles.length > 0
            ? u.roles.map((r) => formatRoleLabel(r.role).toLowerCase())
            : ["user"];
        } else if (f.column === "created_at") {
          valuesToMatch = [new Date(u.created_at).toLocaleDateString().toLowerCase()];
        }

        return valuesToMatch.some(cellValue => {
          switch (f.operator) {
            case "contains": return cellValue.includes(val);
            case "equals": return cellValue === val;
            case "starts_with": return cellValue.startsWith(val);
            case "ends_with": return cellValue.endsWith(val);
            default: return true;
          }
        });
      });
    });

    return result;
  }, [users, searchQuery, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUserIds(new Set());
  }, [searchQuery, activeFilters, rowsPerPage]);

  const handleAddFilter = () => {
    if (!pendingFilter.value.trim()) return;
    setActiveFilters((prev) => [
      ...prev,
      { ...pendingFilter, id: crypto.randomUUID() },
    ]);
    setPendingFilter({ column: "email", operator: "contains", value: "" });
    setIsAddingFilter(false);
    setFilterOpen(false); // Close automatically on tic
  };

  const handleUpdateFilter = (id: string, updates: Partial<ActiveFilter>) => {
    setActiveFilters((prev) => prev.map((f) => f.id === id ? { ...f, ...updates } : f));
  };

  const handleRemoveFilter = (id: string) => {
    setActiveFilters((prev) => {
      const remaining = prev.filter((f) => f.id !== id);
      if (remaining.length === 0) {
        setIsAddingFilter(true);
      }
      return remaining;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedUserIds.size === paginatedUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(paginatedUsers.map((u) => u.id)));
    }
  };

  const handleToggleSelectRow = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) return;
    setBulkDeleteLoading(true);
    const errors: string[] = [];
    const count = selectedUserIds.size;
    for (const userId of selectedUserIds) {
      try {
        const response = await supabase.functions.invoke("delete-user", {
          body: { userId },
        });
        if (response.error || response.data?.error) {
          errors.push(response.error?.message || response.data?.error || "Failed");
        }
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    setBulkDeleteLoading(false);
    setSelectedUserIds(new Set());
    setBulkDeleteDialogOpen(false);
    if (errors.length > 0) {
      toast({
        title: `${count - errors.length} deleted, ${errors.length} failed`,
        variant: "destructive",
      });
    } else {
      toast({ title: `${count} user${count > 1 ? "s" : ""} deleted` });
    }
    fetchUsers();
  };

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Role", "Joined"];
    const rows = filteredUsers.map((u) => [
      u.full_name || "",
      u.email,
      u.roles.map((r) => r.role).join(", ") || "user",
      new Date(u.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      const response = await supabase.functions.invoke("delete-user", {
        body: { userId: userToDelete.id },
      });
      if (response.error || response.data?.error) {
        throw new Error(response.error?.message || response.data?.error || "Failed to delete user");
      }
      toast({ title: "User deleted successfully" });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRole(user.roles?.[0]?.role || "user");
    setRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    setRoleLoading(true);
    try {
      for (const role of selectedUser.roles) {
        await supabase.from("user_roles").delete().eq("id", role.id);
      }
      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedUser.id,
        role: selectedRole as any,
      });
      if (error) throw error;
      toast({ title: "Role updated successfully" });
      setRoleDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error updating role", description: error.message, variant: "destructive" });
    } finally {
      setRoleLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <UMLoader size={56} dark label="Loading users…" />
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-0">
        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Users & Roles</h1>
            <p className="text-muted-foreground">
              Manage user accounts, assign roles, and control platform access
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setInviteDialogOpen(true)} size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={<Crown className="h-4 w-4" />} label="Career Managers" value={stats.careerManagers} accent />
          <StatCard icon={<GraduationCap className="h-4 w-4" />} label="Course Managers" value={stats.courseManagers} />
          <StatCard icon={<UserCog className="h-4 w-4" />} label="Moderators" value={stats.moderators} />
          <StatCard icon={<Shield className="h-4 w-4" />} label="Admins" value={stats.admins} />
          <StatCard icon={<Users className="h-4 w-4" />} label="Learners" value={stats.learners} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedUserIds.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={bulkDeleteLoading}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete {selectedUserIds.size} row{selectedUserIds.size > 1 ? "s" : ""}
              </Button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {/* Filter */}
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                    {activeFilters.length > 0 && (
                      <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-0.5">
                        {activeFilters.length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[420px] p-0 shadow-lg" align="start">
                  {/* Active Filters Section */}
                  {activeFilters.length > 0 && (
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground">Active filters</h4>
                        <button
                          onClick={() => {
                            setActiveFilters([]);
                            setIsAddingFilter(true);
                          }}
                          className="text-sm text-foreground hover:underline"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="space-y-3">
                        {activeFilters.map((filter) => (
                          <div key={filter.id} className="flex items-center gap-2">
                            <div className="flex items-center gap-1 w-[90px] shrink-0 px-1 text-sm font-medium text-muted-foreground">
                              <Inbox className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate text-xs font-semibold">
                                {FILTER_COLUMN_OPTIONS.find((c) => c.value === filter.column)?.label || filter.column}
                              </span>
                            </div>
                            <Select
                              value={filter.operator}
                              onValueChange={(val) => handleUpdateFilter(filter.id, { operator: val as FilterOperator })}
                            >
                              <SelectTrigger className="h-9 text-xs w-[100px] shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FILTER_OPERATOR_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={filter.value}
                              onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                              className="h-9 text-sm flex-1 min-w-0"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                              onClick={() => handleRemoveFilter(filter.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Divider between active filters and pending filter */}
                  {activeFilters.length > 0 && isAddingFilter && (
                    <div className="border-t border-border" />
                  )}

                  {/* Pending Filter Section */}
                  {isAddingFilter && (
                    <div className="p-4 space-y-3">
                      <Select
                        value={pendingFilter.column}
                        onValueChange={(v) => setPendingFilter((p) => ({ ...p, column: v as FilterColumn }))}
                      >
                        <SelectTrigger className="h-9 text-sm w-full">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {FILTER_COLUMN_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="text-sm">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        <Select
                          value={pendingFilter.operator}
                          onValueChange={(v) => setPendingFilter((p) => ({ ...p, operator: v as FilterOperator }))}
                        >
                          <SelectTrigger className="h-9 text-sm w-[110px] shrink-0">
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {FILTER_OPERATOR_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder="Enter value..."
                          value={pendingFilter.value}
                          onChange={(e) => setPendingFilter((p) => ({ ...p, value: e.target.value }))}
                          className="h-9 text-sm flex-1"
                          onKeyDown={(e) => e.key === "Enter" && handleAddFilter()}
                        />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-emerald-400 hover:text-black rounded-md shrink-0"
                          onClick={handleAddFilter}
                        >
                          <Check className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => {
                            setPendingFilter({ column: "email", operator: "contains", value: "" });
                            setIsAddingFilter(false);
                            if (activeFilters.length === 0) setFilterOpen(false);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Add Filter Button Section */}
                  {!isAddingFilter && (
                    <div className="border-t border-border p-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddingFilter(true)}
                        className="h-8 text-sm gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Column toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Columns className="h-4 w-4" />
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-2">
                  <div className="mb-2 px-1 py-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Toggle Columns
                  </div>
                  {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      onSelect={(e) => {
                        e.preventDefault();
                        setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
                      }}
                      className="flex items-center gap-3 py-2 cursor-pointer focus:bg-accent focus:text-accent-foreground rounded-md"
                    >
                      <Switch
                        checked={visibleColumns[key]}
                        className="pointer-events-none"
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export CSV */}
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleExportCSV}
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>

              {/* Refresh */}
              <Button
                variant="outline"
                className="gap-2"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  await fetchUsers();
                  setRefreshing(false);
                }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Active filter pills */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted border border-border text-xs"
                >
                  <span className="font-medium text-foreground">
                    {FILTER_COLUMN_OPTIONS.find((c) => c.value === f.column)?.label}
                  </span>
                  <span className="text-muted-foreground">{f.operator.replace("_", " ")}</span>
                  <span className="font-medium text-foreground">"{f.value}"</span>
                  <button
                    onClick={() => handleRemoveFilter(f.id)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setActiveFilters([])}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="mt-3" />

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th:not(:last-child)]:border-r">
                <TableHead className="w-10 h-9 pl-4">
                  <input
                    type="checkbox"
                    checked={paginatedUsers.length > 0 && selectedUserIds.size === paginatedUsers.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedUserIds.size > 0 && selectedUserIds.size < paginatedUsers.length;
                      }
                    }}
                    onChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                  />
                </TableHead>
                {visibleColumns.user && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">
                    User
                  </TableHead>
                )}
                {visibleColumns.email && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">
                    Email
                  </TableHead>
                )}
                {visibleColumns.role && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">
                    Role
                  </TableHead>
                )}
                {visibleColumns.joined && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">
                    Joined
                  </TableHead>
                )}
                {visibleColumns.actions && (
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground h-9">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={Object.values(visibleColumns).filter(Boolean).length + 1}
                    className="text-center py-16"
                  >
                    <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-medium">No users found</p>
                    {(searchQuery || activeFilters.length > 0) && (
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Try adjusting your search or filters
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className={`hover:bg-muted/30 transition-colors [&>td:not(:last-child)]:border-r ${selectedUserIds.has(user.id) ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                  >
                    <TableCell className="w-10 pl-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.id)}
                        onChange={() => handleToggleSelectRow(user.id)}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                    </TableCell>
                    {visibleColumns.user && (
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={user.avatar_url || ""} />
                            <AvatarFallback
                              className={`text-xs font-semibold ${getAvatarColor(user.full_name, user.email).bg} ${getAvatarColor(user.full_name, user.email).text}`}
                            >
                              {(user.full_name?.[0] || user.email[0]).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm text-foreground">
                            {user.full_name || "—"}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.email && (
                      <TableCell className="text-sm text-muted-foreground py-3">
                        {user.email}
                      </TableCell>
                    )}
                    {visibleColumns.role && (
                      <TableCell className="py-3">
                        {user.roles && user.roles.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r, i) => {
                              const style = getRoleBadgeStyle(r.role);
                              return (
                                <Badge
                                  key={i}
                                  variant={style.variant}
                                  className={`text-xs font-medium ${style.className}`}
                                >
                                  {formatRoleLabel(r.role)}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs font-medium">
                            User
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.joined && (
                      <TableCell className="text-sm text-muted-foreground py-3">
                        {new Date(user.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell className="py-3">
                        <div className="flex items-center justify-start gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs gap-1.5"
                            onClick={() => handleOpenRoleDialog(user)}
                          >
                            <UserCog className="h-3.5 w-3.5" />
                            Role
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              setUserToDelete(user);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer: rows per page + pagination */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(v) => setRowsPerPage(Number(v))}
            >
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)} className="text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              {filteredUsers.length === 0
                ? "0 records"
                : `${(currentPage - 1) * rowsPerPage + 1}–${Math.min(currentPage * rowsPerPage, filteredUsers.length)} of ${filteredUsers.length} records`}
            </span>
            <span className="text-muted-foreground/50">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{userToDelete?.full_name || userToDelete?.email}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role management dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Role</DialogTitle>
            <DialogDescription>
              Assign a role to{" "}
              <strong>{selectedUser?.full_name || selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => {
                    const style = getRoleBadgeStyle(opt.value);
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Badge variant={style.variant} className={`text-xs ${style.className}`}>
                            {opt.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{opt.description}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Permissions
              </p>
              {selectedRole === "admin" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-3 list-disc">
                  <li>Full system access — all pages and actions</li>
                  <li>Manage all users, roles, teams, courses, careers</li>
                  <li>Create and delete anything on the platform</li>
                </ul>
              )}
              {selectedRole === "super_moderator" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-3 list-disc">
                  <li>View and edit their assigned team only</li>
                  <li>Assign course managers and content moderators</li>
                  <li>Create and delete courses within their career scope</li>
                  <li>Create posts</li>
                </ul>
              )}
              {selectedRole === "senior_moderator" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-3 list-disc">
                  <li>View and edit assigned courses only</li>
                  <li>Cannot create or delete courses</li>
                  <li>Create posts within assigned scope</li>
                </ul>
              )}
              {selectedRole === "moderator" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-3 list-disc">
                  <li>Create posts only</li>
                  <li>Cannot create courses, careers, or teams</li>
                  <li>Content scoped to their assignments</li>
                </ul>
              )}
              {selectedRole === "user" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-3 list-disc">
                  <li>Basic platform access only</li>
                  <li>No admin panel access</li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={roleLoading}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={roleLoading}>
              {roleLoading ? "Saving..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedUserIds.size} user{selectedUserIds.size > 1 ? "s" : ""}?</DialogTitle>
            <DialogDescription>
              You are about to permanently delete{" "}
              <strong>{selectedUserIds.size} user{selectedUserIds.size > 1 ? "s" : ""}</strong>.
              This action cannot be undone and will remove all their data from the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkDeleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={bulkDeleteLoading}
            >
              {bulkDeleteLoading
                ? `Deleting...`
                : `Delete ${selectedUserIds.size} user${selectedUserIds.size > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInviteSent={fetchUsers}
      />
    </>
  );
};


function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-md p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminUsersRoles;
