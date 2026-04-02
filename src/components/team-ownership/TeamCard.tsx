import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreVertical, Edit2, Archive, Copy, Users, GraduationCap, UserCog, Clock, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Team } from "./types";

interface TeamCardProps {
  team: Team;
  onDoubleClick: () => void;
  onRefresh: () => void;
}

const TeamCard = ({ team, onDoubleClick, onRefresh }: TeamCardProps) => {
  const { toast } = useToast();
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(team.name);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRename = async () => {
    if (!newName.trim() || newName === team.name) {
      setShowRenameDialog(false);
      return;
    }

    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("teams")
        .update({ name: newName.trim() })
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team renamed", description: `Team renamed to "${newName}"` });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error renaming team",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setShowRenameDialog(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("teams")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team archived", description: `${team.name} has been archived` });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error archiving team",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setShowArchiveDialog(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsUpdating(true);
      const { error } = await supabase
        .from("teams")
        .update({ archived_at: null })
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team restored", description: `${team.name} has been restored` });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error restoring team",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const { error } = await supabase.from("teams").insert({
        name: `${team.name} (Copy)`,
        career_id: team.career_id,
      });

      if (error) throw error;

      toast({ title: "Team duplicated" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error duplicating team",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    try {
      setIsUpdating(true);
      
      // First delete all course assignments for this team
      await supabase
        .from("course_assignments")
        .delete()
        .eq("team_id", team.id);
      
      // Delete all career assignments for this team
      await supabase
        .from("career_assignments")
        .delete()
        .eq("team_id", team.id);
      
      // Delete the team
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", team.id);

      if (error) throw error;

      toast({ title: "Team deleted", description: `${team.name} has been permanently deleted` });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error deleting team",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div
        className="card-premium rounded-xl p-5 cursor-pointer transition-all hover:border-primary/30 group"
        onDoubleClick={onDoubleClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: team.career?.color || "hsl(var(--primary))" }}
            >
              {team.career?.icon || team.career?.name[0] || "T"}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {team.career?.name || "No Career"}
              </p>
              <h3 className="font-semibold text-foreground">{team.name}</h3>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowRenameDialog(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename team
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate team
              </DropdownMenuItem>
              {(team as any).archived_at ? (
                <DropdownMenuItem
                  onClick={handleRestore}
                  className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Restore team
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setShowArchiveDialog(true)}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archive team
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Career Managers Avatars */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Career Managers</p>
          <div className="flex items-center gap-1">
            {team.superModeratorCount > 0 ? (
              <div className="flex -space-x-2">
                {[...Array(Math.min(team.superModeratorCount, 3))].map((_, i) => (
                  <Avatar key={i} className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      CM
                    </AvatarFallback>
                  </Avatar>
                ))}
                {team.superModeratorCount > 3 && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                    +{team.superModeratorCount - 3}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">None assigned</span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <GraduationCap className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium">{team.courseCount}</p>
            <p className="text-[10px] text-muted-foreground">Courses</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <UserCog className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium">{team.seniorModeratorCount}</p>
            <p className="text-[10px] text-muted-foreground">Course Mgrs</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium">{team.moderatorCount}</p>
            <p className="text-[10px] text-muted-foreground">Content Mods</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Updated {formatDistanceToNow(new Date(team.updated_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Team</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Team name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive "{team.name}" and hide it from the team list.
              {team.courseCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This team has {team.courseCount} course(s) assigned.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isUpdating ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{team.name}" and remove all assignments. This action cannot be undone.
              {team.courseCount > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This team has {team.courseCount} course(s) and {team.seniorModeratorCount + team.moderatorCount} managers/moderators assigned.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isUpdating ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamCard;
