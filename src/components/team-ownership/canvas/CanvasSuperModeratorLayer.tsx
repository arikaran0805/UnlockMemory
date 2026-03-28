import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Shield, X, Plus } from "lucide-react";
import type { SuperModeratorAssignment, UserProfile } from "../types";

interface CanvasSuperModeratorLayerProps {
  teamId: string;
  careerId: string;
  superModerators: SuperModeratorAssignment[];
  allUsers: UserProfile[];
  onRefresh: () => void;
}

const CanvasSuperModeratorLayer = ({
  teamId,
  careerId,
  superModerators,
  allUsers,
  onRefresh,
}: CanvasSuperModeratorLayerProps) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [userToRemove, setUserToRemove] = useState<SuperModeratorAssignment | null>(null);

  // Filter users who are super moderators and not already assigned
  const availableUsers = allUsers.filter(
    (u) => !superModerators.some((sm) => sm.user_id === u.id)
  );

  const handleAddCareerManager = async (selectedUserId: string) => {
    try {
      const { error } = await supabase.from("career_assignments").insert({
        user_id: selectedUserId,
        career_id: careerId,
        team_id: teamId,
        assigned_by: userId,
      });

      if (error) throw error;

      toast({ title: "Career Manager assigned" });
      setShowAddDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error assigning Career Manager",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveCareerManager = async () => {
    if (!userToRemove) return;

    // Check if this is the last career manager and team has courses
    if (superModerators.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "A team must have at least one Career Manager",
        variant: "destructive",
      });
      setUserToRemove(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("career_assignments")
        .delete()
        .eq("id", userToRemove.id);

      if (error) throw error;

      toast({ title: "Career Manager removed" });
      setUserToRemove(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error removing Career Manager",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Career Managers
          </h3>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {superModerators.map((sm) => (
            <div
              key={sm.id}
              className="group relative flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={sm.user?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {sm.user?.full_name?.[0] || sm.user?.email?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {sm.user?.full_name || sm.user?.email || "Unknown"}
                </p>
                {sm.user?.full_name && (
                  <p className="text-xs text-muted-foreground">{sm.user.email}</p>
                )}
              </div>
              <button
                onClick={() => setUserToRemove(sm)}
                className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* Add placeholder - double-click to add */}
          <button
            onDoubleClick={() => setShowAddDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm">Double-click to add</span>
          </button>
        </div>
      </div>

      {/* Add Career Manager Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Career Manager</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Search users..." />
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {availableUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.email}
                    onSelect={() => handleAddCareerManager(user.id)}
                    className="cursor-pointer"
                  >
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.[0] || user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.full_name || user.email}</p>
                      {user.full_name && (
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Career Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{userToRemove?.user?.full_name || userToRemove?.user?.email}" from this team?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveCareerManager}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CanvasSuperModeratorLayer;
