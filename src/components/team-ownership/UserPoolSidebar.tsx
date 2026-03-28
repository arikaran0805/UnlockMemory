/**
 * User Pool Sidebar
 * 
 * Collapsible right sidebar (matching post editor style) showing all users 
 * for drag-and-drop assignments.
 * filters by role (Career Manager, Course Manager, Content Moderator)
 * Supports both click-to-select and drag-and-drop assignment
 */
import { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Shield, UserCog, Users, GripVertical, Check, ChevronRight } from "lucide-react";
import type { UserProfile } from "./types";

interface UserWithRole extends UserProfile {
  role?: "admin" | "super_moderator" | "senior_moderator" | "moderator" | "user" | null;
}

interface UserPoolSidebarProps {
  allUsers: UserWithRole[];
  assignedSuperModeratorIds: Set<string>;
  assignedSeniorModeratorIds: Map<string, Set<string>>; // courseId -> userIds
  assignedModeratorIds: Map<string, Set<string>>; // courseId -> userIds
  onSelectUser: (userId: string, targetType: "super_moderator" | "senior_moderator" | "moderator", courseId?: string) => void;
  selectedTarget: { type: "super_moderator" | "senior_moderator" | "moderator"; courseId?: string } | null;
  onClearSelection: () => void;
}

// Draggable User Card Component
const DraggableUserCard = ({
  user,
  isAssigned,
  canSelect,
  selectedTarget,
  onSelectUser,
  getRoleBadge,
}: {
  user: UserWithRole;
  isAssigned: boolean;
  canSelect: boolean;
  selectedTarget: UserPoolSidebarProps["selectedTarget"];
  onSelectUser: UserPoolSidebarProps["onSelectUser"];
  getRoleBadge: (role?: string | null) => React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `user-${user.id}`,
    data: { user, type: "user" },
    disabled: isAssigned,
  });

  // Hide the original element completely when dragging (DragOverlay shows the visual)
  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="w-full h-11 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors
        ${canSelect ? "hover:bg-primary/10 cursor-pointer" : ""}
        ${isAssigned ? "opacity-50 bg-muted/50" : "hover:bg-muted/50"}
        ${!selectedTarget && !isAssigned ? "cursor-grab active:cursor-grabbing" : ""}
      `}
      onClick={() => {
        if (canSelect) {
          onSelectUser(user.id, selectedTarget!.type, selectedTarget!.courseId);
        }
      }}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
      </div>
      <Avatar className="h-7 w-7 flex-shrink-0">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback className="text-xs bg-muted">
          {user.full_name?.[0] || user.email[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {user.full_name || user.email}
        </p>
        {user.full_name && (
          <p className="text-[10px] text-muted-foreground truncate">
            {user.email}
          </p>
        )}
      </div>
      {isAssigned ? (
        <Check className="h-4 w-4 text-primary flex-shrink-0" />
      ) : (
        getRoleBadge(user.role)
      )}
    </div>
  );
};

const UserPoolSidebar = ({
  allUsers,
  assignedSuperModeratorIds,
  assignedSeniorModeratorIds,
  assignedModeratorIds,
  onSelectUser,
  selectedTarget,
  onClearSelection,
}: UserPoolSidebarProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "super" | "senior" | "moderator">("all");

  const filteredUsers = useMemo(() => {
    let users = allUsers;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      users = users.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    if (activeTab === "super") {
      users = users.filter((u) => u.role === "super_moderator");
    } else if (activeTab === "senior") {
      users = users.filter((u) => u.role === "senior_moderator");
    } else if (activeTab === "moderator") {
      users = users.filter((u) => u.role === "moderator");
    }

    return users;
  }, [allUsers, searchQuery, activeTab]);

  const isUserAssigned = (userId: string) => {
    if (!selectedTarget) return false;

    if (selectedTarget.type === "super_moderator") {
      return assignedSuperModeratorIds.has(userId);
    } else if (selectedTarget.type === "senior_moderator" && selectedTarget.courseId) {
      return assignedSeniorModeratorIds.get(selectedTarget.courseId)?.has(userId) || false;
    } else if (selectedTarget.type === "moderator" && selectedTarget.courseId) {
      return assignedModeratorIds.get(selectedTarget.courseId)?.has(userId) || false;
    }

    return false;
  };

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-[#8B1E1E]/10 text-[#8B1E1E] border-[#8B1E1E]/20 text-[10px] px-1.5">Platform Manager</Badge>;
      case "super_moderator":
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px] px-1.5">Career Manager</Badge>;
      case "senior_moderator":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] px-1.5">Course Manager</Badge>;
      case "moderator":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px] px-1.5">Content Moderator</Badge>;
      default:
        return null;
    }
  };

  const getTargetLabel = () => {
    if (!selectedTarget) return null;
    
    switch (selectedTarget.type) {
      case "super_moderator":
        return "Adding Career Manager";
      case "senior_moderator":
        return "Adding Course Manager";
      case "moderator":
        return "Adding Content Moderator";
      default:
        return null;
    }
  };

  return (
    <div data-user-pool-sidebar className="flex-shrink-0 flex h-[calc(100vh-100px)] sticky top-4">
      {/* Vertical Tab Toggle - Exact match to Post Editor */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center justify-start gap-1 py-3 px-1 bg-muted/50 hover:bg-muted border-y border-l rounded-l-md transition-colors cursor-pointer"
      >
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        <span className="text-[10px] font-medium text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none">
          User Pool
        </span>
      </button>

      {/* Sidebar Content */}
      <Card className={`flex flex-col min-h-0 transition-all duration-300 rounded-l-none border-l-0 ${isOpen ? 'w-72' : 'w-0 overflow-hidden border-0 p-0'}`}>
        {/* Header */}
        <div className={`p-4 border-b space-y-3 flex-shrink-0 ${!isOpen ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm whitespace-nowrap">User Pool</h3>
            </div>
            <Badge variant="secondary" className="text-xs">
              {filteredUsers.length}
            </Badge>
          </div>

          {selectedTarget && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-xs font-medium text-primary">{getTargetLabel()}</span>
              <button
                onClick={onClearSelection}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Role Filter Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full grid grid-cols-4 h-8">
              <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
              <TabsTrigger value="super" className="text-xs px-1.5">
                <Shield className="h-3 w-3" />
              </TabsTrigger>
              <TabsTrigger value="senior" className="text-xs px-1.5">
                <UserCog className="h-3 w-3" />
              </TabsTrigger>
              <TabsTrigger value="moderator" className="text-xs px-1.5">
                <Users className="h-3 w-3" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* User List */}
        <ScrollArea className={`flex-1 min-h-0 ${!isOpen ? 'hidden' : ''}`}>
          <div className="p-2 space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isAssigned = isUserAssigned(user.id);
                const canSelect = selectedTarget !== null && !isAssigned;

                return (
                  <DraggableUserCard
                    key={user.id}
                    user={user}
                    isAssigned={isAssigned}
                    canSelect={canSelect}
                    selectedTarget={selectedTarget}
                    onSelectUser={onSelectUser}
                    getRoleBadge={getRoleBadge}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Instructions Footer */}
        {!selectedTarget && isOpen && (
          <div className="p-3 border-t bg-muted/30 flex-shrink-0">
            <p className="text-xs text-muted-foreground text-center">
              Drag users to assign, or click "Add" to select
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default UserPoolSidebar;