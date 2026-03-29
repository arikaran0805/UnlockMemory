import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Search, Shield, UserCog } from "lucide-react";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: { id: string; role: string }[];
}

const AdminAuthors = () => {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("user");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

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
        .select(`
          *,
          user_roles!user_roles_user_id_fkey (id, role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map user_roles to roles for consistency
      const mappedData = (data || []).map((user: any) => ({
        ...user,
        roles: user.user_roles || []
      }));
      
      setUsers(mappedData);
    } catch (error: any) {
      toast({ title: "Error fetching users", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    const currentRole = user.roles && user.roles.length > 0 ? user.roles[0].role : "user";
    setSelectedRole(currentRole);
    setRoleDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      // Remove existing roles
      if (selectedUser.roles && selectedUser.roles.length > 0) {
        for (const role of selectedUser.roles) {
          await supabase
            .from("user_roles")
            .delete()
            .eq("id", role.id);
        }
      }

      // Add new role
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.id,
          role: selectedRole as any
        });

      if (error) throw error;

      toast({ title: "Role updated successfully" });
      setRoleDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error updating role",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "default";
      case "senior_moderator":
        return "outline";
      case "moderator":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    if (role === "senior_moderator") {
      return "border-[#D4AF37] text-[#D4AF37] bg-transparent";
    }
    return "";
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  if (loading) return (
    <div className="flex flex-col gap-0">
      <div className="admin-section-spacing-top" />
      <div className="p-6">Loading...</div>
    </div>
  );

  return (
    <>
    <div className="flex flex-col gap-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Authors & Admins</h1>
            <p className="text-muted-foreground">
              Manage author accounts, assign roles, and control permissions for your team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              Total Users: {users.length}
            </Badge>
          </div>
        </div>

        <div className="admin-section-spacing-top" />

        <div className="space-y-6">


        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.full_name?.[0] || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || "No name"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((roleObj, index) => (
                            <Badge
                              key={index}
                              variant={getRoleBadgeVariant(roleObj.role)}
                              className={`capitalize ${getRoleBadgeStyle(roleObj.role)}`}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {roleObj.role === "senior_moderator" ? "Senior Mod" : roleObj.role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">User</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRoleDialog(user)}
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Manage Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

      {/* Role Management Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">User</Badge>
                      <span className="text-xs text-muted-foreground">Basic access</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="moderator">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Moderator</Badge>
                      <span className="text-xs text-muted-foreground">Can manage content</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="senior_moderator">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">Senior Mod</Badge>
                      <span className="text-xs text-muted-foreground">Advanced moderation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Badge>Admin</Badge>
                      <span className="text-xs text-muted-foreground">Full access</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">Role Permissions:</p>
              {selectedRole === "admin" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Full system access</li>
                  <li>Manage all users and roles</li>
                  <li>Edit all content</li>
                  <li>Access analytics and settings</li>
                </ul>
              )}
              {selectedRole === "senior_moderator" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Full approval queue access</li>
                  <li>Manage posts, courses, tags, pages</li>
                  <li>Comments, annotations, media moderation</li>
                  <li>Content analytics (limited)</li>
                  <li>View users (no role control)</li>
                </ul>
              )}
              {selectedRole === "moderator" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Manage posts and comments</li>
                  <li>Moderate user content</li>
                  <li>View analytics</li>
                </ul>
              )}
              {selectedRole === "user" && (
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>Basic platform access</li>
                  <li>Create and edit own posts</li>
                  <li>Comment on posts</li>
                </ul>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} className="bg-primary">
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminAuthors;
